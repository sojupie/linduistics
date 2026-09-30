"""Compare direct Wiktionary-derived ancestry claims for reviewed IE-CoR senses."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ANCESTRY_RELATIONS = {"inherited_from", "derived_from"}


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as stream:
        return [json.loads(line) for line in stream if line.strip()]


def normalized_claim_targets(record: dict[str, Any]) -> dict[tuple[str, str], list[dict[str, Any]]]:
    targets: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for claim in record.get("claims", []):
        if claim.get("relation") not in ANCESTRY_RELATIONS:
            continue
        languages = claim.get("related_language") or []
        if isinstance(languages, str):
            languages = languages.split(",")
        form = unicodedata.normalize("NFC", claim.get("related_form") or "")
        form = re.sub(r"<id:[^>]*>", "", form)
        form = re.sub(r"\s+", " ", form).strip().casefold()
        if not form:
            continue
        for language in languages:
            language = str(language).strip().casefold()
            if language:
                targets[(language, form)].append({
                    "relation": claim["relation"],
                    "template_index": claim.get("template_index"),
                    "template_name": claim.get("template_name"),
                    "related_form": claim.get("related_form"),
                })
    return targets


def proto_ancestor_mentions(record: dict[str, Any]) -> set[tuple[str, str]]:
    text = record.get("etymology_text") or ""
    boundary = re.search(r"(?m)^(?:Cognates|Derived terms|Related terms|Descendants)\s*$", text)
    if boundary:
        text = text[:boundary.start()]
    return {
        (
            re.sub(r"\s+", " ", match.group("language")).strip().casefold(),
            re.sub(r"\s+", " ", unicodedata.normalize("NFC", match.group("form").rstrip(".,:;"))).strip().casefold(),
        )
        for match in re.finditer(
            r"\b(?P<language>Proto-[^*.,;()\n“”]+?)\s+(?P<form>\*[^\s,;()“”]+)",
            text,
        )
    }


def compare_claims(source: dict[str, Any], target: dict[str, Any]) -> list[dict[str, Any]]:
    left = normalized_claim_targets(source)
    right = normalized_claim_targets(target)
    return [
        {
            "language_code": language,
            "form": form,
            "source_claims": left[(language, form)],
            "target_claims": right[(language, form)],
        }
        for language, form in sorted(left.keys() & right.keys())
    ]


def audit(crosswalk_path: Path, pairs_path: Path, source_records_path: Path, output_path: Path) -> dict[str, Any]:
    crosswalk = read_jsonl(crosswalk_path)
    pairs = read_jsonl(pairs_path)
    selected = {
        (row["concept_id"], row["language_code"]): row
        for row in crosswalk
        if row["sense_review_status"] == "selected_primary" and row["local_source_entry_key"]
    }
    selected_keys = {row["local_source_entry_key"] for row in selected.values()}
    source_records = {}
    with source_records_path.open(encoding="utf-8") as stream:
        for line in stream:
            record = json.loads(line)
            key = record.get("source_entry_key")
            if key in selected_keys:
                source_records[key] = record
                if len(source_records) == len(selected_keys):
                    break

    rows = []
    summary = Counter()
    by_reference_relation: dict[str, Counter[str]] = defaultdict(Counter)
    for pair in pairs:
        left = selected.get((pair["concept_id"], pair["source_language"]))
        right = selected.get((pair["concept_id"], pair["target_language"]))
        if not left or not right:
            continue
        left_record = source_records.get(left["local_source_entry_key"])
        right_record = source_records.get(right["local_source_entry_key"])
        status = "entry_record_missing"
        shared = []
        shared_proto = []
        if left_record and right_record:
            shared = compare_claims(left_record, right_record)
            shared_proto = sorted(proto_ancestor_mentions(left_record) & proto_ancestor_mentions(right_record))
            status = (
                "shared_direct_ancestor_claim" if shared
                else "shared_proto_ancestor_mention" if shared_proto
                else "no_common_ancestor_evidence"
            )
        summary["reviewed_meaning_pairs"] += 1
        summary[status] += 1
        relation_counts = by_reference_relation[pair["reference_relation"]]
        relation_counts[status] += 1
        rows.append({
            "concept_id": pair["concept_id"],
            "concept": pair["concept"],
            "source_language": pair["source_language"],
            "target_language": pair["target_language"],
            "reference_relation": pair["reference_relation"],
            "source_word": left["local_word"],
            "source_sense_id": left["local_source_sense_id"],
            "source_entry_key": left["local_source_entry_key"],
            "source_url": left["local_source_url"],
            "target_word": right["local_word"],
            "target_sense_id": right["local_source_sense_id"],
            "target_entry_key": right["local_source_entry_key"],
            "target_url": right["local_source_url"],
            "shared_direct_ancestor_claims": shared,
            "shared_proto_ancestor_mentions": [
                {"language_label": language, "form": form}
                for language, form in shared_proto
            ],
            "ancestry_status": status,
        })

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows),
        encoding="utf-8",
    )
    digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "method": "Compare direct inherited_from and derived_from targets, then separately compare common Proto-language ancestor mentions in etymology text before the Cognates section. Excludes cognate_mention and borrowed_from; does not perform transitive traversal.",
        "selected_senses": len(selected),
        "selected_entry_records_found": len(source_records),
        "summary": dict(summary),
        "by_reference_relation": {
            relation: dict(counts) for relation, counts in by_reference_relation.items()
        },
        "inputs": {
            str(path): digest(path)
            for path in (crosswalk_path, pairs_path, source_records_path)
        },
        "output": {"path": str(output_path), "sha256": digest(output_path), "rows": len(rows)},
    }
    manifest_path = output_path.with_suffix(output_path.suffix + ".manifest.json")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    data = root / "pipeline" / "data"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--crosswalk", type=Path, default=data / "iecor_local_sense_crosswalk_v1.1.jsonl")
    parser.add_argument("--pairs", type=Path, default=data / "iecor_local_sense_crosswalk_v1.1_pairs.jsonl")
    parser.add_argument("--source-records", type=Path, default=data / "etymology_records_rebuild_20260929.jsonl")
    parser.add_argument("--output", type=Path, default=data / "iecor_reviewed_ancestry_v1.1.jsonl")
    args = parser.parse_args()
    print(json.dumps(audit(args.crosswalk, args.pairs, args.source_records, args.output), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
