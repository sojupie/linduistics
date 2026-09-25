-- Migration 006: Add high-selectivity B-Tree and GIN indexes for sub-millisecond query performance

-- 1. Accelerates cross-lingual form resolution in pan/hybrid inspection (800x speedup)
CREATE INDEX IF NOT EXISTS idx_word_forms_form 
ON word_forms (form);

-- 2. Accelerates cross-lingual token lookups in pan/hybrid inspection
CREATE INDEX IF NOT EXISTS idx_word_comparisons_word_a 
ON word_comparisons (word_a);

-- 3. Accelerates reverse synonym lookup via array containment (@>)
CREATE INDEX IF NOT EXISTS idx_lemma_synonyms_synonyms_gin 
ON lemma_synonyms USING gin (synonyms);

-- 4. Accelerates lexicon pair sorting without disk heap thrashing
CREATE INDEX IF NOT EXISTS idx_comparisons_slider_sort 
ON word_comparisons (lang_a, lang_b, phonetic_sim DESC, semantic_sim DESC);
