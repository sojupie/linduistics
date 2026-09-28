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
    assert edge["comparison"] == {"category": "false_friend", "etymological_relation": "unknown"}
    assert edge["edge"]["relation"] == "borrowed_from"
    assert edge["evidence"] == [
        {"template_index": 0, "template_name": "ety", "args": {"1": "sv", "2": ":bor", "3": "en:fleece"}},
        {"template_index": 1, "template_name": "bor", "args": {"1": "sv", "2": "en", "3": "fleece"}},
    ]
    assert manifest["counts"] == {
        "cases": 1,
        "unique_source_edges": 1,
        "source_template_evidence_records": 2,
        "unmapped_or_nonrelation_claims_skipped": 1,
    }


def test_case_projection_preserves_current_source_audit_entry_fields(tmp_path):
    audit = tmp_path / "audit.jsonl"
    audit.write_text(json.dumps({
        "audit_key": "sv|bank|en|bank",
        "comparison": {"category": "other", "etymological_relation": "unknown"},
        "source_entries": {
            "sv": [{
                "word": "bank",
                "part_of_speech": "noun",
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

    project_source_case_edges([audit], output)

    edge = json.loads(output.read_text(encoding="utf-8").splitlines()[0])
    assert edge["source_entry"] == {
        "language": "sv",
        "word": "bank",
        "part_of_speech": "noun",
        "entry_key": "sv|bank|noun||source-id",
        "etymology_text": "Borrowed from English bank.",
    }
