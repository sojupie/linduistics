import psycopg

with psycopg.connect("postgresql://postgres:postgres@localhost:5432/linduistics") as conn:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT lang_a, lang_b, count(*), 
                   count(*) FILTER (WHERE category = 'true_cognate') as cognates,
                   count(*) FILTER (WHERE category = 'false_friend') as false_friends,
                   count(*) FILTER (WHERE category = 'partial_cognate') as partial_cognates,
                   count(*) FILTER (WHERE category = 'translation_pair') as trans_pairs
            FROM word_comparisons
            GROUP BY lang_a, lang_b
            ORDER BY lang_a, lang_b;
        """)
        rows = cur.fetchall()
        print(f"{'Pair':10} | {'Total':8} | {'Cognates':8} | {'FF':6} | {'Partial':7} | {'Translations':12}")
        print("-" * 65)
        for r in rows:
            pair = f"{r[0]} -> {r[1]}"
            print(f"{pair:10} | {r[2]:8,} | {r[3]:8,} | {r[4]:6,} | {r[5]:7,} | {r[6]:12,}")
