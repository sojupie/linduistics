import json

from audit_etymology_component_entries import audit_component_entry_coverage


def test_component_coverage_counts_unique_exact_entry_candidates_without_claiming_sense_links(tmp_path):
    path = tmp_path / "source_records.jsonl"
    records = [
        {
            "language_code": "sv",
            "word": "bankman",
            "source_entry_key": "sv|bankman|noun|",
            "claims": [
                {"relation": "formed_from", "components": ["bank", "man<t:man>", "-s-"]},
                {"relation": "compound_of", "components": ["bank", "man", "-s-"]},
            ],
        },
        {"language_code": "sv", "word": "bank", "source_entry_key": "sv|bank|noun|", "claims": []},
        {"language_code": "sv", "word": "man", "source_entry_key": "sv|man|noun|1", "claims": []},
        {"language_code": "sv", "word": "man", "source_entry_key": "sv|man|noun|2", "claims": []},
    ]
    path.write_text("".join(json.dumps(record) + "\n" for record in records), encoding="utf-8")

    result = audit_component_entry_coverage(path)

    assert result["source_records"] == 4
    assert result["component_claim_vectors"] == {"raw": 2, "unique_within_source_entry": 1}
    assert result["component_occurrences"] == {
        "total": 3,
        "by_exact_entry_match": {
            "multiple_exact_entries": 1,
            "no_exact_entry": 1,
            "one_exact_entry": 1,
        },
        "by_language": {
            "sv": {
                "multiple_exact_entries": 1,
                "no_exact_entry": 1,
                "one_exact_entry": 1,
            }
        },
    }
    assert "does not resolve senses" in result["matching_rule"]
