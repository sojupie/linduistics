"""Link Wiktionary origin-status claims to active comparison senses."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


def audit_origin_status_coverage(source_records: Path, comparisons: Path, output: Path, force: bool = False) -> dict:
    import pyarrow.parquet as pq

    manifest_path = output.with_suffix(output.suffix + ".manifest.json")
    if not force and (output.exists() or manifest_path.exists()):
        raise FileExistsError(f"Output already exists; pass --force to replace it: {output}")

    active_candidates: dict[tuple[str, str], set[tuple]] = defaultdict(set)
    for batch in pq.ParquetFile(comparisons).iter_batches(
        columns=["lang_a", "lang_b", "word_a", "word_b", "category", "senses_a", "senses_b"]
    ):
        for row in batch.to_pylist():
            candidate = tuple(sorted(((row["lang_a"], row["word_a"]), (row["lang_b"], row["word_b"]))))
            for side, language in (("a", row["lang_a"]), ("b", row["lang_b"])):
                for sense in json.loads(row[f"senses_{side}"] or "[]"):
                    if not sense.get("is_active_match") or sense.get("source_identity_ambiguous"):
                        continue
                    entry_key = sense.get("source_entry_key")
                    sense_id = sense.get("source_sense_id")
                    if entry_key and sense_id:
                        active_candidates[(language, entry_key)].add((candidate, row["category"], sense_id))

    counts = Counter()
    unique_candidates: dict[tuple[str, str], set[tuple]] = defaultdict(set)
    status_claims = Counter()
    status_claims_with_candidate = Counter()
    status_claims_without_candidate = Counter()
    status_records = Counter()
    status_records_with_relation = Counter()
    status_records_by_relation = Counter()
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(output.suffix + ".tmp")
    source_hash = hashlib.sha256()
    try:
        with source_records.open("rb") as source, temporary.open("w", encoding="utf-8", newline="\n") as destination:
            for line in source:
                source_hash.update(line)
                if not line.strip():
                    continue
                record = json.loads(line)
                language = record.get("language_code")
                entry_key = record.get("source_entry_key")
                claims = record.get("claims", [])
                record_statuses = {
                    claim.get("source_etymology_status")
                    for claim in claims
                    if claim.get("source_etymology_status") in {"unknown", "uncertain"}
                }
                record_relations = {claim.get("relation") for claim in claims if claim.get("relation")}
                for status in record_statuses:
                    claim_count = sum(
                        claim.get("source_etymology_status") == status for claim in claims
                    )
                    status_claims[status] += claim_count
                    status_records[status] += 1
                    if record_relations:
                        status_records_with_relation[status] += 1
                        for relation in record_relations:
                            status_records_by_relation[(status, relation)] += 1
                entry_candidates = active_candidates.get((language, entry_key), ()) if language and entry_key else ()
                for status in record_statuses:
                    status_counter = status_claims_with_candidate if entry_candidates else status_claims_without_candidate
                    status_counter[status] += sum(
                        claim.get("source_etymology_status") == status for claim in claims
                    )
                if not language or not entry_key:
                    continue
                sense_ids = set(record.get("sense_ids") or [])
                for claim in claims:
                    status = claim.get("source_etymology_status")
                    if status not in {"unknown", "uncertain"}:
                        continue
                    source_senses = {
                        sense.get("id"): sense for sense in record.get("source_senses", []) if sense.get("id")
                    }
                    for candidate, category, active_sense_id in sorted(entry_candidates):
                        alignment = "exact_sense_overlap" if active_sense_id in sense_ids else "entry_level_only"
                        evidence = {
                            key: claim[key]
                            for key in ("template_index", "template_name", "args")
                            if key in claim
                        }
                        match_key = json.dumps(
                            [entry_key, evidence, status, candidate, active_sense_id],
                            ensure_ascii=False,
                            separators=(",", ":"),
                        )
                        row = {
                            "match_id": hashlib.sha256(match_key.encode("utf-8")).hexdigest(),
                            "candidate": {
                                "forms": [
                                    {"language_code": lang, "word": word} for lang, word in candidate
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
                                "source_sense_id": active_sense_id,
                                "glosses": source_senses.get(active_sense_id, {}).get("glosses", []),
                                "raw_glosses": source_senses.get(active_sense_id, {}).get("raw_glosses", []),
                            },
                            "source_etymology_status": {
                                "status": status,
                                "source_label": claim.get("source_label"),
                                "scope": "source_entry_etymology",
                                "alignment_status": alignment,
                                "evidence": evidence,
                            },
                        }
                        destination.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
                        counts[(status, category, alignment)] += 1
                        unique_candidates[(status, category)].add(candidate)
        temporary.replace(output)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise

    def digest(path: Path) -> str:
        value = hashlib.sha256()
        with path.open("rb") as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b""):
                value.update(block)
        return value.hexdigest()

    manifest = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_records_file": source_records.name,
        "source_records_sha256": source_hash.hexdigest(),
        "comparisons_file": comparisons.name,
        "comparisons_sha256": digest(comparisons),
        "matches_file": output.name,
        "matches_sha256": digest(output),
        "evidence_rows": sum(counts.values()),
        "source_status_claims_by_status": dict(sorted(status_claims.items())),
        "source_status_claims_with_active_candidate_by_status": dict(sorted(status_claims_with_candidate.items())),
        "source_status_claims_without_active_candidate_by_status": dict(sorted(status_claims_without_candidate.items())),
        "source_records_by_status": dict(sorted(status_records.items())),
        "source_records_with_other_normalized_relations_by_status": dict(
            sorted(status_records_with_relation.items())
        ),
        "source_records_by_status_and_cooccurring_relation": {
            "|".join(key): count for key, count in sorted(status_records_by_relation.items())
        },
        "evidence_rows_by_status_category_alignment": {
            "|".join(key): count for key, count in sorted(counts.items())
        },
        "unique_candidate_pairs_by_status_category": {
            "|".join(key): len(candidates) for key, candidates in sorted(unique_candidates.items())
        },
        "matching_rule": (
            "A source status is linked by an unambiguous active source entry. Alignment is exact when the active "
            "source sense ID is listed on the source record, and entry-level only otherwise. The status remains "
            "attached to the source etymology; it is not a pair-level historical verdict."
        ),
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    project_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-records", type=Path, default=project_root / "pipeline/data/etymology_records.jsonl")
    parser.add_argument("--comparisons", type=Path, default=project_root / "pipeline/data/all_comparisons.parquet")
    parser.add_argument("--output", type=Path, default=project_root / "pipeline/data/source_origin_status_matches.jsonl")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    manifest = audit_origin_status_coverage(args.source_records, args.comparisons, args.output, args.force)
    print(json.dumps({"evidence_rows": manifest["evidence_rows"], "output": manifest["matches_file"]}, indent=2))


if __name__ == "__main__":
    main()
