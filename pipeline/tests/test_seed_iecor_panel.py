import json

from pipeline.src.seed_iecor_panel import (
    build_source_claim_rows,
    build_candidate_evidence_rows,
    build_candidate_entry_claim_rows,
    build_candidate_relation_claim_link_rows,
    build_candidate_pair_rows,
    build_pair_evidence_rows,
    build_table_rows,
)


def test_source_claim_rows_preserve_distinct_source_relations(tmp_path):
    crosswalk = [
        {
            "concept_id": "55", "reference_form_id": "nb-55",
            "language_code": "nb", "local_word": "blomst",
            "local_source_entry_key": "nb|blomst|noun||sense-nb",
            "local_source_url": "https://example.test/blomst",
            "sense_review_status": "selected_primary",
        },
        {
            "concept_id": "55", "reference_form_id": "nb-55",
            "language_code": "nb", "local_word": "blomst",
            "local_source_entry_key": "nb|blomst|noun||other-sense",
            "local_source_url": "https://example.test/blomst",
            "sense_review_status": "unreviewed",
        },
    ]
    claims = [
        {"template_name": "root", "relation": "rooted_in", "related_language": "ine-pro", "related_form": "*bʰleh₃-"},
        {"template_name": "der", "relation": "derived_from", "related_language": "da", "related_form": "blomst"},
        {"template_name": "cog", "relation": "cognate_mention", "related_language": "de", "related_form": "Blume"},
    ]
    source_records = tmp_path / "etymology.jsonl"
    source_records.write_text(json.dumps({
        "source_entry_key": "nb|blomst|noun||sense-nb",
        "source": "Wiktionary via Kaikki/Wiktextract",
        "claims": claims,
    }) + "\n", encoding="utf-8")

    rows, found, missing = build_source_claim_rows(crosswalk, source_records)

    assert found == 1
    assert missing == 0
    assert [row[10] for row in rows] == ["rooted_in", "derived_from", "cognate_mention"]
    assert [json.loads(row[13]) for row in rows] == claims
    assert all(row[2:4] == ("55", "nb-55") for row in rows)


def test_build_table_rows_preserves_reference_and_local_links():
    crosswalk = [
        {
            "concept_id": "1", "concepticon_id": "1", "concept": "blood",
            "concepticon_definition": "blood", "reference_form_id": "da-1",
            "language_code": "da", "reference_form": "blod", "reference_segments": "b l o d",
            "reference_cognatesets": ["10"], "entry_match_status": "exact_spelling",
            "local_word": "blod", "local_source_url": "https://en.wiktionary.org/wiki/blod#Danish",
            "local_sense_gloss": "blood", "local_sense_tags": [],
            "local_etymology_root": "Proto-Germanic *blōþą",
            "local_source_sense_id": "sense-da", "local_source_entry_key": "entry-da",
            "sense_review_status": "selected_primary",
        },
        {
            "concept_id": "1", "concepticon_id": "1", "concept": "blood",
            "concepticon_definition": "blood", "reference_form_id": "en-1",
            "language_code": "en", "reference_form": "blood", "reference_segments": "b l ʌ d",
            "reference_cognatesets": ["10"], "entry_match_status": "exact_spelling",
            "local_word": "blood", "local_source_url": "https://en.wiktionary.org/wiki/blood#English",
            "local_sense_gloss": "", "local_sense_tags": [], "local_etymology_root": "",
            "local_source_sense_id": "", "local_source_entry_key": "",
            "sense_review_status": "unreviewed",
        },
    ]
    pairs = [{
        "concept_id": "1", "source_language": "da", "target_language": "en",
        "reference_relation": "shared_cognate_set", "shared_cognate_set_ids": ["10"],
        "unassigned_form_ids": [],
    }]

    concepts, forms, links, meaning_pairs = build_table_rows(crosswalk, pairs)

    assert (len(concepts), len(forms), len(links), len(meaning_pairs)) == (1, 2, 1, 1)
    assert forms[0][7] == ["10"]
    assert links[0][4:6] == ("sense-da", "entry-da")
    assert links[0][-1] == "Proto-Germanic *blōþą"
    assert meaning_pairs[0][5:7] == ("shared_cognate_set", ["10"])


def test_pair_evidence_rows_keep_meaning_alignment_and_raw_claim_basis():
    row = {
        "ancestry_status": "shared_direct_ancestor_claim",
        "source_word": "fire", "target_word": "Feuer",
        "source_sense_id": "sense-en", "target_sense_id": "sense-de",
        "source_entry_key": "en|fire", "target_entry_key": "de|Feuer",
        "source_url": "https://en.wiktionary.org/wiki/fire#English",
        "target_url": "https://en.wiktionary.org/wiki/Feuer#German",
        "shared_direct_ancestor_claims": [{"language_code": "gmw-pro", "form": "*fuir"}],
        "shared_proto_ancestor_mentions": [],
        "concept_id": "50", "source_language": "en", "target_language": "de",
    }

    values = build_pair_evidence_rows([row])[0]

    assert values[0] == "shared_direct_ancestor_claim"
    assert json.loads(values[9]) == {
        "direct_claims": [{"language_code": "gmw-pro", "form": "*fuir"}],
        "proto_mentions": [],
    }
    assert values[10:] == ("50", "en", "de")


def test_candidate_ancestry_rows_preserve_entry_level_evidence_and_sense_alternatives():
    pair = {
        "entry_evidence_status": "entry_shared_ancestor_found",
        "source_etymology_entries": 1, "target_etymology_entries": 2,
        "etymology_entry_combinations": 2,
        "combinations_with_missing_source_record": 1,
        "direct_ancestor_candidate_pairs": 1, "proto_mention_candidate_pairs": 0,
        "concept_id": "221", "source_language": "da", "target_language": "de",
    }
    evidence = {
        "concept_id": "221", "source_language": "da", "target_language": "de",
        "source_entry": {
            "entry_key": "da|spille", "url": "https://example.test/spille",
            "sense_candidates": [{"sense_id": "da-1", "gloss": "to play"}],
        },
        "target_entry": {
            "entry_key": "de|spielen", "url": "https://example.test/spielen",
            "sense_candidates": [{"sense_id": "de-1", "gloss": "to play a game"}],
        },
        "source_etymology_claims": [{"relation": "inherited_from", "related_form": "*spilōn"}],
        "target_etymology_claims": [{"relation": "borrowed_from", "related_form": "spilōn"}],
        "evidence_type": "shared_direct_ancestor_claim",
        "shared_ancestors": [{"language_code": "gmw-pro", "form": "*spilōn"}],
    }

    summary_values = build_candidate_pair_rows([pair])[0]
    evidence_values = build_candidate_evidence_rows([evidence])[0]

    assert summary_values == (
        "entry_shared_ancestor_found", 1, 2, 2, 1, 1, 0, "221", "da", "de"
    )
    assert evidence_values[:10] == (
        "IE-CoR", "1.1", "221", "da", "de", "da|spille", "de|spielen",
        "shared_direct_ancestor_claim", "https://example.test/spille", "https://example.test/spielen",
    )
    assert json.loads(evidence_values[10]) == evidence["source_entry"]["sense_candidates"]
    assert json.loads(evidence_values[12]) == evidence["source_etymology_claims"]
    assert json.loads(evidence_values[13]) == evidence["target_etymology_claims"]
    assert json.loads(evidence_values[14]) == evidence["shared_ancestors"]


def test_candidate_source_claim_rows_keep_claim_and_pair_directions_separate():
    entry_claim = {
        "concept_id": "55", "language_code": "nb",
        "source_entry": {
            "entry_key": "nb|blomst", "word": "blomst",
            "url": "https://example.test/blomst",
            "panel_forms": [{"form_id": "nb-55", "form": "blomst"}],
            "sense_candidates": [{"sense_id": "sense-nb", "review_status": "selected_primary"}],
        },
        "claim_index": 2, "claim_relation": "cognate_mention",
        "related_language": "de", "related_form": "Blume",
        "source_claim": {"relation": "cognate_mention", "related_language": "de", "related_form": "Blume"},
    }
    linked_claim = {
        "concept_id": "55", "meaning_pair_source_language": "de",
        "meaning_pair_target_language": "nb", "source_language": "nb", "target_language": "de",
        "source_entry": entry_claim["source_entry"],
        "target_entry": {
            "entry_key": "de|Blume", "word": "Blume",
            "url": "https://example.test/Blume",
            "panel_forms": [{"form_id": "de-55", "form": "Blume"}],
            "sense_candidates": [{"sense_id": "sense-de", "review_status": "selected_primary"}],
        },
        "source_claim_index": 2, "claim_relation": "cognate_mention",
        "target_form_match_method": "exact",
    }

    claim_values = build_candidate_entry_claim_rows([entry_claim])[0]
    link_values = build_candidate_relation_claim_link_rows([linked_claim])[0]

    assert claim_values[:7] == ("IE-CoR", "1.1", "55", "nb", "nb|blomst", 2, "blomst")
    assert json.loads(claim_values[8]) == entry_claim["source_entry"]["panel_forms"]
    assert json.loads(claim_values[13]) == entry_claim["source_claim"]
    assert link_values[3:7] == ("de", "nb", "nb", "de")
    assert link_values[7:12] == ("nb|blomst", "de|Blume", 2, "cognate_mention", "exact")
