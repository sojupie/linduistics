"""Measure exact source-entry coverage for etymology component mentions."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


_GLOSS_TAG = re.compile(r"<t:[^>]*>")


def _component_surface(value: object) -> str:
    if not isinstance(value, str):
        return ""
    return _GLOSS_TAG.sub("", value).strip()


def audit_component_entry_coverage(source_records: Path) -> dict:
    """Count exact component-to-entry candidates without selecting an entry."""
    entries_by_language_and_word: dict[tuple[str, str], set[str]] = defaultdict(set)
    source_records_count = 0
    input_hash = hashlib.sha256()

    with source_records.open("rb") as source:
        for line_number, line in enumerate(source, start=1):
            input_hash.update(line)
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON at line {line_number} in {source_records.name}") from exc
            source_records_count += 1
            language = record.get("language_code")
            word = record.get("word")
            entry_key = record.get("source_entry_key")
            if language and isinstance(word, str) and entry_key:
                entries_by_language_and_word[(language, word)].add(entry_key)

    status_counts: Counter[str] = Counter()
    language_counts: dict[str, Counter[str]] = defaultdict(Counter)
    raw_vectors = unique_vectors = component_occurrences = 0

    with source_records.open(encoding="utf-8") as source:
        for line_number, line in enumerate(source, start=1):
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON at line {line_number} in {source_records.name}") from exc
            language = record.get("language_code", "")
            seen_vectors: set[tuple[str, ...]] = set()
            for claim in record.get("claims", []):
                components = claim.get("components")
                if not isinstance(components, list):
                    continue
                terms = tuple(_component_surface(component) for component in components)
                if not terms or not any(terms):
                    continue
                raw_vectors += 1
                if terms in seen_vectors:
                    continue
                seen_vectors.add(terms)
                unique_vectors += 1
                for term in terms:
                    if not term:
                        continue
                    component_occurrences += 1
                    candidate_count = len(entries_by_language_and_word.get((language, term), ()))
                    status = (
                        "one_exact_entry"
                        if candidate_count == 1
                        else "multiple_exact_entries"
                        if candidate_count > 1
                        else "no_exact_entry"
                    )
                    status_counts[status] += 1
                    language_counts[language][status] += 1

    return {
        "source_file": source_records.name,
        "source_sha256": input_hash.hexdigest(),
        "source_records": source_records_count,
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
        "matching_rule": (
            "Exact language code and component spelling after removing Wiktionary <t:...> gloss tags. "
            "Counts source entry keys only; it does not resolve senses or establish a historical relationship."
        ),
        "deduplication_rule": (
            "Repeated normalized component lists within one source entry are counted once, regardless of relation label."
        ),
    }


def main() -> None:
    root = Path(__file__).resolve().parent.parent.parent
    data_dir = root / "pipeline" / "data"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=data_dir / "etymology_records_all.jsonl")
    parser.add_argument("--output", type=Path, default=data_dir / "component_entry_coverage.json")
    args = parser.parse_args()

    result = audit_component_entry_coverage(args.input)
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")


if __name__ == "__main__":
    main()
