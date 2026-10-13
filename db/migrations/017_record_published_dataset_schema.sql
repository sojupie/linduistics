-- Record schema changes previously made by reclassify_dataset.py.
-- Importing a verified artifact must not require running the classifier.
ALTER TABLE word_comparisons
    ADD COLUMN IF NOT EXISTS is_core BOOLEAN DEFAULT FALSE;

ALTER TABLE word_comparisons
    DROP CONSTRAINT IF EXISTS word_comparisons_etymological_relation_check;
ALTER TABLE word_comparisons
    ADD CONSTRAINT word_comparisons_etymological_relation_check
    CHECK (etymological_relation IN
        ('cognate', 'false_cognate', 'unknown', 'borrowed_stratum', 'unrelated', 'independent'));

CREATE INDEX IF NOT EXISTS idx_is_core
    ON word_comparisons (lang_a, lang_b, is_core);
