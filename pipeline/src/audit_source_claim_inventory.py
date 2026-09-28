"""Summarize normalized Wiktionary etymology claims without loading source text."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def audit_source_claim_inventory(source_records: Path, output: Path, force: bool = False) -> dict[str, Any]:
    if not source_records.is_file():
        raise FileNotFoundError(source_records)
    if not force and output.exists():
        raise FileExistsError(f"Output already exists; pass --force to replace it: {output}")

    source_hash = hashlib.sha256()
    records_by_language: Counter[str] = Counter()
    claims_by_language: Counter[str] = Counter()
    claims_by_relation: Counter[str] = Counter()
    claims_by_language_and_relation: Counter[tuple[str, str]] = Counter()
    claims_by_template_and_relation: Counter[tuple[str, str]] = Counter()
    claims_by_relation_and_target_shape: Counter[tuple[str, str]] = Counter()
    claims_without_relation_by_template: Counter[str] = Counter()
    endpoint_shapes: Counter[str] = Counter()
    uncertain_claims = cognate_term_requests = 0
    entry_records = claim_records = records_with_claims = 0

    with source_records.open("rb") as source:
        for line_number, line in enumerate(source, start=1):
            source_hash.update(line)
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON in {source_records.name} at line {line_number}") from exc
            entry_records += 1
            language = str(record.get("language_code") or "<missing>")
            records_by_language[language] += 1
            claims = record.get("claims") or []
            if claims:
                records_with_claims += 1

            for claim in claims:
                claim_records += 1
                claims_by_language[language] += 1
                relation = claim.get("relation")
                template = str(claim.get("template_name") or "<missing>").rstrip("+")
                if relation:
                    relation = str(relation)
                    claims_by_relation[relation] += 1
                    claims_by_language_and_relation[(language, relation)] += 1
                    claims_by_template_and_relation[(template, relation)] += 1
                    if relation == "cognate_mention" and not (claim.get("args") or {}).get("2"):
                        cognate_term_requests += 1
                    if claim.get("source_uncertain") is True:
                        uncertain_claims += 1
                    if claim.get("components"):
                        target_shape = "components"
                    elif claim.get("related_entity"):
                        target_shape = "entity"
                    elif claim.get("related_language") and claim.get("related_form"):
                        target_shape = "language_and_form"
                    elif claim.get("related_language"):
                        target_shape = "language_only"
                    elif claim.get("related_form"):
                        target_shape = "form_without_language"
                    else:
                        target_shape = "no_structured_target"
                    endpoint_shapes[target_shape] += 1
                    claims_by_relation_and_target_shape[(relation, target_shape)] += 1
                else:
                    claims_without_relation_by_template[template] += 1

    source_stat = source_records.stat()
    result = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": {
            "file": source_records.name,
            "size_bytes": source_stat.st_size,
            "sha256": source_hash.hexdigest(),
        },
        "counts": {
            "source_entry_records": entry_records,
            "records_with_claims": records_with_claims,
            "claim_records": claim_records,
            "claims_with_normalized_relation": sum(claims_by_relation.values()),
            "claims_without_normalized_relation": sum(claims_without_relation_by_template.values()),
            "uncertain_claim_records": uncertain_claims,
            "cognate_term_requests": cognate_term_requests,
        },
        "source_entries_by_language": dict(sorted(records_by_language.items())),
        "claim_records_by_language": dict(sorted(claims_by_language.items())),
        "claims_by_relation": dict(sorted(claims_by_relation.items())),
        "claims_by_language_and_relation": {
            f"{language}:{relation}": count
            for (language, relation), count in sorted(claims_by_language_and_relation.items())
        },
        "claims_by_template_and_relation": {
            f"{template}:{relation}": count
            for (template, relation), count in sorted(claims_by_template_and_relation.items())
        },
        "claims_by_relation_and_target_shape": {
            f"{relation}:{shape}": count
            for (relation, shape), count in sorted(claims_by_relation_and_target_shape.items())
        },
        "claims_without_relation_by_template": dict(sorted(claims_without_relation_by_template.items())),
        "normalized_claim_target_shapes": dict(sorted(endpoint_shapes.items())),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    temp_output = output.with_suffix(output.suffix + ".tmp")
    try:
        temp_output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temp_output.replace(output)
    except Exception:
        temp_output.unlink(missing_ok=True)
        raise
    return result


def main() -> None:
    project_root = Path(__file__).resolve().parents[2]
    data_dir = project_root / "pipeline" / "data"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-records", type=Path, default=data_dir / "etymology_records_all.jsonl")
    parser.add_argument("--output", type=Path, default=data_dir / "source_claim_inventory.json")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    result = audit_source_claim_inventory(args.source_records, args.output, args.force)
    counts = result["counts"]
    print(
        f"Scanned {counts['source_entry_records']:,} entries and "
        f"{counts['claim_records']:,} claim records; "
        f"{counts['claims_without_normalized_relation']:,} have no normalized relation."
    )
    print(f"Inventory: {args.output}")


if __name__ == "__main__":
    main()
