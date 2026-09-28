import json

from export_source_facts import export_source_facts


def test_exports_linked_person_and_formation_facts_with_stable_ids(tmp_path):
    source = tmp_path / "source_records.jsonl"
    source.write_text("\n".join([
        json.dumps({
            "source": "Wiktionary via Kaikki/Wiktextract",
            "source_file": "kaikki_sv.jsonl",
            "source_url": "https://en.wiktionary.org/wiki/dator#Swedish",
            "source_entry_key": "sv|dator|noun||sense-1",
            "language_code": "sv",
            "word": "dator",
            "part_of_speech": "noun",
            "etymology_number": None,
            "etymology_text": "not copied into the facts output",
            "claims": [{
                "template_index": 0,
                "template_name": "coinage",
                "relation": "coined_by",
                "formation_type": "coinage",
                "related_entity": {"wikidata_id": "Q123"},
                "args": {"1": "sv", "2": "Q123", "in": "1956"},
            }],
        }),
        json.dumps({
            "source_entry_key": "sv|plopp|noun||sense-2",
            "language_code": "sv",
            "word": "plopp",
            "part_of_speech": "noun",
            "claims": [{
                "template_index": 0,
                "template_name": "onomatopoeic",
                "relation": None,
                "formation_type": "onomatopoeic",
                "source_label": "imitative",
                "args": {"1": "sv", "title": "imitative"},
            }],
        }),
        json.dumps({
            "source_entry_key": "sv|fleece|noun||sense-3",
            "language_code": "sv",
            "word": "fleece",
            "claims": [{"relation": "borrowed_from", "related_language": "en"}],
        }),
    ]) + "\n", encoding="utf-8")
    output = tmp_path / "facts.jsonl"

    manifest = export_source_facts(source, output)

    facts = [json.loads(line) for line in output.read_text(encoding="utf-8").splitlines()]
    assert [fact["word"] for fact in facts] == ["dator", "plopp"]
    assert facts[0]["related_entity"] == {"wikidata_id": "Q123"}
    assert facts[0]["formation_type"] == "coinage"
    assert facts[1]["relation"] is None
    assert facts[1]["source_label"] == "imitative"
    assert all("etymology_text" not in fact for fact in facts)
    assert len({fact["fact_id"] for fact in facts}) == 2
    assert manifest["facts"] == 2
    assert manifest["facts_by_relation"] == {"coined_by": 1}
    assert manifest["facts_by_formation_type"] == {"coinage": 1, "onomatopoeic": 1}

    first_ids = [fact["fact_id"] for fact in facts]
    export_source_facts(source, output, force=True)
    second_ids = [
        json.loads(line)["fact_id"] for line in output.read_text(encoding="utf-8").splitlines()
    ]
    assert first_ids == second_ids
