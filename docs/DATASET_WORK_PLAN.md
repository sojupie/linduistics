# Next dataset work

## Aim

Keep doing the part that made this project interesting: source data, inspect what it actually says, and build transformations that can be rerun and understood. The practical goal is a small public slice that may be useful to a few people. This is not a plan to replace Wiktionary, create a research program, or turn the site into a CRUD app.

Wiktionary stays the first source. CLDF is a possible export format when it helps someone reuse the result; it does not dictate the internal model or need to be adopted before the data is ready.

## Next concrete work

Use the existing pipeline and the nine-case source-linked slice. Do not start a separate validation project. The aim is to make one useful dataset artifact by following the evidence we already extracted, fixing transformations only when a real case shows where they lose or distort information.

1. **Trace the cases end to end.** For each existing case, line up the exact source entries and senses, Wiktionary claims and direction, component links, calculated similarities, and current output. Mark what is directly stated, what the pipeline inferred, and what remains unresolved. Prioritize the examples that expose distinct issues: *fleece*, *clown*, *ombudsman*, *bank/bankman/sandbank*, *torta/tort*, and the corrected-root cases.
2. **Fix demonstrated pipeline failures.** Find the earliest point where each mismatch appears: extraction, entry or sense identity, claim matching, score calculation, or interpretation. Make the smallest correction that preserves the source evidence, and add a regression case. In particular, do not equate a matching root field with a whole-word relationship, a direct loan with the absence of deeper ancestry, or component matches with whole-word cognacy.
3. **Make a readable comparison artifact.** Rebuild the bounded slice from recorded inputs and show old output beside source evidence and corrected transformation output. Keep stable IDs, input hashes or revisions, and transformation version with it. Keep the live database untouched while reviewing this candidate.
4. **Try a CLDF export of that artifact.** Map records to existing CLDF tables where they fit. Keep any project-specific provenance or claim links in a small linked table. Compare the export with the readable JSONL/TSV and keep CLDF if it makes reuse easier; do not redesign the internal pipeline around the format.
5. **Choose the next expansion from what the slice cannot express.** Add a source only when a specific missing fact would change or enrich a transformation. Expand beyond the seed cases by rerunning tested transformations, not by applying labels learned from a handful of examples to the full dataset.

## First useful release

Build one bounded, source-backed slice across the five varieties already in the project. A reader should be able to go from a compared form and sense to the exact source entries, see the source wording and the transformation, and distinguish stated history from our computed observations and interpretation.

Use the cases and extraction work recorded in [NEXT_DATASET_STAGE.md](NEXT_DATASET_STAGE.md) and [DATASET_NEXT_STEPS.md](DATASET_NEXT_STEPS.md) as the starting material. Keep generated dumps and source-text artifacts local; check in scripts, tests, manifests that do not reproduce source text, and concise findings.

## Data boundaries to preserve

Keep exact entry, etymology, sense, spelling, and language identities separate. Attach translation and historical claims to the source records they came from. Preserve direction, components, uncertainty, and source version. An absent or unmatched claim means “not established from these inputs,” not “unrelated.”

Keep lexical history distinct from modern comparison and language-level properties. Borrowing, inheritance, derivation, calquing, compounds, and component relationships can coexist at different scopes. Spelling, pronunciation, meaning similarity, and translation help compare forms; they do not prove origin. Genealogy, area/contact, and typology describe languages and need independent sources.

Treat `other` as the current candidate builder's remainder, not a linguistic category. Keep overlapping evidence and “misleadingly similar” queryable without forcing every word pair into one box. Do not use a small set of reviewed examples to relabel the full dataset or make vocabulary-wide percentage claims.

Package only what the slice can support: stable IDs, source/dump identifiers and hashes, transformation version, rebuild command, license notes, coverage, and limitations. Use the simplest readable format first; add CLDF when it helps someone reuse the result.

Only add a new category, source, or data structure when an audited case demonstrates what it must represent. In particular, do not turn missing evidence into a negative historical claim.

## Milestone check

The first release is ready when the slice reruns from recorded inputs; each result can be traced to exact source records; changed classifications have a stated reason; confirmed identity and extraction failures have regression checks; unresolved and conflicting evidence remains visible; and the release states what it does not establish.

The detailed taxonomy, source audit, and current extraction counts live in [NEXT_DATASET_STAGE.md](NEXT_DATASET_STAGE.md). The concrete examples and rerun commands live in [DATASET_NEXT_STEPS.md](DATASET_NEXT_STEPS.md).
