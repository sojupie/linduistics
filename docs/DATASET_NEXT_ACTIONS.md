# What to do next with the dataset

## Direction

Keep sourcing, extracting, and transforming lexical data ourselves. That work is part of the project. Do not replace it with a finished corpus or let the site’s current endpoints dictate the data model.

A good outcome can be modest: a small public dataset that one or two people find useful because they can inspect where a lexical claim came from and how we transformed it. CLDF is welcome as an exchange format. Use it where it makes the result easier to reuse; keep the working pipeline shaped around the data and evidence we actually collect.

The dataset should preserve different kinds of information separately:

- **Source records and claims:** what a source says, where it says it, and the entry or sense it applies to.
- **Computed observations:** spelling, sound, meaning, and other values calculated by our pipeline.
- **Our interpretations:** judgments we make from the evidence, including uncertainty and multiple possible paths.

One word pair may have more than one path. A source’s claim is evidence to preserve, not automatic proof of the full historical relationship. Missing evidence stays missing; it does not mean “unrelated.”

## Current milestone: make the case slice trustworthy and reusable

The project now has a source-claim extraction pipeline, bounded case audits, and a tracked CLDF Generic release candidate. That is a useful working result, not yet a validated public release: some source claims still need exact entry/sense resolution, the official CLDF validator has not run, and redistribution needs an entry-level source-material check. Continue sourcing and transforming data; do not replace the work with a finished corpus or rebuild the whole dataset.

The next result should be a small, rerunnable slice that demonstrates the project's own transformation work. It can be useful to only a few people and still be worth sharing. CLDF is an output option for that slice, not a new project or a requirement to remodel the pipeline.

### Work in this order

1. **Close the small source-evidence ledger.** Use the cases in [the case review](DATASET_CASE_REVIEW.md): *blive* for source revision drift, *fleece* and *clown* for borrowing and origin uncertainty, *bankman* and *sandbank* for compounds, *bank* for multiple etymologies, *væg/väg* for a misleading form match, and *ombudsman* for several paths across varieties. Keep each page revision, source section, directed claim, and pair review linked. Record unavailable revisions explicitly. Preserve older and newer source states side by side.
2. **Trace claims through the existing transformation.** For each selected comparison, retain source entry and sense identity, raw source claim and target, normalized relation, all plausible target-entry candidates, computed similarity values, and any project interpretation as separate records. Mark a link exact, ambiguous, entry-level only, missing, or not checked. A component or related-word claim must not silently become a claim about the complete pair.
3. **Fix only a reproduced loss.** Pick one failure visible in the ledger, reproduce it from the recorded input, correct the earliest failing extraction or identity step, and add one regression check from that source case. Rebuild the affected slice and verify the change. Do not bulk-change pair labels from a small, selected audit.
4. **Check whether the export is useful outside this repo.** Regenerate the CLDF candidate from documented inputs, run the official CLDF validator, check IDs and links, and confirm that a reader can find the source and transformation for each row. Review source licensing for the exact exported fields; do not include copied prose or material with unclear reuse terms. Keep the CLDF export if it makes the slice easier to inspect or reuse; it is a format choice, not an internal architecture requirement.
5. **Expand only in response to a concrete gap.** If a case needs another dictionary or language-level genealogy, typology, or contact fact, state the question first and capture that source separately. Do not add sources to make the dataset look authoritative or to force certainty where sources disagree.

### Done means

A small, clearly non-representative version lets someone follow selected results from pinned or fingerprinted source records through extraction and transformation to computed observations and project interpretations, then rerun the build. It preserves at least one ambiguous or missing link and one changed source state. It states its limits, makes no vocabulary-wide cognate-rate claim, and can be shared under documented source terms. Once that works, grow the dataset through similarly testable cases.

### Existing source seed

[`datasets/source-evidence/`](../datasets/source-evidence/README.md) contains 19 pinned pages, 51 structured assertions, and ten pair reviews linked to the CLDF slice. Its `torta-tort` source note includes three linked botanical and dictionary observations, but the comparison has not yet been added to the CLDF slice. The English section of the pinned `tort` revision explicitly lists Bokmål *tort* as a cognate and records the English root; the ledger attaches that root only to English. A new `dygn` case records Swedish source claims to Danish and Bokmål alongside different recorded root forms; both comparison candidates are currently labeled `other`. The `clown` entries give a source-backed borrowing path in four languages even though all four current candidates remain `other`; the source claims are entry-level, while the selected comparison senses are linked separately. The *ombudsman* crosswalk exposed two possible Bokmål source-sense IDs for one selected gloss. The case builder and CLDF exporter now preserve both candidate IDs and link them to the included Bokmål entry and senses, while leaving the identity ambiguous. The case set is intentionally selected to test the transformation, not to estimate language-wide proportions. The linked CSVs omit copied entry prose. Keep their counts and coverage notes synchronized as the seed grows.

## Immediate next pass

Carry the newly documented *torta/tort* mismatch through the existing evidence-to-export path before widening the sample:

1. The source-origin match artifact contains the exact-form Swedish *torta* / Bokmål *tort* candidate with both selected source senses. The current `dercat_fix` source-claim match input also contains English *tort* / Bokmål *tort*, including the English cognate mention and its selected target sense. Both comparisons now route into the `torta_tort` case group. Regenerate the slice to verify the Swedish/Bokmål row is present in the same current comparison input; if absent, record the artifact/version boundary rather than manufacturing a comparison.
2. Preserve the different scopes of the evidence: Swedish *torta* mentions a Norwegian *tort* without identifying a variety, while the current Bokmål *tort* entry describes a French-derived legal term. The plant-name evidence makes a regional-name explanation plausible, but does not identify the cited Norwegian form as that plant name. Keep the pair unresolved unless a source links those forms.
3. Record how each normalized claim was obtained (for example, entry prose or a parsed template) and where it appears on the source page. Blank provenance on older rows means it has not been recorded; it does not mean the claim came from a particular method.
4. Rebuild just the bounded slice, check its IDs and links, and run the CLDF validator. Keep the export only if a reader can use it to follow records and claims outside the application. If the local Python environment prevents the rebuild, capture that as an execution issue rather than hand-editing generated output.
5. Pick the next demonstrated extraction or identity loss from the case ledger, fix it at the earliest failing step, and add one focused regression check. Then rerun the same slice to see whether the transformation improved.

After the tort slice is rebuilt, include the new *dygn/døgn* comparison group in the same export. It provides a second test: an explicit cognate source claim plus variant Proto-Germanic root forms across exact, sense-aligned candidates. Keep the chain and root-variant claim distinct rather than normalizing the roots by spelling.

This pass is complete when the *torta/tort* and *dygn/døgn* cases are traceably represented in the slice, the slice can be rebuilt and validated, and one concrete pipeline behavior has a source-backed check. That is a useful next increment; it does not require resolving every etymology or reclassifying the full candidate table.

### Current execution note

The exact-form candidate has been found in `source_origin_status_matches.jsonl`, and `build_case_evidence_slice.py` now routes it to `torta_tort`. A standard-library check confirms the case lookup handles both input directions and case. The checked-in CLDF slice has not been rebuilt. The repository virtual environment targets Python 3.13.14 through a Windows Store alias that currently cannot launch; the available bundled Python is 3.12.14, but the installed PyArrow extension is built for CPython 3.13. The full Parquet-backed builder and exporter therefore remain unverified until a compatible Python/PyArrow runtime is available. Do not hand-edit generated CLDF tables to stand in for that rebuild.

## Current state

- The pipeline covers Danish, German, English, Norwegian Bokmål, and Swedish Wiktionary-derived data.
- The local source export keeps source-entry identity, source senses, raw etymology templates and arguments, and normalized claims. It contains 710,110 source records and 1,148,705 claim records.
- A compact local slice contains 5,446 source-backed named-after, coined-by, coinage, and onomatopoeic facts. Each has a stable ID and source URL; it omits full etymology prose.
- A separate 270-case audit keeps comparison senses, source claims, and their evidence links available for inspection. It is diagnostic, not representative.
- Fresh per-language lemma tables are now built for all five local dumps. All 1,060,087 active sense records have source-entry and source-sense IDs; 222,272 senses have an extracted etymological root.
- The current working comparison artifact contains 1,638,454 directed candidate rows across the 10 language pairs. Its `semantic_sim` field now contains the embedding result rather than a fixed 0.95 floor for Wiktionary translation candidates. Its root relation counts are 24,872 rows with equal extracted roots and 1,613,582 unknown. The candidate category counts changed; see the [score-separation audit](DATASET_NEXT_STEPS.md#separate-source-translation-evidence-from-embedding-scores-2026-09-28). These are candidate-build counts, not vocabulary-wide percentages.
- A separate parser-corrected snapshot now ignores Wiktionary's `dercat` language-code list during root extraction. It retains 720,407 lemma rows, removes 223 malformed root values, and changes 275 root fields. Across the same 1,638,454 comparison rows, equal-root relations move from 24,872 to 24,948; 108 directed rows change origin relation across 54 pairs. The source-claim crosswalk retains all 20,188 match IDs, but 36 evidence rows across 27 pairs point to different candidate labels. This snapshot remains a local diagnostic; see the [`dercat` audit](DATASET_NEXT_STEPS.md#ignore-dercat-language-lists-during-root-extraction-2026-09-28).
- The changed pairs also expose an independent taxonomy issue: Norwegian Bokmål *kurv* is explicitly borrowed from Danish *kurv*, yet shared Proto-West Germanic `*korb` yields `etymological_relation: cognate`; the display category becomes `partial_cognate` because the aligned senses score just below a semantic threshold. Borrowing path, common ancestor, sense match, and whole-word cognacy need to remain separately queryable.
- The local case slice now covers 15 deliberate groups and 60 directed comparison rows, with 83 unique source entries, 273 source senses, 26 pair-claim matches, 15 component links, and 12 shared-component ancestor candidates. It includes two useful `false_friend` contrasts: the local Danish–Bokmål *blive/blive* snapshot has a direct Danish claim that differs from the current Wiktionary page; Danish–Swedish *væg/väg* has no direct pair claim, while the Danish cognate claim resolves to Swedish *vägg*. These show why the comparison pattern cannot stand in for the historical relationship and why source version belongs in the evidence record.
- The refreshed CLDF slice contains 5 languages, 179 entries, 677 senses, 49 forms, 1,586 source-claim rows from 1,492 template occurrences, 1,395 normalized relation targets, 35 component links, 12 shared-component ancestor candidates, 30 comparisons, and 26 claim matches. It has 524 deduplicated target-form resolutions, 187 candidate-entry links, and 60 exact return-mention cross-references. The source lookup found 104 exact spellings, 465 language codes outside the five dumps, and two spellings not found; its 201 candidate-entry links include 129 unique entries. The cross-references are links among Wiktionary claims, not independent confirmations or unique pair verdicts. Generated intermediate files remain local; the linked CLDF candidate is tracked.
- The exporter checks stable IDs and foreign keys, including that every normalized relation target is referenced by at least one expanded source claim. The generated slice has no orphan or missing relation-target references. It remains a diagnostic, not a representative sample; the official CLDF validator has not been run, and public redistribution still needs a license review. The multi-target correction is documented in the [source-claim audit](DATASET_NEXT_STEPS.md#preserve-multi-target-template-claims-2026-09-28).
- In the earlier 13-case cross-tab, seven `borrowed_from` claims matched pairs labeled `other`; five `cognate_mention` claims matched `other` pairs, one with an ambiguous target identity. Borrowing claims also occurred under `partial_cognate` and `true_cognate`. This was a small diagnostic snapshot; the claims are entry-linked evidence, not pair verdicts.
- The classifier’s `partial_cognate` output is produced by `semantic_sim < 0.75` after an equal-root match; it does not check partial component correspondence. The corrected full snapshot contains 9,270 directed rows (4,635 unordered pairs) with that label, all below the threshold. Seven pairs in the expanded case slice receive it, including Danish–Swedish *ramsløg/ramslök*, whose selected glosses both describe ramsons but score 0.342. Treat the label as legacy output and inspect sense alignment and gloss scoring before changing its meaning.
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

This is a small data-engineering project, not a research program. The next goal is a compact result that another curious person can inspect and rerun—not expert adjudication of every word or a new general-purpose platform.

### 1. Finish the current source-to-comparison audit

Use cases already in the audit: *bank/bankman*, *sandbank*, *fleece*, *clown*, and *ombudsman*, plus cases that test shared ancestry, compounds, and misleading similarity. Carry each through the same path:

1. source entry and relevant sense, or an explicit note that the source does not identify a sense;
2. source wording/template and its directed claim;
3. target-entry candidates, retaining homographs and ambiguity;
4. computed observations such as form, sound, and meaning similarity;
5. any project interpretation, with the evidence and rule that produced it.

The expanded claim IDs now preserve multiple targets from one Wiktionary template occurrence, and the exporter checks that every normalized relation target is referenced. A first structural pass over the 57 exact return-mention rows found that the *væg/väg* links resolve to *vägg* and *way*, while English *bank* includes same-language doublet links that are not evidence for a cross-language pair. The Bokmål *blive* entry's local snapshot matches older page text: Wiktionary changed its claim in a 2026-09-05 revision to a Middle Norwegian path and an explicit cognate mention of Danish. A check against Bokmålsordboka and NAOB separately supports a Low German source and the sea-drowning sense, but not a direct Danish source path; Bokmålsordboka also does not mark the headword dialectal as Wiktionary does. Next make source version inspectable for reviewed entries: preserve available Wiktionary revision IDs (or explicitly mark them unavailable), compare local snapshots against pinned revisions, and retain differences as separate sourced observations. Keep every target candidate; a spelling match or reciprocal mention does not establish a sense-level relation. Fix only a loss reproduced by these cases and add it as a regression.

**Deliverable:** a short evidence ledger that traces each selected comparison from source entry and source wording through normalized claims, target candidates, computed observations, and any project interpretation. Mark absent or ambiguous links explicitly. Do not turn the deliberately selected cases into rates or bulk classification rules.

### 2. Make the data model preserve scope and multiple paths

Keep different questions in different records instead of squeezing them into one mutually exclusive pair label:

- language-level genealogy, typology, and area/contact facts;
- lexical entries, senses, forms, and components;
- sourced historical paths such as inheritance, borrowing, derivation, calquing, and compound formation;
- computed similarity and translation observations;
- project interpretations, including a cognacy scale when evidence supports one.

A word pair can have several paths at once. A modern loan may also share a deeper ancestor with its donor, and a compound may contain cognate components without the whole compound being inherited as a unit. Keep these relations queryable independently. Treat `other` as a legacy candidate-builder result, not a relationship; split it only when the evidence supports a more specific path. Missing or ambiguous evidence remains unresolved.

The dimensions are not substitutes for one another: language genealogy, typology, and area/contact describe different language-level facts; lexical claims describe particular forms, entries, etymologies, senses, or components; computed similarities describe observations; and a cognacy scale is a project interpretation of lexical evidence. Keep these linked but distinct. Do not build a complete linguistic ontology now. Add only the scope distinction or relationship needed to preserve a source fact demonstrated by the audit. `other` remains a legacy candidate-builder remainder, not a category in the data model.

### 3. Publish a small, reproducible data slice

Release a deliberately chosen, clearly non-representative slice. It should let a reader trace a comparison from source records through transformations to computed observations and any project interpretation. Include stable identifiers, source links, input versions or hashes where available, transformation version, a rebuild command, and notes about unresolved links and limits. Do not present case counts as vocabulary percentages.

Keep the existing pipeline and convenient working files. Use CLDF as an exchange format if its linked tables help another person reuse the slice; it is just a format choice, not a project redesign. Do not publish raw dumps or copied source prose until attribution and redistribution terms are checked. A first release can be a few inspectable, source-linked cases with stable IDs, source URLs, input/version hashes, transformation steps, computed values, and unresolved evidence clearly marked.

### 4. Expand by following a real gap

Wiktionary remains the primary source for now because sourcing and transforming it is part of the project. When a case reveals a specific gap—such as a missing language identifier, unclear sense alignment, or a borrowing path that needs another account—find a source that can answer that question and preserve its evidence separately. Add genealogy, typology, or areal/contact data only when it supports a useful question about languages; do not mix it into lexical-history judgments.

Do not add a second source just to make the dataset look authoritative. First name the gap in a concrete record, then check whether another source actually supplies the missing fact. A source may offer another claim rather than a verdict; preserve disagreement instead of silently choosing one.

## A useful first release

Someone should be able to pick a result and:

1. identify the source entry and sense used;
2. inspect the source claim, direction, and evidence;
3. distinguish source assertions from computed values and our interpretation;
4. see multiple paths, missing links, and uncertainty without a forced one-box label;
5. rerun the transformation on the documented local inputs.

That is enough for a useful public artifact, even if only a few people use it. It does not need complete language coverage, expert review of every row, a new data platform, or a claim about the proportion of either language’s vocabulary that is cognate.

## Defer

- Reclassifying every current comparison before the source-to-result path is traceable.
- Treating pair-candidate counts as vocabulary-wide rates.
- Treating Wiktionary’s coverage or categories as the limits of the project.
- Importing broad genealogy or typology data without a question the project will answer with it.
- Building a general-purpose ontology or forcing CLDF to become the internal data model.
- Adding sources solely to make the dataset look larger.

## Stage complete when

- The selected examples can be traced from source entry and sense through extraction and transformation to the result.
- Demonstrated loss or identity bugs have regression checks.
- Claims, observations, and interpretations remain distinguishable, including uncertainty and multiple paths.
- A small slice can be rebuilt and inspected from documented local inputs.
- A CLDF export has been tried and retained only if it helps another person use the slice.
