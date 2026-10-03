# E5: Icelandic builds and first development review

**Status: six builds and structural verification complete; three meaning reviews
remain. All three reviewed pairs fail the specified retrieval transfer limit.**

## Completed builds

| Pair | Directed rows | Attached claims |
| --- | --- | --- |
| Danish–Icelandic | 22,706 | 792 |
| German–Icelandic | 38,284 | 406 |
| English–Icelandic | 66,408 | 1,288 |
| Icelandic–Norwegian | 23,068 | 356 |
| Icelandic–Dutch | 28,990 | 130 |
| Icelandic–Swedish | 37,332 | 680 |
| Total | 216,788 | 3,652 |

The unchanged experiment builder produced all six pairs. Each output has the
baseline schema and a null `is_core` value: no frequency-based core membership
has been established for the new languages. Claim attachment does not by itself
establish a shared whole-word history.

The verifier checked all 216,788 rows against their raw inputs. Original
nonderived fields and sense inventories are preserved, apart from the specified
root cleaning and source-claim attachment. Every adjacent reverse comparison
matches after exchanging its endpoints. Stage hashes match the saved build
protocols. This proves structural preservation, not category accuracy.

## Development retrieval

| Pair | Expected pairs found | Review packet cases |
| --- | --- | --- |
| Danish–Icelandic | 84/117 | 34 open cases |
| German–Icelandic | 87/119 | 34 open cases |
| English–Icelandic | 80/118 | 33 open cases |
| Icelandic–Norwegian | 83/118 | 34 open cases |
| Icelandic–Dutch | 89/119 | 35 open cases |
| Icelandic–Swedish | 87/120 | 32 open cases |

All review packets contain development cases only. Known reserved or bridge
families were withheld from the seeded open sample without replacement.

## Danish–Icelandic: actual reviewed result

Of 117 expected comparisons, 84 are found, 73 show a suitable meaning, 11 show
the wrong meaning and 33 are missing. Retrieval is **13.17 percentage points
below** the saved old Danish comparator, exceeding the permitted five-point
loss. Suitable display among found comparisons is 19.21 points above that
comparator. Neither result cancels the other: better displays among the retrieved
cases do not compensate for losing expected pairs.

The open review finds 17 compatible labels among 33 scorable cases, with one
unresolved legal-usage comparison. It uses the unchanged E2 meaning mapping.
These source-guided Codex judgments are exploratory, not independent human
truth. The equal allocation by category does not estimate dataset accuracy.

Wrong displays include language instead of anatomical tongue, bolt instead of
the action hit, excavator instead of dig, and ice cream instead of frozen water.
The ordinary senses remain in the source inventories. This is evidence of the
shared sense-selection problem, not a need for exceptions for those words.
The selected noun POS and terse gloss for Danish drink need a grammar check.

## German and English reviews, and missing-source diagnosis

The next two complete development reviews confirm the retrieval loss.

| Pair | Suitable displays / found | Wrong displays | Missing | Retrieval change, points | Display change, points | Compatible open labels |
| --- | --- | --- | --- | --- | --- | --- |
| German–Icelandic | 71/87 | 16 | 32 | −10.98 | +14.86 | 11/33; 1 unresolved |
| English–Icelandic | 54/80 | 26 | 38 | −17.05 | +18.78 | 7/32; 1 unresolved |

These are different cohorts of comparable concepts, so the differences are
descriptive comparisons rather than paired estimates of improvement. Better
display agreement among the retained comparisons does not establish successful
language admission when retrieval fails.

**75 of the 103 missing comparisons have both headwords in the accepted source
lookup:** 23 of 33 Danish, 23 of 32 German, and 29 of 38 English. Ordinary
comparisons such as Danish `hus/hús`, German `Haus/hús` and English `house/hús`
are absent despite both entries being present. The same happens for year, ear,
foot and several verbs. This demonstrates a retrieval problem beyond missing
source coverage. It does not by itself identify whether absent mined translation
links, candidate-channel constraints or a later filter caused each miss.

The English display review repeatedly selects figurative senses and grouping
glosses: blood relation for blood, a fame heading for star, a leader/expert slang
sense for head, and a film take for the verb take. The wrong selection can coexist
with the correct ordinary sense in the source inventory. The open reviews also
show full-overlap labels applied to partial inventories and comparisons involving
unverified generic name identities. German's spelling redirect and the terse
Icelandic Taliban gloss remain unresolved in their respective open reviews.

Separate 95% family bootstrap intervals use 2,000 resamples and seed 20261003.
Comparator intervals are stored separately; these are not paired difference
intervals and do not validate the reviewer.

| Pair | Retrieval interval, % | Suitable display among found, % | Suitable display among all expected, % |
| --- | --- | --- | --- |
| Danish–Icelandic | 63.4–80.2 | 79.5–93.8 | 52.8–72.2 |
| German–Icelandic | 64.5–81.3 | 73.5–89.1 | 50.8–68.4 |
| English–Icelandic | 58.5–76.5 | 56.9–77.9 | 36.6–55.0 |

All missing cases and source-headword diagnoses, separate intervals, input review
hashes and scored results are in `e5-icelandic-transfer001`. Its protocol explicitly
lists the three pending reviews. Reproduce the completed subset with
`e5_transfer.py --language is --output <new-directory>`; subsequent completed
reviews will be included, so preserve this run's recorded scope.

## Decision and remaining work

Icelandic admission is not approved. Complete Norwegian, Dutch and Swedish
meaning reviews, source diagnoses and separate family intervals. Then finish
historical evidence and game eligibility
checks, assembled old-row preservation, reserved-family evaluation and actual
product checks. The production builder and live database remain unchanged.

Evidence: `e5-icelandic-build001/verification.json` and copied pair protocols;
`e5-*-is-review001` frozen packets; Danish, German and English judgments, scored
results and all case reasons in their respective `REVIEW_CASES.md` files.
