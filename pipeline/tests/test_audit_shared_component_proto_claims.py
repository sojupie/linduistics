import gzip
import json

from audit_shared_component_proto_claims import audit_shared_component_proto_claims


def test_shared_proto_claim_audit_separates_ambiguous_component_candidates(tmp_path):
    etymology_path = tmp_path / "etymology.jsonl"
    entries = [
        {
            "source_entry_key": "sv|man|noun|1",
            "claims": [{
                "relation": "inherited_from",
                "related_language": "gem-pro",
                "related_form": "*mann-",
                "source_uncertain": False,
            }],
        },
        {
            "source_entry_key": "en|man|noun|1",
            "claims": [{
                "relation": "inherited_from",
                "related_language": "gem-pro",
                "related_form": "*mann-",
                "source_uncertain": False,
            }],
        },
        {
            "source_entry_key": "sv|hand|noun|1",
            "claims": [{
                "relation": "inherited_from",
                "related_language": "gem-pro",
                "related_form": "*handuz",
                "source_uncertain": False,
            }],
        },
        {
            "source_entry_key": "en|hand|noun|1",
            "claims": [{
                "relation": "inherited_from",
                "related_language": "gem-pro",
                "related_form": "*handuz",
                "source_uncertain": False,
            }],
        },
        {
            "source_entry_key": "nb|hand|noun|1",
            "language_code": "nb",
            "claims": [
                {
                    "relation": "inherited_from",
                    "related_language": "gem-pro",
                    "related_form": "*handuz",
                    "source_uncertain": False,
                },
                {
                    "relation": "inherited_from",
                    "related_language": "da",
                    "related_form": "hand",
                    "source_uncertain": False,
                },
            ],
        },
        {
            "source_entry_key": "da|mand|noun|1",
            "claims": [{
                "relation": "inherited_from",
                "related_language": "gem-pro",
                "related_form": "*mann-",
                "source_uncertain": True,
            }],
        },
    ]
    etymology_path.write_text("".join(json.dumps(entry) + "\n" for entry in entries), encoding="utf-8")
    candidate_path = tmp_path / "components.jsonl.gz"
    candidates = [
        {
            "language_code": "sv",
            "relation": "compound_of",
            "components": [{
                "match_status": "multiple_exact_entries",
                "candidate_entry_keys": ["sv|man|noun|1", "sv|man|noun|2"],
            }, {
                "match_status": "one_exact_entry",
                "component_index": 1,
                "surface_form": "hand",
                "candidate_entry_keys": ["sv|hand|noun|1"],
            }],
        },
        {
            "language_code": "en",
            "relation": "compound_of",
            "components": [{
                "match_status": "one_exact_entry",
                "candidate_entry_keys": ["en|man|noun|1"],
            }, {
                "match_status": "one_exact_entry",
                "component_index": 1,
                "surface_form": "hand",
                "candidate_entry_keys": ["en|hand|noun|1"],
            }],
        },
        {
            "language_code": "nb",
            "relation": "compound_of",
            "components": [{
                "match_status": "one_exact_entry",
                "component_index": 1,
                "surface_form": "hand",
                "candidate_entry_keys": ["nb|hand|noun|1"],
            }],
        },
        {
            "language_code": "da",
            "relation": "compound_of",
            "components": [{
                "match_status": "one_exact_entry",
                "candidate_entry_keys": ["da|mand|noun|1"],
            }],
        },
    ]
    with gzip.open(candidate_path, "wt", encoding="utf-8") as destination:
        for candidate in candidates:
            destination.write(json.dumps(candidate) + "\n")

    output_path = tmp_path / "shared_components.jsonl.gz"
    result = audit_shared_component_proto_claims(etymology_path, candidate_path, output_path)

    all_candidates = result["results"]["all_exact_entry_candidates"]["shared_proto_nodes_by_language_coverage"]
    unique = result["results"]["unique_exact_entry_only"]["shared_proto_nodes_by_language_coverage"]
    assert all_candidates == {"2": 1, "3": 1}
    assert unique == {"3": 1}
    without_peer = result["results"]["unique_exact_entry_without_peer_source_recorded"][
        "shared_proto_nodes_by_language_coverage"
    ]
    assert without_peer == {"2": 1}
    assert result["direct_project_language_source_claims"]["count_by_direction_and_relation"] == {
        "nb>da:inherited_from": 1
    }
    with gzip.open(output_path, "rt", encoding="utf-8") as source:
        projected = [json.loads(line) for line in source]
    assert len(projected) == 2
    assert {record["basis"] for record in projected} == {
        "unique_exact_entry_only",
        "unique_exact_entry_without_peer_source_recorded",
    }
    assert all(record["ancestor"] == {"language_code": "gem-pro", "form": "*handuz"} for record in projected)
    assert {tuple(sorted(record["component_uses_by_language"])) for record in projected} == {("en", "nb", "sv"), ("en", "sv")}
