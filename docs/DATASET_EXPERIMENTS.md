# Dataset improvement plan and experiment ledger

**Agreed direction:** separate historical relationship, meaning overlap, and form resemblance; evaluate ordinary vocabulary independently of our generator; preserve useful inference when source evidence is incomplete.

This document records what we intend to test, why, and what actually happens. A planned improvement is a hypothesis until its results support it.

## Where to resume

E0 established an exploratory reference set. E1 tested display selection and adopted neither variant. E2 tested dense-only and dictionary-evidence meaning profiles; neither implementation is adopted. E3's source-scoped historical evidence passes its development recovery gate and is accepted for final evaluation. E4–E5 remain planned.

**Next action:** run E4's candidate-generation comparisons independently, keeping baseline classification fixed. Carry E3's evidence layer into the final reserved-family evaluation, preserving entry scope and uncertainty. E2's [report](../pipeline/evaluation/E2_RUN002.md) records a separate follow-up: validate dictionary evidence against the actual endpoint sense, including current usage and contradictory qualifications, before adopting it.

The five-language baseline remains accepted. An experiment branch or a completed run does not mean its method has been adopted.

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

## How the reviews become experiments

The agreement below concerns problems and testable directions. It does not establish that either review's proposed implementation will work.

| Agreement from the reviews | Where it is discussed | Experiment | Evidence needed for a decision |
| --- | --- | --- | --- |
| Evaluate against vocabulary chosen independently of the generator. Counts and familiar examples do not measure quality. | Sonnet: verdict, annotation methodology, experiment 1. Gemini: benchmark architecture and frequency-grounded coverage. | E0 | Reviewed expected comparisons, missed comparisons, and baseline errors, with sampling and source records. |
| A single best sense match can give an unsuitable headline meaning. Preserve other valid matches. | Sonnet: single winning sense and meaning profiles. Gemini: greedy sense alignment and primary versus maximal alignment. | E1 | More acceptable displayed meanings without an unacceptable loss of valid secondary matches. |
| Historical relationship, current meaning, and form resemblance answer different questions. | Sonnet: separate dimensions. Gemini: orthogonal feature space. | E2 | Better practical labels at comparable useful coverage, including partial overlap, names, and compounds. |
| Missing roots and unequal root strings do not prove unrelatedness. Use typed evidence and retain useful inference. | Sonnet: missing evidence and typed ancestry. Gemini: string-based roots and historical links. | E3 | Additional correct relationships, measured alongside false links and unsupported claims. |
| Prefix search introduces noise and can miss regular sound changes. Measure both effects before replacing it. | Sonnet: candidate generation experiment. Gemini: prefix bias and multiple candidate channels. | E4 | Useful-pair recall and candidate quality for each channel, including comparisons absent from the baseline. |
| Related words must stay together in evaluation splits; new languages need their own checks. | Sonnet: family splits and distribution shift. Gemini: leakage prevention and new-language evaluation. | E0, E5 | Saved family groups, untouched test cases, per-pair results, and existing-language regression checks. |

The reviews also propose stricter game evidence, removing names, vocabulary cutoffs, specific models, and fixed sample sizes or thresholds. These remain proposals. We will test the relevant failure types before making those product or implementation choices.

## Required output from each experiment

An experiment is complete when this ledger links to all four items:

1. **Saved plan:** hypothesis, control and variant, input versions, evaluation cases, and acceptance limits fixed before scoring the variant.
2. **Reproducible run:** exact command, code revision, configuration, and saved results. Record whether the run changed any published data.
3. **Readable comparison:** baseline and variant measurements, gains, losses, unresolved cases, and results by language pair and failure type.
4. **Decision:** adopt, revise, or reject, with a reason and a concrete next action. A completed run can have an inconclusive result.

Do not mark a hypothesis supported because the code runs, category proportions look plausible, or known examples improve. Do not mark an experiment complete when its only output is a data dump awaiting the user's inspection.

### Result index

Update this table after each run. Keep earlier run records below the corresponding experiment.

| Experiment | Run ID | Plan/configuration | Report and case results | Outcome | Decision |
| --- | --- | --- | --- | --- | --- |
| E0 | E0-001 | [Frozen protocol](../pipeline/evaluation/e0_protocol.json), [acceptance rules](../pipeline/evaluation/E0_ACCEPTANCE.md) | [Baseline evaluation report](../pipeline/evaluation/E0_RUN001.md) | Development review, coverage, diagnostic groups, and procedure recorded | Use for exploratory E1-E4 comparisons; preserve test families |
| E1 | E1-003 | [Saved variants and corrections](../pipeline/evaluation/E1_PLAN.md) | [Display-selection report](../pipeline/evaluation/E1_RUN003.md) | A: no concept gain. B: +2.2 points, below the five-point gate; one open-sample match lost | Reject A as tested; revise B without adopting it |
| E2 | E2-001 | [Frozen meaning-profile plan](../pipeline/evaluation/E2_PLAN.md) | [Dense-only report and case results](../pipeline/evaluation/e2-run001/README.md) | 118/197 compatible, versus 80/197 legacy and 114/197 always-partial | Revise; do not adopt |
| E2 | E2-002 | [Saved dictionary-evidence plan](../pipeline/evaluation/E2_EVIDENCE_PLAN.md) | [Dictionary-evidence report](../pipeline/evaluation/E2_RUN002.md) | 169/197 compatible; +25.9 points over dense-only; six new dense-control errors | Revise endpoint-sense checks; do not adopt |
| E3 | E3-003 | [Typed-history plan](../pipeline/evaluation/E3_PLAN.md), [shared sources](../pipeline/evaluation/E3_SOURCE_PLAN.md), [caveats](../pipeline/evaluation/E3_CAVEAT_PLAN.md) | [Historical-evidence report](../pipeline/evaluation/E3_RUN003.md) | Five reviewed recoveries across three pairs; source scope and caveats retained | Accept evidence layer for final evaluation; no label replacement or publication |
| E4 | — | E0 complete; candidate variants specified below | Not run | Not measured | Pending |
| E5 | — | Awaiting accepted methods and source audit | Not run | Not measured | Pending |

## Experiment sequence

| ID | Question | Depends on | Current status |
| --- | --- | --- | --- |
| E0 | Where does the baseline succeed, fail, or miss vocabulary? | — | Complete |
| E1 | Can we select better displayed meanings while preserving valid secondary matches? | E0 | Complete; neither variant adopted |
| E2 | Can separate meaning and history results produce better pair classifications? | E0, E1 | Complete development comparison; neither implementation adopted |
| E3 | Can typed historical evidence recover relationships missed by root equality? | E0 | Complete development comparison; evidence layer accepted for final evaluation |
| E4 | Can better candidate generation reduce noise without losing useful comparisons? | E0 | Planned |
| E5 | Can we add a language without degrading existing comparisons or hiding new errors? | Accepted methods and E0 | Planned |

Start with E0, then E1. Test E2, E3, and E4 separately before evaluating their combined effect. E5 applies the accepted methods to one new language at a time.

### Concrete tests and decision limits

These limits come from the saved [acceptance rules](../pipeline/evaluation/E0_ACCEPTANCE.md), not from the reviews' suggested release percentages. Keep the full protocol alongside each run. A percentage-point gain is an absolute difference between two percentages.

| Experiment | Concrete change to test | Evidence required before adoption |
| --- | --- | --- |
| E1 | Prefer usable ordinary senses; test entry-local sense order separately. Preserve secondary matches. | At least five percentage points more acceptable displays, with a positive paired uncertainty interval; satisfy the saved secondary-match and subgroup-loss limits. Neither tested variant passed. |
| E2 | Record meaning matches, grammatical context, history, and form separately. Test dictionary translation evidence alongside embedding scores. | At least five points more compatible practical labels, with a positive paired interval; useful coverage loss at most two points. Identify all reviewed generic-name and whole-compound errors. Compare with a trivial predictor as well as the legacy rules. |
| E3 | Resolve typed inheritance, borrowing, and cognate links while preserving entry identity and source references. | Recover at least five additional reviewed, source-supported relationships across at least two language pairs; introduce no false path in the reviewed controls. Report inferred and documented relationships separately. |
| E4 | First remove prefix retrieval; separately add retrieval based on sound correspondences. Keep classification fixed. | Expected-pair recall loss at most two points overall and five per language pair. Prefix removal needs at least five points better candidate usefulness with a positive paired interval. Added phonetic retrieval must recover at least ten missed expected pairs across at least two language pairs. |
| E5 | Audit Dutch and Icelandic sources, then process one new language at a time through accepted stages. | Fix new-pair coverage and quality limits after the source audit, before scoring admission. Existing outputs must stay byte-equivalent when their inputs and rules are unchanged. Review each new language pairing separately. |

For every test, save the input hashes, code revision, command, parameters, family split, and case results. Report losses and unresolved cases alongside gains. Review the failures ourselves and explain the result in prose; the user should not have to discover them by browsing the lexicon or reading JSON.

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

**Actual result:** Complete as an exploratory baseline evaluation. Of 1,712 independently sourced concept comparisons, 1,441 exist under exact reference spellings. Recorded inflections and explicit alternative spellings recover 12 further existing comparisons. Both displayed definitions suit the intended concept in 630 of 995 reviewed development comparisons (63.3%; family-bootstrap interval 58.2%–68.3%). All 207 open-vocabulary development cases are reviewed, with unresolved cases and diagnostic groups retained. These source-guided agent judgments do not establish independent human accuracy or accuracy across the whole dictionary. See the [readable report](../pipeline/evaluation/E0_RUN001.md).

**Decision:** Use E0 for exploratory comparisons under the [saved acceptance rules](../pipeline/evaluation/E0_ACCEPTANCE.md). Preserve reserved test families for the combined evaluation. No replacement method or published dataset change has been approved.

### E0-001 — Earlier interim record, 2026-10-03

This checkpoint is preserved for history. The completion record below supersedes its status, remaining work, and unset acceptance limits.

| Field | Record |
| --- | --- |
| Status and reviewer | Running; Codex performed source-guided review. No independent human review has been collected. |
| Hypothesis tested | Independent vocabulary and blinded review expose failures that dataset totals and familiar examples conceal. |
| Control and inputs | Unchanged five-language baseline identified above; IE-CoR 1.1 concepts and expert annotations; pinned FrequencyWords source. Input versions and hashes are saved in the run protocols and [input manifest](../pipeline/evaluation/e0_input_manifest.json). |
| Actual measurements | 1,441 of 1,712 expected concept comparisons found. Both displayed meanings matched the intended concept in 630 of 995 reviewed development comparisons. The run report provides counts by language pair, uncertainty, and exclusions. |
| Additional review | 25 of 207 open-vocabulary development cases reviewed. These include omitted dictionary senses, named-entity identity, borrowing, and partial overlap. No accuracy estimate is claimed for this unfinished review. |
| Interim interpretation | The baseline has measured coverage gaps and frequent concept-conditioned display failures. This supports testing candidate generation and sense selection; it does not yet establish which replacement works. |
| Acceptance limits | E1-E4 numerical limits remain unset. Fix them after E0 and before implementing or scoring variants. |
| Published-data changes | None. The baseline and live database remain unchanged. |
| Decision and next action | Continue the remaining 182 open-vocabulary reviews, separate the planned hard-case groups, resolve reference-form notation, and freeze acceptance limits. Then compare E1 variants against the saved judgments. |

Keep this interim record when appending the completed E0 result. Later findings must not erase what was known at this point.

**Subsequent E0-001 checkpoint, 2026-10-03:** Open-vocabulary review now covers 100 of 207 development cases, with all packet hashes and development roles checked. The [run report](../pipeline/evaluation/E0_RUN001.md) records controls for valid matches, translated-gloss ambiguity, inactive selected definitions, historical agreement without current equivalence, and grammatical differences. The remaining 107 cases, hard-case groups, reference notation, and numerical gates are still pending. No classifier or published-data change has been adopted.

### E0-001 — Completion record, 2026-10-03

All 207 open-vocabulary development cases and 995 found development concept comparisons are reviewed. Source-guided agent judgments, unresolved readings, family roles, diagnostic groups, input hashes, and source-gap checks are saved. Explicit alternate spellings recover eight existing comparisons in addition to four recorded-inflection recoveries; the original exact-spelling coverage remains preserved.

**Result:** The baseline hypothesis is supported as a diagnosis: independent coverage checks and blinded review expose systematic missing comparisons and unsuitable displayed meanings. No replacement method has yet been shown better. The completed review does not establish expert linguistic accuracy or accuracy across the whole dictionary.

**Decision:** Use the saved evaluation procedure for exploratory experiments. [E0_ACCEPTANCE.md](../pipeline/evaluation/E0_ACCEPTANCE.md) fixes the numerical gates before E1-E4 variants. Begin E1 on its branch, holding candidates, encoder, maximum semantic score, and ancestry classification fixed. Preserve valid secondary records and inspect losses. Reserved test families remain for the combined evaluation after methods are frozen. No published data changed.

## E1 — Displayed meanings and secondary matches

**Hypothesis:** source-entry sense order, usage labels, and explicit translation-sense evidence will select more appropriate ordinary meanings than maximum embedding similarity alone, while retaining genuine secondary correspondences.

**Comparison**

- Control: current highest-scoring active sense pair.
- Variant A: use available translation-sense evidence and usage labels to choose the displayed pair.
- Variant B: add source-entry sense order as a weak preference. Preserve original entry, part-of-speech, and etymology grouping; a combined headword list is not a frequency ranking.
- Keep the current encoder, candidate pairs, and ancestry rules fixed. Retain all evaluated sense matches so display preferences do not erase secondary meanings.

**Measurements:** acceptable headline meanings, ordinary senses recovered, secondary matches retained, and errors by polysemy, generic gloss, homograph, and language pair.

**Acceptance basis:** improve headline-meaning accuracy while staying within the agreed loss limit for valid secondary matches. Treat source order as a tested signal; do not assume a fixed numerical weighting works. Compare each variant separately.

**Numerical limits:** Fixed in [E0_ACCEPTANCE.md](../pipeline/evaluation/E0_ACCEPTANCE.md), E1 section.

**Actual result:** E1-003 preserved the exact E0 control rows and all secondary sense records. Usage preference alone remained at 630/995 acceptable concept displays. Adding a weak entry-order preference reached 652/995: a 2.21-point gain with a paired family interval of 1.36–3.20 points. It recovered 22 concept cases without losing a previously acceptable one, but remained below the fixed five-point gain threshold. In 207 open-vocabulary cases, it repaired one shared headline and broke another; the shared-headline count stayed at 96. See the [readable report](../pipeline/evaluation/E1_RUN003.md).

**Decision:** Reject A as tested; revise B without adopting it. Keep baseline display selection in both E2 arms. Preserve E1-001 and E1-002 as failed control-reconstruction runs, rather than counting their apparent differences as linguistic gains. All original scores, categories, senses, and source claims remain unchanged. Reserved test families are unopened.

### E1-003 — Completed development run, 2026-10-03

The plan, code, exact input selection, new concept judgments, changed open-vocabulary reviews, paired measurements, subgroup losses, and failed-run corrections are linked in the [run report](../pipeline/evaluation/E1_RUN003.md). The source-order hypothesis has evidence of a modest concept-conditioned effect, but not enough to approve this selector. Entry order can favor the first meaning of a separate homograph over a later suitable meaning. E2 must assess grammatical context and meaning coverage separately from ancestry, without claiming an unadopted E1 gain.

## E2 — Separate pair meaning from historical relationship

**Hypothesis:** recording meaning coverage in both directions and historical evidence separately will reduce whole-word misclassification caused by one matching sense or an inconclusive root record.

**Comparison**

- Control: current exclusive category derived from selected scalar scores and roots.
- Variant: retain historical relationship, form resemblance, and the set of supported sense matches separately. Record whether ordinary meanings correspond, overlap is partial, or only secondary meanings match.
- Define the product-label mapping explicitly before scoring it. Missing ancestry may coexist with a useful inferred category.
- Keep the encoder and candidate set fixed. Use the same display-selection method in both arms. E1-003 adopted neither variant, so the common input remains baseline display selection.
- Do not infer directional historical narrowing from an intermediate similarity score. Keep compounds and generic name definitions as explicit review groups.

**Measurements:** classification errors, useful labeled coverage, meaning-overlap errors, and systematic compound/name errors. Report historical claims and practical learning labels separately.

**Acceptance basis:** improve practical classification at comparable coverage. Renaming unresolved records does not count as a gain. A richer internal representation can still support simple product labels.

**Numerical limits:** Fixed in [E0_ACCEPTANCE.md](../pipeline/evaluation/E0_ACCEPTANCE.md), E2 section.

**Actual result:** E2-001 improved compatibility from 80/197 (40.6%) to 118/197 (59.9%). Its gain over legacy labels was 19.3 percentage points, with a paired family interval of 12.0–26.5. It recovered 48 cases and lost 10. However, predicting partial overlap for every case scored 114/197 (57.9%). The dense-only method's two-point gain over that control had an interval of −10.3–13.7, so the headline improvement does not establish a useful classifier. Ten unresolved reference cases remain outside scoring. These are source-guided agent judgments, not independently reviewed human truth.

**Decision:** Revise; do not adopt E2-001. Its saved coverage count includes warning labels and must not be read as resolved meaning coverage. E2-002 will report actionable labels and warnings separately. Preserve the original run and reference mapping.

### E2-001 — Completed development run, 2026-10-03

The [readable report](../pipeline/evaluation/e2-run001/README.md) records the errors, measurements, controls, reproduction command, and unchanged inputs. Ordinary translated glosses can receive low embedding scores even when they record the same meaning. Lowering the threshold also risks admitting nearby but distinct concepts. This supports testing an additional source of evidence; it does not establish that the proposed dictionary-evidence variant works.

### E2-002 — Completed development run, 2026-10-03

**Hypothesis:** explicit translated glosses and validated source-sense translation links recover ordinary overlap missed by embedding scores, without inventing exact sense matches or ancestry.

**Change:** add this evidence under the [saved plan](../pipeline/evaluation/E2_EVIDENCE_PLAN.md). Record its scope and original source references. A word-level translation can support possible overlap without proving that every sense is equivalent. Reject generic-name evidence and incompatible grammatical or contextual matches.

**Actual result:** 169/197 compatible labels (85.8%), versus 80 legacy, 118 dense-only, and 114 always-partial. The 25.9-point gain over dense-only has a paired family interval of 18.5–33.3; the gain over always-partial is 27.9 points (20.5–35.2). It gains 57 dense-control cases and loses six. Actionable coverage is 194/207; seven name warnings and six missing-modern-sense warnings are reported separately. All 28 remaining errors and ten unresolved cases are included in the [readable report](../pipeline/evaluation/E2_RUN002.md). Reproduction produced byte-identical result artifacts.

**Decision:** Revise; do not adopt. The development gates pass, but translation references still bridge different endpoint senses or inactive uses. This supports dictionary evidence as a signal, not this implementation as a finished classifier. A later meaning experiment must confirm the endpoint sense and current usage. Continue E3 independently using baseline meaning and display inputs. No source scores, dataset records, or live database contents changed.

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

**Numerical limits:** Fixed in [E0_ACCEPTANCE.md](../pipeline/evaluation/E0_ACCEPTANCE.md), E3 section.

**Actual result:** E3-001 recovered three source-reviewed relationships and missed the five-case gate. E3-002 added shared sources with unspecified transmission and separate component records. E3-003 retained source uncertainty and original etymology prose. After excluding an inferred-history candidate, a name/common-word scope mismatch, and unknown-route evidence from the confirmed gate, five reviewed recoveries remain across Danish–German, German–English, and German–Norwegian. No confirmed whole-word claim appeared in the 19 reviewed component controls. Reproduction artifacts match; elapsed time is reported separately. The [report](../pipeline/evaluation/E3_RUN003.md) includes the expert-set disagreements and source-supported misses.

**Decision:** Accept the source-scoped evidence layer for final reserved-family evaluation. It does not replace learner labels or authorize publication. Broad derivation statements remain unspecified transmission, components remain partial, and missing paths do not establish unrelatedness. Consumers must use the relevant entry and meaning context rather than treating any graph relationship as whole-word cognacy. Preserve E3-001 and E3-002 as earlier diagnostic variants.

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

**Numerical limits:** Fixed in [E0_ACCEPTANCE.md](../pipeline/evaluation/E0_ACCEPTANCE.md), E4 section.

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

**Current release decision:** Neither E1 variant nor either E2 implementation is approved. E3's evidence layer is accepted for final evaluation, not publication. E4–E5 remain untested. The reproducible five-language baseline remains the accepted dataset. After methods are fixed, evaluate their combined output on reserved families and check actual lexicon, search, API, and game behavior before recording a release decision.
