"""Lexical Taxonomy Classifier for Germanic Lexicon Engine.

Partitions candidate word pairs into deterministic quadrants based on
orthographic, phonetic, semantic similarity scores, and etymological provenance.
"""

from __future__ import annotations

import re
from typing import Optional, Tuple

_ROOT_PREFIX_CLEAN_RE = re.compile(
    r"^(?:proto-[a-z\-]+|old [a-z]+|latin|ancient greek)\s+", re.IGNORECASE
)


def are_cognate_roots(
    root_a: str, root_b: str, text_a: str = "", text_b: str = ""
) -> bool:
    """Determines whether two words share a verified historical etymon (Type A)."""
    if not root_a and not root_b:
        # Cross-reference text mentions (e.g. borrowed from same Latin/French term)
        return False

    def get_core_stem(r: str) -> str:
        r = r.lower().strip()
        r = _ROOT_PREFIX_CLEAN_RE.sub("", r)
        r = r.strip("* ")
        return r

    stem_a = get_core_stem(root_a) if root_a else ""
    stem_b = get_core_stem(root_b) if root_b else ""

    if stem_a and stem_b:
        if stem_a == stem_b:
            return True
        # Shared Germanic stem prefix (e.g., gifti vs giftiz, pōlaz vs pool)
        min_len = min(len(stem_a), len(stem_b))
        if min_len >= 4:
            prefix_len = min(4, min_len)
            if stem_a[:prefix_len] == stem_b[:prefix_len]:
                return True

    return False


def classify_pair(
    s_orth: float,
    s_phon: float,
    s_sem: float,
    max_len: Optional[int] = None,
    word_a: str = "",
    word_b: str = "",
    etym_root_a: str = "",
    etym_root_b: str = "",
    etym_text_a: str = "",
    etym_text_b: str = "",
    max_active_sem: Optional[float] = None,
) -> Tuple[str, Optional[str]]:
    """Classifies a word comparison pair into a discrete lexical category and False Friend tier.

    Taxonomy:
    - true_cognate: (S_phon >= 0.65 or S_orth >= 0.70) and S_sem >= 0.75
    - false_friend: Deceptive surface overlap and S_sem <= 0.30.
        Type A ('etymological_shift'): Verified common historical ancestor (e.g. gift/gift, semester/semester).
        Type B ('surface_collision'): Disjoint ancestral roots / accidental convergence (e.g. bra/bra, Mist/mist).
        * FALSE FRIEND DISQUALIFICATION RULE:
          If max_active_sem >= 0.75, the pair CANNOT be classified as a False Friend.
    - partial_cognate: S_phon >= 0.65 and 0.30 < S_sem < 0.75
    - translation_pair: S_sem >= 0.75 and S_phon < 0.65 and S_orth < 0.70
    - other: Any pair not matching the deterministic quadrants

    Returns:
        (category, false_friend_type)
    """
    effective_max_sem = max_active_sem if max_active_sem is not None else s_sem
    has_high_surface = (s_phon >= 0.65) or (s_orth >= 0.70)

    # 1. False Friend Disqualification Rule
    # If headwords share any active, non-obsolete sense with S_sem >= 0.75 (e.g., halva),
    # they cannot be labeled as False Friends.
    if effective_max_sem >= 0.75:
        if has_high_surface:
            return "true_cognate", None
        return "translation_pair", None

    # 2. Determine deceptive surface overlap for false friends
    if max_len is not None and max_len <= 4:
        is_deceptive_surface = (s_phon >= 0.85) or (s_orth >= 0.85)
    else:
        shares_root = bool(word_a and word_b and word_a[0].lower() == word_b[0].lower())
        is_deceptive_surface = has_high_surface and (shares_root or s_phon >= 0.75)

    # 3. False Friend Classification
    if is_deceptive_surface and s_sem <= 0.30:
        if are_cognate_roots(etym_root_a, etym_root_b, etym_text_a, etym_text_b):
            return "false_friend", "etymological_shift"
        return "false_friend", "surface_collision"

    # 4. Partial Cognate
    if s_phon >= 0.65 and 0.30 < s_sem < 0.75:
        return "partial_cognate", None

    # 5. Translation Pair fallback
    if s_sem >= 0.75 and not has_high_surface:
        return "translation_pair", None

    return "other", None
