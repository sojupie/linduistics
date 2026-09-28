# What to do next

## Aim

Keep making the data ourselves: source it, extract it, transform it, and inspect what the pipeline did. That is part of the fun and the point of the project. A small result that is useful to one or two people is a good result; this is a weekend project, not a claim to conduct formal linguistic research.

Wiktionary is the main source for the current work, not the definition of the project. Keep its claims and gaps visible. Add another source when a concrete case shows what information or transformation it can contribute. CLDF is fine as an exchange format; it should help someone reuse the data without dictating our internal pipeline.

## Next milestone: make a small slice trustworthy to inspect

The pipeline already has a source-linked case slice and a local CLDF Generic preview. Use these in the existing repo. Do not start a separate validation project, replace the work with a finished corpus, or update the live database as part of this milestone.

### 1. Extend the case slice with component-overlap examples

The shared-component candidate file overlaps four current `partial_cognate` comparisons: Danish–Swedish *oversætte/översätta*, Danish–Swedish *ramsløg/ramslök*, German–English *berauben/bereave*, and German–English *Stieftochter/stepdaughter*. Add these as test cases to the existing slice, then inspect their source entries, senses, whole-word claims, and component claims together.

These are deliberately selected debugging examples, not a representative sample. A component link is evidence about a component; it does not by itself establish the history or cognacy of the complete word. The existing `partial_cognate` output is a legacy rule based on a shared root and a semantic-score threshold, not a component-level finding.

### 2. Trace each example from source to output

For each case, capture enough to follow the transformation:

1. the exact source entry, etymology, and selected sense on each side;
2. source wording or template, normalized claim, direction, and target identity;
3. compound/component evidence, kept separate from whole-word history;
4. the comparison forms and computed spelling, sound, and meaning observations;
5. the rule that produced the current result, plus anything unresolved.

When something disagrees, find the earliest failing step: extraction, lexical identity, sense alignment, claim matching, score calculation, or interpretation. Fix only demonstrated failures and add a regression check for each reproduced one. Keep source claims, computed observations, and project interpretations as separate facts; allow more than one historical path.

### 3. Rebuild and inspect the same export

Regenerate the readable case slice and its CLDF preview from the recorded local inputs. Check stable IDs, references, input hashes, and the generated summaries. Keep the JSONL as the easiest debugging view and the CLDF tables as a reuse option. The current exporter checks its declared IDs and foreign keys; an official CLDF validator has not yet been run, so do not describe the preview as officially validated.

Before publishing, review source attribution and redistribution terms. Prefer source links and compact extracted claims where copying full Wiktionary text is unnecessary. Include a rebuild command, input/version details, and a plain statement of what the slice can and cannot support.

### 4. Use the failures to choose the next transformation

After these cases are traceable, pick the next source or pipeline gap from observed evidence. A useful next question might concern multiple etymologies behind one spelling, target resolution for source claims, or borrowing alongside shared deeper ancestry. Choose one demonstrated gap, improve its extraction or linking, and rerun the same slice. Add another source only if it contributes evidence the current sources do not provide.

Language genealogy, areal/contact relationships, typological features, lexical histories, and form/meaning comparisons are different kinds of data. They may all be useful to the site, but keep their sources and meanings distinct rather than folding them into a single word-pair label.

## Guardrails

- Do not bulk-relabel the database from a handful of cases.
- Do not treat missing evidence or the current `other` bucket as proof of unrelated origins.
- Do not present candidate counts as the percentage of either language's vocabulary that is cognate.
- Do not infer whole-word history from similar forms, shared components, or a deep root alone.
- Do not build a general ontology or add infrastructure before a real data case needs it.
- Keep generated review data local until it is checked; do not change live rows during this milestone.

## Done when

- A bounded set of comparisons can be followed from source entries and senses through claims and calculations to the current output.
- At least the reproduced extraction/linking problems have regression checks.
- Multiple paths, component evidence, source uncertainty, and project judgments stay distinguishable.
- Another person can inspect and rebuild the slice from documented inputs.
- The CLDF preview is kept because it makes reuse easier, not because the project has to become CLDF-native.

## Related notes

- [Current data and near-term actions](DATASET_NEXT_ACTIONS.md)
- [Source extraction and audit findings](DATASET_NEXT_STEPS.md)
- [Reviewed example cases](DATASET_CASE_REVIEW.md)
- [Dataset direction](DATASET_PROJECT_DIRECTION.md)
