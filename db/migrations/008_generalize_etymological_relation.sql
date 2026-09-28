ALTER TABLE word_comparisons
    DROP CONSTRAINT word_comparisons_false_friend_relation_check;

ALTER TABLE word_comparisons
    RENAME COLUMN false_friend_relation TO etymological_relation;

-- Existing non-false-friend rows had no stored origin relation. Leave them
-- unknown until the regenerated artifact repopulates the field from both roots.
UPDATE word_comparisons
SET etymological_relation = 'unknown'
WHERE etymological_relation IS NULL;

ALTER TABLE word_comparisons
    ALTER COLUMN etymological_relation SET NOT NULL,
    ADD CONSTRAINT word_comparisons_etymological_relation_check
    CHECK (etymological_relation IN ('cognate', 'false_cognate', 'unknown'));

ALTER INDEX IF EXISTS idx_false_friend_relation
    RENAME TO idx_etymological_relation;
