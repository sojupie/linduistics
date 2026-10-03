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
