"""Measure how source claims reach active comparison candidates."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path


def audit_coverage(source_records: Path, comparisons: Path) -> dict[str, dict]:
    import pyarrow.parquet as pq

    active_candidates: dict[tuple[str, str, str, str], set[tuple[tuple, bool]]] = defaultdict(set)
    candidate_meta = {}
    table = pq.read_table(comparisons, columns=["lang_a", "lang_b", "word_a", "word_b", "category", "senses_a", "senses_b"])
    for row in table.to_pylist():
        candidate = tuple(sorted(((row["lang_a"], row["word_a"]), (row["lang_b"], row["word_b"]))))
        pair = tuple(sorted((row["lang_a"], row["lang_b"])))
        candidate_meta[candidate] = (pair, row["category"])
        sense_a = next((sense for sense in json.loads(row["senses_a"]) if sense.get("is_active_match")), {})
        sense_b = next((sense for sense in json.loads(row["senses_b"]) if sense.get("is_active_match")), {})
        for source, target, source_lang, target_lang, target_word in (
            (sense_a, sense_b, row["lang_a"], row["lang_b"], row["word_b"]),
            (sense_b, sense_a, row["lang_b"], row["lang_a"], row["word_a"]),
        ):
            if not source.get("source_entry_key") or not source.get("source_sense_id") or source.get("source_identity_ambiguous"):
                continue
            target_identity_known = bool(
                target.get("source_entry_key")
                and target.get("source_sense_id")
                and not target.get("source_identity_ambiguous")
            )
            key = (source_lang, source["source_entry_key"], target_lang, target_word.casefold())
            active_candidates[key].add((candidate, target_identity_known))

    cognate_claims: dict[tuple[str, str], set[tuple[str, int | None, str, str]]] = defaultdict(set)
    relations_by_candidate: dict[tuple, set[str]] = defaultdict(set)
    with source_records.open(encoding="utf-8") as source:
        for line in source:
            record = json.loads(line)
            source_lang = record.get("language_code")
            entry_key = record.get("source_entry_key")
            for claim in record.get("claims", []):
                target_lang = claim.get("related_language")
                form = claim.get("related_form")
                relation = claim.get("relation")
                if not source_lang or not target_lang or source_lang == target_lang or not entry_key or not isinstance(form, str) or not form:
                    continue
                form_key = form.casefold()
                candidate_key = (source_lang, entry_key, target_lang, form_key)
                for candidate, _ in active_candidates.get(candidate_key, ()):
                    if relation:
                        relations_by_candidate[candidate].add(relation)
                if relation == "cognate_mention":
                    cognate_claims[(source_lang, target_lang)].add((
                        entry_key, claim.get("template_index"), target_lang, form_key
                    ))

    cognate_counts = defaultdict(lambda: {
        "source_claims": 0,
        "active_source_entry_candidates": 0,
        "both_active_sense_ids": 0,
    })
    for (source_lang, target_lang), claims in cognate_claims.items():
        for entry_key, _, related_lang, form in claims:
            values = cognate_counts[(source_lang, target_lang)]
            values["source_claims"] += 1
            candidate_key = (source_lang, entry_key, related_lang, form)
            matches = active_candidates.get(candidate_key, set())
            if matches:
                values["active_source_entry_candidates"] += 1
                if any(target_known for _, target_known in matches):
                    values["both_active_sense_ids"] += 1

    other_candidates = defaultdict(lambda: {
        "candidate_count": 0,
        "with_pair_specific_claim": 0,
        "relations": defaultdict(int),
    })
    for candidate, (pair, category) in candidate_meta.items():
        if category != "other":
            continue
        summary = other_candidates[pair]
        summary["candidate_count"] += 1
        relations = relations_by_candidate.get(candidate, set())
        if relations:
            summary["with_pair_specific_claim"] += 1
            for relation in relations:
                summary["relations"][relation] += 1

    return {"cognate_mentions": dict(cognate_counts), "other_candidates": dict(other_candidates)}


def main() -> None:
    project_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-records", type=Path, default=project_root / "pipeline/data/etymology_records.jsonl")
    parser.add_argument("--comparisons", type=Path, default=project_root / "pipeline/data/all_comparisons.parquet")
    args = parser.parse_args()
    result = audit_coverage(args.source_records, args.comparisons)
    pairs = (("sv", "da"), ("sv", "nb"), ("de", "en"))
    print("Pair | source cognate claims | active source-entry candidates | both active sense IDs")
    for source_lang, target_lang in pairs:
        forward = result["cognate_mentions"].get((source_lang, target_lang), {})
        reverse = result["cognate_mentions"].get((target_lang, source_lang), {})
        print(
            f"{source_lang}-{target_lang} | "
            f"{forward.get('source_claims', 0) + reverse.get('source_claims', 0)} | "
            f"{forward.get('active_source_entry_candidates', 0) + reverse.get('active_source_entry_candidates', 0)} | "
            f"{forward.get('both_active_sense_ids', 0) + reverse.get('both_active_sense_ids', 0)}"
        )
    print("\nPair | other candidates | with pair-specific active-entry claim | direct claim types (overlap)")
    for source_lang, target_lang in pairs:
        summary = result["other_candidates"].get(tuple(sorted((source_lang, target_lang))), {})
        print(
            f"{source_lang}-{target_lang} | {summary.get('candidate_count', 0)} | "
            f"{summary.get('with_pair_specific_claim', 0)} | {dict(summary.get('relations', {}))}"
        )


if __name__ == "__main__":
    main()
