ALTER TABLE iecor_meaning_pairs
    ADD COLUMN local_candidate_ancestry_status TEXT NOT NULL DEFAULT 'unreviewed'
        CHECK (local_candidate_ancestry_status IN (
            'unreviewed', 'entry_shared_ancestor_found',
            'entry_shared_proto_mention_found', 'no_entry_ancestry_evidence',
            'entry_evidence_incomplete', 'no_two_sided_local_entries'
        )),
    ADD COLUMN local_source_etymology_entry_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN local_target_etymology_entry_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN local_etymology_entry_combinations INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN local_missing_entry_combinations INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN local_direct_ancestor_entry_pairs INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN local_proto_mention_entry_pairs INTEGER NOT NULL DEFAULT 0;

CREATE TABLE iecor_ancestry_candidate_evidence (
    reference_dataset TEXT NOT NULL,
    reference_version TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    source_language VARCHAR(5) NOT NULL,
    target_language VARCHAR(5) NOT NULL,
    source_entry_key TEXT NOT NULL,
    target_entry_key TEXT NOT NULL,
    evidence_type TEXT NOT NULL CHECK (evidence_type IN (
        'shared_direct_ancestor_claim', 'shared_proto_ancestor_mention'
    )),
    source_entry_url TEXT NOT NULL,
    target_entry_url TEXT NOT NULL,
    source_sense_candidates JSONB NOT NULL,
    target_sense_candidates JSONB NOT NULL,
    shared_ancestor_evidence JSONB NOT NULL,
    PRIMARY KEY (
        reference_dataset, reference_version, concept_id,
        source_language, target_language, source_entry_key, target_entry_key,
        evidence_type
    ),
    FOREIGN KEY (
        reference_dataset, reference_version, concept_id, source_language, target_language
    ) REFERENCES iecor_meaning_pairs (
        reference_dataset, reference_version, concept_id, source_language, target_language
    ) ON DELETE CASCADE
);

CREATE INDEX idx_iecor_ancestry_candidates_type
    ON iecor_ancestry_candidate_evidence (
        reference_dataset, reference_version, evidence_type, source_language, target_language
    );

COMMENT ON COLUMN iecor_meaning_pairs.local_candidate_ancestry_status IS
    'Aggregate ancestry evidence across exact-form etymology-entry candidates. Candidate evidence is separate from reviewed-sense ancestry and app classifications.';
COMMENT ON TABLE iecor_ancestry_candidate_evidence IS
    'Source-linked entry-pair ancestry candidates for the IE-CoR panel. These are not reviewed sense assignments or pair classifications.';
