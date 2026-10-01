import pytest
from pipeline.src.build_lemma_baseline import filter_to_core_lemmas, rank_and_stratify_lemmas, LemmaEntry
from pipeline.src.sense_aligner import classify_pair_senses

def test_canonical_specimens():
    # 1. hund (SV) <-> hound (EN): Cognate with semantic narrowing, shared *hundaz
    res_hund = classify_pair_senses(
        word_a="hund", lang_a="sv", senses_a=["domestic dog"], root_a="Proto-Germanic *hundaz",
        word_b="hound", lang_b="en", senses_b=["hunting dog"], root_b="Proto-Germanic *hundaz",
        ortho_sim=0.80, phono_sim=0.85, max_semantic_sim=0.72
    )
    assert res_hund.category == "semantic_narrowing"
    assert res_hund.etymological_relation == "cognate"

    # 2. Gift (DE: poison) <-> gift (EN: present): False Friend with shared *geb- root
    res_gift = classify_pair_senses(
        word_a="Gift", lang_a="de", senses_a=["poison, toxic substance"], root_a="Proto-Germanic *geb-",
        word_b="gift", lang_b="en", senses_b=["present, donation"], root_b="Proto-Germanic *geb-",
        ortho_sim=1.0, phono_sim=0.90, max_semantic_sim=0.15
    )
    assert res_gift.category == "cognate_false_friend"
    assert res_gift.etymological_relation == "cognate"

    # 3. bra (SV: good) <-> bra (EN: undergarment): Accidental lookalike / False Cognate
    res_bra = classify_pair_senses(
        word_a="bra", lang_a="sv", senses_a=["good, fine, well"], root_a="Italian *brav-",
        word_b="bra", lang_b="en", senses_b=["brassiere, undergarment"], root_b="French brassière",
        ortho_sim=1.0, phono_sim=0.95, max_semantic_sim=0.05
    )
    assert res_bra.category == "accidental_lookalike"
    assert res_bra.etymological_relation == "false_cognate"

    # 4. barn (SV: child) <-> child (EN: child): Unrelated equivalent occupying same concept slot
    res_barn = classify_pair_senses(
        word_a="barn", lang_a="sv", senses_a=["child, offspring"], root_a="Proto-Germanic *barną",
        word_b="child", lang_b="en", senses_b=["child, offspring"], root_b="Proto-Germanic *kilþaz",
        ortho_sim=0.0, phono_sim=0.10, max_semantic_sim=0.95
    )
    assert res_barn.category == "unrelated_equivalent"
    assert res_barn.etymological_relation == "unrelated"

def test_full_pipeline_baseline_flow():
    # Verify lemma filtering and tier stratification cleanly accounts for vocabulary
    entries = [
        LemmaEntry(lemma="sol", lang="sv", pos="noun", frequency_rank=300),
        LemmaEntry(lemma="hund", lang="sv", pos="noun", frequency_rank=500),
        LemmaEntry(lemma="huvud", lang="sv", pos="noun", frequency_rank=1200),
        LemmaEntry(lemma="sällsynt", lang="sv", pos="adj", frequency_rank=8500),
    ]
    core = filter_to_core_lemmas(entries, max_rank=5000)
    assert len(core) == 3
    stratified = rank_and_stratify_lemmas(core)
    assert stratified[0].tier == "core_1k"
    assert stratified[2].tier == "core_5k"
