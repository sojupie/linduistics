import psycopg

with psycopg.connect("postgresql://postgres:postgres@localhost:5432/linduistics") as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM word_comparisons")
        print(f"Total directed rows: {cur.fetchone()[0]:,}")

        cur.execute("""
            SELECT lang_a, lang_b, category,
                   etymological_relation,
                   count(*)
            FROM word_comparisons
            GROUP BY lang_a, lang_b, category, etymological_relation
            ORDER BY lang_a, lang_b, category, etymological_relation;
        """)
        rows = cur.fetchall()
        print(f"{'Pair':10} | {'Category':20} | {'Etymological relation':22} | {'Count':8}")
        print("-" * 68)
        for r in rows:
            pair = f"{r[0]} -> {r[1]}"
            print(f"{pair:10} | {r[2]:20} | {r[3]:20} | {r[4]:8,}")

        cur.execute("""
            SELECT etymological_relation,
                   CASE WHEN semantic_sim >= 0.75 THEN 'high'
                        WHEN semantic_sim > 0.30 THEN 'middle'
                        ELSE 'low' END,
                   count(*)
            FROM word_comparisons
            WHERE category = 'other'
            GROUP BY 1, 2
            ORDER BY 1, 2;
        """)
        print("\nOther category by origin and semantic score:")
        for relation, semantic_band, count in cur.fetchall():
            print(f"  {relation:15} {semantic_band:8} {count:,}")

        cur.execute("""
            SELECT
                count(*) FILTER (WHERE etymological_relation NOT IN ('cognate', 'false_cognate', 'unknown')),
                count(*) FILTER (
                    WHERE (etymological_relation = 'cognate' AND shared_etym_root IS NULL)
                       OR (etymological_relation = 'false_cognate' AND (etym_root_a IS NULL OR etym_root_b IS NULL))
                       OR (etymological_relation <> 'cognate' AND shared_etym_root IS NOT NULL)
                ),
                (SELECT count(*) FROM word_comparisons a
                 LEFT JOIN word_comparisons b
                   ON b.lang_a = a.lang_b AND b.lang_b = a.lang_a
                  AND b.word_a = a.word_b AND b.word_b = a.word_a
                 WHERE b.id IS NULL OR a.category <> b.category
                    OR a.etymological_relation <> b.etymological_relation
                    OR a.orthographic_sim <> b.orthographic_sim
                    OR a.phonetic_sim <> b.phonetic_sim
                    OR a.semantic_sim <> b.semantic_sim
                    OR a.etym_root_a IS DISTINCT FROM b.etym_root_b
                    OR a.etym_root_b IS DISTINCT FROM b.etym_root_a)
            FROM word_comparisons;
        """)
        invalid_relations, invalid_roots, asymmetric_pairs = cur.fetchone()
        print("\nInvariant failures:")
        print(f"  invalid relation values: {invalid_relations:,}")
        print(f"  relation/root mismatches: {invalid_roots:,}")
        print(f"  asymmetric/missing reverse pairs: {asymmetric_pairs:,}")
        if invalid_relations or invalid_roots or asymmetric_pairs:
            raise SystemExit("Database taxonomy invariants failed.")
