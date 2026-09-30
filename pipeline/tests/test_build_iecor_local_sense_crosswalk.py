from pipeline.src.build_iecor_local_sense_crosswalk import _load_reviewed_senses, build_pair_rows, wiktionary_url


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
        "local_sense_candidate_id\tsense_review_status\n"
        "sense-1\tselected_primary\n",
        encoding="utf-8",
    )
    assert _load_reviewed_senses(review_file) == {"sense-1": "selected_primary"}


def test_wiktionary_url_encodes_form_and_language_anchor():
    assert wiktionary_url("hånd", "Norwegian Bokmål") == (
        "https://en.wiktionary.org/wiki/h%C3%A5nd#Norwegian_Bokm%C3%A5l"
    )
