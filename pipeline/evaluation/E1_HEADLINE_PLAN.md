# E1-005: ordinary headlines separate from strongest shared matches

Recorded 2026-10-25 before implementing or scoring D. Development experiment; no live publication.

## Hypothesis

The strongest shared-sense score is a poor rule for choosing an ordinary headline. Selecting early current unrestricted readings within entries before comparing entries may improve ordinary displays while preserving every secondary match. Dictionary order is an imperfect cue, not measured frequency.

## Frozen candidate D

For each endpoint, consider current substantive senses using the existing `modern` and `is_redirect` helpers. Group by source entry, grammatical class and etymology number. Within each group prefer senses without the existing `RESTRICTED_USAGE` tags when available, then keep the earliest remaining source-sense identity. Multiple glosses of that identity remain candidates. When identity is missing, use recorded list order; missing identity gets no automatic rank-zero advantage.

Form candidate pairs from these per-entry first readings. Prefer fewer personal-name readings when an ordinary alternative exists. A personal name requires a name/proper-noun entry and a given-name/surname description; the ordinary noun name is not itself a personal name. For grammatical compatibility, nonpersonal proper names may act as nouns (e.g. Sun). Prefer compatible nonempty classes if available. Within that set prefer a class supplied by a current inherited dictionary link when available, using T1's source meanings. These are preferences, not proof of translation.

Break remaining ties by highest original cosine, then exact source-form spelling, then stable source-list order. No close-score window, English source-sense restriction, new embedding model, fabricated score, word exception, or fitted numeric weight enters headline selection. A translation's source class can help choose a use; a narrow source identity does not exclude other ordinary senses. Retain the original strongest eligible match separately using the unchanged E1 eligibility rule. Retain original display, scores, complete matrices, labels and ancestry.

If either side has no current substantive sense, return no proposed headline and preserve the original display with an explicit reason. Do not invent a definition. A valid false-friend headline may show different meanings. It must not be described as a shared translation merely because the selected definitions are ordinary.

## Fixed evaluation design

Generate proposals for all 1,201 frozen E1 rows and 1,202 case records. Reconstruct and assert all existing B and C selections and strongest original displays. Use the frozen final T1 evidence profiles; do not rerun a classifier or encoder.

Primary concept review: draw 10 cases without replacement from each canonical language-pair stratum of the 995 found development IE-CoR cases. Sort strata and case IDs, use one Python Random seed 20261025. Record frame N, sample n and N/n weights before exposing D outputs. This 100-case sample estimates performance only in the fixed 995-case development frame. It is not a new language-wide benchmark or unseen-family test. Reuse reviews only for identical concept/language/headword/gloss identities. Review every new sampled gloss with the independently specified concept visible, but no model score. The agent knows the method; no independent expert blinding is claimed.

Compare original, B, C and D concept suitability. Report gains, losses and unresolved cases, by pair; weighted estimates and finite-population sampling standard errors condition on these source-guided judgments. Use the existing verification estimate helper; those errors do not measure reviewer bias or new-family generalization. Do not apply an automatic percentage gate.

Open diagnostic review: use all 207 existing open cases. Review every changed D-versus-original display for recorded source membership, ordinary headline suitability and shared-sense alignment separately. Keep restricted/contextual overlap and genuinely different meanings distinct. Retain original judgments; a changed target changes the question, so do not call all losses of secondary alignment factual headline errors. Include D-versus-C changes in the case table. Known water/Wasser, saga and sun traces are diagnostic, not independent evidence.

Inspect every sampled concept gain/loss and every changed open display. Preserve failed results and all disagreements. A promising result supports broader verification; no dataset-wide correctness or release claim follows. Keep classification and display experiments separate.

## Preservation and reproduction

Freeze frame and input hashes, then code hashes. Run the source selector self-check and replay from a separate output directory. Verify every original secondary display and all sampled review identities. Save complete proposed indices and a readable review/result report. Do not write to the database or change production defaults.
