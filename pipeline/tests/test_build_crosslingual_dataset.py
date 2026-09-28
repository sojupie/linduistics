import json

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq

from build_crosslingual_dataset import (
    _lowercase_index,
    _lookup_lemma,
    align_pair_senses,
    build_pair_dataset,
    find_surface_collisions,
    load_canonical_lexicons,
    mine_translation_cliques,
)


class FixedMatcher:
    def __init__(self, vectors):
        self.vectors = vectors

    def preencode_glosses(self, _texts):
        pass

    def encode(self, texts):
        return np.asarray([self.vectors[text] for text in texts], dtype=np.float32)


def test_alignment_carries_source_identity_with_each_comparison_sense():
    matcher = FixedMatcher({"same meaning": [1.0, 0.0]})
    meta_a = {
        "word": "hund", "pos": "noun", "def": "same meaning",
        "senses": [{
            "sense_id": 3, "source_entry_key": "sv|hund|noun|1|sv-1",
            "source_sense_id": "sv-1", "etymology_number": "1",
            "etym_root": "Proto-Germanic *hundaz", "etym_text": "From *hundaz.",
            "gloss": "same meaning", "pos": "noun", "is_active": True,
        }],
    }
    meta_b = {
        "word": "Hund", "pos": "noun", "def": "same meaning",
        "senses": [{
            "sense_id": 8, "source_entry_key": "de|Hund|noun|2|de-8",
            "source_sense_id": "de-8", "etymology_number": "2",
            "etym_root": "Proto-Germanic *hundaz", "etym_text": "From *hundaz.",
            "gloss": "same meaning", "pos": "noun", "is_active": True,
        }],
    }

    aligned = align_pair_senses(meta_a, meta_b, matcher)

    assert aligned[4][0]["source_entry_key"] == "sv|hund|noun|1|sv-1"
    assert aligned[4][0]["source_sense_id"] == "sv-1"
    assert aligned[5][0]["etym_root"] == "Proto-Germanic *hundaz"


def test_alignment_leaves_same_gloss_homograph_identity_unresolved():
    matcher = FixedMatcher({"same meaning": [1.0, 0.0]})
    meta_a = {
        "word": "gift", "pos": "noun", "def": "same meaning",
        "senses": [
            {"sense_id": 1, "source_entry_key": "sv|gift|noun|1|a", "source_sense_id": "a",
             "etymology_number": "1", "gloss": "same meaning", "pos": "noun", "is_active": True,
             "etym_root": "Proto-Germanic *giftiz", "etym_text": "First history."},
            {"sense_id": 2, "source_entry_key": "sv|gift|noun|2|b", "source_sense_id": "b",
             "etymology_number": "2", "gloss": "same meaning", "pos": "noun", "is_active": True,
             "etym_root": "Proto-Germanic *another", "etym_text": "Second history."},
        ],
    }
    meta_b = {
        "word": "gift", "pos": "noun", "def": "same meaning",
        "senses": [{"sense_id": 1, "gloss": "same meaning", "pos": "noun", "is_active": True,
                    "etym_root": "Proto-Germanic *giftiz", "etym_text": "Target history."}],
    }

    aligned = align_pair_senses(meta_a, meta_b, matcher)
    matched = aligned[4][0]

    assert matched["source_identity_ambiguous"] is True
    assert matched["source_entry_key"] is None
    assert matched["source_sense_id"] is None
    assert matched["etym_root"] == ""
    assert matched["etym_text"] == ""


def test_builder_uses_the_selected_senses_not_merged_lemma_fields():
    matcher = FixedMatcher({
        "wrong A": [1.0, 0.0],
        "selected A": [0.0, 1.0],
        "wrong B": [0.5, 0.5],
        "selected B": [0.0, 1.0],
    })
    lexicons = {
        "sv": {"foo": {
            "word": "foo", "pos": "noun", "ipa": "foo", "def": "wrong A",
            "etym_root": "Proto-Germanic *wrong", "etym_text": "Wrong entry.",
            "senses": [
                {"sense_id": 1, "gloss": "wrong A", "pos": "noun", "is_active": True,
                 "etym_root": "Proto-Germanic *wrong", "etym_text": "Wrong entry."},
                {"sense_id": 2, "source_entry_key": "sv|foo|verb|2|foo-2",
                 "source_sense_id": "foo-2", "etymology_number": "2",
                 "gloss": "selected A", "pos": "verb", "is_active": True,
                 "etym_root": "Proto-Germanic *right", "etym_text": "Selected A history."},
            ],
        }},
        "da": {"bar": {
            "word": "bar", "pos": "noun", "ipa": "bar", "def": "wrong B",
            "etym_root": "Proto-Germanic *wrong", "etym_text": "Wrong entry.",
            "senses": [
                {"sense_id": 1, "gloss": "wrong B", "pos": "noun", "is_active": True,
                 "etym_root": "Proto-Germanic *wrong", "etym_text": "Wrong entry."},
                {"sense_id": 2, "source_entry_key": "da|bar|adj|3|bar-2",
                 "source_sense_id": "bar-2", "etymology_number": "3",
                 "gloss": "selected B", "pos": "adjective", "is_active": True,
                 "etym_root": "Proto-Germanic *right", "etym_text": "Selected B history."},
            ],
        }},
    }

    rows = build_pair_dataset("sv", "da", {("foo", "bar")}, lexicons, matcher)
    row = rows[0]

    assert row["pos_a"] == "verb"
    assert row["pos_b"] == "adjective"
    assert row["etym_root_a"] == "Proto-Germanic *right"
    assert row["etym_root_b"] == "Proto-Germanic *right"
    assert row["etym_text_a"] == "Selected A history."
    assert row["etymological_relation"] == "cognate"
    assert json.loads(row["senses_a"])[1]["source_entry_key"] == "sv|foo|verb|2|foo-2"


def test_builder_does_not_fall_back_to_a_headword_root_when_matched_sense_has_none():
    matcher = FixedMatcher({"same meaning": [1.0, 0.0]})
    lexicons = {
        "sv": {"foo": {
            "word": "foo", "pos": "noun", "ipa": "foo", "def": "same meaning",
            "etym_root": "Proto-Germanic *wrong", "etym_text": "Wrong entry.",
            "senses": [{"sense_id": 1, "gloss": "same meaning", "pos": "noun",
                        "is_active": True, "etym_root": "", "etym_text": ""}],
        }},
        "da": {"bar": {
            "word": "bar", "pos": "noun", "ipa": "bar", "def": "same meaning",
            "etym_root": "Proto-Germanic *wrong", "etym_text": "Wrong entry.",
            "senses": [{"sense_id": 1, "gloss": "same meaning", "pos": "noun",
                        "is_active": True, "etym_root": "", "etym_text": ""}],
        }},
    }

    row = build_pair_dataset("sv", "da", {("foo", "bar")}, lexicons, matcher)[0]

    assert row["etymological_relation"] == "unknown"
    assert row["etym_root_a"] is None
    assert row["shared_etym_root"] is None


def test_loader_preserves_case_distinct_lemmas_and_surface_matches_each(tmp_path):
    for lang in ("en", "de", "sv", "da", "nb"):
        words = ["gift"]
        if lang == "de":
            words = ["Gift", "gift"]
        table = pa.table({
            "word": words,
            "pos": ["noun"] * len(words),
            "ipa": [""] * len(words),
            "glosses": [["poison"] if word == "Gift" else ["present"] for word in words],
            "senses_json": ["[]"] * len(words),
            "etym_root": [""] * len(words),
            "etym_text": [""] * len(words),
        })
        pq.write_table(table, tmp_path / f"lemmas_{lang}.parquet")

    lexicons = load_canonical_lexicons(tmp_path)

    assert set(lexicons["de"]) == {"Gift", "gift"}
    assert lexicons["de"]["Gift"]["glosses"] == ["poison"]
    assert lexicons["de"]["gift"]["glosses"] == ["present"]

    collisions = find_surface_collisions("de", "en", lexicons["de"], lexicons["en"], set())
    assert {meta_a["word"] for meta_a, _, _, _ in collisions} == {"Gift", "gift"}


def test_surface_collision_generation_keeps_candidates_past_previous_cap():
    def entries(groups):
        return {
            f"abcdef{group}{letter}": {
                "word": f"abcdef{group}{letter}",
                "ipa": "",
                "etym_root": "",
            }
            for group in groups
            for letter in "abcdefghijklmnopqrstuvwxyz"
        }

    collisions = find_surface_collisions(
        "sv", "da", entries("ab"), entries("cd"), set()
    )

    assert len(collisions) == 52 * 52


def test_builder_keeps_translation_candidates_past_previous_cap():
    count = 15_001
    gloss = "same meaning"
    senses = [{"sense_id": 1, "gloss": gloss, "pos": "noun", "tags": [], "is_active": True}]
    words = [f"sv{index:05}" for index in range(count)]
    lexicons = {
        "sv": {
            word: {"word": word, "pos": "noun", "ipa": "", "def": gloss,
                   "glosses": [gloss], "senses": senses}
            for word in words
        },
        "da": {
            "target": {"word": "target", "pos": "noun", "ipa": "", "def": gloss,
                       "glosses": [gloss], "senses": senses}
        },
    }
    mined = {(word, "target") for word in words}
    matcher = FixedMatcher({gloss: [1.0, 0.0]})

    rows = build_pair_dataset("sv", "da", mined, lexicons, matcher)

    assert len(rows) == count * 2
    assert any(row["word_a"] == words[-1] and row["word_b"] == "target" for row in rows)


def test_lowercase_lookup_requires_exact_or_unique_match():
    lexicon = {word: {"word": word} for word in ("Gift", "gift")}
    index = _lowercase_index(lexicon)

    assert _lookup_lemma(lexicon, index, "Gift")["word"] == "Gift"
    assert _lookup_lemma(lexicon, index, "GIFT") is None

    german_forms = {word: {"word": word} for word in ("Maß", "Mass")}
    german_index = _lowercase_index(german_forms)
    assert _lookup_lemma(german_forms, german_index, "MASS")["word"] == "Mass"


def test_translation_mining_prefers_exact_target_spelling_and_skips_ambiguous_fallback(tmp_path):
    en_meta = {"word": "present"}
    de_lexicon = {
        "Gift": {"word": "Gift"},
        "gift": {"word": "gift"},
    }
    lexicons = {
        "en": {"present": en_meta},
        "de": de_lexicon,
        "sv": {},
        "da": {},
        "nb": {},
    }
    translation_dump = tmp_path / "translations.jsonl"
    translation_dump.write_text(
        '{"word":"present","lang_code":"en","pos":"noun","senses":[{"id":"en-present","translations":['
        '{"code":"de","word":"GIFT"},{"code":"de","word":"Gift"}]}]}\n',
        encoding="utf-8",
    )

    mined, source_senses = mine_translation_cliques(translation_dump, lexicons)

    assert mined[("de", "en")] == {("Gift", "present")}
    assert source_senses[("de", "en")][("Gift", "present")] == {
        ("en|present|noun||en-present", "en-present")
    }


def test_translation_source_sense_constrains_english_sense_alignment():
    gloss_a = "have"
    gloss_b_adj = "possessed"
    gloss_b_verb = "have rightful possession"
    lexicons = {
        "de": {"haben": {
            "word": "haben", "lang": "de", "pos": "verb", "ipa": "", "def": gloss_a,
            "glosses": [gloss_a], "senses": [{
                "sense_id": 1, "source_entry_key": "de|haben|verb||haben-1",
                "source_sense_id": "haben-1", "gloss": gloss_a, "pos": "verb",
                "tags": [], "is_active": True,
            }],
        }},
        "en": {"own": {
            "word": "own", "lang": "en", "pos": "adj", "ipa": "", "def": gloss_b_adj,
            "glosses": [gloss_b_adj, gloss_b_verb], "senses": [
                {"sense_id": 1, "source_entry_key": "en|own|adj|1|own-adj",
                 "source_sense_id": "own-adj", "gloss": gloss_b_adj, "pos": "adj",
                 "tags": [], "is_active": True},
                {"sense_id": 2, "source_entry_key": "en|own|verb|2|own-verb",
                 "source_sense_id": "own-verb", "gloss": gloss_b_verb, "pos": "verb",
                 "tags": [], "is_active": True},
            ],
        }},
    }
    source_refs = {("haben", "own"): {("en|own|verb|2|own-verb", "own-verb")}}
    matcher = FixedMatcher({gloss_a: [1.0, 0.0], gloss_b_adj: [1.0, 0.0], gloss_b_verb: [0.0, 1.0]})

    rows = build_pair_dataset(
        "de", "en", {("haben", "own")}, lexicons, matcher, source_refs
    )

    assert rows[0]["pos_b"] == "verb"
    selected = [sense for sense in json.loads(rows[0]["senses_b"]) if sense["is_active_match"]]
    assert selected[0]["source_sense_id"] == "own-verb"
    assert json.loads(rows[0]["translation_source_senses"]) == [{
        "source_entry_key": "en|own|verb|2|own-verb",
        "source_sense_id": "own-verb",
    }]


def test_builder_keeps_exact_case_identity_for_mined_pair():
    matcher = FixedMatcher({"poison": [1.0, 0.0], "present": [0.0, 1.0]})
    lexicons = {
        "de": {
            "Gift": {"word": "Gift", "pos": "noun", "ipa": "", "def": "poison",
                     "glosses": ["poison"], "etym_root": "", "etym_text": "",
                     "senses": [{"sense_id": 1, "gloss": "poison", "pos": "noun", "is_active": True}]},
            "gift": {"word": "gift", "pos": "noun", "ipa": "", "def": "present",
                     "glosses": ["present"], "etym_root": "", "etym_text": "",
                     "senses": [{"sense_id": 1, "gloss": "present", "pos": "noun", "is_active": True}]},
        },
        "en": {
            "gift": {"word": "gift", "pos": "noun", "ipa": "", "def": "present",
                     "glosses": ["present"], "etym_root": "", "etym_text": "",
                     "senses": [{"sense_id": 1, "gloss": "present", "pos": "noun", "is_active": True}]},
        },
    }

    rows = build_pair_dataset("de", "en", {("Gift", "gift")}, lexicons, matcher)

    assert rows[0]["word_a"] == "Gift"
    assert rows[0]["word_b"] == "gift"
