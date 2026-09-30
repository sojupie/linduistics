CREATE TABLE IF NOT EXISTS iecor_local_etymology_claims (
    reference_dataset TEXT NOT NULL,
    reference_version TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    form_id TEXT NOT NULL,
    language_code VARCHAR(5) NOT NULL,
    local_word TEXT NOT NULL,
    source_entry_key TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_name TEXT NOT NULL,
    claim_index INTEGER NOT NULL,
    claim_relation TEXT NOT NULL,
    related_language VARCHAR(20),
    related_form TEXT,
    source_claim JSONB NOT NULL,
    PRIMARY KEY (
        reference_dataset, reference_version, concept_id,
        form_id, source_entry_key, claim_index
    ),
    FOREIGN KEY (reference_dataset, reference_version, form_id)
        REFERENCES iecor_reference_forms (reference_dataset, reference_version, form_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_iecor_local_claim_relation
    ON iecor_local_etymology_claims (
        reference_dataset, reference_version, claim_relation,
        language_code, related_language
    );

CREATE INDEX IF NOT EXISTS idx_iecor_local_claim_target
    ON iecor_local_etymology_claims (
        reference_dataset, reference_version, related_language, related_form
    );

COMMENT ON TABLE iecor_local_etymology_claims IS
    'Original Wiktionary-derived claim records for selected local entries in the IE-CoR panel. A claim is entry-scoped unless its source record says otherwise; it is not a pair verdict.';

COMMENT ON COLUMN iecor_local_etymology_claims.source_claim IS
    'Complete extracted claim JSON, preserving template name, arguments, relation type, and related form.';
