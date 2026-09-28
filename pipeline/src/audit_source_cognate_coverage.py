"""Measure how source claims reach active comparison candidates."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


AUDIT_LANGUAGES = ("da", "de", "en", "nb", "sv")
AUDIT_LANGUAGE_PAIRS = {
    frozenset((lang_a, lang_b))
    for index, lang_a in enumerate(AUDIT_LANGUAGES)
    for lang_b in AUDIT_LANGUAGES[index + 1 :]
}


def audit_coverage(
    source_records: Path,
    comparisons: Path,
    matches_output: Path | None = None,
    force: bool = False,
) -> dict[str, dict]:
    import pyarrow.parquet as pq

    manifest_path = matches_output.with_suffix(matches_output.suffix + ".manifest.json") if matches_output else None
    if matches_output and not force and (matches_output.exists() or manifest_path.exists()):
        raise FileExistsError(f"Output already exists; pass --force to replace it: {matches_output}")

    active_candidates: dict[tuple[str, str, str, str], set[tuple]] = defaultdict(set)
    candidate_meta = {}
    columns = ["lang_a", "lang_b", "word_a", "word_b", "category", "senses_a", "senses_b"]
    for batch in pq.ParquetFile(comparisons).iter_batches(columns=columns):
        for row in batch.to_pylist():
            pair = frozenset((row["lang_a"], row["lang_b"]))
            if pair not in AUDIT_LANGUAGE_PAIRS:
                continue
            candidate = tuple(sorted(((row["lang_a"], row["word_a"]), (row["lang_b"], row["word_b"]))))
            candidate_meta[candidate] = (tuple(sorted(pair)), row["category"])
            sense_a = next((sense for sense in json.loads(row["senses_a"]) if sense.get("is_active_match")), {})
            sense_b = next((sense for sense in json.loads(row["senses_b"]) if sense.get("is_active_match")), {})
            for source, target, source_lang, target_lang, target_word in (
                (sense_a, sense_b, row["lang_a"], row["lang_b"], row["word_b"]),
                (sense_b, sense_a, row["lang_b"], row["lang_a"], row["word_a"]),
            ):
                if not source.get("source_entry_key") or not source.get("source_sense_id") or source.get("source_identity_ambiguous"):
                    continue
                target_identity_status = (
                    "ambiguous"
                    if target.get("source_identity_ambiguous")
                    else "missing_entry"
                    if not target.get("source_entry_key")
                    else "missing_sense_id"
                    if not target.get("source_sense_id")
                    else "available"
                )
                key = (source_lang, source["source_entry_key"], target_lang, target_word.casefold())
                active_candidates[key].add((
                    candidate,
                    target_identity_status,
                    source.get("source_sense_id"),
                    source.get("comparison_gloss"),
                    target.get("source_entry_key"),
                    target.get("source_sense_id"),
                    target.get("comparison_gloss"),
                    json.dumps(
                        target.get("source_identity_candidates", []),
                        ensure_ascii=False,
                        sort_keys=True,
                        separators=(",", ":"),
                    ),
                ))

    cognate_claims: dict[tuple[str, str], set[tuple[str, int | None, str, str]]] = defaultdict(set)
    relations_by_candidate: dict[tuple, set[str]] = defaultdict(set)
    match_counts_by_relation = defaultdict(int)
    match_counts_by_category = defaultdict(int)
    match_counts_by_target_identity = defaultdict(int)
    source_hash = hashlib.sha256()
    temp_output = matches_output.with_suffix(matches_output.suffix + ".tmp") if matches_output else None
    try:
        if matches_output:
            matches_output.parent.mkdir(parents=True, exist_ok=True)
        destination = temp_output.open("w", encoding="utf-8", newline="\n") if temp_output else None
        try:
            with source_records.open("rb") as source:
                for line in source:
                    source_hash.update(line)
                    if not line.strip():
                        continue
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
                        matches = active_candidates.get(candidate_key, ())
                        for (
                            candidate,
                            target_identity_status,
                            source_sense_id,
                            source_gloss,
                            target_entry_key,
                            target_sense_id,
                            target_gloss,
                            target_identity_candidates,
                        ) in matches:
                            if relation:
                                relations_by_candidate[candidate].add(relation)
                            if destination and relation:
                                category = candidate_meta[candidate][1]
                                match_key = json.dumps(
                                    [entry_key, claim.get("template_index"), relation, target_lang, form_key, candidate],
                                    ensure_ascii=False,
                                    sort_keys=True,
                                    separators=(",", ":"),
                                )
                                row = {
                                    "match_id": hashlib.sha256(match_key.encode("utf-8")).hexdigest(),
                                    "candidate": {
                                        "forms": [
                                            {"language_code": language, "word": word}
                                            for language, word in candidate
                                        ],
                                        "category": category,
                                    },
                                    "source_entry": {
                                        key: record.get(key)
                                        for key in (
                                            "source", "source_file", "source_url", "source_entry_key",
                                            "language_code", "word", "part_of_speech", "etymology_number",
                                        )
                                    },
                                    "source_active_sense": {
                                        "source_sense_id": source_sense_id,
                                        "gloss": source_gloss,
                                    },
                                    "claim": {
                                        "relation": relation,
                                        "related_language": target_lang,
                                        "related_form": form,
                                        "source_uncertain": claim.get("source_uncertain"),
                                        "analysis_basis": claim.get("analysis_basis"),
                                        "evidence": {
                                            key: claim[key]
                                            for key in ("template_index", "template_name", "marker", "args")
                                            if key in claim
                                        },
                                    },
                                    "target_form_match": {
                                        "language_code": target_lang,
                                        "form": form,
                                        "active_entry_key": target_entry_key,
                                        "active_sense_id": target_sense_id,
                                        "active_sense_gloss": target_gloss,
                                        "active_identity_status": target_identity_status,
                                        "source_identity_candidates": json.loads(target_identity_candidates),
                                    },
                                }
                                destination.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
                                match_counts_by_relation[relation] += 1
                                match_counts_by_category[category] += 1
                                match_counts_by_target_identity[target_identity_status] += 1
                        if relation == "cognate_mention":
                            cognate_claims[(source_lang, target_lang)].add((
                                entry_key, claim.get("template_index"), target_lang, form_key
                            ))
        finally:
            if destination:
                destination.close()
        if temp_output:
            temp_output.replace(matches_output)
    except Exception:
        if temp_output:
            temp_output.unlink(missing_ok=True)
        raise

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
                if any(match[1] == "available" for match in matches):
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

    result = {"cognate_mentions": dict(cognate_counts), "other_candidates": dict(other_candidates)}
    if matches_output and manifest_path:
        unique_candidates_by_category = defaultdict(int)
        for candidate, relations in relations_by_candidate.items():
            if relations:
                unique_candidates_by_category[candidate_meta[candidate][1]] += 1
        output_hash = hashlib.sha256()
        with matches_output.open("rb") as generated:
            for block in iter(lambda: generated.read(1024 * 1024), b""):
                output_hash.update(block)
        comparison_hash = hashlib.sha256()
        with comparisons.open("rb") as comparison_file:
            for block in iter(lambda: comparison_file.read(1024 * 1024), b""):
                comparison_hash.update(block)
        manifest = {
            "schema_version": 1,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source_records_file": source_records.name,
            "source_records_sha256": source_hash.hexdigest(),
            "comparisons_file": comparisons.name,
            "comparisons_sha256": comparison_hash.hexdigest(),
            "matches_file": matches_output.name,
            "matches_sha256": output_hash.hexdigest(),
            "source_claim_candidate_matches": sum(match_counts_by_relation.values()),
            "matches_by_relation": dict(sorted(match_counts_by_relation.items())),
            "evidence_rows_by_candidate_category": dict(sorted(match_counts_by_category.items())),
            "evidence_rows_by_target_identity": dict(sorted(match_counts_by_target_identity.items())),
            "unique_candidates_with_source_claim_by_category": dict(sorted(unique_candidates_by_category.items())),
            "matching_rule": (
                "A normalized claim is matched when its source entry has an unambiguous active comparison sense and its "
                "related language and case-folded form equal the other candidate form. Claims are entry-level; this does "
                "not assert that they apply to the selected target sense."
            ),
        }
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return result


def main() -> None:
    project_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-records", type=Path, default=project_root / "pipeline/data/etymology_records.jsonl")
    parser.add_argument("--comparisons", type=Path, default=project_root / "pipeline/data/all_comparisons.parquet")
    parser.add_argument("--matches-output", type=Path, help="Optional JSONL export of matched source claims and candidate entries")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    result = audit_coverage(args.source_records, args.comparisons, args.matches_output, args.force)
    pairs = sorted(tuple(sorted(pair)) for pair in AUDIT_LANGUAGE_PAIRS)
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
