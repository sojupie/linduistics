"""Join selected live comparison rows to their Wiktionary source entries."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen


DEFAULT_WORDS = ["fleece", "clown", "ombudsman", "bankman", "sandbank", "gift"]
PAIR_FIELDS = (
    "id", "lang_a", "word_a", "pos_a", "def_a", "etym_root_a", "etym_text_a",
    "lang_b", "word_b", "pos_b", "def_b", "etym_root_b", "etym_text_b",
    "shared_etym_root", "category", "etymological_relation", "orthographic_sim",
    "phonetic_sim", "semantic_sim", "senses_a", "senses_b",
)


def load_source_entries(path: Path, words: set[str]) -> dict[tuple[str, str], list[dict]]:
    matches: dict[tuple[str, str], list[dict]] = defaultdict(list)
    with path.open(encoding="utf-8") as source:
        for line in source:
            record = json.loads(line)
            if record.get("word") in words:
                matches[(record["language_code"], record["word"])].append(record)
    return matches


def fetch_pair(api_url: str, source: str, target: str, word: str) -> dict | None:
    matches = []
    offset, total, limit = 0, 1, 100
    while offset < total:
        query = {"source": source, "target": target, "q": word, "limit": limit, "offset": offset}
        with urlopen(f"{api_url.rstrip('/')}/api/pairs?{urlencode(query)}", timeout=20) as response:
            payload = json.load(response)
        total = payload.get("total", 0)
        matches.extend(
            item for item in payload.get("items", [])
            if item.get("lang_a") == source and item.get("lang_b") == target
            and item.get("word_a") == word and item.get("word_b") == word
        )
        if matches:
            break
        offset += limit
    if len(matches) > 1:
        raise ValueError(f"Expected one headword-pair row for {source}/{target} {word!r}; found {len(matches)}")
    return matches[0] if matches else None


def audit_record(
    word: str,
    source: str,
    target: str,
    comparison: dict | None,
    entries: dict[tuple[str, str], list[dict]],
) -> dict:
    return {
        "audit_key": f"{source}|{word}|{target}|{word}",
        "comparison": {key: comparison.get(key) for key in PAIR_FIELDS} if comparison else None,
        "source_entries": {
            source: entries.get((source, word), []),
            target: entries.get((target, word), []),
        },
    }


def write_audit(
    source_records: Path,
    output: Path,
    api_url: str,
    source: str,
    target: str,
    words: list[str],
    force: bool = False,
) -> int:
    manifest = output.with_suffix(output.suffix + ".manifest.json")
    if not force and (output.exists() or manifest.exists()):
        raise FileExistsError(f"Output already exists; pass --force to replace it: {output}")

    entries = load_source_entries(source_records, set(words))
    output.parent.mkdir(parents=True, exist_ok=True)
    temp_output = output.with_suffix(output.suffix + ".tmp")
    counts: dict[str, dict[str, int]] = {}
    try:
        with temp_output.open("w", encoding="utf-8", newline="\n") as destination:
            for word in words:
                comparison = fetch_pair(api_url, source, target, word)
                record = audit_record(word, source, target, comparison, entries)
                destination.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
                counts[word] = {
                    "comparison_rows": int(comparison is not None),
                    "source_entries": len(record["source_entries"][source]) + len(record["source_entries"][target]),
                }
        temp_output.replace(output)
        source_manifest = source_records.with_suffix(source_records.suffix + ".manifest.json")
        manifest_data = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source_records": str(source_records),
            "source_manifest": str(source_manifest) if source_manifest.exists() else None,
            "source_manifest_sha256": hashlib.sha256(source_manifest.read_bytes()).hexdigest() if source_manifest.exists() else None,
            "comparison_api": f"{api_url.rstrip('/')}/api/pairs",
            "languages": [source, target],
            "words": words,
            "counts": counts,
        }
        manifest.write_text(json.dumps(manifest_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except Exception:
        temp_output.unlink(missing_ok=True)
        raise
    return len(words)


def main() -> None:
    project_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description="Join selected live pair rows to retained source etymology entries.")
    parser.add_argument("--source-records", type=Path, default=project_root / "pipeline/data/etymology_records.jsonl")
    parser.add_argument("--output", type=Path, default=project_root / "pipeline/data/source_pair_audit.jsonl")
    parser.add_argument("--api-url", default="http://localhost:8080")
    parser.add_argument("--source", default="sv")
    parser.add_argument("--target", default="en")
    parser.add_argument("--words", nargs="+", default=DEFAULT_WORDS)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    count = write_audit(args.source_records, args.output, args.api_url, args.source, args.target, args.words, args.force)
    print(f"Wrote {count} joined audit rows to {args.output}")


if __name__ == "__main__":
    main()
