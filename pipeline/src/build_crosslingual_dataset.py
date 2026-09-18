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

from classifier import are_cognate_roots, classify_pair
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

            lexicons[lang][w.lower()] = {
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

    with open(en_jsonl_path, "rb") as f:
        for line in f:
            d = orjson.loads(line)
            en_word = d.get("word", "").strip()
            if not en_word or " " in en_word or "-" in en_word:
                continue

            en_lower = en_word.lower()
            en_meta = en_lex.get(en_lower)
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
                            tw_lower = tw.lower()
                            if tw_lower in lexicons[target_lang]:
                                canonical_tw = lexicons[target_lang][tw_lower]["word"]
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

    # 1. Exact spelling intersections: include ALL exact matches!
    common_lower = sorted(
        list(set(lex_a.keys()) & set(lex_b.keys())),
        key=lambda w: (
            0 if (lex_a[w].get("etym_root") or lex_b[w].get("etym_root")) else 1,
            len(w),
            w,
        ),
    )
    for w in common_lower:
        if (w, w) in seen_pairs:
            continue
        meta_a = lex_a[w]
        meta_b = lex_b[w]
        s_orth = orthographic_similarity(meta_a["word"], meta_b["word"])
        s_phon = (
            phonetic_similarity(meta_a["ipa"], meta_b["ipa"])
            if (meta_a["ipa"] and meta_b["ipa"])
            else 0.0
        )
        collisions.append((meta_a, meta_b, s_orth, s_phon))
        seen_pairs.add((w, w))

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
        annotated_a.append({
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
        annotated_b.append({
            "sense_id": int(s.get("sense_id", j + 1)),
            "gloss": str(s["gloss"]),
            "pos": str(s.get("pos", meta_b["pos"])),
            "tags": [str(t) for t in s.get("tags", [])],
            "is_active": bool(s.get("is_active", True)),
            "is_active_match": bool(int(j) == int(best_j)),
            "similarity_to_counterpart": float(round(affinity, 3)),
        })

    best_def_a = str(senses_a[best_i]["gloss"])
    best_def_b = str(senses_b[best_j]["gloss"])

    return float(best_sem_sim), float(max_active_sem), best_def_a, best_def_b, annotated_a, annotated_b


def build_pair_dataset(
    lang_a: str,
    lang_b: str,
    mined_pairs: Set[Tuple[str, str]],
    lexicons: Dict[str, Dict[str, dict]],
    matcher: SemanticMatcher,
    max_translation_pairs: int = 10000,
    max_collision_candidates: int = 2500,
) -> List[dict]:
    """Constructs comparison records for (lang_a, lang_b) and its inverse."""
    lex_a = lexicons[lang_a]
    lex_b = lexicons[lang_b]

    records: List[dict] = []
    seen_pairs: Set[Tuple[str, str]] = set()

    # Step 1: Pre-collect candidate items
    candidate_items: List[Tuple[dict, dict, bool, float, float]] = []

    # 1.1 Mined translations
    mined_list = list(mined_pairs)[:max_translation_pairs]
    for w_a, w_b in mined_list:
        lower_a, lower_b = w_a.lower(), w_b.lower()
        if lower_a not in lex_a or lower_b not in lex_b:
            continue
        meta_a = lex_a[lower_a]
        meta_b = lex_b[lower_b]
        s_orth = orthographic_similarity(meta_a["word"], meta_b["word"])
        s_phon = (
            phonetic_similarity(meta_a["ipa"], meta_b["ipa"])
            if (meta_a["ipa"] and meta_b["ipa"])
            else 0.0
        )
        candidate_items.append((meta_a, meta_b, True, s_orth, s_phon))
        seen_pairs.add((lower_a, lower_b))

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

        max_len = max(len(meta_a["word"]), len(meta_b["word"]))
        category, false_friend_type = classify_pair(
            s_orth=s_orth,
            s_phon=s_phon,
            s_sem=s_sem,
            max_len=max_len,
            word_a=meta_a["word"],
            word_b=meta_b["word"],
            etym_root_a=meta_a.get("etym_root", ""),
            etym_root_b=meta_b.get("etym_root", ""),
            etym_text_a=meta_a.get("etym_text", ""),
            etym_text_b=meta_b.get("etym_text", ""),
            max_active_sem=max_active_sem,
        )

        # Determine shared etymological root
        etym_root = ""
        if meta_a.get("etym_root") and meta_b.get("etym_root"):
            if are_cognate_roots(meta_a["etym_root"], meta_b["etym_root"]):
                etym_root = meta_a["etym_root"]
        elif meta_a.get("etym_root") and "Proto-Germanic" in meta_a["etym_root"]:
            etym_root = meta_a["etym_root"]
        elif meta_b.get("etym_root") and "Proto-Germanic" in meta_b["etym_root"]:
            etym_root = meta_b["etym_root"]

        records.append({
            "lang_a": lang_a,
            "word_a": meta_a["word"],
            "ipa_a": meta_a["ipa"],
            "def_a": def_a,
            "pos_a": meta_a["pos"],
            "lang_b": lang_b,
            "word_b": meta_b["word"],
            "ipa_b": meta_b["ipa"],
            "def_b": def_b,
            "pos_b": meta_b["pos"],
            "orthographic_sim": float(s_orth),
            "phonetic_sim": float(s_phon),
            "semantic_sim": float(s_sem),
            "category": category,
            "false_friend_type": false_friend_type,
            "senses_a": orjson.dumps(senses_a, option=orjson.OPT_SERIALIZE_NUMPY).decode("utf-8"),
            "senses_b": orjson.dumps(senses_b, option=orjson.OPT_SERIALIZE_NUMPY).decode("utf-8"),
            "etym_root": etym_root or None,
            "etym_text_a": meta_a.get("etym_text") or None,
            "etym_text_b": meta_b.get("etym_text") or None,
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
            "false_friend_type": r["false_friend_type"],
            "senses_a": r["senses_b"],
            "senses_b": r["senses_a"],
            "etym_root": r["etym_root"],
            "etym_text_a": r["etym_text_b"],
            "etym_text_b": r["etym_text_a"],
        })

    return symmetrical


def main() -> None:
    project_root = Path(__file__).resolve().parent.parent.parent
    data_dir = project_root / "pipeline" / "data"
    en_dump = data_dir / "kaikki_en.jsonl"
    out_parquet = data_dir / "all_comparisons.parquet"

    print("Loading canonical lexicons...")
    lexicons = load_canonical_lexicons(data_dir)

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
    ff_type_counts: Dict[str, int] = defaultdict(int)

    for l_a, l_b in unique_pairs:
        pair_key = (l_a, l_b)
        mined = mined_by_pair.get(pair_key, set())
        print(f"\nProcessing pair [{l_a} <-> {l_b}] ({len(mined):,} mined translation links)...")
        pair_records = build_pair_dataset(l_a, l_b, mined, lexicons, matcher)
        all_rows.extend(pair_records)
        for r in pair_records:
            category_counts[r["category"]] += 1
            if r["false_friend_type"]:
                ff_type_counts[r["false_friend_type"]] += 1
        print(f"  Generated {len(pair_records):,} symmetrical rows for [{l_a} <-> {l_b}].")

    print(f"\nTotal comparison rows generated: {len(all_rows):,}")
    print("Taxonomy distribution:")
    for cat, cnt in sorted(category_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat:20}: {cnt:,} ({cnt / len(all_rows) * 100:.1f}%)")

    print("False Friend Sub-Tiers:")
    for ff_t, cnt in sorted(ff_type_counts.items(), key=lambda x: -x[1]):
        print(f"  {ff_t:25}: {cnt:,}")

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
        ("false_friend_type", pa.string()),
        ("senses_a", pa.string()),
        ("senses_b", pa.string()),
        ("etym_root", pa.string()),
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
