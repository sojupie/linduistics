import io
import orjson
import pyarrow.parquet as pq
import pytest
from parser import parse_kaikki_entry, stream_kaikki_entries, export_lemmas_to_parquet


def test_parse_kaikki_entry_valid_lemma():
    raw = {
        "word": "hund",
        "pos": "noun",
        "lang_code": "sv",
        "sounds": [{"ipa": "/hɵnd/"}],
        "senses": [
            {
                "glosses": ["dog (canine mammal)"],
                "tags": ["common-gender"]
            }
        ]
    }
    result = parse_kaikki_entry(raw)
    assert result is not None
    assert result["word"] == "hund"
    assert result["pos"] == "noun"
    assert result["ipa"] == "hɵnd"
    assert result["glosses"] == ["dog (canine mammal)"]


def test_etymology_text_sister_mentions_do_not_become_the_entry_root():
    raw = {
        "word": "ost",
        "pos": "noun",
        "lang_code": "da",
        "senses": [{"glosses": ["cheese"]}],
        "etymology_text": "From Proto-Germanic *jūstaz; compare Swedish ost and English east from *austrą.",
    }
    result = parse_kaikki_entry(raw)
    assert result is not None
    assert result["etym_root"] == ""


def test_parse_kaikki_entry_rejects_inflection_tags():
    # Top-level tags containing "form-of"
    raw = {
        "word": "hundar",
        "pos": "noun",
        "tags": ["form-of"],
        "senses": [{"glosses": ["indefinite plural of hund"]}]
    }
    assert parse_kaikki_entry(raw) is None

    # Sense-level tags containing "form-of"
    raw_sense = {
        "word": "hundens",
        "pos": "noun",
        "senses": [{"glosses": ["definite singular genitive of hund"], "tags": ["form-of"]}]
    }
    assert parse_kaikki_entry(raw_sense) is None


def test_parse_kaikki_entry_rejects_form_of_field():
    raw = {
        "word": "sprungit",
        "pos": "verb",
        "senses": [
            {
                "glosses": ["supine of springa"],
                "form_of": [{"word": "springa"}]
            }
        ]
    }
    assert parse_kaikki_entry(raw) is None


def test_parse_kaikki_entry_filters_meta_glosses():
    raw = {
        "word": "acceptance",
        "pos": "noun",
        "senses": [
            {"glosses": ["Synonym of etendue."]},
            {"glosses": ["The act of accepting; a receiving what is offered with approbation."]},
            {"glosses": ["Alternative form of something."]},
        ],
    }
    entry = parse_kaikki_entry(raw)
    assert entry is not None
    assert len(entry["glosses"]) == 1
    assert entry["glosses"][0] == "The act of accepting; a receiving what is offered with approbation."


def test_parse_kaikki_entry_rejects_compounds_phrases_affixes():
    # Multi-word
    assert parse_kaikki_entry({"word": "god dag", "pos": "noun", "senses": [{"glosses": ["hello"]}]}) is None
    # Hyphenated
    assert parse_kaikki_entry({"word": "låg-tröskel", "pos": "noun", "senses": [{"glosses": ["low-threshold"]}]}) is None
    # Affixes
    assert parse_kaikki_entry({"word": "-aktig", "pos": "suffix", "senses": [{"glosses": ["-like"]}]}) is None
    assert parse_kaikki_entry({"word": "för-", "pos": "prefix", "senses": [{"glosses": ["pre-"]}]}) is None


def test_stream_and_aggregate_lemmas():
    lines = [
        orjson.dumps({
            "word": "gift",
            "pos": "noun",
            "sounds": [{"ipa": "/jɪft/"}],
            "senses": [{"glosses": ["poison"]}]
        }),
        orjson.dumps({
            "word": "gift",
            "pos": "adj",
            "sounds": [{"ipa": "/jɪft/"}],
            "senses": [{"glosses": ["married"]}]
        }),
        orjson.dumps({
            "word": "giftet",
            "pos": "noun",
            "tags": ["form-of"],
            "senses": [{"glosses": ["the poison"]}]
        }),
    ]
    stream = io.BytesIO(b"\n".join(lines))
    lemmas = stream_kaikki_entries(stream, lang="sv")

    assert "gift" in lemmas
    assert "giftet" not in lemmas
    assert len(lemmas) == 1

    entry = lemmas["gift"]
    assert entry["word"] == "gift"
    assert entry["ipa"] == "jɪft"
    assert "poison" in entry["glosses"]
    assert "married" in entry["glosses"]
    assert entry["lang"] == "sv"


def test_export_lemmas_to_parquet(tmp_path):
    lemmas = {
        "hund": {
            "word": "hund",
            "pos": "noun",
            "ipa": "hɵnd",
            "glosses": ["dog (canine mammal)"],
            "senses": [{"gloss": "dog (canine mammal)", "pos": "noun", "tags": [], "is_active": True}],
            "etym_root": "Proto-Germanic *hundaz",
            "etym_text": "From Proto-Germanic *hundaz.",
            "lang": "sv"
        }
    }
    out_file = tmp_path / "lemmas_sv.parquet"
    export_lemmas_to_parquet(lemmas, str(out_file))

    assert out_file.exists()
    table = pq.read_table(str(out_file))
    assert table.num_rows == 1
    assert table.column("word")[0].as_py() == "hund"
    assert table.column("ipa")[0].as_py() == "hɵnd"
    assert table.column("glosses")[0].as_py() == ["dog (canine mammal)"]
    assert table.column("lang")[0].as_py() == "sv"
