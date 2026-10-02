"""Builds and ingests multi-language Proto-Germanic cognate clusters into PostgreSQL."""

from __future__ import annotations

import json
from pathlib import Path
from languages import LANGUAGES
import logging
import sys
from collections import defaultdict
from typing import Dict, List, Set

import pyarrow.parquet as pq
import psycopg

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def build_clusters(lemma_dir: Path = Path("pipeline/data"), comparisons: Path | None = None) -> Dict[str, dict]:
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

    languages = LANGUAGES

    # Step 1: Read all 5 lemma tables
    for lang in languages:
        parquet_path = lemma_dir / f"lemmas_{lang}.parquet"
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
    columns = ['shared_etym_root', 'lang_a', 'word_a', 'ipa_a', 'pos_a', 'def_a',
               'lang_b', 'word_b', 'ipa_b', 'pos_b', 'def_b']
    if comparisons is None:
        conn = psycopg.connect("postgresql://postgres:postgres@localhost:5432/linduistics")
        with conn.cursor() as cur:
            cur.execute("SELECT DISTINCT " + ','.join(columns) + " FROM word_comparisons WHERE shared_etym_root IS NOT NULL AND category IN ('true_cognate','partial_cognate')")
            comparison_rows = cur.fetchall()
        conn.close()
    else:
        comparison_rows = []
        seen = set()
        for batch in pq.ParquetFile(comparisons).iter_batches(columns=columns + ['category']):
            for row in batch.to_pylist():
                record = tuple(row[name] for name in columns)
                if row['shared_etym_root'] and row['category'] in ('true_cognate', 'partial_cognate') and record not in seen:
                    seen.add(record)
                    comparison_rows.append(record)

    for r, la, wa, ipaa, posa, defa, lb, wb, ipab, posb, defb in comparison_rows:
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

    return clusters


def ingest_clusters(clusters: Dict[str, dict]):
    """Ingests aggregated cognate clusters into PostgreSQL."""
    logger.info(f"Ingesting {len(clusters)} cognate clusters into PostgreSQL...")
    conn = psycopg.connect("postgresql://postgres:postgres@localhost:5432/linduistics")
    cur = conn.cursor()
    cur.execute("TRUNCATE TABLE cognate_clusters;")

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
    conn.commit()
    logger.info(f"Successfully ingested {total} cognate clusters ({multi} spanning 3+ languages)!")
    conn.close()


if __name__ == "__main__":
    clusters = build_clusters()
    ingest_clusters(clusters)
