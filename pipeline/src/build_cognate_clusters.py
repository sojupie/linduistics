"""Builds and ingests multi-language Proto-Germanic cognate clusters into PostgreSQL."""

from __future__ import annotations

import json
import logging
import sys
from collections import defaultdict
from typing import Dict, List, Set

import pyarrow.parquet as pq
import psycopg

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def build_clusters() -> Dict[str, dict]:
    """Aggregates cross-linguistic cognate cliques under ancestral Proto-Germanic roots."""
    clusters: Dict[str, dict] = defaultdict(
        lambda: {"proto": "", "members": [], "langs": set(), "sample_gloss": ""}
    )

    proto_prefixes = [
        "Proto-Germanic",
        "Proto-West Germanic",
        "Proto-Norse",
        "Proto-Indo-European",
    ]

    languages = ["en", "de", "sv", "da", "nb"]

    # Step 1: Read all 5 lemma tables
    for lang in languages:
        parquet_path = f"pipeline/data/lemmas_{lang}.parquet"
        logger.info(f"Reading lemmas for {lang} from {parquet_path}...")
        tbl = pq.read_table(parquet_path)
        words = tbl.column("word").to_pylist()
        ipas = tbl.column("ipa").to_pylist()
        poses = tbl.column("pos").to_pylist()
        glosses = tbl.column("glosses").to_pylist()
        roots = tbl.column("etym_root").to_pylist()
        etyms = tbl.column("etym_text").to_pylist()

        for w, ipa, pos, gl, r, et in zip(words, ipas, poses, glosses, roots, etyms):
            if not r:
                continue
            r_clean = r.strip()
            matched_proto = None
            for p in proto_prefixes:
                if p in r_clean:
                    matched_proto = p
                    break
            if not matched_proto:
                continue

            c = clusters[r_clean]
            c["proto"] = matched_proto
            if not any(m["lang"] == lang and m["word"].lower() == w.lower() for m in c["members"]):
                primary_gloss = gl[0] if gl and len(gl) > 0 else ""
                c["members"].append({
                    "lang": lang,
                    "word": w,
                    "ipa": ipa or "",
                    "pos": pos or "",
                    "gloss": primary_gloss,
                    "etym_text": (et or "")[:350],
                })
                c["langs"].add(lang)
                if not c["sample_gloss"] and primary_gloss:
                    c["sample_gloss"] = primary_gloss

    # Step 2: Cross-reference word_comparisons
    logger.info("Cross-referencing verified word_comparisons in PostgreSQL...")
    conn = psycopg.connect("postgresql://postgres:postgres@localhost:5432/linduistics")
    cur = conn.cursor()
    cur.execute("""
        SELECT DISTINCT etym_root, lang_a, word_a, ipa_a, pos_a, def_a, lang_b, word_b, ipa_b, pos_b, def_b
        FROM word_comparisons
        WHERE etym_root IS NOT NULL AND category IN ('true_cognate', 'partial_cognate');
    """)

    for r, la, wa, ipaa, posa, defa, lb, wb, ipab, posb, defb in cur.fetchall():
        if not r:
            continue
        r_clean = r.strip()
        matched_proto = None
        for p in proto_prefixes:
            if p in r_clean:
                matched_proto = p
                break
        if not matched_proto:
            continue

        c = clusters[r_clean]
        c["proto"] = matched_proto
        if not any(m["lang"] == la and m["word"].lower() == wa.lower() for m in c["members"]):
            c["members"].append({
                "lang": la,
                "word": wa,
                "ipa": ipaa or "",
                "pos": posa or "",
                "gloss": defa or "",
                "etym_text": "",
            })
            c["langs"].add(la)
            if not c["sample_gloss"] and defa:
                c["sample_gloss"] = defa

        if not any(m["lang"] == lb and m["word"].lower() == wb.lower() for m in c["members"]):
            c["members"].append({
                "lang": lb,
                "word": wb,
                "ipa": ipab or "",
                "pos": posb or "",
                "gloss": defb or "",
                "etym_text": "",
            })
            c["langs"].add(lb)
            if not c["sample_gloss"] and defb:
                c["sample_gloss"] = defb

    conn.close()
    return clusters


def ingest_clusters(clusters: Dict[str, dict]):
    """Ingests aggregated cognate clusters into PostgreSQL."""
    logger.info(f"Ingesting {len(clusters)} cognate clusters into PostgreSQL...")
    conn = psycopg.connect("postgresql://postgres:postgres@localhost:5432/linduistics", autocommit=True)
    cur = conn.cursor()

    insert_query = """
        INSERT INTO cognate_clusters (
            root, proto_language, language_count, languages, members, sample_gloss
        ) VALUES (
            %s, %s, %s, %s, %s, %s
        ) ON CONFLICT (root) DO UPDATE SET
            proto_language = EXCLUDED.proto_language,
            language_count = EXCLUDED.language_count,
            languages = EXCLUDED.languages,
            members = EXCLUDED.members,
            sample_gloss = EXCLUDED.sample_gloss;
    """

    batch = []
    for root, data in clusters.items():
        langs = sorted(list(data["langs"]))
        if not langs:
            continue
        members = sorted(data["members"], key=lambda m: (m["lang"], m["word"]))
        batch.append((
            root[:255],
            data["proto"],
            len(langs),
            langs,
            json.dumps(members),
            data["sample_gloss"][:500] if data["sample_gloss"] else None,
        ))

        if len(batch) >= 1000:
            cur.executemany(insert_query, batch)
            batch = []

    if batch:
        cur.executemany(insert_query, batch)

    cur.execute("SELECT COUNT(*), COUNT(*) FILTER (WHERE language_count >= 3) FROM cognate_clusters;")
    total, multi = cur.fetchone()
    logger.info(f"Successfully ingested {total} cognate clusters ({multi} spanning 3+ languages)!")
    conn.close()


if __name__ == "__main__":
    clusters = build_clusters()
    ingest_clusters(clusters)
