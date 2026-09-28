import json

from project_source_case_edges import project_source_case_edges


def test_case_projection_groups_duplicate_edges_but_keeps_template_evidence(tmp_path):
    audit = tmp_path / "audit.jsonl"
    audit_record = {
        "audit_key": "sv|fleece|en|fleece",
        "comparison": {"category": "false_friend", "etymological_relation": "unknown"},
        "source_entries": {
            "sv": [
                {
                    "word": "fleece",
                    "pos": "noun",
                    "key": "sv|fleece|noun||source-id",
                    "text": "Borrowed from English fleece.",
                    "claims": [
                        {
                            "template_index": 0,
                            "template_name": "ety",
                            "relation": "borrowed_from",
                            "related_language": "en",
                            "related_form": "fleece",
                            "source_uncertain": False,
                            "args": {"1": "sv", "2": ":bor", "3": "en:fleece"},
                        },
                        {
                            "template_index": 1,
                            "template_name": "bor",
                            "relation": "borrowed_from",
                            "related_language": "en",
                            "related_form": "fleece",
                            "source_uncertain": False,
                            "args": {"1": "sv", "2": "en", "3": "fleece"},
                        },
                        {"template_index": 2, "template_name": "glossary", "relation": None},
                    ],
                }
            ]
        },
    }
    audit.write_text(json.dumps(audit_record) + "\n", encoding="utf-8")
    output = tmp_path / "edges.jsonl"

    manifest = project_source_case_edges([audit], output)

    records = [json.loads(line) for line in output.read_text(encoding="utf-8").splitlines()]
    assert len(records) == 1
    edge = records[0]
    assert edge["comparison"]["category"] == "false_friend"
    assert edge["comparison"]["etymological_relation"] == "unknown"
    assert edge["source_entry"]["entry_key"] == "sv|fleece|noun||source-id"
    assert edge["source_entry"]["part_of_speech"] == "noun"
    assert edge["source_entry"]["etymology_text"] == "Borrowed from English fleece."
    assert edge["edge"]["relation"] == "borrowed_from"
    assert edge["evidence"] == [
        {"template_index": 0, "template_name": "ety", "args": {"1": "sv", "2": ":bor", "3": "en:fleece"}},
        {"template_index": 1, "template_name": "bor", "args": {"1": "sv", "2": "en", "3": "fleece"}},
    ]
    assert manifest["counts"] == {
        "cases": 1,
        "unique_source_edges": 1,
        "source_template_evidence_records": 2,
        "nonedge_source_claims_skipped": 1,
    }


def test_case_projection_preserves_current_source_audit_entry_fields(tmp_path):
    audit = tmp_path / "audit.jsonl"
    audit.write_text(json.dumps({
        "audit_key": "sv|bank|en|bank",
        "candidate_pair_match_method": "casefold",
        "comparison": {
            "id": 12,
            "lang_a": "sv",
            "word_a": "bank",
            "pos_a": "noun",
            "def_a": "financial institution",
            "lang_b": "en",
            "word_b": "bank",
            "pos_b": "noun",
            "def_b": "financial institution",
            "category": "other",
            "etymological_relation": "unknown",
            "orthographic_sim": 1.0,
            "phonetic_sim": 0.95,
            "semantic_sim": 0.9,
            "translation_source_senses": [{
                "source_entry_key": "en|bank|noun||source-id",
                "source_sense_id": "en-bank-sense",
            }],
        },
        "source_entry_match": {"sv": "exact"},
        "source_sense_matches": {"sv": [{
            "comparison_sense_id": 1,
            "comparison_sense_is_active_match": True,
            "comparison_sense_pos": "noun",
            "comparison_gloss": "financial institution",
            "match_method": "exact_gloss",
            "source_senses": [{
                "source_entry_key": "sv|bank|noun||source-id",
                "source_sense_id": "sense-1",
                "source_gloss": "financial institution",
            }],
        }]},
        "source_entries": {
            "sv": [{
                "source": "Wiktionary",
                "source_file": "kaikki_sv.jsonl",
                "source_url": "https://en.wiktionary.org/wiki/bank#Swedish",
                "word": "bank",
                "part_of_speech": "noun",
                "etymology_number": 1,
                "source_entry_key": "sv|bank|noun||source-id",
                "etymology_text": "Borrowed from English bank.",
                "claims": [{
                    "template_index": 0,
                    "template_name": "bor+",
                    "relation": "borrowed_from",
                    "related_language": "en",
                    "related_form": "bank",
                    "source_uncertain": False,
                    "args": {"1": "sv", "2": "en", "3": "bank"},
                }],
            }]
        },
    }) + "\n", encoding="utf-8")
    output = tmp_path / "edges.jsonl"

    manifest = project_source_case_edges([audit], output)

    edge = json.loads(output.read_text(encoding="utf-8").splitlines()[0])
    assert manifest["schema_version"] == 5
    assert edge["comparison"] == {
        "id": 12,
        "lang_a": "sv",
        "word_a": "bank",
        "pos_a": "noun",
        "def_a": "financial institution",
        "lang_b": "en",
        "word_b": "bank",
        "pos_b": "noun",
        "def_b": "financial institution",
        "category": "other",
        "etymological_relation": "unknown",
        "orthographic_sim": 1.0,
        "phonetic_sim": 0.95,
        "semantic_sim": 0.9,
        "translation_source_senses": [{
            "source_entry_key": "en|bank|noun||source-id",
            "source_sense_id": "en-bank-sense",
        }],
        "candidate_pair_match_method": "casefold",
    }
    assert edge["source_entry"] == {
        "source": "Wiktionary",
        "source_file": "kaikki_sv.jsonl",
        "source_url": "https://en.wiktionary.org/wiki/bank#Swedish",
        "language": "sv",
        "word": "bank",
        "part_of_speech": "noun",
        "etymology_number": 1,
        "entry_key": "sv|bank|noun||source-id",
        "etymology_text": "Borrowed from English bank.",
        "comparison_sense_matches": [{
            "comparison_sense_id": 1,
            "comparison_sense_is_active_match": True,
            "comparison_sense_pos": "noun",
            "comparison_gloss": "financial institution",
            "match_method": "exact_gloss",
            "source_senses": [{
                "source_entry_key": "sv|bank|noun||source-id",
                "source_sense_id": "sense-1",
                "source_gloss": "financial institution",
            }],
        }],
    }


def test_entity_relations_keep_distinct_targets_in_projected_edges(tmp_path):
    audit = tmp_path / "audit.jsonl"
    audit.write_text(json.dumps({
        "audit_key": "sv|dator|en|computer",
        "comparison": None,
        "source_entries": {"sv": [{
            "word": "dator",
            "source_entry_key": "sv|dator|noun||source-entry",
            "claims": [
                {"template_index": 0, "template_name": "coinage", "relation": "coined_by",
                 "formation_type": "coinage", "related_entity": {"name": "Börje Langefors"},
                 "args": {"1": "sv", "2": "Börje Langefors"}},
                {"template_index": 1, "template_name": "coinage", "relation": "coined_by",
                 "formation_type": "coinage", "related_entity": {"wikidata_id": "Q123"},
                 "args": {"1": "sv", "2": "Q123"}},
                {"template_index": 2, "template_name": "onomatopoeic", "relation": None,
                 "formation_type": "onomatopoeic", "args": {"1": "sv"}},
            ],
        }]},
    }) + "\n", encoding="utf-8")
    output = tmp_path / "edges.jsonl"

    manifest = project_source_case_edges([audit], output)

    records = [json.loads(line) for line in output.read_text(encoding="utf-8").splitlines()]
    assert len(records) == 2
    assert {
        tuple(sorted(record["edge"]["related_entity"].items())) for record in records
    } == {
        (("name", "Börje Langefors"),), (("wikidata_id", "Q123"),),
    }
    assert manifest["counts"]["nonedge_source_claims_skipped"] == 1
    assert manifest["schema_version"] == 5
