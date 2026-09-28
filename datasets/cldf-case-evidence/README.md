# Linduistics source-linked lexical case slice

This CLDF Generic export contains 15 deliberately chosen Wiktionary-derived case groups. It keeps source entries and senses, normalized relation targets, source-template claim evidence, compound-component analyses, matched claim links, shared-component ancestor candidates, form-level target-entry candidates, and computed pair comparisons in separate tables.

When a comparison form's source identity is ambiguous, `forms.csv` leaves the singular source entry and sense IDs blank and stores all candidate identities in `Source_Identity_Candidates_JSON`. Candidate entries and senses are linked when included; the export does not choose among them.

Source claims record their originating entry and one normalized target scope (form, entity, components, language, or none). A target template that expands into several claims retains one Template_Occurrence_ID across its rows. `source-relation-targets.csv` groups identical normalized relation targets within an entry; `source-claims.csv` retains each expanded claim, its template identity, uncertainty, and raw arguments. `claim-target-cross-references.csv` links exact return mentions in candidate target entries; these are Wiktionary cross-references, not independent confirmation. Sense IDs on claim-match rows identify the comparison's selected senses for context; they do not narrow the source claim to those senses. Claims without a single related form retain their normalized entity or component targets, or have target scope `none`.

The `Legacy_Candidate_Label` and `Legacy_Root_Match_Status` fields preserve old pipeline output; they are not independently verified linguistic judgments. Candidate component entries are possible matches, not resolved component senses; `Candidate_Entry_Resolution` records whether each possible entry was included. Shared-component ancestor rows project those matches onto candidate roots; they are not confirmed component senses or whole-word histories. These cases are not representative of vocabulary coverage.

Source page URLs are retained in the entry and claim tables. This is an adapted selection of Wiktionary material extracted through Kaikki/Wiktextract; the Kaikki raw-data page, extraction-manifest date, and input dump hashes are in `manifest.json`, but individual entry revision IDs are not available for every record. Attribution is to Wiktionary contributors, with changes made through extraction, normalization, linking, and comparison. This export is provided under CC BY-SA 4.0. The article links let readers inspect the source and its history. See https://en.wiktionary.org/wiki/Wiktionary:Copyrights and https://creativecommons.org/licenses/by-sa/4.0/. Kaikki/Wiktextract is the extraction route, not the original source. Wiktionary entries may contain third-party material with separate terms; those entries have not been reviewed one by one, so this is a local release candidate and is not yet cleared for redistribution. This dataset is not endorsed by Wiktionary or the Wikimedia Foundation.

A separate small set of exact page revisions and manually transcribed claims is documented in `../source-evidence/README.md`. Those page-level records supplement this dump-based export for selected examples; they are not a revision ID for every row here.

Rebuild from the repository root after generating the local source records and comparison files described in `docs/DATASET_NEXT_STEPS.md`:

```powershell
python pipeline/src/build_case_evidence_slice.py --comparisons pipeline/data/all_comparisons_dercat_fix.parquet --source-records pipeline/data/etymology_records_source_origin_status.jsonl --claim-matches pipeline/data/candidate_source_claim_matches_dercat_fix.jsonl --component-candidates pipeline/data/component_entry_candidates_source_identity.jsonl.gz --shared-ancestor-candidates pipeline/data/component_shared_ancestor_candidates_source_identity.jsonl.gz --output pipeline/data/named_case_evidence_slice_dercat_fix.jsonl --force
python pipeline/src/audit_case_claim_target_entries.py --force
python pipeline/src/export_case_evidence_cldf.py --output-dir datasets/cldf-case-evidence --force
```

`manifest.json` records the input and table hashes, transformation-file hashes, case groups, and row counts. The exporter checks IDs and declared foreign keys; the official CLDF validator has not been run. The selected cases are diagnostic, not representative.
