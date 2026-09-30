ALTER TABLE iecor_ancestry_candidate_evidence
    ADD COLUMN source_etymology_claims JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN target_etymology_claims JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN iecor_ancestry_candidate_evidence.source_etymology_claims IS
    'All extracted claims for the source etymology entry, including borrowing and derivation claims not shared with the target.';
COMMENT ON COLUMN iecor_ancestry_candidate_evidence.target_etymology_claims IS
    'All extracted claims for the target etymology entry, including borrowing and derivation claims not shared with the source.';
