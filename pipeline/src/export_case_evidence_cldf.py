"""Export the local case evidence slice as a linked CLDF Generic dataset."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
from collections import Counter, defaultdict
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


def _template_occurrence_id(entry_key: str, claim: dict) -> str:
    return stable_id(
        "template_occurrence",
        entry_key,
        claim.get("template_index"),
        claim.get("template_name"),
        claim.get("relation"),
        claim.get("args") or {},
    )


def _claim_id(entry_key: str, claim: dict) -> str:
    return stable_id(
        "claim",
        _template_occurrence_id(entry_key, claim),
        _relation_target_id(entry_key, claim),
    )


def _relation_target_id(entry_key: str, claim: dict) -> str:
    if not claim.get("relation"):
        return ""
    return stable_id(
        "relation_target",
        entry_key,
        claim.get("relation"),
        _claim_target_scope(claim),
        claim.get("related_language") or "",
        claim.get("related_form") or "",
        claim.get("related_entity") or {},
        claim.get("components") or [],
    )


def _relation_target_row(entry_id: str, entry_key: str, claim: dict) -> dict:
    return {
        "ID": _relation_target_id(entry_key, claim),
        "Entry_ID": entry_id,
        "Claim_Source_Scope": "entry",
        "Claim_Target_Scope": _claim_target_scope(claim),
        "Relation": claim.get("relation", ""),
        "Related_Language_ID": claim.get("related_language") or "",
        "Related_Form": claim.get("related_form") or "",
        "Related_Entity_JSON": _dump(claim.get("related_entity") or {}),
        "Components_JSON": _dump(claim.get("components") or []),
    }


def _claim_target_scope(claim: dict) -> str:
    if claim.get("related_form"):
        return "form"
    if claim.get("related_entity"):
        return "entity"
    if claim.get("components"):
        return "components"
    if claim.get("related_language"):
        return "language"
    return "none"


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
        "source-claims.csv": {"Entry_ID": ("entries.csv", "ID"), "Source_Relation_Target_ID": ("source-relation-targets.csv", "ID")},
        "source-relation-targets.csv": {"Entry_ID": ("entries.csv", "ID")},
        "component-links.csv": {"Parent_Entry_ID": ("entries.csv", "ID")},
        "comparisons.csv": {"Form_A_ID": ("forms.csv", "ID"), "Form_B_ID": ("forms.csv", "ID")},
        "claim-matches.csv": {"Claim_ID": ("source-claims.csv", "ID"), "Source_Relation_Target_ID": ("source-relation-targets.csv", "ID"), "Comparison_ID": ("comparisons.csv", "ID")},
        "claim-target-resolutions.csv": {"Claim_ID": ("source-claims.csv", "ID"), "Source_Relation_Target_ID": ("source-relation-targets.csv", "ID")},
        "claim-target-candidates.csv": {"Resolution_ID": ("claim-target-resolutions.csv", "ID"), "Target_Entry_ID": ("entries.csv", "ID")},
        "claim-target-cross-references.csv": {
            "Resolution_ID": ("claim-target-resolutions.csv", "ID"),
            "Source_Claim_ID": ("source-claims.csv", "ID"),
            "Source_Relation_Target_ID": ("source-relation-targets.csv", "ID"),
            "Target_Entry_ID": ("entries.csv", "ID"),
            "Target_Claim_ID": ("source-claims.csv", "ID"),
            "Target_Relation_Target_ID": ("source-relation-targets.csv", "ID"),
        },
    }
    ids = {filename: {row["ID"] for row in rows} for filename, rows in rows_by_file.items()}
    for filename, rows in rows_by_file.items():
        if len(ids[filename]) != len(rows) or any(not re.fullmatch(r"[A-Za-z0-9_-]+", value) for value in ids[filename]):
            raise ValueError(f"Invalid or duplicate CLDF-style ID in {filename}")
        for column, (target_file, target_column) in refs.get(filename, {}).items():
            target_ids = {row[target_column] for row in rows_by_file[target_file]}
            if any(row[column] and row[column] not in target_ids for row in rows):
                raise ValueError(f"Broken reference {filename}.{column} -> {target_file}.{target_column}")
    relation_target_ids = ids.get("source-relation-targets.csv", set())
    referenced_relation_target_ids = {
        row["Source_Relation_Target_ID"]
        for row in rows_by_file.get("source-claims.csv", [])
        if row.get("Source_Relation_Target_ID")
    }
    if relation_target_ids - referenced_relation_target_ids:
        raise ValueError("Unreferenced normalized relation target")


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


def export_slice(
    source_path: Path,
    output_dir: Path,
    *,
    target_entries_path: Path | None = None,
    force: bool = False,
) -> dict:
    if output_dir.exists() and any(output_dir.iterdir()) and not force:
        raise FileExistsError(f"Output directory is not empty; pass --force to replace it: {output_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)
    cases = read_jsonl(source_path)

    entries_by_key: dict[str, dict] = {}
    senses_by_key: dict[tuple[str, str], dict] = {}
    claims_by_id: dict[str, dict] = {}
    relation_targets_by_id: dict[str, dict] = {}
    components_by_id: dict[str, dict] = {}
    shared_component_ancestors_by_id: dict[str, dict] = {}
    forms_by_id: dict[str, dict] = {}
    comparison_pairs: dict[str, dict] = {}
    pair_lookup: dict[tuple[str, str, str, str, str, str], str] = {}
    pending_matches: list[tuple[dict, str, str]] = []
    pending_target_resolutions: dict[str, dict] = {}
    pending_target_candidates: dict[tuple[str, str], dict] = {}

    for case in cases:
        case_id = case["case_id"]
        for entry in case.get("source_entries", []) + case.get("component_source_entries", []):
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
                "Etymology_Text": entry.get("etymology_text") or "",
                "Source_URL": entry.get("source_url", ""),
                "Source_File": entry.get("source_file", ""),
                "Source_Line": entry.get("source_line", ""),
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
                relation_target = _relation_target_row(entry_id, entry_key, claim)
                relation_target_id = relation_target["ID"]
                if relation_target_id:
                    relation_targets_by_id[relation_target_id] = relation_target
                claims_by_id[claim_id] = {
                    "ID": claim_id,
                    "Template_Occurrence_ID": _template_occurrence_id(entry_key, claim),
                    "Source_Relation_Target_ID": relation_target_id,
                    "Entry_ID": entry_id,
                    "Claim_Source_Scope": "entry",
                    "Claim_Target_Scope": _claim_target_scope(claim),
                    "Relation": claim.get("relation", ""),
                    "Related_Language_ID": claim.get("related_language") or "",
                    "Related_Form": claim.get("related_form") or "",
                    "Related_Entity_JSON": _dump(claim.get("related_entity") or {}),
                    "Components_JSON": _dump(claim.get("components") or []),
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
                candidate_keys = component.get("candidate_entry_keys") or []
                candidate_ids = [entries_by_key[key]["ID"] for key in candidate_keys if key in entries_by_key]
                resolution = (
                    "no_candidates" if not candidate_keys else
                    "resolved" if len(candidate_ids) == len(candidate_keys) else
                    "partially_resolved" if candidate_ids else "unresolved"
                )
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
                    "Candidate_Entry_Keys_JSON": _dump(candidate_keys),
                    "Candidate_Entry_IDs_JSON": _dump(candidate_ids),
                    "Candidate_Entry_Resolution": resolution,
                    "Evidence_JSON": _dump(evidence),
                }

        for candidate in case.get("shared_component_ancestors", []):
            ancestor = candidate.get("ancestor") or {}
            uses = {
                language: [
                    {
                        **use,
                        "parent_entry_id": entries_by_key.get(use.get("parent_entry_key", ""), {}).get("ID", ""),
                        "component_entry_id": entries_by_key.get(use.get("component_entry_key", ""), {}).get("ID", ""),
                    }
                    for use in language_uses
                ]
                for language, language_uses in (candidate.get("matched_uses_by_language") or {}).items()
            }
            candidate_id = stable_id(
                "component_ancestor", case_id, ancestor.get("language_code", ""),
                ancestor.get("form", ""), candidate.get("basis", ""),
            )
            shared_component_ancestors_by_id[candidate_id] = {
                "ID": candidate_id,
                "Case_ID": case_id,
                "Ancestor_Language_Code": ancestor.get("language_code", ""),
                "Ancestor_Form": ancestor.get("form", ""),
                "Candidate_Basis": candidate.get("basis", ""),
                "Matched_Uses_JSON": _dump(uses),
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
                "related_language": source_claim.get("related_language"),
                "related_form": source_claim.get("related_form"),
                "related_entity": source_claim.get("related_entity"),
                "components": source_claim.get("components"),
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

    if target_entries_path is not None:
        for resolution in read_jsonl(target_entries_path):
            claim_id = resolution.get("claim_id", "")
            if claim_id not in claims_by_id:
                raise ValueError(f"Target-entry resolution references missing source claim {claim_id}")
            resolution_id = stable_id("target_resolution", claim_id)
            output_resolution = {
                "ID": resolution_id,
                "Claim_ID": claim_id,
                "Source_Relation_Target_ID": claims_by_id[claim_id]["Source_Relation_Target_ID"],
                "Target_Language_Code": resolution.get("target_language", ""),
                "Claimed_Form": resolution.get("claimed_form", ""),
                "Match_Status": resolution.get("match_status", ""),
            }
            previous = pending_target_resolutions.setdefault(claim_id, output_resolution)
            if previous != output_resolution:
                raise ValueError(f"Inconsistent target-entry resolution for source claim {claim_id}")
            for target in resolution.get("candidate_entries", []):
                entry_key = target.get("source_entry_key", "")
                if not entry_key:
                    raise ValueError(f"Target-entry candidate has no source entry key for claim {claim_id}")
                entry_id = stable_id("entry", entry_key)
                if entry_key not in entries_by_key:
                    entries_by_key[entry_key] = {
                        "ID": entry_id,
                        "Language_ID": target.get("language_code", ""),
                        "Headword": target.get("word", ""),
                        "Part_Of_Speech": target.get("part_of_speech", ""),
                        "Source_Entry_Key": entry_key,
                        "Etymology_Number": target.get("etymology_number") or "",
                        "Origin_Status": "",
                        "Etymology_Text": target.get("etymology_text") or "",
                        "Source_URL": target.get("source_url", ""),
                        "Source_File": target.get("source_file", ""),
                        "Source_Line": target.get("source_line", ""),
                    }
                else:
                    existing = entries_by_key[entry_key]
                    if existing["Language_ID"] != target.get("language_code") or existing["Headword"] != target.get("word"):
                        raise ValueError(f"Conflicting source entry identity for {entry_key}")
                    for field in ("Etymology_Text", "Source_URL", "Source_File", "Source_Line"):
                        if target.get(field.lower()) and not existing.get(field):
                            existing[field] = target[field.lower()]
                for sense in target.get("source_senses", []):
                    sense_id = sense.get("id")
                    if not sense_id:
                        continue
                    senses_by_key.setdefault((entry_key, sense_id), {
                        "ID": stable_id("sense", entry_key, sense_id),
                        "Entry_ID": entry_id,
                        "Source_Sense_ID": sense_id,
                        "Glosses_JSON": _dump(sense.get("glosses") or []),
                        "Raw_Glosses_JSON": _dump(sense.get("raw_glosses") or []),
                        "Tags_JSON": _dump(sense.get("tags") or []),
                    })
                for claim in target.get("source_claims", []):
                    target_claim_id = _claim_id(entry_key, claim)
                    relation_target = _relation_target_row(entry_id, entry_key, claim)
                    relation_target_id = relation_target["ID"]
                    if relation_target_id:
                        relation_targets_by_id[relation_target_id] = relation_target
                    claims_by_id.setdefault(target_claim_id, {
                        "ID": target_claim_id,
                        "Template_Occurrence_ID": _template_occurrence_id(entry_key, claim),
                        "Source_Relation_Target_ID": relation_target_id,
                        "Entry_ID": entry_id,
                        "Claim_Source_Scope": "entry",
                        "Claim_Target_Scope": _claim_target_scope(claim),
                        "Relation": claim.get("relation", ""),
                        "Related_Language_ID": claim.get("related_language") or "",
                        "Related_Form": claim.get("related_form") or "",
                        "Related_Entity_JSON": _dump(claim.get("related_entity") or {}),
                        "Components_JSON": _dump(claim.get("components") or []),
                        "Source_Uncertain": "" if claim.get("source_uncertain") is None else str(bool(claim.get("source_uncertain"))).lower(),
                        "Template_Name": claim.get("template_name", ""),
                        "Template_Index": claim.get("template_index", ""),
                        "Template_Arguments_JSON": _dump(claim.get("args") or {}),
                        "Source_URL": target.get("source_url", ""),
                    })
                candidate_id = stable_id("target_candidate", resolution_id, entry_id)
                pending_target_candidates[(resolution_id, entry_id)] = {
                    "ID": candidate_id,
                    "Resolution_ID": resolution_id,
                    "Target_Entry_ID": entry_id,
                }

    # Entries referenced by the source data must exist before writing linked tables.
    languages = [
        {"ID": code, "Name": name}
        for code, name in sorted(LANGUAGES.items())
        if code in {row["Language_ID"] for row in entries_by_key.values()} | {row["Language_ID"] for row in forms_by_id.values()}
    ]
    language_ids = {row["ID"] for row in languages}
    if any(row["Language_ID"] not in language_ids for row in entries_by_key.values()):
        raise ValueError("Entry references a language missing from the language table")

    for entry in entries_by_key.values():
        entry.setdefault("Etymology_Text", "")
        entry.setdefault("Source_Line", "")
    entries = sorted(entries_by_key.values(), key=lambda row: row["ID"])
    senses = sorted(senses_by_key.values(), key=lambda row: row["ID"])
    claims = sorted(claims_by_id.values(), key=lambda row: row["ID"])
    relation_targets = sorted(relation_targets_by_id.values(), key=lambda row: row["ID"])
    components = sorted(components_by_id.values(), key=lambda row: row["ID"])
    shared_component_ancestors = sorted(shared_component_ancestors_by_id.values(), key=lambda row: row["ID"])
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
            "Source_Relation_Target_ID": claims_by_id[claim_id]["Source_Relation_Target_ID"],
            "Comparison_ID": comparison_id,
            "Comparison_Source_Sense_ID": match.get("source_active_sense", {}).get("source_sense_id", ""),
            "Comparison_Target_Sense_ID": match.get("target_form_match", {}).get("active_sense_id", ""),
            "Target_Identity_Status": match.get("target_form_match", {}).get("active_identity_status", ""),
            "Target_Entry_Key": match.get("target_form_match", {}).get("active_entry_key", ""),
            "Form_Match_Method": match.get("target_form_match", {}).get("form_match_method", ""),
            "Source_URL": match.get("source_entry", {}).get("source_url", ""),
        })
    claim_matches.sort(key=lambda row: row["ID"])
    target_resolutions = sorted(pending_target_resolutions.values(), key=lambda row: row["ID"])
    target_candidates = sorted(pending_target_candidates.values(), key=lambda row: row["ID"])
    entries_by_id = {row["ID"]: row for row in entries}
    claims_by_id = {row["ID"]: row for row in claims}
    candidates_by_resolution = defaultdict(list)
    claims_by_entry = defaultdict(list)
    for candidate in target_candidates:
        candidates_by_resolution[candidate["Resolution_ID"]].append(candidate)
    for claim in claims:
        claims_by_entry[claim["Entry_ID"]].append(claim)
    target_cross_references_by_id = {}
    for resolution in target_resolutions:
        source_claim = claims_by_id[resolution["Claim_ID"]]
        source_entry = entries_by_id[source_claim["Entry_ID"]]
        for candidate in candidates_by_resolution[resolution["ID"]]:
            target_entry_id = candidate["Target_Entry_ID"]
            for target_claim in claims_by_entry[target_entry_id]:
                if (
                    target_claim["Related_Language_ID"].casefold() != source_entry["Language_ID"].casefold()
                    or target_claim["Related_Form"] != source_entry["Headword"]
                ):
                    continue
                cross_reference_id = stable_id(
                    "claim_cross_reference",
                    resolution["ID"],
                    target_entry_id,
                    target_claim["ID"],
                )
                target_cross_references_by_id[cross_reference_id] = {
                    "ID": cross_reference_id,
                    "Resolution_ID": resolution["ID"],
                    "Source_Claim_ID": source_claim["ID"],
                    "Source_Relation_Target_ID": source_claim["Source_Relation_Target_ID"],
                    "Target_Entry_ID": target_entry_id,
                    "Target_Claim_ID": target_claim["ID"],
                    "Target_Relation_Target_ID": target_claim["Source_Relation_Target_ID"],
                }
    target_cross_references = sorted(target_cross_references_by_id.values(), key=lambda row: row["ID"])

    tables = [
        ("languages.csv", ["ID", "Name"], languages),
        ("entries.csv", ["ID", "Language_ID", "Headword", "Part_Of_Speech", "Source_Entry_Key", "Etymology_Number", "Origin_Status", "Etymology_Text", "Source_URL", "Source_File", "Source_Line"], entries),
        ("senses.csv", ["ID", "Entry_ID", "Source_Sense_ID", "Glosses_JSON", "Raw_Glosses_JSON", "Tags_JSON"], senses),
        ("forms.csv", ["ID", "Language_ID", "Form", "Part_Of_Speech", "Source_Entry_ID", "Source_Entry_Key", "Source_Sense_ID", "Gloss", "Source_Identity_Status"], forms),
        ("source-relation-targets.csv", ["ID", "Entry_ID", "Claim_Source_Scope", "Claim_Target_Scope", "Relation", "Related_Language_ID", "Related_Form", "Related_Entity_JSON", "Components_JSON"], relation_targets),
        ("source-claims.csv", ["ID", "Template_Occurrence_ID", "Source_Relation_Target_ID", "Entry_ID", "Claim_Source_Scope", "Claim_Target_Scope", "Relation", "Related_Language_ID", "Related_Form", "Related_Entity_JSON", "Components_JSON", "Source_Uncertain", "Template_Name", "Template_Index", "Template_Arguments_JSON", "Source_URL"], claims),
        ("component-links.csv", ["ID", "Parent_Entry_ID", "Relation", "Component_Index", "Component_Form", "Raw_Forms_JSON", "Match_Status", "Candidate_Entry_Keys_JSON", "Candidate_Entry_IDs_JSON", "Candidate_Entry_Resolution", "Evidence_JSON"], components),
        ("shared-component-ancestor-candidates.csv", ["ID", "Case_ID", "Ancestor_Language_Code", "Ancestor_Form", "Candidate_Basis", "Matched_Uses_JSON"], shared_component_ancestors),
        ("comparisons.csv", ["ID", "Case_ID", "Form_A_ID", "Form_B_ID", "Recorded_Root_A", "Recorded_Root_B", "Spelling_Similarity", "Phonetic_Similarity", "Semantic_Similarity", "Legacy_Candidate_Label", "Legacy_Root_Match_Status", "Directed_Row_Count"], comparisons),
        ("claim-matches.csv", ["ID", "Claim_ID", "Source_Relation_Target_ID", "Comparison_ID", "Comparison_Source_Sense_ID", "Comparison_Target_Sense_ID", "Target_Identity_Status", "Target_Entry_Key", "Form_Match_Method", "Source_URL"], claim_matches),
        ("claim-target-resolutions.csv", ["ID", "Claim_ID", "Source_Relation_Target_ID", "Target_Language_Code", "Claimed_Form", "Match_Status"], target_resolutions),
        ("claim-target-candidates.csv", ["ID", "Resolution_ID", "Target_Entry_ID"], target_candidates),
        ("claim-target-cross-references.csv", ["ID", "Resolution_ID", "Source_Claim_ID", "Source_Relation_Target_ID", "Target_Entry_ID", "Target_Claim_ID", "Target_Relation_Target_ID"], target_cross_references),
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
            description = {
                "Candidate_Basis": "Rule used to project recorded component ancestry across language-specific parent forms.",
                "Matched_Uses_JSON": "Component uses linked to exported parent and component entry IDs; candidate evidence, not a confirmed whole-word relationship.",
                "Candidate_Entry_IDs_JSON": "Exported entry IDs for component-entry candidates; compare with the raw keys and resolution status to identify missing source records.",
                "Candidate_Entry_Resolution": "Whether every raw component candidate entry key resolved to a source entry in this export.",
                "Claim_Source_Scope": "The source etymology claim is attached to this lexical entry, not to an individually identified sense.",
                "Claim_Target_Scope": "The normalized claim target is a form, entity, component list, language only, or no target; form-level claims do not identify one target sense.",
                "Source_Relation_Target_ID": "Link to the normalized relation and target within the source entry. Multiple template occurrences can point to the same row; their own uncertainty and raw arguments stay on source-claims.csv.",
                "Template_Occurrence_ID": "Stable identity for the raw source template and its arguments; one template can expand to multiple normalized target claims.",
                "Template_Name": "Wiktionary template occurrence preserved from the source etymology data.",
                "Template_Index": "Position of this template occurrence within the source entry.",
                "Source_Uncertain": "Uncertainty flag attached to this template occurrence; missing and explicit false remain distinct.",
                "Related_Entity_JSON": "Normalized entity reference when the source claim points to an entity rather than a plain related form.",
                "Components_JSON": "Normalized component references carried by this source claim; component candidate matching is detailed in component-links.csv.",
                "Comparison_Source_Sense_ID": "Active source sense selected for the linked comparison; the entry-level source claim is not asserted to apply only to this sense.",
                "Comparison_Target_Sense_ID": "Active target sense selected for the linked comparison; the form-level source claim does not identify this sense.",
                "Etymology_Text": "Source etymology text for this entry when present in the selected case data or target-entry lookup.",
                "Source_Line": "One-based line number in the recorded local source dump; populated for entries added from the target-entry lookup.",
                "Match_Status": "Result of exact-form lookup in the recorded local dumps; it resolves candidate entries, not senses or historical truth.",
                "Target_Language_Code": "Language code named by the source claim; it may be absent from the local dump set and is not a language-table foreign key.",
                "Resolution_ID": "Form-level source-claim lookup result referenced by this candidate entry.",
                "Target_Entry_ID": "Source entry identified as a spelling candidate; this link does not establish a target sense or relationship.",
                "Source_Claim_ID": "Target-specific source claim that initiated the form lookup.",
                "Target_Claim_ID": "Target-entry claim that points back to the source entry's exact language and form; this is an internal source cross-reference, not independent confirmation.",
                "Target_Relation_Target_ID": "Normalized relation-and-target record for the target-entry cross-reference.",
            }.get(field)
            cols.append(_column(field, "string", required=field == "ID", property_url=prop, description=description))
        fks = []
        references = {
            "entries.csv": {"Language_ID": ("languages.csv", "ID")},
            "senses.csv": {"Entry_ID": ("entries.csv", "ID")},
            "forms.csv": {"Language_ID": ("languages.csv", "ID"), "Source_Entry_ID": ("entries.csv", "ID")},
            "source-claims.csv": {"Entry_ID": ("entries.csv", "ID"), "Source_Relation_Target_ID": ("source-relation-targets.csv", "ID")},
            "source-relation-targets.csv": {"Entry_ID": ("entries.csv", "ID")},
            "component-links.csv": {"Parent_Entry_ID": ("entries.csv", "ID")},
            "comparisons.csv": {"Form_A_ID": ("forms.csv", "ID"), "Form_B_ID": ("forms.csv", "ID")},
            "claim-matches.csv": {"Claim_ID": ("source-claims.csv", "ID"), "Source_Relation_Target_ID": ("source-relation-targets.csv", "ID"), "Comparison_ID": ("comparisons.csv", "ID")},
            "claim-target-resolutions.csv": {"Claim_ID": ("source-claims.csv", "ID"), "Source_Relation_Target_ID": ("source-relation-targets.csv", "ID")},
            "claim-target-candidates.csv": {"Resolution_ID": ("claim-target-resolutions.csv", "ID"), "Target_Entry_ID": ("entries.csv", "ID")},
            "claim-target-cross-references.csv": {
                "Resolution_ID": ("claim-target-resolutions.csv", "ID"),
                "Source_Claim_ID": ("source-claims.csv", "ID"),
                "Source_Relation_Target_ID": ("source-relation-targets.csv", "ID"),
                "Target_Entry_ID": ("entries.csv", "ID"),
                "Target_Claim_ID": ("source-claims.csv", "ID"),
                "Target_Relation_Target_ID": ("source-relation-targets.csv", "ID"),
            },
        }.get(filename, {})
        for field, (resource, target_column) in references.items():
            fks.append({"columnReference": [field], "reference": {"resource": resource, "columnReference": [target_column]}})
        metadata_tables.append(_table(filename, cols, foreign_keys=fks))

    metadata = {
        "@context": ["http://www.w3.org/ns/csvw", {"@language": "en"}],
        "dc:conformsTo": CLDF + "Generic",
        "dc:title": "Linduistics source-linked lexical case slice",
        "dc:description": "A bounded diagnostic export of source entries, senses, normalized relation targets, template-level claim evidence, component analyses, form-level target-entry candidates and their exact return-mention cross-references, projected shared-component ancestry candidates, and pair comparisons. Legacy labels are retained as pipeline output, not linguistic verdicts. This is not a vocabulary-wide sample.",
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
    target_manifest_path = (
        target_entries_path.with_suffix(target_entries_path.suffix + ".manifest.json")
        if target_entries_path is not None else None
    )
    source_data_manifest = None
    if source_manifest:
        source_export_name = next((name for name in source_manifest.get("inputs", {}) if name.startswith("etymology_records_")), None)
        source_data_path = source_path.parent / f"{source_export_name}.manifest.json" if source_export_name else None
        if source_data_path and source_data_path.exists():
            source_data_manifest = json.loads(source_data_path.read_text(encoding="utf-8"))
    claim_by_id = {row["ID"]: row for row in claims}
    comparison_by_id = {row["ID"]: row for row in comparisons}
    label_counts = Counter(row["Legacy_Candidate_Label"] for row in comparisons)
    matched_evidence = defaultdict(Counter)
    for match in claim_matches:
        label = comparison_by_id[match["Comparison_ID"]]["Legacy_Candidate_Label"]
        relation = claim_by_id[match["Claim_ID"]]["Relation"]
        matched_evidence[label][f"{relation}:{match['Target_Identity_Status']}"] += 1
    manifest = {
        "source": source_path.name,
        "source_sha256": digest(source_path),
        "source_manifest": source_manifest_path.name if source_manifest else None,
        "source_manifest_sha256": digest(source_manifest_path) if source_manifest else None,
        "target_entry_lookup": ({
            "file": target_entries_path.name,
            "sha256": digest(target_entries_path),
            "manifest": target_manifest_path.name if target_manifest_path and target_manifest_path.exists() else None,
            "manifest_sha256": digest(target_manifest_path) if target_manifest_path and target_manifest_path.exists() else None,
        } if target_entries_path is not None else None),
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
        "summary": {
            "comparisons_by_legacy_label": dict(sorted(label_counts.items())),
            "component_candidate_resolution": dict(sorted(Counter(row["Candidate_Entry_Resolution"] for row in components).items())),
            "source_claim_records": len(claims),
            "source_template_occurrences": len({row["Template_Occurrence_ID"] for row in claims}),
            "relation_claim_records": sum(bool(row["Source_Relation_Target_ID"]) for row in claims),
            "normalized_relation_targets": len(relation_targets),
            "repeated_relation_claim_records_per_target": (
                sum(bool(row["Source_Relation_Target_ID"]) for row in claims) - len(relation_targets)
            ),
            "matched_source_claim_records_by_legacy_label": {
                label: dict(sorted(relations.items()))
                for label, relations in sorted(matched_evidence.items())
            },
            "target_claim_cross_references": len(target_cross_references),
            "target_claim_cross_references_by_relation_pair": dict(sorted(Counter(
                f"{claims_by_id[row['Source_Claim_ID']]['Relation']}->{claims_by_id[row['Target_Claim_ID']]['Relation']}"
                for row in target_cross_references
            ).items())),
        },
        "limits": [
            "The thirteen cases are deliberate diagnostics, not a representative sample.",
            "Source claims are attached to source entries; claim matches record whether target identity was available or ambiguous.",
            "Component candidate entry keys are candidates, not confirmed component-sense links.",
            "Component entries and their source claims are included to make candidate root evidence inspectable; they do not resolve which component sense is intended.",
            "Target-entry resolution and candidate tables come from a separate spelling lookup. They preserve all candidates and do not resolve target senses or confirm the source claim.",
            "Shared-component ancestor rows are projections from recorded component candidates; they are not confirmed whole-word relationships.",
            "Legacy_Candidate_Label and Legacy_Root_Match_Status preserve old classifier output only.",
        ],
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output_dir / "README.md").write_text(
        "# Linduistics source-linked lexical case slice\n\n"
        "This is a small CLDF Generic export of thirteen deliberately chosen Wiktionary-derived cases. "
        "It keeps source entries and senses, normalized relation targets, source-template claim evidence, compound-component analyses, matched claim links, "
        "shared-component ancestor candidates, form-level target-entry candidates, and computed pair comparisons in separate tables.\n\n"
        "Source claims record their originating entry and one normalized target scope (form, entity, components, language, or none). A target template that expands into several claims retains one Template_Occurrence_ID across its rows. "
        "`source-relation-targets.csv` groups identical normalized relation targets within an entry; `source-claims.csv` retains each expanded claim, its template identity, uncertainty, and raw arguments. `claim-target-cross-references.csv` links exact return mentions in candidate target entries; these are Wiktionary cross-references, not independent confirmation. "
        "Sense IDs on claim-match rows identify "
        "the comparison's selected senses for context; they do not narrow the source claim to those senses. "
        "Claims without a single related form retain their normalized entity or component targets, or have target scope `none`.\n\n"
        "The `Legacy_Candidate_Label` and `Legacy_Root_Match_Status` fields preserve old pipeline output; "
        "they are not independently verified linguistic judgments. Candidate component entries are possible matches, "
        "not resolved component senses; `Candidate_Entry_Resolution` records whether each possible entry was included. "
        "Shared-component ancestor rows project those matches onto candidate roots; "
        "they are not confirmed component senses or whole-word histories. These cases are not representative of vocabulary coverage.\n\n"
        "Source page URLs are retained in the entry and claim tables. The extracted Wiktionary-derived text and data "
        "are attributed to Wiktionary contributors and are provided here under CC BY-SA 4.0; Wiktionary also offers "
        "the GFDL option. See https://en.wiktionary.org/wiki/Wiktionary:Copyrights and "
        "https://creativecommons.org/licenses/by-sa/4.0/. Confirm the project-wide redistribution terms before "
        "publishing a larger release.\n\n"
        "Rebuild the source-linked slice using the command in `docs/DATASET_NEXT_STEPS.md`, then run "
        "`pipeline/.venv/Scripts/python.exe pipeline/src/audit_case_claim_target_entries.py --force` and "
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
    parser.add_argument("--target-entries", type=Path, default=root / "pipeline/data/case_claim_target_entries.jsonl")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    result = export_slice(args.input, args.output_dir, target_entries_path=args.target_entries, force=args.force)
    print(json.dumps({"tables": result["tables"]}, indent=2))


if __name__ == "__main__":
    main()
