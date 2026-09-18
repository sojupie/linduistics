-- Migration 002: Create word_forms table for inflection-to-lemma resolution

CREATE TABLE IF NOT EXISTS word_forms (
    lang VARCHAR(5) NOT NULL,
    form VARCHAR(100) NOT NULL,
    lemma VARCHAR(100) NOT NULL,
    PRIMARY KEY (lang, form, lemma)
);

CREATE INDEX IF NOT EXISTS idx_word_forms_lookup 
ON word_forms (lang, form);
