# E5: complete Dutch development review

**Decision: continue evaluation; do not approve release.** All five Dutch pairs
meet the predefined retrieval and display transfer limits. Category agreement
in the separate open sample remains poor. Passing transfer means these measures
are not more than five percentage points worse than the old comparators. It does
not mean the baseline's known errors have been fixed.

## Hypothesis and method

Adding Dutch with the unchanged builder, encoder, display selection and V2
classifier should preserve the old five-language output and produce comparable
retrieval and display quality for the new pairs. The full builds contain 803,662
directed rows. Every row passed the structural preservation and inverse checks
recorded in `e5-dutch-build002`.

The frozen development concepts come from the independent reference inventory.
The open samples use a seeded allocation of five rows per category, where
available. Cases connected to reserved families were withheld without drawing
replacements. The reviews use source definitions and sense inventories. They
are Codex judgments, not independent human annotations. No reserved predictions
were inspected for this review.

## Actual results

| Pair | Expected pairs found | Suitable displays | Wrong displays | Missing pairs | Retrieval change, points | Display change, points | Compatible open labels |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Danish–Dutch | 98/115 | 77/98 | 21 | 17 | +0.25 | +10.88 | 13/32; 2 unresolved |
| German–Dutch | 106/117 | 87/106 | 19 | 11 | +6.51 | +15.32 | 11/32; 2 unresolved |
| English–Dutch | 105/116 | 66/105 | 39 | 11 | +5.67 | +14.13 | 11/34 |
| Norwegian–Dutch | 96/116 | 82/96 | 14 | 20 | −1.01 | +13.84 | 12/33 |
| Dutch–Swedish | 107/118 | 87/107 | 20 | 11 | +2.22 | +16.82 | 15/34; 1 unresolved |

Retrieval and display changes compare the new pair with its saved old-language
comparator on comparable concepts. These are descriptive differences between
different sets of word pairs, not a paired improvement estimate. Open-label
agreement uses the fixed E2 meaning mapping and unchanged classifier. The sample
has equal allocation by category; its percentages are not dataset accuracy.

## Uncertainty

The following 95% intervals resample reference families 2,000 times with seed
20261003. Old comparator intervals are saved separately. These intervals measure
variation between sampled families; they do not establish that the agent's
judgments are correct.

| Pair | Retrieval interval, % | Suitable display among found pairs, % | Suitable display among all expected pairs, % |
| --- | --- | --- | --- |
| Danish–Dutch | 78.0–91.5 | 70.7–86.3 | 58.4–75.5 |
| German–Dutch | 85.1–95.6 | 74.1–89.3 | 66.4–81.8 |
| English–Dutch | 84.1–95.7 | 53.3–72.1 | 47.5–66.1 |
| Norwegian–Dutch | 75.9–89.1 | 77.1–93.1 | 61.9–79.1 |
| Dutch–Swedish | 85.7–95.5 | 73.3–89.1 | 65.2–81.8 |

## What failed and why it matters

Of the 70 missing expected comparisons, **51 have both headwords in the accepted
source lookup**: 12 Danish, 8 German, 8 English, 14 Norwegian and 9 Swedish.
Source absence cannot explain these misses. Examples include `see/zien`,
`ear/oor` and `bone/bot`. The candidate-generation channels do not retrieve all
ordinary equivalents, even when the source entries exist. The remaining 19
cases include missing phrases and differences between reference forms and
accepted headwords. Every missing case has a saved source-presence diagnosis.

The selected display often uses a name, figurative sense or different part of
speech because it maximizes semantic similarity without ensuring that it shows
the reference concept. English–Dutch has the most wrong displays: 39 of 105
found comparisons. Some ambiguous reference forms also need checking; those
cases must not be treated as proven pipeline errors without that check.

The open review finds three recurring label problems: partial overlap can be
labeled as full overlap; different root strings can trigger a false-friend label
despite recording different depths of ancestry; and generic name or grammatical
similarity can be mistaken for ordinary meaning agreement. Source inventories
can contain a correct secondary sense while the chosen display is wrong. Those
are separate failures and require separate measurements.

## Saved evidence and next checks

All concept and open-review reasons are in each pair's `REVIEW_CASES.md` under
`e5-*-review001`. `e5-dutch-transfer001/results.json` records separate family
intervals, comparator results and all missing-headword diagnoses. Its protocol
records the method and code hash. `e5_transfer.py --output <new-directory>`
reproduces the calculation without replacing the original result.

Complete Icelandic reviews next, then evaluate historical evidence and whether
the selected records support each game task. Freeze the methods before reserved
family evaluation. Verify the assembled dataset preserves every old row and
check the actual API, search, lexicon and games before deciding on release.
The live database remains unchanged.
