import io
import orjson
import pyarrow.parquet as pq
import pytest
from parser import extract_etym_root, parse_kaikki_entry, stream_kaikki_entries, export_lemmas_to_parquet


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


def test_parse_preserves_source_entry_sense_and_etymology_identity():
    raw = {
        "word": "gift",
        "lang_code": "sv",
        "pos": "noun",
        "etymology_number": "1",
        "etymology_templates": [
            {"args": {"2": "gem-pro", "3": "giftiz"}}
        ],
        "senses": [{"id": "sv-gift-noun-1", "glosses": ["poison"]}],
    }

    entry = parse_kaikki_entry(raw)

    assert entry is not None
    sense = entry["senses"][0]
    assert sense["source_entry_key"] == "sv|gift|noun|1|sv-gift-noun-1"
    assert sense["source_sense_id"] == "sv-gift-noun-1"
    assert sense["etymology_number"] == "1"
    assert sense["etym_root"] == "Proto-Germanic *giftiz"


def test_etym_root_ignores_dercat_language_list_and_uses_an_actual_ancestor_form():
    raw = {
        "word": "Ente",
        "lang_code": "de",
        "pos": "noun",
        "etymology_templates": [
            {"name": "dercat", "args": {"1": "de", "2": "gem-pro", "3": "ine-pro", "inh": "1"}},
            {"name": "inh", "args": {"1": "de", "2": "gmh", "3": "ente"}},
            {"name": "der", "args": {"1": "de", "2": "gmw-pro", "3": "*anad"}},
        ],
        "senses": [{"id": "de-ente", "glosses": ["duck"]}],
    }

    entry = parse_kaikki_entry(raw)

    assert entry is not None
    assert entry["etym_root"] == "Proto-West Germanic *anad"


def test_etym_root_strips_wiktextract_position_annotation_from_source_form():
    raw = {
        "word": "pedicate",
        "lang_code": "en",
        "pos": "verb",
        "etymology_templates": [{
            "name": "bor+",
            "args": {
                "1": "en",
                "2": "la",
                "3": "pēdicāt-<pos:perfect passive participial stem of <i lang=\"la\">pēdicō</i>>",
            },
        }],
        "senses": [{"id": "en-pedicate", "glosses": ["to sodomize"]}],
    }

    entry = parse_kaikki_entry(raw)

    assert entry is not None
    assert entry["etym_root"] == "Latin pēdicāt-"


def test_etym_root_preserves_html_text_and_uses_inline_alternate_form():
    html_root = {
        "etymology_templates": [{
            "args": {"1": "en", "2": "la", "3": 'fons <i class="Latn mention" lang="la">fontis</i> + -us'},
        }],
    }
    alt_root = {
        "etymology_templates": [{
            "args": {"1": "en", "2": "la", "3": '<alt:tripod-><ng:stem of <i lang="la">tripūs</i>>'},
        }],
    }

    assert extract_etym_root(html_root)[0] == "Latin fons fontis + -us"
    assert extract_etym_root(alt_root)[0] == "Latin tripod-"


def test_stream_keeps_same_gloss_from_distinct_entries_and_blanks_ambiguous_scalars():
    lines = [
        orjson.dumps({
            "word": "gift",
            "lang_code": "sv",
            "pos": "noun",
            "etymology_number": "1",
            "etymology_templates": [{"args": {"2": "gem-pro", "3": "giftiz"}}],
            "etymology_text": "Noun history.",
            "senses": [{"id": "gift-n", "glosses": ["poison"]}],
        }),
        orjson.dumps({
            "word": "gift",
            "lang_code": "sv",
            "pos": "adjective",
            "etymology_number": "2",
            "etymology_text": "Adjective history.",
            "senses": [{"id": "gift-adj", "glosses": ["poison"]}],
        }),
    ]

    lemma = stream_kaikki_entries(io.BytesIO(b"\n".join(lines)), lang="sv")["gift"]

    assert len(lemma["senses"]) == 2
    assert [sense["pos"] for sense in lemma["senses"]] == ["noun", "adjective"]
    assert lemma["senses"][0]["etym_root"] == "Proto-Germanic *giftiz"
    assert lemma["senses"][1]["etym_root"] == ""
    assert lemma["etym_root"] == ""
    assert lemma["etym_text"] == ""


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
