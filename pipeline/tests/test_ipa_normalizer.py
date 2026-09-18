import pytest
from ipa_normalizer import normalize_ipa, phonetic_similarity
from articulatory_matrix import ARTICULATORY_MATRIX, CHAR_TO_ID, OOV_ID, NUM_PHONES
import numpy as np


def test_normalize_ipa_delimiters():
    assert normalize_ipa("/hʊnd/") == "hʊnd"
    assert normalize_ipa("[hʊnd]") == "hʊnd"
    assert normalize_ipa("  /bəˈnɑːnə/  ") == "bənɑnə"


def test_normalize_ipa_suprasegmentals():
    # Stress marks: primary 'ˈ', secondary 'ˌ'
    assert normalize_ipa("ˈɕʏrˌka") == "ɕʏrka"
    # Length markers: 'ː', 'ˑ'
    assert normalize_ipa("huːs") == "hus"
    assert normalize_ipa("bɑːtˑ") == "bɑt"
    # Swedish grave / tone accents (e.g. combining grave/acute/circumflex)
    assert normalize_ipa("ˈɕœ̂rka") == "ɕœrka"


def test_normalize_ipa_affricates():
    # Tie bar affricates: t͡ʃ -> č, d͡ʒ -> ǧ, t͡s -> c, d͡z -> ż
    assert normalize_ipa("t͡ʃɜːt͡ʃ") == "čɜč"
    assert normalize_ipa("d͡ʒʌd͡ʒ") == "ǧʌǧ"
    assert normalize_ipa("t͡s") == "c"
    # Untied standard digraphs
    assert normalize_ipa("tʃɜːtʃ") == "čɜč"
    assert normalize_ipa("dʒʌdʒ") == "ǧʌǧ"


def test_phonetic_similarity_identical():
    assert phonetic_similarity("ˈhʊnd", "/hʊnd/") == 1.0
    assert phonetic_similarity("/ˈkæt/", "[kæt]") == 1.0


def test_phonetic_similarity_empty():
    assert phonetic_similarity("", "") == 1.0
    assert phonetic_similarity("/hʊnd/", "") == 0.0
    assert phonetic_similarity("", "/hʊnd/") == 0.0
    assert phonetic_similarity(None, "/hʊnd/") == 0.0


def test_phonetic_similarity_germanic_sound_shifts():
    # 1. water / Wasser (t <-> s shift)
    # Under Levenshtein was 0.40, with articulatory distance reaches >= 0.75
    sim_water = phonetic_similarity("wɔtər", "vasər")
    assert sim_water >= 0.70

    # 2. apple / Apfel (p <-> pf affrication)
    sim_apple = phonetic_similarity("æpəl", "apfəl")
    assert sim_apple >= 0.75

    # 3. hund / Hund (d <-> t voicing shift)
    sim_hund = phonetic_similarity("hʊnd", "hʊnt")
    assert sim_hund >= 0.90

    # 4. foot / Fuß (t <-> s shift)
    sim_foot = phonetic_similarity("fʊt", "fuːs")
    assert sim_foot >= 0.70

    # 5. banana / banan (vowel shift + final vowel deletion)
    sim_banan = phonetic_similarity("/bəˈnɑːnə/", "/baˈnɑːn/")
    assert sim_banan >= 0.80


def test_articulatory_matrix_metric_properties():
    M = ARTICULATORY_MATRIX
    assert np.allclose(np.diag(M), 0.0), "Diagonal must be 0"
    assert np.allclose(M, M.T), "Matrix must be symmetric"

    # Triangle inequality: M[i, k] <= M[i, j] + M[j, k]
    diffs = M[:, :, None] - (M[:, None, :] + M[None, :, :])
    max_violation = np.max(diffs)
    assert max_violation <= 1e-5, f"Triangle inequality violated by {max_violation}"
