ALTER TABLE iecor_local_sense_links
    ADD COLUMN IF NOT EXISTS local_etymology_root TEXT;

COMMENT ON COLUMN iecor_local_sense_links.local_etymology_root IS
    'Etymological root extracted for this local sense from Wiktionary-derived source data; a label, not a normalized ancestor identity.';
