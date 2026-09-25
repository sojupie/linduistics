-- Migration 005: Create word_inflections and lemma_synonyms tables for grammar-aware inspection & rewriting

CREATE TABLE IF NOT EXISTS word_inflections (
    id SERIAL PRIMARY KEY,
    lang VARCHAR(10) NOT NULL,
    lemma VARCHAR(100) NOT NULL,
    form VARCHAR(100) NOT NULL,
    pos VARCHAR(32) NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_word_inflections_lookup
ON word_inflections (lang, form);

CREATE INDEX IF NOT EXISTS idx_word_inflections_generation
ON word_inflections (lang, lemma, pos);

CREATE TABLE IF NOT EXISTS lemma_synonyms (
    id SERIAL PRIMARY KEY,
    lang VARCHAR(10) NOT NULL,
    lemma VARCHAR(100) NOT NULL,
    pos VARCHAR(32),
    synonyms TEXT[] NOT NULL DEFAULT '{}',
    UNIQUE (lang, lemma, pos)
);

CREATE INDEX IF NOT EXISTS idx_lemma_synonyms_lookup
ON lemma_synonyms (lang, lemma);
