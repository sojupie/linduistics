# H1-001: fixed headline verification and conditional local preview

Recorded 2026-10-25 before opening reserved definitions or scoring the broader sample. User authorized reserved/broader verification and a local preview. F is frozen at commit `816ad8d`; no result-driven tuning is permitted in this run.

## Scope and frozen method

Use `select_headline(..., variant='F')` and the T1 dictionary-evidence API unchanged. Preserve original candidates, definitions, scores, classification and history. Compute only the matrices needed for sampled new comparisons with the pinned offline MiniLM, normalized float32 vectors, builder clipping/identical-headword override and sorted gloss batches. Record model revision, package versions, code and input hashes. Preserve original displays and their recorded scores as the existing strongest-match output; record reconstruction differences rather than replacing stored control data.

## Reserved independent concepts

The existing family registry assigns 544 IE-CoR comparisons to test. Measure retrieval on all 544 against the unchanged baseline. Keep missing pairs in the denominator. The historical adapter case-folded headwords; reproduce its saved row by matching definitions, preserve actual row spelling, and report exact versus case-mapped matches separately. Do not call a case-mapped match exact, change a headword or introduce guessed aliases. Record source-presence diagnoses for missing cases.

Before viewing candidate definitions, sample ten expected cases per canonical language pair without replacement, sorted strata and IDs, Random seed 20261025. Record N/n weights. Missing sampled cases have an explicit missing state, not a wrong display or a dropped denominator. Review control/candidate concept fit on found cases. Report full retrieval, sampled overall suitable share and suitable share among found, per pair, paired changes, uncertainty and every gain/loss.

## Broader output

Take a reproducible reservoir sample of ten rows per canonical language pair from all canonical baseline rows (`lang_a < lang_b`). Use independent Random streams seeded with `headline-confirmation-20261025:<pair>`. Store each stratum N, n, inclusion probability and N/n weight. Do not select using predicted changes or categories. Include unchanged cases, names, specialist vocabulary and disjoint meanings. Record exposure and known development/test/mixed/unknown family status. Unknown/mixed cases are a separate exploratory generalization group, not held-out families.

Review exact source entry/sense correctness, substantive ordinary-headline plausibility and selected-pair alignment separately. Correct false-friend contrasts do not require shared meanings. Record candidate value and observed modern relationship separately; classification and history remain unchanged and cannot claim improvement. No independently reviewed history or game-question validity is implied. Report weighted results for this canonical comparison-row frame, not vocabulary percentages.

## Review, uncertainty and adoption

Prepare packets with words, original source inventories, source identities, qualifications and anonymized display arms, but no score, classifier prediction or version label. Record source-guided observations before exposing the private arm map and claim comparison. The agent knows the method, so this is imperfect blinding, not independent expert gold. Do not reuse development judgments as reserved truth. Choose two cases per pair in each panel for a second review before exposing outputs; allocation remains pending until another reviewer actually completes it. Report that gap explicitly; do not manufacture reviewer independence.

Each judgment needs a reason. Use supported, contradicted, unresolved or absent states; preserve narrow/contextual matches. Apply existing finite-population stratified estimates and paired changes with unresolved bounds. Read all sampled gains/losses. A gain/loss trade-off, not a new arbitrary percentage gate, decides whether a local preview is useful. A clear improvement in reserved concept fit plus a broader result that does not reveal an unexplained dominant failure supports a reversible preview. Any mixed or negative result still gets documented; it does not trigger another tuned variant on this set.

## Preview boundary

If supported, build a development-only local product preview using existing lexicon components/styles. Show proposed ordinary readings and the retained original match distinctly, and state that classification remains unchanged. Do not publish, mutate the database, replace default search results, or change game eligibility/scoring. Verify actual rendered behavior and exact selected-pair retrieval. A preview demonstrates presentation and integration boundaries; it does not certify game questions or production adoption.

## Preservation

Save the frame/sample and second-review allocation before scoring. Freeze code/input hashes, model cache and protocol. Replay scores/selection from a separate directory. Preserve all observations, arm maps, conflicts and reports. Existing verification tool/estimator and source helpers are reused. No production changes follow solely from this one-agent run.
