# Dataset verification protocol

Recorded 2026-10-04, before further improvement experiments. This implements the
[revised adoption criteria](../pipeline/evaluation/ADOPTION_CRITERIA_V2.md).
The old dataset is a control, not a gold standard. The original experiment plans,
results and judgments remain intact. No new numerical adoption threshold is set.

## What we must establish

| Question | Reference and unit | Required result |
| --- | --- | --- |
| Retrieval | Independently expected concept, forms and language pair | Found and missing; control gains and losses; missing source entry versus missing generated comparison |
| Display | The actual displayed gloss and its entry, sense, grammar and usage | Suitable ordinary meaning, useful restricted meaning, wrong or unresolved; record secondary overlap separately |
| Modern meaning | Reviewed senses of both endpoints | Full overlap, partial overlap, different meanings, grammar/entity distinction or unresolved; then assess the classifier's claim |
| History | Whole-word ancestry or borrowing evidence for the exact entries | Supported relationship, contradiction or unresolved; separate documented and inferred claims |
| Broader quality | Probability sample from a declared population | Separate candidate, display, meaning, history and task results, with sampling weights and uncertainty |
| Product use | Actual API/search result, displayed row or generated question | Correct retrieval and display; valid question, unambiguous answer and correct scoring for the declared task |

Do not average these into one accuracy score. A valid comparison with a wrong
label is a classification error. Different meanings can make a useful false
friend. A shared component does not prove that two whole words are cognates.
An absent comparison or claim is not an incorrect claim.

## 1. Save the plan before running a variant

Each run directory needs a dated plan containing:

- The hypothesis, intended tasks and expected benefit.
- Control and variant code, configuration, source and output hashes. Before an
  output exists, record its planned path; add its hash in a separate run manifest.
- The independent references and their limits, including source overlap.
- The population being measured: for example, canonical whole-word comparisons
  eligible for a particular quiz, or expected concept pairs. Declare the unit.
- Measures, review rubric, quotas, seed, family assignment and reviewer roles.
- The gains, losses and costs that would justify adoption. If a numerical limit
  is needed, justify it now. An unchanged classifier's agreement is a diagnostic.

Freeze this plan before seeing variant results. Changes require a new dated plan
that cites its predecessor and explains why it changed. A result-driven revision
is exploratory and requires later confirmation. Preserve failed runs.

## 2. Check the artifacts before linguistic review

Reuse `pipeline/src/dataset_artifact.py` for parquet iteration, row checks and
unchanged-field comparison. Existing experiment verification scripts, including
`pipeline/evaluation/e5_verify.py`, check their own recorded builds and hashes;
they are not generic validators for every future run.

Record source counts, entry/sense coverage, score ranges, empty glosses, duplicate
identities, reverse consistency and malformed rows. Check every field promised
unchanged. Classify intentional changes separately. Hash equality proves content
preservation; it does not establish linguistic correctness.

Use exact entry and sense identities. Preserve spelling case, language, part of
speech and entry distinctions. Canonicalize reverse direction once, while keeping
both directional displays and tasks. Do not merge German `Gen` and `gen` by
case-folding. Keep justified reference aliases in a separate mapping.

## 3. Run the independent reference check

Reuse the frozen IE-CoR cases and family assignments from E0/E5. Their existing
matching and review records remain historical records; correct matching problems
in a separately versioned adapter. Record exact and mapped matches separately.

IE-CoR covers a limited set of expected vocabulary and documented cognacy for
recorded concept forms. Same expert sets supply positive evidence. Different
sets do not establish unrelated ancestry. It cannot validate the full range of
modern meanings, false friends, borrowing histories or game questions.

Keep **every expected case**, including missing comparisons, in the retrieval
denominator. Compare control and variant on that same reference. Report each
language pair and lost/gained family. For displays, retain a separate missing
state instead of counting only the surviving comparisons.

The E0/E5 reviewers are agents, not an independent expert panel. Preserve that
qualification when reporting their meaning judgments. Inspect uncertainty in
the reference rather than treating its labels as infallible.

## 4. Sample broader output and changed cases

Build a frozen review frame before selecting cases. Include the union of control
and variant cases so removals and additions cannot vanish from the comparison.
Use a declared task eligibility rule, including eligible but missing outputs.
Never describe this frame's results as accuracy of vocabulary outside it.

Assign each case to exactly one stratum. Include the language pair and distinguish
added, removed, changed and unchanged output. Split changes further by display,
label or evidence where needed. Category or confidence splits are optional, but
must be disjoint. Review unchanged cases too: both methods can share mistakes.

Take a seeded simple random sample without replacement within each stratum.
Record its population size `N`, sample size `n`, inclusion probability `n/N` and
weight `N/n`. Larger quotas for rare labels or changed cases are allowed; pooling
their unweighted judgments into dataset accuracy is not.

Known related families and reversed cases must stay in the same development or
reserved group. Extend the frozen family registry with an auditable assignment
before review. Quarantine unknown assignments; do not silently call each new word
an independent family. The registry records what we know, not proof that every
historical link has been discovered.

Targeted examples and diagnostic samples remain useful. Keep them outside the
probability estimate. Existing five-per-category reviews are diagnostics, not a
representative population sample. They do not become one through new weights.

## 5. Review evidence before claims

First give the reviewer only the evidence packet: exact entries, gloss inventories,
usage, displayed senses, historical paths and source citations. Hide predictions,
similarity scores and version names. Record observed meaning overlap, display
suitability, historical support, candidate value and task restrictions. Sources
must be sufficient to assess both endpoints; an embedding score is not evidence.

Then expose the stated claims, still without version names, and record one of:

- **supported**: the evidence supports this exact claim in its stated scope;
- **contradicted**: evidence conflicts with it; name the conflict;
- **unresolved**: the available evidence cannot settle it; state what is missing;
- **not_applicable**: this output makes no claim in this dimension.

Missing history does not automatically contradict a useful inferred relationship.
Assess the inference under the frozen rubric and record its basis. Preserve source
qualifications such as “perhaps” and “possibly.” Do not turn an etymology's mention
of a third word into ancestry of the displayed word.

Each judgment needs an explicit reason and source basis. No omitted judgment
defaults to correct. Record whether reviewers are agents, humans or specialists.
Before review, select a random subset for a second, independent reviewer and
record the allocation. Add disputed or high-impact cases separately for diagnosis.
Preserve both original judgments, disagreements and adjudications. Two agents
are not two independent experts. Agreement measures consistency, not truth.

## 6. Calculate results without hiding losses

Use sampling weights for population totals and rates. Keep per-language-pair and
changed/unchanged results visible. For the common frame, compute each case's
control-to-variant difference before aggregation. Do not compare percentages
calculated over different sets and attribute the difference to better labels.

Report supported, contradicted, unresolved and absent claims separately. Show
bounds obtained by treating unresolved judgments as correct or wrong. If reporting
precision among made claims, show that denominator, claim coverage and membership
changes too. Reduced coverage can increase precision without improving retrieval.

The supplied tool reports fixed-frame supported shares and paired changes. Its
sampling standard error uses the stratified simple-random-sampling formula with
the finite-population correction. It needs at least two sampled cases in each
non-census stratum. It supplies no automatic confidence claim or adoption verdict.
A zero sample variance does not prove zero population error. Sampling uncertainty
does not include mistaken reviews, bad frames or missing source evidence.

This design samples rows within strata. A design that samples whole families
needs family inclusion probabilities and a matching estimator. Do not reuse these
row weights or treat a family bootstrap as equivalent to the sampling design.

## 7. Decide, confirm and check the product

Write a short decision stating the demonstrated benefit, concrete losses, task
scope, unresolved questions and whether to adopt, revise or defer. Compare against
the frozen criteria, not a desired category distribution. Independently expected
losses need explanation; they are not automatically outweighed by a proxy gain.

Freeze the selected method and its full manifest before reserved-family review.
Use the reserved set once for confirmation. Tuning after seeing it makes it
development evidence; obtain another untouched reference for a later confirmation.

For new languages, run the same reference, source and probability checks per pair.
Separate missing entries, missing comparisons, wrong displays and wrong categories.
Recheck existing languages where the shared method changes. New `is_core` values
need a justified frequency source; comparison counts are not word frequency.

Before publication, exercise API detail/search, lexicon links and displays, and
every enabled game. Validate exact selected identity, answer completeness, scoring
and round scope. Save a readable release decision. Development review completion
or an unchanged file hash alone does not authorize publication.

## Executable sampling and review

`pipeline/evaluation/verification.py` implements steps 4–6. It does not generate
candidate pairs, judge language, populate the database or replace reference checks.
There are no new dependencies. Run it from the repository root:

```powershell
.\pipeline\.venv\Scripts\python.exe -X utf8 -m pipeline.evaluation.verification self-check
.\pipeline\.venv\Scripts\python.exe -X utf8 -m pipeline.evaluation.verification prepare path\plan.json path\new-review-run
.\pipeline\.venv\Scripts\python.exe -X utf8 -m pipeline.evaluation.verification report path\new-review-run path\new-review-run\review.json path\new-review-run\result.json
```

The plan is a JSON object with `phase` (`development` or `reserved`), `hypothesis`,
`measures`, `tradeoffs`, `decision_rule`, `rubric`, integer `seed`, `quotas` and
`inputs`. Put the detailed rubric in the plan or hash its file under `inputs`.
Every input has `path` (relative to the plan) and `sha256`. Required inputs are
`frame` and `families`. Include code/configuration/source/reference manifests too.
Reserved review also requires a `frozen_method` input and `test` family roles.

Example frame case (the strings stand for actual claims and cited evidence):

```json
{
  "id": "stable-exact-entry-pair-and-task-id",
  "family": "existing-frozen-family-id",
  "stratum": "en-de/changed-display",
  "control": {
    "evidence": {"entries": "exact entries and source senses", "display": "actual glosses"},
    "claims": {"candidate": "task-worthy comparison", "display": "ordinary meaning",
               "meaning": "partial overlap", "history": null, "task": "valid lexicon row"}
  },
  "variant": {
    "evidence": {"entries": "exact entries and source senses", "display": "actual glosses"},
    "claims": {"candidate": "task-worthy comparison", "display": "ordinary meaning",
               "meaning": "full overlap", "history": null, "task": "valid lexicon row"}
  }
}
```

The frame file is a JSON array of these cases. The family file maps frozen family
IDs to `development`, `test` or another withheld role. `quotas` maps every stratum
to its positive integer sample budget. If its population is smaller, review all.
All five claim keys are required. A null claim means absent or not made, including
removed output. The evidence must still explain its absence and contain the
reference or other endpoint needed to judge it.

`prepare` writes evidence-only and claim packets, a private sampling/arm audit,
and blank facts and judgment forms. Give reviewers only the appropriate packet,
not the audit or source frame. Inspect evidence for accidental label/version leaks.
Arm names A/B are randomly assigned per case; facts review precedes claim review.
Fill each observation in `facts.json` with the five findings above and source basis.
Identify both reviewers. Set `review.json`'s `facts_sha256` to the completed facts
file's SHA-256 before entering claim judgments. This records the facts used; the
operator must enforce the review order. The tool cannot prove human blindness.

`report` verifies hashes, deterministic selection, family admission, coverage,
reviewer identity and explicit judgments. It writes **readable Markdown alongside
JSON**, including per-stratum counts, weighted shares, uncertainty and unresolved
bounds. The report does not combine dimensions or silently call an agent judgment
ground truth. Use a new filename for a revised review/report; preserve the old
files and facts, then cite their hashes in the adjudication record.

The compact JSON frame is an interchange format for evaluation cases. A large
full-dataset export should sample/stream parquet while preserving the same design;
do not duplicate full source inventories for millions of rows. No whole-dataset
frame, new experiment or reserved review has been run as part of this setup.

## Current status and next use

The protocol and sampling tool are ready for a planned follow-up. Existing E0–E5
results retain their original scope. Outstanding historical reviews and product
checks remain outstanding. The next experiment must name its reference check,
frame builder, review allocation and adoption criteria before it starts.
