"""Kaikki Wiktextract Streaming Parser for Germanic Lexicon Engine.

Streams line-delimited JSON dumps, strictly filters out inflectional forms,
normalizes phonetic data, and serializes deduplicated headword lemmas to Parquet.
"""

import argparse
import bz2
import gzip
import io
import os
import re
from typing import BinaryIO, Dict, Iterable, List, Optional, Union
import orjson
import pyarrow as pa
import pyarrow.parquet as pq
from tqdm import tqdm

from g2p_sv import swedish_to_ipa
from ipa_normalizer import normalize_ipa

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


def parse_kaikki_entry(raw: dict, lang: Optional[str] = None) -> Optional[dict]:
    """Parses and validates a single Kaikki JSON entry.

    Returns a normalized dictionary if the entry is a valid base lemma,
    or None if it is an inflected form, affix, compound, or invalid entry.
    """
    word = raw.get("word")
    if not word or not isinstance(word, str):
        return None

    word = word.strip().lower()

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

    # Extract valid definition glosses, dropping inflectional senses
    valid_glosses: List[str] = []
    senses = raw.get("senses") or []

    for sense in senses:
        if not isinstance(sense, dict):
            continue

        # Check for inflection markers inside sense
        sense_tags = sense.get("tags") or []
        if "form-of" in sense_tags:
            continue

        if sense.get("form_of"):
            continue

        for gloss in sense.get("glosses") or []:
            if isinstance(gloss, str):
                cleaned_gloss = gloss.strip()
                if (
                    cleaned_gloss
                    and not _META_GLOSS_PATTERN.search(cleaned_gloss)
                    and cleaned_gloss not in valid_glosses
                ):
                    valid_glosses.append(cleaned_gloss)

    # If no base semantic glosses survived, entry is either pure inflection or empty
    if not valid_glosses:
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

    # Swedish G2P fallback if no explicit IPA was found
    if not normalized_ipa and (lang == "sv" or raw.get("lang_code") == "sv"):
        normalized_ipa = swedish_to_ipa(word)

    return {
        "word": word,
        "pos": pos,
        "ipa": normalized_ipa,
        "glosses": valid_glosses,
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
                    "lang": lang,
                }
            else:
                # Update missing IPA if newly found
                if not lemmas[word]["ipa"] and entry["ipa"]:
                    lemmas[word]["ipa"] = entry["ipa"]
                # Append unique glosses
                for g in entry["glosses"]:
                    if g not in lemmas[word]["glosses"]:
                        lemmas[word]["glosses"].append(g)

            count += 1
            if max_entries and count >= max_entries:
                break
    finally:
        if close_stream:
            stream.close()

    return lemmas


def export_lemmas_to_parquet(lemmas: Dict[str, dict], output_path: str) -> None:
    """Exports aggregated lemma dictionary to a compressed Parquet table."""
    records = list(lemmas.values())

    schema = pa.schema([
        ("word", pa.string()),
        ("pos", pa.string()),
        ("ipa", pa.string()),
        ("glosses", pa.list_(pa.string())),
        ("lang", pa.string()),
    ])

    words = [r["word"] for r in records]
    poses = [r["pos"] for r in records]
    ipas = [r["ipa"] for r in records]
    glosses = [r["glosses"] for r in records]
    langs = [r["lang"] for r in records]

    table = pa.Table.from_arrays(
        [
            pa.array(words, type=pa.string()),
            pa.array(poses, type=pa.string()),
            pa.array(ipas, type=pa.string()),
            pa.array(glosses, type=pa.list_(pa.string())),
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
