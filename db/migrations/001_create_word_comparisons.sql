-- Migration 001: Create word_comparisons with spatial 2D GiST indexing

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS word_comparisons (
    id BIGSERIAL PRIMARY KEY,
    lang_a VARCHAR(5) NOT NULL,
    word_a VARCHAR(100) NOT NULL,
    ipa_a VARCHAR(100),
    def_a TEXT NOT NULL,
    pos_a VARCHAR(20),
    
    lang_b VARCHAR(5) NOT NULL,
    word_b VARCHAR(100) NOT NULL,
    ipa_b VARCHAR(100),
    def_b TEXT NOT NULL,
    pos_b VARCHAR(20),
    
    orthographic_sim REAL NOT NULL,
    phonetic_sim REAL NOT NULL,
    semantic_sim REAL NOT NULL,
    
    sim_point POINT GENERATED ALWAYS AS (POINT(phonetic_sim, semantic_sim)) STORED,
    category VARCHAR(30) NOT NULL
);

-- Primary 2D spatial slider index: supports sub-millisecond bounding-box range queries
CREATE INDEX IF NOT EXISTS idx_lexical_sliders_gist 
ON word_comparisons USING gist (lang_a, lang_b, sim_point);

-- Fast word lookup indexes for Universality Inspector and detail views
CREATE INDEX IF NOT EXISTS idx_lookup_lang_a_word 
ON word_comparisons (lang_a, word_a);

CREATE INDEX IF NOT EXISTS idx_lookup_lang_b_word 
ON word_comparisons (lang_b, word_b);

-- Category filtering index for False Friends quizzes and discovery feeds
CREATE INDEX IF NOT EXISTS idx_category 
ON word_comparisons (lang_a, lang_b, category);

-- Trigram GIN indexes for fuzzy search and autocomplete
CREATE INDEX IF NOT EXISTS idx_trgm_word_a 
ON word_comparisons USING gin (word_a gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_trgm_word_b 
ON word_comparisons USING gin (word_b gin_trgm_ops);
