"""Link case-slice source claims to every exact target entry in local dumps."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import orjson

from export_case_evidence_cldf import _claim_id, stable_id
from extract_etymology_records import source_entry_key, source_record

LANGUAGES = ("da", "de", "en", "nb", "sv")


def _digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _case_claims(cases: list[dict]) -> tuple[list[dict], Counter]:
    claims = []
    scopes = Counter()
    seen = set()
    for case in cases:
        for field in ("source_entries", "component_source_entries"):
            for entry in case.get(field, []):
                entry_key = entry.get("source_entry_key")
                if not entry_key:
                    continue
                for claim in entry.get("claims", []):
                    form = claim.get("related_form")
                    language = str(claim.get("related_language") or "").strip().lower()
                    scope = "form" if isinstance(form, str) and form.strip() else "other"
                    claim_id = _claim_id(entry_key, claim)
                    key = (case.get("case_id", ""), claim_id)
                    if key in seen:
                        continue
                    seen.add(key)
                    scopes[scope] += 1
                    if scope != "form":
                        continue
                    claims.append({
                        "case_id": case.get("case_id", ""),
                        "claim_id": claim_id,
                        "source_entry_key": entry_key,
                        "relation": claim.get("relation"),
                        "target_language": language,
                        "claimed_form": form.strip(),
                        "claim_evidence": {
                            key: claim[key]
                            for key in ("template_index", "template_name", "args")
                            if key in claim
                        },
                    })
    return claims, scopes


def _target_entry(entry: dict, language: str, source_file: str, line_number: int) -> dict:
    record = source_record(entry, source_file)
    senses = [
        {key: sense[key] for key in ("id", "glosses", "raw_glosses", "tags", "form_of") if key in sense}
        for sense in entry.get("senses", [])
        if isinstance(sense, dict)
    ]
    page = quote(str(entry["word"]).replace(" ", "_"), safe="()'_-")
    lang_name = str(entry.get("lang") or language)
    section = quote(lang_name.replace(" ", "_"), safe="()'_-")
    return {
        "source_file": source_file,
        "source_line": line_number,
        "source_entry_key": record["source_entry_key"] if record else source_entry_key(entry),
        "language_code": language,
        "word": entry["word"],
        "part_of_speech": entry.get("pos"),
        "etymology_number": entry.get("etymology_number"),
        "source_url": f"https://en.wiktionary.org/wiki/{page}#{section}",
        "etymology_text": entry.get("etymology_text"),
        "source_senses": senses,
        "source_claims": record["claims"] if record else [],
    }


def audit_case_claim_targets(case_slice: Path, target_dir: Path, output: Path, force: bool = False) -> dict:
    manifest_path = output.with_suffix(output.suffix + ".manifest.json")
    if not case_slice.is_file():
        raise FileNotFoundError(case_slice)
    if not force and (output.exists() or manifest_path.exists()):
        raise FileExistsError(f"Output already exists; pass --force to replace it: {output}")

    cases = [orjson.loads(line) for line in case_slice.read_bytes().splitlines() if line.strip()]
    claims, source_claim_scopes = _case_claims(cases)
    requested = defaultdict(lambda: defaultdict(set))
    for claim in claims:
        if claim["target_language"] in LANGUAGES:
            requested[claim["target_language"]][claim["claimed_form"].casefold()].add(claim["claimed_form"])

    targets: dict[tuple[str, str], dict[str, dict]] = defaultdict(dict)
    target_hashes = {}
    target_sizes = {}
    for language in LANGUAGES:
        source_path = target_dir / f"kaikki_{language}.jsonl"
        if not source_path.is_file():
            raise FileNotFoundError(source_path)
        digest = hashlib.sha256()
        with source_path.open("rb") as source:
            for line_number, line in enumerate(source, start=1):
                digest.update(line)
                if not line.strip():
                    continue
                entry = orjson.loads(line)
                word = entry.get("word")
                if (
                    not isinstance(word, str) or not word
                    or str(entry.get("lang_code") or "").strip().lower() != language
                    or word.casefold() not in requested[language]
                ):
                    continue
                target = _target_entry(entry, language, source_path.name, line_number)
                targets[(language, word.casefold())][target["source_entry_key"]] = target
        target_hashes[language] = digest.hexdigest()
        target_sizes[language] = source_path.stat().st_size

    output.parent.mkdir(parents=True, exist_ok=True)
    temp_output = output.with_suffix(output.suffix + ".tmp")
    statuses = Counter()
    candidate_total = 0
    matched_entry_keys = set()
    try:
        with temp_output.open("w", encoding="utf-8", newline="\n") as destination:
            for claim in claims:
                language = claim["target_language"]
                if language not in LANGUAGES:
                    status, candidates = "language_not_indexed", []
                else:
                    available = list(targets.get((language, claim["claimed_form"].casefold()), {}).values())
                    exact = [entry for entry in available if entry["word"] == claim["claimed_form"]]
                    candidates = exact or available
                    status = "exact" if exact else "casefold_only" if candidates else "not_found_in_dump"
                candidates.sort(key=lambda entry: entry["source_entry_key"])
                statuses[status] += 1
                candidate_total += len(candidates)
                matched_entry_keys.update(entry["source_entry_key"] for entry in candidates)
                destination.write(json.dumps({
                    **claim,
                    "match_status": status,
                    "candidate_entry_count": len(candidates),
                    "candidate_entries": candidates,
                }, ensure_ascii=False, separators=(",", ":")) + "\n")
        temp_output.replace(output)
    except Exception:
        temp_output.unlink(missing_ok=True)
        raise

    output_sha256 = _digest(output)
    manifest = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "Wiktionary via Kaikki/Wiktextract",
        "case_slice": {"file": case_slice.name, "sha256": _digest(case_slice)},
        "target_source_files": {
            language: {"file": f"kaikki_{language}.jsonl", "size": target_sizes[language], "sha256": target_hashes[language]}
            for language in LANGUAGES
        },
        "output": {"file": output.name, "sha256": output_sha256},
        "counts": {
            "cases": len(cases),
            "source_claims_by_scope": dict(sorted(source_claim_scopes.items())),
            "form_claims": len(claims),
            "target_forms_by_match_status": dict(sorted(statuses.items())),
            "candidate_entry_links": candidate_total,
            "unique_candidate_entries": len(matched_entry_keys),
        },
        "limits": [
            "An exact or case-folded spelling match identifies candidate entries only; it does not resolve a target sense.",
            "Forms outside the five local language dumps are reported as language_not_indexed, not as missing from Wiktionary.",
            "not_found_in_dump means no matching spelling was found in the recorded local dump snapshot.",
        ],
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    data = root / "pipeline" / "data"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case-slice", type=Path, default=data / "named_case_evidence_slice_dercat_fix.jsonl")
    parser.add_argument("--target-dir", type=Path, default=data)
    parser.add_argument("--output", type=Path, default=data / "case_claim_target_entries.jsonl")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    manifest = audit_case_claim_targets(args.case_slice, args.target_dir, args.output, args.force)
    print(json.dumps(manifest["counts"], indent=2))


if __name__ == "__main__":
    main()
