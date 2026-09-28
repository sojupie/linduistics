"""Unified Cross-Lingual Dataset Builder for Linduistics.

Combines Wiktionary translation graph mining with targeted surface collision
search to generate an authoritative, balanced lexical comparison dataset
across English, Swedish, German, Danish, and Norwegian Bokmål (20 directed pairs),
with strict sense-level alignment, polysemous inventory, and etymological provenance.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import time
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

# Ensure pipeline/src is on sys.path
_src_dir = str(Path(__file__).resolve().parent)
if _src_dir not in sys.path:
    sys.path.insert(0, _src_dir)

import numpy as np
import orjson
import pyarrow as pa
import pyarrow.parquet as pq

from classifier import classify_pair, etymological_relation
from ipa_normalizer import phonetic_similarity
from linguistic_metrics import normalize_orthography, orthographic_similarity
from semantic_matcher import SemanticMatcher

TARGET_LANGS = ["en", "de", "sv", "da", "nb"]
LANG_ALIASES = {
    "no": "nb",
    "norwegian": "nb",
    "danish": "da",
    "german": "de",
    "swedish": "sv",
    "english": "en",
}


def normalize_lang(code: str) -> str:
    code = code.lower().strip()
    return LANG_ALIASES.get(code, code)


def _same_gloss_source_candidates(senses: list[dict], selected_index: int) -> list[dict]:
    selected = senses[selected_index]
    gloss = " ".join(unicodedata.normalize("NFC", str(selected.get("gloss", ""))).casefold().split())
    candidates = [
        sense for sense in senses
        if sense.get("is_active", True)
        and sense.get("pos") == selected.get("pos")
        and " ".join(unicodedata.normalize("NFC", str(sense.get("gloss", ""))).casefold().split()) == gloss
    ]
    identities = {
        (sense.get("source_entry_key"), sense.get("source_sense_id"))
        for sense in candidates
        if sense.get("source_entry_key") and sense.get("source_sense_id")
    }
    return candidates if len(identities) > 1 else []


def _lowercase_index(lexicon: Dict[str, dict]) -> Dict[str, List[str]]:
    index: Dict[str, List[str]] = defaultdict(list)
    for word in lexicon:
        index[word.lower()].append(word)
    return index


def _lookup_lemma(
    lexicon: Dict[str, dict], lowercase_index: Dict[str, List[str]], word: str
) -> Optional[dict]:
    exact = lexicon.get(word)
    if exact is not None:
        return exact
    matches = lowercase_index.get(word.lower(), [])
    return lexicon[matches[0]] if len(matches) == 1 else None


def load_canonical_lexicons(data_dir: Path) -> Dict[str, Dict[str, dict]]:
    """Loads canonical lemma datasets for all target languages."""
    lexicons: Dict[str, Dict[str, dict]] = {}
    for lang in TARGET_LANGS:
        p = data_dir / f"lemmas_{lang}.parquet"
        if not p.is_file():
            print(f"Error: Missing {p}", file=sys.stderr)
            sys.exit(1)
        table = pq.read_table(p)
        words = table.column("word").to_pylist()
        poses = table.column("pos").to_pylist()
        ipas = table.column("ipa").to_pylist()
        glosses = table.column("glosses").to_pylist()
        senses_json = table.column("senses_json").to_pylist()
        etym_roots = table.column("etym_root").to_pylist()
        etym_texts = table.column("etym_text").to_pylist()

        lexicons[lang] = {}
        for i in range(len(words)):
            w = words[i]
            if not w:
                continue
            s_json = senses_json[i]
            senses = orjson.loads(s_json) if s_json else []
            active_glosses = (
                glosses[i]
                or [s["gloss"] for s in senses if s.get("is_active")]
                or [s["gloss"] for s in senses[:1]]
            )

            lexicons[lang][w] = {
                "word": w,
                "pos": poses[i] or (senses[0].get("pos") if senses else "noun"),
                "ipa": ipas[i] or "",
                "def": active_glosses[0] if active_glosses else (senses[0]["gloss"] if senses else ""),
                "glosses": active_glosses,
                "senses": senses,
                "etym_root": etym_roots[i] or "",
                "etym_text": etym_texts[i] or "",
                "lang": lang,
            }
        print(f"Loaded {len(lexicons[lang]):,} lemmas for [{lang}].")
    return lexicons


def mine_translation_cliques(
    en_jsonl_path: Path,
    lexicons: Dict[str, Dict[str, dict]],
) -> Dict[Tuple[str, str], Set[Tuple[str, str]]]:
    """Extracts candidate translation links from Kaikki English dump."""
    pairs_by_lang: Dict[Tuple[str, str], Set[Tuple[str, str]]] = defaultdict(set)

    if not en_jsonl_path.is_file():
        print(f"Warning: {en_jsonl_path} not found.")
        return pairs_by_lang

    print(f"Streaming translations from {en_jsonl_path}...")
    start_time = time.perf_counter()
    en_lex = lexicons["en"]
    lowercase_indexes = {lang: _lowercase_index(lexicon) for lang, lexicon in lexicons.items()}

    with open(en_jsonl_path, "rb") as f:
        for line in f:
            d = orjson.loads(line)
            en_word = d.get("word", "").strip()
            if not en_word or " " in en_word or "-" in en_word:
                continue

            en_meta = _lookup_lemma(en_lex, lowercase_indexes["en"], en_word)
            if not en_meta:
                continue

            for sense in d.get("senses", []):
                translations = sense.get("translations", [])
                if not translations:
                    continue

                targets: Dict[str, List[str]] = defaultdict(list)
                for t in translations:
                    target_lang = normalize_lang(t.get("code", ""))
                    if target_lang in TARGET_LANGS and target_lang != "en":
                        tw = t.get("word", "").strip()
                        if tw and " " not in tw and "-" not in tw:
                            target_meta = _lookup_lemma(
                                lexicons[target_lang], lowercase_indexes[target_lang], tw
                            )
                            if target_meta:
                                canonical_tw = target_meta["word"]
                                if canonical_tw not in targets[target_lang]:
                                    targets[target_lang].append(canonical_tw)

                # English to Target (canonically sorted pair key)
                for t_lang, t_words in targets.items():
                    pair_key = ("en", t_lang) if "en" < t_lang else (t_lang, "en")
                    for tw in t_words:
                        if pair_key == ("en", t_lang):
                            pairs_by_lang[pair_key].add((en_meta["word"], tw))
                        else:
                            pairs_by_lang[pair_key].add((tw, en_meta["word"]))

                # Target to Target clique (canonically sorted pair key)
                t_langs = list(targets.keys())
                for i in range(len(t_langs)):
                    l_a = t_langs[i]
                    for j in range(i + 1, len(t_langs)):
                        l_b = t_langs[j]
                        pair_key = (l_a, l_b) if l_a < l_b else (l_b, l_a)
                        for w_a in targets[l_a]:
                            for w_b in targets[l_b]:
                                if l_a < l_b:
                                    pairs_by_lang[pair_key].add((w_a, w_b))
                                else:
                                    pairs_by_lang[pair_key].add((w_b, w_a))

    elapsed = time.perf_counter() - start_time
    total_mined = sum(len(p) for p in pairs_by_lang.values())
    print(
        f"Extracted {total_mined:,} translation pairs across {len(pairs_by_lang)} language combinations in {elapsed:.2f}s."
    )
    return pairs_by_lang


def find_surface_collisions(
    lang_a: str,
    lang_b: str,
    lex_a: Dict[str, dict],
    lex_b: Dict[str, dict],
    seen_pairs: Set[Tuple[str, str]],
    max_prefix_candidates: int = 2500,
) -> List[Tuple[dict, dict, float, float]]:
    """Deterministically extracts ALL identical spelling collisions plus near-identical prefix collisions."""
    collisions: List[Tuple[dict, dict, float, float]] = []

    # 1. Case-insensitive exact spelling intersections. Keep each entry distinct.
    index_a = _lowercase_index(lex_a)
    index_b = _lowercase_index(lex_b)
    common_spellings = sorted(set(index_a) & set(index_b))
    exact_matches = [
        (word_a, word_b)
        for spelling in common_spellings
        for word_a in index_a[spelling]
        for word_b in index_b[spelling]
    ]
    exact_matches.sort(
        key=lambda pair: (
            0 if (lex_a[pair[0]].get("etym_root") or lex_b[pair[1]].get("etym_root")) else 1,
            len(pair[0]) + len(pair[1]),
            pair[0],
            pair[1],
        )
    )
    for word_a, word_b in exact_matches:
        if (word_a, word_b) in seen_pairs:
            continue
        meta_a = lex_a[word_a]
        meta_b = lex_b[word_b]
        s_orth = orthographic_similarity(meta_a["word"], meta_b["word"])
        s_phon = (
            phonetic_similarity(meta_a["ipa"], meta_b["ipa"])
            if (meta_a["ipa"] and meta_b["ipa"])
            else 0.0
        )
        collisions.append((meta_a, meta_b, s_orth, s_phon))
        seen_pairs.add((word_a, word_b))

    # 2. 3-character prefix collisions for near-identical forms (dist <= 2)
    prefix_map_b: Dict[str, List[str]] = defaultdict(list)
    for w_b in lex_b.keys():
        if len(w_b) >= 3:
            norm_b = normalize_orthography(w_b)
            prefix_map_b[norm_b[:3]].append(w_b)

    sorted_a = sorted(
        [w for w in lex_a.keys() if 3 <= len(w) <= 10],
        key=lambda w: (
            0 if lex_a[w].get("etym_root") else 1,
            len(w),
            w,
        ),
    )

    prefix_count = 0
    for w_a in sorted_a:
        norm_a = normalize_orthography(w_a)
        cands = prefix_map_b.get(norm_a[:3], [])
        for w_b in cands:
            if abs(len(w_a) - len(w_b)) > 2:
                continue
            if (w_a, w_b) in seen_pairs:
                continue
            s_orth = orthographic_similarity(w_a, w_b)
            if s_orth >= 0.70:
                meta_a = lex_a[w_a]
                meta_b = lex_b[w_b]
                s_phon = (
                    phonetic_similarity(meta_a["ipa"], meta_b["ipa"])
                    if (meta_a["ipa"] and meta_b["ipa"])
                    else 0.0
                )
                collisions.append((meta_a, meta_b, s_orth, s_phon))
                seen_pairs.add((w_a, w_b))
                prefix_count += 1
                if prefix_count >= max_prefix_candidates:
                    return collisions

    return collisions


def align_pair_senses(
    meta_a: dict,
    meta_b: dict,
    matcher: SemanticMatcher,
    is_mined_translation: bool = False,
) -> Tuple[float, float, str, str, List[dict], List[dict]]:
    """Evaluates N x M sense matrix between Word A and Word B.

    Enforces that def_a and def_b correspond to the exact same winning sense pair.

    Returns:
        (best_sem_sim, max_active_sem, best_def_a, best_def_b, annotated_senses_a, annotated_senses_b)
    """
    senses_a = meta_a.get("senses") or []
    senses_b = meta_b.get("senses") or []

    if not senses_a:
        senses_a = [{
            "sense_id": 1,
            "gloss": meta_a.get("def") or meta_a["word"],
            "pos": meta_a.get("pos", "noun"),
            "tags": [],
            "is_active": True,
        }]
    if not senses_b:
        senses_b = [{
            "sense_id": 1,
            "gloss": meta_b.get("def") or meta_b["word"],
            "pos": meta_b.get("pos", "noun"),
            "tags": [],
            "is_active": True,
        }]

    glosses_a = [s["gloss"] for s in senses_a]
    glosses_b = [s["gloss"] for s in senses_b]

    vecs_a = matcher.encode(glosses_a)
    vecs_b = matcher.encode(glosses_b)

    # N x M similarity matrix
    if len(vecs_a) > 0 and len(vecs_b) > 0:
        sim_matrix = np.dot(vecs_a, vecs_b.T)
        sim_matrix = np.clip(sim_matrix, 0.0, 1.0)
    else:
        sim_matrix = np.zeros((len(senses_a), len(senses_b)), dtype=np.float32)

    # Check for loanword definition identities (e.g. Swedish halva defined as 'halva')
    wa_lower = meta_a["word"].strip().lower()
    wb_lower = meta_b["word"].strip().lower()
    if wa_lower == wb_lower:
        for i in range(len(senses_a)):
            for j in range(len(senses_b)):
                ga = senses_a[i]["gloss"].strip().lower()
                gb = senses_b[j]["gloss"].strip().lower()
                if ga == wb_lower or gb == wa_lower:
                    sim_matrix[i, j] = 1.0

    # Separate active senses from obsolete ones
    active_pairs = [
        (i, j)
        for i in range(len(senses_a))
        for j in range(len(senses_b))
        if senses_a[i].get("is_active", True) and senses_b[j].get("is_active", True)
    ]

    if active_pairs:
        best_i, best_j = max(active_pairs, key=lambda idx: sim_matrix[idx[0], idx[1]])
        max_active_sem = float(sim_matrix[best_i, best_j])
    else:
        best_flat_idx = int(np.argmax(sim_matrix))
        best_i, best_j = np.unravel_index(best_flat_idx, sim_matrix.shape)
        max_active_sem = float(sim_matrix[best_i, best_j])

    best_sem_sim = float(sim_matrix[best_i, best_j])

    # Direct translation links from Wiktionary represent high semantic affinity
    if is_mined_translation:
        best_sem_sim = max(best_sem_sim, 0.95)
        max_active_sem = max(max_active_sem, 0.95)

    # Annotate senses with attribution and counterpart affinity
    annotated_a = []
    for i, s in enumerate(senses_a):
        affinity = float(sim_matrix[i, best_j])
        source_metadata = {
            key: s[key]
            for key in ("source_entry_key", "source_sense_id", "etymology_number", "etym_root", "etym_text")
            if key in s
        }
        annotated_a.append({
            **source_metadata,
            "sense_id": int(s.get("sense_id", i + 1)),
            "gloss": str(s["gloss"]),
            "pos": str(s.get("pos", meta_a["pos"])),
            "tags": [str(t) for t in s.get("tags", [])],
            "is_active": bool(s.get("is_active", True)),
            "is_active_match": bool(int(i) == int(best_i)),
            "similarity_to_counterpart": float(round(affinity, 3)),
        })

    annotated_b = []
    for j, s in enumerate(senses_b):
        affinity = float(sim_matrix[best_i, j])
        source_metadata = {
            key: s[key]
            for key in ("source_entry_key", "source_sense_id", "etymology_number", "etym_root", "etym_text")
            if key in s
        }
        annotated_b.append({
            **source_metadata,
            "sense_id": int(s.get("sense_id", j + 1)),
            "gloss": str(s["gloss"]),
            "pos": str(s.get("pos", meta_b["pos"])),
            "tags": [str(t) for t in s.get("tags", [])],
            "is_active": bool(s.get("is_active", True)),
            "is_active_match": bool(int(j) == int(best_j)),
            "similarity_to_counterpart": float(round(affinity, 3)),
        })

    # Equal glosses from different source senses cannot be disambiguated by a
    # gloss embedding. Keep shared evidence only when every candidate agrees.
    for annotated, senses, selected_index in (
        (annotated_a, senses_a, best_i),
        (annotated_b, senses_b, best_j),
    ):
        candidates = _same_gloss_source_candidates(senses, int(selected_index))
        if not candidates:
            continue
        matched = annotated[int(selected_index)]
        matched["source_identity_ambiguous"] = True
        matched["source_entry_key"] = None
        matched["source_sense_id"] = None
        matched["etymology_number"] = None
        for field in ("etym_root", "etym_text"):
            values = {candidate.get(field) or "" for candidate in candidates}
            matched[field] = next(iter(values)) if len(values) == 1 else ""

    best_def_a = str(senses_a[best_i]["gloss"])
    best_def_b = str(senses_b[best_j]["gloss"])

    return float(best_sem_sim), float(max_active_sem), best_def_a, best_def_b, annotated_a, annotated_b


def build_pair_dataset(
    lang_a: str,
    lang_b: str,
    mined_pairs: Set[Tuple[str, str]],
    lexicons: Dict[str, Dict[str, dict]],
    matcher: SemanticMatcher,
    max_translation_pairs: int = 15000,
    max_collision_candidates: int = 2500,
) -> List[dict]:
    """Constructs comparison records for (lang_a, lang_b) and its inverse."""
    lex_a = lexicons[lang_a]
    lex_b = lexicons[lang_b]

    records: List[dict] = []
    seen_pairs: Set[Tuple[str, str]] = set()

    # Step 1: Pre-collect candidate items
    candidate_items: List[Tuple[dict, dict, bool, float, float]] = []

    # 1.1 Mined translations prioritized deterministically by verified root and core lemma length
    lowercase_a = _lowercase_index(lex_a)
    lowercase_b = _lowercase_index(lex_b)
    sorted_mined = sorted(
        mined_pairs,
        key=lambda p: (
            0 if (
                (_lookup_lemma(lex_a, lowercase_a, p[0]) or {}).get("etym_root")
                or (_lookup_lemma(lex_b, lowercase_b, p[1]) or {}).get("etym_root")
            ) else 1,
            len(p[0]) + len(p[1]),
            p[0],
            p[1],
        ),
    )
    mined_list = sorted_mined[:max_translation_pairs]
    for w_a, w_b in mined_list:
        meta_a = _lookup_lemma(lex_a, lowercase_a, w_a)
        meta_b = _lookup_lemma(lex_b, lowercase_b, w_b)
        if meta_a is None or meta_b is None:
            continue
        s_orth = orthographic_similarity(meta_a["word"], meta_b["word"])
        s_phon = (
            phonetic_similarity(meta_a["ipa"], meta_b["ipa"])
            if (meta_a["ipa"] and meta_b["ipa"])
            else 0.0
        )
        candidate_items.append((meta_a, meta_b, True, s_orth, s_phon))
        seen_pairs.add((meta_a["word"], meta_b["word"]))

    # 1.2 Surface collisions
    collisions = find_surface_collisions(
        lang_a=lang_a,
        lang_b=lang_b,
        lex_a=lex_a,
        lex_b=lex_b,
        seen_pairs=seen_pairs,
        max_prefix_candidates=max_collision_candidates,
    )
    for meta_a, meta_b, s_orth, s_phon in collisions:
        candidate_items.append((meta_a, meta_b, False, s_orth, s_phon))

    # Pre-encode all glosses for candidate items in batches
    all_glosses: List[str] = []
    for meta_a, meta_b, _, _, _ in candidate_items:
        for s in meta_a.get("senses") or []:
            all_glosses.append(s["gloss"])
        for s in meta_b.get("senses") or []:
            all_glosses.append(s["gloss"])
    matcher.preencode_glosses(all_glosses)

    # Step 2: Sense alignment and classification
    for meta_a, meta_b, is_mined, s_orth, s_phon in candidate_items:
        s_sem, max_active_sem, def_a, def_b, senses_a, senses_b = align_pair_senses(
            meta_a, meta_b, matcher, is_mined_translation=is_mined
        )

        matched_a = next(s for s in senses_a if s["is_active_match"])
        matched_b = next(s for s in senses_b if s["is_active_match"])
        etym_root_a = matched_a.get("etym_root") or ""
        etym_root_b = matched_b.get("etym_root") or ""
        etym_text_a = matched_a.get("etym_text") or ""
        etym_text_b = matched_b.get("etym_text") or ""
        pos_a = matched_a.get("pos") or meta_a["pos"]
        pos_b = matched_b.get("pos") or meta_b["pos"]

        category, etymological_relation_value = classify_pair(
            s_orth=s_orth,
            s_phon=s_phon,
            s_sem=s_sem,
            etym_root_a=etym_root_a,
            etym_root_b=etym_root_b,
            max_active_sem=max_active_sem,
        )

        shared_etym_root = (
            etym_root_a
            if etymological_relation(etym_root_a, etym_root_b) == "cognate"
            else None
        )

        records.append({
            "lang_a": lang_a,
            "word_a": meta_a["word"],
            "ipa_a": meta_a["ipa"],
            "def_a": def_a,
            "pos_a": pos_a,
            "lang_b": lang_b,
            "word_b": meta_b["word"],
            "ipa_b": meta_b["ipa"],
            "def_b": def_b,
            "pos_b": pos_b,
            "orthographic_sim": float(s_orth),
            "phonetic_sim": float(s_phon),
            "semantic_sim": float(s_sem),
            "category": category,
            "etymological_relation": etymological_relation_value,
            "senses_a": orjson.dumps(senses_a, option=orjson.OPT_SERIALIZE_NUMPY).decode("utf-8"),
            "senses_b": orjson.dumps(senses_b, option=orjson.OPT_SERIALIZE_NUMPY).decode("utf-8"),
            "etym_root_a": etym_root_a or None,
            "etym_root_b": etym_root_b or None,
            "shared_etym_root": shared_etym_root,
            "etym_text_a": etym_text_a or None,
            "etym_text_b": etym_text_b or None,
        })

    # Step 3: Symmetrical Inversion (Lang B -> Lang A)
    symmetrical: List[dict] = []
    for r in records:
        symmetrical.append(r)
        symmetrical.append({
            "lang_a": r["lang_b"],
            "word_a": r["word_b"],
            "ipa_a": r["ipa_b"],
            "def_a": r["def_b"],
            "pos_a": r["pos_b"],
            "lang_b": r["lang_a"],
            "word_b": r["word_a"],
            "ipa_b": r["ipa_a"],
            "def_b": r["def_a"],
            "pos_b": r["pos_a"],
            "orthographic_sim": r["orthographic_sim"],
            "phonetic_sim": r["phonetic_sim"],
            "semantic_sim": r["semantic_sim"],
            "category": r["category"],
            "etymological_relation": r["etymological_relation"],
            "senses_a": r["senses_b"],
            "senses_b": r["senses_a"],
            "etym_root_a": r["etym_root_b"],
            "etym_root_b": r["etym_root_a"],
            "shared_etym_root": r["shared_etym_root"],
            "etym_text_a": r["etym_text_b"],
            "etym_text_b": r["etym_text_a"],
        })

    return symmetrical


def main() -> None:
    project_root = Path(__file__).resolve().parent.parent.parent
    data_dir = project_root / "pipeline" / "data"
    en_dump = data_dir / "kaikki_en.jsonl"
    parser = argparse.ArgumentParser(description="Build and classify cross-lingual word comparisons.")
    parser.add_argument(
        "--lemma-dir",
        type=Path,
        default=data_dir,
        help="Directory containing the canonical lemmas_<lang>.parquet files.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=data_dir / "all_comparisons.parquet",
        help="Output comparison Parquet path.",
    )
    args = parser.parse_args()
    out_parquet = args.output

    print("Loading canonical lexicons...")
    lexicons = load_canonical_lexicons(args.lemma_dir)

    print("Mining translation cliques...")
    mined_by_pair = mine_translation_cliques(en_dump, lexicons)

    print("Initializing semantic matcher...")
    matcher = SemanticMatcher()

    # Generate comparisons for all 10 language combinations (sorted order)
    unique_pairs = []
    sorted_langs = sorted(TARGET_LANGS)
    for i in range(len(sorted_langs)):
        for j in range(i + 1, len(sorted_langs)):
            unique_pairs.append((sorted_langs[i], sorted_langs[j]))

    all_rows: List[dict] = []
    category_counts: Dict[str, int] = defaultdict(int)
    etymological_relations: Dict[str, int] = defaultdict(int)

    for l_a, l_b in unique_pairs:
        pair_key = (l_a, l_b)
        mined = mined_by_pair.get(pair_key, set())
        print(f"\nProcessing pair [{l_a} <-> {l_b}] ({len(mined):,} mined translation links)...")
        pair_records = build_pair_dataset(l_a, l_b, mined, lexicons, matcher)
        all_rows.extend(pair_records)
        for r in pair_records:
            category_counts[r["category"]] += 1
            etymological_relations[r["etymological_relation"]] += 1
        print(f"  Generated {len(pair_records):,} symmetrical rows for [{l_a} <-> {l_b}].")

    print(f"\nTotal comparison rows generated: {len(all_rows):,}")
    print("Taxonomy distribution:")
    for cat, cnt in sorted(category_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat:20}: {cnt:,} ({cnt / len(all_rows) * 100:.1f}%)")

    print("Etymological relations:")
    for relation, cnt in sorted(etymological_relations.items(), key=lambda x: -x[1]):
        print(f"  {relation:25}: {cnt:,}")

    # Serialize to Parquet
    print(f"\nWriting to {out_parquet}...")
    schema = pa.schema([
        ("lang_a", pa.string()),
        ("word_a", pa.string()),
        ("ipa_a", pa.string()),
        ("def_a", pa.string()),
        ("pos_a", pa.string()),
        ("lang_b", pa.string()),
        ("word_b", pa.string()),
        ("ipa_b", pa.string()),
        ("def_b", pa.string()),
        ("pos_b", pa.string()),
        ("orthographic_sim", pa.float64()),
        ("phonetic_sim", pa.float64()),
        ("semantic_sim", pa.float64()),
        ("category", pa.string()),
        ("etymological_relation", pa.string()),
        ("senses_a", pa.string()),
        ("senses_b", pa.string()),
        ("etym_root_a", pa.string()),
        ("etym_root_b", pa.string()),
        ("shared_etym_root", pa.string()),
        ("etym_text_a", pa.string()),
        ("etym_text_b", pa.string()),
    ])

    cols = {name: [r[name] for r in all_rows] for name in schema.names}
    arrays = [pa.array(cols[name], type=schema.field(name).type) for name in schema.names]
    table = pa.Table.from_arrays(arrays, schema=schema)
    pq.write_table(table, out_parquet, compression="zstd")
    print(f"Successfully saved {table.num_rows:,} rows to {out_parquet}.")


if __name__ == "__main__":
    main()
