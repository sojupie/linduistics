ALTER TABLE iecor_meaning_pairs
    ADD COLUMN local_ancestry_status TEXT NOT NULL DEFAULT 'unreviewed'
        CHECK (local_ancestry_status IN (
            'unreviewed', 'shared_direct_ancestor_claim',
            'shared_proto_ancestor_mention', 'no_common_ancestor_evidence',
            'entry_record_missing'
        )),
    ADD COLUMN local_source_word TEXT,
    ADD COLUMN local_target_word TEXT,
    ADD COLUMN local_source_sense_id TEXT,
    ADD COLUMN local_target_sense_id TEXT,
    ADD COLUMN local_source_entry_key TEXT,
    ADD COLUMN local_target_entry_key TEXT,
    ADD COLUMN local_source_url TEXT,
    ADD COLUMN local_target_url TEXT,
    ADD COLUMN local_ancestor_evidence JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX idx_iecor_pairs_local_status
    ON iecor_meaning_pairs (reference_dataset, reference_version, local_ancestry_status);

COMMENT ON COLUMN iecor_meaning_pairs.local_ancestry_status IS
    'Meaning-aligned local source evidence. no_common_ancestor_evidence is not a false-cognate verdict; unreviewed rows have no local sense decision.';
COMMENT ON COLUMN iecor_meaning_pairs.local_ancestor_evidence IS
    'Shared explicit ancestry claims or shared Proto-ancestor mentions, retained as source evidence rather than an automatic category.';
