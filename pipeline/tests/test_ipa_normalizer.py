import pytest
from ipa_normalizer import normalize_ipa, phonetic_similarity


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


def test_phonetic_similarity_cognates():
    # banana / banan:
    # en: /bəˈnɑːnə/ -> bənɑnə (len 6)
    # sv: /baˈnɑːn/ -> banɑn (len 5)
    # distance between bənɑnə and banɑn: 2 edits (ə->a, deletion of final ə). max len 6 -> 4/6 = 0.6667
    sim = phonetic_similarity("/bəˈnɑːnə/", "/baˈnɑːn/")
    assert pytest.approx(sim, rel=1e-2) == 4 / 6


def test_phonetic_similarity_empty():
    assert phonetic_similarity("", "") == 1.0
    assert phonetic_similarity("/hʊnd/", "") == 0.0
    assert phonetic_similarity("", "/hʊnd/") == 0.0
    assert phonetic_similarity(None, "/hʊnd/") == 0.0
