import pytest
from surface_index import SurfaceIndex


@pytest.fixture
def sample_target_lexicon():
    return [
        {"word": "banana", "ipa": "bənɑnə", "pos": "noun"},
        {"word": "cat", "ipa": "kæt", "pos": "noun"},
        {"word": "house", "ipa": "haʊs", "pos": "noun"},
        {"word": "gift", "ipa": "ɡɪft", "pos": "noun"},
        {"word": "apple", "ipa": "æpəl", "pos": "noun"},
        {"word": "dog", "ipa": "dɒɡ", "pos": "noun"},
    ]


def test_surface_index_finds_cognates(sample_target_lexicon):
    index = SurfaceIndex(sample_target_lexicon)
    matches = index.find_candidates("banan", ipa="banɑn", min_orth=0.50, min_phon=0.50)

    match_words = [m["word"] for m in matches]
    assert "banana" in match_words
    banana_match = next(m for m in matches if m["word"] == "banana")
    assert banana_match["orthographic_sim"] >= 0.80
    assert banana_match["phonetic_sim"] >= 0.50


def test_surface_index_finds_false_friends(sample_target_lexicon):
    index = SurfaceIndex(sample_target_lexicon)
    # Swedish 'gift' (poison / married) vs English 'gift' (present)
    matches = index.find_candidates("gift", ipa="jɪft", min_orth=0.50, min_phon=0.50)

    match_words = [m["word"] for m in matches]
    assert "gift" in match_words
    gift_match = next(m for m in matches if m["word"] == "gift")
    assert gift_match["orthographic_sim"] == 1.0


def test_surface_index_excludes_unrelated(sample_target_lexicon):
    index = SurfaceIndex(sample_target_lexicon)
    # Swedish 'sten' (stone) vs unrelated words in lexicon
    matches = index.find_candidates("sten", ipa="steːn", min_orth=0.50, min_phon=0.50)
    match_words = [m["word"] for m in matches]
    assert "banana" not in match_words
    assert "cat" not in match_words
    assert "apple" not in match_words


def test_surface_index_handles_missing_ipa(sample_target_lexicon):
    index = SurfaceIndex(sample_target_lexicon)
    # Swedish 'katt' with no IPA
    matches = index.find_candidates("katt", ipa="", min_orth=0.50, min_phon=0.50)
    match_words = [m["word"] for m in matches]
    assert "cat" in match_words
    cat_match = next(m for m in matches if m["word"] == "cat")
    assert cat_match["orthographic_sim"] == 0.50
    assert cat_match["phonetic_sim"] == 0.0


def test_surface_index_short_words():
    lexicon = [{"word": "in", "ipa": "ɪn", "pos": "prep"}]
    index = SurfaceIndex(lexicon)
    matches = index.find_candidates("in", ipa="ɪn", min_orth=0.50, min_phon=0.50)
    assert len(matches) == 1
    assert matches[0]["word"] == "in"
