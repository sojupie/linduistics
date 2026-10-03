# E4: reconsidering prefix removal

**Revised decision: withdraw the automatic rejection based on fixed-classifier
agreement. Candidate-quality improvement remains inconclusive, with measured
vocabulary losses and a mixed diagnostic result.** Unconditional removal is not
approved for publication, but the old proxy failure is not a reason to exclude
it from further task-specific evaluation.

## What changed in the decision

The original [E4-A002 report](E4_RUN_A002.md), criterion and observations are
unchanged. Removing prefixes loses nine independently expected comparisons.
Fixed-classifier agreement falls from 80/197 (40.6%) to 45/128 (35.2%). The
five-point improvement requirement was an internal choice.

That percentage measures agreement between unchanged labels and source-guided
agent meaning reviews. A retained comparison's label does not change. The lower
share can result from retaining meaningful comparisons with wrong labels while
removing disjoint comparisons that the classifier labels correctly. It cannot
by itself establish lower candidate quality.

The revised [adoption policy](ADOPTION_CRITERIA_V2.md) was committed as `e31534b`.
The [reassessment plan](E4_REASSESSMENT_PLAN.md) and profile groups were committed
as `efaf059` before calculating the new counts. This is an explicitly post-result
development reassessment, not a claim of a new blinded or independent experiment.

## Independent vocabulary and historical spot test

IE-CoR supplies the independently selected expected concept pairs and positive
expert cognacy annotations. It is a limited basic-vocabulary reference, not a
complete dictionary or a reference for all modern senses and false friends.

| Development reference | Expected | Control found | Prefix removal found | Lost |
| --- | ---: | ---: | ---: | ---: |
| All expected concept pairs | 1,168 | 995 | 986 | 9 |
| Same expert cognate set | 753 | 662 | 653 | 9 |
| Different expert sets | 415 | 333 | 333 | 0 |

All nine losses are independently annotated same-set cognates: near, red, snow,
tongue, water, come, green and two hear comparisons. Same-set recall falls from
87.9% to 86.7%, a 1.20-point loss. Overall expected-pair recall falls 0.77 points.
These losses matter even if the starting dataset displays or labels them badly.
Three lost comparisons had suitable baseline displays, four had wrong displays,
and two had unresolved displays. Retrieval and display are separate outcomes.

Different expert sets are not proof of independent origins. These counts do not
measure false historical links, modern full sense overlap or false-friend
classification. The historical support is at the annotated concept/form level;
it does not justify transferring that relationship to another homographic entry.

## Broader diagnostic comparison, independent of classifier labels

All 207 original development open cases are included. Their source-guided meaning
judgments are unchanged. The sample was stratified by language pair and category;
these counts cannot establish population precision or learner usefulness.

| Source-review support group | Removed cases | Removed labels disagree | Retained cases | Retained labels disagree |
| --- | ---: | ---: | ---: | ---: |
| Meaning overlap | 6 | 1 | 105 | 71 |
| Related grammar or concepts | 15 | 15 | 4 | 3 |
| Verified entity or recorded/related name forms | 2 | 2 | 4 | 3 |
| Different entities | 4 | 4 | 1 | 0 |
| Unverified names | 4 | 4 | 0 | 0 |
| Disjoint observed meanings | 33 | 7 | 7 | 4 |
| Inactive or historical-only support | 5 | 1 | 7 | 2 |
| Unresolved meanings or forwarding entries | 2 | Not scored | 8 | Not scored |
| Total | 71 | 34 plus 2 unresolved | 136 | 83 plus 8 unresolved |

The main distinction is now visible: **71 retained meaning-overlap comparisons
have incompatible fixed labels**. Those are supported comparisons needing better
labels, not 71 demonstrated bad candidates. Prefix removal also discards 23
overlap, related-form or name-form comparisons, 18 of which have incompatible
labels. Those cases illustrate how the old measure confounded candidate support
with classifier correctness. The support groups do not imply that every member
is an unrestricted modern translation or independently verified historical link.

The six removed meaning-overlap cases are `misvisende/missvisande`,
`hallo/halloj`, `stimuli/stimulus`, `diskursiv/discursive`, `Franse/frans` and
`bar/bare`. Some overlap is contextual, colloquial or secondary. These limits
are retained in each case reason. Related-form losses include adjective/adverb
`mystisk/mystiskt`, action/agent `sende/sender`, and noun/verb `ansvar/ansvara`.
They can serve grammar or word-family comparisons even when they should not be
presented as interchangeable translations.

## What the removed and retained disjoint cases show

Disjoint meanings are not automatically bad candidates. Removed `logik/logi`
and `fond/font` are plausible deceptive-form contrasts. Removed `ball/balle`
has recorded shared ancestry and different current meanings. Removed
`malme/malm` also has a recorded historical connection. These contrasts can be
useful; the source review does not measure actual learner confusion.

Other removed comparisons have weak support for equivalent meaning or whole-
word family tasks. `sommerhus/sommerfugl` shares a summer component, and
`underlag/underdog` shares an under-like component. Neither establishes complete
word equivalence or ancestry. Technical and name/common-word contrasts carry
additional task restrictions. Removing such matches may reduce noise for a
particular task, but it does not prove that every surface-contrast use is invalid.

Poor comparisons also survive prefix removal. Retained `Obersattel/mutter`
joins different objects through the polysemous English word nut. Retained
`verletzen/invadera` associates injury with invasion without observed meaning
overlap or deceptive form. Retained `gen/gen` selects Danish gene against the
dated German directional entry instead of the capitalized German noun Gen.
These illustrate translation-bridge and entry-identity errors that disabling
prefixes cannot fix.

Every disjoint case has a specific saved support assessment. Original meaning
reasons, label agreement and removed/retained membership remain visible for
every case in [the complete case account](e4-reassessment002/CASES.md). These
assessments reuse source evidence; they are not independent human gold labels.

## Adoption implication and concrete next measurement

The evidence supports a trade-off, not an automatic pass or rejection:
prefix removal discards many contrasts and weak associations, but also loses
independent cognate positives and supported overlap or related forms. It leaves
substantial classifier, display and translation-bridge errors unresolved.

Before adopting a candidate-channel policy, test its intended tasks directly.
Use a new frozen sample drawn independently of the current categories from
removed and retained rows, with recorded inclusion probabilities. Review source
support, ordinary headline quality, historical assertions and definition/game
eligibility separately. Report the nine known losses and any recovered ones.
Do not optimize against reserved-family results. A selective prefix policy or
combination with phonetic retrieval needs its own plan before tuning.

This further measurement belongs in final candidate evaluation under the revised
policy. It is no longer justified to reject the method solely because the
unchanged classifier's agreement share falls. It is also not justified to adopt
it solely because the table is smaller or this diagnostic sample has more
meaning-overlap cases among retained rows.

## Reproduction

Run `pipeline\.venv\Scripts\python.exe -X utf8 pipeline/evaluation/e4_reassess.py
--output <new-directory>`. Input, code, plan and policy hashes are saved in the
protocol. Runs 002 and 003 produced byte-identical group and case results. Run
001 preserved the initial group calculation before the individual disjoint-case
support assessments were expanded; original meaning judgments never changed.
No production pipeline, label, candidate output or live database changed.
