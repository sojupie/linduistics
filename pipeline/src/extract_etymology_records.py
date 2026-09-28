"""Export source-level Wiktionary etymology records without flattening them."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote


RELATION_BY_TEMPLATE = {
    "inh": "inherited_from",
    "bor": "borrowed_from",
    "lbor": "borrowed_from",
    "slbor": "borrowed_from",
    "obor": "borrowed_from",
    "ubor": "borrowed_from",
    "abor": "borrowed_from",
    "borrowed": "borrowed_from",
    "der": "derived_from",
    "uder": "derived_from",
    "deverbal": "derived_from",
    "denominal": "derived_from",
    "cal": "calque_of",
    "calque": "calque_of",
    "clq": "calque_of",
    "pcalque": "partial_calque_of",
    "pcal": "partial_calque_of",
    "pclq": "partial_calque_of",
    "compound": "compound_of",
    "com": "compound_of",
    "confix": "confix_of",
    "surf": "surface_analysis",
    "doublet": "doublet_of",
    "dbt": "doublet_of",
    "af": "formed_from",
    "affix": "formed_from",
    "prefix": "formed_from",
    "pre": "formed_from",
    "suffix": "formed_from",
    "suf": "formed_from",
    "blend": "blend_of",
    "clip": "clipped_from",
    "clipping": "clipped_from",
    "back-formation": "back_formed_from",
    "back-form": "back_formed_from",
    "backform": "back_formed_from",
    "backformation": "back_formed_from",
    "back formation": "back_formed_from",
    "cog": "cognate_mention",
    "cognate": "cognate_mention",
    "ncog": "noncognate_mention",
    "noncog": "noncognate_mention",
    "noncognate": "noncognate_mention",
    "false cognate": "noncognate_mention",
    "derived": "derived_from",
    "inherited": "inherited_from",
    "partial calque": "partial_calque_of",
    "semantic loan": "semantic_loan_from",
    "unadapted borrowing": "borrowed_from",
    "adapted borrowing": "borrowed_from",
    "learned borrowing": "borrowed_from",
    "semi-learned borrowing": "borrowed_from",
    "orthographic borrowing": "borrowed_from",
    "pseudo-loan": "pseudo_loan_based_on",
    "pseudoloan": "pseudo_loan_based_on",
    "piecewise doublet": "piecewise_doublet_of",
    "piecewise_doublet": "piecewise_doublet_of",
    "surface analysis": "surface_analysis",
    "named-after": "named_after",
    "named after": "named_after",
    "coin": "coined_by",
    "coined": "coined_by",
    "coinage": "coined_by",
    "root": "rooted_in",
    "sl": "semantic_loan_from",
    "psm": "phono_semantic_match_to",
    "translit": "transliteration_of",
    "transliteration": "transliteration_of",
    "abbrev": "abbreviated_from",
    "abbr": "abbreviated_from",
    "abbreviation": "abbreviated_from",
    "acronym": "acronym_of",
    "initialism": "initialism_of",
    "univ": "univerbated_from",
    "afeq": "equivalent_to_components",
    "ellipsis": "ellipsis_of",
    "ellip": "ellipsis_of",
    "acro": "acronym_of",
    "redup": "reduplicated_from",
    "nom": "nominalized_from",
    "sylabbr": "syllabically_abbreviated_from",
    "init": "initialism_of",
}

ETY_RELATIONS = {
    "af": "formed_from",
    "affix": "formed_from",
    "bor": "borrowed_from",
    "lbor": "borrowed_from",
    "slbor": "borrowed_from",
    "obor": "borrowed_from",
    "ubor": "borrowed_from",
    "abor": "borrowed_from",
    "inh": "inherited_from",
    "der": "derived_from",
    "uder": "derived_from",
    "deverbal": "derived_from",
    "denominal": "derived_from",
    "from": "derived_from",
    "cal": "calque_of",
    "calque": "calque_of",
    "clq": "calque_of",
    "pcal": "partial_calque_of",
    "pclq": "partial_calque_of",
    "pcalque": "partial_calque_of",
    "sl": "semantic_loan_from",
    "psm": "phono_semantic_match_to",
    "translit": "transliteration_of",
    "transliteration": "transliteration_of",
    "blend": "blend_of",
    "clip": "clipped_from",
    "clipping": "clipped_from",
    "bf": "back_formed_from",
    "back-formation": "back_formed_from",
    "univ": "univerbated_from",
    "confix": "confix_of",
    "surf": "surface_analysis",
    "doublet": "doublet_of",
    "influence": "influenced_by",
    "abbrev": "abbreviated_from",
    "abbr": "abbreviated_from",
    "abbreviation": "abbreviated_from",
    "acronym": "acronym_of",
    "initialism": "initialism_of",
    "univerbation": "univerbated_from",
    "afeq": "equivalent_to_components",
    "ellipsis": "ellipsis_of",
    "ellip": "ellipsis_of",
    "acro": "acronym_of",
    "redup": "reduplicated_from",
    "nom": "nominalized_from",
    "sylabbr": "syllabically_abbreviated_from",
    "init": "initialism_of",
    "ncog": "noncognate_mention",
    "noncognate": "noncognate_mention",
    "root": "rooted_in",
}

_ETY_MARKER = re.compile(r"^:([^<]+)")
_WIKIDATA_ID = re.compile(r"^Q[1-9][0-9]*$")


def _language_codes(value: Any) -> list[str]:
    if not isinstance(value, str):
        return []
    return [code.strip() for code in value.split(",") if code.strip()]


def _entity_reference(value: Any) -> dict[str, str] | None:
    if not isinstance(value, str) or not value:
        return None
    key = "wikidata_id" if _WIKIDATA_ID.fullmatch(value) else "name"
    return {key: value}


def source_entry_key(entry: dict[str, Any]) -> str:
    """Build a dump-local key that keeps homographs and etymologies apart."""
    sense_ids = sorted(
        sense["id"]
        for sense in entry.get("senses", [])
        if isinstance(sense, dict) and isinstance(sense.get("id"), str)
    )
    parts = [
        entry.get("lang_code", ""),
        entry.get("word", ""),
        entry.get("pos", ""),
        entry.get("etymology_number", ""),
        ",".join(sense_ids),
    ]
    return "|".join(str(part) for part in parts)


def _normalize_ety_template(template: dict[str, Any], index: int, entry_lang: str) -> list[dict[str, Any]]:
    """Read top-level typed steps from ety/etymon without discarding their raw args."""
    name = str(template.get("name", ""))
    args = template.get("args")
    if not isinstance(args, dict):
        args = {}

    positional = sorted(
        ((int(key), value) for key, value in args.items() if str(key).isdigit() and int(key) >= 2),
        key=lambda item: item[0],
    )
    claims: list[dict[str, Any]] = []
    marker: str | None = None
    terms: list[str] = []

    def emit() -> None:
        if marker is None:
            return
        match = _ETY_MARKER.match(marker)
        marker_name = match.group(1) if match else None
        relation = ETY_RELATIONS.get(marker_name or "")
        common = {
            "template_index": index,
            "template_name": name,
            "relation": relation,
            "marker": marker,
            "source_uncertain": "<unc>" in marker,
            "args": args,
        }
        if "<surf>" in marker:
            common["analysis_basis"] = "surface_analysis"
        if not relation:
            claims.append({**common, "unmapped_marker": marker_name})
        elif relation in {"formed_from", "blend_of", "univerbated_from", "equivalent_to_components", "confix_of", "surface_analysis"}:
            claims.append({
                **common,
                "related_language": entry_lang,
                "components": terms,
            })
        else:
            for term in terms or [""]:
                language, separator, form = term.partition(":")
                claims.append({
                    **common,
                    "related_language": language if separator else entry_lang,
                    "related_form": form if separator else term,
                })

    for _, value in positional:
        value = str(value)
        if value.startswith(":"):
            emit()
            marker, terms = value, []
        elif marker is not None and value:
            terms.append(value)
    emit()

    if not claims:
        claims.append({
            "template_index": index,
            "template_name": name,
            "relation": None,
            "args": args,
            "unmapped_marker": None,
        })
    return claims


def _normalize_template(template: dict[str, Any], index: int, entry_lang: str) -> list[dict[str, Any]]:
    name = str(template.get("name", ""))
    base_name = name.rstrip("+")
    args = template.get("args")
    if not isinstance(args, dict):
        args = {}

    if base_name in {"ety", "etymon"}:
        return _normalize_ety_template(template, index, entry_lang)

    relation = RELATION_BY_TEMPLATE.get(base_name)

    claim: dict[str, Any] = {
        "template_index": index,
        "template_name": name,
        "relation": relation,
        "args": args,
    }

    if base_name in {"named-after", "named after"}:
        related_entity = _entity_reference(args.get("2")) or {}
        claim["related_entity"] = related_entity or None
        for field, argument in (
            ("nationality", args.get("nationality") or args.get("nat")),
            ("occupation", args.get("occupation") or args.get("occ")),
            ("wikipedia_title", args.get("wplink")),
            ("transliteration", args.get("tr")),
            ("script", args.get("sc")),
            ("born", args.get("born")),
            ("died", args.get("died")),
        ):
            if argument:
                related_entity[field] = argument
        occupations = [
            value
            for index in range(2, 6)
            for value in (args.get(f"occupation{index}") or args.get(f"occ{index}"),)
            if value
        ]
        if occupations:
            related_entity["additional_occupations"] = occupations
        if related_entity:
            claim["related_entity"] = related_entity
        return [claim]
    elif base_name in {"coin", "coined", "coinage"}:
        related_entity = _entity_reference(args.get("2"))
        if related_entity and args.get("2", "").casefold() != "unknown":
            claim["related_entity"] = related_entity
            for field, argument in (
                ("nationality", args.get("nationality") or args.get("nat")),
                ("occupation", args.get("occupation") or args.get("occ")),
                ("wikipedia_link_spec", args.get("w")),
                ("date", args.get("in")),
            ):
                if argument:
                    claim["related_entity"][field] = argument
            occupations = [
                value
                for index in range(2, 6)
                for value in (args.get(f"occupation{index}") or args.get(f"occ{index}"),)
                if value
            ]
            if occupations:
                claim["related_entity"]["additional_occupations"] = occupations
        else:
            claim["relation"] = None
        claim["formation_type"] = "coinage"
        claim["coined_ex_nihilo"] = args.get("exnihilo") == "1"
        return [claim]
    elif base_name in {"onom", "onomatopoeic"}:
        claim["relation"] = None
        claim["formation_type"] = "onomatopoeic"
        if args.get("title"):
            claim["source_label"] = args["title"]
        return [claim]
    elif base_name == "named-after/list":
        # This template formats the occupation list for named-after; retain it in templates only.
        return []

    if base_name in {"doublet", "dbt", "piecewise doublet", "piecewise_doublet"}:
        return [
            {
                **claim,
                "related_language": args.get("1"),
                "related_form": value,
            }
            for key, value in sorted(args.items(), key=lambda item: int(item[0]) if str(item[0]).isdigit() else 10**9)
            if str(key).isdigit() and int(key) >= 2 and isinstance(value, str) and value
        ] or [claim]
    elif base_name in {"cog", "cognate", "ncog", "noncog", "noncognate", "false cognate"}:
        return [
            {
                **claim,
                "related_language": language,
                "related_form": args.get("2"),
            }
            for language in _language_codes(args.get("1"))
        ] or [claim]
    elif base_name in {"ellipsis", "ellip", "nom", "sylabbr"}:
        return [
            {
                **claim,
                "related_language": language,
                "related_form": args.get("2"),
            }
            for language in _language_codes(args.get("1"))
        ] or [claim]
    elif base_name in {
        "deverbal", "denominal", "clip", "clipping", "back-formation", "back-form", "backform",
        "backformation", "back formation", "abbrev", "abbr", "abbreviation", "acronym", "initialism",
    }:
        claim["related_language"] = entry_lang
        claim["related_form"] = args.get("2")
    elif base_name in {
        "inh", "inherited", "bor", "lbor", "slbor", "obor", "ubor", "abor", "borrowed",
        "unadapted borrowing", "adapted borrowing", "learned borrowing", "semi-learned borrowing",
        "orthographic borrowing", "der", "derived", "uder", "calque", "cal", "clq", "pcalque",
        "pcal", "pclq", "partial calque", "root", "sl", "semantic loan", "pseudo-loan", "pseudoloan", "psm",
        "translit", "transliteration",
    }:
        return [
            {
                **claim,
                "related_language": language,
                "related_form": args.get("3"),
            }
            for language in _language_codes(args.get("2"))
        ] or [claim]
    elif base_name in {"compound", "com", "confix", "surf", "surface analysis", "af", "affix", "prefix", "pre", "suffix", "suf", "blend", "univ", "afeq"}:
        claim["related_language"] = entry_lang
        claim["components"] = [
            value
            for key, value in sorted(args.items(), key=lambda item: int(item[0]) if item[0].isdigit() else 10**9)
            if key.isdigit() and int(key) >= 2 and isinstance(value, str) and value
        ]

    return [claim]


def source_record(entry: dict[str, Any], source_file: str) -> dict[str, Any] | None:
    lang_code = str(entry.get("lang_code") or "")
    word = entry.get("word")
    if not lang_code or not isinstance(word, str):
        return None

    raw_templates = entry.get("etymology_templates") or []
    templates = [template for template in raw_templates if isinstance(template, dict)]
    etymology_text = entry.get("etymology_text")
    if not templates and not etymology_text:
        return None

    lang_name = str(entry.get("lang") or lang_code)
    page = quote(word.replace(" ", "_"), safe="()'_-.")
    section = quote(lang_name.replace(" ", "_"), safe="()'_-.")
    normalized = [
        claim
        for index, template in enumerate(templates)
        for claim in _normalize_template(template, index, lang_code)
    ]
    return {
        "source": "Wiktionary via Kaikki/Wiktextract",
        "source_file": source_file,
        "source_url": f"https://en.wiktionary.org/wiki/{page}#{section}",
        "source_entry_key": source_entry_key(entry),
        "language_code": lang_code,
        "language_name": lang_name,
        "word": word,
        "part_of_speech": entry.get("pos"),
        "etymology_number": entry.get("etymology_number"),
        "sense_ids": [
            sense["id"]
            for sense in entry.get("senses", [])
            if isinstance(sense, dict) and isinstance(sense.get("id"), str)
        ],
        "source_senses": [
            {
                key: sense[key]
                for key in ("id", "glosses", "raw_glosses", "tags")
                if key in sense
            }
            for sense in entry.get("senses", [])
            if isinstance(sense, dict) and isinstance(sense.get("id"), str)
        ],
        "etymology_text": etymology_text,
        "templates": templates,
        "claims": normalized,
    }


def export_records(input_dir: Path, languages: list[str], output: Path, force: bool = False) -> dict[str, Any]:
    manifest_path = output.with_suffix(output.suffix + ".manifest.json")
    if not force and (output.exists() or manifest_path.exists()):
        raise FileExistsError(f"Output already exists; pass --force to replace it: {output}")

    output.parent.mkdir(parents=True, exist_ok=True)
    temp_output = output.with_suffix(output.suffix + ".tmp")
    summary: dict[str, Any] = {
        "source": "Wiktionary via Kaikki/Wiktextract",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "languages": {},
        "totals": {"source_records": 0, "source_sense_records": 0, "template_records": 0, "claim_records": 0},
        "templates": {},
        "normalized_relations": {},
        "formation_types": {},
        "unmapped_templates": {},
    }

    try:
        with temp_output.open("w", encoding="utf-8", newline="\n") as destination:
            for lang in languages:
                source_path = input_dir / f"kaikki_{lang}.jsonl"
                if not source_path.is_file():
                    raise FileNotFoundError(source_path)

                digest = hashlib.sha256()
                counts = {"source_records": 0, "source_sense_records": 0, "template_records": 0, "claim_records": 0}
                template_counts: Counter[str] = Counter()
                relation_counts: Counter[str] = Counter()
                formation_counts: Counter[str] = Counter()
                unmapped: Counter[str] = Counter()
                with source_path.open("rb") as source:
                    for line_number, line in enumerate(source, start=1):
                        digest.update(line)
                        if not line.strip():
                            continue
                        try:
                            entry = json.loads(line)
                        except json.JSONDecodeError as exc:
                            raise ValueError(f"Invalid JSON in {source_path.name} at line {line_number}") from exc
                        if not isinstance(entry, dict):
                            continue
                        record = source_record(entry, source_path.name)
                        if record is None:
                            continue

                        destination.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
                        counts["source_records"] += 1
                        counts["source_sense_records"] += len(record["source_senses"])
                        for claim in record["claims"]:
                            counts["claim_records"] += 1
                            has_relation = bool(claim.get("relation"))
                            formation_type = claim.get("formation_type")
                            if has_relation:
                                relation_counts[claim["relation"]] += 1
                            if formation_type:
                                formation_counts[formation_type] += 1
                            if not has_relation and not formation_type:
                                marker = claim.get("unmapped_marker")
                                key = f"{claim['template_name']}:{marker}" if marker else claim["template_name"]
                                unmapped[key] += 1
                        for template in record["templates"]:
                            name = template.get("name", "")
                            template_counts[name] += 1
                            counts["template_records"] += 1

                stat = source_path.stat()
                summary["languages"][lang] = {
                    **counts,
                    "source_file": source_path.name,
                    "source_file_size": stat.st_size,
                    "source_file_mtime": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
                    "source_file_sha256": digest.hexdigest(),
                    "templates": dict(sorted(template_counts.items())),
                    "normalized_relations": dict(sorted(relation_counts.items())),
                    "formation_types": dict(sorted(formation_counts.items())),
                    "unmapped_templates": dict(sorted(unmapped.items())),
                }
                summary["totals"]["source_records"] += counts["source_records"]
                summary["totals"]["source_sense_records"] += counts["source_sense_records"]
                summary["totals"]["template_records"] += counts["template_records"]
                summary["totals"]["claim_records"] += counts["claim_records"]
                for name, count in template_counts.items():
                    summary["templates"][name] = summary["templates"].get(name, 0) + count
                for name, count in relation_counts.items():
                    summary["normalized_relations"][name] = summary["normalized_relations"].get(name, 0) + count
                for name, count in formation_counts.items():
                    summary["formation_types"][name] = summary["formation_types"].get(name, 0) + count
                for name, count in unmapped.items():
                    summary["unmapped_templates"][name] = summary["unmapped_templates"].get(name, 0) + count

                print(
                    f"{lang}: {counts['source_records']:,} entries with etymology data, "
                    f"{counts['template_records']:,} templates",
                    flush=True,
                )

        temp_output.replace(output)
        manifest_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except Exception:
        temp_output.unlink(missing_ok=True)
        raise

    return summary


def main() -> None:
    project_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description="Export all structured etymology evidence from local Kaikki dumps.")
    parser.add_argument("--input-dir", type=Path, default=project_root / "pipeline" / "data")
    parser.add_argument("--output", type=Path, default=project_root / "pipeline" / "data" / "etymology_records.jsonl")
    parser.add_argument("--languages", nargs="+", default=["sv", "da", "nb", "de", "en"])
    parser.add_argument("--force", action="store_true", help="Replace an existing output and manifest.")
    args = parser.parse_args()
    summary = export_records(args.input_dir, args.languages, args.output, args.force)
    print(f"Wrote {summary['totals']['source_records']:,} source records to {args.output}")
    print(f"Manifest: {args.output.with_suffix(args.output.suffix + '.manifest.json')}")


if __name__ == "__main__":
    main()
