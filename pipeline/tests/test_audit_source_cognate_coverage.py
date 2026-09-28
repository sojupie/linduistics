import json

import pyarrow as pa
import pyarrow.parquet as pq

from audit_source_cognate_coverage import audit_coverage


def test_audit_counts_source_claims_only_when_the_claiming_entry_is_active(tmp_path):
    source_path = tmp_path / "source_claims.jsonl"
    with source_path.open("w", encoding="utf-8") as source:
        source.write(json.dumps({
            "language_code": "sv",
            "source_entry_key": "sv|greve|noun||sv-greve",
            "claims": [
                {"relation": "cognate_mention", "template_index": 0, "related_language": "da", "related_form": "Greve"},
                {"relation": "borrowed_from", "template_index": 1, "related_language": "da", "related_form": "Greve"},
            ],
        }) + "\n")
    comparisons_path = tmp_path / "comparisons.parquet"
    row = {
        "lang_a": "sv", "lang_b": "da", "word_b": "greve",
        "word_a": "greve", "category": "other",
        "senses_a": json.dumps([{"is_active_match": True, "source_entry_key": "sv|greve|noun||sv-greve",
                                  "source_sense_id": "sv-greve"}]),
        "senses_b": json.dumps([{"is_active_match": True, "source_entry_key": "da|greve|noun||da-greve",
                                  "source_sense_id": "da-greve"}]),
    }
    pq.write_table(pa.Table.from_pylist([row]), comparisons_path)

    counts = audit_coverage(source_path, comparisons_path)

    assert counts["cognate_mentions"][("sv", "da")] == {
        "source_claims": 1,
        "active_source_entry_candidates": 1,
        "both_active_sense_ids": 1,
    }
    assert counts["other_candidates"][("da", "sv")] == {
        "candidate_count": 1,
        "with_pair_specific_claim": 1,
        "relations": {"cognate_mention": 1, "borrowed_from": 1},
    }
