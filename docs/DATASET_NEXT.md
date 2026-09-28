# What to do next

## Aim

Keep making the data ourselves: source it, extract it, transform it, and inspect what the pipeline did. That is part of the fun and the point of the project. A small result that is useful to one or two people is a good result; this is a weekend project, not a claim to conduct formal linguistic research.

Wiktionary is the main source for the current work, not the definition of the project. Keep its claims and gaps visible. Add another source when a concrete case shows what information or transformation it can contribute. CLDF is fine as an exchange format; it should help someone reuse the data without dictating our internal pipeline.

## Current checkpoint (2026-09-28)

The local source-linked slice now has 13 deliberate case groups, 56 directed comparison candidates, 40 comparison entries, 46 component source entries, 25 pair-claim matches, and 12 shared-component ancestor candidates. It remains a local diagnostic; no live database rows changed.

Four new pairs were selected because the existing component audit found a shared reconstructed ancestor in one component on each side:

| Pair | Legacy label and similarity | What the source entries record | Shared component candidate |
| --- | --- | --- | --- |
| Danish *oversætte* – Swedish *översätta* | `partial_cognate`, 0.713 | Both entries trace the full word through Middle Low German and Old Saxon to Proto-West Germanic `*ubarsattjan`; each also describes a form built with “over” and the equivalent of “set.” | Danish *sætte* and Swedish *sätta*, Proto-Germanic `*satjaną` |
| Danish *ramsløg* – Swedish *ramslök* | `partial_cognate`, 0.342 | Both entries describe compounds; both record the first element through Middle Low German *ramese* and Proto-West Germanic `*hramusō*`. | Danish *løg* and Swedish *lök*, Proto-Germanic `*laukaz`; a second candidate is recorded with language code `gmq-pro` and a runic form, which still needs inspection. |
| German *berauben* – English *bereave* | `partial_cognate`, 0.616 | Both entries trace the complete word to Proto-Germanic `*biraubōną` and describe the prefix *be-* plus a verb. | German *be-* and English *be-*, Proto-Germanic `*bi-` |
| German *Stieftochter* – English *stepdaughter* | `partial_cognate`, 0.494 | Both entries trace the complete word to Proto-Germanic `*steupaduhtēr` and describe a prefix plus “daughter.” | German *stief-* and English *step-*, Proto-West Germanic `*steupa-` |

All four selected senses overlap exactly with the source senses retained for their comparison. The component audit also added Proto-Germanic `*samdaz` candidates for German *Sandbank* and Norwegian Bokmål *sandbanke*. These are pipeline candidates projected from source component records, not independent confirmation of a whole-word classification. The source dump also has separate candidate-generation bases; repeated ancestor forms under those bases are not separate evidence.

The examples show a concrete meaning of the old `partial_cognate` label: the classifier assigns it when roots match and semantic similarity is below 0.75. It does not test whether only part of the word is cognate. The Danish and Swedish *ramsløg/ramslök* glosses both describe ramsons, yet their score is 0.342. That is a useful score/alignment case to investigate, not a reason to relabel this pair by guess.

I re-encoded the selected senses with the current multilingual MiniLM default and the same alignment function. The four scores reproduce within 1.2e-7. For *berauben/bereave*, the unrestricted best gloss pair scores 0.624, while the stored 0.616 uses the English sense linked by source-translation evidence; applying that restriction reproduces the stored value. For *kurv/kurv*, the stored score is 0.749, just below the 0.75 cutoff. No score mismatch appeared in these examples, but the original model revision was not recorded, so the exact historical checkpoint is unverified.

The refreshed CLDF Generic preview has 5 languages, 79 entries, 262 senses, 45 comparison forms, 520 source claims, 30 component links, 12 shared-component ancestor candidates, 28 unordered comparisons, and 25 claim matches. Component candidate resolution is explicit: 27 links resolve all candidate keys to included source entries, one resolves only some, one has no resolved entry, and one has no candidate keys. Shared-ancestor uses link to the included parent and component entries. The exporter checks IDs and declared foreign keys; the official CLDF validator has not been run.

## Next work

### Completed: trace the *fleece* source claim to the comparison

The Swedish and German entries each have a `borrowed_from(en, fleece)` claim. The English entry has its own inheritance chain through Old English to Proto-West Germanic `*fleus`. In the comparison, that root belongs to the English side; it is not evidence that Swedish inherited the root directly. The source claim names an entry and a related form, not a specific target sense. The selected senses are comparison context only.

The CLDF export now records that source scope on `source-claims.csv`. `claim-matches.csv` names its sense IDs `Comparison_Source_Sense_ID` and `Comparison_Target_Sense_ID`, so they are not mistaken for source-attested sense links. This keeps the actual borrowing claim separate from the comparison candidate it matched.

### Completed: find every local target entry for a form-level claim

The case-slice audit scans all five local dumps and retains every exact spelling match, including separate parts of speech and etymology sections. It keeps target-form matching separate from target-sense identity. Exact spelling is only a candidate link; the source claim does not identify one of those senses.

Across 495 distinct form-level claims, 78 resolved to one or more exact target entries, 415 use language codes outside the five local dumps, and two did not occur in the recorded dump snapshot. The audit retained 152 candidate-entry links across 105 unique entries. These are counts within the 13-case slice, not coverage or rates for Wiktionary or any language. There were no case-fold-only results in this slice.

The *fleece* and *clown* claims each reach English noun and verb entries, demonstrating that spelling alone cannot identify a target entry. The Danish *berøve* claim resolves to its local Danish entry. The corresponding Norwegian claim uses Wiktionary code `no`, whereas the local dump is Norwegian Bokmål (`nb`); it is reported as `language_not_indexed`, not as a failed Bokmål lookup. Two missing forms are literal `-` values in source cognate templates; preserve them as source data rather than silently repairing them.

The reproducible local artifact is `pipeline/data/case_claim_target_entries.jsonl`; its manifest records the case-slice and five dump hashes. Rebuild it with:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\audit_case_claim_target_entries.py --force
```

In the 78 exact-form claims, 44 point to one target entry and 34 point to multiple entries (19 to two, five to three, one to four, six to five, and three to seven). A single entry can still contain several senses, so neither count establishes a sense-level relation. A first source-side inspection found that *fleece* noun and verb entries share the same recorded history, *clown* noun and verb entries share the same recorded history, and German *Bank* has two distinct numbered etymologies while the Swedish claim names only the form `Bank`. These are candidate links, not grounds to pick one target sense.

Checking exact reverse language-and-form claims found a match for 29 of the 78 claims: 37 candidate links pair `cognate_mention` with `cognate_mention`, six pair `borrowed_from` with a target-side `cognate_mention`, and seven pair `doublet_of` with `doublet_of`. Twelve of the 29 source claims are attached to component entries. This is a source-internal cross-reference, not 29 independently verified whole-word relationships. The other 49 have no such reverse claim; absence is not counterevidence.

### 1. Audit what supports each exact target link

Review the 78 exact-form claims, starting with multi-entry matches (*fleece*, *clown*, and *bank*). Separate component claims from whole-entry claims. Then assess relation type and direction: a matching language and form is only a lead until the target-side statement actually supports the same historical path. Record whether source wording supports one candidate, several candidates, or only the written form. Keep these as audit outcomes, not public linguistic categories. Do not use the comparison's selected sense as evidence unless Wiktionary links the claim to that sense.

For a source that does not distinguish homographs, preserve all candidates and the unresolved form-level claim. For a unique entry with multiple senses, keep the entry link but leave sense identity unresolved. This review will show whether reciprocal claims add evidence or whether the source genuinely stops at entry/form level; then decide whether CLDF should expose the candidate links as a multivalued relation.

### 2. Fix only a demonstrated loss

If this trace exposes a parser, identity, or linking bug, fix that transformation and add the affected case as a regression. Preserve separate paths: borrowing, inheritance, derivation, calquing, and component formation can coexist in a word’s history. Keep computed similarity and project interpretation separate from source claims. Do not bulk-change classifications from the case slice.

### 3. Make the next data slice reproducible and shareable

Record input hashes, the transformation version, exact command, and model identifier and revision for the comparison build. Keep meaning similarity as an observation; do not let its 0.75 cutoff claim whole-word or partial cognacy. The four component cases reproduce with the current model, but the original model revision was not recorded. Check hashes and references in the rebuilt slice, then export CLDF if it makes that slice easier for someone else to use. Verify attribution and redistribution terms before sharing source-derived content.

### 4. Add another evidence dimension when a case calls for it

The useful dataset can grow beyond lexical history. Keep language genealogy, typological features, and areal/contact evidence as linked but separate dimensions, with their own sources and confidence. Add one when a concrete question or case needs it; do not import a broad catalog just to make the dataset larger. Wiktionary can stay the main source for lexical histories while another source fills a specific gap.

### 5. Keep component work attached to source cases

For the existing compounds, follow each projected ancestor to the exact component entry and its `inherited_from` claim. Keep component senses, source wording, and ancestor claims alongside the parent form. Investigate missing component identities and the runic `gmq-pro` candidate. A shared component root is evidence about part of a word, not by itself a whole-word verdict.

## Guardrails

- Do not treat missing evidence or the current `other` bucket as proof of unrelated origins.
- Do not present candidate counts as the percentage of either language's vocabulary that is cognate.
- Do not infer whole-word history from similar forms, shared components, or a deep root alone.
- Do not build a general ontology or add infrastructure before a real data case needs it.
- Keep generated review data local until checked; do not change live rows during this work.

## Related notes

- [Current data and near-term actions](DATASET_NEXT_ACTIONS.md)
- [Source extraction and audit findings](DATASET_NEXT_STEPS.md)
- [Reviewed example cases](DATASET_CASE_REVIEW.md)
- [Dataset direction](DATASET_PROJECT_DIRECTION.md)
