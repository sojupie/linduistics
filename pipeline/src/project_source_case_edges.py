"""Project normalized source claims from pair audits into directed lexical edges."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


COMPARISON_FIELDS = (
    "id", "lang_a", "word_a", "pos_a", "def_a", "lang_b", "word_b", "pos_b", "def_b",
    "category", "etymological_relation", "orthographic_sim", "phonetic_sim", "semantic_sim",
    "translation_source_senses",
)


def _edge_key(claim: dict) -> tuple:
    return (
        claim.get("relation"),
        claim.get("related_language"),
        claim.get("related_form"),
        json.dumps(claim.get("related_entity"), ensure_ascii=False, sort_keys=True, separators=(",", ":")),
        tuple(claim.get("components") or []),
        claim.get("source_uncertain", False),
        claim.get("analysis_basis"),
    )


def project_source_case_edges(inputs: list[Path], output: Path, force: bool = False) -> dict:
    manifest_path = output.with_suffix(output.suffix + ".manifest.json")
    if not inputs:
        raise ValueError("At least one pair audit is required")
    for path in inputs:
        if not path.is_file():
            raise FileNotFoundError(path)
    if not force and (output.exists() or manifest_path.exists()):
        raise FileExistsError(f"Output already exists; pass --force to replace it: {output}")

    output.parent.mkdir(parents=True, exist_ok=True)
    temp_output = output.with_suffix(output.suffix + ".tmp")
    case_count = edge_count = evidence_count = skipped_count = 0
    relation_counts = Counter()
    source_files = []
    try:
        with temp_output.open("w", encoding="utf-8", newline="\n") as destination:
            for path in inputs:
                digest = hashlib.sha256()
                input_cases = 0
                with path.open("rb") as source:
                    for line_number, line in enumerate(source, start=1):
                        digest.update(line)
                        if not line.strip():
                            continue
                        try:
                            audit = json.loads(line)
                        except json.JSONDecodeError as exc:
                            raise ValueError(f"Invalid JSON in {path.name} at line {line_number}") from exc
                        input_cases += 1
                        case_id = audit.get("audit_key", f"{path.name}:{line_number}")
                        comparison = audit.get("comparison") or {}
                        comparison_context = {key: comparison.get(key) for key in COMPARISON_FIELDS}
                        comparison_context["candidate_pair_match_method"] = audit.get("candidate_pair_match_method")
                        for lang, entries in audit.get("source_entries", {}).items():
                            for entry in entries:
                                entry_key = entry.get("source_entry_key", entry.get("key"))
                                comparison_sense_matches = []
                                for sense_match in audit.get("source_sense_matches", {}).get(lang, []):
                                    if sense_match.get("comparison_sense_is_active_match") is not True:
                                        continue
                                    matched_senses = [
                                        sense for sense in sense_match.get("source_senses", [])
                                        if sense.get("source_entry_key") == entry_key
                                    ]
                                    if matched_senses:
                                        comparison_sense_matches.append({
                                            "comparison_sense_id": sense_match.get("comparison_sense_id"),
                                            "comparison_sense_is_active_match": sense_match.get("comparison_sense_is_active_match"),
                                            "comparison_sense_pos": sense_match.get("comparison_sense_pos"),
                                            "comparison_gloss": sense_match.get("comparison_gloss"),
                                            "match_method": sense_match.get("match_method"),
                                            "source_senses": matched_senses,
                                        })
                                grouped = {}
                                for claim in entry.get("claims", []):
                                    relation = claim.get("relation")
                                    if not relation:
                                        skipped_count += 1
                                        continue
                                    key = _edge_key(claim)
                                    grouped.setdefault(key, []).append(claim)
                                for key, evidence in grouped.items():
                                    relation, related_lang, related_form, related_entity, components, uncertain, basis = key
                                    record = {
                                        "case_id": case_id,
                                        "comparison": comparison_context,
                                        "source_entry": {
                                            "source": entry.get("source"),
                                            "source_file": entry.get("source_file"),
                                            "source_url": entry.get("source_url"),
                                            "language": lang,
                                            "word": entry.get("word"),
                                            "part_of_speech": entry.get("part_of_speech", entry.get("pos")),
                                            "etymology_number": entry.get("etymology_number"),
                                            "entry_key": entry_key,
                                            "etymology_text": entry.get("etymology_text", entry.get("text")),
                                            "comparison_sense_matches": comparison_sense_matches,
                                        },
                                        "edge": {
                                            "relation": relation,
                                            "related_language": related_lang,
                                            "related_form": related_form,
                                            "related_entity": json.loads(related_entity) if related_entity != "null" else None,
                                            "components": list(components) or None,
                                            "source_uncertain": uncertain,
                                            "analysis_basis": basis,
                                        },
                                        "evidence": [
                                            {
                                                key: claim[key]
                                                for key in ("template_index", "template_name", "marker", "args")
                                                if key in claim
                                            }
                                            for claim in evidence
                                        ],
                                    }
                                    destination.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
                                    edge_count += 1
                                    evidence_count += len(evidence)
                                    relation_counts[relation] += 1
                stat = path.stat()
                source_files.append({
                    "file": path.name,
                    "size": stat.st_size,
                    "sha256": digest.hexdigest(),
                    "cases": input_cases,
                })
                case_count += input_cases

        temp_output.replace(output)
        manifest = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source_files": source_files,
            "output_file": output.name,
            "schema_version": 5,
            "counts": {
                "cases": case_count,
                "unique_source_edges": edge_count,
                "source_template_evidence_records": evidence_count,
                "nonedge_source_claims_skipped": skipped_count,
            },
            "edges_by_relation": dict(sorted(relation_counts.items())),
        }
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except Exception:
        temp_output.unlink(missing_ok=True)
        raise
    return manifest


def main() -> None:
    root = Path(__file__).resolve().parent.parent.parent
    data_dir = root / "pipeline" / "data"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, action="append", required=True, help="Pair audit JSONL; repeat as needed")
    parser.add_argument("--output", type=Path, default=data_dir / "source_case_edges.jsonl")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    manifest = project_source_case_edges(args.input, args.output, args.force)
    print(f"Wrote {manifest['counts']['unique_source_edges']:,} source edges from {manifest['counts']['cases']:,} pair audits")
    print(f"Manifest: {args.output.with_suffix(args.output.suffix + '.manifest.json')}")


if __name__ == "__main__":
    main()
