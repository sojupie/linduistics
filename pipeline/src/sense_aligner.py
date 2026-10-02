"""Sense-level alignment and linguistic micro-category classification."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import List, Optional, Tuple

_ROOT_RE = re.compile(r"^(?P<language>.+?)\s+\*?(?P<root>[^\s]+)$")


def parse_root(root: Optional[str]) -> Optional[Tuple[str, str]]:
    """Parse etymological root string into normalized (language, lemma)."""
    if not root:
        return None
    match = _ROOT_RE.match(root.strip())
    if not match:
        return None
    language = " ".join(match.group("language").lower().split())
    lemma = unicodedata.normalize("NFC", match.group("root").strip("* ").lower())
    return language, lemma


def roots_are_cognate(root_a: Optional[str], root_b: Optional[str]) -> bool:
    """Return True if both roots exist and normalize to the same ancestral language and lemma."""
    a = parse_root(root_a)
    b = parse_root(root_b)
    return bool(a and b and a == b)


def roots_are_distinct(root_a: Optional[str], root_b: Optional[str]) -> bool:
    """Return True if both roots exist but normalize to different lemmas or languages."""
    a = parse_root(root_a)
    b = parse_root(root_b)
    return bool(a and b and a != b)


@dataclass
class AlignedClassification:
    category: str
    etymological_relation: str
    active_sense_a: str
    active_sense_b: str
    semantic_sim: float


def classify_pair_senses(
    word_a: str,
    lang_a: str,
    senses_a: List[str],
    root_a: Optional[str],
    word_b: str,
    lang_b: str,
    senses_b: List[str],
    root_b: Optional[str],
    ortho_sim: float,
    phono_sim: float,
    max_semantic_sim: float,
    is_archaic: bool = False,
    is_borrowed_layer: bool = False,
    pos_a: str = "",
    pos_b: str = "",
    direct_translation_evidence: bool = False,
) -> AlignedClassification:
    """Classifies a word pair into granular micro-categories based on etymology and sense similarity."""
    active_a = senses_a[0] if senses_a else ""
    active_b = senses_b[0] if senses_b else ""

    # Name-to-common word collisions are not false friends or cognates
    if pos_a and pos_b and (pos_a == "name") != (pos_b == "name"):
        return AlignedClassification(
            category="independent_root",
            etymological_relation="unknown",
            active_sense_a=active_a,
            active_sense_b=active_b,
            semantic_sim=max_semantic_sim,
        )

    # Translation evidence anchors semantic affinity
    effective_sem = max(max_semantic_sim, 0.90) if direct_translation_evidence else max_semantic_sim

    is_cognate = roots_are_cognate(root_a, root_b)
    distinct_origins = roots_are_distinct(root_a, root_b)
    min_len = min(len(word_a), len(word_b))

    surface_thresh = 0.75 if min_len <= 3 else 0.65
    high_surface = (ortho_sim >= surface_thresh or phono_sim >= surface_thresh)
    # False friends require genuine deceptive surface similarity, not weak prefix noise
    is_deceptive = (ortho_sim >= 0.82 or phono_sim >= 0.80) if min_len >= 4 else (ortho_sim >= 0.90 or phono_sim >= 0.85)

    if is_cognate:
        if is_borrowed_layer:
            category = "sister_loanword"
            relation = "borrowed_stratum"
        elif effective_sem >= 0.80:
            category = "full_cognate"
            relation = "cognate"
        elif effective_sem >= 0.35:
            category = "archaic_cognate" if is_archaic else "semantic_narrowing"
            relation = "cognate"
        elif is_deceptive and not direct_translation_evidence and effective_sem <= 0.30:
            category = "cognate_false_friend"
            relation = "cognate"
        else:
            category = "semantic_divergence"
            relation = "cognate"
    elif distinct_origins:
        if is_borrowed_layer:
            category = "sister_loanword"
            relation = "borrowed_stratum"
        elif is_deceptive and not direct_translation_evidence and effective_sem <= 0.25:
            category = "accidental_lookalike"
            relation = "false_cognate"
        elif effective_sem >= 0.65:
            category = "unrelated_equivalent"
            relation = "unrelated"
        else:
            category = "independent_root"
            relation = "independent"
    else:
        if is_borrowed_layer:
            category = "sister_loanword"
            relation = "borrowed_stratum"
        elif high_surface and effective_sem >= 0.70:
            category = "full_cognate"
            relation = "unknown"
        elif high_surface and effective_sem >= 0.40:
            category = "semantic_narrowing"
            relation = "unknown"
        elif is_deceptive and not direct_translation_evidence and effective_sem <= 0.25:
            category = "accidental_lookalike"
            relation = "unknown"
        elif effective_sem >= 0.65:
            category = "unrelated_equivalent"
            relation = "unrelated"
        else:
            category = "independent_root"
            relation = "independent"

    return AlignedClassification(
        category=category,
        etymological_relation=relation,
        active_sense_a=active_a,
        active_sense_b=active_b,
        semantic_sim=effective_sem,
    )


def align_senses(
    senses_a: List[dict],
    senses_b: List[dict],
    sim_matrix: List[List[float]],
) -> Tuple[int, int, float]:
    """Finds best matching active sense indices from a similarity matrix."""
    best_i, best_j = 0, 0
    max_sim = -1.0
    for i in range(len(senses_a)):
        for j in range(len(senses_b)):
            score = sim_matrix[i][j]
            if score > max_sim:
                max_sim = score
                best_i, best_j = i, j
    return best_i, best_j, max_sim
