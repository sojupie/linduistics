"""Join IE-CoR's selected forms to exact local Wiktionary lemma and sense records."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import unicodedata
from collections import Counter, defaultdict
from itertools import combinations
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote


LANGUAGES = {
    "20": ("da", "Danish"),
    "22": ("en", "English"),
    "27": ("de", "German"),
    "58": ("nb", "Norwegian Bokmål"),
    "69": ("sv", "Swedish"),
}


def normalize_form(value: str) -> str:
    return unicodedata.normalize("NFC", value).strip().casefold()


def wiktionary_url(word: str, language_name: str) -> str:
    page = quote(word.replace(" ", "_"), safe="()'-._~")
    anchor = quote(language_name.replace(" ", "_"), safe="()'-._~")
    return f"https://en.wiktionary.org/wiki/{page}#{anchor}"


def build_rows(
    reference_forms: list[dict[str, str]],
    concepts: dict[str, dict[str, str]],
    cognates_by_form: dict[str, set[str]],
    local_entries: dict[tuple[str, str], list[dict[str, Any]]],
    reviewed_senses: dict[str, str],
) -> list[dict[str, Any]]:
    rows = []
    for reference in reference_forms:
        language_id = reference["Language_ID"]
        language_code, language_name = LANGUAGES[language_id]
        concept = concepts[reference["Parameter_ID"]]
        matches = local_entries.get((language_code, normalize_form(reference["Value"])), [])
        common = {
            "reference_form_id": reference["ID"],
            "reference_dataset": "IE-CoR v1.1",
            "concept_id": reference["Parameter_ID"],
            "concept": concept["Name"],
            "concepticon_id": concept["Concepticon_ID"],
            "concepticon_definition": concept["Concepticon_Definition"],
            "language_code": language_code,
            "language_name": language_name,
            "reference_form": reference["Value"],
            "reference_form_field": reference["Form"],
            "reference_segments": reference["Segments"],
            "reference_cognatesets": sorted(cognates_by_form.get(reference["ID"], set())),
            "entry_match_status": "exact_spelling" if matches else "no_exact_entry",
        }
        if not matches:
            rows.append({
                **common,
                "local_word": "",
                "local_pos": "",
                "local_source_entry_key": "",
                "local_source_sense_id": "",
                "local_sense_gloss": "",
                "local_sense_tags": [],
                "local_etymology_root": "",
                "local_source_url": "",
                "sense_review_status": "not_applicable",
            })
            continue

        for entry in matches:
            senses = entry["senses"]
            if not senses:
                senses = [{}]
            for sense in senses:
                sense_id = sense.get("source_sense_id", "") or ""
                rows.append({
                    **common,
                    "local_word": entry["word"],
                    "local_pos": entry["pos"],
                    "local_source_entry_key": sense.get("source_entry_key", "") or "",
                    "local_source_sense_id": sense_id,
                    "local_sense_gloss": sense.get("gloss", "") or "",
                    "local_sense_tags": sense.get("tags", []) or [],
                    "local_etymology_root": sense.get("etym_root", "") or "",
                    "local_source_url": "",
                    "sense_review_status": reviewed_senses.get(sense_id, "unreviewed"),
                })
    return rows


def build_pair_rows(
    reference_forms: list[dict[str, str]],
    concepts: dict[str, dict[str, str]],
    cognates_by_form: dict[str, set[str]],
) -> list[dict[str, Any]]:
    forms_by_concept_language: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for form in reference_forms:
        language_code = LANGUAGES[form["Language_ID"]][0]
        forms_by_concept_language[(form["Parameter_ID"], language_code)].append({
            "id": form["ID"],
            "form": form["Value"],
            "cognate_set_ids": sorted(cognates_by_form.get(form["ID"], set())),
        })

    language_codes = [code for code, _ in LANGUAGES.values()]
    concept_ids = sorted({
        concept_id for concept_id, _ in forms_by_concept_language
        if all((concept_id, code) in forms_by_concept_language for code in language_codes)
    })
    rows = []
    for concept_id in concept_ids:
        for source, target in combinations(language_codes, 2):
            source_forms = forms_by_concept_language[(concept_id, source)]
            target_forms = forms_by_concept_language[(concept_id, target)]
            source_sets = {set_id for form in source_forms for set_id in form["cognate_set_ids"]}
            target_sets = {set_id for form in target_forms for set_id in form["cognate_set_ids"]}
            shared_sets = sorted(source_sets & target_sets)
            unassigned = [
                form["id"] for form in (*source_forms, *target_forms)
                if not form["cognate_set_ids"]
            ]
            if shared_sets:
                relation = "shared_cognate_set"
            elif unassigned:
                relation = "incomplete_assignment"
            else:
                relation = "no_shared_cognate_set"
            rows.append({
                "reference_dataset": "IE-CoR v1.1",
                "concept_id": concept_id,
                "concept": concepts[concept_id]["Name"],
                "concepticon_id": concepts[concept_id]["Concepticon_ID"],
                "source_language": source,
                "target_language": target,
                "source_forms": source_forms,
                "target_forms": target_forms,
                "shared_cognate_set_ids": shared_sets,
                "reference_relation": relation,
                "unassigned_form_ids": unassigned,
            })
    return rows


def _read_csv(path: Path, delimiter: str = ",") -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream, delimiter=delimiter))


def _load_reviewed_senses(path: Path) -> dict[str, str]:
    return {
        row["local_sense_candidate_id"]: row["sense_review_status"]
        for row in _read_csv(path, delimiter="\t")
        if row.get("local_sense_candidate_id") and row.get("sense_review_status")
    }


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def build_crosswalk(
    iecor_dir: Path,
    lemma_dir: Path,
    source_records_path: Path,
    reviewed_senses_path: Path,
    output_path: Path,
    force: bool = False,
) -> dict[str, Any]:
    import pyarrow.parquet as pq

    manifest_path = output_path.with_suffix(output_path.suffix + ".manifest.json")
    pair_output_path = output_path.with_name(f"{output_path.stem}_pairs.jsonl")
    if not force and any(path.exists() for path in (output_path, manifest_path, pair_output_path)):
        raise FileExistsError(f"Output already exists; pass --force to replace it: {output_path}")

    reference_forms = [
        form for form in _read_csv(iecor_dir / "cldf_forms.csv")
        if form["Language_ID"] in LANGUAGES
    ]
    concepts = {
        row["ID"]: row for row in _read_csv(iecor_dir / "cldf_parameters.csv")
    }
    cognates_by_form: dict[str, set[str]] = defaultdict(set)
    for assignment in _read_csv(iecor_dir / "cldf_cognates.csv"):
        if assignment["Cognateset_ID"]:
            cognates_by_form[assignment["Form_ID"]].add(assignment["Cognateset_ID"])

    reference_keys = {
        (LANGUAGES[form["Language_ID"]][0], normalize_form(form["Value"]))
        for form in reference_forms
    }
    local_entries: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for language_code in (item[0] for item in LANGUAGES.values()):
        parquet_path = lemma_dir / f"lemmas_{language_code}.parquet"
        parquet_file = pq.ParquetFile(parquet_path)
        for batch in parquet_file.iter_batches(
            columns=["word", "pos", "senses_json"], batch_size=4096
        ):
            for row in batch.to_pylist():
                word = row.get("word") or ""
                key = (language_code, normalize_form(word))
                if not word or key not in reference_keys:
                    continue
                senses = json.loads(row.get("senses_json") or "[]")
                local_entries[key].append({
                    "word": word,
                    "pos": row.get("pos") or "",
                    "senses": senses,
                })

    reviewed_senses = _load_reviewed_senses(reviewed_senses_path) if reviewed_senses_path.exists() else {}

    rows = build_rows(reference_forms, concepts, cognates_by_form, local_entries, reviewed_senses)
    pair_rows = build_pair_rows(reference_forms, concepts, cognates_by_form)
    keys_to_url = {
        row["local_source_entry_key"]
        for row in rows
        if row["local_source_entry_key"]
    }
    source_urls = {}
    source_hash = hashlib.sha256()
    with source_records_path.open("rb") as stream:
        for line in stream:
            source_hash.update(line)
            if not line.strip():
                continue
            record = json.loads(line)
            key = record.get("source_entry_key")
            if key in keys_to_url:
                source_urls[key] = record.get("source_url", "")
    for row in rows:
        row["local_source_url"] = source_urls.get(row["local_source_entry_key"]) or (
            wiktionary_url(row["local_word"], row["language_name"]) if row["local_word"] else ""
        )

    temp_path = output_path.with_suffix(output_path.suffix + ".tmp")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    counts = Counter(row["sense_review_status"] for row in rows)
    reference_forms_with_exact_entry = {
        row["reference_form_id"] for row in rows if row["entry_match_status"] == "exact_spelling"
    }
    concepts_by_language = defaultdict(set)
    concepts_with_entries_by_language = defaultdict(set)
    for form in reference_forms:
        language_code = LANGUAGES[form["Language_ID"]][0]
        concepts_by_language[language_code].add(form["Parameter_ID"])
    for row in rows:
        if row["entry_match_status"] == "exact_spelling":
            concepts_with_entries_by_language[row["language_code"]].add(row["concept_id"])
    all_five_concepts = set.intersection(*concepts_by_language.values())
    complete_exact_concepts = {
        concept_id for concept_id in all_five_concepts
        if all(concept_id in concepts_with_entries_by_language[code] for code, _ in LANGUAGES.values())
    }
    try:
        with temp_path.open("w", encoding="utf-8", newline="\n") as output:
            for row in rows:
                output.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
        temp_path.replace(output_path)
        pair_temp_path = pair_output_path.with_suffix(pair_output_path.suffix + ".tmp")
        with pair_temp_path.open("w", encoding="utf-8", newline="\n") as output:
            for row in pair_rows:
                output.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
        pair_temp_path.replace(pair_output_path)
    except Exception:
        temp_path.unlink(missing_ok=True)
        pair_output_path.with_suffix(pair_output_path.suffix + ".tmp").unlink(missing_ok=True)
        raise

    input_paths = [
        iecor_dir / name for name in (
            "cldf_forms.csv", "cldf_cognates.csv", "cldf_parameters.csv", "cldf_languages.csv", "cldf_cldf-metadata.json"
        )
    ] + [lemma_dir / f"lemmas_{code}.parquet" for code, _ in LANGUAGES.values()] + [source_records_path, reviewed_senses_path]
    input_hashes = {}
    for path in input_paths:
        input_hashes[str(path)] = {
            "sha256": source_hash.hexdigest() if path == source_records_path else _sha256(path),
            "size_bytes": path.stat().st_size,
        }
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "reference_dataset": "IE-CoR v1.1",
        "reference_license": "CC BY 4.0",
        "inputs": input_hashes,
        "output": {"path": str(output_path), "sha256": _sha256(output_path), "size_bytes": output_path.stat().st_size},
        "pair_output": {"path": str(pair_output_path), "sha256": _sha256(pair_output_path), "size_bytes": pair_output_path.stat().st_size},
        "counts": {
            "reference_forms": len(reference_forms),
            "reference_meanings_with_all_five_languages": len(all_five_concepts),
            "reference_forms_with_exact_local_entry": len(reference_forms_with_exact_entry),
            "reference_forms_without_exact_local_entry": len(reference_forms) - len(reference_forms_with_exact_entry),
            "five_language_meanings_with_exact_local_entries": len(complete_exact_concepts),
            "local_sense_candidate_rows": sum(bool(row["local_source_sense_id"]) for row in rows),
            "review_status_rows": dict(counts),
            "meaning_pair_rows": len(pair_rows),
            "meaning_pair_relations": dict(Counter(row["reference_relation"] for row in pair_rows)),
            "matched_source_entries_without_resolved_url": sum(
                bool(row["local_source_entry_key"]) and not row["local_source_url"] for row in rows
            ),
        },
        "limitations": [
            "Exact orthographic matches only; phrases, inflected forms, variants, and sense equivalence are not inferred.",
            "All source-sense candidates outside the linked review overlay remain unreviewed.",
            "IE-CoR cognate-set assignments remain attached to IE-CoR forms and are not transferred to local entries.",
            "A shared cognate set means IE-CoR assigns at least one form for each meaning-language pair to the same set; it is not a whole-vocabulary cognate percentage.",
            "Wiktionary-derived glosses and records are local working data; redistribution terms require review.",
        ],
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--iecor-dir", type=Path, default=Path("pipeline/data/references/iecor-v1.1"))
    parser.add_argument("--lemma-dir", type=Path, default=Path("pipeline/data/identity-rebuild"))
    parser.add_argument("--source-records", type=Path, default=Path("pipeline/data/etymology_records_rebuild_20260929.jsonl"))
    parser.add_argument("--reviewed-senses", type=Path, default=Path("docs/data/iecor_local_sense_review_2026-09-30.tsv"))
    parser.add_argument("--output", type=Path, default=Path("pipeline/data/iecor_local_sense_crosswalk_v1.1.jsonl"))
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    print(json.dumps(build_crosswalk(
        args.iecor_dir, args.lemma_dir, args.source_records, args.reviewed_senses, args.output, args.force
    ), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
