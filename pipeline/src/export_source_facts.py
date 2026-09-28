"""Export selected source-backed entity and formation facts as compact JSONL."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ENTITY_RELATIONS = {"named_after", "coined_by"}
FORMATION_TYPES = {"coinage", "onomatopoeic"}


def export_source_facts(source_records: Path, output: Path, force: bool = False) -> dict[str, Any]:
    manifest_path = output.with_suffix(output.suffix + ".manifest.json")
    if not force and (output.exists() or manifest_path.exists()):
        raise FileExistsError(f"Output already exists; pass --force to replace it: {output}")

    output.parent.mkdir(parents=True, exist_ok=True)
    temp_output = output.with_suffix(output.suffix + ".tmp")
    input_hash = hashlib.sha256()
    relation_counts: Counter[str] = Counter()
    formation_counts: Counter[str] = Counter()
    language_counts: Counter[str] = Counter()
    unresolved_entities: Counter[str] = Counter()
    entry_records = fact_records = 0

    try:
        with source_records.open("rb") as source, temp_output.open("wb") as destination:
            for line_number, line in enumerate(source, start=1):
                input_hash.update(line)
                if not line.strip():
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"Invalid JSON in {source_records.name} at line {line_number}") from exc
                entry_records += 1
                for claim in record.get("claims", []):
                    relation = claim.get("relation")
                    formation_type = claim.get("formation_type")
                    if relation not in ENTITY_RELATIONS and formation_type not in FORMATION_TYPES:
                        continue

                    fact_key = json.dumps(
                        [record.get("source_entry_key"), claim.get("template_index"), relation,
                         formation_type, claim.get("related_entity")],
                        ensure_ascii=False,
                        sort_keys=True,
                        separators=(",", ":"),
                    )
                    fact_id = hashlib.sha256(fact_key.encode("utf-8")).hexdigest()
                    row = {
                        "fact_id": fact_id,
                        "source": record.get("source"),
                        "source_file": record.get("source_file"),
                        "source_url": record.get("source_url"),
                        "source_entry_key": record.get("source_entry_key"),
                        "language_code": record.get("language_code"),
                        "word": record.get("word"),
                        "part_of_speech": record.get("part_of_speech"),
                        "etymology_number": record.get("etymology_number"),
                        "relation": relation,
                        "formation_type": formation_type,
                        "related_entity": claim.get("related_entity"),
                        "source_label": claim.get("source_label"),
                        "coined_ex_nihilo": claim.get("coined_ex_nihilo"),
                        "evidence": {
                            key: claim[key]
                            for key in ("template_index", "template_name", "args")
                            if key in claim
                        },
                    }
                    destination.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")).encode("utf-8") + b"\n")
                    fact_records += 1
                    language_counts[row["language_code"]] += 1
                    if relation in ENTITY_RELATIONS:
                        relation_counts[relation] += 1
                        if not row["related_entity"]:
                            unresolved_entities[relation] += 1
                    if formation_type in FORMATION_TYPES:
                        formation_counts[formation_type] += 1

        temp_output.replace(output)
    except Exception:
        temp_output.unlink(missing_ok=True)
        raise

    output_hash = hashlib.sha256()
    with output.open("rb") as generated:
        for block in iter(lambda: generated.read(1024 * 1024), b""):
            output_hash.update(block)

    manifest = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_records_file": source_records.name,
        "source_records_sha256": input_hash.hexdigest(),
        "output_file": output.name,
        "output_sha256": output_hash.hexdigest(),
        "source_entry_records_scanned": entry_records,
        "facts": fact_records,
        "facts_by_relation": dict(sorted(relation_counts.items())),
        "facts_by_formation_type": dict(sorted(formation_counts.items())),
        "facts_by_language": dict(sorted(language_counts.items())),
        "unlinked_entities_by_relation": dict(sorted(unresolved_entities.items())),
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    project_root = Path(__file__).resolve().parents[2]
    data_dir = project_root / "pipeline" / "data"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-records", type=Path, default=data_dir / "etymology_records_all.jsonl")
    parser.add_argument("--output", type=Path, default=data_dir / "source_facts.jsonl")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    manifest = export_source_facts(args.source_records, args.output, args.force)
    print(f"Wrote {manifest['facts']:,} source facts to {args.output}")
    print(f"Manifest: {args.output.with_suffix(args.output.suffix + '.manifest.json')}")


if __name__ == "__main__":
    main()
