"""Linguistic Metrics for Linduistics Engine.

Provides orthographic string distance calculations.
"""

from rapidfuzz.distance import Levenshtein


def normalize_orthography(text: str) -> str:
    """Normalizes orthographic differences across Germanic languages.

    Maps Danish/Norwegian æ -> ä, ø -> ö, archaic aa -> å, and German ß -> ss.
    """
    s = text.strip().lower()
    return s.replace("æ", "ä").replace("ø", "ö").replace("aa", "å").replace("ß", "ss")


def orthographic_similarity(w1: str, w2: str) -> float:
    """Calculates normalized orthographic similarity between two words.

    Formula: S_orth(w1, w2) = 1.0 - ( Levenshtein(norm1, norm2) / max(|norm1|, |norm2|) )
    Result is bounded in [0.0, 1.0].
    """
    if not isinstance(w1, str) or not isinstance(w2, str):
        raise TypeError("Inputs must be strings")

    s1 = normalize_orthography(w1)
    s2 = normalize_orthography(w2)

    if s1 == s2:
        return 1.0

    max_len = max(len(s1), len(s2))
    if max_len == 0:
        return 1.0

    dist = Levenshtein.distance(s1, s2)
    return float(max(0.0, min(1.0, 1.0 - (dist / max_len))))
