import json

import pyarrow as pa
import pyarrow.parquet as pq

from audit_source_origin_status_coverage import audit_origin_status_coverage


def test_links_origin_status_to_active_sense_or_entry_only_once(tmp_path):
    entry_key = "sv|bank|noun||sv-bank-1"
    active_senses = [
        {"is_active_match": True, "source_entry_key": entry_key, "source_sense_id": "sv-bank-sense-1",
         "comparison_gloss": "financial institution"},
        {"is_active_match": True, "source_entry_key": entry_key, "source_sense_id": "sv-bank-sense-2",
         "comparison_gloss": "river edge"},
    ]
    target_sense = {
        "is_active_match": True,
        "source_entry_key": "en|bank|noun||en-bank-1",
        "source_sense_id": "en-bank-sense-1",
    }
    rows = [
        {"lang_a": "sv", "word_a": "bank", "lang_b": "en", "word_b": "bank", "category": "other",
         "senses_a": json.dumps(active_senses), "senses_b": json.dumps([target_sense])},
        {"lang_a": "en", "word_a": "bank", "lang_b": "sv", "word_b": "bank", "category": "other",
         "senses_a": json.dumps([target_sense]), "senses_b": json.dumps(active_senses)},
    ]
    comparisons = tmp_path / "comparisons.parquet"
    pq.write_table(pa.Table.from_pylist(rows), comparisons)
    source_records = tmp_path / "source_records.jsonl"
    matched_status_record = {
        "language_code": "sv",
        "source_entry_key": entry_key,
        "source": "Wiktionary",
        "sense_ids": ["sv-bank-sense-1"],
        "source_senses": [{
            "id": "sv-bank-sense-1",
            "glosses": ["financial institution"],
            "raw_glosses": ["(finance) financial institution"],
        }],
        "claims": [{
            "template_index": 0,
            "template_name": "unknown",
            "source_etymology_status": "unknown",
            "source_label": "unknown",
            "args": {"1": "sv"},
        }, {
            "template_index": 1,
            "template_name": "cog",
            "relation": "cognate_mention",
            "related_language": "da",
            "related_form": "bank",
        }],
    }
    unmatched_status_record = {
        "language_code": "sv",
        "source_entry_key": "sv|missing|noun||sv-missing-1",
        "sense_ids": ["sv-missing-sense-1"],
        "claims": [{"template_index": 0, "template_name": "unc", "source_etymology_status": "uncertain"}],
    }
    source_records.write_text(
        json.dumps(matched_status_record) + "\n" + json.dumps(unmatched_status_record) + "\n",
        encoding="utf-8",
    )
    output = tmp_path / "origin_status_matches.jsonl"

    manifest = audit_origin_status_coverage(source_records, comparisons, output)

    matches = [json.loads(line) for line in output.read_text(encoding="utf-8").splitlines()]
    assert len(matches) == 2
    assert {row["source_etymology_status"]["alignment_status"] for row in matches} == {
        "exact_sense_overlap", "entry_level_only"
    }
    exact_match = next(row for row in matches if row["source_active_sense"]["source_sense_id"] == "sv-bank-sense-1")
    assert exact_match["source_active_sense"]["glosses"] == ["financial institution"]
    assert all(row["candidate"]["category"] == "other" for row in matches)
    assert len({row["match_id"] for row in matches}) == len(matches)
    assert manifest["evidence_rows"] == 2
    assert manifest["source_status_claims_by_status"] == {"uncertain": 1, "unknown": 1}
    assert manifest["source_status_claims_with_active_candidate_by_status"] == {"unknown": 1}
    assert manifest["source_status_claims_without_active_candidate_by_status"] == {"uncertain": 1}
    assert manifest["source_records_by_status"] == {"uncertain": 1, "unknown": 1}
    assert manifest["source_records_with_other_normalized_relations_by_status"] == {"unknown": 1}
    assert manifest["source_records_by_status_and_cooccurring_relation"] == {
        "unknown|cognate_mention": 1,
    }
    assert manifest["evidence_rows_by_status_category_alignment"] == {
        "unknown|other|entry_level_only": 1,
        "unknown|other|exact_sense_overlap": 1,
    }
    assert manifest["unique_candidate_pairs_by_status_category"] == {"unknown|other": 1}
    first_output = output.read_bytes()
    audit_origin_status_coverage(source_records, comparisons, output, force=True)
    assert output.read_bytes() == first_output
