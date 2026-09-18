"""Extract inflection-to-lemma mappings from Kaikki raw JSONL dumps.

Produces a deduplicated dataset of (lang, form, lemma) tuples where the lemma
is validated against our canonical lemma dataset.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import orjson
import pyarrow as pa
import pyarrow.parquet as pq


def extract_forms(
    raw_jsonl_path: Path,
    lemmas_parquet_path: Path,
    output_parquet_path: Path,
    lang: str = "sv",
) -> int:
    """Extract inflection-to-lemma pairs and save to Parquet."""
    if not raw_jsonl_path.is_file():
        raise FileNotFoundError(f"Raw dump not found: {raw_jsonl_path}")
    if not lemmas_parquet_path.is_file():
        raise FileNotFoundError(f"Lemmas Parquet not found: {lemmas_parquet_path}")

    print(f"Loading valid canonical lemmas from {lemmas_parquet_path}...")
    lemmas_table = pq.read_table(lemmas_parquet_path, columns=["word"])
    raw_lemmas = lemmas_table.column("word").to_pylist()
    # Build case-insensitive lookup to canonical lemma spelling
    lemma_lookup = {w.lower(): w for w in raw_lemmas if w}
    print(f"Loaded {len(lemma_lookup):,} valid canonical lemmas for lang '{lang}'.")

    # Set of (form, lemma) pairs
    pairs: set[tuple[str, str]] = set()

    start_time = time.perf_counter()
    print(f"Streaming and parsing forms from {raw_jsonl_path}...")

    with open(raw_jsonl_path, "rb") as f:
        for line in f:
            d = orjson.loads(line)
            raw_word = d.get("word", "").strip()
            word_lower = raw_word.lower()
            if not word_lower or " " in word_lower:
                continue

            # Source 1: Declension/conjugation tables on canonical headwords
            if word_lower in lemma_lookup:
                canonical_lemma = lemma_lookup[word_lower]
                for form_entry in d.get("forms", []):
                    form = form_entry.get("form", "").strip().lower()
                    tags = form_entry.get("tags", [])
                    if (
                        form
                        and " " not in form
                        and form != word_lower
                        and "table-tags" not in tags
                        and "inflection-template" not in tags
                    ):
                        pairs.add((form, canonical_lemma))

            # Source 2: "form-of" senses pointing back to canonical headwords
            for sense in d.get("senses", []):
                for fo in sense.get("form_of", []):
                    target_lemma_lower = fo.get("word", "").strip().lower()
                    if target_lemma_lower in lemma_lookup and target_lemma_lower != word_lower:
                        pairs.add((word_lower, lemma_lookup[target_lemma_lower]))

    extract_time = time.perf_counter() - start_time
    print(f"Extracted {len(pairs):,} unique (form, lemma) pairs in {extract_time:.2f}s.")

    # Convert to sorted columns for Parquet
    sorted_pairs = sorted(pairs)
    lang_col = [lang] * len(sorted_pairs)
    form_col = [p[0] for p in sorted_pairs]
    lemma_col = [p[1] for p in sorted_pairs]

    table = pa.Table.from_arrays(
        [
            pa.array(lang_col, type=pa.string()),
            pa.array(form_col, type=pa.string()),
            pa.array(lemma_col, type=pa.string()),
        ],
        names=["lang", "form", "lemma"],
    )

    output_parquet_path.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(table, output_parquet_path, compression="zstd")
    print(f"Saved {len(sorted_pairs):,} rows to {output_parquet_path}")

    return len(sorted_pairs)


def main() -> None:
    project_root = Path(__file__).resolve().parent.parent.parent
    raw_default = project_root / "pipeline" / "data" / "kaikki_sv.jsonl"
    lemmas_default = project_root / "pipeline" / "data" / "lemmas_sv.parquet"
    out_default = project_root / "pipeline" / "data" / "word_forms_sv.parquet"

    parser = argparse.ArgumentParser(description="Extract word forms from Kaikki JSONL.")
    parser.add_argument("--raw", type=Path, default=raw_default, help="Path to raw Kaikki JSONL dump")
    parser.add_argument("--lemmas", type=Path, default=lemmas_default, help="Path to valid lemmas parquet")
    parser.add_argument("--output", type=Path, default=out_default, help="Path to output forms parquet")
    parser.add_argument("--lang", type=str, default="sv", help="Language code")

    args = parser.parse_args()

    try:
        extract_forms(
            raw_jsonl_path=args.raw,
            lemmas_parquet_path=args.lemmas,
            output_parquet_path=args.output,
            lang=args.lang,
        )
    except Exception as e:
        print(f"Error during extraction: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
