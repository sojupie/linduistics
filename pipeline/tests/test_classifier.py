import pytest
from classifier import classify_pair


def test_classify_true_cognate():
    # High surface (orth >= 0.70 or phon >= 0.65) AND high semantic (sem >= 0.75)
    assert classify_pair(s_orth=0.85, s_phon=0.70, s_sem=0.90) == "true_cognate"
    # High phon, low orth, high sem
    assert classify_pair(s_orth=0.40, s_phon=0.80, s_sem=0.85) == "true_cognate"
    # High orth, low phon, high sem
    assert classify_pair(s_orth=0.75, s_phon=0.30, s_sem=0.80) == "true_cognate"


def test_classify_false_friend():
    # High surface (orth >= 0.70 or phon >= 0.65) AND low semantic (sem <= 0.30)
    assert classify_pair(s_orth=1.00, s_phon=0.60, s_sem=0.15) == "false_friend"
    assert classify_pair(s_orth=0.50, s_phon=0.75, s_sem=0.20) == "false_friend"


def test_classify_partial_cognate():
    # Phon >= 0.65 AND 0.30 < sem < 0.75
    assert classify_pair(s_orth=0.50, s_phon=0.70, s_sem=0.55) == "partial_cognate"


def test_classify_translation_pair():
    # High semantic (sem >= 0.75) AND low surface (phon < 0.65 and orth < 0.70)
    assert classify_pair(s_orth=0.00, s_phon=0.00, s_sem=0.95) == "translation_pair"
    assert classify_pair(s_orth=0.30, s_phon=0.40, s_sem=0.80) == "translation_pair"


def test_classify_other():
    # Neither high semantic nor high surface
    assert classify_pair(s_orth=0.20, s_phon=0.20, s_sem=0.40) == "other"
