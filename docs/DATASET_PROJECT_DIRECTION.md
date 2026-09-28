# Dataset direction and next work

## The point of the project

Keep building a dataset from source material and transformations that we can inspect. The first public result can be small and useful to a few people. The work of finding, extracting, linking, and testing the data is part of the project; do not replace it with a finished corpus or a generic data-entry app.

The first useful product should let someone explore a word comparison and answer: which source entries and senses were used, what those sources say, what the pipeline calculated, and where the result is uncertain. The site can make that data easier to explore, but it should not define what the data is.

Wiktionary remains the main source for the current work. It gives us a substantial set of entries and etymology material to transform. Its gaps and uneven detail should be recorded as properties of the source, not silently filled by our rules. Add another source when a concrete case shows what it can contribute. Do not switch to a ready-made dataset just to avoid improving our own pipeline.

## Keep separate questions separate

The dataset will be more useful if it records evidence and observations before it produces summary labels.

- **Language and variety facts:** genealogy, contact or area, and typological features. Each fact needs its own source, definition or classification, and coverage. These describe languages; they do not determine the history of a particular word.
- **Lexical identity:** language-specific entries, etymologies, senses, forms, and components. Keep homographs and multiple etymologies distinct.
- **Historical claims:** sourced, directed paths such as inheritance, borrowing, derivation, calquing, and compound formation. Preserve the entry or sense that supports each claim. A pair can have more than one path.
- **Comparison observations:** spelling, sound, meaning, and translation evidence. These help find and compare forms; they do not prove a historical relationship.
- **Project interpretations:** judgments derived from evidence and named rules. Keep their scope, evidence links, and uncertainty visible. A candidate such as “misleadingly similar” can coexist with a borrowing or cognate path.

Do not use one exclusive category to answer all these questions. In particular, `other` is a current candidate-builder remainder, not a linguistic relationship. Missing evidence means unresolved, not unrelated. Keep any category used by the site queryable, but derive it from the richer records rather than treating it as the source of truth.

## Work in this order

### 1. Turn the current audit into a small working slice

Use the existing case ledger and local source-pair audits. Keep cases that test distinct transformations: homographs and sense alignment, direct loans, shared donors, shared ancestors, compounds, partial relationships, misleading similarity, and missing or conflicting evidence.

For each case, record the selected source entries and senses, the source claim and its direction, the evidence link, the computed observations, the pipeline interpretation, and anything unresolved. Keep the original source wording or a stable pointer to it. Do not expand this into a large hand-labeled study.

### 2. Fix identity and evidence loss at the earliest failing step

Run each case through the pipeline and identify where a mismatch first appears: source extraction, entry or sense identity, candidate retrieval, normalization, or interpretation. Fix only demonstrated gaps. Add a small regression check for each reproduced failure, then rerun the same slice.

Keep source claims, computed scores, and project judgments in separate records. Preserve direction, multiple paths, and component-level links. Do not infer a whole-word relationship from similar spelling, a shared donor, or matching compound parts alone.

### 3. Make the slice easy to inspect and rerun

Create a versioned output with stable IDs, source references, transformation version, input manifest, and one documented command to rebuild it. Include a short explanation of what the output supports and what it cannot establish. Keep raw source dumps out of the release unless their terms and size make that appropriate.

Start with readable TSV or JSONL if that is the fastest way to inspect the output. Map records to CLDF where its existing tables fit and add a small linked table for project-specific evidence when needed. CLDF is an exchange format, not a reason to reshape the internal pipeline prematurely.

### 4. Use the released slice to choose what to expand

After the slice can be rebuilt and inspected, look at which records remain unresolved and why. Add a source only when it can answer a defined question that Wiktionary leaves open. Expand to more pairs or varieties by rerunning the same tested transformations, not by applying broad labels from the small case set.

Add language-level genealogy, area, or typology when a concrete site question makes those facts useful. Keep those facts independently sourced and modeled; do not fold them into lexical-history categories.

## What not to do yet

- Do not bulk-relabel the database from the reviewed examples.
- Do not describe candidate counts as the share of a language's vocabulary that is cognate.
- Do not equate absent source evidence with a confirmed separate origin.
- Do not build a general-purpose linguistic ontology before the working slice needs one.
- Do not add sources, language coverage, or infrastructure without a concrete question they help answer.

## Done when

- A small slice can be rebuilt from recorded inputs and a documented command.
- A person can follow a comparison to its source entries, senses, claims, and transformation output.
- The output distinguishes source evidence, computed observations, and project interpretations.
- Multiple paths and unresolved links remain visible instead of being flattened into one confident label.
- Regression checks cover the extraction or linking failures found in the slice.
- A readable release exists, with CLDF used where it makes reuse easier.

## Current records

- [Next dataset actions](DATASET_NEXT_ACTIONS.md) tracks the present pipeline status and near-term tasks.
- [Case review](DATASET_CASE_REVIEW.md) records the source-backed examples and current limits.
- [Next dataset stage](NEXT_DATASET_STAGE.md) contains the fuller data-model notes and work history.
