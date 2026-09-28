# Next data milestone

## Aim

Keep building Linduistics' own source-and-transform dataset. Finding source data, working out what it says, and making transformations inspectable are part of the project. A small public release that is useful to one or two people is a good outcome; this is a personal project, not a research program.

Use Wiktionary as the first source because it gives us material to explore and transform, not because it defines the dataset's limits. Add another source when a real case shows what it can contribute. CLDF is a suitable exchange format if it helps people reuse the result; it does not need to shape the internal pipeline.

## The next deliverable

Make the existing bounded case slice reproducible and publishable as a small, clearly limited dataset. It should let someone trace selected comparisons from source records through extraction and transformation to the values we calculate. It should also make uncertainty and missing links visible. It is not a representative sample and cannot support vocabulary-wide cognate percentages.

Start from the 15 case groups and current CLDF preview already built locally. Keep the project site and live database out of this release step. The current preview is diagnostic, its source inputs are hashed local Wiktionary dumps, and individual page revision IDs are not available for every row. State those limits instead of implying stronger provenance.

## Work order

1. **Make the current slice identifiable.** Record the exact input dump files and hashes, extraction and export commands, code revision, and available page revisions. For entries without a page revision, retain the dump fingerprint and source location and mark the revision as unavailable. Keep the curated page-revision seed as a separate source of evidence; do not overwrite older claims when a page changes.
2. **Trace the selected cases.** For each case, retain the source entry and etymology/sense identity where available, source claim and direction, component scope, target candidates, computed form/sound/meaning observations, and the current project output. Mark whether each link is exact, ambiguous, entry-level, missing, or unchecked. Prioritize the cases already exposing structural gaps: *fleece*, *clown*, *ombudsman*, *bank/bankman/sandbank*, *torta/tort*, *blive*, and *væg/väg/vägg*.
3. **Fix only a reproduced transformation loss.** Find the earliest failing step—source parsing, entry/sense identity, claim normalization, target resolution, or comparison—and correct it there. Add a small source-based regression case. Keep source assertions, computed observations, and project interpretations as separate records. Allow multiple historical paths to coexist: for example, a loan can also share deeper ancestry, and cognate components do not automatically make the whole compound cognate.
4. **Rebuild and compare.** Regenerate the bounded slice from recorded inputs. Compare the changed records against their prior output and explain each changed result. Do not apply conclusions from selected cases as bulk relabeling rules.
5. **Package the result.** Use readable linked tables and a CLDF export if the mapping remains clear. Include stable IDs, attribution and license information, input hashes, transformation/code version, rebuild instructions, coverage, and limitations. Check links and foreign keys; run a CLDF validator if available. Keep full source dumps local. Do not publish source-derived text until its attribution and redistribution terms are clear.
6. **Choose expansion from an observed gap.** Add another source or data dimension only when a case raises a question the current inputs cannot answer. Preserve disagreement as additional evidence. Genealogy, typology, and area/contact facts can become useful linked data later, but they are separate from the history of an individual word.

## Keep the model honest

- Preserve lexical entries, etymologies, senses, forms, and components as distinct identities; spelling alone does not resolve homographs.
- Record historical claims with their source, direction, and scope. A claim about a related form or component is not automatically a claim about the compared whole words.
- Keep calculated similarities separate from historical claims. Similarity can find or compare forms; it does not establish origin.
- Treat `other` as a legacy candidate-builder remainder, not a linguistic relationship. Do not force every pair into one exclusive box.
- Keep “misleadingly similar” queryable as a modern comparison observation even when the historical relationship is borrowed, shared, or unresolved.
- Missing evidence means the current inputs do not establish that relationship. It does not establish unrelated origins.
- Do not describe candidate counts as the share of either language's vocabulary that is cognate.

## Done means

- The slice can be rebuilt from the recorded inputs and command.
- A reader can trace each selected result to its source entry and see the transformation and any ambiguity.
- Source claims, calculated observations, and project interpretations are distinguishable and can coexist.
- Demonstrated parser or identity bugs have regression coverage.
- The exported tables have consistent links and honest attribution, coverage, and limitations.

## Immediate next task

Turn the local 15-case CLDF preview into a release candidate: refresh it from the recorded inputs, correct stale case counts and provenance notes in the exporter output, check the generated tables and licenses, and document any fields the CLDF mapping cannot express cleanly. Then use the cases to pick the next concrete extraction fix. Keep the existing audits and data notes as evidence; this file is the short work order.

## Existing notes

- [Dataset direction and current audit plan](DATASET_NEXT_ACTIONS.md)
- [Detailed pipeline findings](DATASET_NEXT_STEPS.md)
- [Source-linked case review](DATASET_CASE_REVIEW.md)
- [Pinned source evidence and revision capture](../datasets/source-evidence/README.md)
