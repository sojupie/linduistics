from pipeline.src.audit_iecor_panel_against_db import sense_alignment_status


def test_sense_alignment_status_separates_missing_and_inactive_pairs():
    assert sense_alignment_status(0, False, False) == "no_word_pair_row"
    assert sense_alignment_status(1, False, False) == "sense_not_in_comparison"
    assert sense_alignment_status(1, True, False) == "sense_pair_not_active"
    assert sense_alignment_status(1, True, True) == "sense_pair_active"
