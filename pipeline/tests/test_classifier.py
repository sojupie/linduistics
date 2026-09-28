from classifier import classify_pair, etymological_relation


def test_only_matching_structured_roots_support_a_cognate_claim():
    root = "Proto-Germanic *giftiz"
    assert etymological_relation(root, root) == "cognate"
    assert etymological_relation("Proto-West Germanic *garāfijō", "Proto-West Germanic *grāfijō") == "unknown"
    assert etymological_relation("Proto-Germanic *radą", "Proto-Germanic *rēdaz") == "unknown"
    assert etymological_relation(root, "") == "unknown"
    assert etymological_relation("Proto-Germanic *austrą", "Old English *ēast") == "unknown"
    assert etymological_relation("*radą", "*rēdaz") == "unknown"


def test_surface_and_meaning_make_false_friends_queryable_without_origin_claim():
    for root_a, root_b, expected in (
        ("Proto-Germanic *giftiz", "Proto-Germanic *giftiz", "cognate"),
        ("Proto-Germanic *radą", "Proto-Germanic *rēdaz", "unknown"),
        ("Proto-Germanic *giftiz", "", "unknown"),
    ):
        category, relation = classify_pair(
            s_orth=1.0,
            s_phon=1.0,
            s_sem=0.15,
            etym_root_a=root_a,
            etym_root_b=root_b,
        )
        assert category == "false_friend"
        assert relation == expected


def test_similarity_alone_never_claims_cognacy():
    assert classify_pair(0.9, 0.9, 0.9) == ("other", "unknown")
    assert classify_pair(0.1, 0.1, 0.9) == ("translation_pair", "unknown")


def test_name_to_common_word_collision_is_not_a_false_friend():
    assert classify_pair(1.0, 1.0, 0.1, pos_a="name", pos_b="noun") == ("other", "unknown")


def test_verified_cognates_can_have_full_or_partial_semantic_overlap():
    root = "Proto-Germanic *hundaz"
    assert classify_pair(0.2, 0.2, 0.9, etym_root_a=root, etym_root_b=root) == ("true_cognate", "cognate")
    assert classify_pair(0.7, 0.7, 0.5, etym_root_a=root, etym_root_b=root) == ("partial_cognate", "cognate")


def test_different_roots_do_not_establish_origin_even_when_category_is_other():
    assert classify_pair(
        0.95,
        0.9,
        0.9,
        etym_root_a="Proto-Germanic *radą",
        etym_root_b="Proto-Germanic *rēdaz",
    ) == ("other", "unknown")
