-- Migration 004: Create cognate_clusters table for multi-language root node grouping
CREATE TABLE IF NOT EXISTS cognate_clusters (
    id SERIAL PRIMARY KEY,
    root VARCHAR(255) NOT NULL UNIQUE,
    proto_language VARCHAR(64) NOT NULL,
    language_count INT NOT NULL,
    languages TEXT[] NOT NULL,
    members JSONB NOT NULL,
    sample_gloss TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cognate_clusters_lang_count ON cognate_clusters (language_count DESC);
CREATE INDEX IF NOT EXISTS idx_cognate_clusters_proto_lang ON cognate_clusters (proto_language);
CREATE INDEX IF NOT EXISTS idx_cognate_clusters_languages ON cognate_clusters USING GIN (languages);
CREATE INDEX IF NOT EXISTS idx_cognate_clusters_root_trgm ON cognate_clusters USING gin (root gin_trgm_ops);
