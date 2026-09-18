"""Benchmark suite for Linduistics PostgreSQL database layer.

Executes and benchmarks:
1. 2D Spatial Slider Range Scan (sim_point <@ box) via GiST index
2. Universality Text Inspector Array Scan (word_a = ANY) via B-Tree index
3. Category Filtering Scan (category = 'false_friend') via B-Tree index
4. Trigram Autocomplete Search (word_a ILIKE prefix) via GIN index

Measures execution latency percentiles (min, p50, p95, max) over multiple iterations.
"""

from __future__ import annotations

import argparse
import os
import statistics
import time
from pathlib import Path
from typing import Any, Callable

import psycopg


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


def run_benchmark_trial(
    cur: psycopg.Cursor, query: str, params: tuple | list | None = None, warmup: int = 5, runs: int = 50
) -> list[float]:
    """Execute query with warmup and collect execution times in milliseconds."""
    for _ in range(warmup):
        cur.execute(query, params)
        cur.fetchall()

    latencies_ms: list[float] = []
    for _ in range(runs):
        t0 = time.perf_counter()
        cur.execute(query, params)
        cur.fetchall()
        t1 = time.perf_counter()
        latencies_ms.append((t1 - t0) * 1000.0)

    return latencies_ms


def format_stats(latencies_ms: list[float]) -> dict[str, float]:
    """Compute summary statistics for latencies."""
    sorted_lat = sorted(latencies_ms)
    n = len(sorted_lat)
    p50_idx = int(0.50 * (n - 1))
    p95_idx = int(0.95 * (n - 1))
    p99_idx = int(0.99 * (n - 1))

    return {
        "min": min(latencies_ms),
        "mean": statistics.mean(latencies_ms),
        "p50": sorted_lat[p50_idx],
        "p95": sorted_lat[p95_idx],
        "p99": sorted_lat[p99_idx],
        "max": max(latencies_ms),
    }


def main() -> None:
    project_root = Path(__file__).resolve().parent.parent
    load_env_file(project_root / ".env")

    default_db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/linduistics",
    )

    parser = argparse.ArgumentParser(description="Benchmark Linduistics PostgreSQL queries.")
    parser.add_argument("--db-url", type=str, default=default_db_url, help="Database URL")
    parser.add_argument("--runs", type=int, default=50, help="Number of benchmark iterations")
    args = parser.parse_args()

    benchmarks = [
        (
            "1. 2D Spatial Slider (Cognates: Phon [0.5, 1.0], Sem [0.6, 1.0])",
            """
            SELECT id, word_a, word_b, phonetic_sim, semantic_sim, category
            FROM word_comparisons
            WHERE lang_a = %s AND lang_b = %s
              AND sim_point <@ box(point(%s, %s), point(%s, %s))
            LIMIT 50;
            """,
            ("sv", "en", 0.5, 0.6, 1.0, 1.0),
        ),
        (
            "2. 2D Spatial Slider (False Friends: Phon [0.6, 1.0], Sem [0.0, 0.35])",
            """
            SELECT id, word_a, word_b, phonetic_sim, semantic_sim, category
            FROM word_comparisons
            WHERE lang_a = %s AND lang_b = %s
              AND sim_point <@ box(point(%s, %s), point(%s, %s))
            LIMIT 50;
            """,
            ("sv", "en", 0.6, 0.0, 1.0, 0.35),
        ),
        (
            "3. Universality Inspector (10-word token array lookup)",
            """
            SELECT id, word_a, word_b, phonetic_sim, semantic_sim, category
            FROM word_comparisons
            WHERE lang_a = %s AND word_a = ANY(%s)
            LIMIT 100;
            """,
            ("sv", ["katt", "hund", "bok", "fisk", "hus", "man", "vatten", "sol", "måne", "träd"]),
        ),
        (
            "4. Category Filter (False Friends random sample)",
            """
            SELECT id, word_a, word_b, phonetic_sim, semantic_sim
            FROM word_comparisons
            WHERE lang_a = %s AND lang_b = %s AND category = %s
            LIMIT 50;
            """,
            ("sv", "en", "false_friend"),
        ),
        (
            "5. Trigram Autocomplete Prefix Search",
            """
            SELECT id, word_a, word_b, phonetic_sim, semantic_sim
            FROM word_comparisons
            WHERE lang_a = %s AND word_a ILIKE %s
            LIMIT 20;
            """,
            ("sv", "vat%"),
        ),
    ]

    print("=" * 80)
    print("LINDUISTICS POSTGRESQL BENCHMARK SUITE")
    print(f"Target Database: {args.db_url.split('@')[-1] if '@' in args.db_url else args.db_url}")
    print(f"Iterations per query: {args.runs}")
    print("=" * 80)

    with psycopg.connect(args.db_url) as conn:
        with conn.cursor() as cur:
            # Check row count
            cur.execute("SELECT count(*) FROM word_comparisons;")
            total_rows = cur.fetchone()[0]
            print(f"Total indexed comparisons: {total_rows:,}\n")

            header = f"{'Query Description':<50} | {'p50 (ms)':<9} | {'p95 (ms)':<9} | {'min (ms)':<9} | {'max (ms)':<9}"
            print(header)
            print("-" * len(header))

            for title, query, params in benchmarks:
                latencies = run_benchmark_trial(cur, query, params, warmup=10, runs=args.runs)
                stats = format_stats(latencies)
                row_str = f"{title:<50} | {stats['p50']:<9.3f} | {stats['p95']:<9.3f} | {stats['min']:<9.3f} | {stats['max']:<9.3f}"
                print(row_str)

    print("=" * 80)
    print("Benchmark complete.")


if __name__ == "__main__":
    main()
