# T1-001: dictionary evidence alongside definition similarity

Recorded 2026-10-25 before implementing or measuring this experiment.

## Hypothesis and scope

A comparison should explain dictionary translation support separately from embedding similarity. A low cosine must not erase a recorded translation. A word-level translation link must not assert exact target-sense identity, ordinary usage, exhaustive equivalence, or shared ancestry.

Build an opt-in evidence API on the existing E2 conflict-only method. Keep its explicit grammar/usage conflict checks, source identity resolution, lexical-alternative parser and current embedding thresholds. Do not add another weighted score. Expose inherited translation links, exact versus ambiguous source identities, target-sense candidates, lexical-gloss evidence and embedding suggestions as separate records. Retain historical, unresolved and conflicting links with reasons rather than silently dropping them.

The available five-language snapshot retains build translation-reference identities and parsed English source meanings. It does not retain the full raw translation statements, reverse links or independent source editions. Call these inherited build links; do not claim a fresh check of the raw target translation, invent reverse evidence, or count repeated source glosses as independent votes. No new download is necessary for this experiment.

## Fixed rules

1. Resolve stored source entry/sense references against the frozen English lemma inventory. Keep missing identities explicit. Group all glosses for a single source identity into one evidence unit.
2. Distinguish a direct English-to-target link from two foreign targets linked through the same English source sense. Both belong to one Wiktionary-derived source, not independent confirmations.
3. Reuse E2's `word_overlap(... sense_scoped=True, scope_policy='audit')` for current lexical evidence. Low association alone is never a veto. Record source status, usage tags, endpoint grammar/usage conflicts and candidate localization. Cosine-localized target candidates are inferred, not dictionary-attested target sense IDs. An identity among merged source candidates is ambiguous, not exact.
4. Reuse lexical-gloss correspondences separately. Explicitly translated headwords and shared short gloss alternatives are useful evidence but not raw dictionary translation statements. Keep qualifications.
5. Keep embedding suggestions separately, with the existing 0.75 cutoff and recorded endpoint indices. Do not convert dictionary support into a synthetic cosine of 1.0. Preserve the original strongest match and original display.
6. Summarize current dictionary/lexical support as possible shared meaning, never complete equivalence. Preserve the current experimental E2 label as a separate unchanged result. Do not modify production classification or add a new residual category.

## Measurement and review

Use all 1,201 frozen E1-003 rows plus the existing 50 reviewed E2 pilot rows, with their cached matrices and associations. All are development material. Reuse source-guided meanings in the 197 scorable open diagnostic cases and 47 scorable pilot cases; retain the remaining unresolved references. No reserved cases are opened.

Report link resolution, direct versus pivot support, source-identity ambiguity, inferred/unlocalized target scopes, evidence below the embedding cutoff, explicit conflicts, and comparison-level support. Measure whether asserted current overlap is compatible with those existing reference labels. Do not call absent dictionary support a wrong prediction: other inference remains available. Do not equate a generic or narrower translation with full equivalence.

Review every reference conflict among asserted dictionary/lexical support and a deterministic diagnostic sample of 12 supported cases without an embedding match (or all if fewer), seed 20261025. Inspect the water/Wasser trace as an already known diagnosis, not an independent success case. Judge what the records actually support, including usage and grammar. This sample does not estimate population accuracy. Keep all disagreements and distinguish incorrect support from uncertain localization and narrower valid senses.

Adoption requires useful explanations and retained valid links without fabricated precision. This run can establish implementation correctness and development usefulness, not dataset-wide accuracy or release approval. A separate headline experiment and raw-source reconstruction can follow; neither is silently folded into this run.

## Preservation and reproduction

Freeze input and code hashes. Replay from a separate directory and compare outputs. Preserve every sense, matrix, stored definition, candidate and modern/historical label. Test low-cosine translation support, repeated-source deduplication, missing and merged identities, grammatical conflict, historical sources and secondary meanings. Write offline outputs only. No database writes.
