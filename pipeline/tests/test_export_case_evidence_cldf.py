import csv
import json
import re

from export_case_evidence_cldf import _validate_table_links, export_slice


def _entry(entry_key, language, word, sense_id, gloss, claims=None):
    return {
        "source": "Wiktionary via Kaikki/Wiktextract",
        "source_file": f"kaikki_{language}.jsonl",
        "source_url": f"https://en.wiktionary.org/wiki/{word}#{language}",
        "source_entry_key": entry_key,
        "language_code": language,
        "word": word,
        "part_of_speech": "noun",
        "etymology_number": None,
        "origin_status": None,
        "source_senses": [{"id": sense_id, "glosses": [gloss], "tags": []}],
        "claims": claims or [],
    }


def _comparison(lang_a, word_a, entry_a, sense_a, gloss_a, lang_b, word_b, entry_b, sense_b, gloss_b):
    return {
        "lang_a": lang_a,
        "word_a": word_a,
        "pos_a": "noun",
        "def_a": gloss_a,
        "etym_root_a": None,
        "etym_root_b": None,
        "lang_b": lang_b,
        "word_b": word_b,
        "pos_b": "noun",
        "def_b": gloss_b,
        "category": "other",
        "etymological_relation": "unknown",
        "orthographic_sim": 0.9,
        "phonetic_sim": 0.8,
        "semantic_sim": 0.7,
        "senses_a": [{"source_entry_key": entry_a, "source_sense_id": sense_a, "gloss": gloss_a, "pos": "noun", "is_active_match": True}],
        "senses_b": [{"source_entry_key": entry_b, "source_sense_id": sense_b, "gloss": gloss_b, "pos": "noun", "is_active_match": True}],
    }


def test_exports_claims_components_and_comparisons_with_linked_ids(tmp_path):
    source_entry_key = "sv|fleece|noun||sense-sv"
    target_entry_key = "en|fleece|noun||sense-en"
    claim = {
        "template_index": 0,
        "template_name": "bor",
        "relation": "borrowed_from",
        "args": {"1": "sv", "2": "en", "3": "fleece"},
        "related_language": "en",
        "related_form": "fleece",
        "source_uncertain": False,
    }
    comparison = _comparison("sv", "fleece", source_entry_key, "sense-sv", "polar fleece", "en", "fleece", target_entry_key, "sense-en", "a textile")
    source = tmp_path / "slice.jsonl"
    source.write_text(json.dumps({
        "case_id": "fleece",
        "comparisons": [comparison, {**comparison, "lang_a": "en", "word_a": "fleece", "pos_a": "noun", "def_a": "a textile", "lang_b": "sv", "word_b": "fleece", "pos_b": "noun", "def_b": "polar fleece", "senses_a": comparison["senses_b"], "senses_b": comparison["senses_a"]}],
        "source_entries": [
            _entry(source_entry_key, "sv", "fleece", "sense-sv", "polar fleece", [claim]),
            _entry(target_entry_key, "en", "fleece", "sense-en", "a textile"),
        ],
        "pair_claim_matches": [{
            "match_id": "match-one",
            "candidate": {"forms": [{"language_code": "sv", "word": "fleece"}, {"language_code": "en", "word": "fleece"}]},
            "source_entry": {"source_entry_key": source_entry_key, "language_code": "sv", "word": "fleece", "source_url": "https://en.wiktionary.org/wiki/fleece#Swedish"},
            "source_active_sense": {"source_sense_id": "sense-sv"},
            "claim": {"relation": "borrowed_from", "evidence": {"template_index": 0, "template_name": "bor", "args": claim["args"]}},
            "target_form_match": {"active_identity_status": "available", "active_entry_key": target_entry_key, "active_sense_id": "sense-en", "form_match_method": "exact"},
        }],
        "component_links": [{
            "source_entry_key": source_entry_key,
            "relation": "compound_of",
            "components": [{"index": 0, "surface_form": "flee", "raw_forms": ["flee"], "match_status": "one_exact_entry", "candidate_entry_keys": ["sv|flee|verb||candidate"]}],
            "evidence": [{"template_index": 1, "template_name": "com", "args": {"1": "sv", "2": "flee", "3": "ce"}}],
        }],
    }, ensure_ascii=False) + "\n", encoding="utf-8")
    source.with_suffix(source.suffix + ".manifest.json").write_text(json.dumps({
        "inputs": {"etymology_records_test.jsonl": "source-hash"},
    }), encoding="utf-8")
    (tmp_path / "etymology_records_test.jsonl.manifest.json").write_text(json.dumps({
        "languages": {"sv": {"source_file": "kaikki_sv.jsonl", "source_file_sha256": "dump-hash"}},
    }), encoding="utf-8")

    output = tmp_path / "cldf"
    manifest = export_slice(source, output)

    assert manifest["tables"]["entries.csv"]["rows"] == 2
    assert manifest["tables"]["comparisons.csv"]["rows"] == 1
    assert manifest["tables"]["claim-matches.csv"]["rows"] == 1
    assert manifest["source_dump_files"]["sv"]["source_file_sha256"] == "dump-hash"
    assert manifest["summary"]["comparisons_by_legacy_label"] == {"other": 1}
    assert manifest["summary"]["matched_source_claims_by_legacy_label"]["other"] == {"borrowed_from:available": 1}
    metadata = json.loads((output / "metadata.json").read_text(encoding="utf-8"))
    assert metadata["dc:conformsTo"].endswith("#Generic")
    tables = {table["url"]: table for table in metadata["tables"]}
    assert "Source_Entry_ID" in {column["name"] for column in tables["forms.csv"]["tableSchema"]["columns"]}

    with (output / "source-claims.csv").open(encoding="utf-8", newline="") as stream:
        claims = list(csv.DictReader(stream))
    assert claims[0]["Relation"] == "borrowed_from"
    assert claims[0]["Source_Uncertain"] == "false"
    with (output / "claim-matches.csv").open(encoding="utf-8", newline="") as stream:
        matches = list(csv.DictReader(stream))
    assert matches[0]["Target_Identity_Status"] == "available"
    with (output / "component-links.csv").open(encoding="utf-8", newline="") as stream:
        components = list(csv.DictReader(stream))
    assert json.loads(components[0]["Evidence_JSON"])[0]["template_name"] == "com"
    assert all(re.fullmatch(r"[A-Za-z0-9_-]+", row["ID"]) for rows in (
        claims, matches, components,
    ) for row in rows)


def test_refuses_to_overwrite_nonempty_output_without_force(tmp_path):
    source = tmp_path / "slice.jsonl"
    source.write_text("{}\n", encoding="utf-8")
    output = tmp_path / "cldf"
    output.mkdir()
    (output / "old.csv").write_text("old\n", encoding="utf-8")
    try:
        export_slice(source, output)
    except FileExistsError:
        pass
    else:
        raise AssertionError("Expected an existing output directory to be protected")


def test_rejects_a_broken_table_reference():
    tables = [
        ("languages.csv", ["ID"], [{"ID": "sv"}]),
        ("entries.csv", ["ID", "Language_ID"], [{"ID": "entry-1", "Language_ID": "en"}]),
    ]
    try:
        _validate_table_links(tables)
    except ValueError as error:
        assert "Broken reference entries.csv.Language_ID" in str(error)
    else:
        raise AssertionError("Expected a foreign-key mismatch to fail validation")
