"""Lexical Taxonomy Classifier for Germanic Lexicon Engine.

Partitions candidate word pairs into deterministic quadrants based on
orthographic, phonetic, and semantic similarity scores.
"""
from typing import Optional



def classify_pair(
    s_orth: float,
    s_phon: float,
    s_sem: float,
    max_len: Optional[int] = None,
    word_a: str = "",
    word_b: str = "",
) -> str:
    """Classifies a word comparison pair into a discrete lexical category.

    Taxonomy:
    - true_cognate: (S_phon >= 0.65 or S_orth >= 0.70) and S_sem >= 0.75
    - false_friend: Deceptive surface overlap and S_sem <= 0.30.
        Requires:
        1. For short words (max_len <= 4), near-identical form (>= 0.85) to exclude rhymes.
        2. Words must share initial character (same root/prefix) OR have high phonetic overlap (>= 0.75)
           to exclude unrelated words that merely share Latinate derivational suffixes (e.g. -ation).
    - partial_cognate: S_phon >= 0.65 and 0.30 < S_sem < 0.75
    - translation_pair: S_sem >= 0.75 and S_phon < 0.65 and S_orth < 0.70
    - other: Any pair not matching the deterministic quadrants
    """
    has_high_surface = (s_phon >= 0.65) or (s_orth >= 0.70)

    # Determine deceptive surface overlap for false friends
    if max_len is not None and max_len <= 4:
        is_deceptive_surface = (s_phon >= 0.85) or (s_orth >= 0.85)
    else:
        # Require shared root/initial character OR strong phonetic overlap to drop suffix-only noise
        shares_root = bool(word_a and word_b and word_a[0].lower() == word_b[0].lower())
        is_deceptive_surface = has_high_surface and (shares_root or s_phon >= 0.75)

    if has_high_surface and s_sem >= 0.75:
        return "true_cognate"

    if is_deceptive_surface and s_sem <= 0.30:
        return "false_friend"

    if s_phon >= 0.65 and 0.30 < s_sem < 0.75:
        return "partial_cognate"

    if s_sem >= 0.75 and not has_high_surface:
        return "translation_pair"

    return "other"
