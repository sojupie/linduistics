# Dataset next steps

## Aim

Keep building the data, source links, and transformations ourselves. The work is useful even if the first public result serves only a small number of people. It should be possible to inspect a result, see which source records support it, and rerun the transformation that produced it.

Wiktionary remains the first source, not the whole definition of the project. CLDF is a valid way to share compatible tables. It does not need to shape the internal pipeline, and we do not need a complete CLDF release before we have a useful data slice.

## Do this next

### 1. Close the identity gap in the comparison builder

The lemma parser now keeps separate source entries and senses, but `load_canonical_lexicons()` still keys entries by lowercased spelling. That collapses German forms such as `Gift` and `gift` before comparison. Trace the dependent lookups, preserve exact entries, and make normalized lookups explicit about ambiguity instead of choosing one silently.

Add a small regression case proving that both forms survive loading and that translation and surface-collision matching do not attach evidence to the wrong entry. Then rebuild the local candidate dataset and report how many rows and pairings changed. Keep the database untouched while checking the result.

### 2. Make a rerunnable, source-backed slice

Use the existing language set and source dumps. Pick a bounded group of comparisons that exercises the problems already found: capitalization and homographs, same-gloss senses, direct loans, shared donors, compounds, partial relationships, misleading similarity, and missing or uncertain origins.

For each result, preserve links to the exact source entry, etymology, and sense when available. Keep the source wording and normalized source claim beside the pipeline's interpretation. Keep form and meaning similarity as separate computed observations. A pair may have several historical paths; absent evidence means “not established from these inputs,” not “unrelated.”

Use the existing audit scripts and candidate builder where possible. Add regression checks only for failures the slice demonstrates. Do not manually relabel the full dataset from a small sample.

### 3. Keep the dimensions separate

The data can support several kinds of questions, but they are not one taxonomy:

- **Language-level classification:** genealogy, contact or area, and typological features each need their own source and definition.
- **Lexical history:** inheritance, borrowing, calquing, derivation, compounds, and cognate-set links describe different relations. Preserve direction and components where the source gives them.
- **Comparison observations:** spelling, pronunciation, and meaning similarities describe forms or senses. They can find candidates and support a quiz; they do not prove a historical relation.
- **Evidence status:** record whether a link is source-stated, inferred by a named transformation, uncertain, conflicting, or not found in the available input.

Keep the current `other` value as a candidate-builder remainder until its contents are explained. Split it only when the source data supports a specific relation or when a distinct candidate type is useful. Do not turn it into a single replacement label.

### 4. Publish only what the slice can support

Package the slice with stable IDs, source names and versions, retrieval or dump details, transformation version, rerun command, license notes, and a short coverage and limitations note. Make it inspectable in the site or downloadable as simple machine-readable files.

Check whether CLDF's existing modules fit the released tables. Export the compatible parts if that helps another person use them; document any project-specific evidence links alongside them. Do not add a new source or all-language scope until a concrete gap in this slice justifies it.

## Done when

- The identity regression passes, including the distinct German `Gift` and `gift` entries.
- The slice rebuilds from recorded local inputs and produces the same output for the same pipeline version.
- A reader can trace a result to its source wording and see which steps are source claims versus computed values.
- Unknown, conflicting, and ambiguous evidence stays visible instead of being converted to a confident label.
- The release makes one clear, useful claim and states what it cannot establish.

## Not part of this pass

- Replacing the Wiktionary pipeline with a ready-made corpus.
- Reclassifying every comparison or claiming vocabulary-wide cognate percentages.
- Applying the pending database migration or changing the live database before the candidate output is reviewed.
- Building a general-purpose linguistic ontology or making the site API the internal data model.

The longer audit history and current data model are in [NEXT_DATASET_STAGE.md](NEXT_DATASET_STAGE.md).
