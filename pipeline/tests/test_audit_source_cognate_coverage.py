import hashlib
import json
from pathlib import Path

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
    assert manifest["unique_candidates_with_source_claim_by_category_and_relation"] == {
        "other": {"borrowed_from": 1, "cognate_mention": 1},
    }
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


def test_exact_target_form_match_wins_over_casefold_homograph(tmp_path):
    source_sense = {
        "is_active_match": True,
        "source_entry_key": "en|plat|adj|3|en-plat-adj",
        "source_sense_id": "en-plat-adj",
        "gloss": "Flat; level.",
        "etym_root": "Proto-Indo-European *pleth₂-",
    }
    lower_target = {
        "is_active_match": True,
        "source_entry_key": "de|platt|adj||de-platt-adj",
        "source_sense_id": "de-platt-flat",
        "gloss": "flat",
        "etym_root": "Ancient Greek πλατύς",
    }
    upper_target = {
        "is_active_match": True,
        "source_entry_key": "de|Platt|noun||de-Platt-noun",
        "source_sense_id": "de-Platt-Low-German",
        "comparison_gloss": "Low German",
    }
    rows = [
        {
            "lang_a": "en", "word_a": "plat", "lang_b": "de", "word_b": "platt",
            "category": "other", "senses_a": json.dumps([source_sense]), "senses_b": json.dumps([lower_target]),
        },
        {
            "lang_a": "en", "word_a": "plat", "lang_b": "de", "word_b": "Platt",
            "category": "false_friend", "senses_a": json.dumps([source_sense]), "senses_b": json.dumps([upper_target]),
        },
    ]
    comparisons = tmp_path / "comparisons.parquet"
    pq.write_table(pa.Table.from_pylist(rows), comparisons)
    source_records = tmp_path / "source_records.jsonl"
    source_records.write_text(json.dumps({
        "language_code": "en",
        "source_entry_key": source_sense["source_entry_key"],
        "claims": [{
            "template_index": 0,
            "relation": "cognate_mention",
            "related_language": "de",
            "related_form": "platt",
        }],
    }) + "\n", encoding="utf-8")
    matches_output = tmp_path / "matched_claims.jsonl"

    audit_coverage(source_records, comparisons, matches_output)

    matches = [json.loads(line) for line in matches_output.read_text(encoding="utf-8").splitlines()]
    assert len(matches) == 1
    assert matches[0]["candidate"]["forms"] == [
        {"language_code": "de", "word": "platt"},
        {"language_code": "en", "word": "plat"},
    ]
    assert matches[0]["target_form_match"]["active_entry_key"] == "de|platt|adj||de-platt-adj"
    assert matches[0]["target_form_match"]["form_match_method"] == "exact"
    assert matches[0]["source_active_sense"] == {
        "source_sense_id": "en-plat-adj",
        "gloss": "Flat; level.",
        "etymological_root": "Proto-Indo-European *pleth₂-",
    }
    assert matches[0]["target_form_match"]["active_sense_gloss"] == "flat"
    assert matches[0]["target_form_match"]["active_sense_etymological_root"] == "Ancient Greek πλατύς"


def test_casefold_is_used_only_when_no_exact_target_form_exists(tmp_path):
    source_sense = {
        "is_active_match": True,
        "source_entry_key": "en|plat|adj|3|en-plat-adj",
        "source_sense_id": "en-plat-adj",
    }
    target_sense = {
        "is_active_match": True,
        "source_entry_key": "de|Platt|noun||de-Platt-noun",
        "source_sense_id": "de-Platt-noun",
    }
    comparisons = tmp_path / "comparisons.parquet"
    pq.write_table(pa.Table.from_pylist([{
        "lang_a": "en", "word_a": "plat", "lang_b": "de", "word_b": "Platt",
        "category": "false_friend", "senses_a": json.dumps([source_sense]), "senses_b": json.dumps([target_sense]),
    }]), comparisons)
    source_records = tmp_path / "source_records.jsonl"
    source_records.write_text(json.dumps({
        "language_code": "en",
        "source_entry_key": source_sense["source_entry_key"],
        "claims": [{
            "template_index": 0,
            "relation": "cognate_mention",
            "related_language": "de",
            "related_form": "platt",
        }],
    }) + "\n", encoding="utf-8")
    matches_output = tmp_path / "matched_claims.jsonl"

    audit_coverage(source_records, comparisons, matches_output)

    match = json.loads(matches_output.read_text(encoding="utf-8"))
    assert match["target_form_match"]["active_entry_key"] == "de|Platt|noun||de-Platt-noun"
    assert match["target_form_match"]["form_match_method"] == "casefold_fallback"
    manifest = json.loads(matches_output.with_suffix(".jsonl.manifest.json").read_text(encoding="utf-8"))
    assert manifest["generator_file"] == "audit_source_cognate_coverage.py"
    generator = Path(__file__).parents[1] / "src" / manifest["generator_file"]
    assert manifest["generator_sha256"] == hashlib.sha256(generator.read_bytes()).hexdigest()
    assert manifest["evidence_rows_by_form_match_method"] == {"casefold_fallback": 1}
    assert "exact target-form spelling" in manifest["matching_rule"]
