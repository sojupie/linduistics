"""Attach extracted etymology claims to the exact source sense in comparison rows.

Claims remain evidence records, not automatic pair classifications. The claim's
entry/form scope and any unresolved target identity are preserved in the sense
JSON already returned by the application.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from classifier import classify_pair
from extract_etymology_records import clean_etymology_root


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def candidate_key(forms: list[dict]) -> tuple[tuple[str, str], tuple[str, str]]:
    identities = tuple(sorted(
        (str(form["language_code"]), str(form["word"])) for form in forms
    ))
    if len(identities) != 2 or identities[0][0] == identities[1][0]:
        raise ValueError(f"Expected two forms in different languages: {forms!r}")
    return identities  # type: ignore[return-value]


def _claim_payload(match: dict) -> dict:
    """Keep source, scope, and identity evidence while dropping display labels."""
    source = match["source_entry"]
    claim = match["claim"]
    active_sense = match["source_active_sense"]
    target = match["target_form_match"]
    return {
        "match_id": match["match_id"],
        "relation": claim["relation"],
        "scope": claim.get("scope", {"source": "entry", "target": "form"}),
        "source_uncertain": claim.get("source_uncertain"),
        "analysis_basis": claim.get("analysis_basis"),
        "related_language": claim["related_language"],
        "related_form": claim["related_form"],
        "evidence": claim.get("evidence", {}),
        "source_entry": {
            key: source.get(key)
            for key in (
                "source", "source_file", "source_url", "source_entry_key",
                "language_code", "word", "part_of_speech", "etymology_number",
            )
        },
        "source_active_sense": {
            "source_sense_id": active_sense.get("source_sense_id"),
            "gloss": active_sense.get("gloss"),
            "etymological_root": active_sense.get("etymological_root"),
        },
        "target_form_match": {
            key: target.get(key)
            for key in (
                "language_code", "form", "active_entry_key", "active_sense_id",
                "active_sense_gloss", "active_sense_etymological_root",
                "active_identity_status", "form_match_method", "source_identity_candidates",
            )
        },
    }


def enrich_comparisons(
    comparisons: Path,
    source_claim_matches: Path,
    output: Path,
    *,
    force: bool = False,
) -> dict:
    import pyarrow as pa
    import pyarrow.parquet as pq

    manifest = output.with_suffix(output.suffix + ".manifest.json")
    if not force and (output.exists() or manifest.exists()):
        raise FileExistsError(f"Output exists; pass --force to replace it: {output}")

    claims_by_pair: dict[tuple, list[tuple[dict, str]]] = defaultdict(list)
    source_hash = hashlib.sha256()
    match_count = 0
    source_claim_fingerprints: set[str] = set()
    with source_claim_matches.open("rb") as stream:
        for line in stream:
            source_hash.update(line)
            if not line.strip():
                continue
            match = json.loads(line)
            fingerprint = hashlib.sha256(
                json.dumps(match, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
            ).hexdigest()
            claims_by_pair[candidate_key(match["candidate"]["forms"])].append((match, fingerprint))
            source_claim_fingerprints.add(fingerprint)
            match_count += 1

    output.parent.mkdir(parents=True, exist_ok=True)
    temp_output = output.with_suffix(output.suffix + ".tmp")
    input_file = pq.ParquetFile(comparisons)
    schema = input_file.schema_arrow
    writer = pq.ParquetWriter(temp_output, schema, compression="zstd")
    matched_rows = 0
    attached_claims = 0
    attached_fingerprints: set[str] = set()
    identity_counts: Counter[str] = Counter()
    category_before: Counter[str] = Counter()
    category_after: Counter[str] = Counter()
    relation_before: Counter[str] = Counter()
    relation_after: Counter[str] = Counter()
    root_values_normalized = 0
    scalar_root_values_rebuilt = 0
    root_rows_normalized = 0
    active_root_rows_normalized = 0
    rows_reclassified_from_root_data = 0
    category_changes = 0
    relation_changes = 0
    seen_match_ids: set[tuple] = set()
    try:
        for batch in input_file.iter_batches(batch_size=8192):
            records = batch.to_pylist()
            for row in records:
                category_before[row["category"]] += 1
                relation_before[row["etymological_relation"]] += 1
                active_roots = {}
                row_roots_normalized = False
                active_root_normalized = False
                for side in ("a", "b"):
                    senses = json.loads(row[f"senses_{side}"] or "[]")
                    active = []
                    side_roots_normalized = False
                    for sense in senses:
                        root = sense.get("etym_root")
                        if isinstance(root, str):
                            cleaned_root = clean_etymology_root(root)
                            if cleaned_root != root:
                                sense["etym_root"] = cleaned_root
                                root_values_normalized += 1
                                row_roots_normalized = True
                                side_roots_normalized = True
                                if sense.get("is_active_match"):
                                    active_root_normalized = True
                        if sense.get("is_active_match"):
                            active.append(sense)
                    if len(active) != 1:
                        raise ValueError(f"Expected one active matched sense for side {side}: {row['word_a']} / {row['word_b']}")
                    active_roots[side] = active[0].get("etym_root") or ""
                    if side_roots_normalized:
                        row[f"senses_{side}"] = json.dumps(senses, ensure_ascii=False, separators=(",", ":"))
                if row_roots_normalized:
                    root_rows_normalized += 1
                if active_root_normalized:
                    active_root_rows_normalized += 1
                scalar_roots_changed = False
                for side in ("a", "b"):
                    root = active_roots[side] or None
                    if row.get(f"etym_root_{side}") != root:
                        scalar_root_values_rebuilt += 1
                        scalar_roots_changed = True
                        row[f"etym_root_{side}"] = root
                if active_root_normalized or scalar_roots_changed:
                    rows_reclassified_from_root_data += 1
                    category, relation = classify_pair(
                        s_orth=float(row["orthographic_sim"]),
                        s_phon=float(row["phonetic_sim"]),
                        s_sem=float(row["semantic_sim"]),
                        etym_root_a=active_roots["a"],
                        etym_root_b=active_roots["b"],
                        pos_a=row["pos_a"] or "",
                        pos_b=row["pos_b"] or "",
                        direct_translation_evidence=bool(json.loads(row.get("translation_source_senses") or "[]")),
                    )
                    category_changes += category != row["category"]
                    relation_changes += relation != row["etymological_relation"]
                    row["category"] = category
                    row["etymological_relation"] = relation
                    row["shared_etym_root"] = active_roots["a"] if relation == "cognate" else None
                category_after[row["category"]] += 1
                relation_after[row["etymological_relation"]] += 1
                key = candidate_key([
                    {"language_code": row["lang_a"], "word": row["word_a"]},
                    {"language_code": row["lang_b"], "word": row["word_b"]},
                ])
                matches = claims_by_pair.get(key, [])
                if not matches:
                    continue

                attached_to_row = 0
                for match, fingerprint in matches:
                    source = match["source_entry"]
                    active = match["source_active_sense"]
                    source_lang = source["language_code"]
                    target = match["target_form_match"]
                    if target["language_code"] != match["claim"]["related_language"]:
                        raise ValueError(f"Claim target language mismatch: {match['match_id']}")
                    if target["form"] != match["claim"]["related_form"] and target["form"].casefold() != match["claim"]["related_form"].casefold():
                        raise ValueError(f"Claim target form mismatch: {match['match_id']}")

                    side = "a" if row["lang_a"] == source_lang else "b" if row["lang_b"] == source_lang else None
                    if side is None:
                        raise ValueError(f"Source language absent from candidate: {match['match_id']}")
                    target_side = "b" if side == "a" else "a"
                    row_target_form = row[f"word_{target_side}"]
                    form_method = target.get("form_match_method")
                    target_form_matches = (
                        row_target_form == target["form"]
                        if form_method == "exact"
                        else row_target_form.casefold() == target["form"].casefold()
                        if form_method == "casefold_fallback"
                        else False
                    )
                    if row[f"lang_{target_side}"] != target["language_code"] or not target_form_matches:
                        # Only use the exact or explicit case-fold fallback chosen
                        # by the source-claim matcher; never fan out to sibling forms.
                        continue

                    senses = json.loads(row[f"senses_{side}"] or "[]")
                    source_key = source.get("source_entry_key")
                    source_sense_id = active.get("source_sense_id")
                    selected = [
                        sense for sense in senses
                        if sense.get("is_active_match")
                        and sense.get("source_entry_key") == source_key
                        and sense.get("source_sense_id") == source_sense_id
                    ]
                    if len(selected) != 1:
                        raise ValueError(
                            f"Cannot resolve claim to one active source sense: {match['match_id']}"
                        )

                    identity = (
                        row["lang_a"], row["word_a"], row["lang_b"], row["word_b"],
                        fingerprint, source_key, source_sense_id,
                        target.get("active_entry_key"), target.get("active_sense_id"),
                        target.get("active_identity_status"),
                    )
                    if identity in seen_match_ids:
                        continue
                    seen_match_ids.add(identity)
                    selected[0].setdefault("source_claims", []).append(_claim_payload(match))
                    row[f"senses_{side}"] = json.dumps(senses, ensure_ascii=False, separators=(",", ":"))
                    attached_to_row += 1
                    attached_claims += 1
                    attached_fingerprints.add(fingerprint)
                    identity_counts[target.get("active_identity_status") or "missing"] += 1

                if attached_to_row:
                    matched_rows += 1

            table = pa.Table.from_pylist(records, schema=schema)
            writer.write_table(table)
        writer.close()
        temp_output.replace(output)
    except Exception:
        writer.close()
        temp_output.unlink(missing_ok=True)
        raise

    output_hash = sha256(output)
    report = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "inputs": {
            comparisons.name: sha256(comparisons),
            source_claim_matches.name: source_hash.hexdigest(),
        },
        "output": output.name,
        "output_sha256": output_hash,
        "comparison_rows": input_file.metadata.num_rows,
        "category_counts_before_and_after": {
            "before": dict(sorted(category_before.items())),
            "after": dict(sorted(category_after.items())),
        },
        "etymological_relation_counts_before_and_after": {
            "before": dict(sorted(relation_before.items())),
            "after": dict(sorted(relation_after.items())),
        },
        "candidate_categories_and_etymological_relations_changed": bool(category_changes or relation_changes),
        "root_values_normalized": root_values_normalized,
        "scalar_root_values_rebuilt_from_active_sense": scalar_root_values_rebuilt,
        "comparison_rows_with_root_normalization": root_rows_normalized,
        "comparison_rows_with_active_root_normalization": active_root_rows_normalized,
        "comparison_rows_reclassified_from_root_data": rows_reclassified_from_root_data,
        "category_values_changed_from_root_cleanup": category_changes,
        "etymological_relation_values_changed_from_root_cleanup": relation_changes,
        "source_claim_matches": match_count,
        "comparison_rows_enriched": matched_rows,
        "source_claim_matches_attached": attached_claims,
        "target_identity_status_attached": dict(sorted(identity_counts.items())),
        "scope": "Claims are attached to the exact active source sense; target identity and claim scope remain explicit. This does not convert entry-level claims into pair-level classifications.",
        "source_claim_match_records_unmatched": len(source_claim_fingerprints - attached_fingerprints),
    }
    manifest.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    data = root / "pipeline" / "data"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--comparisons", type=Path, default=data / "all_comparisons_dercat_fix.parquet")
    parser.add_argument("--source-claim-matches", type=Path, default=data / "candidate_source_claim_matches_dercat_fix.jsonl")
    parser.add_argument("--output", type=Path, default=data / "all_comparisons_with_source_claims.parquet")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    print(json.dumps(enrich_comparisons(args.comparisons, args.source_claim_matches, args.output, force=args.force), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
