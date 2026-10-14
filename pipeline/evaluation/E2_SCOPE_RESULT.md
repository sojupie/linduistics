# E2 source-scope experiment: what worked and what did not

Completed 2026-10-14. No database changes or improved dataset publication.

## Decision

**Reject the hard similarity veto. Keep the conflict-only revision as a candidate
for a wider test.** It repaired a few documented scope mistakes without observed
losses, but this pilot cannot establish dataset-wide improvement. Its gain is
not rejected for being smaller than five points; its coverage and independent
review remain insufficient for adoption.

## Fixed plans and controls

The [first plan](E2_SCOPE_PLAN.md) was committed before implementation and scoring.
The [revision plan](E2_SCOPE_REVISION_PLAN.md) was committed after the first result
and before the second implementation. The revision is explicitly exploratory.
It uses the same sample, first judgments and cached matrices. No thresholds,
reference judgments or sample membership changed to produce its result.

Original E2-002 remains the control. Original dense endpoint matrices, candidates,
displays and history stayed fixed. Additional source-gloss associations used the
same pinned MiniLM revision on CPU. Model files match the preserved Windows
snapshot; file hashes and package versions are saved. The default meaning API
retains E2-002 behavior. Both scope policies require explicit opt-in.

Opting into scope checks defaults to the conflict-preserving policy. The rejected
hard gate requires an explicit research option; a future caller cannot reactivate
it simply by enabling sense scope. Original sources remain saved for reproduction.

## Results

These counts measure compatibility with source-guided agent judgments, not expert
accuracy or agreement with baseline labels.

| Set | Original E2-002 | Hard E2-003 | Conflict-only E2-004 |
| --- | ---: | ---: | ---: |
| Old diagnostic cases | 169/197 | 159/197 | 171/197 |
| Unseen pilot cases | 43/47 | 39/47 | 44/47 |
| Diagnostic gains / losses versus original | — | 5 / 15 | 2 / 0 |
| Pilot gains / losses versus original | — | 2 / 6 | 1 / 0 |

The old diagnostic set still includes ten unresolved references. The pilot
includes three unresolved spelling-redirect cases. They remain in the records;
they were not silently declared correct or dropped from the fixed sample.

### Why the hard gate failed

It required each endpoint to resemble the English source definition strongly
enough. That rejected real narrower meanings, short translated glosses, pronouns
and source omissions already established by independent lexical evidence in the
original reviews. In the unseen sample it also lost clear concealment, noise,
rotten/bad and elf meanings.

Its repairs included real polysemy and inactive-use errors. But similarity alone
could not distinguish those from sparse descriptions of valid translations.
This is a failure of the decision rule, supported by reviewing the concrete gains
and losses; it is not rejection merely because it departed from the control.

The [case review](E2_SCOPE_CASE_REVIEW.md) preserves every changed diagnostic
and pilot case, including unresolved and still-wrong results.

### What the revision changed

Low similarity or missing exact identities alone no longer cancel a documented
lemma-level translation. Such links stay explicitly unlocalized and inferred.
Their candidate indices are not verified sense correspondences, and they do not
create dense matrix matches or full-equivalence labels.

Rejection requires an observed usage or grammar conflict, with no associated
current sense resolving it. Two diagnostic cases then become **historical overlap**
instead of current partial overlap. An unseen colour case becomes **related form**:
the adjective names the colour, while its unrelated noun meanings had supplied
the original accidental grammatical match. A fourth changed diagnostic case has
an unresolved reference; it remains unresolved.

This does not solve every ambiguous English translation or every source gap.
Aliases expressed as descriptive phrases or different English synonyms may remain
unlocalized. That limitation is recorded rather than converted into a claim of
different meanings. The soft revision preserves genuine partial overlap that the
hard gate lost.

## Sampling scope and uncertainty

The frozen registry assigns only a small part of the vocabulary. From 819,227
canonical comparisons, the preparation withheld 809,213 with unknown assignments,
8,631 reserved/mixed comparisons and 1,201 already used by E1/E2. The remaining
**182 comparisons** formed this pilot's population. Known reserved roots in all
endpoint senses were also checked before admission.

Five cases were sampled without replacement per undirected language pair:
50 total. Each stratum's population size and inclusion probability are saved.
All evidence was reviewed before either arm's predictions. Candidate value,
ordinary display suitability and history-review limits were recorded separately.
There was one agent reviewer, not independent human or specialist adjudication.

For **that 182-case frame**, the weighted fixed-frame supported meaning share is
84.2% for the control and 87.0% for the revision: **+2.9 percentage points**, with
a sampling standard error of **2.6 points**. About 9.6% of the weighted frame
receives no modern relationship claim because substantive source meanings are
missing. Sampling error does not include mistaken reviews or reference ambiguity.

One sampled repair cannot establish a broad improvement. These rates cannot be
reported as accuracy across the dataset, ordinary vocabulary or all word families.
The [weighted report](e2-scope001/revision/weighted_report.md) keeps every stratum,
claim coverage, unresolved status and dimension separate.

## The next substantial issue is display selection

The same pilot's weighted ordinary-headline review found 49.3% supported displays,
49.5% contradicted and 1.2% unresolved. This is a finding about this restricted
frame under the saved ordinary-headline rubric, not a dataset-wide error rate.

Valid secondary matches often exist, while the selected headline is a specialised
sense, a grammatical mismatch, a spelling redirect or a grouping heading. Several
comparisons remain useful if those secondary meanings stay accessible. Changing
their meaning label cannot repair that display problem.

A poor ordinary headline is not necessarily a false definition. Some secondary
matches are accurate translations for that specific pair. The next experiment
must assess factual sense correctness, shared-sense alignment and ordinary-headline
suitability separately. It must not replace an accurate secondary correspondence
with two unrelated common senses just to satisfy a preference for early entries.

The next experiment should choose the matching entry and grammatical use before
ranking displayed senses, retain secondary correspondences and prefer usable
ordinary definitions. It must test display independently of classification and
candidate retrieval. Do not hard-code benchmark concepts or individual words.
Before claiming population quality, expand the family registry or establish a
separate measurement design for currently unassigned vocabulary; do not silently
treat unknown families as independent test cases.

## Reproduction and preserved evidence

The revision's profiles, decisions and metrics reproduce byte-for-byte from the
frozen matrix cache in a separate output directory. Original hard-gate and
revision source snapshots match their recorded code hashes. The source model,
reference inputs, both outcomes and the original judgments are retained under
[e2-scope001](e2-scope001/metrics.json). The live API remains healthy and serves
the unchanged verified five-language dataset.

Checks passed: the meaning-profile self-check, formal verification self-check,
and 25 parser/classifier/sense-aligner/semantic-matcher tests. The experimental
runner reads files and writes new run directories; it makes no database writes.
