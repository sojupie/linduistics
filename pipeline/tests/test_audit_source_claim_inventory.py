import json

import pytest

from audit_source_claim_inventory import audit_source_claim_inventory


def test_inventory_separates_claims_relations_and_target_shapes(tmp_path):
    source = tmp_path / "records.jsonl"
    source.write_text("\n".join([
        json.dumps({"language_code": "sv", "claims": [
            {"template_name": "bor+", "relation": "borrowed_from", "related_language": "en",
             "related_form": "fleece", "source_uncertain": True},
            {"template_name": "compound", "relation": "compound_of", "components": ["bank", "man"]},
            {"template_name": "glossary", "relation": None},
            {"template_name": "cog", "relation": "cognate_mention", "related_language": "non",
             "related_form": "", "args": {"1": "non", "2": "", "3": "*mol-"}},
        ]}),
        json.dumps({"language_code": "en", "claims": [
            {"template_name": "coinage", "relation": "coined_by", "related_entity": {"name": "A person"}},
            {"template_name": "ety", "relation": "derived_from", "related_language": "enm"},
            {"template_name": "inh", "relation": "inherited_from"},
        ]}),
    ]) + "\n", encoding="utf-8")
    output = tmp_path / "inventory.json"

    result = audit_source_claim_inventory(source, output)

    assert result["counts"] == {
        "source_entry_records": 2,
        "records_with_claims": 2,
        "claim_records": 7,
        "claims_with_normalized_relation": 6,
        "claims_without_normalized_relation": 1,
        "uncertain_claim_records": 1,
        "cognate_term_requests": 1,
    }
    assert result["claims_by_relation"] == {
        "borrowed_from": 1, "coined_by": 1, "cognate_mention": 1, "compound_of": 1,
        "derived_from": 1, "inherited_from": 1,
    }
    assert result["normalized_claim_target_shapes"] == {
        "components": 1, "entity": 1, "language_and_form": 1, "language_only": 2,
        "no_structured_target": 1,
    }
    assert result["claims_without_relation_by_template"] == {"glossary": 1}
    assert json.loads(output.read_text(encoding="utf-8")) == result


def test_inventory_rejects_existing_output_and_invalid_json(tmp_path):
    source = tmp_path / "records.jsonl"
    output = tmp_path / "inventory.json"
    source.write_text("{}\n", encoding="utf-8")
    output.write_text("{}\n", encoding="utf-8")

    with pytest.raises(FileExistsError):
        audit_source_claim_inventory(source, output)

    source.write_text("not json\n", encoding="utf-8")
    with pytest.raises(ValueError, match="line 1"):
        audit_source_claim_inventory(source, output, force=True)
