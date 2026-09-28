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
- Fresh per-language lemma tables are now built for all five local dumps. All 1,060,087 active sense records have source-entry and source-sense IDs; 222,272 senses have an extracted etymological root.
- The current working comparison artifact contains 1,638,454 directed candidate rows across the 10 language pairs. Its `semantic_sim` field now contains the embedding result rather than a fixed 0.95 floor for Wiktionary translation candidates. Its root relation counts are 24,872 rows with equal extracted roots and 1,613,582 unknown. The candidate category counts changed; see the [score-separation audit](DATASET_NEXT_STEPS.md#separate-source-translation-evidence-from-embedding-scores-2026-09-28). These are candidate-build counts, not vocabulary-wide percentages.
- A separate parser-corrected snapshot now ignores Wiktionary's `dercat` language-code list during root extraction. It retains 720,407 lemma rows, removes 223 malformed root values, and changes 275 root fields. Across the same 1,638,454 comparison rows, equal-root relations move from 24,872 to 24,948; 108 directed rows change origin relation across 54 pairs. The source-claim crosswalk retains all 20,188 match IDs, but 36 evidence rows across 27 pairs point to different candidate labels. This snapshot remains a local diagnostic; see the [`dercat` audit](DATASET_NEXT_STEPS.md#ignore-dercat-language-lists-during-root-extraction-2026-09-28).
- The changed pairs also expose an independent taxonomy issue: Norwegian Bokmål *kurv* is explicitly borrowed from Danish *kurv*, yet shared Proto-West Germanic `*korb` yields `etymological_relation: cognate`; the display category becomes `partial_cognate` because the aligned senses score just below a semantic threshold. Borrowing path, common ancestor, sense match, and whole-word cognacy need to remain separately queryable.
- The local source-linked case slice now covers nine groups and records 48 comparison rows, 32 case-level source-entry records, 19 pair-claim matches, and seven component links. It includes exact sense links for the new root and loan cases. The artifact is ignored and hash-manifested; see the [corrected case-slice audit](DATASET_NEXT_STEPS.md#ignore-dercat-language-lists-during-root-extraction-2026-09-28).
- The corrected crosswalk now reports source-claim overlap across all five display labels for 17,594 unique claim-linked candidates: `borrowed_from` appears under every label, while 62 `false_friend` and 1,543 `true_cognate` pairs have a `cognate_mention`. 132 pairs have multiple matched claim types. This supports keeping display patterns and sourced historical paths independent; see the [cross-label matrix](DATASET_NEXT_STEPS.md#source-claims-overlap-current-candidate-labels-2026-09-28).
- The current exact-form-first source-claim crosswalk has 20,188 evidence rows: 18,500 exact-form matches and 1,688 case-fold fallbacks used only when no exact target form exists for that source entry. It covers 17,594 unique candidate pairs, including 13,623 `other` candidates, and marks 405 target identities ambiguous. It now exports the active-sense gloss and extracted root, and its manifest includes the generator hash. These are entry-level source claims, not pair verdicts. See the [latest crosswalk audit](DATASET_NEXT_STEPS.md#prefer-exact-target-forms-and-keep-active-sense-evidence-2026-09-28).
- The component audit indexed 2.3 million dump entries and checked 1,003,229 component occurrences. Its output now carries all candidate source-sense IDs and glosses without selecting one. About 45% of occurrences match one exact entry, 45% multiple entries, and 10% none; even one entry match may still contain several senses. See the component-link findings in the same audit note.
- The existing shared-component audit projects source-root claims onto compound components. It finds 592 shared-root candidates when every component must have one exact entry, and 569 when recorded peer-language paths are also excluded. These remain candidate ancestry links, not reviewed cognate sets.
- A rerunnable local case slice now links the six named examples to comparison candidates, source-entry etymologies, pair-specific source claims, and component-entry candidates. It covers 36 directed comparison rows, 22 source etymology records, 10 claim-to-candidate matches, and seven component-claim records. The artifact is generated locally and ignored by Git; the live database is unchanged. Details are in [the case-slice audit](DATASET_NEXT_STEPS.md#source-linked-case-slice-2026-09-28).
- A demonstrated false-friend error is fixed: English *Bankman* “a surname” versus Swedish *bankman* “bank employee” remains an inspectable candidate but is no longer classified as a false friend. The full pipeline suite passes 105 tests. Generated data remains local and ignored; the live database has not been updated.
- Three source-template mappings now retain the source form for ellipses, nominalizations, and syllabic abbreviations. On the full 710,110-entry export, this supplies target fields to 480 existing claims without changing relation counts; the all-pair candidate-claim join gained no matches. See [the source-template audit](DATASET_NEXT_STEPS.md#restore-source-forms-for-three-etymology-templates-2026-09-28). The full pipeline suite passes 109 tests; the updated extraction remains a separate ignored local snapshot and the database is unchanged.
- A second source-template pass now reads the documented source language from argument 1 for derivation, clipping, back-formation, abbreviation, acronym, and initialism templates, and fills in `init`/`acro` alias targets. Across the same full export, 210 claims in 205 entries changed only in target fields: 117 corrected source-language values, 85 newly populated alias targets, and eight malformed `abbr` language arguments left unresolved. Relation totals and the all-pair matcher output remain unchanged (20,354 matched rows; 406 ambiguous target identities). The full suite passes 111 tests. The new extraction, inventory, and match files remain local and ignored; the database is unchanged.
- A source-template audit then recovered `bf`, `reduplication`, `univerbation`, and `contraction` claims, and separated the source link from formation process for apheresis, apocope, syncope, rebracketing, and infixation. It also records source entries that Wiktionary marks as formed through metathesis, even when no source form is given. Across the full export, 316 claims in 315 entries changed; 284 gain normalized `derived_from` claims, while all 316 receive a process value. The export now has 1,054,587 claims with normalized relations. The all-pair candidate matcher remains at 20,354 rows and 406 ambiguous target identities; comparison categories and the database are unchanged. The full suite passes 114 tests. See [the formation-process audit](DATASET_NEXT_STEPS.md#preserve-additional-word-formation-evidence-2026-09-28).
- The next pass preserves 59 clipping links, 42 inflection links, and 722 PIE-word links from three more Wiktionary templates. The full export now has 1,055,410 claims with normalized relations; the all-pair matcher is still exactly 20,354 rows, and the database and comparison categories are unchanged. The full suite passes 115 tests. The PIE template identifies an entry as derived from a PIE word, not necessarily directly; `past participle of` is kept as an inflection link rather than ancestry. See [the template audit](DATASET_NEXT_STEPS.md#retain-clipping-inflection-and-pie-word-links-2026-09-28).
- A further source pass maps 124 same-language `from` claims to `derived_from`, marks 219 entries with an `internationalism` diffusion claim, and records 53 sound-symbolic claims separately from onomatopoeia. The export now has 1,055,534 claims with normalized relations. The 20,354 candidate-to-source-claim match IDs are unchanged; no comparison classifications or database rows changed. The full suite passes 116 tests. See [the source-kind audit](DATASET_NEXT_STEPS.md#preserve-same-language-derivation-and-source-kind-claims-2026-09-28).
- The current `other`-pair source join contains 13,738 exact-case candidate pairs with at least one matching entry-level source claim. The overlapping evidence facets include 6,575 cognate mentions, 4,828 borrowings, 1,832 derivations, 321 calques, and 136 inheritance claims; 102 pairs have more than one claim type. These are not sense-verified subcategories. The match covers 13,738 of 572,981 unique `other` form pairs, and the remainder cannot be treated as unrelated. See [the evidence breakdown](DATASET_NEXT_STEPS.md#source-claims-within-the-other-candidate-bucket-2026-09-28).
- The source export preserves 1,833 `unknown` and 1,652 `uncertain` status markers. They report the entry's source etymology status and can coexist with normalized relation claims in the same source record: 790 of 1,823 `unknown` records and 1,168 of 1,649 `uncertain` records do. They are not pair classifications. A local join links 865 `unknown` and 832 `uncertain` source claims to active candidate entries; 968 and 820 claims respectively have no active candidate in the current join. The linked claims fan out to 4,518 and 4,365 unique candidate pairs across all five current labels, totaling 8,986 active-sense evidence rows. The source-match join remains 20,354 rows; the full suite passes 118 tests. See the [origin-status audit](DATASET_NEXT_STEPS.md#preserve-source-distinction-between-unknown-and-uncertain-origins-2026-09-28) and [candidate crosswalk](DATASET_NEXT_STEPS.md#link-origin-status-claims-to-active-candidates-2026-09-28).
- Swedish *torta* is a new sense-alignment case: its source etymology marks origin unknown and lists cognate Norwegian and Danish forms, while the Bokmål *tort* candidate is a French-derived legal term. This is a useful test of homographs, source language codes, and variants listed outside structured templates; it does not by itself justify changing the selected-sense category. See the [case ledger](DATASET_CASE_REVIEW.md).

These counts describe the current extracted files, not vocabulary coverage or the share of words with any historical relationship. The current `other` category is a candidate-builder remainder, not a linguistic conclusion.

## Next work

### 1. Make the source-to-result path work end to end

The first source-to-result trace for *fleece*, *clown*, *ombudsman*, *bank*, *bankman*, and *sandbank* is in the local case slice. Next, review the mismatches it exposes and make only demonstrated changes:

1. the exact source entry and etymology;
2. the selected sense or component entry, and whether its sense is known;
3. the extracted source claim and its direction;
4. the comparison candidate and computed observations;
5. the pipeline transformation that produced the displayed result.

Record which step loses, merges, or misapplies evidence. Fix demonstrated extraction or identity problems and add a regression example for each one. Do not manually relabel the bulk dataset from this small set.

### 2. Keep building the evidence model from real source structures

First check whether a suspected gap is in extraction or in linking. The cited *fleece*, *clown*, *bank*, and compound examples already have structured borrowing, derivation, or component claims in the source export. The audit now covers all ten language pairs. The component audit shows that exact entry lookup often finds more than one possible component entry, and does not resolve senses. The next gap is linking claims to comparison senses and components without pretending an entry match settles its sense. Keep borrowing, components, and shared roots as distinct paths; preserve raw template evidence.

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
