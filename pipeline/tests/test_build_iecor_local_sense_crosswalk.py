from pipeline.src.build_iecor_local_sense_crosswalk import (
    _load_reviewed_senses,
    build_rows,
    build_pair_rows,
    sense_review_key,
    wiktionary_url,
)


LANGUAGE_IDS = {"da": "20", "en": "22", "de": "27", "nb": "58", "sv": "69"}


def test_pair_rows_classify_shared_distinct_and_unassigned_sets():
    forms = []
    concepts = {}
    assignments = {}
    for concept_id, name in (("blood", "blood"), ("fire", "fire"), ("hand", "hand")):
        concepts[concept_id] = {"Name": name, "Concepticon_ID": ""}
        for code, language_id in LANGUAGE_IDS.items():
            form_id = f"{language_id}-{concept_id}"
            forms.append({
                "ID": form_id,
                "Language_ID": language_id,
                "Parameter_ID": concept_id,
                "Value": name,
            })
            if concept_id == "blood":
                assignments[form_id] = {"shared"}
            elif concept_id == "fire":
                assignments[form_id] = {code}
            elif code != "en":
                assignments[form_id] = {"hand-set"}

    rows = build_pair_rows(forms, concepts, assignments)
    assert len(rows) == 30
    by_concept_pair = {
        (row["concept"], row["source_language"], row["target_language"]): row["reference_relation"]
        for row in rows
    }
    assert by_concept_pair[("blood", "da", "en")] == "shared_cognate_set"
    assert by_concept_pair[("fire", "da", "en")] == "no_shared_cognate_set"
    assert by_concept_pair[("hand", "da", "en")] == "incomplete_assignment"


def test_review_overlay_reads_tab_separated_statuses(tmp_path):
    review_file = tmp_path / "review.tsv"
    review_file.write_text(
        "language\tlocal_word\tlocal_pos\tlocal_sense_candidate_id\tlocal_gloss\tsense_review_status\n"
        "en\twater\tnoun\tsense-1\twater\tselected_primary\n"
        "en\twater\tnoun\tsense-1\tserving of water\tselected_additional\n",
        encoding="utf-8",
    )
    assert _load_reviewed_senses(review_file) == {
        sense_review_key("en", "water", "noun", "sense-1", "water"): "selected_primary",
        sense_review_key("en", "water", "noun", "sense-1", "serving of water"): "selected_additional",
    }


def test_wiktionary_url_encodes_form_and_language_anchor():
    assert wiktionary_url("hånd", "Norwegian Bokmål") == (
        "https://en.wiktionary.org/wiki/h%C3%A5nd#Norwegian_Bokm%C3%A5l"
    )


def test_sense_pos_overrides_aggregated_entry_pos_and_exact_review_key_matches():
    reference = [{
        "ID": "20-1-1", "Language_ID": "20", "Parameter_ID": "1",
        "Value": "form", "Form": "form", "Segments": "f o r m",
    }]
    concepts = {"1": {"Name": "form", "Concepticon_ID": "1", "Concepticon_Definition": "form"}}
    local_entries = {("da", "form"): [{
        "word": "form", "pos": "name", "senses": [{
            "source_sense_id": "noun-sense", "gloss": "a form", "pos": "noun",
        }],
    }]}
    key = sense_review_key("da", "form", "noun", "noun-sense", "a form")

    row = build_rows(reference, concepts, {}, local_entries, {key: "selected_primary"})[0]

    assert row["local_pos"] == "noun"
    assert row["sense_review_status"] == "selected_primary"
