# E5: Icelandic builds and first development review

**Status: six builds and structural verification complete; five meaning reviews
remain. Danish–Icelandic fails the specified retrieval transfer limit.**

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

## Decision and remaining work

Icelandic admission is not approved. Complete the other five meaning reviews,
diagnose all missing comparisons against accepted source headwords, and record
separate family intervals. Then finish historical evidence and game eligibility
checks, assembled old-row preservation, reserved-family evaluation and actual
product checks. The production builder and live database remain unchanged.

Evidence: `e5-icelandic-build001/verification.json` and copied pair protocols;
`e5-*-is-review001` frozen packets; Danish judgments, scored results and all
case reasons in `e5-da-is-review001/REVIEW_CASES.md`.
