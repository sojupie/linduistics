"""Measure exact source-entry coverage for etymology component mentions."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

from extract_etymology_records import source_entry_key


_GLOSS_TAG = re.compile(r"<t:[^>]*>")


def _component_surface(value: object) -> str:
    if not isinstance(value, str):
        return ""
    return _GLOSS_TAG.sub("", value).strip()


def audit_component_entry_coverage(
    source_records: Path,
    entry_dumps: list[Path],
    candidates_output: Path,
    force: bool = False,
) -> dict:
    """Count and project exact component-to-entry candidates across full source dumps."""
    if not force and candidates_output.exists():
        raise FileExistsError(f"Output already exists; pass --force to replace it: {candidates_output}")
    entries_by_language_and_word: dict[tuple[str, str], dict[str, dict]] = defaultdict(dict)
    dump_summaries = []
    for dump in entry_dumps:
        digest = hashlib.sha256()
        entry_count = 0
        print(f"Indexing {dump.name}", file=sys.stderr, flush=True)
        with dump.open("rb") as source:
            for line_number, line in enumerate(source, start=1):
                digest.update(line)
                if not line.strip():
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"Invalid JSON at line {line_number} in {dump.name}") from exc
                entry_count += 1
                language = entry.get("lang_code")
                word = entry.get("word")
                if language and isinstance(word, str):
                    key = source_entry_key(entry)
                    entries_by_language_and_word[(language, word)][key] = {
                        "source_entry_key": key,
                        "part_of_speech": entry.get("pos"),
                        "etymology_number": entry.get("etymology_number"),
                        "senses": [
                            {
                                field: sense[field]
                                for field in ("id", "glosses", "raw_glosses", "tags")
                                if field in sense
                            }
                            for sense in entry.get("senses", [])
                            if isinstance(sense, dict) and isinstance(sense.get("id"), str)
                        ],
                    }
        dump_summaries.append({
            "file": dump.name,
            "sha256": digest.hexdigest(),
            "entries": entry_count,
        })

    status_counts: Counter[str] = Counter()
    language_counts: dict[str, Counter[str]] = defaultdict(Counter)
    raw_vectors = unique_vectors = component_occurrences = 0
    etymology_hash = hashlib.sha256()
    candidate_records = 0
    candidates_output.parent.mkdir(parents=True, exist_ok=True)
    temp_output = candidates_output.with_suffix(candidates_output.suffix + ".tmp")

    try:
        with temp_output.open("wb") as compressed_file:
            compressed = gzip.GzipFile(fileobj=compressed_file, mode="wb", filename="", mtime=0)
            with io.TextIOWrapper(compressed, encoding="utf-8", newline="\n") as destination:
                with source_records.open("rb") as source:
                    for line_number, raw_line in enumerate(source, start=1):
                        etymology_hash.update(raw_line)
                        if not raw_line.strip():
                            continue
                        try:
                            record = json.loads(raw_line)
                        except json.JSONDecodeError as exc:
                            raise ValueError(f"Invalid JSON at line {line_number} in {source_records.name}") from exc
                        language = record.get("language_code", "")
                        grouped = {}
                        seen_vectors: set[tuple[str, ...]] = set()
                        for claim in record.get("claims", []):
                            components = claim.get("components")
                            if not isinstance(components, list):
                                continue
                            terms = tuple(_component_surface(component) for component in components)
                            if not terms or not any(terms):
                                continue
                            raw_vectors += 1
                            key = (
                                claim.get("relation"),
                                terms,
                                claim.get("source_uncertain", False),
                                claim.get("analysis_basis"),
                            )
                            if terms not in seen_vectors:
                                seen_vectors.add(terms)
                                unique_vectors += 1
                            group = grouped.setdefault(key, {
                                "raw_components": [set() for _ in terms],
                                "evidence": [],
                            })
                            for index, component in enumerate(components):
                                if isinstance(component, str):
                                    group["raw_components"][index].add(component)
                            group["evidence"].append({
                                field: claim[field]
                                for field in ("template_index", "template_name", "marker", "args")
                                if field in claim
                            })

                        for key, group in grouped.items():
                            relation, terms, uncertain, basis = key
                            component_records = []
                            for index, term in enumerate(terms):
                                candidates = entries_by_language_and_word.get((language, term), {}) if term else {}
                                candidate_keys = sorted(candidates)
                                match_status = (
                                    "one_exact_entry"
                                    if len(candidate_keys) == 1
                                    else "multiple_exact_entries"
                                    if len(candidate_keys) > 1
                                    else "no_exact_entry"
                                )
                                component_records.append({
                                    "index": index,
                                    "surface_form": term,
                                    "raw_forms": sorted(group["raw_components"][index]),
                                    "match_status": match_status,
                                    "candidate_entry_keys": candidate_keys,
                                    "candidate_entry_details": [candidates[key] for key in candidate_keys],
                                })
                            destination.write(json.dumps({
                                "source_entry_key": record.get("source_entry_key"),
                                "language_code": language,
                                "word": record.get("word"),
                                "part_of_speech": record.get("part_of_speech"),
                                "etymology_number": record.get("etymology_number"),
                                "relation": relation,
                                "source_uncertain": uncertain,
                                "analysis_basis": basis,
                                "components": component_records,
                                "evidence": group["evidence"],
                            }, ensure_ascii=False, separators=(",", ":")) + "\n")
                            candidate_records += 1
                        for terms in seen_vectors:
                            for term in terms:
                                if not term:
                                    continue
                                component_occurrences += 1
                                candidate_count = len(entries_by_language_and_word.get((language, term), {}))
                                status = (
                                    "one_exact_entry"
                                    if candidate_count == 1
                                    else "multiple_exact_entries"
                                    if candidate_count > 1
                                    else "no_exact_entry"
                                )
                                status_counts[status] += 1
                                language_counts[language][status] += 1
        os.replace(temp_output, candidates_output)
    except Exception:
        temp_output.unlink(missing_ok=True)
        raise

    output_hash = hashlib.sha256()
    with candidates_output.open("rb") as generated:
        for block in iter(lambda: generated.read(1024 * 1024), b""):
            output_hash.update(block)

    return {
        "etymology_records_file": source_records.name,
        "etymology_records_sha256": etymology_hash.hexdigest(),
        "source_dump_entries": sum(dump["entries"] for dump in dump_summaries),
        "source_entry_dumps": dump_summaries,
        "component_claim_vectors": {
            "raw": raw_vectors,
            "unique_within_source_entry": unique_vectors,
        },
        "component_occurrences": {
            "total": component_occurrences,
            "by_exact_entry_match": dict(sorted(status_counts.items())),
            "by_language": {
                language: dict(sorted(counts.items()))
                for language, counts in sorted(language_counts.items())
            },
        },
        "candidate_output": {
            "file": candidates_output.name,
            "sha256": output_hash.hexdigest(),
            "records": candidate_records,
        },
        "matching_rule": (
            "Exact language code and spelling among all source dump entries, after removing Wiktionary <t:...> gloss tags. "
            "Retains all matched entry keys and their sense IDs/glosses for inspection; it does not select a component sense "
            "or establish a historical relationship."
        ),
        "deduplication_rule": (
            "Repeated normalized component lists within one source entry are counted once, regardless of relation label."
        ),
    }


def main() -> None:
    root = Path(__file__).resolve().parent.parent.parent
    data_dir = root / "pipeline" / "data"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--etymology-records", type=Path, default=data_dir / "etymology_records_all.jsonl")
    parser.add_argument("--entry-dump", type=Path, action="append", help="Full Kaikki JSONL entry dump; repeat for each language")
    parser.add_argument("--candidates-output", type=Path, default=data_dir / "component_entry_candidates.jsonl.gz")
    parser.add_argument("--output", type=Path, default=data_dir / "component_entry_coverage.json")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    entry_dumps = args.entry_dump or [data_dir / f"kaikki_{lang}.jsonl" for lang in ("da", "de", "en", "nb", "sv")]
    if args.output.exists() and not args.force:
        raise FileExistsError(f"Output already exists; pass --force to replace it: {args.output}")
    result = audit_component_entry_coverage(args.etymology_records, entry_dumps, args.candidates_output, args.force)
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")


if __name__ == "__main__":
    main()
