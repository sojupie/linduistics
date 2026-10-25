# Which dataset experiments are worth pursuing?

Date: 2026-10-04.

This is a recommendation for the next round of work, not approval to publish
any tested implementation. It assumes we have a decent way to verify correctness.
The purpose is to choose changes worth testing, rather than build another
evaluation system before trying them.

The reproduced five-language dataset is the starting point. Improving it can
change its behavior and labels. Success means better retrieval, displayed
meanings, historical claims or modern meaning labels, with explicit trade-offs.
Agreement with the starting dataset is not the target.

## Recommended order

**Update, 2026-10-14:** the [sense-scope follow-up](../pipeline/evaluation/E2_SCOPE_RESULT.md)
rejects a hard source-gloss similarity veto after reviewing its losses. Its
conflict-only revision retains inference and gives a small exploratory gain.
Keep that revision for wider testing; move entry/grammar-aware display selection
forward next. The new pilot exposed substantial headline problems within its
restricted frame. Broader family assignment is required before dataset-wide
quality estimates. The earlier hypotheses and results below remain unchanged.

| Priority | Direction | My judgment |
| --- | --- | --- |
| 1 | E2: dictionary evidence tied to the meanings being compared | Strongest measured lead; pursue first |
| 2 | E1: choose the displayed meaning separately from the strongest similarity match | Clear recurring need; pursue alongside E2, with separate measurements |
| 3 | E4: recover missing expected pairs and select candidates using several signals | Worth pursuing; diagnose the misses before choosing the next retrieval rule |
| 4 | E3: historical evidence with correct subject, entry and qualification | Useful, especially for historical labels and family games; narrower claims need better extraction |
| 5 | E5: carry the improved methods into Dutch and Icelandic | Worth continuing as a test of generalization; more languages alone will not repair the shared methods |

The separation of history, meaning and resemblance remains worth keeping across
all these experiments. It lets us distinguish a good comparison with a bad label
from a bad comparison, and an ordinary translation from a historical relative.

## 1. E2: use dictionary evidence for the actual meanings

**Why it remains promising.** Dictionary evidence gave the largest measured
classification improvement: 169/197 compatible labels, versus 80/197 for the
existing classifier, 118/197 for the revised similarity method, and 114/197 for
always predicting partial overlap. These are development results against
source-guided agent reviews, not accuracy across the whole dataset.

The remaining failures have identifiable causes. A shared English translation
can refer to different objects. A recorded translation can apply to another
sense, an inactive use, or a different part of speech. These problems do not
disprove dictionary evidence as a useful signal.

**Next hypothesis.** Checking the meaning, entry, grammar and usage on both sides
will retain much of the gain while reducing false equivalences.

**Test next.** Compare the existing dictionary-evidence method with a version
that links evidence to specific sense records. Keep candidates, displayed senses
and the semantic model fixed. Preserve useful narrower or secondary overlap;
different parts of speech can justify a related-form label without justifying
equivalent meaning. Treat absent translations as missing evidence, not proof of
different meanings. Keep a similarity-based inference path for such cases.

**What would justify keeping it.** Fewer incorrect equivalence claims, with
useful modern overlap still found outside the cases with explicit translations.
Report losses as well as repaired cases. If stricter checks merely replace
reasonable inferred labels with warnings or unclassified output, the change has
not met the intended goal.

**What would weaken the case.** The gains disappear on unseen cases, or checking
the sense removes most useful evidence without reducing the known error types.

Evidence: [E2 dictionary-evidence result](../pipeline/evaluation/E2_RUN002.md).

## 2. E1: select a useful headline without losing secondary matches

**Why it remains promising.** The correct ordinary sense often exists in the
inventory. The selector instead displays a metaphor, technical use, homograph,
name or different grammatical use. E5 reproduced this problem in new languages.

The weak dictionary-order preference repaired 22 concept comparisons without
losing a previously suitable concept display. Its broader result was mixed:
it fixed one shared headline and broke another. The small gain remains worth
considering under the revised adoption policy; missing an internal five-point
threshold is not evidence that the gain has no value.

**Next hypothesis.** Selecting the appropriate entry and grammatical use before
ranking its senses will outperform simply preferring an early sense somewhere
among all entries. Supported current translations can help choose the headline,
while source order and usage tags supply weaker preferences.

**Test next.** First compare that entry-aware selection with the current selector
and the tested order preference. Keep the label rules and generated pairs fixed.
Distinguish a headline suitable for a particular benchmark concept from a useful
default headline in the lexicon. A valid secondary match can remain available
without being the default display.

**What would justify keeping it.** More suitable ordinary displays and fewer
entry/grammar mismatches, with secondary matches preserved and readable. A small
verified gain may warrant adoption if its losses are acceptable and explicit.

**What would weaken the case.** The selector only succeeds when told the benchmark
concept, or improves familiar words by suppressing valid specialist and secondary
senses. Do not hard-code the benchmark concept into ordinary product selection.

Evidence: [E1 display result](../pipeline/evaluation/E1_RUN003.md),
[E5 display failures](../pipeline/evaluation/E5_ICELANDIC_DEVELOPMENT_RESULT.md).

## 3. E4: improve retrieval without throwing away useful contrasts

**Why it remains promising.** We miss expected comparisons even when both
headwords are already present. That occurred for 51 Dutch comparisons and 146
Icelandic comparisons in the development panels. Pronunciation retrieval also
recovered expected pairs missed by the original generator.

**Next hypothesis.** A combination of translation, spelling and pronunciation
evidence can recover useful pairs more reliably than prefix matching alone or
the tested broad sound search. Candidate generation and candidate ranking may
need different rules for translations and deceptive-form comparisons.

**Test next, in two steps.**

1. Trace source-present misses through the actual stages: entry/form lookup,
   translation mining, candidate generation, filtering and retrieval limits.
   Record where each disappears. That diagnosis should determine whether the
   next change fixes identity handling, mining coverage, filtering or retrieval.
2. Test the smallest justified change, then compare candidate channels separately
   and together. Assess removed and retained comparisons independently of their
   classifier labels. Use pronunciation provenance, grammatical compatibility
   and complete-word evidence as testable signals, not automatic reasons to
   erase words from the lexicon.

**Prefix removal remains a hypothesis, not a settled answer.** The original
removal loses nine independently expected cognate comparisons. Its apparent
usefulness decline was confounded by unchanged wrong labels. A selective policy
that reduces weak prefix associations while retaining supported translations,
related forms and useful contrasts is worth testing. It needs a new plan and a
representative sample; the existing diagnostic sample does not prove its benefit.

**Pronunciation retrieval deserves a revised test.** The unlearned arm recovered
nine expected pairs and the learned arm eight. In the 60-case sample of additions,
43 were weak matches and 17 were potential or restricted pronunciation traps;
none had supported modern meaning overlap. Some traps may serve false-friend
tasks, but sound resemblance alone does not establish that. The simple learned
substitution rule has not earned preference over the unlearned control.

**What would justify keeping a change.** More independently expected or otherwise
supported comparisons, with a measured and acceptable cost in weak additions,
lost comparisons and runtime. Better retrieval must not claim credit for display
or classification improvements that it did not make.

**What would weaken the case.** Larger shortlists or looser thresholds mainly add
weak comparisons, or candidate removal discards useful pairs without a demonstrated
task benefit. A smaller table alone is not improvement.

Evidence: [E4 prefix reassessment](../pipeline/evaluation/E4_REASSESSMENT_RESULT.md),
[pronunciation retrieval](../pipeline/evaluation/E4_RUN_B001.md).

## 4. E3: recover historical evidence without overstating it

**Why it remains promising.** Typed inheritance, borrowing and cognate statements
recover relationships missed by exact root-string equality. They can explain
shared loans and ancestors recorded at different depths. The evidence also lets
a reader inspect why a historical label was assigned.

**Next hypothesis.** Checking which word a statement describes, retaining its
qualifications, and assessing each complete-word or component path separately
will reduce false historical claims while retaining useful evidence.

**Test next.** Compare the existing evidence method with a version that preserves
these distinctions. Include statements about another word mentioned in the prose,
alternative origins, uncertain deep ancestry with a supported closer ancestor,
and whole-word histories alongside component analyses. Qualifying a deep origin
must not erase a valid closer relationship.

Use the evidence first to explain or support historical classifications.
Automatic promotion into a label or family-game answer is a separate test. Keep
reasonable historical inference available where structured records are absent;
missing or unequal roots must not force a residual category.

**What would justify keeping it.** More correctly scoped historical relationships
and fewer unsupported claims, with source references retained. Check inherited
relationships, shared borrowing and related formations separately. IE-CoR gives
limited positive cognacy checks; different expert sets are not proof of unrelated
origins.

**What would weaken the case.** Extracted templates keep referring to the wrong
word, or the safeguards discard useful close evidence because some deeper history
is uncertain. In that case, the records may still be useful to readers without
being reliable enough for automatic labels.

Evidence: [E3 recovery result](../pipeline/evaluation/E3_RUN003.md),
[E5 historical source review](../pipeline/evaluation/E5_HISTORY_SOURCE_REVIEW.md).

## 5. E5: continue Dutch and Icelandic with the selected improvements

**Why it remains worthwhile.** Both sources contain much of the independently
expected vocabulary. The full builds are reproducible and preserve the existing
five-language rows. New-language reviews exposed the same retrieval and display
problems seen in the original languages. They are a useful test of whether an
improvement works beyond its development languages.

**Next hypothesis.** Improvements to the shared methods will transfer to these
languages without language-specific word exceptions. Dutch and Icelandic should
be assessed separately; neither the old dataset's error rate nor a strong pooled
result defines success.

**Test next.** Apply frozen selected methods to the eleven existing offline builds.
Compare retrieval, displayed senses, modern labels and historical claims against
the saved unchanged-method results. Then check the actual lexicon and games.
Require the evidence appropriate to each game: a useful definition question does
not necessarily need proven ancestry, while a whole-word family answer needs more
than one shared compound component.

**What would justify admission.** Demonstrated useful coverage and acceptable
task-specific quality for each pairing, with remaining limitations visible.
Preserve old output when its inputs and rules are unchanged; evaluate intentional
shared-method changes on old languages as well.

**What would weaken the case.** A proposed method works only on the original
languages, or the new pairings remain unsuitable for their intended tasks.
That can justify admitting one language or enabling only supported tasks first.
It does not establish that the source is unusable for every purpose.

Evidence: [Dutch development results](../pipeline/evaluation/E5_DUTCH_TRANSFER_RESULT.md),
[Icelandic development results](../pipeline/evaluation/E5_ICELANDIC_DEVELOPMENT_RESULT.md).

## Approaches I would give lower priority

- **More threshold tuning on the same embedding scores.** The dense-only result
  barely beat an always-partial prediction. Threshold changes alone do not address
  polysemy, entry identity or translation ambiguity.
- **Usage tags as the whole display solution.** The tested preference produced no
  gain. Tags remain useful as one signal, with care over historical subject matter.
- **The tested learned sound-substitution model.** It did not outperform the simpler
  control. More complex sound rules are a later experiment if retrieval diagnosis
  shows a need that simpler changes cannot meet.
- **Blanket prefix removal, name removal or frequency cutoffs.** These can hide
  errors by removing useful data. Task-specific selection may help, but requires
  measured gains and losses; it must not silently redefine the lexicon's scope.
- **Requiring structured ancestry for every useful label.** The known source gaps
  make that a poor fit for this project. Useful inference must be tested, not
  replaced wholesale by unknown or unclassified labels.
- **Starting with a new model or more languages.** Neither directly addresses the
  demonstrated identity and evidence-scope errors. If those fixes leave substantial
  semantic errors, compare a stronger sense-comparison method in a separate run.

## How to turn this recommendation into the next experiments

For each selected follow-up, save its hypothesis, concrete change, control,
evaluation cases, intended benefit and acceptable trade-offs before scoring.
Use [the revised adoption policy](../pipeline/evaluation/ADOPTION_CRITERIA_V2.md).
Do not introduce a universal gain threshold or optimize for baseline agreement.

Test the individual changes first. Then combine those with demonstrated benefits
and check for interactions: a new label rule can depend on a sense choice, and
better retrieval can expose a display failure. Freeze the combined method before
using the reserved families. Record the result and decision beside each hypothesis,
including failures and unresolved outcomes.

This file records priorities and hypotheses only. No follow-up experiment has
been run or adopted as part of writing it. Experiment execution remains paused.

## What the correctness reviews add

Sources: [Sonnet's correctness review](sonnet_correctness.md) and
[Gemini's correctness review](gemini_correctness.md), read 2026-10-04.
These are external recommendations, not results from our dataset. They do not
change the experiment ranking above. They give us a more economical way to test
the promising methods and clarify which numerical claims we should avoid.

### Recommendations to carry forward

1. **Estimate broader quality from a probability sample.** Record how likely each
   comparison was to be selected. Oversample rare labels when needed and weight
   the results appropriately. Keep targeted error hunts separate from the estimate.
   Our existing category-balanced reviews remain diagnostic; they are not a
   population accuracy estimate.
2. **Concentrate version comparisons on changed outputs.** Review a probability
   sample of changed labels, selected senses and generated pairs. Keep a smaller
   random sample of unchanged output to check shared errors and estimate absolute
   quality. Equal labels do not mean equal displayed meanings. Both versions can
   be wrong. Report new wins, new losses, both-correct and both-wrong cases.
3. **Keep correctness questions separate.** Assess the comparison's purpose,
   displayed sense, modern meaning label, historical claim and game eligibility.
   A pair can succeed on one and fail on another. Allow supported, contradicted
   and unresolved judgments for specific claims, with a recorded reason.
4. **Keep the independent retrieval check.** A sample of generated rows cannot
   reveal pairs that were never generated. Use IE-CoR within its stated scope and
   additional independent references where appropriate. Preserve missing pairs
   in that denominator.
5. **Use automatic checks to find review candidates.** Reverse-record integrity,
   signal conflicts, unstable thresholds, generic glosses and unusually connected
   words can expose faults cheaply. These are structural checks or review signals;
   they do not establish linguistic correctness.

For changed candidate membership, record removed and added rows separately.
Comparing correctness percentages over two different retained sets would repeat
the E4 mistake. Use the independent retrieval panel for coverage and sampling
weights for the broader candidate comparison.

### Qualifications before turning the advice into rules

- **Sample counts are planning estimates.** Roughly 380–400 simple random reviews
  can give an approximately five-point margin for a binary population proportion
  under the usual worst-case calculation. That does not promise the same margin
  for every label, language pair, correlated family sample or unresolved claim.
  Set the review budget from the desired estimate and sampling design. Review
  quality and source uncertainty remain separate from sampling uncertainty.
- **Family sampling needs weights too.** Keeping one comparison per family can
  help reveal distinct error patterns, but it changes which rows are likely to
  be reviewed. Do not treat that as a uniform row sample. Define whether the
  estimate concerns rows or families and preserve its inclusion probabilities.
- **Strata must have a coherent design.** Predicted label, frequency and selected
  sense position overlap. Assign each row to a defined stratum, or account for
  overlapping selection probabilities; do not pool overlapping groups as if
  they were independent samples. Uniform sampling is still useful for overall
  quality, even if rare labels need additional reviews.
- **Reviewers need a common question and independent evidence.** Hide pipeline
  scores and version identity. For independent meaning judgments, hide predicted
  labels as well. A later claim-support review can show the specific assertion
  without identifying which version made it. Independent overlapping reviews
  can test consistency, but a fixed agreement score does not prove truth or
  automatically diagnose bad guidelines. Two agents are not automatically two
  independent linguistic experts.
- **Vocabulary scope is a product choice.** Names, place names, technical terms,
  old words and inflections are not inherently bad comparisons. Assess their
  intended use and identity. Selecting ordinary vocabulary for a quiz does not
  justify silently removing other legitimate entries from the lexicon.
- **Dictionary position is not usage frequency.** A late sense can be appropriate;
  a first sense can belong to the wrong entry. Sense-position distributions are
  diagnostic. No fixed secondary-sense percentage establishes a bad selector.
- **Graph consistency requires the same historical scope.** Compare exact entries,
  typed relationships and compatible ancestors. Shared components, borrowing and
  different homographs do not justify automatic cognacy closure. Missing edges
  or residual labels are not themselves contradictory claims. The E3 graph has
  known extraction errors, so it cannot independently certify its own labels.
- **Connection counts are review signals.** Many matches can reflect polysemy,
  productive derivation or legitimate names. A fixed limit of 15 cannot establish
  a bad headword without examining those matches.
- **Root masking is a useful stress test, not a guaranteed upper bound.** Hiding
  recorded roots tests inference on that subset. Words with recorded ancestry
  may differ from words without it; the direction of the bias is not established.
- **The proposed 98% game precision is not an agreed release target.** Set criteria
  for actual question and answer correctness, historical claims and task coverage
  before testing. Neither that target nor the proposed agreement and diagnostic
  thresholds should become automatic adoption rules without justification.

### Model-assisted review: useful later, with a real reference sample

Sonnet suggests prediction-powered inference: use model predictions over a large
pool, then use trusted sampled judgments to correct the estimated result. This
is an established statistical approach, described in the
[original paper](https://arxiv.org/abs/2301.09633). It can reduce the cost of
estimating quality when predictions are informative, under the method's sampling
and statistical conditions.

It does not turn model output into ground truth or correct systematic mistakes
in the reference reviewers. Without a trustworthy reference sample, calling our
agent reviews human calibration would be false. Treat this as a possible later
efficiency improvement; weighted sampling and changed-output review are the
simpler starting point. Any use of it needs a saved protocol rather than an
informal bias adjustment.

**Practical conclusion:** we do not need to inspect every generated pair before
trying E2 or E1 again. We need a defensible estimate of broader quality, a focused
comparison of what changed, and an independent check of what is missing. Use
those to judge the concrete improvements above, without replacing the old
five-point gate with a new set of arbitrary gates.

The [verification protocol](DATASET_VERIFICATION.md), recorded 2026-10-04, turns
this conclusion into a repeatable procedure. It separates independent retrieval,
display, meaning, history and task checks, and supplies a tool for frozen samples,
explicit reviews and weighted reports. Use it before the proposed follow-ups.


## E1 follow-up: entry compatibility helps, but ranking remains constrained

The [2026-10-25 result](../pipeline/evaluation/E1_ENTRY_RESULT.md) tests the
entry/grammar hypothesis above. C raises suitable specified-concept displays
from 652 to 658 out of 995 against the prior order preference, with seven gains
and one loss. It also repairs the saga name intrusion. This supports a modest
development benefit; it does not establish broad display correctness. The sun
loss exposes inconsistent name/noun labels across dictionaries.

Two constraints deserve the next frozen experiment. English translation-source
identities sometimes exclude ordinary senses before ranking. The close-score
window can also exclude ordinary alignment when a secondary match scores much
higher. Water/Wasser demonstrates the latter: urine scores 0.8557, ordinary water
0.6861. Usage or order preferences inside a 0.10 window cannot choose the latter.

Separate the ordinary headline from the strongest shared-sense match. Preserve
both outputs and their usage scope. A valid secondary match must remain visible;
a correct false-friend headline may show different ordinary meanings. Measure
source correctness, ordinary suitability and pair alignment separately, with
classification labels held fixed for this display experiment. Freeze that method
and a broader review sample before running it. No live adoption follows from C.


## Translation support: use multiple evidence channels without counting them twice

The [T1-001 result](../pipeline/evaluation/TRANSLATION_SUPPORT_RESULT.md) adds a
reusable evidence API on the existing conflict-only E2 method. It preserves source
translation links independently of cosine and distinguishes direct English links,
shared English source senses, lexical-gloss inferences and embedding candidates.
It resolves 627 of 628 source identities; 336 of 1,251 development comparisons
have dictionary/lexical support without an embedding match. These are evidence
coverage counts, not newly corrected labels or a population accuracy estimate.

The twelve-case low-score review supports the value of dictionary evidence,
including valid narrower uses. All eight conflicts with old references were also
reviewed. Some inherited links mix polysemous English senses or fail to respect
target usage; one reference appears to confuse a historical subject with obsolete
usage. Preserve those disagreements rather than automatically treating either
the source link or the old review as truth. A supported comparison can still
contain an incorrect individual source-to-target inference.

Keep the API as the next display experiment's input contract. Test ordinary
headlines separately from strongest secondary overlap. Then audit endpoint
qualifications, synonymous inactive meanings and raw translation statements
before promoting inherited links to verified sense correspondences. No extra
weighted score, synthetic cosine boost, source-independent vote count or new
residual classifier category was introduced.
