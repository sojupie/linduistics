# IE-CoR sense-mapping pilot

## Goal

Build a reproducible five-language word-history dataset around IE-CoR v1.1's 169 meaning slots that contain forms for English, German, Swedish, Danish, and Norwegian Bokmål. Link those reference forms to our Wiktionary-derived entries and senses without copying IE-CoR cognate judgments onto a local word merely because the meaning labels match. Keep reference cognacy, Wiktionary claims, local sense links, and calculated similarities separate.

The public counts will describe this fixed sample only. They will not be presented as percentages of each language's full vocabulary.

## Pilot completed

The existing candidate worksheet covers eight meanings—blood, eye, fire, hand, heart, night, water, and woman—across five languages. It has 40 meaning-language slots and 47 candidate source senses. I checked the candidate IDs against the extracted Wiktionary source-sense records: all 47 IDs were present.

The review overlay at [`data/iecor_local_sense_review_2026-09-30.tsv`](data/iecor_local_sense_review_2026-09-30.tsv) records:

- 40 primary sense links: one for every meaning-language slot;
- 6 additional compatible sense links, retained as separate source senses;
- 1 rejected sense mismatch.

The rejected row is German *Auge* with the raw gloss “(of a cyclonic storm) eye.” The candidate matcher accepted it because it found the generic gloss `eye`; the target concept is the anatomical eye. This is a real false positive in the matching step, not an error in Wiktionary's entry.

The additional water senses remain separate because a source sense can include the target H₂O gloss and another gloss, such as a serving of water or rainwater. The overlay keeps that source structure visible rather than pretending each gloss is a separate sense.

## Review rule and limits

I compared each source gloss and any raw-gloss qualifier with the short IE-CoR concept label. Each slot gets exactly one `selected_primary` row. Other source senses that also contain the target meaning are `selected_additional`; a spelling match whose gloss describes another concept is `rejected_sense_mismatch`. These are practical project mappings, not specialist linguistic judgments or certainty scores.

The overlay does not verify the histories recorded in Wiktionary, resolve all local homographs, establish cognacy, or transfer IE-CoR's cognate-set IDs. The remaining 161 IE-CoR meanings have not had their local sense candidates reviewed. This pilot also does not update the application database or clear source text for redistribution.

## Reproducibility

The overlay preserves the original candidate fields, adds the exact Wiktionary page URL and review decision, and has no duplicate candidate IDs or duplicate column names. Its manifest records hashes for the candidate worksheet, extracted source records, and output table:

- [`data/iecor_local_sense_candidates_2026-09-29.tsv`](data/iecor_local_sense_candidates_2026-09-29.tsv)
- [`data/iecor_local_sense_review_2026-09-30.manifest.json`](data/iecor_local_sense_review_2026-09-30.manifest.json)
- `pipeline/data/etymology_records_rebuild_20260929.jsonl`

Validation checked 47 rows, 40 distinct meaning-language slots, exactly one primary row per slot, six additional rows, one rejected row, 47/47 source-sense IDs, unique headers, nonempty Wiktionary URLs, and the output SHA-256. This is a local working artifact; review source redistribution rights before publishing copied gloss text.

## Next work

The reproducible crosswalk now covers all 169 meanings, and the live-database comparison is documented in [`IECOR_PANEL_AUDIT_2026-09-30.md`](IECOR_PANEL_AUDIT_2026-09-30.md). The remaining work is to review more local senses, resolve the 18 exact-form gaps, and explain the 54 reviewed-sense pairs that are present in the database but not selected as its active comparison. Do not transfer IE-CoR cognate-set IDs into local records automatically.
