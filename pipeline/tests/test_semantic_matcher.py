import numpy as np
import pytest
from semantic_matcher import SemanticMatcher


class MockEmbeddingModel:
    """Mock model that assigns deterministic synthetic vectors based on keyword overlap."""

    def __init__(self, dim=8):
        self.dim = dim

    def encode(self, texts, normalize_embeddings=True, **kwargs):
        if isinstance(texts, str):
            texts = [texts]
        vecs = []
        for text in texts:
            t = text.lower()
            v = np.zeros(self.dim, dtype=np.float32)
            if "canine" in t or "dog" in t or "hound" in t:
                v[0] = 1.0
            if "poison" in t or "toxic" in t or "venom" in t:
                v[1] = 1.0
            if "present" in t or "gift" in t or "donation" in t:
                v[2] = 1.0
            if "married" in t or "spouse" in t or "wedding" in t:
                v[3] = 1.0
            if "eat" in t or "food" in t or "consume" in t:
                v[4] = 1.0
            # If empty or unrecognized, set a default small baseline
            if np.linalg.norm(v) == 0:
                v[7] = 0.1

            if normalize_embeddings:
                norm = np.linalg.norm(v)
                if norm > 0:
                    v = v / norm
            vecs.append(v)
        return np.array(vecs)


@pytest.fixture
def mock_matcher():
    mock_model = MockEmbeddingModel()
    return SemanticMatcher(model=mock_model)


def test_compute_sense_similarity_polysemy(mock_matcher):
    # Swedish 'gift' senses: 'poison' (toxic) and 'married'
    glosses_sv_gift = ["toxic substance, poison", "married, wedded"]
    # English 'gift' senses: 'a present or donation'
    glosses_en_gift = ["a present or donation given to someone"]
    # English 'poison' senses: 'venom or toxic chemical'
    glosses_en_poison = ["venom or toxic chemical that causes harm"]

    # Compare Swedish gift with English poison -> should find matching poison sense with high similarity
    sim_poison, def_a, def_b = mock_matcher.compute_sense_similarity(
        glosses_sv_gift, glosses_en_poison
    )
    assert sim_poison >= 0.90
    assert def_a == "toxic substance, poison"
    assert def_b == "venom or toxic chemical that causes harm"

    # Compare Swedish gift with English gift -> should have near-zero semantic similarity
    sim_gift, def_a_gift, def_b_gift = mock_matcher.compute_sense_similarity(
        glosses_sv_gift, glosses_en_gift
    )
    assert sim_gift < 0.20


def test_compute_sense_similarity_empty(mock_matcher):
    sim, def_a, def_b = mock_matcher.compute_sense_similarity([], ["dog"])
    assert sim == 0.0
    assert def_a == ""
    assert def_b == ""


def test_find_semantic_candidates(mock_matcher):
    target_entries = [
        {"word": "dog", "glosses": ["domesticated canine mammal"]},
        {"word": "present", "glosses": ["a gift or donation"]},
        {"word": "eat", "glosses": ["consume food through the mouth"]},
    ]
    mock_matcher.index_target_lexicon(target_entries)

    # Query with Swedish 'hund' (canine mammal)
    matches = mock_matcher.find_candidates(
        ["canine mammal, domestic hound"], min_sem=0.50
    )
    match_words = [m["word"] for m in matches]
    assert "dog" in match_words
    assert "present" not in match_words
    assert "eat" not in match_words

    dog_match = next(m for m in matches if m["word"] == "dog")
    assert dog_match["semantic_sim"] >= 0.90
    assert dog_match["best_def_a"] == "canine mammal, domestic hound"
    assert dog_match["best_def_b"] == "domesticated canine mammal"
