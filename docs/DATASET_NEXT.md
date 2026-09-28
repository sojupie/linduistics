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

The refreshed CLDF Generic preview has 5 languages, 79 entries, 262 senses, 45 comparison forms, 520 source claims, 30 component links, 12 shared-component ancestor candidates, 28 unordered comparisons, and 25 claim matches. Component candidate resolution is explicit: 27 links resolve all candidate keys to included source entries, one resolves only some, one has no resolved entry, and one has no candidate keys. Shared-ancestor uses link to the included parent and component entries. The exporter checks IDs and declared foreign keys; the official CLDF validator has not been run.

## Next work

### 1. Investigate low semantic scores before touching the labels

Use the exact selected gloss pairs and sense IDs from the case slice to trace how the semantic matcher selected and scored them. Start with *ramsløg/ramslök*, then compare *oversætte/översätta*, *Stieftochter/stepdaughter*, *berauben/bereave*, and the existing *kurv/kurv* case. Separate three questions: did the pipeline align the intended source senses, what did the embedding model score for the selected glosses, and what historical claims are recorded? Fix a demonstrated alignment or scoring problem, and leave the legacy category alone until the evidence says what should replace it.

### 2. Resolve component evidence without overstating it

Follow each projected ancestor to the exact source component entry and its `inherited_from` claim. Keep the component entry’s source wording, sense list, and ancestor claim available alongside the parent compound. Investigate missing component source identities and the runic `gmq-pro` candidate. A shared component root is evidence about a part of each word; it is not by itself a whole-word verdict.

### 3. Make the smallest data-model change the evidence requires

Keep source statements, lexical entry/sense identity, calculated similarity, component formation, and project-derived interpretation separately queryable. Preserve multiple paths, competing evidence, and unknowns. Add a regression case when a reproduced transformation error is fixed. Do not bulk-relabel from this selected slice.

### 4. Keep the export useful and reproducible

Rebuild the ignored JSONL and CLDF preview from recorded inputs, check the hashes and entry references, and retain CLDF only as a shareable format. Before any public release, verify attribution and redistribution terms and document the exact build command, model/configuration versions, and limits of this selected sample.

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
