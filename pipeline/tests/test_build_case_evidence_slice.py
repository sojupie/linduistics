import gzip
import json

import pyarrow as pa
import pyarrow.parquet as pq

from build_case_evidence_slice import build_slice, case_for_candidate


def test_case_lookup_preserves_language_pair_and_accepts_case_and_direction():
    assert case_for_candidate({"lang_a": "en", "word_a": "BANK", "lang_b": "sv", "word_b": "Bank"}) == "bank"
    assert case_for_candidate({"lang_a": "sv", "word_a": "bankman", "lang_b": "en", "word_b": "bankman"}) == "bankman"
    assert case_for_candidate({"lang_a": "en", "word_a": "clown", "lang_b": "da", "word_b": "klovn"}) == "clown"
    assert case_for_candidate({"lang_a": "sv", "word_a": "bank", "lang_b": "en", "word_b": "bankman"}) is None
    assert case_for_candidate({"lang_a": "da", "word_a": "god", "lang_b": "de", "word_b": "gut"}) == "gut"
    assert case_for_candidate({"lang_a": "sv", "word_a": "arbete", "lang_b": "da", "word_b": "arbejde"}) == "arbeit"
    assert case_for_candidate({"lang_a": "nb", "word_a": "kurv", "lang_b": "da", "word_b": "kurv"}) == "kurv"
    assert case_for_candidate({"lang_a": "sv", "word_a": "översätta", "lang_b": "da", "word_b": "oversætte"}) == "oversatta"
    assert case_for_candidate({"lang_a": "da", "word_a": "ramsløg", "lang_b": "sv", "word_b": "ramslök"}) == "ramslog"
    assert case_for_candidate({"lang_a": "de", "word_a": "berauben", "lang_b": "en", "word_b": "bereave"}) == "bereave"
    assert case_for_candidate({"lang_a": "en", "word_a": "stepdaughter", "lang_b": "de", "word_b": "Stieftochter"}) == "stepdaughter"
    assert case_for_candidate({"lang_a": "nb", "word_a": "blive", "lang_b": "da", "word_b": "blive"}) == "blive"
    assert case_for_candidate({"lang_a": "sv", "word_a": "väg", "lang_b": "da", "word_b": "væg"}) == "wall_road"


def test_slice_links_only_active_source_entries_and_keeps_component_candidates(tmp_path):
    comparisons = tmp_path / "comparisons.parquet"
    pq.write_table(pa.Table.from_pylist([{
        "lang_a": "sv", "word_a": "fleece", "pos_a": "noun", "def_a": "wool",
        "etym_root_a": None, "etym_text_a": "Borrowed from English.",
        "lang_b": "en", "word_b": "fleece", "pos_b": "noun", "def_b": "wool",
        "etym_root_b": "Proto-West Germanic *fleus", "etym_text_b": "Inherited from Old English.",
        "category": "other", "etymological_relation": "unknown",
        "orthographic_sim": 1.0, "phonetic_sim": 0.9, "semantic_sim": 0.8,
        "senses_a": json.dumps([{"is_active_match": True, "source_entry_key": "sv|fleece|noun||sv-fleece", "source_sense_id": "sv-fleece"}]),
        "senses_b": json.dumps([{"is_active_match": True, "source_entry_key": "en|fleece|noun||en-fleece", "source_sense_id": "en-fleece"}]),
        "translation_source_senses": "[]",
    }]), comparisons)
    source_records = tmp_path / "sources.jsonl"
    source_records.write_text("\n".join(json.dumps(row) for row in [
        {"source_entry_key": "sv|fleece|noun||sv-fleece", "language_code": "sv", "word": "fleece", "sense_ids": ["sv-fleece"], "claims": [{"relation": "borrowed_from", "related_language": "en", "related_form": "fleece"}]},
        {"source_entry_key": "en|fleece|noun||en-fleece", "language_code": "en", "word": "fleece", "sense_ids": ["en-fleece"], "claims": [{"relation": "inherited_from", "related_language": "gmw-pro", "related_form": "*fleus"}]},
        {"source_entry_key": "sv|fleece|verb||sv-fleece-verb", "language_code": "sv", "word": "fleece", "sense_ids": ["sv-fleece-verb"], "claims": []},
        {"source_entry_key": "sv|flee|verb||sv-flee", "language_code": "sv", "word": "flee", "sense_ids": ["sv-flee"], "claims": [{"relation": "inherited_from", "related_language": "gem-pro", "related_form": "*fleus"}]},
        {"source_entry_key": "en|flee|verb||en-flee", "language_code": "en", "word": "flee", "sense_ids": ["en-flee"], "claims": [{"relation": "inherited_from", "related_language": "gem-pro", "related_form": "*fleus"}]},
    ]) + "\n", encoding="utf-8")
    components = tmp_path / "components.jsonl.gz"
    with gzip.open(components, "wt", encoding="utf-8") as stream:
        stream.write(json.dumps({"source_entry_key": "sv|fleece|noun||sv-fleece", "relation": "compound_of", "components": []}) + "\n")
    claim_matches = tmp_path / "claim_matches.jsonl"
    claim_matches.write_text(json.dumps({
        "match_id": "loan-match",
        "candidate": {"forms": [{"language_code": "en", "word": "fleece"}, {"language_code": "sv", "word": "fleece"}]},
        "claim": {"relation": "borrowed_from"},
        "target_form_match": {"active_identity_status": "available"},
    }) + "\n", encoding="utf-8")
    shared_ancestors = tmp_path / "shared_ancestors.jsonl.gz"
    with gzip.open(shared_ancestors, "wt", encoding="utf-8") as stream:
        stream.write(json.dumps({
            "ancestor": {"language_code": "gem-pro", "form": "*fleus"},
            "basis": "unique_exact_entry_only",
            "component_uses_by_language": {
                "sv": [{"parent_entry_key": "sv|fleece|noun||sv-fleece", "component_form": "flee", "component_entry_key": "sv|flee|verb||sv-flee"}],
                "en": [{"parent_entry_key": "en|fleece|noun||en-fleece", "component_form": "flee", "component_entry_key": "en|flee|verb||en-flee"}],
                "da": [{"parent_entry_key": "da|fleece|noun||unrelated", "component_form": "flee"}],
            },
        }) + "\n")
    output = tmp_path / "slice.jsonl"

    manifest = build_slice(comparisons, source_records, claim_matches, components, output, shared_ancestor_candidates=shared_ancestors)

    cases = {row["case_id"]: row for row in map(json.loads, output.read_text(encoding="utf-8").splitlines())}
    fleece = cases["fleece"]
    assert len(fleece["comparisons"]) == 1
    assert [row["comparison_sense_alignment"]["status"] for row in fleece["source_entries"]] == ["exact_sense_overlap", "exact_sense_overlap"]
    assert fleece["pair_claim_matches"][0]["claim"]["relation"] == "borrowed_from"
    assert fleece["pair_claim_matches"][0]["target_form_match"]["active_identity_status"] == "available"
    assert len(fleece["component_links"]) == 1
    assert len(fleece["shared_component_ancestors"]) == 1
    assert fleece["shared_component_ancestors"][0]["ancestor"] == {"language_code": "gem-pro", "form": "*fleus"}
    assert set(fleece["shared_component_ancestors"][0]["matched_uses_by_language"]) == {"sv", "en"}
    assert {row["source_entry_key"] for row in fleece["component_source_entries"]} == {"sv|flee|verb||sv-flee", "en|flee|verb||en-flee"}
    assert manifest["case_counts"]["fleece"] == {"comparison_candidates": 1, "source_entries": 2, "component_source_entries": 2, "pair_claim_matches": 1, "component_claims": 1, "shared_component_ancestor_candidates": 1}
