# What to do next with the dataset

## Direction

Keep sourcing, extracting, and transforming lexical data ourselves. That work is part of the project. Do not replace it with a finished corpus or let the site’s current endpoints dictate the data model.

A good outcome can be modest: a small public dataset that one or two people find useful because they can inspect where a lexical claim came from and how we transformed it. CLDF is welcome as an exchange format. Use it where it makes the result easier to reuse; keep the working pipeline shaped around the data and evidence we actually collect.

The dataset should preserve different kinds of information separately:

- **Source records and claims:** what a source says, where it says it, and the entry or sense it applies to.
- **Computed observations:** spelling, sound, meaning, and other values calculated by our pipeline.
- **Our interpretations:** judgments we make from the evidence, including uncertainty and multiple possible paths.

One word pair may have more than one path. A source’s claim is evidence to preserve, not automatic proof of the full historical relationship. Missing evidence stays missing; it does not mean “unrelated.”

## Current state

- The pipeline covers Danish, German, English, Norwegian Bokmål, and Swedish Wiktionary-derived data.
- The local source export keeps source-entry identity, source senses, raw etymology templates and arguments, and normalized claims. It contains 710,110 source records and 1,148,705 claim records.
- A compact local slice contains 5,446 source-backed named-after, coined-by, coinage, and onomatopoeic facts. Each has a stable ID and source URL; it omits full etymology prose.
- A separate 270-case audit keeps comparison senses, source claims, and their evidence links available for inspection. It is diagnostic, not representative.
- The full pipeline suite passes 100 tests. Generated files are local and ignored; the live database has not been updated.

These counts describe the current extracted files, not vocabulary coverage or the share of words with any historical relationship. The current `other` category is a candidate-builder remainder, not a linguistic conclusion.

## Next work

### 1. Make the source-to-result path work end to end

Use the existing case ledger and local audit files. For a compact set of useful examples—*fleece*, *clown*, *ombudsman*, *bank*, *bankman*, and *sandbank*—follow the data through:

1. the exact source entry and etymology;
2. the selected sense or component, when available;
3. the extracted source claim and its direction;
4. the comparison candidate and computed observations;
5. the pipeline transformation that produced the displayed result.

Record which step loses, merges, or misapplies evidence. Fix demonstrated extraction or identity problems and add a regression example for each one. Do not manually relabel the bulk dataset from this small set.

### 2. Keep building the evidence model from real source structures

Continue expanding the extractor where Wiktionary contains structured evidence that the current export drops or flattens. Preserve the raw template and arguments beside each normalized claim. Keep source-supported claims distinct from our judgments and similarity scores. Support multiple etymologies, senses, component relations, and paths for the same spelling or pair.

Treat unresolved source links as unresolved. Do not infer unrelated origins from an empty root field, a missing template, or a lack of a matched entry. Keep source claims queryable even when they do not map cleanly to a current comparison row.

### 3. Publish one small, rerunnable data slice

Make a release from the source-to-result slice above, not a copy of the entire raw dump. Include stable IDs, source and entry references, the claims and computed observations used, the transformation version, source-file hashes or revision details where available, a rebuild command, and clear limits on what the data supports.

Keep the readable JSONL/TSV form as a working baseline. Then map the entries, forms, senses, and compatible relationships to CLDF and see whether that makes the slice easier to consume. Put project-specific provenance or evidence in a small linked table if CLDF does not represent it directly. Do not block the data work on a perfect CLDF model.

Check attribution, license, and redistribution terms before publishing source-derived content. Links and compact claims may be distributable where copied prose or dumps are not.

### 4. Add another source when it adds a useful transformation challenge

Wiktionary can remain the main source without being the only source. First name the concrete information we want to add—for example, a stable language identifier, a missing historical form, or an independent account of a borrowing path. Then choose a source that can supply it and preserve its claims separately from Wiktionary’s.

The point is not to import a finished answer and replace our pipeline. The point is to learn how sources differ, connect their records, and make those transformations inspectable. Keep genealogy, typology, and contact data as separate dimensions if we add them; do not fold them into a word-pair label.

## A useful first release

Someone should be able to pick a result and:

1. identify the source entry and sense used;
2. inspect the source claim, direction, and evidence;
3. distinguish source assertions from computed values and our interpretation;
4. see multiple paths, missing links, and uncertainty without a forced one-box label;
5. rerun the transformation on the documented local inputs.

That is enough for a useful public artifact. It does not need complete language coverage, expert review of every row, a new data platform, or a claim about the proportion of either language’s vocabulary that is cognate.

## Defer

- Reclassifying every current comparison before the source-to-result path is traceable.
- Treating pair-candidate counts as vocabulary-wide rates.
- Importing broad genealogy or typology data without a question the project will answer with it.
- Building a general-purpose ontology or forcing CLDF to become the internal data model.
- Adding sources solely to make the dataset look larger.

## Stage complete when

- The selected examples can be traced from source entry and sense through extraction and transformation to the result.
- Demonstrated loss or identity bugs have regression checks.
- Claims, observations, and interpretations remain distinguishable, including uncertainty and multiple paths.
- A small slice can be rebuilt and inspected from documented local inputs.
- A CLDF export has been tried and retained only if it helps another person use the slice.
