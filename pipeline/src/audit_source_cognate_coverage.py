"""Count Wiktionary cognate mentions that reach active comparison senses."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path


def audit_coverage(source_records: Path, comparisons: Path) -> dict[tuple[str, str], dict[str, int]]:
    import pyarrow.parquet as pq

    active_candidates: dict[tuple[str, str, str, str], set[bool]] = defaultdict(set)
    table = pq.read_table(comparisons, columns=["lang_a", "lang_b", "word_b", "senses_a", "senses_b"])
    for row in table.to_pylist():
        sense_a = next((sense for sense in json.loads(row["senses_a"]) if sense.get("is_active_match")), {})
        sense_b = next((sense for sense in json.loads(row["senses_b"]) if sense.get("is_active_match")), {})
        if not sense_a.get("source_entry_key") or not sense_a.get("source_sense_id") or sense_a.get("source_identity_ambiguous"):
            continue
        target_identity_known = bool(
            sense_b.get("source_entry_key")
            and sense_b.get("source_sense_id")
            and not sense_b.get("source_identity_ambiguous")
        )
        key = (row["lang_a"], sense_a["source_entry_key"], row["lang_b"], row["word_b"].casefold())
        active_candidates[key].add(target_identity_known)

    claims: dict[tuple[str, str], set[tuple[str, int | None, str, str]]] = defaultdict(set)
    with source_records.open(encoding="utf-8") as source:
        for line in source:
            record = json.loads(line)
            source_lang = record.get("language_code")
            entry_key = record.get("source_entry_key")
            for claim in record.get("claims", []):
                target_lang = claim.get("related_language")
                form = claim.get("related_form")
                if (
                    claim.get("relation") == "cognate_mention"
                    and source_lang and target_lang and source_lang != target_lang
                    and entry_key and isinstance(form, str) and form
                ):
                    claims[(source_lang, target_lang)].add((
                        entry_key, claim.get("template_index"), target_lang, form.casefold()
                    ))

    counts = defaultdict(lambda: {"source_claims": 0, "active_source_entry_candidates": 0, "both_active_sense_ids": 0})
    for (source_lang, target_lang), source_claims in claims.items():
        for entry_key, _, related_lang, form in source_claims:
            values = counts[(source_lang, target_lang)]
            values["source_claims"] += 1
            candidate_key = (source_lang, entry_key, related_lang, form)
            if candidate_key in active_candidates:
                values["active_source_entry_candidates"] += 1
                if True in active_candidates[candidate_key]:
                    values["both_active_sense_ids"] += 1
    return dict(counts)


def main() -> None:
    project_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-records", type=Path, default=project_root / "pipeline/data/etymology_records.jsonl")
    parser.add_argument("--comparisons", type=Path, default=project_root / "pipeline/data/all_comparisons.parquet")
    args = parser.parse_args()
    counts = audit_coverage(args.source_records, args.comparisons)
    pairs = (("sv", "da"), ("sv", "nb"), ("de", "en"))
    print("Pair | source claims | active source-entry candidates | both active sense IDs")
    for source_lang, target_lang in pairs:
        forward = counts.get((source_lang, target_lang), {})
        reverse = counts.get((target_lang, source_lang), {})
        print(
            f"{source_lang}-{target_lang} | "
            f"{forward.get('source_claims', 0) + reverse.get('source_claims', 0)} | "
            f"{forward.get('active_source_entry_candidates', 0) + reverse.get('active_source_entry_candidates', 0)} | "
            f"{forward.get('both_active_sense_ids', 0) + reverse.get('both_active_sense_ids', 0)}"
        )


if __name__ == "__main__":
    main()
