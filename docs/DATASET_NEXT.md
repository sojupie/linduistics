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

### 1. Trace one real mismatch end to end: *fleece*

Use the English and Swedish entries to test exactly what the current dataset means when it shows a Proto-West Germanic root. Identify which entry, sense, and source claim supplies that root; trace the Swedish borrowing claim separately; then follow both through extraction, comparison matching, and the displayed result. The goal is to find the first step that loses or blurs the distinction between an inherited path and a borrowing path. Keep each path attached to the entry that asserts it. Do not infer that both words inherited the root directly just because the same deep form appears in the comparison view.

Deliver a small rebuilt case slice that lets someone inspect both source histories, the direction of any borrowing, the selected senses, the computed similarity, and the transformation that joined them. If the existing evidence cannot establish a link, represent that limit instead of filling it by assumption.

### 2. Fix only the demonstrated loss

If the trace exposes a parser, identity, or linking bug, fix that transformation and add *fleece* as a regression case. Preserve separate claims and paths: borrowing, inheritance, derivation, calquing, and component formation can coexist in a word’s history. Keep computed similarity and project interpretation separate from source claims. Avoid a mutually exclusive pair label when the evidence supports several relations or does not settle one.

Do not change bulk classifications unless the repaired rule has been checked against the purposeful case slice. Leave unresolved source identity and competing evidence visible.

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
