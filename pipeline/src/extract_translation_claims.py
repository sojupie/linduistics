"""Export source-linked translation claims from local Kaikki JSONL dumps."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from collections.abc import Sequence
from datetime import datetime, timezone
from pathlib import Path

import orjson

from extract_etymology_records import source_entry_key

TARGET_LANGS = {"en", "de", "sv", "da", "nb"}
SOURCE_LANGS = ("da", "de", "en", "nb", "sv")
LANG_ALIASES = {
    "no": "nb",
    "norwegian": "nb",
    "danish": "da",
    "german": "de",
    "swedish": "sv",
    "english": "en",
}


def _normalize_lang(code: str) -> str:
    code = code.lower().strip()
    return LANG_ALIASES.get(code, code)


def extract_translation_claims(
    input_paths: Path | Sequence[Path], output_path: Path, force: bool = False
) -> dict:
    if isinstance(input_paths, Path):
        input_paths = [input_paths]
    else:
        input_paths = list(input_paths)
    manifest_path = output_path.with_suffix(output_path.suffix + ".manifest.json")
    if not input_paths:
        raise ValueError("At least one input dump is required")
    for input_path in input_paths:
        if not input_path.is_file():
            raise FileNotFoundError(input_path)
    if not force and (output_path.exists() or manifest_path.exists()):
        raise FileExistsError(f"Output already exists; pass --force to replace it: {output_path}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = output_path.with_suffix(output_path.suffix + ".tmp")
    counts = Counter()
    langs = Counter()
    input_manifests = []
    try:
        with temp_path.open("w", encoding="utf-8", newline="\n") as output:
            for input_path in input_paths:
                digest = hashlib.sha256()
                file_counts = Counter()
                file_langs = Counter()
                with input_path.open("rb") as source:
                    for line_number, line in enumerate(source, start=1):
                        digest.update(line)
                        if not line.strip():
                            continue
                        try:
                            entry = orjson.loads(line)
                        except orjson.JSONDecodeError as exc:
                            raise ValueError(f"Invalid JSON in {input_path.name} at line {line_number}") from exc
                        if not isinstance(entry, dict):
                            continue
                        file_counts["source_entries"] += 1
                        counts["source_entries"] += 1
                        entry_key = source_entry_key(entry)
                        source_word = str(entry.get("word", ""))
                        source_lang = str(entry.get("lang_code", ""))
                        source_pos = entry.get("pos")
                        etymology_number = entry.get("etymology_number")
                        for sense_index, sense in enumerate(entry.get("senses", [])):
                            if not isinstance(sense, dict):
                                continue
                            translations = sense.get("translations", [])
                            for translation_index, translation in enumerate(translations):
                                if not isinstance(translation, dict):
                                    continue
                                raw_code = str(translation.get("code", ""))
                                target_lang = _normalize_lang(raw_code)
                                if target_lang not in TARGET_LANGS:
                                    continue

                                translation_id = f"{entry_key}#{sense_index}:{translation_index}"
                                record = {
                                    "translation_id": translation_id,
                                    "source_entry_key": entry_key,
                                    "source_file": input_path.name,
                                    "source_line": line_number,
                                    "source_lang": source_lang,
                                    "source_word": source_word,
                                    "source_pos": source_pos,
                                    "source_etymology_number": etymology_number,
                                    "source_sense_index": sense_index,
                                    "source_sense_id": sense.get("id"),
                                    "source_glosses": sense.get("glosses", []),
                                    "source_raw_glosses": sense.get("raw_glosses", []),
                                    "source_sense_tags": sense.get("tags", []),
                                    "target_lang": target_lang,
                                    "target_code": raw_code,
                                    "target_form": translation.get("word", ""),
                                    "translation_record": translation,
                                }
                                output.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
                                file_counts["translation_claims"] += 1
                                counts["translation_claims"] += 1
                                file_langs[target_lang] += 1
                                langs[target_lang] += 1
                stat = input_path.stat()
                input_manifests.append({
                    "file": input_path.name,
                    "size": stat.st_size,
                    "sha256": digest.hexdigest(),
                    "counts": dict(file_counts),
                    "translation_claims_by_target_language": dict(sorted(file_langs.items())),
                })

        temp_path.replace(output_path)
        manifest = {
            "source": "Wiktionary via Kaikki/Wiktextract",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source_files": input_manifests,
            "output_file": output_path.name,
            "schema_version": 1,
            "counts": dict(counts),
            "translation_claims_by_target_language": dict(sorted(langs.items())),
        }
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except Exception:
        temp_path.unlink(missing_ok=True)
        raise
    return manifest


def main() -> None:
    root = Path(__file__).resolve().parent.parent.parent
    data_dir = root / "pipeline" / "data"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, action="append", help="Source dump; repeat for multiple languages")
    parser.add_argument("--output", type=Path, default=data_dir / "translation_claims_all.jsonl")
    parser.add_argument("--force", action="store_true", help="Replace an existing output and manifest")
    args = parser.parse_args()
    inputs = args.input or [data_dir / f"kaikki_{lang}.jsonl" for lang in SOURCE_LANGS]
    manifest = extract_translation_claims(inputs, args.output, args.force)
    print(f"Wrote {manifest['counts']['translation_claims']:,} source-linked translation claims to {args.output}")
    print(f"Manifest: {args.output.with_suffix(args.output.suffix + '.manifest.json')}")


if __name__ == "__main__":
    main()
