# What to do next

## Aim

Keep sourcing, extracting, and transforming lexical data ourselves. That work is part of the project. A small public dataset that one or two people find useful is a good outcome; this is a weekend project, not a formal research program.

Wiktionary is the main source for the current work, not the boundary of the project. Use its entries and claims as material to inspect and transform. Bring in another source when a specific case shows what information Wiktionary does not provide. CLDF is welcome when it makes the output easier to exchange; it does not need to shape the internal pipeline.

The first useful result should let someone follow a word comparison back through the source entries and claims, see what our pipeline calculated, and understand what remains uncertain. That is a modest but real contribution. It does not require a complete linguistic database or new labels for every record.

## Work from here

### 1. Finish the bounded case slice

Use the existing 15 case groups as a test bench, not as a representative sample. Keep the cases that exercise different data problems: loans, compounds, shared ancestors, homographs, sense alignment, misleading similarity, ambiguous links, and missing evidence.

For each case, make the path inspectable:

1. Identify the language-specific entry, etymology, sense, and form where the source supports them.
2. Preserve the source claim, its direction, wording or template evidence, and source version.
3. Keep all plausible target entries and senses when the source does not identify one.
4. Store spelling, pronunciation, and meaning scores as calculated observations.
5. Store project conclusions separately, with the rule and evidence that produced them.

The recent Bokmål *ombudsmann* fix is a model for the standard: retain both candidate senses and their links instead of silently choosing one. Apply the same standard to other demonstrated identity or extraction failures.

### 2. Fix one real pipeline failure at a time

Take the next mismatch from the case ledger and reproduce it from the recorded inputs. Find the earliest stage where information is lost: source capture, parsing, identity matching, relation normalization, or comparison alignment. Fix that stage and add a small regression case tied to the source evidence. Rebuild the bounded slice and inspect the changed rows.

Do not bulk-relabel the database from selected examples. Do not turn absent source claims into evidence that two words are unrelated. Keep old and new source states when a page changes.

### 3. Make one small release someone can inspect and reuse

Once the slice rebuilds reliably, package its linked records with stable IDs, source and input fingerprints, transformation versions, rerun instructions, coverage, and limits. Check links and attribution. Run the CLDF validator when available. Keep source dumps and material with unclear redistribution terms out of the release.

Use plain linked tables or JSONL for the working data if that is clearer. Export the compatible records to CLDF when it helps other people load or compare them. Add a small project-specific table for evidence links if the standard tables do not express them cleanly. Do not redesign the pipeline just to fit an export format.

### 4. Let real gaps choose the next source or dimension

When a case cannot be resolved from Wiktionary, write down the exact missing fact first. Then look for a source that can answer that question. Keep language genealogy, typology, and areal/contact facts as separate, independently sourced data; they describe languages and do not settle the history of an individual word.

Do not add another source to make the project look authoritative. Add it because it helps answer a question or enables a useful transformation we cannot do with the current material.

### 5. Expand only after the same method works on new cases

Add a small batch that tests whether the extraction and evidence links generalize. Compare it with the first case slice, record failures, and improve the transformation. Grow the scope by rerunning tested steps, not by extrapolating labels from hand-picked examples.

## Keep these facts separate

- **Language facts:** genealogy, contact or area, and typological properties.
- **Lexical identities:** language-specific entries, etymologies, senses, forms, and components.
- **Source claims:** directed assertions such as inheritance, borrowing, derivation, calquing, and compound formation.
- **Computed observations:** form, sound, and meaning similarities, with the method and model recorded.
- **Project interpretations:** conclusions derived from claims and observations under explicit rules.

A word can have several historical paths. A loan can also share deeper ancestry; a compound can have cognate components without the whole compound being established as a cognate. Keep those claims queryable side by side rather than forcing them into one exclusive label. “Misleadingly similar” can describe a useful comparison pattern even when the historical path is borrowing, shared ancestry, or unresolved.

The current `other` value is a candidate-builder remainder, not a linguistic category. Do not use it as a claim about origin. Likewise, candidate counts do not establish the share of a language's vocabulary that is cognate.

## The first release is ready when

- The bounded slice rebuilds from recorded inputs with a documented command.
- A reader can follow selected results to their source entries, source claims, and transformation output.
- Ambiguous, conflicting, and missing evidence stays visible.
- Computed similarity does not masquerade as historical proof.
- The release states what it covers and what it cannot establish.
- Its source terms and export format support sharing.

## Current records

- [Current data and near-term actions](DATASET_NEXT_ACTIONS.md) has the live status, counts, and next pipeline tasks.
- [Detailed pipeline findings](DATASET_NEXT_STEPS.md) keeps the chronological audit trail.
- [Reviewed example cases](DATASET_CASE_REVIEW.md) tracks the source-backed examples and their limits.
- [Dataset direction](DATASET_PROJECT_DIRECTION.md) records the broader data model and scope.
