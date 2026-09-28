import json

import numpy as np

from build_crosslingual_dataset import align_pair_senses, build_pair_dataset


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
