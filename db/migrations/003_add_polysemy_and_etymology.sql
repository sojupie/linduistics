-- Migration 003: Add polysemy, sense attribution, and etymology lineage to word_comparisons

ALTER TABLE word_comparisons
    ADD COLUMN IF NOT EXISTS false_friend_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS senses_a JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS senses_b JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS etym_root VARCHAR(100),
    ADD COLUMN IF NOT EXISTS etym_text_a TEXT,
    ADD COLUMN IF NOT EXISTS etym_text_b TEXT;

-- Enforce exactly ONE comparison entry per directed headword pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_headword_pair
ON word_comparisons (lang_a, lang_b, word_a, word_b);

-- Index for false friend sub-tier queries
CREATE INDEX IF NOT EXISTS idx_false_friend_type
ON word_comparisons (lang_a, lang_b, false_friend_type)
WHERE category = 'false_friend';
