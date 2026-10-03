# E2-001: dense meaning coverage is insufficient

Run on `e2`, 2026-10-03. Prototype committed before scoring at `f041052`.

## Result and decision

The dense-only profile improved compatibility from **80/197 (40.6%) to 118/197 (59.9%)**. The paired gain was **19.3 points**, with a **12.0–26.5** family interval. It recovered 48 previously incompatible labels and lost 10 previously compatible ones. No sufficiently large pair or diagnostic group crossed the loss flag. All four unsupported generic-name controls and both selected whole-compound controls were identified.

However, the always-partial control scored **114/197 (57.9%)**. The improvement over that trivial control was only **2.0 points**. Separating fields is useful, but these numbers do not establish a good practical classifier. Ten unresolved references remain visible outside compatibility scoring. Source-guided agent judgments are not independent human gold.

**Decision: revise, do not adopt.** Preserve this run. Test dictionary translation evidence separately rather than lowering cosine thresholds until familiar examples pass.

## What failed

All 79 incompatible predictions and all 10 newly lost baseline-correct cases were inspected against the saved reference reasons. Matrix-level tracing of ordinary-word failures showed why a fixed cosine threshold is insufficient: German *säen* is explicitly glossed “to sow”, but its score against the English sowing definition is 0.272. Winter's ordinary season definition versus bare “winter” scores 0.473. Two alder definitions score 0.461. The ordinary senses remain present; this is not evidence that their meanings differ.

The profile also confuses nearby but distinct meanings: marijuana cigar versus cigarette, fact versus reality, and Israelite versus Israeli. Those errors cannot be solved merely by accepting lower scores. The strict entity check misses concrete same-name correspondences when only one side supplies a detailed identifying description. POS differences can outrank the appropriate noun or verb match.

The primary mapping gives a partial label credit where the reviewed ordinary correspondence does not prove complete equivalence. This is defensible reference scope, but makes the trivial partial classifier strong. It must remain visible; the 19-point improvement over the legacy categories alone would overstate the method's quality.

## Next test

E2-002 will keep the encoder, thresholds, coverage weights, displays, and reference mapping unchanged. Add word-level, POS-scoped dictionary evidence from explicit gloss translations and existing source-sense translation links. Record that evidence separately from cosine and from exact sense matches; an English headword translation does not identify which of that word's senses applies. Refuse generic-name and incompatible-context evidence. Read all newly changed errors and losses before deciding.

## Evidence

- [Frozen plan](../E2_PLAN.md)
- [Case results](case_results.json)
- [Metrics and confusion tables](metrics.json)
- [Trivial-control comparison](null_comparison.json)

Reproduce with the committed prototype and `.\pipeline\.venv\Scripts\python.exe -X utf8 pipeline/evaluation/e2.py --output pipeline/evaluation/e2-001-reproduction`. Use a new directory. No live database, candidate, input sense, display, or score was changed.
