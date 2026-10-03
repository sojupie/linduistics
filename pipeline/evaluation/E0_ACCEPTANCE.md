# Acceptance rules fixed after E0

Date: 2026-10-03. These rules are fixed before implementing or scoring E1-E4 variants. They are project decisions based on the measured baseline and intended use, not thresholds established by either external review.

The experiments use the frozen development cases. Results can support an exploratory method decision. They cannot establish expert linguistic accuracy: the open-vocabulary judgments were made by an agent, historical evidence often comes from the same dictionary as the pipeline, and some cases remain unresolved. The reserved test families are for the final combined evaluation, after methods and parameters are fixed.

## Common rules

- Report every reviewed case, including unresolved cases and missing candidates. Do not count unresolved judgments as correct or drop them silently.
- Compare the same cases in both arms. Report changed and unchanged outputs, coverage, and failures by language pair and diagnostic group.
- Use paired family bootstrap intervals: 2,000 resamples, seed 20261003. Resample families rather than reverse rows or individual senses. Show raw counts where a cell is too small for a useful interval.
- A gain must be at least five percentage points on the experiment's primary development measure, with the lower end of its 95% paired family interval above zero. This is a practical minimum, not a claim that smaller gains are worthless.
- Flag a loss above five percentage points in any language pair or diagnostic group with at least 20 scorable cases. Adoption requires explaining and resolving the loss or rejecting that variant. For smaller groups, inspect every changed failure and report the count; a small sample cannot establish safety.
- Preserve all original senses, source entry identities, usage tags, and provenance. Keep model scores separate from translation or historical evidence. Renaming a category, removing inconvenient cases, or reducing row counts is not an accuracy gain.
- Compare variants separately. A failed or inconclusive run still gets a readable report and decision. Do not tune a method against test-family failures.

## E1: displayed meaning

**Primary measure:** both displayed definitions suit the externally defined concept, using the saved concept rubric. The current development baseline is 630/995, or 63.3%. Also report ordinary open-vocabulary headline quality separately: a valid headline can be unsuitable for a different concept of the same polysemous word.

**Gate:** at least five percentage points of concept-conditioned improvement, with a positive paired interval, and no flagged pair/group loss left unresolved. Retain 100% of original secondary sense records and their identities. Separately check whether previously supported secondary correspondences remain available; retaining an empty or unusable list does not satisfy this condition. Candidate rows, encoder, maximum semantic score, and historical classification remain fixed during this display experiment.

Translation evidence and source order are separate variants. Source order is a weak entry-local signal, not an established usage-frequency ranking. A historical tag must not be treated as proof that a term describing historical subject matter is obsolete.

## E2: practical classification

**Primary measure:** compatibility of the derived practical label with reviewed modern meaning and grammatical context. Define and save the label mapping and scorable reference profiles before scoring. Ordinary/partial overlap, disjoint meanings, related grammatical forms, named-entity identity, and unresolved profiles remain distinct.

**Gate:** at least five percentage points of compatibility improvement with a positive paired interval. Useful labeled coverage may fall by no more than two percentage points. All unsupported generic-name equivalences and full-word claims based only on one compound component in the reviewed controls must be identified, rather than hidden in a renamed residual category. Report historical support separately; practical inference remains allowed.

## E3: historical evidence

**Primary measure:** supported historical relationships recovered that normalized root equality misses. Count documented paths, inferred relationships, and unresolved relationships separately.

**Gate:** recover at least five additional reviewed, source-supported relationships across at least two language pairs, with no false path introduced in the reviewed controls. Every new path must retain entry identity, relation types, and its source. Shared composition or derivation must not be promoted to uninterrupted inherited whole-word cognacy. Unknown or unequal roots are not negative controls by themselves.

This is an evidence-recovery experiment, not a five-percentage-point classification test. A small pass cannot establish a low population false-link rate. Report expert-concept agreement and source-overlap limitations alongside it; require final test-family checks before publication.

## E4: candidates

**Primary measures:** independently expected comparisons found, and usefulness of changed candidates under the same fixed classifier and reviewed meaning rubric.

**Gate:** lose no more than two percentage points of expected-pair recall overall, and no more than five in any language pair. For removing the prefix channel, candidate usefulness must improve by at least five percentage points with a positive paired interval on reviewed candidate families; record-count reduction alone does not pass. For added phonetic retrieval, recover at least ten expected comparisons missed by the control across at least two language pairs, while meeting the recall-loss gates. Report false retrieved matches, pronunciation coverage, fallback behavior, and runtime. Do not claim increased precision from a sample selected only among accepted new matches.

## E5 and publication

Source admission thresholds are fixed after the new-language source audit, before scoring admission. Existing pairs must remain byte-equivalent when their inputs and rules are unchanged. Shared-method changes require a separate regression comparison.

For the combined output, freeze methods and parameters before opening the reserved families. Repeat the measures above on those families, review errors in each new language pairing, and inspect actual lexicon/search/game behavior. Development success does not authorize automatic publication. Record supported changes, rejected variants, unresolved risks, and the resulting publication decision in the ledger.
