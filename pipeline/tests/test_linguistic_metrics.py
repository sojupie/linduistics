import pytest
from linguistic_metrics import orthographic_similarity


def test_orthographic_similarity_identity():
    assert orthographic_similarity("hund", "hund") == 1.0
    assert orthographic_similarity("apple", "apple") == 1.0


def test_orthographic_similarity_symmetry():
    sim1 = orthographic_similarity("banan", "banana")
    sim2 = orthographic_similarity("banana", "banan")
    assert sim1 == sim2
    assert pytest.approx(sim1, rel=1e-3) == 5 / 6


def test_orthographic_similarity_case_and_whitespace():
    assert orthographic_similarity("  Banan ", "banana") == pytest.approx(5 / 6, rel=1e-3)
    assert orthographic_similarity("SWEDISH", "swedish") == 1.0


def test_orthographic_similarity_cognate_pairs():
    # äpple vs apple: 1 edit, max len 5 -> 0.8
    assert pytest.approx(orthographic_similarity("äpple", "apple"), rel=1e-3) == 0.8
    # katt vs cat: 2 edits, max len 4 -> 0.5
    assert pytest.approx(orthographic_similarity("katt", "cat"), rel=1e-3) == 0.5


def test_orthographic_similarity_disjoint():
    # hund vs cat: 4 edits, max len 4 -> 0.0
    assert orthographic_similarity("hund", "cat") == 0.0


def test_orthographic_similarity_empty():
    assert orthographic_similarity("", "") == 1.0
    assert orthographic_similarity("", "word") == 0.0
    assert orthographic_similarity("word", "") == 0.0
