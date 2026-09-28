import json

import pyarrow as pa
import pyarrow.parquet as pq

from audit_source_cognate_coverage import audit_coverage


def test_audit_counts_pair_specific_claims_once_across_directed_rows(tmp_path):
    active_sv = {
        "is_active_match": True,
        "source_entry_key": "sv|dator|noun||sv-dator-1",
        "source_sense_id": "sv-dator-1",
    }
    active_da = {
        "is_active_match": True,
        "source_entry_key": "da|dator|noun||da-dator-1",
        "source_sense_id": "da-dator-1",
    }
    rows = [
        {
            "lang_a": "sv", "word_a": "dator", "lang_b": "da", "word_b": "dator",
            "category": "other", "senses_a": json.dumps([active_sv]), "senses_b": json.dumps([active_da]),
        },
        {
            "lang_a": "da", "word_a": "dator", "lang_b": "sv", "word_b": "dator",
            "category": "other", "senses_a": json.dumps([active_da]), "senses_b": json.dumps([active_sv]),
        },
        {
            "lang_a": "sv", "word_a": "dator", "lang_b": "en", "word_b": "computer",
            "category": "other", "senses_a": json.dumps([active_sv]), "senses_b": json.dumps([{}]),
        },
    ]
    comparisons = tmp_path / "comparisons.parquet"
    pq.write_table(pa.Table.from_pylist(rows), comparisons)
    source_records = tmp_path / "source_records.jsonl"
    source_records.write_text(json.dumps({
        "language_code": "sv",
        "source_entry_key": active_sv["source_entry_key"],
        "claims": [{
            "template_index": 0,
            "relation": "cognate_mention",
            "related_language": "da",
            "related_form": "dator",
        }, {
            "template_index": 1,
            "relation": "borrowed_from",
            "related_language": "en",
            "related_form": "computer",
        }],
    }) + "\n", encoding="utf-8")
    matches_output = tmp_path / "matched_claims.jsonl"

    result = audit_coverage(source_records, comparisons, matches_output)

    assert result["cognate_mentions"][("sv", "da")] == {
        "source_claims": 1,
        "active_source_entry_candidates": 1,
        "both_active_sense_ids": 1,
    }
    assert result["other_candidates"][("en", "sv")]["with_pair_specific_claim"] == 1
    summary = result["other_candidates"][("da", "sv")]
    assert summary["candidate_count"] == 1
    assert summary["with_pair_specific_claim"] == 1
    assert summary["relations"] == {"cognate_mention": 1}
    matches = [json.loads(line) for line in matches_output.read_text(encoding="utf-8").splitlines()]
    match = next(row for row in matches if row["target_form_match"]["language_code"] == "da")
    assert match["candidate"]["category"] == "other"
    assert match["source_active_sense"]["source_sense_id"] == "sv-dator-1"
    assert match["target_form_match"]["active_sense_id"] == "da-dator-1"
    assert match["target_form_match"]["active_identity_status"] == "available"
    en_match = next(row for row in matches if row["target_form_match"]["language_code"] == "en")
    assert en_match["target_form_match"]["active_identity_status"] == "missing_entry"
    manifest = json.loads(matches_output.with_suffix(".jsonl.manifest.json").read_text(encoding="utf-8"))
    assert manifest["source_claim_candidate_matches"] == 2
    assert manifest["evidence_rows_by_candidate_category"] == {"other": 2}
    assert manifest["unique_candidates_with_source_claim_by_category"] == {"other": 2}
    assert manifest["evidence_rows_by_target_identity"] == {"available": 1, "missing_entry": 1}
    assert "does not assert that they apply to the selected target sense" in manifest["matching_rule"]


def test_export_keeps_candidate_ids_for_an_ambiguous_target_identity(tmp_path):
    source_sense = {
        "is_active_match": True,
        "source_entry_key": "sv|dator|noun||sv-dator-1",
        "source_sense_id": "sv-dator-1",
    }
    target_sense = {
        "is_active_match": True,
        "source_identity_ambiguous": True,
        "source_identity_candidates": [
            {"source_entry_key": "da|dator|noun|1|da-1", "source_sense_id": "da-1"},
            {"source_entry_key": "da|dator|noun|2|da-2", "source_sense_id": "da-2"},
        ],
    }
    comparisons = tmp_path / "comparisons.parquet"
    pq.write_table(pa.Table.from_pylist([{
        "lang_a": "sv", "word_a": "dator", "lang_b": "da", "word_b": "dator",
        "category": "other", "senses_a": json.dumps([source_sense]), "senses_b": json.dumps([target_sense]),
    }]), comparisons)
    source_records = tmp_path / "source_records.jsonl"
    source_records.write_text(json.dumps({
        "language_code": "sv",
        "source_entry_key": source_sense["source_entry_key"],
        "claims": [{
            "template_index": 0,
            "relation": "cognate_mention",
            "related_language": "da",
            "related_form": "dator",
        }],
    }) + "\n", encoding="utf-8")
    matches_output = tmp_path / "matched_claims.jsonl"

    result = audit_coverage(source_records, comparisons, matches_output)

    assert result["cognate_mentions"][("sv", "da")]["both_active_sense_ids"] == 0
    match = json.loads(matches_output.read_text(encoding="utf-8"))
    assert match["target_form_match"]["active_identity_status"] == "ambiguous"
    assert match["target_form_match"]["source_identity_candidates"] == target_sense["source_identity_candidates"]
