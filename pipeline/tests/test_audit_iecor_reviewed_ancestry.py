from pipeline.src.audit_iecor_reviewed_ancestry import compare_claims, proto_ancestor_mentions


def test_only_explicit_inheritance_and_derivation_claims_count_as_shared_ancestors():
    source = {"claims": [
        {"relation": "inherited_from", "related_language": "gem-pro", "related_form": "*fōr"},
        {"relation": "cognate_mention", "related_language": "de", "related_form": "Feuer"},
    ]}
    target = {"claims": [
        {"relation": "inherited_from", "related_language": "gmw-pro", "related_form": "*fuir"},
        {"relation": "cognate_mention", "related_language": "en", "related_form": "fire"},
    ]}

    assert compare_claims(source, target) == []


def test_claim_overlap_normalizes_script_form_and_preserves_relation_evidence():
    source = {"claims": [
        {"relation": "inherited_from", "related_language": "gmw-pro", "related_form": "*fuir"},
    ]}
    target = {"claims": [
        {"relation": "derived_from", "related_language": "gmw-pro", "related_form": "  *Fuir  "},
    ]}

    assert compare_claims(source, target) == [{
        "language_code": "gmw-pro",
        "form": "*fuir",
        "source_claims": [{
            "relation": "inherited_from", "template_index": None,
            "template_name": None, "related_form": "*fuir",
        }],
        "target_claims": [{
            "relation": "derived_from", "template_index": None,
            "template_name": None, "related_form": "  *Fuir  ",
        }],
    }]


def test_proto_ancestor_mentions_reads_etymology_and_skips_cognates_section():
    record = {"etymology_text": (
        "Etymology tree\nProto-Germanic *nahts\nOld Norse nátt\n"
        "From Proto-Indo-European *nókʷts.\nCognates\nProto-X *not-a-parent"
    )}

    assert proto_ancestor_mentions(record) == {
        ("proto-germanic", "*nahts"),
        ("proto-indo-european", "*nókʷts"),
    }
