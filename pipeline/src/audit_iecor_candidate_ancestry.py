"""Export ancestry evidence across every local sense candidate in the IE-CoR panel."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from audit_iecor_reviewed_ancestry import normalized_claim_targets, proto_ancestor_mentions


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as stream:
        return [json.loads(line) for line in stream if line.strip()]


def pair_status(
    source_entries: int,
    target_entries: int,
    missing_combinations: int,
    direct_matches: int,
    proto_matches: int,
) -> str:
    if not source_entries or not target_entries:
        return "no_two_sided_local_entries"
    if direct_matches:
        return "entry_shared_ancestor_found"
    if proto_matches:
        return "entry_shared_proto_mention_found"
    if missing_combinations:
        return "entry_evidence_incomplete"
    return "no_entry_ancestry_evidence"


def entry_summary(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "word": row["local_word"],
        "entry_key": row["local_source_entry_key"],
        "url": row["local_source_url"],
        "sense_candidates": row["sense_candidates"],
    }


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def audit(
    crosswalk_path: Path,
    pairs_path: Path,
    source_records_path: Path,
    pair_output_path: Path,
    evidence_output_path: Path,
) -> dict[str, Any]:
    entries: dict[tuple[str, str], dict[str, dict[str, Any]]] = defaultdict(dict)
    needed_keys = set()
    for row in read_jsonl(crosswalk_path):
        entry_key = row.get("local_source_entry_key")
        sense_id = row.get("local_source_sense_id")
        if not entry_key or not sense_id:
            continue
        entry = entries[(row["concept_id"], row["language_code"])].setdefault(entry_key, {
            "local_word": row["local_word"],
            "local_source_entry_key": entry_key,
            "local_source_url": row["local_source_url"],
            "sense_candidates": {},
        })
        sense_key = (sense_id, row.get("local_pos", ""), row.get("local_sense_gloss", ""))
        entry["sense_candidates"][sense_key] = {
            "sense_id": sense_id,
            "pos": row.get("local_pos", ""),
            "gloss": row.get("local_sense_gloss", ""),
            "root_label": row.get("local_etymology_root", ""),
        }
        needed_keys.add(entry_key)

    for by_language in entries.values():
        for entry in by_language.values():
            entry["sense_candidates"] = list(entry["sense_candidates"].values())

    records: dict[str, dict[str, Any]] = {}
    with source_records_path.open(encoding="utf-8") as stream:
        for line in stream:
            record = json.loads(line)
            key = record.get("source_entry_key")
            if key in needed_keys:
                records[key] = record

    claim_targets = {key: normalized_claim_targets(row) for key, row in records.items()}
    proto_mentions = {key: proto_ancestor_mentions(row) for key, row in records.items()}
    pairs = read_jsonl(pairs_path)
    pair_rows = []
    evidence_rows = []
    summary = Counter()
    by_reference: dict[str, Counter[str]] = defaultdict(Counter)
    by_language_pair: dict[str, Counter[str]] = defaultdict(Counter)

    for pair in pairs:
        left = entries.get((pair["concept_id"], pair["source_language"]), {})
        right = entries.get((pair["concept_id"], pair["target_language"]), {})
        direct_count = 0
        proto_count = 0
        missing_count = 0
        combinations_count = len(left) * len(right)

        for left_entry in left.values():
            left_key = left_entry["local_source_entry_key"]
            for right_entry in right.values():
                right_key = right_entry["local_source_entry_key"]
                if left_key not in records or right_key not in records:
                    missing_count += 1
                    continue

                left_claims = claim_targets[left_key]
                right_claims = claim_targets[right_key]
                shared_targets = sorted(left_claims.keys() & right_claims.keys())
                if shared_targets:
                    direct_count += 1
                    evidence_rows.append({
                        "concept_id": pair["concept_id"],
                        "concept": pair["concept"],
                        "source_language": pair["source_language"],
                        "target_language": pair["target_language"],
                        "reference_relation": pair["reference_relation"],
                        "evidence_type": "shared_direct_ancestor_claim",
                        "source_entry": entry_summary(left_entry),
                        "target_entry": entry_summary(right_entry),
                        "shared_ancestors": [{
                            "language_code": language,
                            "form": form,
                            "source_claims": left_claims[(language, form)],
                            "target_claims": right_claims[(language, form)],
                        } for language, form in shared_targets],
                    })
                    continue

                shared_proto = sorted(proto_mentions[left_key] & proto_mentions[right_key])
                if shared_proto:
                    proto_count += 1
                    evidence_rows.append({
                        "concept_id": pair["concept_id"],
                        "concept": pair["concept"],
                        "source_language": pair["source_language"],
                        "target_language": pair["target_language"],
                        "reference_relation": pair["reference_relation"],
                        "evidence_type": "shared_proto_ancestor_mention",
                        "source_entry": entry_summary(left_entry),
                        "target_entry": entry_summary(right_entry),
                        "shared_ancestors": [
                            {"language_label": language, "form": form}
                            for language, form in shared_proto
                        ],
                    })

        status = pair_status(len(left), len(right), missing_count, direct_count, proto_count)
        result = {
            "concept_id": pair["concept_id"],
            "concept": pair["concept"],
            "source_language": pair["source_language"],
            "target_language": pair["target_language"],
            "reference_relation": pair["reference_relation"],
            "source_etymology_entries": len(left),
            "target_etymology_entries": len(right),
            "etymology_entry_combinations": combinations_count,
            "combinations_with_missing_source_record": missing_count,
            "direct_ancestor_candidate_pairs": direct_count,
            "proto_mention_candidate_pairs": proto_count,
            "entry_evidence_status": status,
        }
        pair_rows.append(result)
        summary[status] += 1
        summary["etymology_entry_combinations"] += combinations_count
        summary["direct_ancestor_entry_pairs"] += direct_count
        summary["proto_mention_entry_pairs"] += proto_count
        summary["combinations_with_missing_source_record"] += missing_count
        by_reference[pair["reference_relation"]][status] += 1
        language_pair = f"{pair['source_language']}-{pair['target_language']}"
        by_language_pair[language_pair][status] += 1

    for output_path, rows in ((pair_output_path, pair_rows), (evidence_output_path, evidence_rows)):
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            "".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows),
            encoding="utf-8",
        )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "method": (
            "Compare unique exact-form local etymology entries within each meaning and language, retaining each "
            "entry pair with a shared explicit inherited_from/derived_from target or shared Proto ancestor "
            "mention. Senses stay attached as alternatives; this is not a reviewed sense assignment or final label."
        ),
        "reference_meaning_pairs": len(pairs),
        "meaning_language_slots_with_local_entries": len(entries),
        "local_etymology_entries": sum(len(rows) for rows in entries.values()),
        "source_entry_keys_needed": len(needed_keys),
        "source_entry_records_found": len(records),
        "summary": dict(summary),
        "by_reference_relation": {key: dict(value) for key, value in by_reference.items()},
        "by_language_pair": {key: dict(value) for key, value in by_language_pair.items()},
        "outputs": {
            str(pair_output_path): {"rows": len(pair_rows), "sha256": _sha256(pair_output_path)},
            str(evidence_output_path): {"rows": len(evidence_rows), "sha256": _sha256(evidence_output_path)},
        },
        "inputs": {
            str(path): {"sha256": _sha256(path), "size_bytes": path.stat().st_size}
            for path in (crosswalk_path, pairs_path, source_records_path)
        },
    }


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    data = root / "pipeline" / "data"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--crosswalk", type=Path, default=data / "iecor_local_sense_crosswalk_v1.1.jsonl")
    parser.add_argument("--pairs", type=Path, default=data / "iecor_local_sense_crosswalk_v1.1_pairs.jsonl")
    parser.add_argument("--source-records", type=Path, default=data / "etymology_records_rebuild_20260929.jsonl")
    parser.add_argument("--pair-output", type=Path, default=data / "iecor_candidate_ancestry_v1.1_pairs.jsonl")
    parser.add_argument("--evidence-output", type=Path, default=data / "iecor_candidate_ancestry_v1.1_evidence.jsonl")
    args = parser.parse_args()
    manifest = audit(args.crosswalk, args.pairs, args.source_records, args.pair_output, args.evidence_output)
    manifest_path = args.pair_output.with_suffix(args.pair_output.suffix + ".manifest.json")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
