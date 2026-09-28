# Next data milestone

## Aim

Keep building Linduistics' own source-and-transform dataset. Finding source data, working out what it says, and making transformations inspectable are part of the project. A small public release that is useful to one or two people is a good outcome; this is a personal project, not a research program.

Use Wiktionary as the first source because it gives us material to explore and transform, not because it defines the dataset's limits. Add another source when a real case shows what it can contribute. CLDF is a suitable exchange format if it helps people reuse the result; it does not need to shape the internal pipeline.

## The next deliverable

Make the existing bounded case slice reproducible and publishable as a small, clearly limited dataset. It should let someone trace selected comparisons from source records through extraction and transformation to the values we calculate. It should also make uncertainty and missing links visible. It is not a representative sample and cannot support vocabulary-wide cognate percentages.

The current local diagnostic slice has 18 case groups and 35 undirected comparison rows. The older tracked CLDF candidate remains a separate, smaller snapshot; the newer expanded export is ignored local output. The expanded export now includes 21 pinned source-page revisions and 70 curated assertions in tables separate from the dump-derived claims. Keep the project site and live database out of this release step. The dump-derived records still lack per-entry page revision IDs in many cases, and neither export is cleared for redistribution until third-party source material is reviewed.

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

## Current milestone and next task

The regenerated 18-case local slice passes its exporter ID and foreign-key checks, nine focused exporter tests, and PyCLDF 2.1.1 validation. It contains 35 comparisons, 1,655 template-extracted claims, 21 revision-pinned pages, and 70 separately curated assertions. The separate tables preserve the *aften/afton* `relationship_unclear` statement without presenting it as an automated template extraction. The local export is ignored; it has not replaced the smaller tracked candidate. Neither is cleared for redistribution until entries containing third-party material are reviewed.

Next, inspect the Swedish *torta* prose claim against the local raw source record. Determine whether the relation can be extracted reproducibly without guessing which Norwegian variety or sense it refers to. If not, keep it as a curated source assertion and document the extraction boundary. Then add one source-based regression case and regenerate the slice.

## Existing notes

- [Dataset direction and current audit plan](DATASET_NEXT_ACTIONS.md)
- [Detailed pipeline findings](DATASET_NEXT_STEPS.md)
- [Source-linked case review](DATASET_CASE_REVIEW.md)
- [Pinned source evidence and revision capture](../datasets/source-evidence/README.md)
