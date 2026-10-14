# E2-004: preserve dictionary inference, reject explicit endpoint conflicts

Recorded 2026-10-14 after E2-003 and before implementing or scoring this revision.
This is an exploratory follow-up, not a moved threshold or a manufactured pass.
Preserve E2-003: diagnostic 169→159, five gains/fifteen losses; pilot 43→39,
two gains/six losses. Its hard association veto is not suitable for adoption.

## What changed in the hypothesis

The same embeddings that miss short translated glosses cannot reliably veto
dictionary translations. Weak source association may mean a sparse endpoint
gloss, not a contradictory meaning. Keep the 0.60 association value as a locator
and audit signal; it no longer decides whether an otherwise attested lemma-level
link exists. Unlocalized links remain explicitly inferred partial overlap.

Reject a link when source records provide a positive conflict:

- The English lexical alias occurs only in inactive senses of the required
  grammatical class, with no current alias or associated current sense.
- Its current alias occurs only in another grammatical class, with no associated
  current sense in the source class. Other unrelated senses of the same lemma
  must not supply an accidental common noun/verb class.

Record the precise conflicting indices, usage/grammar and locator scores. Keep
source identities and ambiguity visible. Missing exact identities or low scores
alone are not proof of different meanings. Preserve dense inference, modern
restricted uses, ordinary synonyms and broader/narrower overlap. Do not alter
historical labels, dense thresholds, candidate membership or displays.

## Evaluation and decision

Reuse the original frozen E2-003 frames, sample, first-review references and
matrix cache. No new sample, new judgments, new threshold or embedding pass.
Compare original E2-002, hard E2-003 and this revision, and inspect every changed
case and every loss. Preserve uncertainty and estimate only the declared pilot
frame. Display/history preservation are separate from meaning improvements.

The known results influenced this revision, so it is exploratory. A gain can
justify a larger test, not publication. Keep the first reference judgments even
where a more permissive label would help. Remaining source or review conflicts
belong in a separate adjudication record. Wider family coverage, independent
duplicate review and a frozen reserved-family check remain prerequisites for
adoption. Never promote a familiar-slice gain to dataset-wide accuracy.
