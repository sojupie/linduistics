import json

import pyarrow as pa
import pyarrow.parquet as pq

from enrich_comparisons_with_source_claims import enrich_comparisons


def test_attaches_scoped_claim_to_matching_source_sense_in_both_directions(tmp_path):
    source_sense = {
        "source_entry_key": "sv|te|noun|1|entry-sv",
        "source_sense_id": "sense-sv",
        "is_active_match": True,
        "gloss": "tea",
    }
    target_sense = {
        "source_entry_key": "de|Tee|noun|1|entry-de",
        "source_sense_id": "sense-de",
        "is_active_match": True,
        "gloss": "tea",
    }
    rows = [
        {
            "lang_a": "sv", "word_a": "te", "lang_b": "de", "word_b": "Tee",
            "category": "other", "etymological_relation": "unknown",
            "senses_a": json.dumps([source_sense]), "senses_b": json.dumps([target_sense]),
        },
        {
            "lang_a": "de", "word_a": "Tee", "lang_b": "sv", "word_b": "te",
            "category": "other", "etymological_relation": "unknown",
            "senses_a": json.dumps([target_sense]), "senses_b": json.dumps([source_sense]),
        },
    ]
    input_path = tmp_path / "comparisons.parquet"
    pq.write_table(pa.Table.from_pylist(rows), input_path)

    claim = {
        "match_id": "claim-match-1",
        "candidate": {"forms": [
            {"language_code": "de", "word": "Tee"},
            {"language_code": "sv", "word": "te"},
        ], "category": "other"},
        "source_entry": {
            "source": "Wiktionary via Kaikki/Wiktextract",
            "source_file": "kaikki_sv.jsonl",
            "source_url": "https://en.wiktionary.org/wiki/te#Swedish",
            "source_entry_key": "sv|te|noun|1|entry-sv",
            "language_code": "sv", "word": "te", "part_of_speech": "noun",
            "etymology_number": "1",
        },
        "source_active_sense": {
            "source_sense_id": "sense-sv", "gloss": "tea", "etymological_root": None,
        },
        "claim": {
            "relation": "cognate_mention",
            "scope": {"source": "entry", "target": "form"},
            "related_language": "de", "related_form": "tee",
            "source_uncertain": None, "analysis_basis": None,
            "evidence": {"template_name": "cog", "args": {"1": "de", "2": "Tee"}},
        },
        "target_form_match": {
            "language_code": "de", "form": "tee",
            "active_entry_key": None, "active_sense_id": None,
            "active_sense_gloss": None, "active_sense_etymological_root": None,
            "active_identity_status": "ambiguous", "form_match_method": "casefold_fallback",
            "source_identity_candidates": [{"source_entry_key": "de|Tee|noun|2", "source_sense_id": "sense-de-2"}],
        },
    }
    second_claim = json.loads(json.dumps(claim))
    second_claim["match_id"] = "claim-match-2"
    second_claim["claim"]["relation"] = "borrowed_from"
    second_claim["claim"]["evidence"]["template_name"] = "bor+"
    matches_path = tmp_path / "claims.jsonl"
    matches_path.write_text(
        "".join(json.dumps(record, ensure_ascii=False) + "\n" for record in (claim, second_claim)),
        encoding="utf-8",
    )
    output_path = tmp_path / "enriched.parquet"

    report = enrich_comparisons(input_path, matches_path, output_path)
    output_rows = pq.read_table(output_path).to_pylist()
    forward_source = json.loads(output_rows[0]["senses_a"])[0]["source_claims"]
    reverse_source = json.loads(output_rows[1]["senses_b"])[0]["source_claims"]

    assert report["source_claim_matches"] == 2
    assert report["source_claim_matches_attached"] == 4
    assert report["source_claim_match_records_unmatched"] == 0
    assert forward_source == reverse_source
    assert {record["relation"] for record in forward_source} == {"cognate_mention", "borrowed_from"}
    assert all(record["scope"] == {"source": "entry", "target": "form"} for record in forward_source)
    assert all(record["source_entry"]["source_url"].endswith("te#Swedish") for record in forward_source)
    assert all(record["target_form_match"]["active_identity_status"] == "ambiguous" for record in forward_source)
    assert all(record["target_form_match"]["form_match_method"] == "casefold_fallback" for record in forward_source)
    assert "source_claims" not in json.loads(output_rows[0]["senses_b"])[0]
    assert output_rows[0]["etymological_relation"] == "unknown"


def test_cleans_source_annotation_and_recomputes_etymological_classification(tmp_path):
    root = "Proto-Germanic *foo"
    source = {
        "source_entry_key": "sv|foo|noun|1|sv-foo",
        "source_sense_id": "sv-foo",
        "is_active_match": True,
        "etym_root": root + "<pos:ancestor form>",
    }
    target = {
        "source_entry_key": "da|foo|noun|1|da-foo",
        "source_sense_id": "da-foo",
        "is_active_match": True,
        "etym_root": root,
    }
    row = {
        "lang_a": "sv", "word_a": "foo", "ipa_a": "fu", "def_a": "foo", "pos_a": "noun",
        "lang_b": "da", "word_b": "foo", "ipa_b": "fu", "def_b": "foo", "pos_b": "noun",
        "orthographic_sim": 1.0, "phonetic_sim": 1.0, "semantic_sim": 0.9,
        "category": "other", "etymological_relation": "unknown",
        "senses_a": json.dumps([source]), "senses_b": json.dumps([target]),
        "etym_root_a": source["etym_root"], "etym_root_b": root, "shared_etym_root": None,
        "etym_text_a": "", "etym_text_b": "", "translation_source_senses": "[]",
    }
    input_path = tmp_path / "comparisons.parquet"
    schema = pa.schema([
        (name, pa.float64() if name.endswith("_sim") else pa.string())
        for name in row
    ])
    pq.write_table(pa.Table.from_pylist([row], schema=schema), input_path)
    matches_path = tmp_path / "claims.jsonl"
    matches_path.write_text("", encoding="utf-8")
    output_path = tmp_path / "cleaned.parquet"

    report = enrich_comparisons(input_path, matches_path, output_path)
    result = pq.read_table(output_path).to_pylist()[0]

    assert result["etym_root_a"] == root
    assert json.loads(result["senses_a"])[0]["etym_root"] == root
    assert result["shared_etym_root"] == root
    assert result["etymological_relation"] == "cognate"
    assert result["category"] == "true_cognate"
    assert report["root_values_normalized"] == 1
    assert sum(report["category_counts_before_and_after"]["after"].values()) == 1
    assert report["category_values_changed_from_root_cleanup"] == 1
    assert report["etymological_relation_values_changed_from_root_cleanup"] == 1
