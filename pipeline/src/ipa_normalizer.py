"""IPA Normalizer and Phonetic Similarity Engine.

Cleans suprasegmentals, normalizes affricates, and computes normalized
phonetic edit distance across Germanic headwords.
"""

import unicodedata
from typing import Optional
from rapidfuzz.distance import Levenshtein

# Delimiters to strip
_DELIMITER_CHARS = str.maketrans("", "", "/[]() \t\n\r")

# Explicit suprasegmental characters to remove
_SUPRASEGMENTALS = str.maketrans(
    "",
    "",
    "ˈˌːˑ:.'`˥˦˧˨˩ꜜꜛ¹²³⁴⁵"
)

# Affricate digraph replacements (applied after tie-bar and diacritic stripping)
_AFFRICATE_REPLACEMENTS = [
    ("tʃ", "č"),
    ("dʒ", "ǧ"),
    ("ts", "c"),
    ("dz", "ż"),
]


def normalize_ipa(raw_ipa: Optional[str]) -> str:
    """Normalizes an IPA transcription string.

    Steps:
    1. Strip IPA slash and bracket delimiters.
    2. Strip explicit suprasegmentals (stress marks, length markers, tone numbers).
    3. Decompose and strip non-essential combining diacritics (including tie-bars and pitch contours).
    4. Map affricates and digraphs (tʃ -> č, dʒ -> ǧ, ts -> c, dz -> ż) to atomic representations.
    5. Return canonical NFC string.
    """
    if not raw_ipa or not isinstance(raw_ipa, str):
        return ""

    # Remove outer delimiters and whitespace
    text = raw_ipa.translate(_DELIMITER_CHARS)

    # Strip explicit suprasegmental glyphs
    text = text.translate(_SUPRASEGMENTALS)

    # Decompose to NFD to separate combining diacritical marks (tie-bars \u0361, pitch accents, etc.)
    decomposed = unicodedata.normalize("NFD", text)
    cleaned = "".join(
        ch for ch in decomposed
        if not (0x0300 <= ord(ch) <= 0x036F)
    )

    # Recompose to NFC before applying affricate replacements
    text = unicodedata.normalize("NFC", cleaned)

    # Map affricates to atomic characters
    for digraph, replacement in _AFFRICATE_REPLACEMENTS:
        text = text.replace(digraph, replacement)

    return text.strip()


def phonetic_similarity(ipa1: Optional[str], ipa2: Optional[str]) -> float:
    """Calculates normalized phonetic edit distance between two IPA strings.

    Formula: S_phon(ipa1, ipa2) = 1.0 - ( Levenshtein(norm1, norm2) / max(|norm1|, |norm2|) )
    Result is bounded in [0.0, 1.0].
    """
    norm1 = normalize_ipa(ipa1)
    norm2 = normalize_ipa(ipa2)

    if norm1 == norm2:
        return 1.0

    if not norm1 or not norm2:
        return 0.0

    max_len = max(len(norm1), len(norm2))
    if max_len == 0:
        return 1.0

    dist = Levenshtein.distance(norm1, norm2)
    return float(max(0.0, min(1.0, 1.0 - (dist / max_len))))
