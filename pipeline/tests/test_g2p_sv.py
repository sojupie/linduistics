import pytest
from g2p_sv import swedish_to_ipa


def test_g2p_palatalization_before_front_vowels():
    # k before front vowels (e, i, y, ä, ö) -> ɕ
    assert swedish_to_ipa("kyrka").startswith("ɕ")
    assert swedish_to_ipa("katt").startswith("k")

    # g before front vowels -> j
    assert swedish_to_ipa("gift").startswith("j")
    assert swedish_to_ipa("gata").startswith("ɡ")


def test_g2p_consonant_digraphs():
    # tj, kj -> ɕ
    assert swedish_to_ipa("tjugo").startswith("ɕ")
    assert swedish_to_ipa("kjol").startswith("ɕ")

    # sj, skj, stj -> ɧ
    assert swedish_to_ipa("sjö").startswith("ɧ")
    assert swedish_to_ipa("skjorta").startswith("ɧ")
    assert swedish_to_ipa("stjärna").startswith("ɧ")

    # dj, gj, hj, lj -> j
    assert swedish_to_ipa("djur").startswith("j")
    assert swedish_to_ipa("hjärta").startswith("j")
    assert swedish_to_ipa("ljus").startswith("j")


def test_g2p_retroflexes():
    # rt -> ʈ, rd -> ɖ, rn -> ɳ, rs -> ʂ
    assert "ʈ" in swedish_to_ipa("kort")
    assert "ɖ" in swedish_to_ipa("bord")
    assert "ɳ" in swedish_to_ipa("barn")
    assert "ʂ" in swedish_to_ipa("fors")


def test_g2p_general_vocabulary():
    # Basic words
    assert swedish_to_ipa("hund") != ""
    assert swedish_to_ipa("robot") != ""
    assert swedish_to_ipa("synonym") != ""
