"""IPA Normalizer and Articulatory Phonetic Similarity Engine.

Cleans suprasegmentals, normalizes affricates, and computes continuous
articulatory phonetic distance via JIT-compiled Weighted Wagner-Fischer
dynamic programming across Germanic headwords.
"""

import unicodedata
from typing import Optional
import numpy as np
import numba

try:
    from articulatory_matrix import (
        ARTICULATORY_MATRIX,
        CHAR_TO_ID,
        OOV_ID,
        IPA_ALIASES,
    )
except ImportError:
    from src.articulatory_matrix import (
        ARTICULATORY_MATRIX,
        CHAR_TO_ID,
        OOV_ID,
        IPA_ALIASES,
    )


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

# Indel cost calibrated between 0.60 and 0.80
DEFAULT_INDEL_COST = np.float32(0.70)


def normalize_ipa(raw_ipa: Optional[str]) -> str:
    """Normalizes an IPA transcription string.

    Steps:
    1. Strip IPA slash and bracket delimiters.
    2. Strip explicit suprasegmentals (stress marks, length markers, tone numbers).
    3. Decompose and strip non-essential combining diacritics (including tie-bars and pitch contours).
    4. Map affricates and digraphs (tʃ -> č, dʒ -> ǧ, ts -> c, dz -> ż) to atomic representations.
    5. Canonicalize glyph aliases (e.g. ASCII 'g' -> IPA 'ɡ').
    6. Return canonical NFC string.
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

    # Map aliases (e.g. ASCII 'g' -> 'ɡ', 'ˀ' -> 'ʔ')
    for alias, canonical in IPA_ALIASES.items():
        text = text.replace(alias, canonical)

    return text.strip()


@numba.njit(fastmath=True)
def _wagner_fischer_dp(
    seq1: np.ndarray,
    seq2: np.ndarray,
    dist_matrix: np.ndarray,
    indel: float,
) -> float:
    """JIT-compiled Weighted Wagner-Fischer dynamic programming.

    Uses a 2-row rolling buffer to minimize allocations and maximize cache locality.
    """
    n = len(seq1)
    m = len(seq2)
    if n == 0:
        return m * indel
    if m == 0:
        return n * indel

    prev = np.empty(m + 1, dtype=np.float32)
    curr = np.empty(m + 1, dtype=np.float32)

    for j in range(m + 1):
        prev[j] = j * indel

    for i in range(1, n + 1):
        curr[0] = i * indel
        c1 = seq1[i - 1]
        for j in range(1, m + 1):
            c2 = seq2[j - 1]
            sub_cost = dist_matrix[c1, c2]

            sub = prev[j - 1] + sub_cost
            ins = prev[j] + indel
            dele = curr[j - 1] + indel

            val = sub if sub < ins else ins
            curr[j] = val if val < dele else dele

        for j in range(m + 1):
            prev[j] = curr[j]

    return prev[m]


# Warm-up JIT compilation at module import
_dummy_seq = np.array([0, 1], dtype=np.int32)
_ = _wagner_fischer_dp(_dummy_seq, _dummy_seq, ARTICULATORY_MATRIX, DEFAULT_INDEL_COST)


def phonetic_similarity(
    ipa1: Optional[str],
    ipa2: Optional[str],
    indel_cost: float = 0.70,
) -> float:
    """Calculates continuous articulatory phonetic similarity between two IPA strings.

    Formula:
        cost = WagnerFischer(norm1, norm2, matrix, indel)
        max_len = max(|norm1|, |norm2|)
        S_phon = 1.0 - (cost / max_len)

    Bounded in [0.0, 1.0].
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

    id_seq1 = np.array([CHAR_TO_ID.get(c, OOV_ID) for c in norm1], dtype=np.int32)
    id_seq2 = np.array([CHAR_TO_ID.get(c, OOV_ID) for c in norm2], dtype=np.int32)

    cost = _wagner_fischer_dp(id_seq1, id_seq2, ARTICULATORY_MATRIX, np.float32(indel_cost))
    sim = 1.0 - (cost / max_len)

    return float(max(0.0, min(1.0, sim)))
