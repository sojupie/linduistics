import gzip
import json

from audit_etymology_component_entries import audit_component_entry_coverage


def test_component_coverage_counts_unique_exact_entry_candidates_without_claiming_sense_links(tmp_path):
    etymology_path = tmp_path / "source_records.jsonl"
    etymology_records = [
        {
            "language_code": "sv",
            "word": "bankman",
            "source_entry_key": "sv|bankman|noun|",
            "claims": [
                {"relation": "formed_from", "components": ["bank", "man<t:man>", "-s-"]},
                {"relation": "compound_of", "components": ["bank", "man", "-s-"]},
            ],
        }
    ]
    etymology_path.write_text("".join(json.dumps(record) + "\n" for record in etymology_records), encoding="utf-8")
    entry_dump = tmp_path / "kaikki_sv.jsonl"
    entries = [
        {"lang_code": "sv", "word": "bank", "pos": "noun", "senses": [{"id": "bank-1", "glosses": ["a financial institution"]}]},
        {"lang_code": "sv", "word": "man", "pos": "noun", "etymology_number": "1", "senses": [{"id": "man-1", "glosses": ["an adult male"]}]},
        {"lang_code": "sv", "word": "man", "pos": "noun", "etymology_number": "2", "senses": [{"id": "man-2", "glosses": ["a husband"]}]},
    ]
    entry_dump.write_text("".join(json.dumps(entry) + "\n" for entry in entries), encoding="utf-8")
    candidates_output = tmp_path / "component_candidates.jsonl.gz"

    result = audit_component_entry_coverage(etymology_path, [entry_dump], candidates_output)

    assert result["source_dump_entries"] == 3
    assert result["etymology_records_file"] == "source_records.jsonl"
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
    assert "does not select a component sense" in result["matching_rule"]
    assert result["candidate_output"]["records"] == 2
    with gzip.open(candidates_output, "rt", encoding="utf-8") as candidates:
        projected = [json.loads(line) for line in candidates]
    bankman = projected[0]
    assert bankman["source_entry_key"] == "sv|bankman|noun|"
    assert bankman["relation"] == "formed_from"
    assert [component["match_status"] for component in bankman["components"]] == [
        "one_exact_entry",
        "multiple_exact_entries",
        "no_exact_entry",
    ]
    assert bankman["components"][0]["candidate_entry_details"][0]["senses"] == [
        {"id": "bank-1", "glosses": ["a financial institution"]},
    ]
    assert [
        sense["id"]
        for candidate in bankman["components"][1]["candidate_entry_details"]
        for sense in candidate["senses"]
    ] == ["man-1", "man-2"]
