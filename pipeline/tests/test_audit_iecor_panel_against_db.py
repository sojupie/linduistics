from pipeline.src.audit_iecor_panel_against_db import root_alignment_status, sense_alignment_status


def test_sense_alignment_status_separates_missing_and_inactive_pairs():
    assert sense_alignment_status(0, False, False) == "no_word_pair_row"
    assert sense_alignment_status(1, False, False) == "sense_not_in_comparison"
    assert sense_alignment_status(1, True, False) == "sense_pair_not_active"
    assert sense_alignment_status(1, True, True) == "sense_pair_active"


def test_root_alignment_status_is_exact_label_match_and_keeps_missing_roots_visible():
    assert root_alignment_status("Proto-Germanic *blōþą", " proto-germanic   *blōþą ") == "same_root_label"
    assert root_alignment_status("Proto-Germanic *kwenǭ", "Old Norse kvinna") == "different_root_labels"
    assert root_alignment_status(None, "Proto-Germanic *nahts") == "missing_source_root"
    assert root_alignment_status("Proto-Germanic *nahts", None) == "missing_target_root"
