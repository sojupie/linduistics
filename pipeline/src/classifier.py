"""Conservative classification of surface, meaning, and etymological relations."""

from __future__ import annotations

import re
import unicodedata
from typing import Optional, Tuple

_ROOT_RE = re.compile(r"^(?P<language>.+?)\s+\*?(?P<root>[^\s]+)$")


def etymological_relation(root_a: str, root_b: str) -> str:
    """Return cognate or unknown from root fields; unequal roots do not prove unrelatedness."""
    if not root_a or not root_b:
        return "unknown"

    def parts(root: str) -> tuple[str, str] | None:
        match = _ROOT_RE.match(root.strip())
        if not match:
            return None
        language = " ".join(match.group("language").lower().split())
        lemma = unicodedata.normalize("NFC", match.group("root").strip("* ").lower())
        return language, lemma

    a, b = parts(root_a), parts(root_b)
    if not a or not b:
        return "unknown"
    if a == b:
        return "cognate"
    return "unknown"


def classify_pair(
    s_orth: float,
    s_phon: float,
    s_sem: float,
    etym_root_a: str = "",
    etym_root_b: str = "",
    max_active_sem: Optional[float] = None,
    pos_a: str = "",
    pos_b: str = "",
    direct_translation_evidence: bool = False,
    word_a: str = "",
    word_b: str = "",
) -> Tuple[str, str]:
    """Return a display category and the pair's etymological relation.

    Combines surface similarity, semantics, and structured root evidence.
    """
    semantics = max_active_sem if max_active_sem is not None else s_sem
    if direct_translation_evidence:
        semantics = max(semantics, 0.90)

    origin = etymological_relation(etym_root_a, etym_root_b)

    # A name-to-common-word spelling collision is not a false-friend relation.
    if (pos_a == "name") != (pos_b == "name"):
        return "other", origin

    min_len = min(len(word_a), len(word_b)) if (word_a and word_b) else 4
    surface_match = (s_orth >= 0.70 or s_phon >= 0.65) if min_len >= 4 else (s_orth >= 0.80 or s_phon >= 0.75)
    is_deceptive = (s_orth >= 0.82 or s_phon >= 0.80) if min_len >= 4 else (s_orth >= 0.90 or s_phon >= 0.85)

    if origin == "cognate":
        if semantics >= 0.75:
            return "true_cognate", origin
        if is_deceptive and semantics <= 0.30 and not direct_translation_evidence:
            return "false_friend", origin
        return "partial_cognate", origin

    distinct_roots = bool(etym_root_a and etym_root_b and etym_root_a.strip() != etym_root_b.strip())

    # If roots are confirmed distinct, surface similarity does not infer cognacy
    if distinct_roots:
        if is_deceptive and semantics <= 0.25 and not direct_translation_evidence:
            return "false_friend", origin
        if semantics >= 0.65 and not surface_match:
            return "translation_pair", origin
        return "other", origin

    # Unknown / unconfirmed root layer (no conflicting root records)
    if surface_match and semantics >= 0.70:
        return "true_cognate", origin
    if surface_match and semantics >= 0.40:
        return "partial_cognate", origin
    if is_deceptive and semantics <= 0.25 and not direct_translation_evidence:
        return "false_friend", origin
    if semantics >= 0.65:
        return "translation_pair", origin
    return "other", origin
