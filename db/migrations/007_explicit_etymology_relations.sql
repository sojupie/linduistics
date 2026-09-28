-- A pair can be a false friend regardless of whether its words are cognate.
ALTER TABLE word_comparisons
    RENAME COLUMN false_friend_type TO false_friend_relation;

ALTER TABLE word_comparisons
    RENAME COLUMN etym_root TO shared_etym_root;

ALTER TABLE word_comparisons
    ADD COLUMN etym_root_a VARCHAR(100),
    ADD COLUMN etym_root_b VARCHAR(100);

-- Old subtype labels came from a four-character root-prefix heuristic and a
-- one-sided root fallback, so neither origin claims nor shared roots are safe.
UPDATE word_comparisons
SET false_friend_relation = 'unknown'
WHERE category = 'false_friend';

UPDATE word_comparisons
SET false_friend_relation = NULL
WHERE category <> 'false_friend';

UPDATE word_comparisons
SET shared_etym_root = NULL;

ALTER INDEX IF EXISTS idx_false_friend_type RENAME TO idx_false_friend_relation;

ALTER TABLE word_comparisons
    ADD CONSTRAINT word_comparisons_false_friend_relation_check
    CHECK (
        (category = 'false_friend'
            AND false_friend_relation IS NOT NULL
            AND false_friend_relation IN ('cognate', 'false_cognate', 'unknown'))
        OR (category <> 'false_friend' AND false_friend_relation IS NULL)
    );
