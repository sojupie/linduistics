# Dataset improvement plan and experiment ledger

**Agreed direction:** separate historical relationship, meaning overlap, and form resemblance; evaluate ordinary vocabulary independently of our generator; preserve useful inference when source evidence is incomplete.

This document records what we intend to test, why, and what actually happens. A planned improvement is a hypothesis until its results support it.

## Starting point

The accepted five-language baseline has 1,638,454 directed comparison rows. Its final file is reproducible, and publication preserves its content. Its linguistic accuracy has not been established by an independent benchmark.

Baseline file: `pipeline/data/reproduce-five-language-20261002/all_comparisons_v2.parquet`.

Baseline SHA-256: `a7e2bfe3ffa75931c9134f3e570eec53cbf644713b738bedc055fdc9b44b120f`.

Source reviews:

- [Sonnet review](sonnet5.5_chat_linduistics_review.md)
- [Gemini review](gemini3.8_deep_research_Linduistics%20Lexicon%20Architecture%20Review.md)

## Decisions we are carrying forward

1. Store and assess ancestry, meaning overlap, and form resemblance separately. Derive useful product labels from these results.
2. Missing or different root records do not establish unrelatedness. Allow supported inference and keep its evidence identifiable.
3. Preserve several meaningful sense correspondences. Select the displayed meaning separately from the maximum similarity score.
4. Evaluate both generated pairs and useful comparisons the generator misses.
5. Report results by language pair and failure type. Keep ordinary vocabulary and deliberately difficult cases separate.
6. Keep related word families and reverse-direction duplicates together when dividing development and test data.
7. Compare each experiment with a frozen baseline and record failures as well as gains.
8. Admit new languages through the same processing and evaluation procedure as existing languages.

We have **not** agreed to a particular sense-position formula, cross-encoder, supervised model, mandatory ancestry proof for every game, vocabulary cutoff, or the reviews' numerical release targets. Those require separate evidence and decisions.

## Experiment sequence

| ID | Question | Depends on | Current status |
| --- | --- | --- | --- |
| E0 | Where does the baseline succeed, fail, or miss vocabulary? | — | Planned |
| E1 | Can we select better displayed meanings while preserving valid secondary matches? | E0 | Planned |
| E2 | Can separate meaning and history results produce better pair classifications? | E0, E1 | Planned |
| E3 | Can typed historical evidence recover relationships missed by root equality? | E0 | Planned |
| E4 | Can better candidate generation reduce noise without losing useful comparisons? | E0 | Planned |
| E5 | Can we add a language without degrading existing comparisons or hiding new errors? | Accepted methods and E0 | Planned |

Start with E0, then E1. Test E2, E3, and E4 separately before evaluating their combined effect. E5 applies the accepted methods to one new language at a time.

## E0 — Establish the baseline and evaluation sets

**Hypothesis:** our existing totals and familiar examples conceal systematic sense-selection errors, classification errors, and missing ordinary vocabulary. Independent sampling will expose these failures and provide a fair comparison for later experiments.

**Plan**

Build three saved evaluation sets:

1. **Independent vocabulary:** externally selected concepts and frequent lemmas. Record expected lexical counterparts and acceptable ordinary meanings, then check whether the pipeline finds them. Select these before inspecting the pipeline's suggestions. Verify source coverage and licensing before choosing a reference resource.
2. **Existing comparisons:** reproducible samples across the ten undirected language combinations and current product categories. Include names and compounds; do not remove inconvenient examples.
3. **Difficult cases:** secondary-sense overlap, homographs, generic definitions, compounds, borrowings, unequal historical depths, short words, and sound-shifted forms. Report these separately from ordinary-vocabulary results.

Choose and save sample sizes, sampling seed, and review instructions before scoring. Record the sampling probabilities so a deliberately balanced sample is not mistaken for the live distribution.

Review displayed meanings, meaning overlap, and historical relationship separately. Hide classifier predictions and similarity scores while reviewing. Record supporting sources, acceptable alternative answers, disagreements, and unresolved questions. An AI-generated expected answer alone does not establish reference truth. Record who or what reviewed each answer and which claims have independent verification.

Divide development and test cases by word family. Keep both directions of a pair in the same group. Preserve the test set for release evaluation. If we inspect its failures while developing a rule, retire those cases from the untouched test role and record the replacement.

**Measurements**

- Expected pairs found / expected pairs reviewed, including missing entries and missing comparisons separately.
- Acceptable displayed meanings / reviewed comparisons.
- Correct and incorrect labels by category, language pair, and failure type.
- Historical evidence coverage, separate from inference accuracy.
- Review disagreement and unresolved-reference counts.
- Sample sizes and uncertainty intervals that account for related cases; do not count reverse rows as independent observations.

**Completion condition:** a readable baseline report, saved reviewed cases, and a frozen evaluation procedure. Before E1–E4 implementation, record their numerical acceptance limits using this baseline and the intended product use. Until then, those experiments are planned, not ready for release decisions.

**Actual result:** Not run. No reviewed benchmark or linguistic accuracy estimate has been established.

**Decision:** Pending.

## E1 — Displayed meanings and secondary matches

**Hypothesis:** source-entry sense order, usage labels, and explicit translation-sense evidence will select more appropriate ordinary meanings than maximum embedding similarity alone, while retaining genuine secondary correspondences.

**Comparison**

- Control: current highest-scoring active sense pair.
- Variant A: use available translation-sense evidence and usage labels to choose the displayed pair.
- Variant B: add source-entry sense order as a weak preference. Preserve original entry, part-of-speech, and etymology grouping; a combined headword list is not a frequency ranking.
- Keep the current encoder, candidate pairs, and ancestry rules fixed. Retain all evaluated sense matches so display preferences do not erase secondary meanings.

**Measurements:** acceptable headline meanings, ordinary senses recovered, secondary matches retained, and errors by polysemy, generic gloss, homograph, and language pair.

**Acceptance basis:** improve headline-meaning accuracy while staying within the agreed loss limit for valid secondary matches. Treat source order as a tested signal; do not assume a fixed numerical weighting works. Compare each variant separately.

**Numerical limits:** To be recorded after E0, before implementing the variants.

**Actual result:** Not run.

**Decision:** Pending.

## E2 — Separate pair meaning from historical relationship

**Hypothesis:** recording meaning coverage in both directions and historical evidence separately will reduce whole-word misclassification caused by one matching sense or an inconclusive root record.

**Comparison**

- Control: current exclusive category derived from selected scalar scores and roots.
- Variant: retain historical relationship, form resemblance, and the set of supported sense matches separately. Record whether ordinary meanings correspond, overlap is partial, or only secondary meanings match.
- Define the product-label mapping explicitly before scoring it. Missing ancestry may coexist with a useful inferred category.
- Keep the encoder and candidate set fixed. Evaluate E1's accepted sense-selection method as the common input to both arms.
- Do not infer directional historical narrowing from an intermediate similarity score. Keep compounds and generic name definitions as explicit review groups.

**Measurements:** classification errors, useful labeled coverage, meaning-overlap errors, and systematic compound/name errors. Report historical claims and practical learning labels separately.

**Acceptance basis:** improve practical classification at comparable coverage. Renaming unresolved records does not count as a gain. A richer internal representation can still support simple product labels.

**Numerical limits:** To be recorded after E0, before implementing the variant.

**Actual result:** Not run.

**Decision:** Pending.

## E3 — Typed historical links

**Hypothesis:** source claims and recorded ancestry paths can recover valid inherited and borrowing relationships that root equality misses, without creating false relationships from broad derivation links or homographs.

**Comparison**

- Control: current normalized root comparison.
- Variant: compare recorded links with explicit types for inheritance, borrowing, cognate statements, and composition/derivation. Preserve source identity and etymology grouping when identifying historical words.
- Start with available structured claims and supported paths. Do not treat every relationship type as an ancestry edge.
- Mark inferred links separately. Missing graph paths do not establish unrelatedness. Sound similarity alone does not create an attested historical link.
- Keep meanings, the encoder, and candidates fixed.

**Measurements:** correct relationships recovered, false historical links introduced, relationships left unsupported, and results for shared borrowing, unequal ancestry depth, homographs, and partial compound ancestry.

**Acceptance basis:** recover additional reviewed relationships within the agreed false-link limit. Report the full positive and negative test sample; testing only known cognates cannot establish precision.

**Numerical limits:** To be recorded after E0, before implementing the variant.

**Actual result:** Not run.

**Decision:** Pending.

## E4 — Candidate generation and missing vocabulary

**Hypothesis:** translation evidence and sound-correspondence retrieval can recover useful comparisons while reducing the weak matches introduced by short-prefix search.

**Comparison**

- Control: current translations, spelling collisions, and prefix near-matches.
- Variant A: remove the prefix channel and measure exactly which useful comparisons disappear.
- Variant B: add correspondence-based phonetic retrieval to the retained channels.
- Use the independent vocabulary set to measure missed pairs. Assess new candidates with the same fixed classification method.
- Record pronunciation availability and fallback behavior. Include short words and words with different meanings to detect false phonetic matches.
- Retain extended vocabulary during the experiment. Any frequency cutoff requires its own measured coverage decision.

**Measurements:** expected-pair recall, useful-candidate share, missing ordinary vocabulary, record count, runtime, and results by candidate channel and language pair.

**Acceptance basis:** reduce unhelpful candidates while remaining within the agreed useful-pair loss limit. Candidate volume reduction alone is not success. Learn sound correspondences from development data only.

**Numerical limits:** To be recorded after E0, before implementing the variants.

**Actual result:** Not run.

**Decision:** Pending.

## E5 — New-language admission and regression checks

**Hypothesis:** the accepted methods can transfer to a new language with useful coverage and measured accuracy, while preserving existing comparisons except for explicitly reviewed changes.

**Plan**

1. Audit independent vocabulary coverage, usable senses, parts of speech, pronunciation, translations, and etymology in the proposed source edition.
2. Add one language. Dutch and Icelandic remain the planned additions; choose their order after the source audits.
3. Apply the same accepted pipeline stages to old and new pairs.
4. Create development and test cases for every new pairing. Keep calibration cases separate from evaluation cases.
5. Run the existing-language regression checks and the new-language evaluation sets.
6. Check ancestry consistency across supported links. Use contradictions as review signals; do not force semantic equivalence to be transitive.
7. Inspect search results and game-question suitability against the reviewed cases.

**Measurements:** source coverage, expected-pair recall, displayed-meaning accuracy, label accuracy and coverage per new pairing, and every unintended change to existing accepted outputs.

**Acceptance basis:** existing outputs remain unchanged when expansion leaves their inputs and rules unchanged. Any shared-method change must pass the existing evaluation separately. Assess new pairings individually; strong aggregate results cannot conceal a weak pairing. Set evidence requirements by game type rather than requiring recorded ancestry for all questions.

**Numerical limits:** To be recorded from E0 and the source audit, before judging admission.

**Actual result:** Not run under this plan. The previous expansion is not evidence that these admission checks passed.

**Decision:** Pending.

## Recording actual runs

Append a record for each run under its experiment. Preserve failed hypotheses and rejected runs. Never replace an earlier result with the newest result.

### Run record template

| Field | Record |
| --- | --- |
| Experiment and run ID | |
| Date and responsible reviewer | |
| Status | Planned / running / complete |
| Hypothesis tested | |
| Baseline and variant | Exact code/configuration and input references |
| Evaluation set | Version, case counts, and development/test roles |
| Acceptance limits fixed before the run | Metrics, maximum tolerated losses, and interval method |
| Actual measurements | Baseline, variant, difference, uncertainty; broken down by pair and failure type |
| Errors reviewed | New errors, unresolved cases, and reviewed examples |
| Coverage gained or lost | Include pairs excluded or never generated |
| Result | Supported / contradicted / inconclusive |
| Decision | Adopt / revise / reject / investigate further |
| Saved evidence | Report, case results, and reproducible command |
| Next action | Concrete change or additional check, with its purpose |

Each completed run must include a readable account of what improved, what worsened, and why we reached the decision. Saved data supports that account. An inconclusive result must name the missing evidence and the next check needed to resolve it.

## Release decision

After individual experiments pass, test their combined output against the accepted baseline. Check the actual lexicon and game behavior as well as offline records. Review a reproducible sample of changed and unchanged comparisons, and investigate systematic failures before publication.

Record which experiments were accepted, which were rejected, remaining limitations, and the measured trade-offs. The developer is responsible for producing and checking these results; finding counterexamples must not depend on the user browsing the product.

**Current release decision:** No methodological change has been evaluated or approved by this ledger. The reproducible five-language baseline remains the accepted dataset.
