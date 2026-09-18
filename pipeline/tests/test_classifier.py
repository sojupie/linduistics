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
    assert classify_pair(s_orth=1.00, s_phon=0.60, s_sem=0.15, word_a="gift", word_b="gift") == "false_friend"
    assert classify_pair(s_orth=0.50, s_phon=0.75, s_sem=0.20, max_len=6) == "false_friend"


def test_classify_false_friend_length_calibration():
    # Long words sharing initial letter: standard threshold orth >= 0.70 qualifies
    assert classify_pair(s_orth=0.70, s_phon=0.30, s_sem=0.15, max_len=8, word_a="absolute", word_b="absolve") == "false_friend"

    # Suffix-only match without shared root or high phonetics (e.g. federation vs duration) -> other
    assert classify_pair(s_orth=0.70, s_phon=0.20, s_sem=0.15, max_len=10, word_a="federation", word_b="duration") == "other"

    # Short words (len <= 4): rhyming pairs with 0.75 orth (like hart/dart) are filtered to "other"
    assert classify_pair(s_orth=0.75, s_phon=0.30, s_sem=0.20, max_len=4, word_a="hart", word_b="dart") == "other"

    # Short words (len <= 4): near-identical deceptive words (>= 0.85) qualify as false friends
    assert classify_pair(s_orth=1.00, s_phon=0.60, s_sem=0.15, max_len=4, word_a="gift", word_b="gift") == "false_friend"
    assert classify_pair(s_orth=0.50, s_phon=0.88, s_sem=0.15, max_len=4, word_a="abb", word_b="ebb") == "false_friend"


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
