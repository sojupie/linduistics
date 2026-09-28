# What we do next with the dataset

## Aim

Keep building the data ourselves: find source material, extract it, transform it, and inspect what our pipeline did. That work is part of the project. The result can stay small and still be useful to a few people. This is a weekend project, not a claim to conduct formal linguistic research or to replace Wiktionary with somebody else's finished dataset.

CLDF is welcome as a data format. Treat it like an export or exchange format: try it when there is a real slice to share, keep it if it makes that slice easier to use, and add only the small extensions needed for our provenance and transformations. It does not need to dictate the internal pipeline.

## The next milestone

Make one bounded set of word comparisons traceable from the source data through our transformations to the result. This should expose real pipeline behavior and produce an artifact someone else can inspect or reuse. It is not meant to estimate how much of a language's vocabulary is related, or to establish linguistic truth by itself.

Use the current local source exports, candidate build, source-claim crosswalks, and case ledger. Do this in the existing pipeline and tests; do not start a separate validation project or change the live database as part of the investigation.

## Work order

### 1. Pick cases that test different data problems

Start with the existing examples rather than hand-labeling a large new sample. Keep cases that reveal different transformations: direct borrowing, a deeper shared ancestor, compounds, multiple etymologies for one spelling, source claims without a matched sense, and similar forms with uncertain history. Existing examples include *fleece*, *clown*, *ombudsman*, *bank*, *bankman*, *sandbank*, and *torta/tort*.

Add a case only when it tests something the current set does not. This is a debugging slice, not a representative survey.

### 2. Follow each case to the first point of failure

For each comparison, record or inspect:

1. the exact source entry, etymology, and sense on each side;
2. the source's claim, direction, wording or template, and target form;
3. any compound or component links, separately from the whole-word history;
4. the candidate pair and the spelling, sound, meaning, or translation observations we computed;
5. the rule that produced the current interpretation, plus anything unresolved.

Then identify where a mismatch begins: extraction, entry or sense identity, candidate matching, score calculation, or interpretation. Fix that cause, preserve the source evidence, and add a small regression check. Do not change a pair label merely because a source mentions a similar form or because a root field happens to match.

### 3. Keep different facts distinct

- **Language facts:** genealogy, area/contact, and typological features describe languages and need their own sources.
- **Lexical records:** entries, etymologies, senses, forms, and components keep homographs and multiple histories distinct.
- **Historical claims:** inheritance, borrowing, derivation, calquing, cognate mentions, and word formation are sourced paths with direction and scope. A pair may have several.
- **Comparison observations:** spelling, sound, meaning, and translation help find and describe candidates; they do not prove a shared origin.
- **Project interpretation:** any label or judgment we derive must name its inputs and rule, and remain separate from what a source says.

Do not force these into one exclusive box. A word can be a loan and have a deeper shared ancestor; a compound can have cognate components while its whole-word history remains unclear; and “misleadingly similar” can describe a comparison even when origin is unresolved. Keep `other` as the current candidate builder's remainder, not as a linguistic category.

### 4. Make the transformation rerunnable and inspectable

Build the bounded output from recorded local inputs. Give records stable identifiers and retain source entry/sense IDs, source URLs, input hashes or revisions where available, and the transformation version. Make one command rebuild it. Start with readable JSONL or TSV if that keeps debugging simple.

Try exporting that same slice to CLDF. Use the standard tables where they fit; link a small project-specific evidence table where they do not. Keep the export only if someone can more easily inspect, import, or build on the data. Check the applicable attribution and redistribution terms before publishing source-derived text; compact claims and links may be more suitable to share than copied source prose or raw dumps.

### 5. Expand from demonstrated gaps

Use the slice to see which useful facts Wiktionary does not provide or which transformations it makes difficult. Add another source only to answer a concrete question, and preserve its claims independently so sources can disagree. Expand language coverage or add language-level genealogy, area, and typology when a useful question calls for them.

## What this milestone is not

- A bulk relabeling of the database.
- A vocabulary-wide cognate percentage.
- A claim that missing evidence means unrelated origins.
- A replacement for the source-and-transformation pipeline with a finished corpus or CRUD app.
- A general linguistic ontology or a requirement to adopt CLDF internally.

## Done when

- A small set of comparisons can be followed from source entries and senses through claims and calculations to our interpretation.
- Demonstrated extraction or identity problems have regression checks.
- Multiple paths, components, and uncertainty remain visible.
- The output can be rebuilt from documented inputs and inspected in a readable format.
- A CLDF export has been tested, and is retained if it makes the slice more useful to others.

## Related notes

- [Current data and near-term actions](DATASET_NEXT_ACTIONS.md)
- [Source extraction and audit findings](DATASET_NEXT_STEPS.md)
- [Reviewed example cases](DATASET_CASE_REVIEW.md)
- [Dataset data model](DATASET_PROJECT_DIRECTION.md)
