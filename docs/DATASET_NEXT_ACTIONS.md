# Dataset: next actions

## Aim

Keep building our own source-and-transform dataset from Wiktionary and the other inputs we choose to add. Sourcing, parsing, and testing transformations are part of this project. A small public slice that helps even one or two people is a good outcome.

The next result should let someone inspect a lexical comparison and follow it back to the source entries, source claims, and transformations behind it. It should not claim to measure how much of a language's vocabulary is cognate with another.

CLDF is an export option. Use its existing tables where they fit; keep project-specific evidence in a small linked table when they do not. Do not make CLDF the internal data model or a prerequisite for continuing the pipeline.

## Work in this order

### 1. Close the candidate-recall audit

The 270-row source audit came from an older API snapshot. The same pairs have now been checked against a fresh local candidate build, and 23 do not have an exact candidate row.

- Reproduce the 23 misses from the recorded local inputs.
- For each, identify whether candidate caps, candidate eligibility, spelling or case identity, or another step explains the miss.
- Fix only demonstrated retrieval defects. Keep legitimate exclusions visible as exclusions.
- Re-run the exact-pair join and record which audit comparisons still have no candidate.

This step checks whether the candidate generator finds the examples we ask it to inspect. It does not estimate vocabulary coverage.

### 2. Make a compact reviewed case set

Use the existing source audit and cases already identified in [the stage notes](NEXT_DATASET_STAGE.md). Keep examples that exercise different data problems: direct borrowing, shared donor, inherited forms, compounds and components, homographs, partial cognacy, misleading similarity, uncertain roots, and missing source links.

For each case, record:

- the compared language-specific entries and selected senses;
- the source entry and sense IDs, where available;
- the source wording or template claim, including direction and uncertainty;
- the comparison observations, such as spelling, pronunciation, meaning, and translation evidence;
- what the data supports, what remains unresolved, and why.

Keep source claims, computed observations, and our judgments as separate records. A source claim is evidence to inspect, not automatic confirmation. Missing evidence means unresolved, not unrelated. A word pair may have several paths, including a loan path and a deeper shared history.

Do not treat the old API categories or their sample counts as current truth. Keep this case set diagnostic and small enough to inspect by hand.

### 3. Build and test one source-to-result transformation

Use the existing extraction, audit, and edge-projection scripts where they fit. Extend them only when a selected case demonstrates a real gap. The transformation should preserve:

- distinct source entries, etymologies, and senses;
- directed source claims and their raw template evidence;
- component links separately from whole-word claims;
- comparison scores and translation statements as observations;
- unresolved or conflicting links instead of guessed matches.

Add a regression check for each confirmed extraction, identity, or projection failure in the reviewed cases. Rebuild the slice from recorded local inputs and compare the results with the current candidate output. Do not bulk-relabel the database from the sample.

### 4. Make the slice useful to inspect

Give each released record a stable ID and a path to its source. A reader should be able to start from a spelling pair and find the selected senses, source evidence, normalized claims, computed observations, and transformation version.

The first useful release can be a small set of machine-readable tables plus a short guide with worked examples. It can also feed an inspection view in the site. Choose the simpler presentation once the slice shows what people need to inspect; do not build a new platform for it.

Before publishing, record the source dump or release, retrieval details and hashes, transformation version and rerun command, coverage limits, and applicable source terms. Do not commit raw source dumps or generated files containing source text unless their terms and repository policy allow it.

### 5. Export for reuse

Check the finished tables against the CLDF modules that fit them. Export compatible forms, senses, cognate sets, or other supported records when that helps reuse. Link extra source claims, evidence, and project judgments through documented IDs and tables.

If a plain TSV or JSONL export is easier to inspect and maintain for the first slice, use that first. Add CLDF output when it improves compatibility for a real consumer. The export format should follow the data we can support.

## First release boundary

Keep the first release within the five varieties already in the project. Include only the reviewed slice and its provenance. Do not present the slice as representative of those varieties, and do not convert current candidate counts into vocabulary-wide percentages.

Do not add another source just to make the dataset look broader. Add one when a specific reviewed case shows that it can answer a question the current source cannot, such as identifying a sense, resolving an etymology path, or supplying a useful language classification. Keep the existing source-and-transform work central if another source is added.

## Done when

- The candidate-recall misses are explained and reproducible.
- The reviewed cases retain separate source claims, comparison observations, and project judgments.
- Each result can be traced to source entries and to the transformation that produced it.
- Known failures have regression checks; ambiguous evidence stays unresolved.
- Someone else can rerun the slice and understand its scope and limits.
- The result is packaged in the simplest useful format, with CLDF exported only where it helps.

## Not this stage

- Replacing the pipeline with a finished corpus or a ready-made dataset.
- Reclassifying all comparison rows or applying a database migration before reviewing the slice.
- Claiming full coverage, expert adjudication, or language-wide cognate percentages.
- Building a general linguistic ontology or adopting a format before a real use requires it.
