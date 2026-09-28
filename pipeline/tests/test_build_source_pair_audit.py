import json
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from build_source_pair_audit import audit_record, load_source_entries, sample_category_rows


class SourcePairAuditTests(unittest.TestCase):
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
