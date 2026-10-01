import pytest
from pipeline.src.build_lemma_baseline import filter_to_core_lemmas, LemmaEntry, rank_and_stratify_lemmas

def test_filter_to_core_lemmas_bounds_vocabulary():
    raw_entries = [
        LemmaEntry(lemma="hund", lang="sv", pos="noun", frequency_rank=120),
        LemmaEntry(lemma="hittepåord", lang="sv", pos="noun", frequency_rank=45000),
        LemmaEntry(lemma="dog", lang="en", pos="noun", frequency_rank=85),
        LemmaEntry(lemma="defenestration", lang="en", pos="noun", frequency_rank=32000),
    ]
    core = filter_to_core_lemmas(raw_entries, max_rank=5000)
    assert len(core) == 2
    assert {e.lemma for e in core} == {"hund", "dog"}

def test_rank_and_stratify_lemmas_assigns_correct_tiers():
    raw_entries = [
        LemmaEntry(lemma="vara", lang="sv", pos="verb", frequency_rank=1),
        LemmaEntry(lemma="hund", lang="sv", pos="noun", frequency_rank=500),
        LemmaEntry(lemma="bok", lang="sv", pos="noun", frequency_rank=2500),
        LemmaEntry(lemma="peripeti", lang="sv", pos="noun", frequency_rank=12000),
    ]
    stratified = rank_and_stratify_lemmas(raw_entries)
    tiers = {e.lemma: e.tier for e in stratified}
    assert tiers["vara"] == "core_1k"
    assert tiers["hund"] == "core_1k"
    assert tiers["bok"] == "core_5k"
    assert tiers["peripeti"] == "extended"
