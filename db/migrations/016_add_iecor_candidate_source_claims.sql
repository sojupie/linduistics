CREATE TABLE IF NOT EXISTS iecor_candidate_entry_claims (
    reference_dataset TEXT NOT NULL,
    reference_version TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    language_code VARCHAR(5) NOT NULL,
    source_entry_key TEXT NOT NULL,
    claim_index INTEGER NOT NULL,
    local_word TEXT NOT NULL,
    source_url TEXT NOT NULL,
    panel_forms JSONB NOT NULL,
    sense_candidates JSONB NOT NULL,
    claim_relation TEXT NOT NULL,
    related_language VARCHAR(20),
    related_form TEXT,
    source_claim JSONB NOT NULL,
    PRIMARY KEY (
        reference_dataset, reference_version, concept_id,
        language_code, source_entry_key, claim_index
    ),
    FOREIGN KEY (reference_dataset, reference_version, concept_id)
        REFERENCES iecor_reference_concepts (reference_dataset, reference_version, concept_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS iecor_candidate_relation_claim_links (
    reference_dataset TEXT NOT NULL,
    reference_version TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    source_language VARCHAR(5) NOT NULL,
    target_language VARCHAR(5) NOT NULL,
    claim_source_language VARCHAR(5) NOT NULL,
    claim_target_language VARCHAR(5) NOT NULL,
    source_entry_key TEXT NOT NULL,
    target_entry_key TEXT NOT NULL,
    source_claim_index INTEGER NOT NULL,
    claim_relation TEXT NOT NULL,
    target_form_match_method TEXT NOT NULL CHECK (target_form_match_method IN ('exact', 'casefold')),
    target_local_word TEXT NOT NULL,
    target_source_url TEXT NOT NULL,
    target_panel_forms JSONB NOT NULL,
    target_sense_candidates JSONB NOT NULL,
    PRIMARY KEY (
        reference_dataset, reference_version, concept_id,
        source_language, target_language, claim_source_language, source_entry_key,
        target_entry_key, source_claim_index
    ),
    FOREIGN KEY (reference_dataset, reference_version, concept_id, source_language, target_language)
        REFERENCES iecor_meaning_pairs (
            reference_dataset, reference_version, concept_id, source_language, target_language
        ) ON DELETE CASCADE,
    FOREIGN KEY (
        reference_dataset, reference_version, concept_id,
        claim_source_language, source_entry_key, source_claim_index
    ) REFERENCES iecor_candidate_entry_claims (
        reference_dataset, reference_version, concept_id,
        language_code, source_entry_key, claim_index
    ) ON DELETE CASCADE,
    CHECK (source_language <> target_language),
    CHECK (claim_source_language <> claim_target_language)
);

CREATE INDEX IF NOT EXISTS idx_iecor_candidate_claim_relation
    ON iecor_candidate_entry_claims (
        reference_dataset, reference_version, claim_relation,
        language_code, related_language
    );

CREATE INDEX IF NOT EXISTS idx_iecor_candidate_relation_links_type
    ON iecor_candidate_relation_claim_links (
        reference_dataset, reference_version, claim_relation,
        source_language, target_language
    );

COMMENT ON TABLE iecor_candidate_entry_claims IS
    'All extracted source claims from exact-form local entry candidates in the IE-CoR panel. Claims are entry-scoped; listed senses remain candidates unless reviewed.';

COMMENT ON TABLE iecor_candidate_relation_claim_links IS
    'Candidate links where a source claim explicitly names another local form in the same IE-CoR meaning slot. These are source statements, not verified pair classifications.';
