import csv
import json
import re

from export_case_evidence_cldf import _claim_id, _claim_target_scope, _template_occurrence_id, _validate_table_links, export_slice


def test_claim_target_scope_distinguishes_forms_entities_components_languages_and_no_target():
    assert _claim_target_scope({"related_form": "fleece"}) == "form"
    assert _claim_target_scope({"related_entity": {"language_code": "gmw-pro", "form": "*fleus"}}) == "entity"
    assert _claim_target_scope({"components": [{"form": "flee"}]}) == "components"
    assert _claim_target_scope({"related_language": "gmw"}) == "language"
    assert _claim_target_scope({}) == "none"


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
        "component_source_entries": [
            _entry("sv|flee|verb||sense-flee", "sv", "flee", "sense-flee", "to flee", [{
                "template_index": 0, "template_name": "inh", "relation": "inherited_from",
                "related_language": "gem-pro", "related_form": "*fleus",
            }]),
        ],
        "pair_claim_matches": [{
            "match_id": "match-one",
            "candidate": {"forms": [{"language_code": "sv", "word": "fleece"}, {"language_code": "en", "word": "fleece"}]},
            "source_entry": {"source_entry_key": source_entry_key, "language_code": "sv", "word": "fleece", "source_url": "https://en.wiktionary.org/wiki/fleece#Swedish"},
            "source_active_sense": {"source_sense_id": "sense-sv"},
            "claim": {"relation": "borrowed_from", "related_language": "en", "related_form": "fleece", "evidence": {"template_index": 0, "template_name": "bor", "args": claim["args"]}},
            "target_form_match": {"active_identity_status": "available", "active_entry_key": target_entry_key, "active_sense_id": "sense-en", "form_match_method": "exact"},
        }],
        "component_links": [{
            "source_entry_key": source_entry_key,
            "relation": "compound_of",
            "components": [{"index": 0, "surface_form": "flee", "raw_forms": ["flee"], "match_status": "one_exact_entry", "candidate_entry_keys": ["sv|flee|verb||sense-flee"]}],
            "evidence": [{"template_index": 1, "template_name": "com", "args": {"1": "sv", "2": "flee", "3": "ce"}}],
        }],
        "shared_component_ancestors": [{
            "ancestor": {"language_code": "gem-pro", "form": "*fleus"},
            "basis": "unique_exact_entry_only",
            "matched_uses_by_language": {
                "sv": [{"parent_entry_key": source_entry_key, "component_form": "flee", "component_entry_key": "sv|flee|verb||sense-flee"}],
                "en": [{"parent_entry_key": target_entry_key, "component_form": "flee", "component_entry_key": "sv|flee|verb||sense-flee"}],
            },
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

    assert manifest["case_groups"] == ["fleece"]
    assert manifest["tables"]["entries.csv"]["rows"] == 3
    assert manifest["tables"]["comparisons.csv"]["rows"] == 1
    assert manifest["tables"]["claim-matches.csv"]["rows"] == 1
    assert manifest["tables"]["shared-component-ancestor-candidates.csv"]["rows"] == 1
    assert manifest["source_dump_files"]["sv"]["source_file_sha256"] == "dump-hash"
    assert manifest["source_snapshot"]["provider_url"] == "https://kaikki.org/dictionary/rawdata.html"
    assert "pipeline/src/export_case_evidence_cldf.py" in manifest["transformation_files"]
    assert manifest["summary"]["comparisons_by_legacy_label"] == {"other": 1}
    assert manifest["summary"]["matched_source_claim_records_by_legacy_label"]["other"] == {"borrowed_from:available": 1}
    assert manifest["summary"]["normalized_relation_targets"] == 2
    metadata = json.loads((output / "metadata.json").read_text(encoding="utf-8"))
    assert metadata["dc:conformsTo"].endswith("#Generic")
    readme = (output / "README.md").read_text(encoding="utf-8")
    assert "1 deliberately chosen Wiktionary-derived case group" in readme
    assert "individual entry revision IDs are not available for every record" in readme
    tables = {table["url"]: table for table in metadata["tables"]}
    assert "Source_Entry_ID" in {column["name"] for column in tables["forms.csv"]["tableSchema"]["columns"]}

    with (output / "source-claims.csv").open(encoding="utf-8", newline="") as stream:
        claims = list(csv.DictReader(stream))
    assert {row["Relation"] for row in claims} == {"borrowed_from", "inherited_from"}
    borrowed_claim = next(row for row in claims if row["Relation"] == "borrowed_from")
    assert borrowed_claim["Source_Uncertain"] == "false"
    assert borrowed_claim["Claim_Source_Scope"] == "entry"
    assert borrowed_claim["Claim_Target_Scope"] == "form"
    assert borrowed_claim["Related_Entity_JSON"] == "{}"
    assert borrowed_claim["Components_JSON"] == "[]"
    with (output / "claim-matches.csv").open(encoding="utf-8", newline="") as stream:
        matches = list(csv.DictReader(stream))
    assert matches[0]["Target_Identity_Status"] == "available"
    assert matches[0]["Comparison_Source_Sense_ID"] == "sense-sv"
    assert matches[0]["Comparison_Target_Sense_ID"] == "sense-en"
    with (output / "component-links.csv").open(encoding="utf-8", newline="") as stream:
        components = list(csv.DictReader(stream))
    assert json.loads(components[0]["Evidence_JSON"])[0]["template_name"] == "com"
    assert len(json.loads(components[0]["Candidate_Entry_IDs_JSON"])) == 1
    assert components[0]["Candidate_Entry_Resolution"] == "resolved"
    with (output / "shared-component-ancestor-candidates.csv").open(encoding="utf-8", newline="") as stream:
        ancestors = list(csv.DictReader(stream))
    assert ancestors[0]["Ancestor_Form"] == "*fleus"
    matched_uses = json.loads(ancestors[0]["Matched_Uses_JSON"])
    assert set(matched_uses) == {"en", "sv"}
    assert matched_uses["sv"][0]["component_entry_id"]
    assert all(re.fullmatch(r"[A-Za-z0-9_-]+", row["ID"]) for rows in (
        claims, matches, components, ancestors,
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


def test_exports_target_entry_candidates_without_resolving_senses(tmp_path):
    source_key = "sv|fleece|noun||sense-sv"
    claim = {
        "template_index": 0, "template_name": "bor", "relation": "borrowed_from",
        "args": {"1": "sv", "2": "en", "3": "fleece"},
        "related_language": "en", "related_form": "fleece", "source_uncertain": False,
    }
    duplicate_claim = {
        **claim,
        "template_index": 1,
        "template_name": "bor+",
        "source_uncertain": True,
    }
    candidate_key = "en|fleece|noun||candidate-sense-en"
    source = tmp_path / "slice.jsonl"
    source.write_text(json.dumps({
        "case_id": "fleece",
        "source_entries": [
            _entry(source_key, "sv", "fleece", "sense-sv", "polar fleece", [claim, duplicate_claim]),
            _entry(candidate_key, "en", "fleece", "candidate-sense-en", "wool"),
        ],
        "comparisons": [],
    }) + "\n", encoding="utf-8")
    candidate_claim = {
        "template_index": 0, "template_name": "inh", "relation": "inherited_from",
        "args": {"1": "en", "2": "gmw-pro", "3": "*fleus"},
        "related_language": "gmw-pro", "related_form": "*fleus",
    }
    return_claim = {
        "template_index": 1, "template_name": "cog", "relation": "cognate_mention",
        "args": {"1": "en", "2": "sv", "3": "fleece"},
        "related_language": "sv", "related_form": "fleece",
    }
    target_input = tmp_path / "target-entries.jsonl"
    target_input.write_text(json.dumps({
        "claim_id": _claim_id(source_key, claim),
        "target_language": "en",
        "claimed_form": "fleece",
        "match_status": "exact",
        "candidate_entries": [{
            "source_entry_key": candidate_key,
            "language_code": "en",
            "word": "fleece",
            "part_of_speech": "noun",
            "etymology_number": None,
            "source_file": "kaikki_en.jsonl",
            "source_line": 42,
            "source_url": "https://en.wiktionary.org/wiki/fleece#English",
            "etymology_text": "From Old English, from Proto-West Germanic *fleus.",
            "source_senses": [{"id": "candidate-sense-en", "glosses": ["wool"], "tags": []}],
            "source_claims": [candidate_claim, return_claim],
        }],
    }, ensure_ascii=False) + "\n", encoding="utf-8")

    output = tmp_path / "cldf"
    manifest = export_slice(source, output, target_entries_path=target_input)

    with (output / "claim-target-resolutions.csv").open(encoding="utf-8", newline="") as stream:
        resolutions = list(csv.DictReader(stream))
    with (output / "claim-target-candidates.csv").open(encoding="utf-8", newline="") as stream:
        candidates = list(csv.DictReader(stream))
    with (output / "entries.csv").open(encoding="utf-8", newline="") as stream:
        entries = list(csv.DictReader(stream))
    with (output / "source-claims.csv").open(encoding="utf-8", newline="") as stream:
        claims = list(csv.DictReader(stream))
    with (output / "source-relation-targets.csv").open(encoding="utf-8", newline="") as stream:
        relation_targets = list(csv.DictReader(stream))
    with (output / "claim-target-cross-references.csv").open(encoding="utf-8", newline="") as stream:
        cross_references = list(csv.DictReader(stream))

    assert manifest["tables"]["claim-target-resolutions.csv"]["rows"] == 1
    assert manifest["tables"]["source-relation-targets.csv"]["rows"] == 3
    assert resolutions[0]["Match_Status"] == "exact"
    assert resolutions[0]["Claimed_Form"] == "fleece"
    assert len(candidates) == 1
    assert candidates[0]["Resolution_ID"] == resolutions[0]["ID"]
    target_entry = next(row for row in entries if row["Source_Entry_Key"] == candidate_key)
    assert candidates[0]["Target_Entry_ID"] == target_entry["ID"]
    assert target_entry["Etymology_Text"].startswith("From Old English")
    assert target_entry["Source_Line"] == "42"
    assert any(row["Relation"] == "inherited_from" for row in claims)
    borrowed_occurrences = [row for row in claims if row["Relation"] == "borrowed_from"]
    assert len(borrowed_occurrences) == 2
    assert borrowed_occurrences[0]["Source_Relation_Target_ID"] == borrowed_occurrences[1]["Source_Relation_Target_ID"]
    assert {row["Source_Uncertain"] for row in borrowed_occurrences} == {"false", "true"}
    assert resolutions[0]["Source_Relation_Target_ID"] == borrowed_occurrences[0]["Source_Relation_Target_ID"]
    assert len(relation_targets) == 3
    assert len(cross_references) == 1
    assert manifest["summary"]["target_claim_cross_references_by_relation_pair"] == {
        "borrowed_from->cognate_mention": 1,
    }
    assert cross_references[0]["Source_Claim_ID"] == borrowed_occurrences[0]["ID"]


def test_preserves_one_template_that_expands_to_multiple_normalized_claims(tmp_path):
    source_key = "en|bank|noun|1|sense-bank"
    base = {
        "template_index": 4,
        "template_name": "cog",
        "relation": "cognate_mention",
        "args": {"1": "en", "2": "da,sv", "3": "bank"},
    }
    claims = [
        {**base, "related_language": "da", "related_form": "bank"},
        {**base, "related_language": "sv", "related_form": "bank"},
    ]
    source = tmp_path / "slice.jsonl"
    source.write_text(json.dumps({
        "case_id": "bank",
        "source_entries": [_entry(source_key, "en", "bank", "sense-bank", "financial institution", claims)],
        "comparisons": [],
    }) + "\n", encoding="utf-8")

    output = tmp_path / "cldf"
    manifest = export_slice(source, output)
    with (output / "source-claims.csv").open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    with (output / "source-relation-targets.csv").open(encoding="utf-8", newline="") as stream:
        targets = list(csv.DictReader(stream))

    assert len(rows) == 2
    assert len({row["ID"] for row in rows}) == 2
    assert {row["Template_Occurrence_ID"] for row in rows} == {_template_occurrence_id(source_key, claims[0])}
    assert {row["Source_Relation_Target_ID"] for row in rows} == {row["ID"] for row in targets}
    assert manifest["summary"]["source_template_occurrences"] == 1
    assert manifest["summary"]["normalized_relation_targets"] == 2


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


def test_rejects_an_unreferenced_relation_target():
    tables = [
        ("languages.csv", ["ID"], [{"ID": "en"}]),
        ("entries.csv", ["ID", "Language_ID"], [{"ID": "entry-1", "Language_ID": "en"}]),
        ("source-claims.csv", ["ID", "Source_Relation_Target_ID"], []),
        ("source-relation-targets.csv", ["ID", "Entry_ID"], [{"ID": "target-1", "Entry_ID": "entry-1"}]),
    ]
    try:
        _validate_table_links(tables)
    except ValueError as error:
        assert "Unreferenced normalized relation target" in str(error)
    else:
        raise AssertionError("Expected orphan normalized relation targets to fail validation")


def test_exports_ambiguous_comparison_identity_candidates_as_entry_and_sense_links(tmp_path):
    candidate_key = "nb|ombudsmann|noun||sense-a,sense-b"
    comparison = _comparison(
        "en", "ombudsman", "en|ombudsman|noun||sense-en", "sense-en", "ombudsman",
        "nb", "ombudsmann", "", "", "an ombudsman",
    )
    comparison["senses_b"] = [{
        "source_entry_key": None,
        "source_sense_id": None,
        "source_identity_ambiguous": True,
        "source_identity_candidates": [
            {"source_entry_key": candidate_key, "source_sense_id": "sense-a"},
            {"source_entry_key": candidate_key, "source_sense_id": "sense-b"},
        ],
        "gloss": "an ombudsman",
        "pos": "noun",
        "is_active_match": True,
    }]
    source = tmp_path / "slice.jsonl"
    source.write_text(json.dumps({
        "case_id": "ombudsman",
        "comparisons": [comparison],
        "source_entries": [{
            **_entry(candidate_key, "nb", "ombudsmann", "sense-a", "an ombudsman"),
            "source_senses": [
                {"id": "sense-a", "glosses": ["an ombudsman"], "tags": ["masculine"]},
                {"id": "sense-b", "glosses": ["an ombudsman"], "tags": ["masculine"]},
            ],
        }],
    }, ensure_ascii=False) + "\n", encoding="utf-8")

    output = tmp_path / "cldf"
    export_slice(source, output)

    with (output / "forms.csv").open(encoding="utf-8", newline="") as stream:
        forms = list(csv.DictReader(stream))
    target = next(row for row in forms if row["Language_ID"] == "nb")
    candidates = json.loads(target["Source_Identity_Candidates_JSON"])
    assert target["Source_Identity_Status"] == "ambiguous"
    assert target["Source_Entry_ID"] == ""
    assert len(candidates) == 2
    assert {candidate["Source_Sense_ID"] for candidate in candidates} == {"sense-a", "sense-b"}
    assert {candidate["Resolution_Status"] for candidate in candidates} == {"resolved"}
    assert all(candidate["Entry_ID"] and candidate["Sense_ID"] for candidate in candidates)
