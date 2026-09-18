"""Linguistic Metrics for Linduistics Engine.

Provides orthographic string distance calculations.
"""

from rapidfuzz.distance import Levenshtein


def orthographic_similarity(w1: str, w2: str) -> float:
    """Calculates normalized orthographic similarity between two words.

    Formula: S_orth(w1, w2) = 1.0 - ( Levenshtein(w1, w2) / max(|w1|, |w2|) )
    Result is bounded in [0.0, 1.0].
    """
    if not isinstance(w1, str) or not isinstance(w2, str):
        raise TypeError("Inputs must be strings")

    s1 = w1.strip().lower()
    s2 = w2.strip().lower()

    if s1 == s2:
        return 1.0

    max_len = max(len(s1), len(s2))
    if max_len == 0:
        return 1.0

    dist = Levenshtein.distance(s1, s2)
    return float(max(0.0, min(1.0, 1.0 - (dist / max_len))))
