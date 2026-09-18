import pyarrow.parquet as pq
import pytest
from score_pairs import export_comparisons_to_parquet, score_lexicons
from semantic_matcher import SemanticMatcher
from tests.test_semantic_matcher import MockEmbeddingModel


def test_score_lexicons_end_to_end(tmp_path):
    source_lemmas = [
        {
            "word": "hund",
            "pos": "noun",
            "ipa": "hɵnd",
            "glosses": ["canine mammal, domestic hound"],
            "lang": "sv",
        },
        {
            "word": "gift",
            "pos": "noun",
            "ipa": "jɪft",
            "glosses": ["toxic substance, poison"],
            "lang": "sv",
        },
        {
            "word": "banan",
            "pos": "noun",
            "ipa": "banɑn",
            "glosses": ["long yellow curved fruit"],
            "lang": "sv",
        },
    ]

    target_lemmas = [
        {
            "word": "dog",
            "pos": "noun",
            "ipa": "dɒɡ",
            "glosses": ["domesticated canine mammal"],
            "lang": "en",
        },
        {
            "word": "gift",
            "pos": "noun",
            "ipa": "ɡɪft",
            "glosses": ["a present or donation given to someone"],
            "lang": "en",
        },
        {
            "word": "banana",
            "pos": "noun",
            "ipa": "bənɑnə",
            "glosses": ["long yellow curved edible fruit"],
            "lang": "en",
        },
        {
            "word": "stone",
            "pos": "noun",
            "ipa": "stəʊn",
            "glosses": ["hard rock material"],
            "lang": "en",
        },
    ]

    matcher = SemanticMatcher(model=MockEmbeddingModel())

    pairs = score_lexicons(
        source_lemmas=source_lemmas,
        target_lemmas=target_lemmas,
        matcher=matcher,
        min_orth=0.50,
        min_phon=0.50,
        min_sem=0.50,
    )

    # Verify pairs contain key relationships
    pair_tuples = {(p["lang_a"], p["word_a"], p["lang_b"], p["word_b"]): p for p in pairs}

    # 1. hund / dog (Translation Pair from Channel B with zero sound/spelling similarity!)
    assert ("sv", "hund", "en", "dog") in pair_tuples
    hund_dog = pair_tuples[("sv", "hund", "en", "dog")]
    assert hund_dog["category"] == "translation_pair"
    assert hund_dog["semantic_sim"] >= 0.80
    assert hund_dog["orthographic_sim"] < 0.50

    # Symmetrical inverse
    assert ("en", "dog", "sv", "hund") in pair_tuples

    # 2. banan / banana (True Cognate from Channel A)
    assert ("sv", "banan", "en", "banana") in pair_tuples
    banan_match = pair_tuples[("sv", "banan", "en", "banana")]
    assert banan_match["category"] in ("true_cognate", "partial_cognate")
    assert banan_match["orthographic_sim"] >= 0.80

    # 3. gift / gift (False Friend from Channel A)
    assert ("sv", "gift", "en", "gift") in pair_tuples
    gift_match = pair_tuples[("sv", "gift", "en", "gift")]
    assert gift_match["category"] == "false_friend"
    assert gift_match["orthographic_sim"] == 1.0
    assert gift_match["semantic_sim"] <= 0.30

    # 4. Verify Parquet export
    out_file = str(tmp_path / "comparisons_sv_en.parquet")
    export_comparisons_to_parquet(pairs, out_file)
    table = pq.read_table(out_file)
    assert table.num_rows == len(pairs)
    assert "sim_point" not in table.column_names  # Generated in Postgres
    assert "orthographic_sim" in table.column_names
    assert "phonetic_sim" in table.column_names
    assert "semantic_sim" in table.column_names
    assert "category" in table.column_names
