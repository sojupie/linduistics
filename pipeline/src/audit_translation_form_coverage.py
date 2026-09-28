"""Measure how Wiktionary translation forms resolve to lemma and form tables."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path

import orjson
import pyarrow.parquet as pq

TARGET_LANGS = {"en", "de", "sv", "da", "nb"}
LANG_ALIASES = {
    "no": "nb",
    "norwegian": "nb",
    "danish": "da",
    "german": "de",
    "swedish": "sv",
    "english": "en",
}


def _normalize_lang(code: str) -> str:
    code = code.lower().strip()
    return LANG_ALIASES.get(code, code)


def _load_indexes(lemma_dir: Path, form_dir: Path):
    lemmas = {}
    lowercase_lemmas = {}
    forms = {}
    for lang in sorted(TARGET_LANGS):
        lemma_path = lemma_dir / f"lemmas_{lang}.parquet"
        form_path = form_dir / f"word_forms_{lang}.parquet"
        lemma_words = {
            word for word in pq.read_table(lemma_path, columns=["word"])["word"].to_pylist() if word
        }
        lower_index = defaultdict(set)
        for word in lemma_words:
            lower_index[word.lower()].add(word)
        form_index = defaultdict(set)
        table = pq.read_table(form_path, columns=["form", "lemma"])
        for form, lemma in zip(table["form"].to_pylist(), table["lemma"].to_pylist()):
            if form and lemma:
                form_index[form.lower()].add(lemma)
        lemmas[lang] = lemma_words
        lowercase_lemmas[lang] = lower_index
        forms[lang] = form_index
    return lemmas, lowercase_lemmas, forms


def _lemma_status(lang: str, word: str, lemmas: dict, lowercase_lemmas: dict) -> str:
    if word in lemmas[lang]:
        return "exact"
    matches = lowercase_lemmas[lang].get(word.lower(), set())
    if len(matches) == 1:
        return "lowercase_unique"
    return "lowercase_ambiguous" if matches else "missing"


def _form_status(lang: str, form: str, lemmas: dict, forms: dict) -> str:
    candidates = forms[lang].get(form.lower(), set()) & lemmas[lang]
    if len(candidates) == 1:
        return "one_lemma"
    return "multiple_lemmas" if candidates else "no_form_record"


def audit_translation_form_coverage(
    english_dump: Path, lemma_dir: Path, form_dir: Path
) -> dict:
    lemmas, lowercase_lemmas, forms = _load_indexes(lemma_dir, form_dir)
    source_lookups = Counter()
    source_forms = Counter()
    target_lookups = Counter()
    target_forms = Counter()
    unmatched_source_forms = defaultdict(set)
    unmatched_target_forms = defaultdict(set)

    with english_dump.open("rb") as source_file:
        for line in source_file:
            entry = orjson.loads(line)
            source_word = entry.get("word", "").strip()
            if not source_word or " " in source_word or "-" in source_word:
                continue

            source_status = _lemma_status("en", source_word, lemmas, lowercase_lemmas)
            source_lookups[source_status] += 1
            translations = []
            for sense in entry.get("senses", []):
                for translation in sense.get("translations", []):
                    lang = _normalize_lang(translation.get("code", ""))
                    form = translation.get("word", "").strip()
                    if (
                        lang in TARGET_LANGS
                        and lang != "en"
                        and form
                        and " " not in form
                        and "-" not in form
                    ):
                        translations.append((lang, form))

            if source_status in {"missing", "lowercase_ambiguous"}:
                if translations:
                    form_status = _form_status("en", source_word, lemmas, forms)
                    source_forms[form_status] += 1
                    unmatched_source_forms[form_status].add(source_word)
                continue

            for lang, form in translations:
                target_status = _lemma_status(lang, form, lemmas, lowercase_lemmas)
                target_lookups[target_status] += 1
                if target_status in {"missing", "lowercase_ambiguous"}:
                    form_status = _form_status(lang, form, lemmas, forms)
                    target_forms[form_status] += 1
                    unmatched_target_forms[(lang, form_status)].add(form)

    return {
        "source_entries": dict(sorted(source_lookups.items())),
        "unmatched_source_entries_with_translations": {
            "occurrences_by_form_resolution": dict(sorted(source_forms.items())),
            "unique_headwords_by_form_resolution": {
                status: len(words) for status, words in sorted(unmatched_source_forms.items())
            },
        },
        "target_translation_occurrences_from_matched_source_entries": {
            "lemma_resolution": dict(sorted(target_lookups.items())),
            "unmatched_form_resolution": dict(sorted(target_forms.items())),
            "unique_surface_forms_by_language_and_resolution": {
                f"{lang}:{status}": len(words)
                for (lang, status), words in sorted(unmatched_target_forms.items())
            },
        },
    }


def main() -> None:
    root = Path(__file__).resolve().parent.parent.parent
    data_dir = root / "pipeline" / "data"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--english-dump", type=Path, default=data_dir / "kaikki_en.jsonl")
    parser.add_argument("--lemma-dir", type=Path, default=data_dir)
    parser.add_argument("--form-dir", type=Path, default=data_dir)
    parser.add_argument("--output", type=Path, help="Optional path for the JSON summary")
    args = parser.parse_args()
    summary = json.dumps(
        audit_translation_form_coverage(args.english_dump, args.lemma_dir, args.form_dir),
        ensure_ascii=False,
        indent=2,
    )
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(summary + "\n", encoding="utf-8")
    print(summary)


if __name__ == "__main__":
    main()
