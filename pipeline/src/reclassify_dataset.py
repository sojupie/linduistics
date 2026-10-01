"""Batch reclassification of word comparisons to linguistic micro-categories and core baseline tagging."""

from __future__ import annotations

import os
import sys
import time
from typing import Set, Tuple
import psycopg

from pipeline.src.sense_aligner import classify_pair_senses


def get_connection_string() -> str:
    return os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/linduistics",
    )


def fetch_core_lemmas(conn: psycopg.Connection, max_rank: int = 5000) -> Set[Tuple[str, str]]:
    """Identifies the top N core lemmas per language based on occurrence frequency in the lexicon."""
    print(f"Extracting top {max_rank} core lemmas per language...")
    cur = conn.cursor()
    cur.execute("""
        WITH core_ranked AS (
            SELECT lang_a, word_a,
                   ROW_NUMBER() OVER (PARTITION BY lang_a ORDER BY count(*) DESC) as rank
            FROM word_comparisons
            GROUP BY lang_a, word_a
        )
        SELECT lang_a, word_a
        FROM core_ranked
        WHERE rank <= %s;
    """, (max_rank,))
    core_set = set(cur.fetchall())
    print(f"Loaded {len(core_set)} total core (language, lemma) pairs.")
    return core_set


def reclassify_database(batch_size: int = 50000) -> None:
    conn_str = get_connection_string()
    print(f"Connecting to database: {conn_str.split('@')[-1]}")
    conn = psycopg.connect(conn_str, autocommit=True)
    cur = conn.cursor()

    # Step 1: Ensure is_core column exists and check constraint accommodates new relations
    print("Ensuring is_core column exists on word_comparisons...")
    cur.execute("ALTER TABLE word_comparisons ADD COLUMN IF NOT EXISTS is_core BOOLEAN DEFAULT FALSE;")
    cur.execute("""
        ALTER TABLE word_comparisons 
        DROP CONSTRAINT IF EXISTS word_comparisons_etymological_relation_check;
        ALTER TABLE word_comparisons 
        ADD CONSTRAINT word_comparisons_etymological_relation_check 
        CHECK (etymological_relation IN ('cognate', 'false_cognate', 'unknown', 'borrowed_stratum', 'unrelated', 'independent'));
    """)

    # Step 2: Fetch core lemma set
    core_set = fetch_core_lemmas(conn)

    # Step 3: Create unlogged staging table
    print("Creating temporary unlogged staging table tmp_reclass...")
    cur.execute("DROP TABLE IF EXISTS tmp_reclass;")
    cur.execute("""
        CREATE UNLOGGED TABLE tmp_reclass (
            id BIGINT PRIMARY KEY,
            category VARCHAR(30) NOT NULL,
            etymological_relation VARCHAR(30) NOT NULL,
            is_core BOOLEAN NOT NULL DEFAULT FALSE
        );
    """)

    # Step 4: Stream and classify
    print("Streaming comparison records and classifying into micro-categories...")
    start_time = time.time()
    total_count = 0

    read_conn = psycopg.connect(conn_str)
    with read_conn.cursor(name="reclass_cursor") as read_cur:
        read_cur.itersize = batch_size
        read_cur.execute("""
            SELECT id, word_a, lang_a, etym_root_a, word_b, lang_b, etym_root_b,
                   orthographic_sim, phonetic_sim, semantic_sim, shared_etym_root
            FROM word_comparisons;
        """)

        with cur.copy("COPY tmp_reclass (id, category, etymological_relation, is_core) FROM STDIN") as copy:
            for row in read_cur:
                cid, w_a, l_a, r_a, w_b, l_b, r_b, o_sim, p_sim, s_sim, shared_r = row
                if shared_r and not r_a and not r_b:
                    r_a = shared_r
                    r_b = shared_r

                is_core = (l_a, w_a) in core_set and (l_b, w_b) in core_set

                res = classify_pair_senses(
                    word_a=w_a,
                    lang_a=l_a,
                    senses_a=[],
                    root_a=r_a,
                    word_b=w_b,
                    lang_b=l_b,
                    senses_b=[],
                    root_b=r_b,
                    ortho_sim=o_sim,
                    phono_sim=p_sim,
                    max_semantic_sim=s_sim,
                )

                copy.write_row((cid, res.category, res.etymological_relation, is_core))
                total_count += 1
                if total_count % 200000 == 0:
                    elapsed = time.time() - start_time
                    print(f"  Processed and staged {total_count:,} rows ({elapsed:.1f}s)...")

    read_conn.close()
    stage_time = time.time() - start_time
    print(f"Staged {total_count:,} rows in {stage_time:.2f}s.")

    # Step 5: Drop category indexes before update
    print("Dropping category indexes to accelerate bulk update...")
    cur.execute("DROP INDEX IF EXISTS idx_category;")
    cur.execute("DROP INDEX IF EXISTS idx_etymological_relation;")

    # Step 6: Apply in-place batch update
    print("Executing in-place batch update from staging table...")
    update_start = time.time()
    cur.execute("""
        UPDATE word_comparisons w
        SET category = t.category,
            etymological_relation = t.etymological_relation,
            is_core = t.is_core
        FROM tmp_reclass t
        WHERE w.id = t.id;
    """)
    update_time = time.time() - update_start
    print(f"Update completed in {update_time:.2f}s.")

    # Step 7: Drop staging table
    print("Cleaning up staging table...")
    cur.execute("DROP TABLE tmp_reclass;")

    # Step 8: Recreate indexes
    print("Rebuilding indexes...")
    idx_start = time.time()
    cur.execute("SET maintenance_work_mem = '512MB';")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_category ON word_comparisons (lang_a, lang_b, category);")
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_etymological_relation 
        ON word_comparisons (lang_a, lang_b, etymological_relation) 
        WHERE category IN ('false_friend', 'cognate_false_friend', 'accidental_lookalike');
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_is_core ON word_comparisons (lang_a, lang_b, is_core);")
    cur.execute("ANALYZE word_comparisons;")
    idx_time = time.time() - idx_start
    print(f"Indexes recreated and analyzed in {idx_time:.2f}s.")

    total_time = time.time() - start_time
    print(f"Reclassification complete in {total_time:.2f}s.")


if __name__ == "__main__":
    reclassify_database()
