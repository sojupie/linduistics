# E5: complete Icelandic development review

**Status: all six development meaning reviews complete. No release decision yet.**
The old transfer criteria remain recorded, but adoption now follows
`ADOPTION_CRITERIA_V2.md`. Differences from the starting dataset do not by
themselves reject a language or an improvement.

## Independently expected retrieval and displayed meanings

| Pair | Expected pairs | Retrieved | Suitable displays | Wrong displays | Missing | Missing with both source headwords |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Danish–Icelandic | 117 | 84 | 73 | 11 | 33 | 23 |
| German–Icelandic | 119 | 87 | 71 | 16 | 32 | 23 |
| English–Icelandic | 118 | 80 | 54 | 26 | 38 | 29 |
| Icelandic–Norwegian | 118 | 83 | 73 | 10 | 35 | 25 |
| Icelandic–Dutch | 119 | 89 | 82 | 7 | 30 | 22 |
| Icelandic–Swedish | 120 | 87 | 71 | 16 | 33 | 24 |
| Total reference comparisons | 711 | 510 | 424 | 86 | 201 | 146 |

IE-CoR supplies independently selected concept forms and definitions. Exact
reference matching uses the frozen normalization and spelling policy. These
are counts over this basic-vocabulary reference panel, not vocabulary-wide
coverage. Missing phrases and spelling/form mapping issues remain distinct from
missing accepted headwords. The source-presence check does not yet locate the
specific candidate-generation or filtering step responsible for each miss.

The 146 missing comparisons with both accepted headwords cannot be explained by
dictionary absence. This includes ordinary nouns and verbs across the six pairs.
That is a concrete retrieval limitation regardless of the old-language comparator.

The 424 suitable displays are agent judgments checked against independent concept
definitions. They are not independent human annotations. Every reviewed case
and reason is saved, including uncertain wording and grammatical scope. Broader
or narrower ordinary instances, such as nape for neck or incisor for tooth, are
accepted where they still describe the intended concept. Metaphors, homographic
objects, unrelated parts of speech and generic grouping glosses are distinguished.

## Broader modern meaning and label review

| Pair | Compatible fixed labels / scorable cases | Unresolved |
| --- | ---: | ---: |
| Danish–Icelandic | 17/33 | 1 |
| German–Icelandic | 11/33 | 1 |
| English–Icelandic | 7/32 | 1 |
| Icelandic–Norwegian | 13/33 | 1 |
| Icelandic–Dutch | 14/34 | 1 |
| Icelandic–Swedish | 15/30 | 2 |

These use reproducible category-stratified samples and the unchanged E2 meaning
mapping. They measure agreement with source-guided meaning reviews, not overall
candidate usefulness or population accuracy. Shared secondary meanings can make
a comparison useful despite a bad display or label. Different meanings can make
a useful deceptive-form comparison; they do not automatically make a bad candidate.

The inventories show both full and partial overlap, grammatical relations,
historical-only overlap and name-identity issues. The unresolved cases include
terse specialist glosses, redirects and untranslated phrase descriptions.
None was counted as correct. Historical relationship remains a separate claim;
these modern-meaning judgments do not validate all cognacy or false-friend labels.

## Systematic display failures

The new reviews reproduce shared selection problems rather than new word-specific
exceptions. Norwegian–Icelandic selects an artificial satellite for moon, a tooth
root for plant root, and a computer bug for louse. Dutch–Icelandic selects a
mathematical root, a celebrity star and research for digging. Swedish–Icelandic
selects religious heaven, a shoe tongue, a female breast for thorax, and explicitly
figurative fighting for physical conflict. Correct ordinary senses remain in
the inventories. Improving retrieval alone would not fix these choices.

The Dutch pair has 82 suitable displays among 89 found comparisons, but still
misses 30 independent expected pairs. English has only 54 suitable displays
among 80 found. These are different failures requiring separate treatment.

## Family uncertainty for the last three pairs

The earlier Danish, German and English intervals remain in
`E5_ICELANDIC_BUILD_RESULT.md`. All intervals resample families 2,000 times with
seed 20261003. Old and new cohorts have separate intervals; there is no paired
gain estimate. This measures family sampling variation, not reviewer correctness.

| Pair | Retrieval, 95% interval | Suitable display among found | Suitable display among all expected |
| --- | --- | --- | --- |
| Icelandic–Norwegian | 62.1–78.6% | 80.5–94.5% | 52.9–71.1% |
| Icelandic–Dutch | 66.1–83.2% | 86.2–97.6% | 60.0–77.5% |
| Icelandic–Swedish | 64.0–80.3% | 72.6–89.7% | 50.0–68.3% |

## Decision and remaining experiments

Do not infer automatic rejection from the six failed old transfer limits.
The independent reference establishes useful recovered vocabulary as well as
substantial misses; the reviews establish display and modern-label limitations.
The adoption decision needs intended-task evidence and explicit trade-offs.

Next, evaluate historical claims against the limited expert-cognacy reference
and source-scoped evidence separately from meaning labels. Finish task-specific
game checks, assembled old-row preservation and reserved-family/product checks.
For E4, carry forward the revised candidate-support reassessment and planned
representative task-quality check. Keep the methods frozen before reserved tests.

All judgments and readable case reasons are in the six `e5-*-is-review001`
directories. `e5-icelandic-transfer002` records all six separate family intervals,
missing-source diagnoses and review hashes. Its protocol marks all pair reviews
complete. The 001 result remains the earlier three-pair snapshot. Reproduce with
`e5_transfer.py --language is --output <new-directory>`.

No production pipeline, live database or language-selection UI changed.
