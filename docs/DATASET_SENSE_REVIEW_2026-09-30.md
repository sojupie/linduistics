# IE-CoR sense-mapping pilot

## Goal

Build a reproducible five-language word-history dataset around IE-CoR v1.1's 169 meaning slots that contain forms for English, German, Swedish, Danish, and Norwegian Bokmål. Link those reference forms to our Wiktionary-derived entries and senses without copying IE-CoR cognate judgments onto a local word merely because the meaning labels match. Keep reference cognacy, Wiktionary claims, local sense links, and calculated similarities separate.

The public counts will describe this fixed sample only. They will not be presented as percentages of each language's full vocabulary.

## Pilot completed

The original candidate worksheet covers eight meanings—blood, eye, fire, hand, heart, night, water, and woman—across five languages. I added a ninth meaning, flower, by selecting one directly matching local sense for each of the five languages from the generated crosswalk. The review overlay now has 45 meaning-language slots and 52 reviewed source-sense rows. All 52 selected or considered source-sense IDs are present in the extracted Wiktionary source-sense records.

The review overlay at [`data/iecor_local_sense_review_2026-09-30.tsv`](data/iecor_local_sense_review_2026-09-30.tsv) records:

- 45 primary sense links: one for every meaning-language slot;
- 6 additional compatible sense links, retained as separate source senses;
- 1 rejected sense mismatch.

For flower, the five primary senses are Danish *blomst*, English *flower*, German *Blume*, Norwegian Bokmål *blomst*, and Swedish *blomma*. Each was selected because its local gloss directly describes a flower. This maps the reference meaning to local senses; it does not decide whether the words are cognate.

The rejected row is German *Auge* with the raw gloss “(of a cyclonic storm) eye.” The candidate matcher accepted it because it found the generic gloss `eye`; the target concept is the anatomical eye. This is a real false positive in the matching step, not an error in Wiktionary's entry.

The additional water senses remain separate because a source sense can include the target H₂O gloss and another gloss, such as a serving of water or rainwater. The overlay keeps that source structure visible rather than pretending each gloss is a separate sense.

## Review rule and limits

I compared each source gloss and any raw-gloss qualifier with the short IE-CoR concept label. Each slot gets exactly one `selected_primary` row. Other source senses that also contain the target meaning are `selected_additional`; a spelling match whose gloss describes another concept is `rejected_sense_mismatch`. These are practical project mappings, not specialist linguistic judgments or certainty scores.

The overlay does not verify the histories recorded in Wiktionary, resolve all local homographs, establish cognacy, or transfer IE-CoR's cognate-set IDs. The remaining 160 IE-CoR meanings have not had their local sense candidates reviewed. The five flower selections and ten pair-level evidence records are loaded into the additive IE-CoR database tables; the main `word_comparisons` dataset was not changed. Source text redistribution rights still need review.

## Reproducibility

The overlay preserves the original candidate fields, adds the exact Wiktionary page URL and review decision, and has no duplicate candidate IDs or duplicate column names. Its manifest records hashes for the candidate worksheet, extracted source records, the supplemental flower crosswalk, and output table:

- [`data/iecor_local_sense_candidates_2026-09-29.tsv`](data/iecor_local_sense_candidates_2026-09-29.tsv)
- [`data/iecor_local_sense_review_2026-09-30.manifest.json`](data/iecor_local_sense_review_2026-09-30.manifest.json)
- `pipeline/data/etymology_records_rebuild_20260929.jsonl`

Validation checked 52 rows, 45 distinct meaning-language slots, exactly one primary row per slot, six additional rows, one rejected row, 52/52 source-sense IDs, unique headers, nonempty Wiktionary URLs, and the output SHA-256. This is a local working artifact; review source redistribution rights before publishing copied gloss text.

## Next work

The reproducible crosswalk covers all 169 meanings, and the live-database comparison is documented in [`IECOR_PANEL_AUDIT_2026-09-30.md`](IECOR_PANEL_AUDIT_2026-09-30.md). The next data step is to distinguish source-asserted cognate links, shared roots, inherited paths, and borrowing paths in the evidence model; the flower example shows that the current direct-ancestry audit omits some of those claims. The remaining work also includes reviewing more local senses, resolving the 18 exact-form gaps, and rerunning the app-comparison audit against the expanded nine-meaning review. Do not transfer IE-CoR cognate-set IDs into local records automatically.
