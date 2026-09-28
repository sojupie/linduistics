"""Join selected live comparison rows to their Wiktionary source entries."""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen


DEFAULT_WORDS = ["fleece", "clown", "ombudsman", "bankman", "sandbank", "gift"]
PAIR_CATEGORIES = ("true_cognate", "partial_cognate", "false_friend", "translation_pair", "other")
PAIR_FIELDS = (
    "id", "lang_a", "word_a", "pos_a", "def_a", "etym_root_a", "etym_text_a",
    "lang_b", "word_b", "pos_b", "def_b", "etym_root_b", "etym_text_b",
    "shared_etym_root", "category", "etymological_relation", "orthographic_sim",
    "phonetic_sim", "semantic_sim", "senses_a", "senses_b",
)


def load_source_entries(path: Path, words: set[str]) -> dict[tuple[str, str], list[dict]]:
    matches: dict[tuple[str, str], list[dict]] = defaultdict(list)
    folded_words = {word.casefold() for word in words}
    with path.open(encoding="utf-8") as source:
        for line in source:
            record = json.loads(line)
            word = record.get("word", "")
            if word.casefold() in folded_words:
                matches[(record["language_code"], word.casefold())].append(record)
    return matches


def matching_source_entries(entries: dict[tuple[str, str], list[dict]], language: str, word: str) -> tuple[list[dict], str]:
    candidates = entries.get((language, word.casefold()), [])
    exact = [entry for entry in candidates if entry.get("word") == word]
    if exact:
        return exact, "exact"
    return candidates, "casefold" if candidates else "none"


def select_source_entries_by_pos(entries: list[dict], pos: str | None) -> tuple[list[dict], str]:
    if not pos:
        return [], "comparison_pos_missing"
    selected = [entry for entry in entries if str(entry.get("part_of_speech", "")).casefold() == pos.casefold()]
    return selected, "matched_pos" if selected else "no_source_entry_for_comparison_pos"


def match_source_senses(comparison_senses: list[dict], entries: list[dict], comparison_pos: str | None) -> list[dict]:
    """Link only exact normalized glosses; leave paraphrases for review instead of guessing."""
    if not isinstance(comparison_senses, list):
        return []
    source_by_gloss: dict[str, list[dict]] = defaultdict(list)
    for entry in entries:
        for sense in entry.get("source_senses", []):
            if not isinstance(sense, dict):
                continue
            glosses = sense.get("glosses", [])
            if not isinstance(glosses, list):
                continue
            for gloss in glosses:
                if isinstance(gloss, str) and gloss.strip():
                    key = " ".join(unicodedata.normalize("NFC", gloss).casefold().split())
                    source_by_gloss[key].append({
                        "source_entry_key": entry["source_entry_key"],
                        "source_sense_id": sense["id"],
                        "source_gloss": gloss,
                    })

    matches = []
    expected_pos = comparison_pos.casefold() if isinstance(comparison_pos, str) else None
    for sense in comparison_senses:
        if not isinstance(sense, dict):
            continue
        gloss = sense.get("gloss")
        key = " ".join(unicodedata.normalize("NFC", gloss).casefold().split()) if isinstance(gloss, str) else ""
        sense_pos = sense.get("pos")
        pos_mismatch = (
            isinstance(sense_pos, str) and expected_pos is not None
            and sense_pos.casefold() != expected_pos
        )
        matches.append({
            "comparison_sense_id": sense.get("sense_id"),
            "comparison_sense_pos": sense_pos,
            "comparison_gloss": gloss,
            "match_method": "pos_mismatch" if pos_mismatch else "exact_gloss" if key and key in source_by_gloss else "unmatched",
            "source_senses": source_by_gloss.get(key, []) if key and not pos_mismatch else [],
        })
    return matches


def _claim_reference(entry: dict, claim: dict) -> dict:
    return {
        "source_entry_key": entry["source_entry_key"],
        "template_index": claim.get("template_index"),
        "template_name": claim.get("template_name"),
        "args": claim.get("args", {}),
        "related_language": claim.get("related_language"),
        "related_form": claim.get("related_form"),
        "source_uncertain": claim.get("source_uncertain", False),
    }


def derive_pair_source_evidence(
    entries_a: list[dict], entries_b: list[dict], lang_a: str, word_a: str, lang_b: str, word_b: str
) -> list[dict]:
    """Link explicit entry claims across this pair without turning them into classifications."""
    evidence = []
    borrowed_a: dict[tuple[str, str], list[dict]] = defaultdict(list)
    borrowed_b: dict[tuple[str, str], list[dict]] = defaultdict(list)
    inherited_a: dict[tuple[str, str], list[dict]] = defaultdict(list)
    inherited_b: dict[tuple[str, str], list[dict]] = defaultdict(list)

    for entries, language, word, partner_entries, partner_language, partner_word, borrowed_claims, inherited_claims in (
        (entries_a, lang_a, word_a, entries_b, lang_b, word_b, borrowed_a, inherited_a),
        (entries_b, lang_b, word_b, entries_a, lang_a, word_a, borrowed_b, inherited_b),
    ):
        for entry in entries:
            for claim in entry.get("claims", []):
                relation = claim.get("relation")
                related_language = claim.get("related_language")
                related_form = claim.get("related_form")
                if not isinstance(related_form, str) or not related_language:
                    continue
                key = (related_language, related_form.casefold())
                if relation == "borrowed_from":
                    borrowed_claims[key].append(_claim_reference(entry, claim))
                    if related_language == partner_language and related_form.casefold() == partner_word.casefold():
                        partner_keys = [
                            candidate["source_entry_key"]
                            for candidate in partner_entries
                            if candidate.get("word", "").casefold() == related_form.casefold()
                        ]
                        evidence.append({
                            "type": "direct_borrowing_claim",
                            "donor_language": partner_language,
                            "donor_form": related_form,
                            "recipient_language": language,
                            "recipient_form": word,
                            "claim": _claim_reference(entry, claim),
                            "matched_donor_entry_keys": partner_keys,
                        })
                elif relation in {"cognate_mention", "noncognate_mention"}:
                    if related_language == partner_language and related_form.casefold() == partner_word.casefold():
                        partner_keys = [
                            candidate["source_entry_key"]
                            for candidate in partner_entries
                            if candidate.get("word", "").casefold() == related_form.casefold()
                        ]
                        evidence.append({
                            "type": f"source_{relation}",
                            "source_language": language,
                            "source_form": word,
                            "mentioned_language": partner_language,
                            "mentioned_form": related_form,
                            "claim": _claim_reference(entry, claim),
                            "matched_mentioned_entry_keys": partner_keys,
                        })
                elif relation == "inherited_from":
                    inherited_claims[key].append(_claim_reference(entry, claim))

    for relation_type, claims_a, claims_b in (
        ("shared_borrowing_source_claim", borrowed_a, borrowed_b),
        ("shared_inherited_form_claim", inherited_a, inherited_b),
    ):
        for language, form in sorted(claims_a.keys() & claims_b.keys()):
            evidence.append({
                "type": relation_type,
                "related_language": language,
                "related_form_key": form,
                "claims_a": claims_a[(language, form)],
                "claims_b": claims_b[(language, form)],
            })
    return evidence


def fetch_pair(api_url: str, source: str, target: str, word_a: str, word_b: str) -> dict | None:
    matches = []
    offset, total, limit = 0, 1, 100
    while offset < total:
        query = {"source": source, "target": target, "q": word_a, "limit": limit, "offset": offset}
        with urlopen(f"{api_url.rstrip('/')}/api/pairs?{urlencode(query)}", timeout=20) as response:
            payload = json.load(response)
        total = payload.get("total", 0)
        matches.extend(
            item for item in payload.get("items", [])
            if item.get("lang_a") == source and item.get("lang_b") == target
            and item.get("word_a") == word_a and item.get("word_b") == word_b
        )
        if matches:
            break
        offset += limit
    if len(matches) > 1:
        raise ValueError(f"Expected one headword-pair row for {source}/{target} {word_a!r}/{word_b!r}; found {len(matches)}")
    return matches[0] if matches else None


def audit_record(
    word_a: str,
    word_b: str,
    source: str,
    target: str,
    comparison: dict | None,
    entries: dict[tuple[str, str], list[dict]],
) -> dict:
    source_entries_a, source_match_a = matching_source_entries(entries, source, word_a)
    source_entries_b, source_match_b = matching_source_entries(entries, target, word_b)
    selected_a, pos_match_a = select_source_entries_by_pos(source_entries_a, comparison.get("pos_a") if comparison else None)
    selected_b, pos_match_b = select_source_entries_by_pos(source_entries_b, comparison.get("pos_b") if comparison else None)
    comparison_senses_a = comparison.get("senses_a", []) if comparison else []
    comparison_senses_b = comparison.get("senses_b", []) if comparison else []
    return {
        "audit_key": f"{source}|{word_a}|{target}|{word_b}",
        "comparison": {key: comparison.get(key) for key in PAIR_FIELDS} if comparison else None,
        "source_entries": {
            source: source_entries_a,
            target: source_entries_b,
        },
        "source_entry_match": {
            source: source_match_a,
            target: source_match_b,
        },
        "source_pos_entry_count": {source: len(selected_a), target: len(selected_b)},
        "source_pos_entry_match": {source: pos_match_a, target: pos_match_b},
        "source_sense_matches": {
            source: match_source_senses(comparison_senses_a, selected_a, comparison.get("pos_a") if comparison else None),
            target: match_source_senses(comparison_senses_b, selected_b, comparison.get("pos_b") if comparison else None),
        },
        "source_derived_relationships": derive_pair_source_evidence(
            selected_a, selected_b, source, word_a, target, word_b
        ),
    }


def sample_category_rows(
    api_url: str, source: str, target: str, per_category: int, other_count: int, seed: int
) -> tuple[dict[tuple[str, str], dict], dict[tuple[str, str], dict], dict[str, dict]]:
    rng = random.Random(seed)
    rows: dict[tuple[str, str], dict] = {}
    metadata: dict[tuple[str, str], dict] = {}
    strata = {}
    for category in PAIR_CATEGORIES:
        query = {"source": source, "target": target, "category": category, "limit": 1, "offset": 0}
        with urlopen(f"{api_url.rstrip('/')}/api/pairs?{urlencode(query)}", timeout=20) as response:
            total = json.load(response).get("total", 0)
        sample_count = other_count if category == "other" else per_category
        offsets = sorted(rng.sample(range(total), min(sample_count, total)))
        strata[category] = {"total": total, "sample_count": len(offsets), "offsets": offsets}
        for offset in offsets:
            query["offset"] = offset
            with urlopen(f"{api_url.rstrip('/')}/api/pairs?{urlencode(query)}", timeout=20) as response:
                items = json.load(response).get("items", [])
            if len(items) != 1:
                raise ValueError(f"Expected one row at {source}/{target} {category} offset {offset}")
            comparison = items[0]
            key = comparison["word_a"], comparison["word_b"]
            if key in rows:
                raise ValueError(f"Duplicate comparison row selected: {source}/{target} {key}")
            rows[key] = comparison
            metadata[key] = {"category": category, "stratum_total": total, "offset": offset, "seed": seed}
    return rows, metadata, strata


def write_audit(
    source_records: Path,
    output: Path,
    api_url: str,
    source: str,
    target: str,
    pairs: list[tuple[str, str]],
    force: bool = False,
    comparison_rows: dict[tuple[str, str], dict] | None = None,
    sample_metadata: dict[tuple[str, str], dict] | None = None,
    sampling: dict | None = None,
) -> int:
    manifest = output.with_suffix(output.suffix + ".manifest.json")
    if not force and (output.exists() or manifest.exists()):
        raise FileExistsError(f"Output already exists; pass --force to replace it: {output}")

    entries = load_source_entries(source_records, {word for pair in pairs for word in pair})
    output.parent.mkdir(parents=True, exist_ok=True)
    temp_output = output.with_suffix(output.suffix + ".tmp")
    counts: dict[str, dict[str, int]] = {}
    try:
        with temp_output.open("w", encoding="utf-8", newline="\n") as destination:
            for word_a, word_b in pairs:
                comparison = (
                    comparison_rows.get((word_a, word_b))
                    if comparison_rows is not None
                    else fetch_pair(api_url, source, target, word_a, word_b)
                )
                record = audit_record(word_a, word_b, source, target, comparison, entries)
                if sample_metadata and (word_a, word_b) in sample_metadata:
                    record["sample"] = sample_metadata[(word_a, word_b)]
                destination.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
                counts[f"{word_a} → {word_b}"] = {
                    "comparison_rows": int(comparison is not None),
                    "source_entries": len(record["source_entries"][source]) + len(record["source_entries"][target]),
                    "source_entry_match": record["source_entry_match"],
                }
        temp_output.replace(output)
        source_manifest = source_records.with_suffix(source_records.suffix + ".manifest.json")
        manifest_data = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source_records": str(source_records),
            "source_manifest": str(source_manifest) if source_manifest.exists() else None,
            "source_manifest_sha256": hashlib.sha256(source_manifest.read_bytes()).hexdigest() if source_manifest.exists() else None,
            "comparison_api": f"{api_url.rstrip('/')}/api/pairs",
            "sampled_live_api": sampling is not None,
            "languages": [source, target],
            "word_pairs": pairs,
            "sampling": sampling,
            "counts": counts,
        }
        manifest.write_text(json.dumps(manifest_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except Exception:
        temp_output.unlink(missing_ok=True)
        raise
    return len(pairs)


def main() -> None:
    project_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description="Join selected live pair rows to retained source etymology entries.")
    parser.add_argument("--source-records", type=Path, default=project_root / "pipeline/data/etymology_records.jsonl")
    parser.add_argument("--output", type=Path, default=project_root / "pipeline/data/source_pair_audit.jsonl")
    parser.add_argument("--api-url", default="http://localhost:8080")
    parser.add_argument("--source", default="sv")
    parser.add_argument("--target", default="en")
    parser.add_argument("--words", nargs="+", help="Same headword in both languages.")
    parser.add_argument("--pairs", nargs=2, action="append", metavar=("SOURCE_WORD", "TARGET_WORD"), help="Different headwords to join.")
    parser.add_argument("--sample-per-category", type=int, help="Draw this many rows from each current pair category.")
    parser.add_argument("--other-sample-count", type=int, default=8, help="Rows to draw from `other` (default: 8).")
    parser.add_argument("--seed", type=int, default=20260928, help="Seed for category sampling.")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if args.sample_per_category is not None and (args.pairs or args.words):
        parser.error("choose either --sample-per-category or explicit --pairs/--words")
    sampling = None
    sample_metadata = None
    if args.sample_per_category is not None:
        if args.sample_per_category < 0 or args.other_sample_count < 0:
            parser.error("sample counts must not be negative")
        comparison_rows, sample_metadata, strata = sample_category_rows(
            args.api_url, args.source, args.target, args.sample_per_category, args.other_sample_count, args.seed
        )
        pairs = list(comparison_rows)
        sampling = {"seed": args.seed, "strata": strata}
    else:
        comparison_rows = None
        pairs = args.pairs or [(word, word) for word in (args.words or DEFAULT_WORDS)]
    count = write_audit(
        args.source_records, args.output, args.api_url, args.source, args.target, pairs, args.force,
        comparison_rows, sample_metadata, sampling,
    )
    print(f"Wrote {count} joined audit rows to {args.output}")


if __name__ == "__main__":
    main()
