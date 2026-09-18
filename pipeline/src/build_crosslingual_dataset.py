"""Unified Cross-Lingual Dataset Builder for Linduistics.

Combines Wiktionary translation graph mining with targeted surface collision
search to generate a comprehensive, balanced lexical comparison dataset
across English, Swedish, German, Danish, and Norwegian Bokmål (20 directed pairs).
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Ensure pipeline/src is on sys.path
_src_dir = str(Path(__file__).resolve().parent)
if _src_dir not in sys.path:
    sys.path.insert(0, _src_dir)

import numpy as np
import orjson
import pyarrow as pa
import pyarrow.parquet as pq

from classifier import classify_pair
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

_ARCHAIC_PATTERN = re.compile(r"^\s*\((?:archaic|obsolete|dated|historical)\)", re.IGNORECASE)


def normalize_lang(code: str) -> str:
    code = code.lower().strip()
    return LANG_ALIASES.get(code, code)


def get_primary_glosses(glosses: List[str], max_senses: int = 2) -> List[str]:
    """Filters out archaic senses and returns primary modern definition glosses."""
    filtered = [g for g in glosses if g and not _ARCHAIC_PATTERN.search(g)]
    if not filtered and glosses:
        filtered = glosses
    return filtered[:max_senses]


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

        lexicons[lang] = {}
        for i in range(len(words)):
            w = words[i]
            if not w:
                continue
            prim = get_primary_glosses(glosses[i] or [])
            lexicons[lang][w.lower()] = {
                "word": w,
                "pos": poses[i] or "noun",
                "ipa": ipas[i] or "",
                "def": prim[0] if prim else (glosses[i][0] if glosses[i] else ""),
                "glosses": prim if prim else (glosses[i] or []),
                "lang": lang,
            }
        print(f"Loaded {len(lexicons[lang]):,} lemmas for [{lang}].")
    return lexicons


def mine_translation_cliques(
    en_jsonl_path: Path,
    lexicons: Dict[str, Dict[str, dict]],
) -> Dict[Tuple[str, str], Dict[Tuple[str, str], Tuple[str, str]]]:
    """Extracts structured translation links from Kaikki English dump."""
    pairs_by_lang: Dict[Tuple[str, str], Dict[Tuple[str, str], Tuple[str, str]]] = defaultdict(dict)

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
                sense_glosses = sense.get("glosses", [])
                sense_def = sense_glosses[0] if sense_glosses else en_meta["def"]

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
                        tw_meta = lexicons[t_lang][tw.lower()]
                        tw_def = tw_meta["def"] or sense_def
                        if pair_key == ("en", t_lang):
                            pairs_by_lang[pair_key][(en_meta["word"], tw)] = (sense_def, tw_def)
                        else:
                            pairs_by_lang[pair_key][(tw, en_meta["word"])] = (tw_def, sense_def)

                # Target to Target clique (canonically sorted pair key)
                t_langs = list(targets.keys())
                for i in range(len(t_langs)):
                    l_a = t_langs[i]
                    for j in range(i + 1, len(t_langs)):
                        l_b = t_langs[j]
                        pair_key = (l_a, l_b) if l_a < l_b else (l_b, l_a)
                        for w_a in targets[l_a]:
                            for w_b in targets[l_b]:
                                def_a = lexicons[l_a][w_a.lower()]["def"] or sense_def
                                def_b = lexicons[l_b][w_b.lower()]["def"] or sense_def
                                if l_a < l_b:
                                    pairs_by_lang[pair_key][(w_a, w_b)] = (def_a, def_b)
                                else:
                                    pairs_by_lang[pair_key][(w_b, w_a)] = (def_b, def_a)

    elapsed = time.perf_counter() - start_time
    total_mined = sum(len(p) for p in pairs_by_lang.values())
    print(f"Extracted {total_mined:,} translation pairs across {len(pairs_by_lang)} language combinations in {elapsed:.2f}s.")
    return pairs_by_lang


def find_surface_collisions(
    lang_a: str,
    lang_b: str,
    lex_a: Dict[str, dict],
    lex_b: Dict[str, dict],
    seen_pairs: Set[Tuple[str, str]],
    max_candidates: int = 2500,
) -> List[Tuple[dict, dict, float, float]]:
    """Rapidly extracts identical and near-identical surface collisions."""
    collisions: List[Tuple[dict, dict, float, float]] = []

    # 1. Exact spelling intersections
    common_lower = set(lex_a.keys()) & set(lex_b.keys())
    for w in common_lower:
        if (w, w) in seen_pairs:
            continue
        meta_a = lex_a[w]
        meta_b = lex_b[w]
        s_orth = orthographic_similarity(meta_a["word"], meta_b["word"])
        s_phon = phonetic_similarity(meta_a["ipa"], meta_b["ipa"]) if (meta_a["ipa"] and meta_b["ipa"]) else 0.0
        collisions.append((meta_a, meta_b, s_orth, s_phon))
        seen_pairs.add((w, w))
        if len(collisions) >= max_candidates:
            return collisions

    # 2. 3-character prefix collisions for near-identical forms (dist <= 2)
    prefix_map_b: Dict[str, List[str]] = defaultdict(list)
    for w_b in lex_b.keys():
        if len(w_b) >= 3:
            norm_b = normalize_orthography(w_b)
            prefix_map_b[norm_b[:3]].append(w_b)

    for w_a in lex_a.keys():
        if len(w_a) < 3 or len(w_a) > 10:
            continue
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
                s_phon = phonetic_similarity(meta_a["ipa"], meta_b["ipa"]) if (meta_a["ipa"] and meta_b["ipa"]) else 0.0
                collisions.append((meta_a, meta_b, s_orth, s_phon))
                seen_pairs.add((w_a, w_b))
                if len(collisions) >= max_candidates:
                    return collisions

    return collisions


def build_pair_dataset(
    lang_a: str,
    lang_b: str,
    mined_pairs: Dict[Tuple[str, str], Tuple[str, str]],
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

    # Step 1: Mined Translation Pairs
    mined_items = list(mined_pairs.items())
    if len(mined_items) > max_translation_pairs:
        mined_items = mined_items[:max_translation_pairs]

    for (w_a, w_b), (def_a, def_b) in mined_items:
        lower_a, lower_b = w_a.lower(), w_b.lower()
        if lower_a not in lex_a or lower_b not in lex_b:
            continue

        meta_a = lex_a[lower_a]
        meta_b = lex_b[lower_b]

        ipa_a = meta_a["ipa"]
        ipa_b = meta_b["ipa"]
        s_orth = orthographic_similarity(w_a, w_b)
        s_phon = phonetic_similarity(ipa_a, ipa_b) if (ipa_a and ipa_b) else 0.0
        s_sem = 0.95

        max_len = max(len(w_a), len(w_b))
        category = classify_pair(
            s_orth=s_orth,
            s_phon=s_phon,
            s_sem=s_sem,
            max_len=max_len,
            word_a=w_a,
            word_b=w_b,
        )

        seen_pairs.add((lower_a, lower_b))
        records.append({
            "lang_a": lang_a,
            "word_a": meta_a["word"],
            "ipa_a": ipa_a,
            "def_a": def_a or meta_a["def"],
            "pos_a": meta_a["pos"],
            "lang_b": lang_b,
            "word_b": meta_b["word"],
            "ipa_b": ipa_b,
            "def_b": def_b or meta_b["def"],
            "pos_b": meta_b["pos"],
            "orthographic_sim": float(s_orth),
            "phonetic_sim": float(s_phon),
            "semantic_sim": float(s_sem),
            "category": category,
        })

    # Step 2: Surface Collisions (False Friends & Cognates)
    collisions = find_surface_collisions(
        lang_a=lang_a,
        lang_b=lang_b,
        lex_a=lex_a,
        lex_b=lex_b,
        seen_pairs=seen_pairs,
        max_candidates=max_collision_candidates,
    )

    if collisions:
        # Pre-encode all collision glosses
        all_glosses = []
        for src, tgt, _, _ in collisions:
            all_glosses.extend(src["glosses"])
            all_glosses.extend(tgt["glosses"])
        matcher.preencode_glosses(all_glosses)

        for src, tgt, s_orth, s_phon in collisions:
            s_sem, best_def_a, best_def_b = matcher.compute_sense_similarity(
                src["glosses"], tgt["glosses"]
            )
            def_a = best_def_a or src["def"]
            def_b = best_def_b or tgt["def"]
            max_len = max(len(src["word"]), len(tgt["word"]))

            category = classify_pair(
                s_orth=s_orth,
                s_phon=s_phon,
                s_sem=s_sem,
                max_len=max_len,
                word_a=src["word"],
                word_b=tgt["word"],
            )

            records.append({
                "lang_a": lang_a,
                "word_a": src["word"],
                "ipa_a": src["ipa"],
                "def_a": def_a,
                "pos_a": src["pos"],
                "lang_b": lang_b,
                "word_b": tgt["word"],
                "ipa_b": tgt["ipa"],
                "def_b": def_b,
                "pos_b": tgt["pos"],
                "orthographic_sim": float(s_orth),
                "phonetic_sim": float(s_phon),
                "semantic_sim": float(s_sem),
                "category": category,
            })

    # Step 3: Symmetrical Inversion
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

    for l_a, l_b in unique_pairs:
        pair_key = (l_a, l_b)
        mined = mined_by_pair.get(pair_key, {})
        print(f"\nProcessing pair [{l_a} <-> {l_b}] ({len(mined):,} mined translation links)...")
        pair_records = build_pair_dataset(l_a, l_b, mined, lexicons, matcher)
        all_rows.extend(pair_records)
        for r in pair_records:
            category_counts[r["category"]] += 1
        print(f"  Generated {len(pair_records):,} symmetrical rows for [{l_a} <-> {l_b}].")

    print(f"\nTotal comparison rows generated: {len(all_rows):,}")
    print("Taxonomy distribution:")
    for cat, cnt in sorted(category_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat:20}: {cnt:,} ({cnt / len(all_rows) * 100:.1f}%)")

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
    ])

    cols = {name: [r[name] for r in all_rows] for name in schema.names}
    arrays = [pa.array(cols[name], type=schema.field(name).type) for name in schema.names]
    table = pa.Table.from_arrays(arrays, schema=schema)
    pq.write_table(table, out_parquet, compression="zstd")
    print(f"Successfully saved {table.num_rows:,} rows to {out_parquet}.")


if __name__ == "__main__":
    main()
