"""Find shared reconstructed ancestors among component-entry candidates."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import os
from collections import Counter, defaultdict
from pathlib import Path

PROJECT_LANGUAGES = {"da", "de", "en", "nb", "sv"}
PROJECT_LANGUAGE_RELATIONS = {"inherited_from", "borrowed_from", "derived_from"}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _coverage_summary(root_entries: dict) -> dict:
    coverage = Counter()
    component_entries = Counter()
    for languages in root_entries.values():
        language_count = len(languages)
        if language_count < 2:
            continue
        coverage[str(language_count)] += 1
        component_entries[language_count] += sum(len(entries) for entries in languages.values())
    return {
        "shared_proto_nodes_by_language_coverage": dict(sorted(coverage.items())),
        "component_entry_candidates_on_shared_nodes_by_language_coverage": dict(
            sorted(component_entries.items())
        ),
    }


def audit_shared_component_proto_claims(
    etymology_records: Path,
    component_candidates: Path,
    shared_candidate_output: Path,
    force: bool = False,
) -> dict:
    roots_by_entry: dict[str, set[tuple[str, str]]] = defaultdict(set)
    peer_source_entries = set()
    peer_source_claims: Counter[tuple[str, str, str]] = Counter()
    peer_source_entry_counts: dict[tuple[str, str, str], set[str]] = defaultdict(set)
    etymology_records_count = 0
    with etymology_records.open("rb") as source:
        for line_number, line in enumerate(source, start=1):
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON at line {line_number} in {etymology_records.name}") from exc
            etymology_records_count += 1
            entry_key = record.get("source_entry_key")
            source_language = record.get("language_code")
            for claim in record.get("claims", []):
                ancestor_language = claim.get("related_language")
                ancestor_form = claim.get("related_form")
                if (
                    entry_key
                    and source_language in PROJECT_LANGUAGES
                    and ancestor_language in PROJECT_LANGUAGES
                    and ancestor_language != source_language
                    and claim.get("relation") in PROJECT_LANGUAGE_RELATIONS
                ):
                    peer_source_entries.add(entry_key)
                    key = (source_language, ancestor_language, claim["relation"])
                    peer_source_claims[key] += 1
                    peer_source_entry_counts[key].add(entry_key)
                if (
                    entry_key
                    and claim.get("relation") == "inherited_from"
                    and isinstance(ancestor_language, str)
                    and ancestor_language.endswith("-pro")
                    and ancestor_form
                    and not claim.get("source_uncertain", False)
                ):
                    roots_by_entry[entry_key].add((ancestor_language, ancestor_form))

    all_candidates: dict[tuple[str, str], dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    unique_candidates: dict[tuple[str, str], dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    unique_without_peer_candidates: dict[tuple[str, str], dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    unique_uses: dict[tuple[str, str], dict[str, set[tuple]]] = defaultdict(lambda: defaultdict(set))
    unique_without_peer_uses: dict[tuple[str, str], dict[str, set[tuple]]] = defaultdict(lambda: defaultdict(set))
    candidate_records_analyzed = 0
    languages = set()
    with gzip.open(component_candidates, "rt", encoding="utf-8") as source:
        for line_number, line in enumerate(source, start=1):
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON at line {line_number} in {component_candidates.name}") from exc
            language = record.get("language_code")
            if language:
                languages.add(language)
            if record.get("relation") not in {"compound_of", "formed_from"}:
                continue
            candidate_records_analyzed += 1
            for component in record.get("components", []):
                keys = component.get("candidate_entry_keys", [])
                for entry_key in keys:
                    for ancestor in roots_by_entry.get(entry_key, ()):
                        all_candidates[ancestor][language].add(entry_key)
                        if component.get("match_status") == "one_exact_entry" and len(keys) == 1:
                            unique_candidates[ancestor][language].add(entry_key)
                            use = (
                                record.get("source_entry_key"),
                                record.get("relation"),
                                component.get("index"),
                                component.get("surface_form"),
                                entry_key,
                            )
                            unique_uses[ancestor][language].add(use)
                            if entry_key not in peer_source_entries:
                                unique_without_peer_candidates[ancestor][language].add(entry_key)
                                unique_without_peer_uses[ancestor][language].add(use)

    candidate_output = shared_candidate_output
    if candidate_output.exists() and not force:
        raise FileExistsError(f"Output already exists; pass --force to replace it: {candidate_output}")
    candidate_output.parent.mkdir(parents=True, exist_ok=True)
    temp_output = candidate_output.with_suffix(candidate_output.suffix + ".tmp")
    shared_candidate_records = 0
    try:
        with temp_output.open("wb") as compressed_file:
            compressed = gzip.GzipFile(fileobj=compressed_file, mode="wb", filename="", mtime=0)
            with io.TextIOWrapper(compressed, encoding="utf-8", newline="\n") as destination:
                for basis, candidate_view in (
                    ("unique_exact_entry_only", unique_uses),
                    ("unique_exact_entry_without_peer_source_recorded", unique_without_peer_uses),
                ):
                    for ancestor, languages_by_code in sorted(candidate_view.items()):
                        if len(languages_by_code) < 2:
                            continue
                        record = {
                            "ancestor": {"language_code": ancestor[0], "form": ancestor[1]},
                            "basis": basis,
                            "component_uses_by_language": {
                                language: [
                                    {
                                        "parent_entry_key": parent_key,
                                        "relation": relation,
                                        "component_index": component_index,
                                        "component_form": component_form,
                                        "component_entry_key": component_entry_key,
                                    }
                                    for parent_key, relation, component_index, component_form, component_entry_key
                                    in sorted(uses)
                                ]
                                for language, uses in sorted(languages_by_code.items())
                            },
                        }
                        destination.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
                        shared_candidate_records += 1
        os.replace(temp_output, candidate_output)
    except Exception:
        temp_output.unlink(missing_ok=True)
        raise

    return {
        "etymology_records_file": etymology_records.name,
        "etymology_records_sha256": _sha256(etymology_records),
        "etymology_records": etymology_records_count,
        "component_candidate_file": component_candidates.name,
        "component_candidate_sha256": _sha256(component_candidates),
        "component_candidate_records_analyzed": candidate_records_analyzed,
        "shared_candidate_output": {
            "file": candidate_output.name,
            "sha256": _sha256(candidate_output),
            "records": shared_candidate_records,
        },
        "project_languages": sorted(languages),
        "source_claim_rule": (
            "Exact (reconstructed language, form) pairs from non-uncertain inherited_from claims to language codes ending in -pro."
        ),
        "component_scope": "compound_of and formed_from records only",
        "direct_project_language_source_claims": {
            "count_by_direction_and_relation": {
                f"{source}>{target}:{relation}": count
                for (source, target, relation), count in sorted(peer_source_claims.items())
            },
            "distinct_source_entries_by_direction_and_relation": {
                f"{source}>{target}:{relation}": len(peer_source_entry_counts[(source, target, relation)])
                for source, target, relation in sorted(peer_source_claims)
            },
        },
        "results": {
            "all_exact_entry_candidates": _coverage_summary(all_candidates),
            "unique_exact_entry_only": _coverage_summary(unique_candidates),
            "unique_exact_entry_without_peer_source_recorded": _coverage_summary(unique_without_peer_candidates),
        },
        "interpretation_limit": (
            "Shared nodes are candidate component-level source links, not reviewed cognate sets or whole-word classifications. "
            "Entries may contain several senses; ambiguous component spellings remain candidates. Absence of a peer-language "
            "source claim does not prove independent inheritance."
        ),
    }


def main() -> None:
    root = Path(__file__).resolve().parent.parent.parent
    data_dir = root / "pipeline" / "data"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--etymology-records", type=Path, default=data_dir / "etymology_records_all.jsonl")
    parser.add_argument("--component-candidates", type=Path, default=data_dir / "component_entry_candidates.jsonl.gz")
    parser.add_argument("--shared-candidates-output", type=Path, default=data_dir / "component_shared_ancestor_candidates.jsonl.gz")
    parser.add_argument("--output", type=Path, default=data_dir / "shared_component_proto_claims.json")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    if args.output.exists() and not args.force:
        raise FileExistsError(f"Output already exists; pass --force to replace it: {args.output}")
    result = audit_shared_component_proto_claims(
        args.etymology_records, args.component_candidates, args.shared_candidates_output, args.force
    )
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")


if __name__ == "__main__":
    main()
