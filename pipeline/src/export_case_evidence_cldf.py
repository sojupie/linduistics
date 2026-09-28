"""Export the local case evidence slice as a linked CLDF Generic dataset."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
from collections import defaultdict
from pathlib import Path
from typing import Any


CLDF = "http://cldf.clld.org/v1.0/terms.rdf#"
LANGUAGES = {
    "da": "Danish",
    "de": "German",
    "en": "English",
    "nb": "Norwegian Bokmål",
    "sv": "Swedish",
}


def stable_id(prefix: str, *values: Any) -> str:
    payload = json.dumps(values, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return f"{prefix}_{hashlib.sha256(payload.encode('utf-8')).hexdigest()[:20]}"


def read_jsonl(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as stream:
        return [json.loads(line) for line in stream if line.strip()]


def _dump(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _active_sense(comparison: dict, side: str) -> dict:
    senses = comparison.get(f"senses_{side}") or []
    if isinstance(senses, str):
        senses = json.loads(senses)
    active = [sense for sense in senses if sense.get("is_active_match")]
    return active[0] if len(active) == 1 else {}


def _form_identity(comparison: dict, side: str) -> tuple[dict, str]:
    language = comparison[f"lang_{side}"]
    word = comparison[f"word_{side}"]
    sense = _active_sense(comparison, side)
    entry_key = sense.get("source_entry_key")
    sense_id = sense.get("source_sense_id")
    pos = sense.get("pos") or comparison.get(f"pos_{side}") or ""
    gloss = sense.get("gloss") or comparison.get(f"def_{side}") or ""
    identity = (language, word, pos, entry_key or "", sense_id or "", gloss)
    return {
        "ID": stable_id("form", *identity),
        "Language_ID": language,
        "Form": word,
        "Part_Of_Speech": pos,
        "Source_Entry_Key": entry_key or "",
        "Source_Entry_ID": "",
        "Source_Sense_ID": sense_id or "",
        "Gloss": gloss,
        "Source_Identity_Status": (
            "ambiguous" if sense.get("source_identity_ambiguous") else
            "matched" if entry_key and sense_id else "unresolved"
        ),
    }, sense


def _claim_id(entry_key: str, claim: dict) -> str:
    return stable_id(
        "claim",
        entry_key,
        claim.get("template_index"),
        claim.get("template_name"),
        claim.get("relation"),
        claim.get("args") or {},
    )


def _comparison_id(form_a: str, form_b: str) -> str:
    return stable_id("comparison", *sorted((form_a, form_b)))


def _write_csv(path: Path, fields: list[str], rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def _validate_table_links(tables: list[tuple[str, list[str], list[dict]]]) -> None:
    rows_by_file = {filename: rows for filename, _, rows in tables}
    refs = {
        "entries.csv": {"Language_ID": ("languages.csv", "ID")},
        "senses.csv": {"Entry_ID": ("entries.csv", "ID")},
        "forms.csv": {"Language_ID": ("languages.csv", "ID"), "Source_Entry_ID": ("entries.csv", "ID")},
        "source-claims.csv": {"Entry_ID": ("entries.csv", "ID")},
        "component-links.csv": {"Parent_Entry_ID": ("entries.csv", "ID")},
        "comparisons.csv": {"Form_A_ID": ("forms.csv", "ID"), "Form_B_ID": ("forms.csv", "ID")},
        "claim-matches.csv": {"Claim_ID": ("source-claims.csv", "ID"), "Comparison_ID": ("comparisons.csv", "ID")},
    }
    ids = {filename: {row["ID"] for row in rows} for filename, rows in rows_by_file.items()}
    for filename, rows in rows_by_file.items():
        if len(ids[filename]) != len(rows) or any(not re.fullmatch(r"[A-Za-z0-9_-]+", value) for value in ids[filename]):
            raise ValueError(f"Invalid or duplicate CLDF-style ID in {filename}")
        for column, (target_file, target_column) in refs.get(filename, {}).items():
            target_ids = {row[target_column] for row in rows_by_file[target_file]}
            if any(row[column] and row[column] not in target_ids for row in rows):
                raise ValueError(f"Broken reference {filename}.{column} -> {target_file}.{target_column}")


def _column(name: str, datatype: str = "string", *, required: bool = False, property_url: str | None = None, description: str | None = None) -> dict:
    result: dict[str, Any] = {"name": name, "datatype": datatype, "required": required}
    if property_url:
        result["propertyUrl"] = property_url
    if description:
        result["dc:description"] = description
    return result


def _table(url: str, columns: list[dict], primary_key: str = "ID", foreign_keys: list[dict] | None = None) -> dict:
    schema: dict[str, Any] = {"columns": columns, "primaryKey": primary_key}
    if foreign_keys:
        schema["foreignKeys"] = foreign_keys
    return {"url": url, "tableSchema": schema}


def export_slice(source_path: Path, output_dir: Path, *, force: bool = False) -> dict:
    if output_dir.exists() and any(output_dir.iterdir()) and not force:
        raise FileExistsError(f"Output directory is not empty; pass --force to replace it: {output_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)
    cases = read_jsonl(source_path)

    entries_by_key: dict[str, dict] = {}
    senses_by_key: dict[tuple[str, str], dict] = {}
    claims_by_id: dict[str, dict] = {}
    components_by_id: dict[str, dict] = {}
    forms_by_id: dict[str, dict] = {}
    comparison_pairs: dict[str, dict] = {}
    pair_lookup: dict[tuple[str, str, str, str, str, str], str] = {}
    pending_matches: list[tuple[dict, str, str]] = []

    for case in cases:
        case_id = case["case_id"]
        for entry in case.get("source_entries", []):
            entry_key = entry.get("source_entry_key")
            if not entry_key:
                continue
            entry_id = stable_id("entry", entry_key)
            entries_by_key[entry_key] = {
                "ID": entry_id,
                "Language_ID": entry.get("language_code", ""),
                "Headword": entry.get("word", ""),
                "Part_Of_Speech": entry.get("part_of_speech", ""),
                "Source_Entry_Key": entry_key,
                "Etymology_Number": entry.get("etymology_number") or "",
                "Origin_Status": entry.get("origin_status") or "",
                "Source_URL": entry.get("source_url", ""),
                "Source_File": entry.get("source_file", ""),
            }
            for sense in entry.get("source_senses", []):
                sense_id = sense.get("id")
                if not sense_id:
                    continue
                senses_by_key[(entry_key, sense_id)] = {
                    "ID": stable_id("sense", entry_key, sense_id),
                    "Entry_ID": entry_id,
                    "Source_Sense_ID": sense_id,
                    "Glosses_JSON": _dump(sense.get("glosses") or []),
                    "Raw_Glosses_JSON": _dump(sense.get("raw_glosses") or []),
                    "Tags_JSON": _dump(sense.get("tags") or []),
                }
            for claim in entry.get("claims", []):
                claim_id = _claim_id(entry_key, claim)
                claims_by_id[claim_id] = {
                    "ID": claim_id,
                    "Entry_ID": entry_id,
                    "Relation": claim.get("relation", ""),
                    "Related_Language_ID": claim.get("related_language") or "",
                    "Related_Form": claim.get("related_form") or "",
                    "Source_Uncertain": "" if claim.get("source_uncertain") is None else str(bool(claim.get("source_uncertain"))).lower(),
                    "Template_Name": claim.get("template_name", ""),
                    "Template_Index": claim.get("template_index", ""),
                    "Template_Arguments_JSON": _dump(claim.get("args") or {}),
                    "Source_URL": entry.get("source_url", ""),
                }

        for component_claim in case.get("component_links", []):
            entry_key = component_claim.get("source_entry_key", "")
            entry_id = entries_by_key.get(entry_key, {}).get("ID", "")
            evidence = component_claim.get("evidence") or []
            if isinstance(evidence, dict):
                evidence = [evidence]
            for component in component_claim.get("components", []):
                index = component.get("index", "")
                component_id = stable_id(
                    "component", entry_key, component_claim.get("relation"),
                    _dump(evidence), index,
                )
                components_by_id[component_id] = {
                    "ID": component_id,
                    "Parent_Entry_ID": entry_id,
                    "Relation": component_claim.get("relation", ""),
                    "Component_Index": index,
                    "Component_Form": component.get("surface_form", ""),
                    "Raw_Forms_JSON": _dump(component.get("raw_forms") or []),
                    "Match_Status": component.get("match_status", ""),
                    "Candidate_Entry_Keys_JSON": _dump(component.get("candidate_entry_keys") or []),
                    "Evidence_JSON": _dump(evidence),
                }

        for comparison in case.get("comparisons", []):
            form_rows = []
            active_senses = []
            for side in ("a", "b"):
                form, sense = _form_identity(comparison, side)
                forms_by_id[form["ID"]] = form
                form_rows.append(form)
                active_senses.append(sense)
            a, b = sorted(form_rows, key=lambda item: item["ID"])
            sense_by_form_id = {row["ID"]: sense for row, sense in zip(form_rows, active_senses)}
            comparison_id = _comparison_id(a["ID"], b["ID"])
            sense_a = sense_by_form_id[a["ID"]]
            sense_b = sense_by_form_id[b["ID"]]
            row = {
                "ID": comparison_id,
                "Case_ID": case_id,
                "Form_A_ID": a["ID"],
                "Form_B_ID": b["ID"],
                "Recorded_Root_A": sense_a.get("etym_root") or "",
                "Recorded_Root_B": sense_b.get("etym_root") or "",
                "Spelling_Similarity": comparison.get("orthographic_sim", ""),
                "Phonetic_Similarity": comparison.get("phonetic_sim", ""),
                "Semantic_Similarity": comparison.get("semantic_sim", ""),
                "Legacy_Candidate_Label": comparison.get("category", ""),
                "Legacy_Root_Match_Status": comparison.get("etymological_relation", ""),
                "Directed_Row_Count": 1,
            }
            if comparison_id in comparison_pairs:
                prior = comparison_pairs[comparison_id]
                for metric in ("Spelling_Similarity", "Phonetic_Similarity", "Semantic_Similarity"):
                    if not math.isclose(float(prior[metric]), float(row[metric]), abs_tol=1e-7):
                        raise ValueError(f"Asymmetric comparison metric for {comparison_id}: {metric}")
                for label in ("Legacy_Candidate_Label", "Legacy_Root_Match_Status"):
                    if prior[label] != row[label]:
                        raise ValueError(f"Asymmetric comparison label for {comparison_id}: {label}")
                prior["Directed_Row_Count"] += 1
            else:
                comparison_pairs[comparison_id] = row

            lang_form_a = (comparison[f"lang_a"], comparison[f"word_a"].casefold())
            lang_form_b = (comparison[f"lang_b"], comparison[f"word_b"].casefold())
            sense_id_a = active_senses[0].get("source_sense_id", "")
            sense_id_b = active_senses[1].get("source_sense_id", "")
            pair_lookup[(case_id, *lang_form_a, sense_id_a, *lang_form_b, sense_id_b)] = comparison_id
            pair_lookup[(case_id, *lang_form_b, sense_id_b, *lang_form_a, sense_id_a)] = comparison_id

        for match in case.get("pair_claim_matches", []):
            source_key = match.get("source_entry", {}).get("source_entry_key", "")
            source_claim = match.get("claim", {})
            evidence = source_claim.get("evidence") or {}
            source_claim_shape = {
                "template_index": evidence.get("template_index"),
                "template_name": evidence.get("template_name"),
                "relation": source_claim.get("relation"),
                "args": evidence.get("args") or {},
            }
            claim_id = _claim_id(source_key, source_claim_shape)
            forms = match.get("candidate", {}).get("forms", [])
            if len(forms) != 2:
                continue
            source_active = match.get("source_active_sense", {}).get("source_sense_id", "")
            target_active = match.get("target_form_match", {}).get("active_sense_id", "")
            source_form = next((item for item in forms if item.get("language_code") == match.get("source_entry", {}).get("language_code") and item.get("word", "").casefold() == match.get("source_entry", {}).get("word", "").casefold()), {})
            target_form = next((item for item in forms if item is not source_form), {})
            case_comparisons = [
                (key, value) for key, value in pair_lookup.items() if key[0] == case_id
            ]
            comparison_id = ""
            for key, value in case_comparisons:
                if (
                    key[1] == source_form.get("language_code")
                    and key[2] == source_form.get("word", "").casefold()
                    and key[3] == source_active
                    and key[4] == target_form.get("language_code")
                    and key[5] == target_form.get("word", "").casefold()
                    and key[6] == target_active
                ):
                    comparison_id = value
                    break
            if not comparison_id:
                raise ValueError(f"No comparison row for source claim match {match.get('match_id')}")
            pending_matches.append((match, claim_id, comparison_id))

    # Entries referenced by the source data must exist before writing linked tables.
    languages = [
        {"ID": code, "Name": name}
        for code, name in sorted(LANGUAGES.items())
        if code in {row["Language_ID"] for row in entries_by_key.values()} | {row["Language_ID"] for row in forms_by_id.values()}
    ]
    language_ids = {row["ID"] for row in languages}
    if any(row["Language_ID"] not in language_ids for row in entries_by_key.values()):
        raise ValueError("Entry references a language missing from the language table")

    entries = sorted(entries_by_key.values(), key=lambda row: row["ID"])
    senses = sorted(senses_by_key.values(), key=lambda row: row["ID"])
    claims = sorted(claims_by_id.values(), key=lambda row: row["ID"])
    components = sorted(components_by_id.values(), key=lambda row: row["ID"])
    forms = sorted(forms_by_id.values(), key=lambda row: row["ID"])
    for form in forms:
        form["Source_Entry_ID"] = entries_by_key.get(form["Source_Entry_Key"], {}).get("ID", "")
    comparisons = sorted(comparison_pairs.values(), key=lambda row: row["ID"])
    claim_matches = []
    for match, claim_id, comparison_id in pending_matches:
        if claim_id not in claims_by_id:
            raise ValueError(f"Claim match references missing source claim {claim_id}")
        claim_matches.append({
            "ID": stable_id("match", match.get("match_id")),
            "Claim_ID": claim_id,
            "Comparison_ID": comparison_id,
            "Source_Sense_ID": match.get("source_active_sense", {}).get("source_sense_id", ""),
            "Target_Identity_Status": match.get("target_form_match", {}).get("active_identity_status", ""),
            "Target_Entry_Key": match.get("target_form_match", {}).get("active_entry_key", ""),
            "Target_Sense_ID": match.get("target_form_match", {}).get("active_sense_id", ""),
            "Form_Match_Method": match.get("target_form_match", {}).get("form_match_method", ""),
            "Source_URL": match.get("source_entry", {}).get("source_url", ""),
        })
    claim_matches.sort(key=lambda row: row["ID"])

    tables = [
        ("languages.csv", ["ID", "Name"], languages),
        ("entries.csv", ["ID", "Language_ID", "Headword", "Part_Of_Speech", "Source_Entry_Key", "Etymology_Number", "Origin_Status", "Source_URL", "Source_File"], entries),
        ("senses.csv", ["ID", "Entry_ID", "Source_Sense_ID", "Glosses_JSON", "Raw_Glosses_JSON", "Tags_JSON"], senses),
        ("forms.csv", ["ID", "Language_ID", "Form", "Part_Of_Speech", "Source_Entry_ID", "Source_Entry_Key", "Source_Sense_ID", "Gloss", "Source_Identity_Status"], forms),
        ("source-claims.csv", ["ID", "Entry_ID", "Relation", "Related_Language_ID", "Related_Form", "Source_Uncertain", "Template_Name", "Template_Index", "Template_Arguments_JSON", "Source_URL"], claims),
        ("component-links.csv", ["ID", "Parent_Entry_ID", "Relation", "Component_Index", "Component_Form", "Raw_Forms_JSON", "Match_Status", "Candidate_Entry_Keys_JSON", "Evidence_JSON"], components),
        ("comparisons.csv", ["ID", "Case_ID", "Form_A_ID", "Form_B_ID", "Recorded_Root_A", "Recorded_Root_B", "Spelling_Similarity", "Phonetic_Similarity", "Semantic_Similarity", "Legacy_Candidate_Label", "Legacy_Root_Match_Status", "Directed_Row_Count"], comparisons),
        ("claim-matches.csv", ["ID", "Claim_ID", "Comparison_ID", "Source_Sense_ID", "Target_Identity_Status", "Target_Entry_Key", "Target_Sense_ID", "Form_Match_Method", "Source_URL"], claim_matches),
    ]
    _validate_table_links(tables)
    for filename, fields, rows in tables:
        _write_csv(output_dir / filename, fields, rows)

    metadata_tables = []
    for filename, fields, _ in tables:
        cols = []
        for field in fields:
            prop = {
                "ID": CLDF + "id",
                "Language_ID": CLDF + "languageReference",
                "Name": CLDF + "name",
                "Headword": CLDF + "headword",
                "Form": CLDF + "form",
                "Gloss": CLDF + "gloss",
            }.get(field)
            cols.append(_column(field, "string", required=field == "ID", property_url=prop))
        fks = []
        references = {
            "entries.csv": {"Language_ID": ("languages.csv", "ID")},
            "senses.csv": {"Entry_ID": ("entries.csv", "ID")},
            "forms.csv": {"Language_ID": ("languages.csv", "ID"), "Source_Entry_ID": ("entries.csv", "ID")},
            "source-claims.csv": {"Entry_ID": ("entries.csv", "ID")},
            "component-links.csv": {"Parent_Entry_ID": ("entries.csv", "ID")},
            "comparisons.csv": {"Form_A_ID": ("forms.csv", "ID"), "Form_B_ID": ("forms.csv", "ID")},
            "claim-matches.csv": {"Claim_ID": ("source-claims.csv", "ID"), "Comparison_ID": ("comparisons.csv", "ID")},
        }.get(filename, {})
        for field, (resource, target_column) in references.items():
            fks.append({"columnReference": [field], "reference": {"resource": resource, "columnReference": [target_column]}})
        metadata_tables.append(_table(filename, cols, foreign_keys=fks))

    metadata = {
        "@context": ["http://www.w3.org/ns/csvw", {"@language": "en"}],
        "dc:conformsTo": CLDF + "Generic",
        "dc:title": "Linduistics source-linked lexical case slice",
        "dc:description": "A bounded diagnostic export of source entries, senses, directed claims, component analyses, and candidate comparisons. Legacy labels are retained as pipeline output, not linguistic verdicts. This is not a vocabulary-wide sample.",
        "dc:source": "Wiktionary entries extracted via Kaikki/Wiktextract; each entry URL is retained in the data tables.",
        "dc:license": "https://creativecommons.org/licenses/by-sa/4.0/",
        "tables": metadata_tables,
    }
    (output_dir / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def digest(path: Path) -> str:
        h = hashlib.sha256()
        with path.open("rb") as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b""):
                h.update(block)
        return h.hexdigest()

    source_manifest_path = source_path.with_suffix(source_path.suffix + ".manifest.json")
    source_manifest = json.loads(source_manifest_path.read_text(encoding="utf-8")) if source_manifest_path.exists() else None
    source_data_manifest = None
    if source_manifest:
        source_export_name = next((name for name in source_manifest.get("inputs", {}) if name.startswith("etymology_records_")), None)
        source_data_path = source_path.parent / f"{source_export_name}.manifest.json" if source_export_name else None
        if source_data_path and source_data_path.exists():
            source_data_manifest = json.loads(source_data_path.read_text(encoding="utf-8"))
    manifest = {
        "source": source_path.name,
        "source_sha256": digest(source_path),
        "source_manifest": source_manifest_path.name if source_manifest else None,
        "source_manifest_sha256": digest(source_manifest_path) if source_manifest else None,
        "upstream_inputs": source_manifest.get("inputs", {}) if source_manifest else {},
        "source_dump_files": {
            code: {
                key: detail.get(key)
                for key in ("source_file", "source_file_sha256", "source_file_mtime", "source_file_size")
            }
            for code, detail in (source_data_manifest or {}).get("languages", {}).items()
        },
        "metadata": "metadata.json",
        "metadata_sha256": digest(output_dir / "metadata.json"),
        "tables": {filename: {"rows": len(rows), "sha256": digest(output_dir / filename)} for filename, _, rows in tables},
        "limits": [
            "The nine cases are deliberate diagnostics, not a representative sample.",
            "Source claims are attached to source entries; claim matches record whether target identity was available or ambiguous.",
            "Component candidate entry keys are candidates, not confirmed component-sense links.",
            "Legacy_Candidate_Label and Legacy_Root_Match_Status preserve old classifier output only.",
        ],
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output_dir / "README.md").write_text(
        "# Linduistics source-linked lexical case slice\n\n"
        "This is a small CLDF Generic export of nine deliberately chosen Wiktionary-derived cases. "
        "It keeps source entries and senses, source claims, compound-component analyses, matched claim links, "
        "and computed pair comparisons in separate linked tables.\n\n"
        "The `Legacy_Candidate_Label` and `Legacy_Root_Match_Status` fields preserve old pipeline output; "
        "they are not independently verified linguistic judgments. Candidate component entries are possible matches, "
        "not resolved component senses. These cases are not representative of vocabulary coverage.\n\n"
        "Source page URLs are retained in the entry and claim tables. The extracted Wiktionary-derived text and data "
        "are attributed to Wiktionary contributors and are provided here under CC BY-SA 4.0; Wiktionary also offers "
        "the GFDL option. See https://en.wiktionary.org/wiki/Wiktionary:Copyrights and "
        "https://creativecommons.org/licenses/by-sa/4.0/. Confirm the project-wide redistribution terms before "
        "publishing a larger release.\n\n"
        "Rebuild the source-linked slice using the command in `docs/DATASET_NEXT_STEPS.md`, then run "
        "`pipeline/.venv/Scripts/python.exe pipeline/src/export_case_evidence_cldf.py --force`. "
        "`manifest.json` records hashes for the slice, its inputs, and each exported table.\n",
        encoding="utf-8",
    )
    return manifest


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=root / "pipeline/data/named_case_evidence_slice_dercat_fix.jsonl")
    parser.add_argument("--output-dir", type=Path, default=root / "pipeline/data/cldf_case_evidence_dercat_fix")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    result = export_slice(args.input, args.output_dir, force=args.force)
    print(json.dumps({"tables": result["tables"]}, indent=2))


if __name__ == "__main__":
    main()
