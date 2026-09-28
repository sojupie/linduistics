import hashlib
import json

from extract_etymology_records import source_entry_key
from extract_translation_claims import extract_translation_claims


def test_translation_export_keeps_sense_source_and_raw_target_form(tmp_path):
    source = tmp_path / "kaikki_en.jsonl"
    entry = {
        "lang_code": "en",
        "word": "go",
        "pos": "verb",
        "etymology_number": "1",
        "senses": [
            {
                "id": "en-go-verb-1",
                "glosses": ["to move"],
                "raw_glosses": ["(intransitive) to move"],
                "tags": ["intransitive"],
                "translations": [
                    {"code": "no", "word": "går", "sense": "to go", "tags": ["present"]},
                    {"code": "fr", "word": "aller"},
                ],
            },
            {"id": "en-go-verb-2", "glosses": ["to leave"], "translations": []},
        ],
    }
    source.write_text(json.dumps(entry, ensure_ascii=False) + "\n", encoding="utf-8")
    output = tmp_path / "translation_claims.jsonl"

    manifest = extract_translation_claims(source, output)

    records = [json.loads(line) for line in output.read_text(encoding="utf-8").splitlines()]
    assert len(records) == 1
    record = records[0]
    assert record["source_entry_key"] == source_entry_key(entry)
    assert record["source_sense_id"] == "en-go-verb-1"
    assert record["source_glosses"] == ["to move"]
    assert record["target_lang"] == "nb"
    assert record["target_code"] == "no"
    assert record["target_form"] == "går"
    assert record["translation_record"] == entry["senses"][0]["translations"][0]
    assert manifest["counts"] == {"source_entries": 1, "translation_claims": 1}
    assert manifest["source_files"][0]["sha256"] == hashlib.sha256(source.read_bytes()).hexdigest()


def test_translation_export_accepts_multiple_source_languages(tmp_path):
    english = tmp_path / "kaikki_en.jsonl"
    swedish = tmp_path / "kaikki_sv.jsonl"
    english.write_text(json.dumps({
        "lang_code": "en",
        "word": "bank",
        "senses": [{"id": "en-bank-1", "translations": [{"code": "sv", "word": "bank"}]}],
    }) + "\n", encoding="utf-8")
    swedish.write_text(json.dumps({
        "lang_code": "sv",
        "word": "bankman",
        "senses": [{"id": "sv-bankman-1", "translations": [{"code": "en", "word": "bankman"}]}],
    }) + "\n", encoding="utf-8")
    output = tmp_path / "claims.jsonl"

    manifest = extract_translation_claims([english, swedish], output)

    records = [json.loads(line) for line in output.read_text(encoding="utf-8").splitlines()]
    assert [(r["source_lang"], r["source_word"], r["target_lang"], r["target_form"]) for r in records] == [
        ("en", "bank", "sv", "bank"),
        ("sv", "bankman", "en", "bankman"),
    ]
    assert manifest["counts"] == {"source_entries": 2, "translation_claims": 2}
    assert [item["file"] for item in manifest["source_files"]] == ["kaikki_en.jsonl", "kaikki_sv.jsonl"]
