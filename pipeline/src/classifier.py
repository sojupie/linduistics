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
) -> Tuple[str, str]:
    """Return a display category and the pair's etymological relation.

    Similarity scores identify candidates. They cannot establish shared ancestry.
    """
    semantics = max_active_sem if max_active_sem is not None else s_sem
    surface_match = s_phon >= 0.65 or s_orth >= 0.70
    origin = etymological_relation(etym_root_a, etym_root_b)

    if surface_match and semantics <= 0.30:
        return "false_friend", origin
    if origin == "cognate":
        return ("true_cognate" if semantics >= 0.75 else "partial_cognate"), origin
    if semantics >= 0.75 and not surface_match:
        return "translation_pair", origin
    return "other", origin
