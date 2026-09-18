"""Bulk seeder for the word_forms inflection mapping table.

Streams inflection-to-lemma rows from Parquet into PostgreSQL using psycopg COPY.
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


COLUMNS = ["lang", "form", "lemma"]


def stream_forms_rows(parquet_path: Path, batch_size: int = 50000) -> Iterator[tuple]:
    pf = pq.ParquetFile(parquet_path)
    for batch in pf.iter_batches(batch_size=batch_size, columns=COLUMNS):
        col_data = [batch.column(col).to_pylist() for col in COLUMNS]
        for row in zip(*col_data):
            yield row


def seed_forms(
    parquet_path: Path,
    db_url: str,
    truncate: bool = False,
    batch_size: int = 50000,
) -> int:
    if not parquet_path.is_file():
        raise FileNotFoundError(f"Parquet file not found: {parquet_path}")

    start_time = time.perf_counter()

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            if truncate:
                print("Truncating word_forms table...")
                cur.execute("TRUNCATE TABLE word_forms;")
                conn.commit()

            copy_sql = "COPY word_forms (lang, form, lemma) FROM STDIN"
            print(f"Reading from: {parquet_path}")
            print("Streaming rows via COPY protocol...")

            total_rows = 0
            with cur.copy(copy_sql) as copy:
                for row in stream_forms_rows(parquet_path, batch_size=batch_size):
                    copy.write_row(row)
                    total_rows += 1
                    if total_rows % 100000 == 0:
                        print(f"  Ingested {total_rows:,} rows...")

            conn.commit()
            print(f"Ingestion complete: {total_rows:,} rows written.")
            print("Running ANALYZE word_forms...")
            cur.execute("ANALYZE word_forms;")
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
    default_input = project_root / "pipeline" / "data" / "word_forms_sv.parquet"

    parser = argparse.ArgumentParser(description="Bulk seed word_forms table.")
    parser.add_argument("--input", type=Path, default=default_input, help="Input Parquet file")
    parser.add_argument("--db-url", type=str, default=default_db_url, help="Database URL")
    parser.add_argument("--truncate", action="store_true", help="Truncate table before ingesting")
    args = parser.parse_args()

    try:
        seed_forms(parquet_path=args.input, db_url=args.db_url, truncate=args.truncate)
    except Exception as e:
        print(f"Error during seeding: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
