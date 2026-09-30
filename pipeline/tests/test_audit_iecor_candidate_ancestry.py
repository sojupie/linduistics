import json
from pathlib import Path

from pipeline.src.audit_iecor_candidate_ancestry import audit, pair_status


def test_candidate_pair_status_keeps_missing_records_distinct_from_no_evidence():
    assert pair_status(0, 2, 0, 0, 0) == "no_two_sided_local_entries"
    assert pair_status(1, 1, 1, 0, 0) == "entry_evidence_incomplete"
    assert pair_status(1, 1, 0, 0, 0) == "no_entry_ancestry_evidence"
    assert pair_status(1, 1, 1, 1, 0) == "entry_shared_ancestor_found"
    assert pair_status(1, 1, 0, 0, 1) == "entry_shared_proto_mention_found"


def test_audit_compares_unique_entries_and_keeps_senses_attached(tmp_path: Path):
    crosswalk = tmp_path / "crosswalk.jsonl"
    pairs = tmp_path / "pairs.jsonl"
    records = tmp_path / "records.jsonl"
    pair_output = tmp_path / "result_pairs.jsonl"
    evidence_output = tmp_path / "result_evidence.jsonl"
    entry_claims_output = tmp_path / "result_entry_claims.jsonl"
    related_claims_output = tmp_path / "result_related_claims.jsonl"

    rows = [
        {"concept_id": "1", "language_code": "da", "local_source_entry_key": "da|ild|n|e1",
         "local_source_sense_id": "da-s1", "local_word": "ild", "local_pos": "noun",
         "local_sense_gloss": "fire", "local_etymology_root": "Proto-Germanic *ailidaz", "local_source_url": "da-url"},
        {"concept_id": "1", "language_code": "da", "local_source_entry_key": "da|ild|n|e1",
         "local_source_sense_id": "da-s2", "local_word": "ild", "local_pos": "noun",
         "local_sense_gloss": "heat", "local_etymology_root": "Proto-Germanic *ailidaz", "local_source_url": "da-url"},
        {"concept_id": "1", "language_code": "sv", "local_source_entry_key": "sv|eld|n|e1",
         "local_source_sense_id": "sv-s1", "local_word": "eld", "local_pos": "noun",
         "local_sense_gloss": "fire", "local_etymology_root": "Proto-Germanic *ailidaz", "local_source_url": "sv-url"},
    ]
    pair = {"concept_id": "1", "concept": "fire", "source_language": "da", "target_language": "sv",
            "reference_relation": "shared_cognate_set"}
    source_records = [
        {"source_entry_key": "da|ild|n|e1", "claims": [
            {"relation": "inherited_from", "related_language": "gem-pro", "related_form": "*ailidaz"},
            {"relation": "cognate_mention", "related_language": "sv", "related_form": "eld"},
        ]},
        {"source_entry_key": "sv|eld|n|e1", "claims": [
            {"relation": "inherited_from", "related_language": "gem-pro", "related_form": "*ailidaz"},
            {"relation": "borrowed_from", "related_language": "da", "related_form": "ILD"},
        ]},
    ]
    crosswalk.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
    pairs.write_text(json.dumps(pair) + "\n", encoding="utf-8")
    records.write_text("".join(json.dumps(row) + "\n" for row in source_records), encoding="utf-8")

    result = audit(
        crosswalk, pairs, records, pair_output, evidence_output,
        entry_claims_output, related_claims_output,
    )

    pair_result = json.loads(pair_output.read_text(encoding="utf-8"))
    evidence = json.loads(evidence_output.read_text(encoding="utf-8"))
    related_claims = [
        json.loads(line) for line in related_claims_output.read_text(encoding="utf-8").splitlines()
    ]
    entry_claims = [
        json.loads(line) for line in entry_claims_output.read_text(encoding="utf-8").splitlines()
    ]
    assert result["local_etymology_entries"] == 2
    assert pair_result["etymology_entry_combinations"] == 1
    assert pair_result["entry_evidence_status"] == "entry_shared_ancestor_found"
    assert [sense["sense_id"] for sense in evidence["source_entry"]["sense_candidates"]] == ["da-s1", "da-s2"]
    assert evidence["shared_ancestors"][0]["form"] == "*ailidaz"
    assert result["related_panel_form_claim_links"]["rows"] == 2
    assert result["candidate_entry_source_claims"]["rows"] == 4
    assert {row["claim_relation"] for row in entry_claims} == {
        "inherited_from", "cognate_mention", "borrowed_from",
    }
    assert {row["claim_relation"] for row in related_claims} == {"cognate_mention", "borrowed_from"}
    assert {row["target_form_match_method"] for row in related_claims} == {"exact", "casefold"}
    assert all(row["evidence_type"] == "source_claim_names_panel_form" for row in related_claims)
