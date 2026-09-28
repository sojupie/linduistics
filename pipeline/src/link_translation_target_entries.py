"""Link translation surfaces to matching Wiktionary target entries."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import orjson

from extract_etymology_records import source_entry_key
from extract_translation_claims import _normalize_lang

TARGET_LANGS = ("da", "de", "nb", "sv")
ENTRY_FIELDS = ("id", "glosses", "raw_glosses", "tags", "form_of")


def _read_claims(path: Path):
    forms = {lang: defaultdict(set) for lang in TARGET_LANGS}
    counts = Counter()
    skipped = Counter()
    digest = hashlib.sha256()
    with path.open("rb") as claims_file:
        for line in claims_file:
            digest.update(line)
            claim = orjson.loads(line)
            lang = _normalize_lang(str(claim.get("target_lang", "")))
            if lang not in forms:
                continue
            counts[lang] += 1
            form = claim.get("target_form")
            if not isinstance(form, str) or not form.strip():
                skipped[lang] += 1
                continue
            form = form.strip()
            forms[lang][form.casefold()].add(form)
    return forms, counts, skipped, digest.hexdigest()


def _target_entry(entry: dict, lang: str, source_file: str, line_number: int) -> dict:
    return {
        "source_file": source_file,
        "source_line": line_number,
        "source_entry_key": source_entry_key(entry),
        "target_lang": lang,
        "target_word": entry["word"],
        "target_pos": entry.get("pos"),
        "target_etymology_number": entry.get("etymology_number"),
        "target_etymology_text": entry.get("etymology_text"),
        "target_etymology_templates": entry.get("etymology_templates", []),
        "target_senses": [
            {key: sense[key] for key in ENTRY_FIELDS if key in sense}
            for sense in entry.get("senses", [])
            if isinstance(sense, dict)
        ],
    }


def link_translation_target_entries(
    claims_path: Path,
    target_dir: Path,
    output_path: Path,
    force: bool = False,
) -> dict:
    manifest_path = output_path.with_suffix(output_path.suffix + ".manifest.json")
    if not claims_path.is_file():
        raise FileNotFoundError(claims_path)
    if not force and (output_path.exists() or manifest_path.exists()):
        raise FileExistsError(f"Output already exists; pass --force to replace it: {output_path}")

    forms, claim_counts, skipped_claims, claims_sha256 = _read_claims(claims_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = output_path.with_suffix(output_path.suffix + ".tmp")
    found_exact = {lang: set() for lang in TARGET_LANGS}
    source_spellings = {lang: defaultdict(set) for lang in TARGET_LANGS}
    entry_counts = Counter()
    target_digests = {}
    target_sizes = {}

    try:
        with temp_path.open("w", encoding="utf-8", newline="\n") as output:
            for lang in TARGET_LANGS:
                source_path = target_dir / f"kaikki_{lang}.jsonl"
                if not source_path.is_file():
                    raise FileNotFoundError(source_path)
                digest = hashlib.sha256()
                with source_path.open("rb") as source:
                    for line_number, line in enumerate(source, start=1):
                        digest.update(line)
                        if not line.strip():
                            continue
                        try:
                            entry = orjson.loads(line)
                        except orjson.JSONDecodeError as exc:
                            raise ValueError(f"Invalid JSON in {source_path.name} at line {line_number}") from exc
                        if not isinstance(entry, dict):
                            continue
                        word = entry.get("word")
                        if not isinstance(word, str) or not word:
                            continue
                        key = word.casefold()
                        translations = forms[lang].get(key)
                        if not translations:
                            continue
                        if _normalize_lang(str(entry.get("lang_code", ""))) != lang:
                            continue

                        exact_forms = sorted(form for form in translations if form == word)
                        folded_forms = sorted(form for form in translations if form != word)
                        found_exact[lang].update(exact_forms)
                        source_spellings[lang][key].add(word)
                        record = _target_entry(entry, lang, source_path.name, line_number)
                        record["exact_translation_forms"] = exact_forms
                        record["casefold_translation_forms"] = folded_forms
                        output.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
                        entry_counts[lang] += 1
                target_digests[lang] = digest.hexdigest()
                target_sizes[lang] = source_path.stat().st_size

        temp_path.replace(output_path)
        resolution = {}
        for lang in TARGET_LANGS:
            exact = found_exact[lang]
            folded_only = {
                form
                for key, variants in forms[lang].items()
                for form in variants
                if form not in exact and key in source_spellings[lang]
            }
            ambiguous = {
                form
                for form in folded_only
                if len(source_spellings[lang][form.casefold()]) > 1
            }
            resolution[lang] = {
                "translation_claims": claim_counts[lang],
                "claims_without_target_form": skipped_claims[lang],
                "unique_translation_forms": sum(len(variants) for variants in forms[lang].values()),
                "exact_forms_found": len(exact),
                "casefold_only_forms_found": len(folded_only),
                "ambiguous_casefold_forms": len(ambiguous),
                "forms_not_found": sum(len(variants) for variants in forms[lang].values()) - len(exact | folded_only),
                "target_source_entries": entry_counts[lang],
            }

        manifest = {
            "source": "Wiktionary via Kaikki/Wiktextract",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "claims_file": claims_path.name,
            "claims_file_sha256": claims_sha256,
            "target_source_files": {
                lang: {
                    "file": f"kaikki_{lang}.jsonl",
                    "size": target_sizes[lang],
                    "sha256": target_digests[lang],
                }
                for lang in TARGET_LANGS
            },
            "output_file": output_path.name,
            "schema_version": 1,
            "resolution_by_language": resolution,
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
    parser.add_argument("--claims", type=Path, default=data_dir / "translation_claims_en.jsonl")
    parser.add_argument("--target-dir", type=Path, default=data_dir)
    parser.add_argument("--output", type=Path, default=data_dir / "translation_target_entries.jsonl")
    parser.add_argument("--force", action="store_true", help="Replace an existing output and manifest")
    args = parser.parse_args()
    manifest = link_translation_target_entries(args.claims, args.target_dir, args.output, args.force)
    total = sum(item["target_source_entries"] for item in manifest["resolution_by_language"].values())
    print(f"Wrote {total:,} source-linked target entries to {args.output}")
    print(f"Manifest: {args.output.with_suffix(args.output.suffix + '.manifest.json')}")


if __name__ == "__main__":
    main()
