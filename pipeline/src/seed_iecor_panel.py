"""Seed the additive IE-CoR meaning panel into its own PostgreSQL tables."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from collections import defaultdict
from pathlib import Path
from typing import Any

import psycopg


REFERENCE_DATASET = "IE-CoR"
REFERENCE_VERSION = "1.1"


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as stream:
        return [json.loads(line) for line in stream if line.strip()]


def build_table_rows(
    crosswalk_rows: list[dict[str, Any]], pair_rows: list[dict[str, Any]]
) -> tuple[list[tuple], list[tuple], list[tuple], list[tuple]]:
    concepts: dict[str, tuple] = {}
    forms: dict[str, dict[str, Any]] = {}
    sense_links: dict[tuple[str, str], tuple] = {}

    for row in crosswalk_rows:
        concept_id = row["concept_id"]
        concepts[concept_id] = (
            REFERENCE_DATASET, REFERENCE_VERSION, concept_id,
            row["concepticon_id"], row["concept"], row["concepticon_definition"],
        )
        form_id = row["reference_form_id"]
        form = forms.setdefault(form_id, {
            "concept_id": concept_id,
            "language_code": row["language_code"],
            "reference_form": row["reference_form"],
            "segments": row["reference_segments"],
            "cognate_set_ids": set(),
            "local_match_status": row["entry_match_status"],
            "local_words": set(),
            "source_urls": set(),
        })
        form["cognate_set_ids"].update(row["reference_cognatesets"])
        if row["local_word"]:
            form["local_words"].add(row["local_word"])
        if row["local_source_url"]:
            form["source_urls"].add(row["local_source_url"])
        sense_id = row["local_source_sense_id"]
        if sense_id:
            fingerprint_fields = [
                form_id, row["language_code"], row["local_word"],
                row["local_source_entry_key"], sense_id, row["local_sense_gloss"],
                row["local_sense_tags"], row["local_etymology_root"],
            ]
            fingerprint = hashlib.sha256(json.dumps(
                fingerprint_fields, ensure_ascii=False, separators=(",", ":")
            ).encode("utf-8")).hexdigest()
            sense_links[(form_id, fingerprint)] = (
                REFERENCE_DATASET, REFERENCE_VERSION, form_id, fingerprint, sense_id,
                row["local_source_entry_key"], row["local_word"], row["language_code"],
                row["local_source_url"], row["sense_review_status"],
            )

    form_rows = [(
        REFERENCE_DATASET, REFERENCE_VERSION, form_id, row["concept_id"],
        row["language_code"], row["reference_form"], row["segments"],
        sorted(row["cognate_set_ids"]), row["local_match_status"],
        sorted(row["local_words"]), sorted(row["source_urls"]),
    ) for form_id, row in sorted(forms.items())]
    pair_db_rows = [(
        REFERENCE_DATASET, REFERENCE_VERSION, row["concept_id"],
        row["source_language"], row["target_language"], row["reference_relation"],
        row["shared_cognate_set_ids"], row["unassigned_form_ids"],
    ) for row in pair_rows]
    return list(concepts.values()), form_rows, list(sense_links.values()), pair_db_rows


def seed_panel(
    db_url: str, crosswalk_path: Path, pair_path: Path, replace: bool = False
) -> dict[str, int]:
    concepts, forms, sense_links, pairs = build_table_rows(
        read_jsonl(crosswalk_path), read_jsonl(pair_path)
    )
    with psycopg.connect(db_url) as conn:
        with conn.transaction():
            with conn.cursor() as cursor:
                if replace:
                    for table in (
                        "iecor_meaning_pairs", "iecor_local_sense_links",
                        "iecor_reference_forms", "iecor_reference_concepts",
                    ):
                        cursor.execute(
                            f"DELETE FROM {table} WHERE reference_dataset = %s AND reference_version = %s",
                            (REFERENCE_DATASET, REFERENCE_VERSION),
                        )
                cursor.executemany(
                    "INSERT INTO iecor_reference_concepts VALUES (%s,%s,%s,%s,%s,%s)", concepts
                )
                cursor.executemany(
                    "INSERT INTO iecor_reference_forms VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", forms
                )
                cursor.executemany(
                    "INSERT INTO iecor_local_sense_links VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", sense_links
                )
                cursor.executemany(
                    "INSERT INTO iecor_meaning_pairs VALUES (%s,%s,%s,%s,%s,%s,%s,%s)", pairs
                )
    return {
        "concepts": len(concepts),
        "forms": len(forms),
        "local_sense_links": len(sense_links),
        "meaning_pairs": len(pairs),
    }


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db-url", default=os.environ.get(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/linduistics"
    ))
    parser.add_argument("--crosswalk", type=Path, default=root / "pipeline/data/iecor_local_sense_crosswalk_v1.1.jsonl")
    parser.add_argument("--pairs", type=Path, default=root / "pipeline/data/iecor_local_sense_crosswalk_v1.1_pairs.jsonl")
    parser.add_argument("--replace", action="store_true", help="Replace this IE-CoR version in the four IE-CoR tables")
    args = parser.parse_args()
    print(json.dumps(seed_panel(args.db_url, args.crosswalk, args.pairs, args.replace), indent=2))


if __name__ == "__main__":
    main()
