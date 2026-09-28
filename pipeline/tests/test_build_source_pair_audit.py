import json
import tempfile
import unittest
from pathlib import Path

from build_source_pair_audit import audit_record, load_source_entries


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
            result = audit_record("gift", "sv", "en", {"category": "false_friend", "etymological_relation": "cognate"}, entries)

        self.assertEqual(
            [entry["source_entry_key"] for entry in result["source_entries"]["sv"]],
            ["sv|gift|noun|1|a", "sv|gift|adj|2|b"],
        )
        self.assertEqual([entry["source_entry_key"] for entry in result["source_entries"]["en"]], ["en|gift|noun||c"])
        self.assertEqual(result["comparison"]["category"], "false_friend")
        self.assertEqual(result["comparison"]["etymological_relation"], "cognate")
        self.assertIsNone(result["comparison"]["id"])
