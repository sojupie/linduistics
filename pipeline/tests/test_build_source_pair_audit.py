import json
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import pyarrow as pa
import pyarrow.parquet as pq

from build_source_pair_audit import (
    PAIR_FIELDS, audit_record, derive_pair_source_evidence, load_comparison_rows,
    load_source_entries, sample_category_rows,
)


class SourcePairAuditTests(unittest.TestCase):
    def test_comparison_parquet_loader_reads_requested_direction_and_parses_senses(self):
        with tempfile.TemporaryDirectory() as directory:
            parquet_path = Path(directory) / "pairs.parquet"
            row = {field: None for field in PAIR_FIELDS if field != "id"}
            row.update({
                "lang_a": "sv", "lang_b": "da", "word_a": "gift", "word_b": "gift",
                "senses_a": json.dumps([{"sense_id": 1, "source_entry_key": "sv|gift|noun|1|a"}]),
                "senses_b": "[]",
            })
            pq.write_table(pa.Table.from_pylist([row]), parquet_path)

            result = load_comparison_rows(parquet_path, "sv", "da", [["gift", "gift"]])

        self.assertEqual(result[("gift", "gift")]["senses_a"][0]["source_entry_key"], "sv|gift|noun|1|a")

    def test_audit_join_preserves_homographs_and_does_not_infer_a_relationship(self):
        with tempfile.TemporaryDirectory() as directory:
            source_path = Path(directory) / "source.jsonl"
            records = [
                {"language_code": "sv", "word": "gift", "source_entry_key": "sv|gift|noun|1|a", "part_of_speech": "noun"},
                {"language_code": "sv", "word": "gift", "source_entry_key": "sv|gift|adj|2|b", "part_of_speech": "adj"},
                {"language_code": "en", "word": "gift", "source_entry_key": "en|gift|noun||c", "part_of_speech": "noun"},
                {"language_code": "da", "word": "gift", "source_entry_key": "da|gift|noun|1|d", "part_of_speech": "noun"},
            ]
            source_path.write_text("\n".join(json.dumps(record) for record in records) + "\n", encoding="utf-8")

            entries = load_source_entries(source_path, {"gift"})
            result = audit_record("gift", "gift", "sv", "en", {"category": "false_friend", "etymological_relation": "cognate"}, entries)

        self.assertEqual(
            [entry["source_entry_key"] for entry in result["source_entries"]["sv"]],
            ["sv|gift|noun|1|a", "sv|gift|adj|2|b"],
        )
        self.assertEqual([entry["source_entry_key"] for entry in result["source_entries"]["en"]], ["en|gift|noun||c"])
        self.assertEqual(result["comparison"]["category"], "false_friend")
        self.assertEqual(result["comparison"]["etymological_relation"], "cognate")
        self.assertIsNone(result["comparison"]["id"])

    def test_audit_join_supports_different_forms_across_languages(self):
        entries = {
            ("sv", "hund"): [{"source_entry_key": "sv|hund|noun||a"}],
            ("en", "hound"): [{"source_entry_key": "en|hound|noun||b"}],
        }

        result = audit_record("hund", "hound", "sv", "en", {"word_a": "hund", "word_b": "hound"}, entries)

        self.assertEqual(result["audit_key"], "sv|hund|en|hound")
        self.assertEqual(result["source_entries"]["sv"][0]["source_entry_key"], "sv|hund|noun||a")
        self.assertEqual(result["source_entries"]["en"][0]["source_entry_key"], "en|hound|noun||b")

    def test_source_join_uses_explicit_casefold_fallback(self):
        with tempfile.TemporaryDirectory() as directory:
            source_path = Path(directory) / "source.jsonl"
            source_path.write_text(json.dumps({
                "language_code": "sv", "word": "Polen", "source_entry_key": "sv|Polen|name||a"
            }) + "\n", encoding="utf-8")

            entries = load_source_entries(source_path, {"polen"})
            result = audit_record("polen", "Polen", "sv", "nb", None, entries)

        self.assertEqual(result["source_entry_match"]["sv"], "casefold")
        self.assertEqual(result["source_entries"]["sv"][0]["word"], "Polen")

    def test_derived_evidence_is_limited_to_the_comparison_pos(self):
        entries = {
            ("sv", "gift"): [
                {"source_entry_key": "sv|gift|noun||a", "word": "gift", "part_of_speech": "noun",
                 "claims": [{"relation": "inherited_from", "related_language": "gmw-pro", "related_form": "*gift"}]},
                {"source_entry_key": "sv|gift|verb||b", "word": "gift", "part_of_speech": "verb",
                 "claims": [{"relation": "inherited_from", "related_language": "gmw-pro", "related_form": "*giftan"}]},
            ],
            ("en", "gift"): [
                {"source_entry_key": "en|gift|noun||c", "word": "gift", "part_of_speech": "noun",
                 "claims": [{"relation": "inherited_from", "related_language": "gmw-pro", "related_form": "*gift"}]},
                {"source_entry_key": "en|gift|verb||d", "word": "gift", "part_of_speech": "verb",
                 "claims": [{"relation": "inherited_from", "related_language": "gmw-pro", "related_form": "*giftan"}]},
            ],
        }

        result = audit_record("gift", "gift", "sv", "en", {"pos_a": "noun", "pos_b": "noun"}, entries)

        self.assertEqual(result["source_pos_entry_count"], {"sv": 1, "en": 1})
        self.assertEqual(len(result["source_derived_relationships"]), 1)
        claims = result["source_derived_relationships"][0]["claims_a"]
        self.assertEqual([claim["source_entry_key"] for claim in claims], ["sv|gift|noun||a"])

    def test_sense_linking_requires_exact_gloss_after_case_and_space_normalization(self):
        entries = {
            ("sv", "besök"): [{
                "source_entry_key": "sv|besök|noun||a", "word": "besök", "part_of_speech": "noun",
                "source_senses": [{"id": "sv-sense-1", "glosses": ["a visit"]}],
            }],
            ("da", "besøg"): [],
        }
        result = audit_record("besök", "besøg", "sv", "da", {
            "pos_a": "noun", "pos_b": "noun",
            "senses_a": [
                {"sense_id": 1, "pos": "noun", "gloss": "A   VISIT"},
                {"sense_id": 2, "pos": "noun", "gloss": "appointment"},
                {"sense_id": 3, "pos": "verb", "gloss": "a visit"},
            ],
        }, entries)

        linked = result["source_sense_matches"]["sv"]
        self.assertEqual(linked[0]["match_method"], "exact_gloss")
        self.assertEqual(linked[0]["source_senses"][0]["source_sense_id"], "sv-sense-1")
        self.assertEqual(linked[1]["match_method"], "unmatched")
        self.assertEqual(linked[2]["match_method"], "pos_mismatch")
        self.assertEqual(linked[2]["source_senses"], [])

    def test_source_identity_disambiguates_same_gloss_homographic_entries(self):
        entries = {
            ("sv", "gift"): [
                {"source_entry_key": "sv|gift|noun|1|a", "word": "gift", "part_of_speech": "noun",
                 "source_senses": [{"id": "a", "glosses": ["poison"]}]},
                {"source_entry_key": "sv|gift|noun|2|b", "word": "gift", "part_of_speech": "noun",
                 "source_senses": [{"id": "b", "glosses": ["poison"]}]},
            ],
            ("en", "gift"): [],
        }

        result = audit_record("gift", "gift", "sv", "en", {
            "pos_a": "noun", "pos_b": "noun",
            "senses_a": [{
                "sense_id": 1, "source_entry_key": "sv|gift|noun|2|b", "source_sense_id": "b",
                "pos": "noun", "gloss": "poison", "is_active_match": True,
            }],
        }, entries)

        match = result["source_sense_matches"]["sv"][0]
        self.assertEqual(match["match_method"], "source_identity")
        self.assertEqual(match["source_senses"], [{
            "source_entry_key": "sv|gift|noun|2|b", "source_sense_id": "b", "source_gloss": "poison",
        }])

    def test_ambiguous_comparison_identity_stays_ambiguous_in_source_audit(self):
        entries = {
            ("sv", "gift"): [
                {"source_entry_key": "sv|gift|noun|1|a", "word": "gift", "part_of_speech": "noun",
                 "source_senses": [{"id": "a", "glosses": ["poison"]}]},
                {"source_entry_key": "sv|gift|noun|2|b", "word": "gift", "part_of_speech": "noun",
                 "source_senses": [{"id": "b", "glosses": ["poison"]}]},
            ],
            ("en", "gift"): [],
        }

        result = audit_record("gift", "gift", "sv", "en", {
            "pos_a": "noun", "pos_b": "noun",
            "senses_a": [{
                "sense_id": 1, "source_entry_key": None, "source_sense_id": None,
                "source_identity_ambiguous": True, "pos": "noun", "gloss": "poison",
                "is_active_match": True,
            }],
        }, entries)

        match = result["source_sense_matches"]["sv"][0]
        self.assertEqual(match["match_method"], "ambiguous_source_identity")
        self.assertEqual(len(match["source_senses"]), 2)
        self.assertEqual(result["source_derived_relationships"], [])

    def test_source_evidence_distinguishes_direct_loan_from_shared_donor(self):
        sv_fleece = {
            "source_entry_key": "sv|fleece|noun||sv1", "word": "fleece",
            "claims": [{"relation": "borrowed_from", "template_name": "bor", "template_index": 0,
                        "related_language": "en", "related_form": "fleece", "args": {"2": "en", "3": "fleece"}}],
        }
        en_fleece = {"source_entry_key": "en|fleece|noun||en1", "word": "fleece", "claims": []}
        direct = derive_pair_source_evidence([sv_fleece], [en_fleece], "sv", "fleece", "en", "fleece")
        self.assertEqual(len(direct), 1)
        self.assertEqual(direct[0]["type"], "direct_borrowing_claim")
        self.assertEqual(direct[0]["same_form_donor_entry_candidates"], ["en|fleece|noun||en1"])

        sv_queue = {
            "source_entry_key": "sv|kö|noun||sv2", "word": "kö",
            "claims": [{"relation": "borrowed_from", "related_language": "fr", "related_form": "queue"}],
        }
        da_queue = {
            "source_entry_key": "da|kø|noun||da2", "word": "kø",
            "claims": [{"relation": "borrowed_from", "related_language": "fr", "related_form": "queue"}],
        }
        shared = derive_pair_source_evidence([sv_queue], [da_queue], "sv", "kö", "da", "kø")
        self.assertEqual(len(shared), 1)
        self.assertEqual(shared[0]["type"], "shared_borrowing_source_claim")
        self.assertEqual(shared[0]["related_language"], "fr")
        self.assertEqual(shared[0]["related_form_key"], "queue")

    def test_source_cognate_mentions_link_to_the_comparison_without_classifying_it(self):
        english = {
            "source_entry_key": "en|sandbank|noun||a", "word": "sandbank",
            "claims": [{"relation": "cognate_mention", "template_name": "cog", "template_index": 1,
                        "related_language": "sv", "related_form": "sandbank", "args": {"1": "sv", "2": "sandbank"}}],
        }
        swedish = {
            "source_entry_key": "sv|sandbank|noun||b", "word": "sandbank",
            "claims": [{"relation": "noncognate_mention", "template_name": "ncog", "template_index": 1,
                        "related_language": "en", "related_form": "sandbank", "args": {"1": "en", "2": "sandbank"}}],
        }

        evidence = derive_pair_source_evidence([swedish], [english], "sv", "sandbank", "en", "sandbank")

        self.assertEqual([item["type"] for item in evidence], ["source_noncognate_mention", "source_cognate_mention"])
        self.assertEqual(evidence[0]["claim"]["source_entry_key"], "sv|sandbank|noun||b")
        self.assertEqual(evidence[0]["same_form_mentioned_entry_candidates"], ["en|sandbank|noun||a"])
        self.assertEqual(evidence[1]["claim"]["source_entry_key"], "en|sandbank|noun||a")
        self.assertEqual(evidence[1]["same_form_mentioned_entry_candidates"], ["sv|sandbank|noun||b"])

    def test_source_claims_distinguish_same_form_candidates_from_selected_senses(self):
        entries = {
            ("de", "barsch"): [
                {"source_entry_key": "de|barsch|adj||a", "word": "barsch", "part_of_speech": "adj",
                 "source_senses": [{"id": "a1", "glosses": ["harsh, unfriendly"]}]},
                {"source_entry_key": "de|barsch|noun||b", "word": "barsch", "part_of_speech": "noun",
                 "source_senses": [{"id": "b1", "glosses": ["perch"]}]},
            ],
            ("en", "barse"): [
                {"source_entry_key": "en|barse|noun|1|fish", "word": "barse", "part_of_speech": "noun",
                 "source_senses": [{"id": "fish1", "glosses": ["perch"]}],
                 "claims": [{"relation": "cognate_mention", "related_language": "de", "related_form": "Barsch"}]},
                {"source_entry_key": "en|barse|noun|2|slang", "word": "barse", "part_of_speech": "noun",
                 "source_senses": [{"id": "slang1", "glosses": ["The perineum of a man."]}], "claims": []},
            ],
        }
        result = audit_record("barsch", "barse", "de", "en", {
            "pos_a": "adj", "pos_b": "noun",
            "senses_a": [{"sense_id": 1, "pos": "adj", "gloss": "harsh, unfriendly", "is_active_match": True}],
            "senses_b": [{"sense_id": 1, "pos": "noun", "gloss": "The perineum of a man.", "is_active_match": True}],
        }, entries)

        evidence = result["source_derived_relationships"][0]
        self.assertEqual(evidence["type"], "source_cognate_mention")
        self.assertFalse(evidence["claim"]["source_entry_matches_active_comparison_sense"])
        self.assertEqual(evidence["same_form_mentioned_entry_candidates"], ["de|barsch|adj||a", "de|barsch|noun||b"])
        self.assertEqual(evidence["active_sense_mentioned_entry_candidates"], ["de|barsch|adj||a"])

    def test_category_sampler_uses_seeded_distinct_offsets_and_oversamples_other(self):
        def fake_response(url, timeout):
            query = parse_qs(urlparse(url).query)
            category = query["category"][0]
            offset = int(query["offset"][0])
            item = {"word_a": f"{category}-{offset}", "word_b": f"target-{category}-{offset}"}
            return io.BytesIO(json.dumps({"total": 20, "items": [item]}).encode())

        with patch("build_source_pair_audit.urlopen", side_effect=fake_response):
            first = sample_category_rows("http://localhost:8080", "sv", "da", 1, 3, 42)
        with patch("build_source_pair_audit.urlopen", side_effect=fake_response):
            second = sample_category_rows("http://localhost:8080", "sv", "da", 1, 3, 42)

        rows, metadata, strata = first
        self.assertEqual(list(rows), list(second[0]))
        self.assertEqual(len(rows), 7)
        self.assertEqual(sum(meta["category"] == "other" for meta in metadata.values()), 3)
        self.assertEqual(strata["other"]["sample_count"], 3)
