from pipeline.src.seed_iecor_panel import build_table_rows


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
    assert meaning_pairs[0][5:7] == ("shared_cognate_set", ["10"])
