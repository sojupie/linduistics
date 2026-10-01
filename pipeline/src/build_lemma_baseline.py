from dataclasses import dataclass
from typing import List, Optional

@dataclass(frozen=True)
class LemmaEntry:
    lemma: str
    lang: str
    pos: str
    frequency_rank: int
    tier: Optional[str] = None

def filter_to_core_lemmas(entries: List[LemmaEntry], max_rank: int = 5000) -> List[LemmaEntry]:
    """Filters vocabulary entries to the top N frequency-ranked core lemmas per language."""
    return [e for e in entries if e.frequency_rank <= max_rank]

def rank_and_stratify_lemmas(entries: List[LemmaEntry]) -> List[LemmaEntry]:
    """Stratifies lemmas into core tiers: core_1k (<=1000), core_5k (<=5000), extended (>5000)."""
    stratified = []
    for e in entries:
        if e.frequency_rank <= 1000:
            tier = "core_1k"
        elif e.frequency_rank <= 5000:
            tier = "core_5k"
        else:
            tier = "extended"
        stratified.append(LemmaEntry(
            lemma=e.lemma,
            lang=e.lang,
            pos=e.pos,
            frequency_rank=e.frequency_rank,
            tier=tier
        ))
    return stratified
