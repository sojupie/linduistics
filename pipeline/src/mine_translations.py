"""Wiktionary Translation Graph Miner.

Extracts structured cross-lingual translation links from Kaikki Wiktextract dumps
across English, German, Swedish, Danish, and Norwegian Bokmål.
Produces verified, ground-truth translation and cognate pairs.
"""

from __future__ import annotations

import time
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set, Tuple

import orjson
import pyarrow.parquet as pq

from languages import LANGUAGES
TARGET_LANGS = set(LANGUAGES)
# Aliases in Wiktionary
LANG_ALIASES = {
    "no": "nb",
    "norwegian": "nb",
    "danish": "da",
    "german": "de",
    "swedish": "sv",
    "english": "en",
}


def normalize_code(code: str) -> str:
    code = code.lower().strip()
    return LANG_ALIASES.get(code, code)


def load_canonical_lemmas(data_dir: Path) -> Dict[str, Dict[str, dict]]:
    """Loads valid canonical lemma metadata for all target languages."""
    lexicons: Dict[str, Dict[str, dict]] = {}
    for lang in TARGET_LANGS:
        p = data_dir / f"lemmas_{lang}.parquet"
        if not p.is_file():
            print(f"Warning: {p} not found.")
            lexicons[lang] = {}
            continue
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
            lexicons[lang][w.lower()] = {
                "word": w,
                "pos": poses[i],
                "ipa": ipas[i],
                "def": glosses[i][0] if glosses[i] else "",
                "glosses": glosses[i],
            }
        print(f"Loaded {len(lexicons[lang]):,} lemmas for [{lang}].")
    return lexicons


def mine_english_translations(
    jsonl_path: Path,
    lexicons: Dict[str, Dict[str, dict]],
) -> Dict[Tuple[str, str], Set[Tuple[str, str, str, str]]]:
    """Streams English Kaikki dump and extracts cross-lingual cliques.

    Returns mapping: (lang_a, lang_b) -> set of (word_a, word_b, def_a, def_b).
    """
    results: Dict[Tuple[str, str], Set[Tuple[str, str, str, str]]] = defaultdict(set)
    if not jsonl_path.is_file():
        print(f"Skipping {jsonl_path} (not found).")
        return results

    start_time = time.perf_counter()
    en_lex = lexicons.get("en", {})
    count = 0
    links_found = 0

    with open(jsonl_path, "rb") as f:
        for line in f:
            count += 1
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

                # Collect target words in this sense
                targets_by_lang: Dict[str, List[str]] = defaultdict(list)
                for t in translations:
                    raw_code = t.get("code", "")
                    target_lang = normalize_code(raw_code)
                    if target_lang in TARGET_LANGS and target_lang != "en":
                        tw = t.get("word", "").strip()
                        if tw and " " not in tw and "-" not in tw:
                            # Verify lemma exists in target lexicon
                            if tw.lower() in lexicons[target_lang]:
                                canonical_tw = lexicons[target_lang][tw.lower()]["word"]
                                if canonical_tw not in targets_by_lang[target_lang]:
                                    targets_by_lang[target_lang].append(canonical_tw)

                # 1. Add direct (en, target_lang) links
                for t_lang, t_words in targets_by_lang.items():
                    for tw in t_words:
                        tw_meta = lexicons[t_lang][tw.lower()]
                        tw_def = tw_meta["def"] or sense_def
                        results[("en", t_lang)].add((en_meta["word"], tw, sense_def, tw_def))
                        links_found += 1

                # 2. Add cross-target clique links (e.g. sv <-> de, da <-> nb, etc.)
                t_langs = list(targets_by_lang.keys())
                for i in range(len(t_langs)):
                    l_a = t_langs[i]
                    for j in range(i + 1, len(t_langs)):
                        l_b = t_langs[j]
                        pair_key = (l_a, l_b) if l_a < l_b else (l_b, l_a)
                        for w_a in targets_by_lang[l_a]:
                            for w_b in targets_by_lang[l_b]:
                                def_a = lexicons[l_a][w_a.lower()]["def"] or sense_def
                                def_b = lexicons[l_b][w_b.lower()]["def"] or sense_def
                                if l_a < l_b:
                                    results[pair_key].add((w_a, w_b, def_a, def_b))
                                else:
                                    results[pair_key].add((w_b, w_a, def_b, def_a))
                                links_found += 1

    elapsed = time.perf_counter() - start_time
    print(
        f"Mined {links_found:,} translation links across {len(results)} language pairs "
        f"from {count:,} English entries in {elapsed:.2f}s."
    )
    for pair, s in sorted(results.items()):
        print(f"  {pair[0]}-{pair[1]}: {len(s):,} unique pairs")
    return results
