# Next dataset work

## Aim

Keep doing the part that made this project interesting: source data, inspect what it actually says, and build transformations that can be rerun and understood. The practical goal is a small public slice that may be useful to a few people. This is not a plan to replace Wiktionary, create a research program, or turn the site into a CRUD app.

Wiktionary stays the first source. CLDF is a possible export format when it helps someone reuse the result; it does not dictate the internal model or need to be adopted before the data is ready.

## First useful release

Build one bounded, source-backed slice across the five varieties already in the project. A reader should be able to go from a compared form and sense to the exact source entries, see the source wording and the transformation, and distinguish stated history from our computed observations and interpretation.

Use the cases and extraction work recorded in [NEXT_DATASET_STAGE.md](NEXT_DATASET_STAGE.md) and [DATASET_NEXT_STEPS.md](DATASET_NEXT_STEPS.md) as the starting material. Keep generated dumps and source-text artifacts local; check in scripts, tests, manifests that do not reproduce source text, and concise findings.

## Work order

1. **Finish the evidence slice.** Keep exact entry, etymology, sense, spelling, and language identities separate. Attach translation claims and etymology claims to the exact source records they came from. Preserve the original wording, direction, components, uncertainty, and source version. An absent or unmatched claim means “not established from these inputs,” not “unrelated.”
2. **Represent claims at the right scope.** Keep whole-entry history separate from component history. A compound can have cognate components without its whole-word history being established. A borrowing can coexist with a deeper shared ancestor. A translation, similar form, or high similarity score is not itself evidence of cognacy.
3. **Test the transformation on a seeded, varied sample.** Include every current label and the structural cases already exposed: loans, compounds, shared donors, partial relationships, homographs, sense mismatches, and missing or uncertain etymologies. Record the old result, source-backed claims, new interpretation, and unresolved bits side by side. Use the sample to find parser and join failures; do not claim it proves vocabulary-wide correctness or percentages.
4. **Explain the residual bucket from evidence.** Treat `other` as the current builder's remainder, not a linguistic category. Split sampled rows only when their evidence supports a distinct description, such as a recorded loan, compound, translation-only link, unresolved origin, or mismatched sense. Keep multiple claims when they apply; do not force every pair into one exclusive label. Retain “misleadingly similar” as a queryable comparison observation even when origin is unknown.
5. **Compare before replacing.** Rebuild only the bounded candidate slice first. Show which rows changed and why, and keep the existing classifications available for comparison. Expand to more rows only after the exact-sense links and demonstrated failure cases pass their regression checks. Leave the live database untouched until the candidate output is inspectable.
6. **Package what the slice can support.** Publish versioned machine-readable tables with stable IDs, source/dump identifiers and hashes, transformation version, rerun command, license notes, coverage, and limitations. Use the simplest useful project format first; add a CLDF export if its existing tables fit and make the slice easier to reuse. Keep project-specific evidence links documented rather than distorting them to fit a format.

## Keep the data dimensions distinct

- **Language relationships:** genealogy, contact/area, and typological features each need their own sourced statements and coverage. They are not interchangeable.
- **Lexical history claims:** inheritance, borrowing, calquing, derivation, compounds, and cognate-set links are directed or scoped relationships supported by source evidence.
- **Comparison observations:** translations, spelling, pronunciation, and semantic similarity describe forms or senses; they can help find candidates but do not establish origin.
- **Project interpretations:** judgments derived by a named transformation, with its input records, version, and uncertainty visible.

Only add a new category, source, or data structure when an audited case demonstrates what it must represent. In particular, do not turn missing evidence into a negative historical claim.

## Milestone check

The first release is ready when the slice reruns from recorded inputs; each result can be traced to exact source records; changed classifications have a stated reason; confirmed identity and extraction failures have regression checks; unresolved and conflicting evidence remains visible; and the release states what it does not establish.

The detailed taxonomy, source audit, and current extraction counts live in [NEXT_DATASET_STAGE.md](NEXT_DATASET_STAGE.md). The concrete examples and rerun commands live in [DATASET_NEXT_STEPS.md](DATASET_NEXT_STEPS.md).
