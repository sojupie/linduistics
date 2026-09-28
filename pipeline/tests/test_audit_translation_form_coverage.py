import json

import pyarrow as pa
import pyarrow.parquet as pq

from audit_translation_form_coverage import audit_translation_form_coverage


def test_audit_counts_only_translation_entries_with_resolved_source_lemmas(tmp_path):
    lemma_dir = tmp_path / "lemmas"
    form_dir = tmp_path / "forms"
    lemma_dir.mkdir()
    form_dir.mkdir()
    words = {"en": ["go"], "de": ["gehen"], "sv": ["gå"], "da": ["gå"], "nb": ["gå"]}
    form_rows = {"en": [("went", "go")], "de": [("ging", "gehen")], "sv": [], "da": [], "nb": []}
    for lang in words:
        pq.write_table(pa.table({"word": words[lang]}), lemma_dir / f"lemmas_{lang}.parquet")
        pq.write_table(
            pa.table({
                "form": [form for form, _ in form_rows[lang]],
                "lemma": [lemma for _, lemma in form_rows[lang]],
            }),
            form_dir / f"word_forms_{lang}.parquet",
        )

    dump = tmp_path / "kaikki_en.jsonl"
    entries = [
        {"word": "go", "senses": [{"translations": [
            {"code": "de", "word": "gehen"},
            {"code": "de", "word": "ging"},
            {"code": "de", "word": "gone"},
        ]}]},
        {"word": "went", "senses": [{"translations": [{"code": "de", "word": "ging"}]}]},
    ]
    dump.write_text("\n".join(json.dumps(entry) for entry in entries), encoding="utf-8")

    result = audit_translation_form_coverage(dump, lemma_dir, form_dir)

    assert result["source_entries"] == {"exact": 1, "missing": 1}
    assert result["unmatched_source_entries_with_translations"]["occurrences_by_form_resolution"] == {
        "one_lemma": 1
    }
    targets = result["target_translation_occurrences_from_matched_source_entries"]
    assert targets["lemma_resolution"] == {"exact": 1, "missing": 2}
    assert targets["unmatched_form_resolution"] == {"no_form_record": 1, "one_lemma": 1}
    assert targets["unique_surface_forms_by_language_and_resolution"] == {
        "de:no_form_record": 1,
        "de:one_lemma": 1,
    }
