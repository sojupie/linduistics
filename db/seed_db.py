"""Bulk database seeder for Linduistics comparison dataset.

Reads precomputed word comparison pairs from Parquet and streams them into
the PostgreSQL `word_comparisons` table using psycopg's binary COPY protocol.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path
from typing import Iterator

import psycopg
import pyarrow.parquet as pq


def load_env_file(env_path: Path) -> None:
    """Load key-value pairs from .env if present into os.environ."""
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip().strip("'\"")
        if key and key not in os.environ:
            os.environ[key] = val


COLUMNS = [
    "lang_a",
    "word_a",
    "ipa_a",
    "def_a",
    "pos_a",
    "lang_b",
    "word_b",
    "ipa_b",
    "def_b",
    "pos_b",
    "orthographic_sim",
    "phonetic_sim",
    "semantic_sim",
    "category",
    "etymological_relation",
    "senses_a",
    "senses_b",
    "etym_root_a",
    "etym_root_b",
    "shared_etym_root",
    "etym_text_a",
    "etym_text_b",
]


def stream_parquet_rows(
    parquet_path: Path, batch_size: int = 25000
) -> Iterator[tuple]:
    """Stream rows from Parquet file in batches as tuples."""
    pf = pq.ParquetFile(parquet_path)
    for batch in pf.iter_batches(batch_size=batch_size, columns=COLUMNS):
        col_data = [batch.column(col).to_pylist() for col in COLUMNS]
        for row in zip(*col_data):
            yield row


def seed_database(
    parquet_path: Path,
    db_url: str,
    truncate: bool = False,
    batch_size: int = 25000,
) -> int:
    """Ingest comparison pairs into PostgreSQL using psycopg COPY."""
    if not parquet_path.is_file():
        raise FileNotFoundError(f"Parquet file not found: {parquet_path}")

    start_time = time.perf_counter()

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            if truncate:
                print("Truncating word_comparisons table...")
                cur.execute("TRUNCATE TABLE word_comparisons RESTART IDENTITY;")

            cols_str = ", ".join(COLUMNS)
            copy_sql = f"COPY word_comparisons ({cols_str}) FROM STDIN"

            print(f"Reading from: {parquet_path}")
            print(f"Streaming rows via COPY protocol...")

            total_rows = 0
            with cur.copy(copy_sql) as copy:
                for row in stream_parquet_rows(parquet_path, batch_size=batch_size):
                    copy.write_row(row)
                    total_rows += 1
                    if total_rows % 50000 == 0:
                        print(f"  Ingested {total_rows:,} rows...")

            conn.commit()

            print(f"Ingestion complete: {total_rows:,} rows written.")
            print("Running ANALYZE word_comparisons to refresh statistics...")
            cur.execute("ANALYZE word_comparisons;")
            conn.commit()

    duration = time.perf_counter() - start_time
    rate = total_rows / duration if duration > 0 else 0
    print(f"Finished in {duration:.2f}s ({rate:,.0f} rows/s).")
    return total_rows


def main() -> None:
    project_root = Path(__file__).resolve().parent.parent
    load_env_file(project_root / ".env")

    default_db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/linduistics",
    )
    default_input = project_root / "pipeline" / "data" / "all_comparisons.parquet"

    parser = argparse.ArgumentParser(description="Bulk seed PostgreSQL word_comparisons table.")
    parser.add_argument(
        "--input",
        type=Path,
        default=default_input,
        help=f"Input Parquet file (default: {default_input})",
    )
    parser.add_argument(
        "--db-url",
        type=str,
        default=default_db_url,
        help="PostgreSQL connection string (defaults to DATABASE_URL or localhost)",
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        default=True,
        help="Truncate table before ingesting (default: True)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=25000,
        help="Parquet batch size (default: 25000)",
    )

    args = parser.parse_args()

    try:
        seed_database(
            parquet_path=args.input,
            db_url=args.db_url,
            truncate=args.truncate,
            batch_size=args.batch_size,
        )
    except Exception as e:
        print(f"Error during seeding: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
