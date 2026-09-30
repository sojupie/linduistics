CREATE TABLE IF NOT EXISTS iecor_reference_concepts (
    reference_dataset TEXT NOT NULL,
    reference_version TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    concepticon_id TEXT NOT NULL,
    concept_label TEXT NOT NULL,
    concepticon_definition TEXT NOT NULL,
    PRIMARY KEY (reference_dataset, reference_version, concept_id)
);

CREATE TABLE IF NOT EXISTS iecor_reference_forms (
    reference_dataset TEXT NOT NULL,
    reference_version TEXT NOT NULL,
    form_id TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    language_code VARCHAR(5) NOT NULL,
    reference_form TEXT NOT NULL,
    segments TEXT NOT NULL,
    cognate_set_ids TEXT[] NOT NULL DEFAULT '{}',
    local_match_status TEXT NOT NULL CHECK (local_match_status IN ('exact_spelling', 'no_exact_entry')),
    local_words TEXT[] NOT NULL DEFAULT '{}',
    source_urls TEXT[] NOT NULL DEFAULT '{}',
    PRIMARY KEY (reference_dataset, reference_version, form_id),
    FOREIGN KEY (reference_dataset, reference_version, concept_id)
        REFERENCES iecor_reference_concepts (reference_dataset, reference_version, concept_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS iecor_local_sense_links (
    reference_dataset TEXT NOT NULL,
    reference_version TEXT NOT NULL,
    form_id TEXT NOT NULL,
    candidate_fingerprint TEXT NOT NULL,
    source_sense_id TEXT NOT NULL,
    source_entry_key TEXT NOT NULL,
    local_word TEXT NOT NULL,
    language_code VARCHAR(5) NOT NULL,
    source_url TEXT NOT NULL,
    review_status TEXT NOT NULL CHECK (review_status IN (
        'unreviewed', 'selected_primary', 'selected_additional', 'rejected_sense_mismatch'
    )),
    PRIMARY KEY (reference_dataset, reference_version, form_id, candidate_fingerprint),
    FOREIGN KEY (reference_dataset, reference_version, form_id)
        REFERENCES iecor_reference_forms (reference_dataset, reference_version, form_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS iecor_meaning_pairs (
    reference_dataset TEXT NOT NULL,
    reference_version TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    source_language VARCHAR(5) NOT NULL,
    target_language VARCHAR(5) NOT NULL,
    reference_relation TEXT NOT NULL CHECK (reference_relation IN (
        'shared_cognate_set', 'no_shared_cognate_set', 'incomplete_assignment'
    )),
    shared_cognate_set_ids TEXT[] NOT NULL DEFAULT '{}',
    unassigned_form_ids TEXT[] NOT NULL DEFAULT '{}',
    PRIMARY KEY (
        reference_dataset, reference_version, concept_id, source_language, target_language
    ),
    FOREIGN KEY (reference_dataset, reference_version, concept_id)
        REFERENCES iecor_reference_concepts (reference_dataset, reference_version, concept_id)
        ON DELETE CASCADE,
    CHECK (source_language <> target_language)
);

CREATE INDEX IF NOT EXISTS idx_iecor_forms_language
    ON iecor_reference_forms (reference_dataset, reference_version, language_code, reference_form);
CREATE INDEX IF NOT EXISTS idx_iecor_sense_links_sense
    ON iecor_local_sense_links (reference_dataset, reference_version, source_sense_id);
CREATE INDEX IF NOT EXISTS idx_iecor_meaning_pairs_relation
    ON iecor_meaning_pairs (reference_dataset, reference_version, reference_relation);

COMMENT ON TABLE iecor_reference_concepts IS
    'Concepts from the licensed IE-CoR reference panel; not a vocabulary census.';
COMMENT ON TABLE iecor_reference_forms IS
    'IE-CoR forms and their external cognate-set assignments, linked by spelling to local Wiktionary-derived words.';
COMMENT ON TABLE iecor_local_sense_links IS
    'Local source-sense links for IE-CoR forms. Unreviewed links are candidates, not asserted meaning matches.';
COMMENT ON TABLE iecor_meaning_pairs IS
    'Meaning-scoped IE-CoR cognate-set comparisons; no-shared-set is not a false-cognate verdict.';
