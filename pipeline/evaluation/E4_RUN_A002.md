# E4-A002: removing prefixes does not pass

**Decision: reject unconditional prefix removal.** It loses ordinary comparisons and does not improve the frozen usefulness measure. Retain this failed hypothesis; a smaller table is not evidence of a better dataset.

## What changed

The control contains translation links, exact spelling collisions, and prefix matches. A retains the first two channels. All 819,227 undirected baseline rows matched the builder's channel rules. No unexplained row required a guessed origin. Translation takes precedence when a pair also shares spelling.

| Channel | Undirected comparisons |
| --- | ---: |
| Translation | 271,495 |
| Exact spelling, without a translation link | 24,452 |
| Prefix, without either earlier channel | 523,280 |

Removing prefixes would retain 295,947 comparisons, a 63.9% reduction. These are generated comparison counts, not vocabulary proportions or accuracy measurements.

## Expected vocabulary lost

Among all 1,168 development concept comparisons, recall falls from 995/1,168 (85.2%) to 986/1,168 (84.4%). The loss is 0.77 percentage points. The largest pair loss is Norwegian–Swedish: four of 118 cases, or 3.39 points. These losses remain within the predeclared recall limits, but are real vocabulary losses.

| Languages | Lost comparison | Expected concept |
| --- | --- | --- |
| Norwegian–Swedish | nært / nära | near |
| Norwegian–Swedish | rød / röd | red |
| Norwegian–Swedish | snø / snö | snow |
| Danish–Swedish | tunge / tunga | tongue |
| Danish–Norwegian | vand / vann | water |
| Norwegian–Swedish | komme / komma | come |
| Danish–Norwegian | grøn / grønn | green |
| Danish–German | høre / hören | hear |
| Danish–Swedish | høre / höra | hear |

These are candidate losses, independent of whether the baseline selected the right displayed sense. Missing original comparisons remain in the denominator; removing prefixes does not repair them. E0's recorded-form and explicit alternative-spelling recoveries are unchanged and are not silently substituted into exact recall.

## Reviewed usefulness

Usefulness here means compatibility of the unchanged baseline practical label with the frozen modern-meaning judgment. It is a measurable proxy, not a claim that every compatible lookalike makes a good quiz question. The diagnostic review sample does not estimate population precision.

| Arm | Compatible labels | Share |
| --- | ---: | ---: |
| Control | 80 / 197 | 40.6% |
| A: retained candidates | 45 / 128 | 35.2% |

The change is **−5.45 points**, with a paired family interval of **−10.90 to −0.34**. The gate required a gain of at least five points and a positive interval. A fails it. German–English loses 18.59 points and German–Swedish loses 10.43 points in groups with at least 20 scorable original cases.

A removes 71 of the 207 open cases: 35 compatible labels, 34 incompatible labels, and two unresolved references. Ten unresolved references existed in the full panel and remain excluded from compatibility scoring. Removing troublesome name matches and noun/verb pairs also removes ordinary overlap (`misvisende` / `missvisande`, `hallo` / `halloj`, `diskursiv` / `discursive`) and valid disjoint-meaning distinctions. Prefix origin alone does not separate these cases. The [case account](E4_A_CASES.md) preserves every removed comparison and its original review reason.

## Reproduction and limits

Run `pipeline\.venv\Scripts\python.exe -X utf8 pipeline/evaluation/e4.py A --output <new-directory>`. The saved protocol includes input, plan, code, and reference hashes. Result files are in `e4-a002`. The first invocation stopped before writing results because the E1 cache omits the orthographic score; the evaluator now reads that score from the frozen E0 prediction record. This was a data-access correction, not a changed hypothesis or threshold.

No sense, score, category, production generator, or database row changed. Continue B against the unchanged control and report A+B separately. A phonetic addition must not quietly make this rejected removal the new baseline.
