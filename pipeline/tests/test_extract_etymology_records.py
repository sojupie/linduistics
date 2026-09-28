import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from extract_etymology_records import export_records, source_record


class EtymologyRecordTests(unittest.TestCase):
    def test_preserves_borrowing_claim_and_source_target(self):
        record = source_record(
            {
                "lang_code": "sv",
                "lang": "Swedish",
                "word": "fleece",
                "pos": "noun",
                "senses": [{"id": "en-fleece-sv-noun-example"}],
                "etymology_text": "Borrowed from English fleece.",
                "etymology_templates": [
                    {"name": "bor", "args": {"1": "sv", "2": "en", "3": "fleece"}}
                ],
            },
            "kaikki_sv.jsonl",
        )

        self.assertEqual(record["claims"][0]["relation"], "borrowed_from")
        self.assertEqual(record["claims"][0]["related_language"], "en")
        self.assertEqual(record["claims"][0]["related_form"], "fleece")
        self.assertEqual(record["templates"][0]["args"]["2"], "en")
        self.assertIn("#Swedish", record["source_url"])
        self.assertEqual(record["source_senses"], [{"id": "en-fleece-sv-noun-example"}])

    def test_preserves_compact_sense_glosses_and_tags_for_audit_linking(self):
        record = source_record(
            {
                "lang_code": "sv", "lang": "Swedish", "word": "besök", "pos": "noun",
                "senses": [{"id": "source-sense-1", "glosses": ["a visit"], "raw_glosses": ["a visit"],
                            "tags": ["neuter"], "examples": [{"text": "not retained"}] }],
                "etymology_templates": [], "etymology_text": "Cognate with Danish besøg.",
            },
            "kaikki_sv.jsonl",
        )

        self.assertEqual(record["source_senses"], [{
            "id": "source-sense-1", "glosses": ["a visit"], "raw_glosses": ["a visit"], "tags": ["neuter"],
        }])

    def test_keeps_compound_components_as_a_separate_claim(self):
        record = source_record(
            {
                "lang_code": "sv",
                "lang": "Swedish",
                "word": "sandbank",
                "pos": "noun",
                "senses": [{"id": "en-sandbank-sv-noun-example"}],
                "etymology_text": "sand + bank",
                "etymology_templates": [
                    {"name": "af", "args": {"1": "sv", "2": "sand", "3": "bank"}}
                ],
            },
            "kaikki_sv.jsonl",
        )

        self.assertEqual(record["claims"][0]["relation"], "formed_from")
        self.assertEqual(record["claims"][0]["components"], ["sand", "bank"])

    def test_reads_relation_and_direction_from_structured_ety_template(self):
        record = source_record(
            {
                "lang_code": "sv",
                "lang": "Swedish",
                "word": "fleece",
                "pos": "noun",
                "etymology_text": "Borrowed from English fleece.",
                "etymology_templates": [
                    {"name": "ety", "args": {"1": "sv", "2": ":bor", "3": "en:fleece"}}
                ],
            },
            "kaikki_sv.jsonl",
        )

        claim = record["claims"][0]
        self.assertEqual(claim["relation"], "borrowed_from")
        self.assertEqual(claim["related_language"], "en")
        self.assertEqual(claim["related_form"], "fleece")
        self.assertEqual(claim["args"]["2"], ":bor")

    def test_keeps_multiple_and_uncertain_steps_from_one_ety_template(self):
        record = source_record(
            {
                "lang_code": "en",
                "lang": "English",
                "word": "example",
                "pos": "noun",
                "etymology_templates": [
                    {
                        "name": "etymon",
                        "args": {
                            "1": "en",
                            "2": ":inh",
                            "3": "enm:example",
                            "4": ":bor",
                            "5": "fr:exemple",
                            "6": ":der<unc>",
                            "7": "la:exemplum",
                        },
                    }
                ],
            },
            "kaikki_en.jsonl",
        )

        self.assertEqual([claim["relation"] for claim in record["claims"]], ["inherited_from", "borrowed_from", "derived_from"])
        self.assertEqual([claim["related_language"] for claim in record["claims"]], ["enm", "fr", "la"])
        self.assertTrue(record["claims"][2]["source_uncertain"])

    def test_reads_components_from_structured_etymon_affix_template(self):
        record = source_record(
            {
                "lang_code": "sv",
                "lang": "Swedish",
                "word": "global",
                "pos": "adj",
                "etymology_text": "From glob + -al.",
                "etymology_templates": [
                    {"name": "etymon", "args": {"1": "sv", "2": ":af", "3": "glob", "4": "-al"}}
                ],
            },
            "kaikki_sv.jsonl",
        )

        claim = record["claims"][0]
        self.assertEqual(claim["relation"], "formed_from")
        self.assertEqual(claim["components"], ["glob", "-al"])

    def test_preserves_equivalent_affix_as_distinct_from_formation(self):
        record = source_record(
            {
                "lang_code": "en",
                "lang": "English",
                "word": "wherein",
                "pos": "adv",
                "etymology_templates": [
                    {"name": "ety", "args": {"1": "en", "2": ":afeq", "3": "where-", "4": "in"}}
                ],
            },
            "kaikki_en.jsonl",
        )

        claim = record["claims"][0]
        self.assertEqual(claim["relation"], "equivalent_to_components")
        self.assertEqual(claim["components"], ["where-", "in"])

    def test_keeps_unknown_structured_marker_unclassified(self):
        record = source_record(
            {
                "lang_code": "sv",
                "lang": "Swedish",
                "word": "word",
                "pos": "noun",
                "etymology_templates": [
                    {"name": "ety", "args": {"1": "sv", "2": ":rare-marker", "3": "sv:form"}}
                ],
            },
            "kaikki_sv.jsonl",
        )

        self.assertIsNone(record["claims"][0]["relation"])
        self.assertEqual(record["claims"][0]["unmapped_marker"], "rare-marker")

    def test_normalizes_direct_derivation_clipping_and_partial_calque_templates(self):
        record = source_record(
            {
                "lang_code": "sv",
                "lang": "Swedish",
                "word": "examples",
                "pos": "noun",
                "etymology_templates": [
                    {"name": "deverbal", "args": {"1": "sv", "2": "ticka"}},
                    {"name": "clipping", "args": {"1": "sv", "2": "biograf"}},
                    {"name": "pcal", "args": {"1": "sv", "2": "en", "3": "volleyball"}},
                ],
            },
            "kaikki_sv.jsonl",
        )

        derivation, clipping, calque = record["claims"]
        self.assertEqual((derivation["relation"], derivation["related_language"], derivation["related_form"]), ("derived_from", "sv", "ticka"))
        self.assertEqual((clipping["relation"], clipping["related_language"], clipping["related_form"]), ("clipped_from", "sv", "biograf"))
        self.assertEqual(calque["relation"], "partial_calque_of")

    def test_normalizes_verified_plain_language_relation_templates(self):
        record = source_record(
            {
                "lang_code": "sv",
                "lang": "Swedish",
                "word": "example",
                "pos": "noun",
                "etymology_templates": [
                    {"name": "derived", "args": {"1": "sv", "2": "de", "3": "Haus"}},
                    {"name": "inherited", "args": {"1": "sv", "2": "gmh", "3": "hūs"}},
                    {"name": "partial calque", "args": {"1": "sv", "2": "en", "3": "word"}},
                    {"name": "semantic loan", "args": {"1": "sv", "2": "de", "3": "Wort"}},
                    {"name": "unadapted borrowing", "args": {"1": "sv", "2": "pl", "3": "Warszawa"}},
                    {"name": "pseudo-loan", "args": {"1": "sv", "2": "en", "3": "evergreen"}},
                    {"name": "pseudoloan", "args": {"1": "sv", "2": "en", "3": "basket"}},
                    {"name": "cognate", "args": {"1": "da", "2": "ord"}},
                    {"name": "false cognate", "args": {"1": "en", "2": "word"}},
                    {"name": "back-form", "args": {"1": "sv", "2": "exempel"}},
                    {"name": "piecewise doublet", "args": {"1": "en", "2": "patternage"}},
                    {"name": "piecewise_doublet", "args": {"1": "en", "2": "patronage"}},
                    {"name": "surface analysis", "args": {"1": "sv", "2": "social", "3": "-ism"}},
                ],
            },
            "kaikki_sv.jsonl",
        )

        self.assertEqual(
            [
                (claim["relation"], claim.get("related_language"), claim.get("related_form"))
                for claim in record["claims"]
            ],
            [
                ("derived_from", "de", "Haus"),
                ("inherited_from", "gmh", "hūs"),
                ("partial_calque_of", "en", "word"),
                ("semantic_loan_from", "de", "Wort"),
                ("borrowed_from", "pl", "Warszawa"),
                ("pseudo_loan_based_on", "en", "evergreen"),
                ("pseudo_loan_based_on", "en", "basket"),
                ("cognate_mention", "da", "ord"),
                ("noncognate_mention", "en", "word"),
                ("back_formed_from", "sv", "exempel"),
                ("piecewise_doublet_of", "en", "patternage"),
                ("piecewise_doublet_of", "en", "patronage"),
                ("surface_analysis", "sv", None),
            ],
        )
        self.assertEqual(record["claims"][-1]["components"], ["social", "-ism"])

    def test_keeps_person_attribution_and_formation_facts_out_of_lexical_edges(self):
        record = source_record(
            {
                "lang_code": "sv",
                "lang": "Swedish",
                "word": "dator",
                "pos": "noun",
                "etymology_templates": [
                    {"name": "named-after", "args": {
                        "1": "sv", "2": "Börje Langefors", "nat": "Swedish",
                        "occ": "researcher", "born": "1915", "wplink": "Börje Langefors",
                    }},
                    {"name": "named-after/list", "args": {"1": "researcher"}},
                    {"name": "coinage", "args": {
                        "1": "sv", "2": "Q123", "in": "1956", "exnihilo": "1",
                    }},
                    {"name": "onom", "args": {"1": "sv", "title": "imitative"}},
                ],
            },
            "kaikki_sv.jsonl",
        )

        named_after, coinage, onomatopoeia = record["claims"]
        self.assertEqual(named_after["relation"], "named_after")
        self.assertEqual(named_after["related_entity"], {
            "name": "Börje Langefors",
            "nationality": "Swedish",
            "occupation": "researcher",
            "wikipedia_title": "Börje Langefors",
            "born": "1915",
        })
        self.assertEqual(coinage["relation"], "coined_by")
        self.assertEqual(coinage["related_entity"], {"wikidata_id": "Q123", "date": "1956"})
        self.assertEqual(coinage["formation_type"], "coinage")
        self.assertTrue(coinage["coined_ex_nihilo"])
        self.assertEqual(onomatopoeia["relation"], None)
        self.assertEqual(onomatopoeia["formation_type"], "onomatopoeic")
        self.assertEqual(onomatopoeia["source_label"], "imitative")
        self.assertEqual([t["name"] for t in record["templates"]], [
            "named-after", "named-after/list", "coinage", "onom",
        ])
        self.assertNotIn("named-after/list", [claim["template_name"] for claim in record["claims"]])

    def test_export_manifest_counts_relationships_formations_and_unmapped_separately(self):
        import json
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "kaikki_sv.jsonl").write_text("\n".join([
                json.dumps({"lang_code": "sv", "lang": "Swedish", "word": "dator", "pos": "noun",
                            "etymology_templates": [{"name": "coin", "args": {"1": "sv", "2": "Ture"}}]}),
                json.dumps({"lang_code": "sv", "lang": "Swedish", "word": "plopp", "pos": "noun",
                            "etymology_templates": [{"name": "onomatopoeic", "args": {"1": "sv"}}]}),
                json.dumps({"lang_code": "sv", "lang": "Swedish", "word": "mystery", "pos": "noun",
                            "etymology_templates": [{"name": "unknown-template", "args": {"1": "sv"}}]}),
            ]) + "\n", encoding="utf-8")

            manifest = export_records(root, ["sv"], root / "records.jsonl")

        self.assertEqual(manifest["normalized_relations"], {"coined_by": 1})
        self.assertEqual(manifest["formation_types"], {"coinage": 1, "onomatopoeic": 1})
        self.assertEqual(manifest["unmapped_templates"], {"unknown-template": 1})

    def test_keeps_surface_analysis_distinct_from_historical_formation(self):
        record = source_record(
            {
                "lang_code": "sv",
                "lang": "Swedish",
                "word": "socialism",
                "pos": "noun",
                "etymology_text": "Borrowed from French socialisme. By surface analysis, social + -ism.",
                "etymology_templates": [
                    {"name": "surf", "args": {"1": "sv", "2": "social", "3": "-ism"}}
                ],
            },
            "kaikki_sv.jsonl",
        )

        claim = record["claims"][0]
        self.assertEqual(claim["relation"], "surface_analysis")
        self.assertEqual(claim["components"], ["social", "-ism"])

    def test_preserves_each_direct_doublet_and_borrowing_target(self):
        record = source_record(
            {
                "lang_code": "sv",
                "lang": "Swedish",
                "word": "double-example",
                "pos": "noun",
                "etymology_templates": [
                    {"name": "dbt", "args": {"1": "sv", "2": "form-a", "3": "form-b"}},
                    {"name": "bor", "args": {"1": "sv", "2": "en,de", "3": "word-a", "4": "word-a-alt", "5": "source gloss"}},
                ],
            },
            "kaikki_sv.jsonl",
        )

        doublets, borrowed = record["claims"][:2], record["claims"][2:]
        self.assertEqual([claim["relation"] for claim in doublets], ["doublet_of", "doublet_of"])
        self.assertEqual([claim["related_form"] for claim in doublets], ["form-a", "form-b"])
        self.assertEqual([claim["related_form"] for claim in borrowed], ["word-a", "word-a"])
        self.assertEqual([claim["related_language"] for claim in borrowed], ["en", "de"])

    def test_keeps_separate_homograph_etymologies(self):
        common = {
            "lang_code": "sv",
            "lang": "Swedish",
            "word": "gift",
            "pos": "noun",
            "etymology_text": "Example etymology.",
            "senses": [{"id": "en-gift-sv-noun-example"}],
        }
        first = source_record({**common, "etymology_number": "1"}, "kaikki_sv.jsonl")
        second = source_record({**common, "etymology_number": "2"}, "kaikki_sv.jsonl")

        self.assertNotEqual(first["source_entry_key"], second["source_entry_key"])

    def test_keeps_prose_only_records_without_inventing_claims(self):
        record = source_record(
            {
                "lang_code": "sv",
                "lang": "Swedish",
                "word": "word",
                "pos": "noun",
                "etymology_text": "Origin uncertain.",
                "senses": [],
            },
            "kaikki_sv.jsonl",
        )

        self.assertEqual(record["claims"], [])
        self.assertEqual(record["etymology_text"], "Origin uncertain.")


if __name__ == "__main__":
    unittest.main()
