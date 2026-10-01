import pytest
from pipeline.src.sense_aligner import align_senses, classify_pair_senses

def test_classify_micro_categories():
    # 1. Full invariant cognate
    res_winter = classify_pair_senses(
        word_a="vinter", lang_a="sv", senses_a=["the coldest season of the year"], root_a="Proto-Germanic *wintruz",
        word_b="winter", lang_b="en", senses_b=["the coldest season of the year"], root_b="Proto-Germanic *wintruz",
        ortho_sim=0.83, phono_sim=0.90, max_semantic_sim=0.98
    )
    assert res_winter.category == "full_cognate"
    assert res_winter.etymological_relation == "cognate"

    # 2. Semantic narrowing (hound vs hund)
    res_hound = classify_pair_senses(
        word_a="hund", lang_a="sv", senses_a=["domestic canine, dog"], root_a="Proto-Germanic *hundaz",
        word_b="hound", lang_b="en", senses_b=["hunting dog, hound"], root_b="Proto-Germanic *hundaz",
        ortho_sim=0.80, phono_sim=0.85, max_semantic_sim=0.72
    )
    assert res_hound.category == "semantic_narrowing"
    assert res_hound.etymological_relation == "cognate"

    # 3. Cognate false friend (Gift vs gift)
    res_gift = classify_pair_senses(
        word_a="Gift", lang_a="de", senses_a=["poison, venom"], root_a="Proto-Germanic *geb-",
        word_b="gift", lang_b="en", senses_b=["present, offering"], root_b="Proto-Germanic *geb-",
        ortho_sim=1.0, phono_sim=0.90, max_semantic_sim=0.15
    )
    assert res_gift.category == "cognate_false_friend"
    assert res_gift.etymological_relation == "cognate"

    # 4. Accidental lookalike / false cognate (bra vs bra)
    res_bra = classify_pair_senses(
        word_a="bra", lang_a="sv", senses_a=["good, well"], root_a="Italian *brav-",
        word_b="bra", lang_b="en", senses_b=["undergarment, brassiere"], root_b="French brassière",
        ortho_sim=1.0, phono_sim=0.95, max_semantic_sim=0.05
    )
    assert res_bra.category == "accidental_lookalike"
    assert res_bra.etymological_relation == "false_cognate"

    # 5. Unrelated translation equivalent (barn vs child)
    res_barn = classify_pair_senses(
        word_a="barn", lang_a="sv", senses_a=["young human, offspring"], root_a="Proto-Germanic *barną",
        word_b="child", lang_b="en", senses_b=["young human, offspring"], root_b="Proto-Germanic *kilþaz",
        ortho_sim=0.0, phono_sim=0.10, max_semantic_sim=0.95
    )
    assert res_barn.category == "unrelated_equivalent"
    assert res_barn.etymological_relation == "unrelated"

    # 6. Shared historical loan stratum (Hanseatic loan: språk vs Sprache)
    res_sprak = classify_pair_senses(
        word_a="språk", lang_a="sv", senses_a=["human language"], root_a="Middle Low German sprāke",
        word_b="Sprache", lang_b="de", senses_b=["human language"], root_b="Middle High German sprāche",
        ortho_sim=0.71, phono_sim=0.75, max_semantic_sim=0.95,
        is_borrowed_layer=True
    )
    assert res_sprak.category == "sister_loanword"
    assert res_sprak.etymological_relation == "borrowed_stratum"

    # 7. Untracked roots with high surface and semantic similarity (abasi vs Abasie)
    res_abasi = classify_pair_senses(
        word_a="abasi", lang_a="da", senses_a=["inability to walk"], root_a=None,
        word_b="Abasie", lang_b="de", senses_b=["inability to walk"], root_b=None,
        ortho_sim=0.83, phono_sim=0.93, max_semantic_sim=0.97
    )
    assert res_abasi.category == "full_cognate"
    assert res_abasi.etymological_relation == "unknown"

    # 8. Short word length scaling (av vs of)
    res_av = classify_pair_senses(
        word_a="av", lang_a="sv", senses_a=["of, off"], root_a="Proto-Germanic *aba",
        word_b="at", lang_b="en", senses_b=["in, on"], root_b="Proto-Germanic *at",
        ortho_sim=0.50, phono_sim=0.50, max_semantic_sim=0.20
    )
    assert res_av.category == "independent_root"

