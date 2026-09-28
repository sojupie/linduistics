# Next steps for the dataset

## Aim

Keep building the source and transformation pipeline as the project. A useful result can be a small dataset that one or two people can inspect and reuse. Wiktionary remains the main source for now. CLDF is an optional export format, not the internal model or the goal by itself.

Keep the work hands-on and exploratory: sourcing, transforming, and checking the data is part of the fun. This does not need to become formal linguistic research to be useful.

The next work should make it possible to follow a result from the source entry and sense, through the extracted claims and our calculations, to the interpretation shown by the site. It should also make gaps and uncertain links visible instead of turning them into confident labels.

## Current checkpoint

The source-template audit now covers five passes: target-language extraction, missing word-formation aliases, process-specific formation data, clipping/inflection/PIE-word links, and source labels for same-language derivation, international distribution, and sound symbolism. These additions preserve source claims without changing comparison labels or the database. See the [source-language audit](DATASET_NEXT_STEPS.md#use-template-language-arguments-for-source-forms-2026-09-28), [formation-process audit](DATASET_NEXT_STEPS.md#preserve-additional-word-formation-evidence-2026-09-28), [clipping, inflection, and PIE-word audit](DATASET_NEXT_STEPS.md#retain-clipping-inflection-and-pie-word-links-2026-09-28), and [source-kind audit](DATASET_NEXT_STEPS.md#preserve-same-language-derivation-and-source-kind-claims-2026-09-28).

Next, keep auditing templates whose normalized claims lack endpoints. Check each template against its documentation and raw examples before changing extraction. Then follow the current focused word cases through source-entry matching and interpretation.

## Work in this order

### 1. Finish checking the source extraction rules

Continue from the full Wiktionary dump scan. Check templates whose normalized claims lack source forms, and templates where the source language in the arguments differs from the page language. Confirm each template’s argument meaning from its documentation and sampled source records before changing a rule.

For each demonstrated gap:

- preserve the raw template and arguments;
- normalize only fields the source supports;
- leave optional or ambiguous targets unresolved;
- add a small regression case;
- rebuild a separate local snapshot and compare it with the previous one.

Do not treat every unnormalized template as an etymology gap. Many templates only format or annotate an entry.

### 2. Trace a focused set of real examples end to end

Use the existing cases that exposed structural problems: *fleece*, *clown*, *ombudsman*, *bank*, *bankman*, and *sandbank*. Add a case only when it tests a distinct source or transformation pattern, such as a homograph, shared donor, compound component, or uncertain origin.

For each comparison, record:

1. the exact source entry, etymology, and sense on each side;
2. the source’s relationship claim, its direction, and its evidence;
3. component links when the word is formed from other words;
4. computed spelling, sound, or meaning observations;
5. the pipeline interpretation and any unresolved identity or origin question.

This is a debugging and design set, not a representative sample. Use it to find where the pipeline loses or misapplies evidence, not to estimate how much of a language’s vocabulary is related.

### 3. Fix the earliest demonstrated failure

For each mismatch, locate the first step that went wrong: source parsing, entry or sense identity, component linking, candidate matching, score calculation, or interpretation. Fix that step and add a regression case. Keep distinct claims and paths instead of forcing a word pair into one exclusive historical box.

Keep three things separate in the data:

- what Wiktionary or another source states;
- what our code calculates from forms and meanings;
- what our rules infer from those inputs.

An absent claim or unmatched form means the relationship is unresolved in this data. It does not mean the words are unrelated.

### 4. Make one small, rebuildable data release

Once the focused examples can be traced end to end, package that slice with stable IDs, source links, input hashes or revisions where available, transformation version, a rebuild command, and known limits. Start with readable JSONL or TSV so the records stay easy to inspect during development.

Then try exporting the same slice to CLDF. Keep the export if its standard tables make the data easier for someone else to use. Add only a small documented extension for evidence that CLDF does not represent well. Check attribution and redistribution terms before publishing source-derived text or data.

## Not part of this pass

- Bulk-reclassifying the current database from a small set of examples.
- Calling candidate-pair totals percentages of a language’s vocabulary.
- Treating `other` or missing evidence as a linguistic relationship.
- Replacing the source pipeline with a finished corpus or a data-entry application.
- Adding sources or language-level genealogy, area, and typology data before a concrete question needs them.
- Building a general-purpose ontology or making CLDF the internal schema.

## Done for this stage when

- The focused examples can be followed from exact source entries and senses to the displayed result.
- Each reproduced extraction or identity failure has a regression check.
- Source claims, computed observations, and project interpretations remain distinguishable.
- Multiple paths, components, and unresolved links remain inspectable.
- Another person can rebuild the small slice from documented inputs.
- A CLDF export has been tested and kept only if it improves reuse.

## Project notes

- [Current dataset actions and status](DATASET_NEXT_ACTIONS.md)
- [Source and transformation findings](DATASET_NEXT_STEPS.md)
- [Dataset direction and data model](DATASET_PROJECT_DIRECTION.md)
