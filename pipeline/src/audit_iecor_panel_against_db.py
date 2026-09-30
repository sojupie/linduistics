"""Compare the IE-CoR meaning panel with the live word_comparisons table."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import psycopg


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as stream:
        return [json.loads(line) for line in stream if line.strip()]


def read_primary_senses(crosswalk_rows: list[dict[str, Any]]) -> dict[tuple[str, str], dict[str, str]]:
    return {
        (row["concept_id"], row["language_code"]): {
            "word": row["local_word"],
            "sense_id": row["local_source_sense_id"],
            "gloss": row["local_sense_gloss"],
        }
        for row in crosswalk_rows
        if row["sense_review_status"] == "selected_primary" and row["local_source_sense_id"]
    }


def sense_alignment_status(
    comparison_rows: int, both_senses_present: bool, both_senses_active: bool
) -> str:
    if comparison_rows == 0:
        return "no_word_pair_row"
    if not both_senses_present:
        return "sense_not_in_comparison"
    if not both_senses_active:
        return "sense_pair_not_active"
    return "sense_pair_active"


def audit_panel(
    db_url: str,
    crosswalk_path: Path,
    pair_path: Path,
    output_path: Path,
) -> dict[str, Any]:
    input_pair_path = pair_path
    crosswalk = read_jsonl(crosswalk_path)
    panel = read_jsonl(pair_path)
    forms = sorted({
        (row["concept_id"], row["language_code"], row["local_word"])
        for row in crosswalk if row["local_word"]
    })
    panel_input = [{
        "concept_id": row["concept_id"],
        "source_language": row["source_language"],
        "target_language": row["target_language"],
        "reference_relation": row["reference_relation"],
        "shared_cognate_set_ids": row["shared_cognate_set_ids"],
    } for row in panel]
    form_input = [
        {"concept_id": concept, "language_code": language, "word": word}
        for concept, language, word in forms
    ]

    pair_query = """
        WITH panel AS (
            SELECT * FROM jsonb_to_recordset(%s::jsonb) AS x(
                concept_id text, source_language text, target_language text,
                reference_relation text, shared_cognate_set_ids jsonb
            )
        ), forms AS (
            SELECT * FROM jsonb_to_recordset(%s::jsonb) AS x(
                concept_id text, language_code text, word text
            )
        ), candidates AS (
            SELECT p.*, source.word AS source_word, target.word AS target_word,
                   comparison.id, comparison.category, comparison.etymological_relation
            FROM panel p
            LEFT JOIN forms source
              ON source.concept_id = p.concept_id
             AND source.language_code = p.source_language
            LEFT JOIN forms target
              ON target.concept_id = p.concept_id
             AND target.language_code = p.target_language
            LEFT JOIN word_comparisons comparison
              ON comparison.lang_a = LEAST(p.source_language, p.target_language)
             AND comparison.lang_b = GREATEST(p.source_language, p.target_language)
             AND (
                    (p.source_language = comparison.lang_a
                     AND comparison.word_a = source.word
                     AND comparison.word_b = target.word)
                 OR (p.source_language = comparison.lang_b
                     AND comparison.word_a = target.word
                     AND comparison.word_b = source.word)
             )
        )
        SELECT concept_id, source_language, target_language, reference_relation,
               shared_cognate_set_ids, count(DISTINCT source_word),
               count(DISTINCT target_word), count(DISTINCT id),
               coalesce(array_agg(DISTINCT category) FILTER (WHERE category IS NOT NULL), ARRAY[]::varchar[]),
               coalesce(array_agg(DISTINCT etymological_relation)
                        FILTER (WHERE etymological_relation IS NOT NULL), ARRAY[]::varchar[])
        FROM candidates
        GROUP BY concept_id, source_language, target_language, reference_relation,
                 shared_cognate_set_ids
        ORDER BY concept_id, source_language, target_language
    """

    primary = read_primary_senses(crosswalk)
    sense_input = []
    for row in panel:
        left = primary.get((row["concept_id"], row["source_language"]))
        right = primary.get((row["concept_id"], row["target_language"]))
        if not left or not right:
            continue
        sense_input.append({
            "concept_id": row["concept_id"],
            "concept": row["concept"],
            "source_language": row["source_language"],
            "target_language": row["target_language"],
            "source_word": left["word"],
            "target_word": right["word"],
            "source_sense_id": left["sense_id"],
            "target_sense_id": right["sense_id"],
            "source_gloss": left["gloss"],
            "target_gloss": right["gloss"],
            "reference_relation": row["reference_relation"],
        })
    sense_query = """
        WITH expected AS (
            SELECT * FROM jsonb_to_recordset(%s::jsonb) AS x(
                concept_id text, concept text, source_language text, target_language text,
                source_word text, target_word text, source_sense_id text,
                target_sense_id text, source_gloss text, target_gloss text,
                reference_relation text
            )
        ), matched AS (
            SELECT expected.*, comparison.id, comparison.category,
                   comparison.etymological_relation,
                   CASE WHEN expected.source_language = comparison.lang_a
                        THEN comparison.senses_a ELSE comparison.senses_b END AS source_senses,
                   CASE WHEN expected.source_language = comparison.lang_a
                        THEN comparison.senses_b ELSE comparison.senses_a END AS target_senses
            FROM expected
            LEFT JOIN word_comparisons comparison
              ON comparison.lang_a = LEAST(expected.source_language, expected.target_language)
             AND comparison.lang_b = GREATEST(expected.source_language, expected.target_language)
             AND (
                    (expected.source_language = comparison.lang_a
                     AND comparison.word_a = expected.source_word
                     AND comparison.word_b = expected.target_word)
                 OR (expected.source_language = comparison.lang_b
                     AND comparison.word_a = expected.target_word
                     AND comparison.word_b = expected.source_word)
             )
        )
        SELECT concept_id, concept, source_language, target_language,
               reference_relation, count(DISTINCT id),
               coalesce(bool_or(source_senses @> jsonb_build_array(
                   jsonb_build_object('source_sense_id', source_sense_id, 'gloss', source_gloss))), false),
               coalesce(bool_or(target_senses @> jsonb_build_array(
                   jsonb_build_object('source_sense_id', target_sense_id, 'gloss', target_gloss))), false),
               coalesce(bool_or(
                   source_senses @> jsonb_build_array(jsonb_build_object(
                       'source_sense_id', source_sense_id, 'gloss', source_gloss, 'is_active_match', true))
                   AND target_senses @> jsonb_build_array(jsonb_build_object(
                       'source_sense_id', target_sense_id, 'gloss', target_gloss, 'is_active_match', true))), false),
               coalesce(array_agg(DISTINCT category) FILTER (WHERE category IS NOT NULL), ARRAY[]::varchar[]),
               coalesce(array_agg(DISTINCT etymological_relation)
                        FILTER (WHERE etymological_relation IS NOT NULL), ARRAY[]::varchar[])
        FROM matched
        GROUP BY concept_id, concept, source_language, target_language, reference_relation
        ORDER BY concept, source_language, target_language
    """

    with psycopg.connect(db_url) as conn:
        with conn.transaction():
            conn.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
            database_categories = dict(conn.execute(
                "SELECT category, count(*) FROM word_comparisons GROUP BY category ORDER BY category"
            ).fetchall())
            database_relations = dict(conn.execute(
                "SELECT etymological_relation, count(*) FROM word_comparisons "
                "GROUP BY etymological_relation ORDER BY etymological_relation"
            ).fetchall())
            unique_categories = dict(conn.execute(
                "SELECT category, count(*) FROM word_comparisons WHERE lang_a < lang_b "
                "GROUP BY category ORDER BY category"
            ).fetchall())
            unique_relations = dict(conn.execute(
                "SELECT etymological_relation, count(*) FROM word_comparisons WHERE lang_a < lang_b "
                "GROUP BY etymological_relation ORDER BY etymological_relation"
            ).fetchall())
            database_total = conn.execute("SELECT count(*) FROM word_comparisons").fetchone()[0]
            reverse_audit = conn.execute("""
                SELECT count(*),
                       count(*) FILTER (WHERE reverse.id IS NULL),
                       count(*) FILTER (WHERE reverse.id IS NOT NULL AND
                           (reverse.category, reverse.etymological_relation) IS DISTINCT FROM
                           (forward.category, forward.etymological_relation))
                FROM word_comparisons forward
                LEFT JOIN word_comparisons reverse
                  ON reverse.lang_a = forward.lang_b AND reverse.word_a = forward.word_b
                 AND reverse.lang_b = forward.lang_a AND reverse.word_b = forward.word_a
                WHERE forward.lang_a < forward.lang_b
            """).fetchone()
            pair_rows = conn.execute(
                pair_query, (json.dumps(panel_input), json.dumps(form_input))
            ).fetchall()
            sense_rows = conn.execute(
                sense_query, (json.dumps(sense_input),)
            ).fetchall()

    pair_output = []
    pair_summary = Counter()
    category_presence = Counter()
    relation_presence = Counter()
    by_reference_relation: dict[str, Counter[str]] = {}
    for (concept_id, source_language, target_language, reference_relation,
         shared_ids, source_word_count, target_word_count, db_row_count, categories, relations) in pair_rows:
        pair_summary["meaning_language_pairs"] += 1
        if source_word_count and target_word_count:
            pair_summary["both_languages_have_exact_local_forms"] += 1
        if db_row_count:
            pair_summary["with_exact_word_pair_in_db"] += 1
        pair_summary["matched_db_word_pair_rows"] += db_row_count
        category_presence.update(categories)
        relation_presence.update(relations)
        reference_counts = by_reference_relation.setdefault(reference_relation, Counter())
        reference_counts["pairs"] += 1
        if db_row_count:
            reference_counts["pairs_with_db_rows"] += 1
        reference_counts.update(f"category:{category}" for category in categories)
        reference_counts.update(f"relation:{relation}" for relation in relations)
        pair_output.append({
            "concept_id": concept_id,
            "source_language": source_language,
            "target_language": target_language,
            "reference_relation": reference_relation,
            "shared_cognate_set_ids": shared_ids,
            "source_exact_form_count": source_word_count,
            "target_exact_form_count": target_word_count,
            "db_word_pair_rows": db_row_count,
            "db_categories": categories,
            "db_etymological_relations": relations,
        })

    sense_output = []
    sense_summary = Counter()
    active_categories = Counter()
    active_relations = Counter()
    for (concept_id, concept, source_language, target_language, reference_relation,
         db_row_count, source_present, target_present, both_active, categories, relations) in sense_rows:
        both_present = source_present and target_present
        status = sense_alignment_status(db_row_count, both_present, both_active)
        sense_summary["selected_sense_pairs"] += 1
        sense_summary[status] += 1
        if status == "sense_pair_active":
            active_categories.update(categories)
            active_relations.update(relations)
        sense_output.append({
            "concept_id": concept_id,
            "concept": concept,
            "source_language": source_language,
            "target_language": target_language,
            "reference_relation": reference_relation,
            "db_word_pair_rows": db_row_count,
            "source_sense_present": source_present,
            "target_sense_present": target_present,
            "both_senses_active": both_active,
            "alignment_status": status,
            "db_categories": categories,
            "db_etymological_relations": relations,
        })

    output_path.parent.mkdir(parents=True, exist_ok=True)
    pair_path = output_path.with_name(f"{output_path.stem}_pairs.jsonl")
    sense_path = output_path.with_name(f"{output_path.stem}_reviewed_senses.jsonl")
    pair_path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in pair_output), encoding="utf-8")
    sense_path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in sense_output), encoding="utf-8")
    output_path.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "database_rows": database_total,
        "database_unique_unordered_word_pairs": reverse_audit[0],
        "reverse_direction_check": {
            "canonical_rows": reverse_audit[0],
            "missing_reverse_rows": reverse_audit[1],
            "category_or_relation_mismatches": reverse_audit[2],
        },
        "database_categories": database_categories,
        "database_etymological_relations": database_relations,
        "database_unique_unordered_categories": unique_categories,
        "database_unique_unordered_etymological_relations": unique_relations,
        "panel": dict(pair_summary),
        "panel_category_presence_by_pair": dict(category_presence),
        "panel_etymological_relation_presence_by_pair": dict(relation_presence),
        "panel_presence_by_iecor_relation": {
            relation: dict(counts) for relation, counts in by_reference_relation.items()
        },
        "reviewed_sense_panel": {
            **dict(sense_summary),
            "active_pair_categories": dict(active_categories),
            "active_pair_etymological_relations": dict(active_relations),
        },
        "inputs": {
            str(path): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in (crosswalk_path, input_pair_path)
        },
        "outputs": {
            path.name: hashlib.sha256(path.read_bytes()).hexdigest()
            for path in (pair_path, sense_path)
        },
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return json.loads(output_path.read_text(encoding="utf-8"))


def main() -> None:
    project_root = Path(__file__).resolve().parents[2]
    crosswalk_path = project_root / "pipeline/data/iecor_local_sense_crosswalk_v1.1.jsonl"
    pair_path = project_root / "pipeline/data/iecor_local_sense_crosswalk_v1.1_pairs.jsonl"
    output_path = project_root / "pipeline/data/iecor_panel_db_audit_v1.1.json"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db-url", default=os.environ.get(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/linduistics"
    ))
    parser.add_argument("--crosswalk", type=Path, default=crosswalk_path)
    parser.add_argument("--pairs", type=Path, default=pair_path)
    parser.add_argument("--output", type=Path, default=output_path)
    args = parser.parse_args()
    print(json.dumps(audit_panel(args.db_url, args.crosswalk, args.pairs, args.output), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
