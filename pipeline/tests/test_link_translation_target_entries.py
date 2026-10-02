import hashlib
import json

from link_translation_target_entries import link_translation_target_entries


def test_target_entry_links_preserve_homographs_form_links_and_case_ambiguity(tmp_path):
    claims = tmp_path / "translation_claims.jsonl"
    claims.write_text(
        "\n".join(
            json.dumps(item, ensure_ascii=False)
            for item in (
                {"target_lang": "nb", "target_form": "går"},
                {"target_lang": "nb", "target_form": "GÅR"},
                {"target_lang": "nb", "target_form": "missing"},
                {"target_lang": "nb", "target_form": "  "},
                {"target_lang": "fr", "target_form": "aller"},
            )
        )
        + "\n",
        encoding="utf-8",
    )
    target_dir = tmp_path / "sources"
    target_dir.mkdir()
    source_entries = [
        {
            "lang_code": "nb",
            "word": "går",
            "pos": "verb",
            "etymology_text": "From Old Norse.",
            "etymology_templates": [{"name": "com", "args": {"1": "nb", "2": "gå", "3": "r"}}],
            "senses": [
                {
                    "id": "nb-gå-verb-present",
                    "glosses": ["goes"],
                    "tags": ["present"],
                    "form_of": [{"word": "gå"}],
                }
            ],
        },
        {"lang_code": "nb", "word": "går", "pos": "noun", "senses": [{"id": "nb-gård-noun"}]},
        {"lang_code": "nb", "word": "Går", "pos": "name", "senses": [{"id": "nb-Går-name"}]},
    ]
    for lang in ("da", "de", "nb", "sv"):
        path = target_dir / f"kaikki_{lang}.jsonl"
        entries = source_entries if lang == "nb" else []
        path.write_text(
            "".join(json.dumps(entry, ensure_ascii=False) + "\n" for entry in entries),
            encoding="utf-8",
        )
    output = tmp_path / "target_entries.jsonl"

    manifest = link_translation_target_entries(claims, target_dir, output)

    records = [json.loads(line) for line in output.read_text(encoding="utf-8").splitlines()]
    assert len(records) == 3
    assert [record["target_word"] for record in records] == ["går", "går", "Går"]
    assert records[0]["exact_translation_forms"] == ["går"]
    assert records[0]["casefold_translation_forms"] == ["GÅR"]
    assert records[0]["target_senses"][0]["form_of"] == [{"word": "gå"}]
    assert records[0]["target_etymology_text"] == "From Old Norse."
    assert records[0]["target_etymology_claims"][0]["relation"] == "compound_of"
    assert records[0]["target_etymology_claims"][0]["components"] == ["gå", "r"]
    assert manifest["resolution_by_language"]["nb"] == {
        "translation_claims": 4,
        "claims_without_target_form": 1,
        "unique_translation_forms": 3,
        "exact_forms_found": 1,
        "casefold_only_forms_found": 1,
        "ambiguous_casefold_forms": 1,
        "forms_not_found": 1,
        "target_source_entries": 3,
    }
    assert manifest["claims_file_sha256"] == hashlib.sha256(claims.read_bytes()).hexdigest()
