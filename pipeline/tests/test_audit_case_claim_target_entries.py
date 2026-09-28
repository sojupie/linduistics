import json

from audit_case_claim_target_entries import audit_case_claim_targets
from export_case_evidence_cldf import _claim_id


def _entry(word, sense_id, *, language="en", pos="noun", etymology_number=None):
    return {
        "lang_code": language,
        "lang": {"en": "English", "de": "German"}.get(language, language),
        "word": word,
        "pos": pos,
        "etymology_number": etymology_number,
        "senses": [{"id": sense_id, "glosses": [sense_id], "tags": []}],
    }


def test_links_all_exact_entries_and_keeps_casefold_fallbacks(tmp_path):
    source_key = "sv|fleece|noun||sv-fleece"
    claims = [
        {"template_index": 0, "template_name": "bor", "relation": "borrowed_from", "args": {}, "related_language": "en", "related_form": "fleece"},
        {"template_index": 1, "template_name": "bor", "relation": "borrowed_from", "args": {}, "related_language": "en", "related_form": "Gift"},
        {"template_index": 2, "template_name": "der", "relation": "derived_from", "args": {}, "related_language": "gem"},
        {"template_index": 3, "template_name": "inh", "relation": "inherited_from", "args": {}, "related_language": "gmw-pro", "related_form": "*fleus"},
        {"template_index": 4, "template_name": "cog", "relation": "cognate_mention", "args": {}, "related_language": "no", "related_form": "ber\u00f8ve"},
    ]
    case_slice = tmp_path / "case.jsonl"
    case_slice.write_text(json.dumps({
        "case_id": "fleece",
        "source_entries": [{"source_entry_key": source_key, "claims": claims}],
        "component_source_entries": [{"source_entry_key": source_key, "claims": claims[:1]}],
    }) + "\n", encoding="utf-8")
    target_dir = tmp_path / "dumps"
    target_dir.mkdir()
    entries = [
        _entry("fleece", "fleece-one", etymology_number=1),
        _entry("fleece", "fleece-two", etymology_number=2),
        _entry("Fleece", "fleece-capitalized"),
        _entry("gift", "gift-lowercase"),
        _entry("GIFT", "gift-uppercase"),
        _entry("fleece", "wrong-language", language="de"),
    ]
    (target_dir / "kaikki_en.jsonl").write_text("".join(json.dumps(entry) + "\n" for entry in entries), encoding="utf-8")
    for language in ("da", "de", "nb", "sv"):
        entries_for_language = [_entry("ber\u00f8ve", "nb-bereve", language="nb")] if language == "nb" else []
        (target_dir / f"kaikki_{language}.jsonl").write_text("".join(json.dumps(entry) + "\n" for entry in entries_for_language), encoding="utf-8")

    output = tmp_path / "claim_targets.jsonl"
    manifest = audit_case_claim_targets(case_slice, target_dir, output)
    rows = [json.loads(line) for line in output.read_text(encoding="utf-8").splitlines()]
    by_form = {row["claimed_form"]: row for row in rows}

    fleece = by_form["fleece"]
    assert fleece["source_entry_key"] == source_key
    assert fleece["claim_id"] == _claim_id(source_key, claims[0])
    assert fleece["match_status"] == "exact"
    assert [entry["word"] for entry in fleece["candidate_entries"]] == ["fleece", "fleece"]
    assert {entry["etymology_number"] for entry in fleece["candidate_entries"]} == {1, 2}
    gift = by_form["Gift"]
    assert gift["match_status"] == "casefold_only"
    assert {entry["word"] for entry in gift["candidate_entries"]} == {"gift", "GIFT"}
    assert by_form["*fleus"]["match_status"] == "language_not_indexed"
    norwegian = by_form["ber\u00f8ve"]
    assert norwegian["target_language"] == "no"
    assert norwegian["match_status"] == "language_not_indexed"
    assert not norwegian["candidate_entries"]
    assert manifest["counts"]["target_forms_by_match_status"] == {"casefold_only": 1, "exact": 1, "language_not_indexed": 2}
    assert manifest["counts"]["source_claims_by_scope"] == {"form": 4, "other": 1}
