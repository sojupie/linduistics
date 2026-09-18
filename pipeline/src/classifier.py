"""Lexical Taxonomy Classifier for Germanic Lexicon Engine.

Partitions candidate word pairs into deterministic quadrants based on
orthographic, phonetic, and semantic similarity scores.
"""


def classify_pair(s_orth: float, s_phon: float, s_sem: float) -> str:
    """Classifies a word comparison pair into a discrete lexical category.

    Taxonomy:
    - true_cognate: (S_phon >= 0.65 or S_orth >= 0.70) and S_sem >= 0.75
    - false_friend: (S_phon >= 0.65 or S_orth >= 0.70) and S_sem <= 0.30
    - partial_cognate: S_phon >= 0.65 and 0.30 < S_sem < 0.75
    - translation_pair: S_sem >= 0.75 and S_phon < 0.65 and S_orth < 0.70
    - other: Any pair not matching the deterministic quadrants
    """
    has_high_surface = (s_phon >= 0.65) or (s_orth >= 0.70)

    if has_high_surface and s_sem >= 0.75:
        return "true_cognate"

    if has_high_surface and s_sem <= 0.30:
        return "false_friend"

    if s_phon >= 0.65 and 0.30 < s_sem < 0.75:
        return "partial_cognate"

    if s_sem >= 0.75 and not has_high_surface:
        return "translation_pair"

    return "other"
