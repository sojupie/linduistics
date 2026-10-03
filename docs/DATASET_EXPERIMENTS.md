# Dataset improvement plan and experiment ledger

**Agreed direction:** separate historical relationship, meaning overlap, and form resemblance; evaluate ordinary vocabulary independently of our generator; preserve useful inference when source evidence is incomplete.

This document records what we intend to test, why, and what actually happens. A planned improvement is a hypothesis until its results support it.

## Where to resume

E0–E4 have development results and readable decisions. E5's Dutch and Icelandic source audits, full pair builds, structural checks and development meaning reviews are complete. Historical evidence was measured across all eleven new-language pairs; 124 of 631 supported cases have source reviews. The remaining historical reviews, game checks, representative E4 task-quality sample, assembled output and reserved-family/product evaluation are unfinished. No improved dataset has been published.

**Discussion checkpoint, 2026-10-04:** the user requested wrapping up this phase before deciding further steps. Do not start another experiment before that discussion. The proposed priority is to validate E2's dictionary evidence against the actual endpoint sense and usage, then improve retrieval of independently expected pairs that already have source entries. Historical evidence needs claim-subject and prose-qualification safeguards before automatic label or game use. Record a separate plan and criteria for each follow-up; do not silently extend an old experiment or tune on reserved results.

The five-language dataset remains the deployed starting point, not a gold standard. An experiment branch or a completed run does not mean its method has been adopted.

### Conclusions for the next discussion

- E1's weak entry-order preference repaired 22 concept displays without losing a previously acceptable concept display. Its effect on broader headline quality was mixed. The old five-point threshold no longer automatically excludes the smaller gain.
- E2's dictionary evidence was the strongest development classification signal: 169/197 compatible labels, versus 118 dense-only and 80 legacy. Those are source-guided agent-review results, not population accuracy. Cross-sense translation bridges, usage and grammatical scope still need correction.
- E3 recovered useful historical evidence. E5 source review also exposed misplaced cognate mentions and missed prose qualifications. Keep the evidence available, but do not promote every recovered path into a historical label or game answer.
- E4's unconditional prefix removal has an unresolved quality trade-off and loses nine independent cognate positives. The fixed-classifier agreement decline does not establish reduced usefulness. Phonetic retrieval recovered additional expected pairs but produced many weak additions.
- E5 demonstrated reproducible expansion while preserving the old rows. It also demonstrated retrieval and display failures, rather than explaining them away as source absence: both accepted headwords exist for 51 missing Dutch comparisons and 146 missing Icelandic comparisons. New-language admission remains open.

Before release, freeze the selected methods, evaluate the reserved families and actual product tasks, and record the benefits and losses separately. Finishing development runs is not the same as finishing that release evaluation.

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
| E4 | A002; reassessment 002/003 | [Original plan](../pipeline/evaluation/E4_PLAN.md), [reassessment plan](../pipeline/evaluation/E4_REASSESSMENT_PLAN.md) | [Original result](../pipeline/evaluation/E4_RUN_A002.md), [reassessment](../pipeline/evaluation/E4_REASSESSMENT_RESULT.md) | Nine independent cognate positives lost; fixed-label proxy confounds candidate and classifier quality | Original rejection preserved; automatic rejection withdrawn; task-quality benefit inconclusive |
| E4 | B001 | [Original phonetic plan](../pipeline/evaluation/E4_PLAN.md) | [Phonetic retrieval report](../pipeline/evaluation/E4_RUN_B001.md) | Eight learned and nine unlearned recoveries under the original test; quality limitations recorded | Revise; evaluate the demonstrated trade-offs under the new policy |
| E5 | Admission 001; development reviews; historical measurement/review | [Admission plan](../pipeline/evaluation/E5_ADMISSION_PLAN.md), revised adoption policy below | [Dutch report](../pipeline/evaluation/E5_DUTCH_TRANSFER_RESULT.md), [complete Icelandic report](../pipeline/evaluation/E5_ICELANDIC_DEVELOPMENT_RESULT.md), [historical source review](../pipeline/evaluation/E5_HISTORY_SOURCE_REVIEW.md) | All eleven meaning reviews complete; 124 historical source reviews saved; retrieval gaps and label/display errors recorded | Admission and final evaluation incomplete; transfer comparisons are diagnostics, not gold-standard acceptance |

### Revised adoption policy

The baseline is a comparison control, not a gold standard. The original internally chosen thresholds remain part of each historical run. Adoption now follows [ADOPTION_CRITERIA_V2.md](../pipeline/evaluation/ADOPTION_CRITERIA_V2.md), recorded before the E4 reassessment. Evaluate independent expected-pair retrieval, displayed sense, historical relationship, modern meaning labels and reproducible broader quality separately. Baseline agreement and unchanged-input preservation diagnose regressions; they do not define improvement. No original failed run is silently relabeled as passing its original criterion.

## Experiment sequence

| ID | Question | Depends on | Current status |
| --- | --- | --- | --- |
| E0 | Where does the baseline succeed, fail, or miss vocabulary? | — | Complete |
| E1 | Can we select better displayed meanings while preserving valid secondary matches? | E0 | Complete; neither variant adopted |
| E2 | Can separate meaning and history results produce better pair classifications? | E0, E1 | Complete development comparison; neither implementation adopted |
| E3 | Can typed historical evidence recover relationships missed by root equality? | E0 | Complete development comparison; evidence layer accepted for final evaluation |
| E4 | Can better candidate generation reduce noise while making worthwhile retrieval trade-offs? | E0 | Development variants measured; reassessment recorded; final task-quality evidence remains |
| E5 | Can we add useful language coverage with independently measured retrieval, display and classification quality? | Selected methods and E0 | Builds complete; development review and final evaluation incomplete |

Start with E0, then E1. Test E2, E3, and E4 separately before evaluating their combined effect. E5 applies the accepted methods to one new language at a time.

### Concrete tests and decision limits

The table below preserves the original limits from the saved [acceptance rules](../pipeline/evaluation/E0_ACCEPTANCE.md), not from the reviews' suggested release percentages. Current adoption uses the revised policy above; the five-point thresholds do not automatically reject or approve improvements. Keep the full protocol alongside each run. A percentage-point gain is an absolute difference between two percentages.

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

**Actual result:** E4-A002 removed 523,280 prefix-only comparisons from the 819,227 undirected baseline rows. Development expected-pair recall fell from 995/1,168 to 986/1,168, losing nine ordinary comparisons. In the frozen open sample, compatible fixed labels fell from 80/197 (40.6%) to 45/128 retained cases (35.2%): −5.45 points, with a paired family interval of −10.90 to −0.34. All removed cases and original review reasons are in the [readable report](../pipeline/evaluation/E4_RUN_A002.md).

**Decision:** Reject unconditional prefix removal. It meets the recall-loss limits but fails the usefulness gate. Keep the original candidate control for E4-B; assess A+B separately. No production generator or database changed.

### E4-B001 — Completed development run, 2026-10-03

**Hypothesis:** learned pronunciation correspondences recover expected comparisons missed by spelling-dependent retrieval, without learning from evaluation families.

**Actual result:** on 588 comparisons in separate evaluation families, the control finds 513, unlearned phonetic retrieval finds 522, and learned retrieval finds 521. The learned arm recovers eight expected comparisons across six language pairs, short of the ten-comparison gate. A+B finds 519. The original-source audit distinguishes recorded IPA from generated fallback; 2,369 of the 4,864 newly retrieved comparisons require some fallback. The unfiltered 60-case sample contains no supported modern meaning overlap: 43 weak matches, 16 potential pronunciation traps, and one restricted trap. All nine expected recoveries from either phonetic arm were reviewed. Two choose a secondary sense that does not suit the expected concept, and the unchanged classifier incorrectly calls `brænde` / `brennen` accidental lookalikes. Fixed categories and relations replay identically on all 1,201 frozen controls. Result artifacts reproduce byte-for-byte. The [report](../pipeline/evaluation/E4_RUN_B001.md) includes every reviewed case and the method's limits.

**Decision:** Revise; do not adopt either phonetic rule. Candidate recall can improve while displays and classifications still fail. The simple correspondence model does not outperform the unlearned arm. Preserve E4's failed variants and proceed to E5 source admission using the accepted generator; do not silently replace prefixes or alter labels during expansion.

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

**Actual result:** The [source audit](../pipeline/evaluation/E5_SOURCE_AUDIT.md) is complete. The unchanged parser accepts 60,067 Dutch and 17,209 Icelandic lemmas. Exact independent concept-form coverage is 170/171 for Dutch and 166/173 for Icelandic. Both are English-edition Wiktionary sources; source pronunciation is available on 72.3% and 84.3% of parsed lemmas, respectively. Unsupported pronunciation fallback remains empty. The old dataset and inputs are unchanged. New pair generation and admission scoring have not yet run.

**Decision:** Proceed to admission tests, Dutch first, Icelandic second. Strong headword coverage permits a measured build; it does not approve displayed meanings, pair labels, or game use. Freeze per-pair development/test cases and numerical gates before scoring, then build Dutch's five old-language pairings and check old-output preservation. Repeat for Icelandic, including Dutch–Icelandic. The earlier expansion does not establish that these checks pass.

### E5 preparation and regression — Completed, 2026-10-03

The [admission plan](../pipeline/evaluation/E5_ADMISSION_PLAN.md) fixes transfer limits and separates them from release approval. The independent panel contains 1,900 new-pair cases: 1,293 development, 574 reserved, and 33 diagnostic cases linking previously separate development/test families. Preparation reproduces exactly. Seven-language translation mining preserves every old translation source reference and all 819,227 old candidate pairs in order. All 1,638,454 old final categories and relations replay exactly. A first replay's incorrect numeric conversion was corrected to the historical PostgreSQL-to-psycopg path and retained as a failed run. The [report](../pipeline/evaluation/E5_PREBUILD_RESULT.md) gives per-pair new translation counts, commands, and limits. Full new-pair sense alignment, reviews, admission decisions, assembled output preservation, and final product checks remain pending.

### E5 Dutch builds — Complete; reviews in progress

All five full Dutch pair builds are complete: 803,662 directed rows with 16,644 attached source claims. Development expected-pair retrieval is 98/115 for Danish, 106/117 for German, 105/116 for English, 96/116 for Norwegian, and 107/118 for Swedish. Danish–Dutch's complete concept review finds 77 suitable displays, 21 wrong senses, and 17 missing comparisons. It passes retrieval/display transfer against the old Danish comparator, but the separate open review finds only 13/32 compatible practical labels, with two unresolved. The [report](../pipeline/evaluation/E5_DUTCH_BUILD_RESULT.md) explains the recurring errors and why a transfer pass does not approve admission. Remaining Dutch reviews, Icelandic builds/reviews, historical/game checks, intervals, assembled preservation and final reserved/product evaluation remain pending.

### E5 Dutch development review and Icelandic build completion

All five Dutch concept and open-vocabulary reviews are complete. Each pair meets the specified retrieval and display transfer limits. Separate open-label agreement remains poor: 13/32 Danish, 11/32 German, 11/34 English, 12/33 Norwegian and 15/34 Swedish, with five unresolved cases in total. Of 70 missing reference comparisons, 51 have both headwords in the accepted source lookup. Separate family intervals, source diagnoses and the recurring display/category failures are recorded in the [complete Dutch review report](../pipeline/evaluation/E5_DUTCH_TRANSFER_RESULT.md). This is a development transfer result, not release approval. All six Icelandic pair builds have finished; their structural verification and linguistic reviews follow.

### E5 Icelandic structural verification and first meaning review

Every row in all six Icelandic builds passed the structural verifier: 216,788 directed rows, preserved source inventories and matching inverse comparisons. All six development review packets are frozen. The completed Danish–Icelandic review finds 73 suitable displays, 11 wrong displays and 33 missing expected comparisons. Retrieval falls 13.17 points against the old Danish comparator and fails the five-point transfer limit. Open-label agreement is 17/33 with one unresolved. The [Icelandic report](../pipeline/evaluation/E5_ICELANDIC_BUILD_RESULT.md) records the builds, first result and remaining checks. No Icelandic admission or release approval follows from structural verification.

### E5 German and English Icelandic reviews

German–Icelandic finds 87/119 expected comparisons with 71 suitable displays and 16 wrong displays. English–Icelandic finds 80/118 with 54 suitable and 26 wrong. Retrieval declines 10.98 and 17.05 points against their old comparators; both fail transfer. Open-label agreement is 11/33 and 7/32, with one unresolved case each. Across the three completed Icelandic reviews, 75 of 103 missing comparisons have both accepted source headwords. Separate family intervals, all missing-source diagnoses and recurring selection failures are recorded in the [updated Icelandic report](../pipeline/evaluation/E5_ICELANDIC_BUILD_RESULT.md). Norwegian, Dutch and Swedish reviews remain. No word-specific changes or live publication were made.

### E4 reassessment under the revised adoption policy

The original E4-A002 criterion and rejection remain historical. The automatic rejection based on unchanged classifier agreement is withdrawn; candidate-quality improvement remains inconclusive. All nine lost development concept comparisons are independently annotated IE-CoR cognates. In the open diagnostic sample, the retained set includes 105 meaning-overlap comparisons, 71 with incompatible fixed labels. The removed set includes six meaning overlaps, 15 related-form comparisons and two supported/related name-form comparisons, as well as weak associations and potentially useful disjoint-form contrasts. Prefix removal also retains translation-polysemy and entry-identity failures. The [reassessment report](../pipeline/evaluation/E4_REASSESSMENT_RESULT.md) separates these outcomes, preserves every case, and specifies the representative task-quality measurement still needed. No new threshold, production change or publication was introduced.

### E5 complete Icelandic development meaning review

All six Icelandic reviews are complete: 510/711 independently expected concept comparisons are retrieved, with 424 suitable displays and 86 wrong displays. Of 201 missing comparisons, 146 have both accepted source headwords. Norwegian has 73 suitable displays of 83 found, Dutch 82/89 and Swedish 71/87; their separate open-label agreements are 13/33, 14/34 and 15/30. All original transfer-limit results remain saved as diagnostics, without automatically deciding adoption under the revised policy. The [complete report](../pipeline/evaluation/E5_ICELANDIC_DEVELOPMENT_RESULT.md) separates independent retrieval, display and modern-label results, preserves uncertainty, and identifies historical/game/reserved/product checks still required.

### E5 historical evidence measurement under revised criteria

The unchanged E3 evidence method evaluated all 1,293 new-language development concept cases and 372 broader sample cases. Retrieval, suitable displays and historical paths are recorded separately in the [historical measurement report](../pipeline/evaluation/E5_HISTORY_RESULT.md). Both selected-entry and full-inventory scopes are preserved; 631 cases with selected-entry non-component evidence await source review. These are evidence candidates, not validated historical classifications or admission passes. Reserved cases and the live dataset remain unchanged.

### E5 historical source review: first two groups complete

All 109 supported broader-sample cases and all 15 supported different-expert-set concept cases have source reviews. The [review report](../pipeline/evaluation/E5_HISTORY_SOURCE_REVIEW.md) records misplaced cognate mentions, missing prose qualification and path-specific formation limits. A cloud/wolk edge actually refers to welkin; hin/hinn has a valid Norse path alongside a mis-scoped Germanic comparison. Other histories remain supported despite wrong selected meanings or different benchmark expert sets. Original counts remain evidence-retrieval measurements, not verified precision. There are 507 supported concept cases still to review; no automatic history promotion or live publication is approved.

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

After selecting methods with demonstrated benefits and explicit trade-offs, test their combined output against independent references and reproducible broader samples. Compare the starting dataset to identify changes and losses. Check the actual lexicon and game behavior as well as offline records. Review changed and unchanged comparisons, and investigate systematic failures before publication.

Record which experiments were accepted, which were rejected, remaining limitations, and the measured trade-offs. The developer is responsible for producing and checking these results; finding counterexamples must not depend on the user browsing the product.

**Current release decision:** No new dataset is approved for publication. E1 and E2's original decisions remain recorded; their numerical gain thresholds no longer automatically determine adoption. E3's evidence layer is selected for final evaluation. E4's automatic proxy-based rejection is withdrawn: unconditional removal has a mixed result and its task-quality benefit remains inconclusive; phonetic retrieval also needs its quality trade-offs assessed. E5 development meaning reviews and historical path measurement are complete; source review, game checks and final evaluation remain incomplete. Transfer results are diagnostics, not proof of admission quality. The reproduced five-language dataset remains the deployed starting point, not a gold standard. After methods are fixed, evaluate independent expected vocabulary and history, displayed senses, meaning labels and broader samples on reserved families, then check actual lexicon, search, API and game behavior before deciding on release.
