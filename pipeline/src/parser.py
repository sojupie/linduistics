"""Kaikki Wiktextract Streaming Parser for Germanic Lexicon Engine.

Streams line-delimited JSON dumps, strictly filters out inflectional forms,
extracts polysemous senses and etymological provenance, normalizes phonetic data,
and serializes deduplicated headword lemmas to Parquet.
"""

from __future__ import annotations

import argparse
import bz2
import gzip
import io
import os
import re
from typing import BinaryIO, Dict, Iterable, List, Optional, Tuple, Union

import orjson
import pyarrow as pa
import pyarrow.parquet as pq

from g2p_multilingual import g2p_fallback
from ipa_normalizer import normalize_ipa
from extract_etymology_records import clean_etymology_root, source_entry_key

# Words containing hyphens, spaces, or affix symbols are excluded
_INVALID_WORD_PATTERN = re.compile(r"[\s\-\u2010\u2013\u2014]")

# Non-lemma parts of speech to reject
_REJECTED_POS = {"prefix", "suffix", "affix", "punctuation", "symbol", "character"}

# Dictionary meta-glosses that produce false-positive semantic matches
_META_GLOSS_PATTERN = re.compile(
    r"^(?:(?:alternative|archaic|obsolete|dated|rare|dialectal)\s+(?:form|spelling|pronunciation)\s+of|"
    r"(?:synonym|initialism|acronym|abbreviation|misspelling|variant)\s+of|"
    r"(?:plural|singular|past|present|participle|comparative|superlative)\s+of|"
    r"used\s+with\s+an?\s+adjective)",
    re.IGNORECASE,
)

_INACTIVE_TAGS = {"obsolete", "archaic", "historical", "dated"}

# Prioritized proto/ancestral language codes
_ANCESTRAL_LANG_ORDER = [
    ("gem-pro", "Proto-Germanic"),
    ("gmw-pro", "Proto-West Germanic"),
    ("gmq-pro", "Proto-Norse"),
    ("ine-pro", "Proto-Indo-European"),
    ("non", "Old Norse"),
    ("ang", "Old English"),
    ("goh", "Old High German"),
    ("la", "Latin"),
    ("grc", "Ancient Greek"),
]


def extract_etym_root(raw: dict) -> Tuple[str, str]:
    """Extracts (etym_root, etym_text) from raw Kaikki entry."""
    etym_text = (raw.get("etymology_text") or "").strip()
    etym_root = ""

    templates = raw.get("etymology_templates") or []
    # 1. Search templates in order of ancestral significance
    for lang_code, prefix in _ANCESTRAL_LANG_ORDER:
        for t in templates:
            if not isinstance(t, dict):
                continue
            # `dercat` lists languages for categorization, not ancestor forms.
            if t.get("name") == "dercat":
                continue
            args = t.get("args") or {}
            target_code = args.get("2") or args.get("1") or ""
            if target_code == lang_code:
                for k in ("3", "4", "alt", "tr"):
                    term = args.get(k)
                    term = clean_etymology_root(term) if isinstance(term, str) else ""
                    if term and not term.isdigit() and len(term) > 1:
                        clean = "*" + term.lstrip("*") if prefix.startswith("Proto") else term
                        etym_root = f"{prefix} {clean}"
                        break
            if etym_root:
                break
        if etym_root:
            break

    # 2. Any template argument explicitly starting with '*'
    if not etym_root:
        for t in templates:
            if not isinstance(t, dict):
                continue
            args = t.get("args") or {}
            for v in args.values():
                v = clean_etymology_root(v) if isinstance(v, str) else ""
                if v.startswith("*") and len(v) > 2:
                    etym_root = v
                    break
            if etym_root:
                break

    # Etymology prose may mention sister words and unrelated roots; only structured
    # source fields can populate etym_root.
    clean_text = etym_text[:500] if etym_text else ""
    return etym_root, clean_text


def parse_kaikki_entry(raw: dict, lang: Optional[str] = None) -> Optional[dict]:
    """Parses and validates a single Kaikki JSON entry.

    Returns a normalized dictionary if the entry is a valid base lemma,
    or None if it is an inflected form, affix, compound, or invalid entry.
    """
    word = raw.get("word")
    if not word or not isinstance(word, str):
        return None

    # Preserve German capitalization (nouns are capitalized), lowercase other languages
    word = word.strip()
    target_lang = (lang or raw.get("lang_code") or "").lower()
    if target_lang != "de":
        word = word.lower()

    # Reject multi-word compounds, hyphenated terms, or affixes
    if _INVALID_WORD_PATTERN.search(word) or word.startswith("-") or word.endswith("-"):
        return None

    pos = raw.get("pos", "")
    if pos in _REJECTED_POS:
        return None

    # Top-level inflection tags
    top_tags = raw.get("tags") or []
    if "form-of" in top_tags:
        return None

    # Keep source identity and etymology evidence on each sense. The lemma row
    # can combine homographs, so its scalar root is not safe for classification.
    etym_root, etym_text = extract_etym_root(raw)
    entry_key = source_entry_key(raw)

    # Extract valid definition glosses and structured senses
    valid_active_glosses: List[str] = []
    structured_senses: List[dict] = []
    senses = raw.get("senses") or []

    for sense in senses:
        if not isinstance(sense, dict):
            continue

        sense_tags = [t for t in (sense.get("tags") or []) if isinstance(t, str)]
        if "form-of" in sense_tags or sense.get("form_of"):
            continue

        is_active = not bool(set(sense_tags) & _INACTIVE_TAGS)

        for gloss in sense.get("glosses") or []:
            if isinstance(gloss, str):
                cleaned_gloss = gloss.strip()
                if not cleaned_gloss or _META_GLOSS_PATTERN.search(cleaned_gloss):
                    continue

                if is_active and cleaned_gloss not in valid_active_glosses:
                    valid_active_glosses.append(cleaned_gloss)

                structured_senses.append({
                    "sense_id": len(structured_senses) + 1,
                    "source_entry_key": entry_key,
                    "source_sense_id": sense.get("id") if isinstance(sense.get("id"), str) else None,
                    "etymology_number": raw.get("etymology_number"),
                    "gloss": cleaned_gloss,
                    "pos": pos,
                    "tags": sense_tags,
                    "is_active": is_active,
                    "etym_root": etym_root,
                    "etym_text": etym_text,
                })

    # If no semantic glosses survived, entry is either pure inflection or empty
    if not structured_senses:
        return None

    # Extract and normalize IPA
    normalized_ipa = ""
    sounds = raw.get("sounds") or []
    for sound in sounds:
        if isinstance(sound, dict) and sound.get("ipa"):
            cand_ipa = normalize_ipa(sound["ipa"])
            if cand_ipa:
                normalized_ipa = cand_ipa
                break

    return {
        "word": word,
        "pos": pos,
        "ipa": normalized_ipa,
        "glosses": valid_active_glosses if valid_active_glosses else [s["gloss"] for s in structured_senses[:1]],
        "senses": structured_senses,
        "etym_root": etym_root,
        "etym_text": etym_text,
    }


def stream_kaikki_entries(
    source: Union[str, BinaryIO, io.BytesIO],
    lang: str,
    max_entries: Optional[int] = None,
) -> Dict[str, dict]:
    """Streams Kaikki JSONL entries, filters lemmas, and aggregates senses by headword."""
    close_stream = False
    if isinstance(source, str):
        if source.endswith(".bz2"):
            stream = bz2.BZ2File(source, mode="rb")
        elif source.endswith(".gz"):
            stream = gzip.GzipFile(source, mode="rb")
        else:
            stream = open(source, mode="rb")
        close_stream = True
    else:
        stream = source

    lemmas: Dict[str, dict] = {}
    try:
        count = 0
        for line in stream:
            line = line.strip()
            if not line:
                continue

            try:
                raw = orjson.loads(line)
            except orjson.JSONDecodeError:
                continue

            entry = parse_kaikki_entry(raw, lang=lang)
            if entry is None:
                continue

            word = entry["word"]
            if word not in lemmas:
                lemmas[word] = {
                    "word": word,
                    "pos": entry["pos"],
                    "ipa": entry["ipa"],
                    "glosses": list(entry["glosses"]),
                    "senses": list(entry["senses"]),
                    "etym_root": entry["etym_root"],
                    "etym_text": entry["etym_text"],
                    "lang": lang,
                    "_etym_root_conflict": False,
                    "_etym_text_conflict": False,
                }
            else:
                target = lemmas[word]
                # Update missing IPA if newly found
                if not target["ipa"] and entry["ipa"]:
                    target["ipa"] = entry["ipa"]
                if not target["_etym_root_conflict"] and entry["etym_root"] != target["etym_root"]:
                    target["etym_root"] = ""
                    target["_etym_root_conflict"] = True
                if not target["_etym_text_conflict"] and entry["etym_text"] != target["etym_text"]:
                    target["etym_text"] = ""
                    target["_etym_text_conflict"] = True
                # Append unique active glosses
                for g in entry["glosses"]:
                    if g not in target["glosses"]:
                        target["glosses"].append(g)
                # Deduplicate only repeated records for the same source sense.
                existing_senses = {
                    (s.get("source_entry_key"), s.get("source_sense_id"), s["gloss"])
                    for s in target["senses"]
                }
                for s in entry["senses"]:
                    source_identity = (s.get("source_entry_key"), s.get("source_sense_id"), s["gloss"])
                    if s.get("source_sense_id") is None or source_identity not in existing_senses:
                        s_copy = dict(s)
                        s_copy["sense_id"] = len(target["senses"]) + 1
                        target["senses"].append(s_copy)
                        existing_senses.add(source_identity)

            count += 1
            if count % 25000 == 0:
                print(f"  Processed {count:,} entries ({len(lemmas):,} unique lemmas)...", flush=True)
            if max_entries and count >= max_entries:
                break
    finally:
        if close_stream:
            stream.close()

    for lemma in lemmas.values():
        lemma.pop("_etym_root_conflict")
        lemma.pop("_etym_text_conflict")

    # Post-process: G2P fallback only for unique lemmas missing IPA
    missing_ipa = [w for w, item in lemmas.items() if not item["ipa"]]
    if missing_ipa:
        print(f"Applying G2P fallback to {len(missing_ipa):,} lemmas missing IPA...", flush=True)
        for w in missing_ipa:
            lemmas[w]["ipa"] = g2p_fallback(w, lang)

    return lemmas


def export_lemmas_to_parquet(lemmas: Dict[str, dict], output_path: str) -> None:
    """Exports aggregated lemma dictionary to a compressed Parquet table."""
    records = list(lemmas.values())

    schema = pa.schema([
        ("word", pa.string()),
        ("pos", pa.string()),
        ("ipa", pa.string()),
        ("glosses", pa.list_(pa.string())),
        ("senses_json", pa.string()),
        ("etym_root", pa.string()),
        ("etym_text", pa.string()),
        ("lang", pa.string()),
    ])

    words = [r["word"] for r in records]
    poses = [r["pos"] for r in records]
    ipas = [r["ipa"] for r in records]
    glosses = [r["glosses"] for r in records]
    senses_json = [orjson.dumps(r["senses"]).decode("utf-8") for r in records]
    etym_roots = [r["etym_root"] for r in records]
    etym_texts = [r["etym_text"] for r in records]
    langs = [r["lang"] for r in records]

    table = pa.Table.from_arrays(
        [
            pa.array(words, type=pa.string()),
            pa.array(poses, type=pa.string()),
            pa.array(ipas, type=pa.string()),
            pa.array(glosses, type=pa.list_(pa.string())),
            pa.array(senses_json, type=pa.string()),
            pa.array(etym_roots, type=pa.string()),
            pa.array(etym_texts, type=pa.string()),
            pa.array(langs, type=pa.string()),
        ],
        schema=schema,
    )

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    pq.write_table(table, output_path, compression="zstd")


def main():
    parser = argparse.ArgumentParser(description="Parse Kaikki Wiktextract dump into lemma Parquet file")
    parser.add_argument("--input", "-i", required=True, help="Path to raw Kaikki .jsonl / .jsonl.bz2 dump")
    parser.add_argument("--output", "-o", required=True, help="Path to output .parquet file")
    parser.add_argument("--lang", "-l", required=True, help="Language code (e.g., sv, en)")
    parser.add_argument("--limit", type=int, default=None, help="Maximum entries to process")
    args = parser.parse_args()

    print(f"Streaming Kaikki dump for [{args.lang}] from {args.input}...")
    lemmas = stream_kaikki_entries(args.input, lang=args.lang, max_entries=args.limit)
    print(f"Extracted {len(lemmas)} unique base lemmas. Writing to {args.output}...")
    export_lemmas_to_parquet(lemmas, args.output)
    print("Done.")


if __name__ == "__main__":
    main()
