# Revised experiment adoption criteria

Recorded 2026-10-03, after the original E1–E5 development results and before
the E4 reassessment below. This is an explicit change to the decision policy.
The original plans, thresholds, judgments and results remain historical records.
This revision does not turn their failures into passes under the original rules.

## What adoption means

The reproduced five-language dataset is an acceptable starting point and a
comparison control. It is not a gold standard. Preserving its behavior is useful
when checking an unrelated change; it is not the purpose of an improvement.
Known mistakes should change when an independently grounded evaluation supports
the change.

The old five-percentage-point gain and subgroup limits were project choices.
They remain reportable diagnostics for their original runs. They no longer
automatically decide adoption. No replacement universal percentage is introduced.
Before each further experiment, save its intended benefit, relevant measures,
costs, target tasks and any justified numerical limits. Explain any later change
to those criteria before running or scoring a new variant.

Adoption requires a demonstrated benefit on the intended task, a review of the
losses, and an explicit trade-off decision. Small gains can be useful; large
proxy gains can be misleading. If the evidence cannot establish a benefit,
record an inconclusive decision and name the measurement that is missing.
Do not manufacture a pass by changing the sample, rubric or threshold after
seeing the result. Post-result reassessments are exploratory; confirm a selected
method on reserved families after freezing it.

## Four separate questions

| Question | Primary reference | What to report |
| --- | --- | --- |
| Are expected pairs retrieved? | Independently selected IE-CoR vocabulary and recorded forms | Found/missing pairs; exact and justified mapped forms separately; missing entries versus missing comparisons; gains and losses by pair and family |
| Is the displayed sense correct for the intended use? | Independent concept definitions, with source inventories for disambiguation | Suitable, wrong, restricted and unresolved displays; correct secondary matches; headline quality outside the concept task separately |
| Is the historical relationship and modern meaning classification correct? | IE-CoR expert cognacy for its concept forms; other documented histories; separately reviewed modern meanings | Historical positives, contradictions, unsupported inference and uncertainty; modern full/partial overlap, distinct meanings, grammar and entities separately |
| Does quality extend beyond that benchmark? | Frozen reproducible samples selected before reading predictions | Candidate support, display quality, history, meaning labels and task eligibility as distinct results; inclusion probabilities and unresolved cases |

IE-CoR supplies a limited independent spot test of expected vocabulary and
documented cognacy. It does not enumerate all useful translations, all dictionary
senses, borrowing histories, modern sense overlap or false friends. Same expert
sets provide positive cognacy evidence for the annotated forms and concepts.
Different sets are not proof of completely unrelated ancestry. Record reference
uncertainty, scope, form mapping and overlap with pipeline sources. The published
reference is independent of our predictions; agent judgments about whether a
gloss fits it are not independent human annotations.

Keep historical and meaning measurements separate. Missing history does not
require discarding a useful inferred classification. Report the basis and
evaluate that inference; do not treat exact root-string agreement as truth.
Do not count semantic disjointness alone as a poor comparison: a useful false
friend has different meanings. Conversely, spelling resemblance alone does not
establish a useful quiz question or a historical relation.

For broader quality, report fixed diagnostic samples as diagnostic samples.
Use a representative probability sample, or justified sampling weights, before
estimating a population rate. Stratified equal allocations cannot be pooled into
dataset accuracy. Preserve family splits, blinded review and uncertainty.

## E4 reassessment fixed before its new analysis

Keep E4-A002's 9 lost expected comparisons and 40.6% to 35.2% fixed-label
agreement result. Reconsider the decision, not those observations. A retained
pair's label did not change: the percentage change reflects which cases remain.

Reassess all 207 frozen development open cases, removed and retained, using
their saved meaning judgments separately from their classifier labels:

1. Source-supported meaning overlap, including narrower, regional and secondary
   overlap. These comparisons can be valid even when the current label is wrong.
2. Related grammatical or conceptual forms. Keep them distinct from equivalent
   translations and from unrelated noise.
3. Verified entity overlap, distinct entities and unverified generic name matches.
   Generic name descriptions do not establish identity; names can still be useful
   for tasks designed to compare names.
4. Disjoint observed meanings. Review the recorded forms and history before
   deciding whether they are plausible deceptive comparisons or weak matches.
5. Historical/inactive-only or unresolved comparisons. Keep their reasons and
   task restrictions visible; they are not automatically correct or useless.

Save an explicit profile-to-group mapping before calculating group results.
Within each group, cross-tabulate correct and wrong fixed labels, removed and
retained. Do not call label disagreement a candidate failure. Inspect every
disjoint case and flag concrete reasons for poor support, such as component-only
resemblance or missing entity identity, without claiming that the whole group's
population quality has been measured.

Use all existing development IE-CoR cases for retrieval. Also separate the lost
same-expert-set cognate positives from other expected concept pairs. Keep all
original losses visible. Do not score modern false-friend correctness from expert
cognacy alone. Reserved families remain unopened during this reassessment.

The reassessment may justify removal for a specific task, retention, a selective
channel policy, or an inconclusive decision. It cannot establish unconditional
removal as an improvement solely from lower row counts or fixed-label agreement.
Any new selective policy is a new experiment and needs a saved plan before tuning
or testing it.

## New-language admission and final evaluation

Compare each new language with independent expected words and histories, then
review its displayed senses and reproducible broader samples. Old-language
comparators diagnose differences; matching their error rate is not admission
success. Source gaps, retrieval failures and category failures require separate
decisions. An unchanged-input preservation check protects unrelated data; a
shared-method change may intentionally alter old output if its quality improves.

Record task-specific eligibility for lexicon, definition quiz, cognate grid,
sorting, family building and odd-word-out games. A shared component or deep root
does not automatically validate a whole-word family answer.

Freeze the selected methods before final reserved-family and actual API/search/
lexicon/game checks. Record benefits, costs, limits and the release decision.
Development gains or unchanged hashes do not by themselves authorize publication.
