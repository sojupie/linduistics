# H1: fixed ordinary-headline confirmation

**Post-result adoption audit:** the [full product assessment](HEADLINE_ADOPTION_AUDIT.md)
supersedes the preview-only next step below. It reviews all 182 available
original/proposed pairs and all 57 changes. The original scores remain recorded,
but they do not establish only two broader product regressions. Explicit
selection faults need engineering fixes; another person reviewing the sample
is not a prerequisite for doing that work.

Date: 2026-10-25. Decision: **keep F frozen and provide a local preview**. This run supports better introductory definitions, with specific losses. It does not approve a database replacement or new classification rules.

## What was tested

The [plan](HEADLINE_CONFIRMATION_PLAN.md) was committed as `08d82aa` before opening the reserved definitions or scoring this sample. The selector stayed at `816ad8d`, variant F. The candidate changes which existing definitions introduce a word pair. It retains the old match, all source senses, scores, candidates, historical relations and categories.

The independent vocabulary reference is IE-CoR. Its reserved panel supplies 544 expected comparisons. It can test expected vocabulary and documented cognacy within its limited basic-vocabulary scope. This run uses its concept descriptions to judge displayed definitions. It does **not** independently validate modern polysemy, false friends, ordinary sense frequency, every source entry, or game questions. Historical classifications were not retested here.

I reviewed 100 reserved cases and 100 broader comparison rows. Both panels have ten cases per canonical language pair. The broader rows were sampled from all 819,227 canonical comparisons, without selecting changes or categories. Each row has a saved inclusion weight. All 100 broader cases have unknown assignments in the small family registry: their results are exploratory, not a held-out-family test.

Packets hid scores, classifier predictions and version identities. I recorded observations before reading the arm map. I knew the method, and these remain source-guided agent judgments. Forty cases were allocated for a second review before scoring. That review is still pending. No independent reviewer is claimed.

## Findings, separated by question

### 1. Retrieval

Both versions retrieve **446/544 (82.0%)** expected reserved comparisons. All 446 reproduce the exact reference spelling and saved definitions. The other **98** have both headwords available but no expected comparison. Eighteen of the sampled hundred are missing, and remain in the overall denominator. Headline selection cannot repair retrieval.

### 2. Displayed sense

| Panel | Original | F | Gains | Losses | Changed displays |
| --- | ---: | ---: | ---: | ---: | ---: |
| Reserved concept fit, all 100 sampled cases | 57 acceptable | 75 acceptable | 21 | 3 | 30 |
| Broader introductory definitions, 100 sampled rows | 76 supported | 87 supported | 13 | 2 | 27 |

Among the 82 found reserved sample cases, the counts are **57/82 (69.5%) → 75/82 (91.5%)**. This conditional view supplements the missing-inclusive result; it does not replace it.

Using the recorded stratum weights, reserved suitable displays rise **57.0% → 75.0%**, a paired gain of **18.0 percentage points**, sampling standard error **4.3 points**. The approximate normal 95% sampling interval for the gain is **9.6 to 26.4 points**. This estimates performance on the fixed 544-case reference frame, not all vocabulary. Review error is not included.

For the broader canonical-row frame, weighted plausible introductions rise **67.5% → 78.2%**, a paired gain of **10.7 points**, standard error **6.1 points**. Its approximate interval is **−1.2 to 22.7 points**. The small sample does not establish a precise dataset-wide gain. Equal quotas deliberately give small language pairs more sample rows, so raw percentages and weighted estimates differ.

The broader original has 19 secondary/restricted, 3 contradicted and 2 unresolved displays. F has 8 secondary/restricted, 2 contradicted and 3 unresolved. Treating unresolved cases as potentially supported gives upper bounds of 72.2% for the original and 86.0% for F; they are never silently counted as proven successes. “Supported” means a plausible substantive introduction, not proof of the most frequent sense. A technical term's normal technical definition can be supported. Obsolete-only fallbacks remain qualified, rather than invented modern meanings.

### 3. Source entry and selected meaning

Every displayed gloss in both versions belongs to its supplied source inventory: **zero membership errors**. That does not independently prove the entry or definition correct. The manual source check records 95 source-supported and 5 unresolved pairs in each version. Those unresolved entries/fragments remain visible.

Selected meaning alignment was judged separately from introductory quality. In the broad sample the original displays have 29 shared, 13 contextual/partial, 9 related-form, 4 documented name-form, 44 different and 1 unresolved relationship. F has 28 shared, 10 contextual/partial, 8 related-form, 4 name-form, 49 different and 1 unresolved. These are observations about the **selected definitions**, not new labels for the words' full meaning inventories. They are not scored against the unchanged classifier.

For example, **Wasser/tiss** changes from urine/pee to water/pee. The ordinary introduction improves while that selected overlap disappears. Retaining the urine match preserves the valid evidence. Likewise, name forms do not establish shared individual identity, and a noun/adjective relation need not be an equivalent meaning. The method must carry these distinctions into any future classification work.

### 4. History, modern classification and games

Historical relations and modern category fields are byte-for-byte inherited in the preview. This run establishes **no classification accuracy gain**. It does not certify game eligibility, question definitions, distractors or scoring. Those need their own evaluation before combined adoption. A valid secondary translation remains useful evidence even if it should not introduce the headword.

## Remaining failures and trade-offs

The three reserved losses are **tun/do**, **machen/do**, and **nail/nagel**. F selects the English auxiliary do for the first two, losing the action concept. For nail it prefers a broader animal plate/claw definition over the reference's human/ape finger-and-toe definition. These are entry/use and scope problems, not missing definitions.

The two broad losses are **spare/sparare** (bowling spare replaces the save/saver relation) and **Provenzalisch/occitan** (language/person priority becomes unresolved). Other failures remain: **fill/filt** still chooses obscure noun senses; **gallito/gallion** retains a truncated bird gloss; **desa/deß** retains an obsolete spelling redirect. F is not tuned on these now-exposed cases. Their exact displays and all other changes are in the [case account](HEADLINE_CONFIRMATION_CASES.md).

## Local preview

Open **http://127.0.0.1:5173/lexicon-headline-preview** in the development server. It includes all 200 sampled cases, including the 18 explicit missing states, plus water/Wasser as a separately labeled, previously exposed development diagnostic. That diagnostic is not included in H1's scores.

The page reuses `WordPairCard`, existing typography, borders, color tokens and native selection. It adds no CSS, dependency, global navigation item or production dataset path. A small optional card-label API identifies the displayed number as the **stored original-match similarity**; the same number is not presented as a new headline score. URL case keys select the exact frozen case and are not database IDs. Unknown keys show an explicit absent state rather than another pair.

The route reads frozen artifacts, so it works without PostgreSQL. It demonstrates presentation only; it is not a live API integration. Production builds redirect this route to the lexicon and exclude the preview data/chunk. Search results and game code are unchanged.

Checked in the actual browser: water/H₂O versus retained urine; switching to exact Wasser/tiss; explicit missing støv/Staub; 390-pixel mobile layout without horizontal overflow; normal viewport restored. A saved [screenshot](headline-confirmation002/preview.jpg) records the result.

## Reproduction and audit

`headline_verify.py prepare` freezes retrieval, sample, source rows and second-review allocation. `score` resolves the inherited English sources and computes the full sense matrices with the pinned offline MiniLM. `headline_confirm_report.py` decodes the recorded reviews; `headline_preview.py` exports the local page data. Existing source helpers and the finite-population estimator are reused.

Run 001 stopped while writing its protocol because an output path was relative. No scoring or review occurred. Its source and partial artifacts are preserved. Run 002 fixed the path handling and avoided repeatedly constructing unused random generators; its sample, retrieval and rows are byte-identical to 001. The method and selection did not change.

A separate-directory replay from saved matrices/source associations reproduces **matrix cache, predictions, packet and arm map byte-for-byte**. It does not establish encoder bitwise stability across hardware. All 182 stored original display cells reproduce within **3.58×10⁻⁷** of the stored score. Thirty full-matrix maxima differ from stored scores because the old selection did not always choose the global maximum; those maxima do not replace the stored control. Model revision, package versions, inputs and source hashes are saved.

Selector and translation-evidence self-checks pass. The frontend production build passes. Lint exits successfully with five existing warnings in unchanged lexicon/header code. The production server also redirects the preview URL to `/lexicon`. The frozen selector file still matches commit `816ad8d`, and the baseline SHA-256 remains `a7e2bfe3ffa75931c9134f3e570eec53cbf644713b738bedc055fdc9b44b120f`. No database was started or written for this work.

## Adoption decision and next check

The planned condition for a reversible preview is met: clear reserved improvement, a broader result favoring F with wide uncertainty, and explicit failures. This is not a new numerical pass threshold and not approval to publish a dataset.

Next, obtain the allocated second review to challenge ordinary-sense and source-identity judgments. Before live integration, define separate fields for ordinary headline, retained sense matches and their scores; keep classifier input unchanged until its independent evaluation. Do not feed ordinary water/pee into the classifier as though it replaced the known urine/pee overlap. A future selector revision needs a fresh confirmation set; H1 is now exposed and cannot serve as unseen evidence again.
