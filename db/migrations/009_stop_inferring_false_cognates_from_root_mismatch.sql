-- Root mismatch can reflect source variants, different etymology paths, or a
-- homograph join. It does not establish that two forms have unrelated origins.
UPDATE word_comparisons
SET etymological_relation = 'unknown'
WHERE etymological_relation = 'false_cognate';
