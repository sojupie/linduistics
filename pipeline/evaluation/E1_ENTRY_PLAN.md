# E1-004: compatible entries before source order

Date: 2026-10-25. Development experiment; no production adoption.

## Hypothesis

The previous order preference improved 22 independently specified concept displays but introduced a name/ordinary-word mismatch. Source order within an entry cannot choose between entries. Preferring compatible entries within the existing similarity window may retain those gains while preventing some mismatches.

## Fixed method, before results

Control is the saved original display. Comparator B is the unchanged E1-003 usage and source-order selector. Candidate C uses the same active senses, English translation identities, cosine matrix, 0.10 close-score window, usage preference and 0.05 order penalty. Before usage and order selection, C:

1. Prefers pairs with matching name status if any exist in the close window. It uses the existing `meaning_profile.is_name` helper.
2. Within that set, prefers matching, nonempty grammatical classes if any exist. It uses the existing `grammatical_class` helper.
3. Otherwise retains the available close candidates. It does not reject a whole comparison or select a lower-scoring pair outside the window.

These are preferences, not proof of shared meaning. Neither a name match nor matching grammar establishes translation equivalence. Both name readings remain possible where both endpoints are names. Missing grammar receives no compatibility credit. No new weights, word exceptions, source-order frequency claims, or classification rules enter this experiment.

## Inputs and measurement

Use the exact saved 1,201 E1-003 rows and matrices and their 1,202 case records: 995 found IE-CoR concept cases and 207 open development cases. Assert the unchanged B reconstruction against every saved display before accepting the run. Keep case-preserving word identities and frozen definitions when resolving rows. Record input and implementation hashes.

Reuse a source judgment only for the identical concept/language/headword/gloss or identical open case/display pair. Review every previously unreviewed selected display, with full recorded source senses. Preserve the original judgments. The same agent knows the method, so these are source-guided development judgments, not independent or blinded expert validation.

Measure concept suitability against the specified IE-CoR meaning, separately from open pair alignment. For each newly changed open display, record factual source membership, shared-sense alignment, and ordinary versus restricted/secondary suitability separately. A valid secondary match is not a false translation. A pair that has no ordinary shared meaning cannot become a successful ordinary translation by choosing unrelated common definitions.

Report all gains and losses against control and B, by language pair. Inspect every C-versus-B change, including unchanged headline decisions. Do not apply the obsolete five-percentage-point acceptance gate. A modest gain can be useful; new mismatches require explanation. This diagnostic set is familiar development data and gives no population accuracy estimate. No reserved families are opened.

## Invariants and decision

All senses, source identities, matrix cells, stored definitions, candidates, maximum similarities, modern labels and historical relations stay unchanged. Output only selected indices, displayed glosses, reviews and metrics. No live database writes.

A clean development result makes C a candidate for a separately frozen broader test. It does not prove that common senses are selected reliably, nor that the water/urine failure is solved. Preserve a failed result; freeze any revised rule in a new plan before running it.
