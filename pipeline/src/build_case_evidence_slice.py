"""Build a compact, source-linked review slice for known lexical edge cases."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


CASES = {
    "bank": [("sv", "bank", "en", "bank"), ("da", "bank", "en", "bank"), ("de", "Bank", "en", "bank"), ("nb", "bank", "en", "bank")],
    "bankman": [("sv", "bankman", "en", "Bankman")],
    "fleece": [("sv", "fleece", "en", "fleece"), ("de", "Fleece", "en", "fleece")],
    "clown": [("sv", "clown", "en", "clown"), ("da", "klovn", "en", "clown"), ("nb", "klovn", "en", "clown"), ("de", "Clown", "en", "clown")],
    "ombudsman": [("sv", "ombudsman", "en", "ombudsman"), ("da", "ombudsmand", "en", "ombudsman"), ("nb", "ombudsmann", "en", "ombudsman"), ("de", "Ombudsmann", "en", "ombudsman")],
    "sandbank": [("sv", "sandbank", "en", "sandbank"), ("da", "sandbank", "en", "sandbank"), ("nb", "sandbanke", "en", "sandbank"), ("de", "Sandbank", "en", "sandbank")],
    "gut": [("de", "gut", "da", "god"), ("de", "gut", "sv", "god"), ("de", "gut", "en", "good")],
    "arbeit": [("da", "arbejde", "sv", "arbete")],
    "kurv": [("da", "kurv", "nb", "kurv")],
    "oversatta": [("da", "oversætte", "sv", "översätta")],
    "ramslog": [("da", "ramsløg", "sv", "ramslök")],
    "bereave": [("de", "berauben", "en", "bereave")],
    "stepdaughter": [("de", "Stieftochter", "en", "stepdaughter")],
    "blive": [("da", "blive", "nb", "blive")],
    "wall_road": [("da", "væg", "sv", "väg")],
}

COMPARISON_FIELDS = (
    "lang_a", "word_a", "pos_a", "def_a", "etym_root_a", "etym_text_a",
    "lang_b", "word_b", "pos_b", "def_b", "etym_root_b", "etym_text_b",
    "category", "etymological_relation", "orthographic_sim", "phonetic_sim", "semantic_sim",
    "senses_a", "senses_b", "translation_source_senses",
)


def case_for_candidate(row: dict) -> str | None:
    for case_id, variants in CASES.items():
        for lang_a, word_a, lang_b, word_b in variants:
            sides = (row["lang_a"], row["word_a"].casefold(), row["lang_b"], row["word_b"].casefold())
            forward = (lang_a, word_a.casefold(), lang_b, word_b.casefold())
            reverse = (lang_b, word_b.casefold(), lang_a, word_a.casefold())
            if sides in (forward, reverse):
                return case_id
    return None


def build_slice(
    comparisons: Path,
    source_records: Path,
    claim_matches: Path,
    component_candidates: Path,
    output: Path,
    force: bool = False,
    shared_ancestor_candidates: Path | None = None,
) -> dict:
    import pyarrow.parquet as pq

    manifest_path = output.with_suffix(output.suffix + ".manifest.json")
    if not force and (output.exists() or manifest_path.exists()):
        raise FileExistsError(f"Output already exists; pass --force to replace it: {output}")

    cases: dict[str, dict] = {
        key: {"case_id": key, "comparisons": [], "source_entries": [], "component_source_entries": [], "pair_claim_matches": [], "component_links": [], "shared_component_ancestors": []}
        for key in CASES
    }
    active_entry_keys: dict[str, set[str]] = defaultdict(set)
    active_sense_ids: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))

    for batch in pq.ParquetFile(comparisons).iter_batches(columns=list(COMPARISON_FIELDS)):
        for row in batch.to_pylist():
            case_id = case_for_candidate(row)
            if case_id is None:
                continue
            comparison = {key: row.get(key) for key in COMPARISON_FIELDS}
            for side in ("a", "b"):
                comparison[f"senses_{side}"] = json.loads(comparison[f"senses_{side}"] or "[]")
                for sense in comparison[f"senses_{side}"]:
                    if sense.get("is_active_match"):
                        entry_key = sense.get("source_entry_key")
                        sense_id = sense.get("source_sense_id")
                        if entry_key:
                            active_entry_keys[case_id].add(entry_key)
                        if entry_key and sense_id:
                            active_sense_ids[case_id][entry_key].add(sense_id)
            if comparison["translation_source_senses"]:
                comparison["translation_source_senses"] = json.loads(comparison["translation_source_senses"])
            cases[case_id]["comparisons"].append(comparison)

    entry_cases: dict[str, set[str]] = defaultdict(set)
    for case_id, entry_keys in active_entry_keys.items():
        for entry_key in entry_keys:
            entry_cases[entry_key].add(case_id)
    component_entry_cases: dict[str, set[str]] = defaultdict(set)

    with gzip.open(component_candidates, "rt", encoding="utf-8") as source:
        for line in source:
            if not line.strip():
                continue
            record = json.loads(line)
            entry_key = record.get("source_entry_key")
            for case_id in entry_cases.get(entry_key, ()):
                cases[case_id]["component_links"].append(record)
                for component in record.get("components", []):
                    for component_entry_key in component.get("candidate_entry_keys", []):
                        component_entry_cases[component_entry_key].add(case_id)

    if shared_ancestor_candidates:
        with gzip.open(shared_ancestor_candidates, "rt", encoding="utf-8") as source:
            for line in source:
                if not line.strip():
                    continue
                candidate = json.loads(line)
                for case_id, entry_keys in active_entry_keys.items():
                    matched_uses = {
                        language: [use for use in uses if use.get("parent_entry_key") in entry_keys]
                        for language, uses in candidate.get("component_uses_by_language", {}).items()
                    }
                    matched_uses = {language: uses for language, uses in matched_uses.items() if uses}
                    if len(matched_uses) >= 2:
                        cases[case_id]["shared_component_ancestors"].append({
                            "ancestor": candidate.get("ancestor", {}),
                            "basis": candidate.get("basis", ""),
                            "matched_uses_by_language": matched_uses,
                        })
                        for uses in matched_uses.values():
                            for use in uses:
                                component_entry_cases[use["component_entry_key"]].add(case_id)

    for line in source_records.open(encoding="utf-8"):
        if not line.strip():
            continue
        record = json.loads(line)
        entry_key = record.get("source_entry_key")
        for case_id in entry_cases.get(entry_key, ()):
            record_sense_ids = set(record.get("sense_ids", []))
            active_ids = active_sense_ids[case_id][entry_key]
            cases[case_id]["source_entries"].append({
                **record,
                "comparison_sense_alignment": {
                    "active_comparison_sense_ids": sorted(active_ids),
                    "matched_source_sense_ids": sorted(active_ids & record_sense_ids),
                    "status": "exact_sense_overlap" if active_ids & record_sense_ids else "entry_level_only",
                },
            })
        for case_id in component_entry_cases.get(entry_key, set()) - entry_cases.get(entry_key, set()):
            cases[case_id]["component_source_entries"].append(record)

    with claim_matches.open(encoding="utf-8") as source:
        for line in source:
            if not line.strip():
                continue
            match = json.loads(line)
            forms = match.get("candidate", {}).get("forms", [])
            if len(forms) != 2:
                continue
            case_id = case_for_candidate({
                "lang_a": forms[0].get("language_code"), "word_a": forms[0].get("word", ""),
                "lang_b": forms[1].get("language_code"), "word_b": forms[1].get("word", ""),
            })
            if case_id is not None:
                cases[case_id]["pair_claim_matches"].append(match)

    output.parent.mkdir(parents=True, exist_ok=True)
    temp_output = output.with_suffix(output.suffix + ".tmp")
    try:
        with temp_output.open("w", encoding="utf-8", newline="\n") as destination:
            for case in cases.values():
                case["source_entries"].sort(key=lambda item: item.get("source_entry_key", ""))
                case["component_source_entries"].sort(key=lambda item: item.get("source_entry_key", ""))
                case["pair_claim_matches"].sort(key=lambda item: item.get("match_id", ""))
                case["component_links"].sort(key=lambda item: (item.get("source_entry_key", ""), item.get("relation", "")))
                case["shared_component_ancestors"].sort(key=lambda item: (
                    item.get("ancestor", {}).get("language_code", ""),
                    item.get("ancestor", {}).get("form", ""),
                    item.get("basis", ""),
                ))
                destination.write(json.dumps(case, ensure_ascii=False, separators=(",", ":")) + "\n")
        temp_output.replace(output)
    except Exception:
        temp_output.unlink(missing_ok=True)
        raise

    def digest(path: Path) -> str:
        value = hashlib.sha256()
        with path.open("rb") as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b""):
                value.update(block)
        return value.hexdigest()

    manifest = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "inputs": {
            path.name: digest(path)
            for path in (comparisons, source_records, claim_matches, component_candidates, shared_ancestor_candidates)
            if path is not None
        },
        "output": output.name,
        "output_sha256": digest(output),
        "case_counts": {
            case_id: {
                "comparison_candidates": len(case["comparisons"]),
                "source_entries": len(case["source_entries"]),
                "component_source_entries": len(case["component_source_entries"]),
                "pair_claim_matches": len(case["pair_claim_matches"]),
                "component_claims": len(case["component_links"]),
                "shared_component_ancestor_candidates": len(case["shared_component_ancestors"]),
            }
            for case_id, case in cases.items()
        },
        "limits": [
            "Comparison rows are pipeline candidates, not confirmed historical relationships.",
            "Etymology claims remain attached to source entries; they are not promoted to the active comparison sense.",
            "Pair-specific claim matches retain source and target identity status; entry-level wording does not prove the claim applies to an aligned sense.",
            "Component entry matches retain all exact entry and sense candidates and do not resolve compound sense.",
        ],
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    data = root / "pipeline/data"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--comparisons", type=Path, default=data / "all_comparisons_source_identity.parquet")
    parser.add_argument("--source-records", type=Path, default=data / "etymology_records_all.jsonl")
    parser.add_argument("--claim-matches", type=Path, default=data / "candidate_source_claim_matches_all_pairs.jsonl")
    parser.add_argument("--component-candidates", type=Path, default=data / "component_entry_candidates_source_identity.jsonl.gz")
    parser.add_argument("--shared-ancestor-candidates", type=Path, default=data / "component_shared_ancestor_candidates_source_identity.jsonl.gz")
    parser.add_argument("--output", type=Path, default=data / "named_case_evidence_slice.jsonl")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    manifest = build_slice(
        args.comparisons, args.source_records, args.claim_matches, args.component_candidates,
        args.output, args.force, args.shared_ancestor_candidates,
    )
    print(json.dumps(manifest["case_counts"], indent=2))


if __name__ == "__main__":
    main()
