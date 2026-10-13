# E5: Dutch builds and first development review

Date: 2026-10-03. The five full Dutch pair builds are complete. Admission reviews remain in progress; Dutch has not been approved for release.

## Full builds

| Pair | Directed rows | Attached source claims | Seconds |
| --- | ---: | ---: | ---: |
| Danish–Dutch | 63,430 | 892 | 44.2 |
| German–Dutch | 216,166 | 6,420 | 84.1 |
| English–Dutch | 365,854 | 7,908 | 250.6 |
| Norwegian–Dutch | 60,352 | 494 | 43.2 |
| Dutch–Swedish | 97,860 | 930 | 56.5 |

Total: 803,662 directed rows and 16,644 attached claims. Reverse rows are included in these counts. Claim counts are evidence attachments, not independently confirmed cognate relationships.

Each build uses the frozen lookup and translation artifacts, original candidate generation and sense alignment, fixed encoder revision, original source-claim matching and enrichment, and V2 final classification. Original normalized etymology records are preserved byte-for-byte and concatenated with newly extracted Dutch and Icelandic records. New `is_core` flags remain null: comparison degree is not word frequency, and these tests do not filter on a fabricated core membership.

Outputs are isolated under `pipeline/data/e5-admission001`. Protocols and hashes identify the source, code, stage outputs, and model revision. No live database table was written. PostgreSQL is used only in a read-only transaction for the historical numeric conversion.

## Development retrieval

| Pair | Independent development cases | Found |
| --- | ---: | ---: |
| Danish–Dutch | 115 | 98 |
| German–Dutch | 117 | 106 |
| English–Dutch | 116 | 105 |
| Norwegian–Dutch | 116 | 96 |
| Dutch–Swedish | 118 | 107 |

These are exact reference-form comparisons. Missing phrases and alternative spellings remain missing rather than being replaced by guesses. No reserved-case predictions or judgments were opened for these reviews.

## Danish–Dutch: first complete meaning review

All 115 concept cases were reviewed: 77 acceptable displays, 21 wrong selected senses, and 17 missing comparisons. Conditional display suitability is 77/98 (78.6%); end-to-end suitable displays are 77/115 (67.0%).

The comparable old Danish development cases find 390/459 (85.0%) and display the intended concept on 264/390 found cases (67.7%). Danish–Dutch finds 85.2% and displays 78.6%: descriptive differences of +0.25 and +10.88 percentage points. These pass the specified retrieval and display transfer limits. They do not establish independent linguistic accuracy or release quality. Separate family intervals still need recording.

The failures recur across ordinary words:

- Maximum similarity selects identical secondary meanings: reputation for name, mathematical root for plant root, migration for pull, gunfire for fire, and skeleton bone for leg.
- Identical surname glosses displace ordinary meanings for forest and long.
- Compatible nouns beat the intended verbs: food instead of eat; beverage instead of drink.
- A highly similar broader or figurative sense displaces the reference meaning: political left, intelligence for sharp, student cohort for year, and a sound device for animal horn.

These are selection-policy failures, not absent word entries. Every error and its reason is listed in [REVIEW_CASES.md](e5-da-nl-review001/REVIEW_CASES.md). The review accepts compatible narrower or broader ordinary instances, but distinguishes an explicitly different concept. The reference's noun form for rain and verbal concept definition is recorded as a reference POS issue.

Of the 17 missing comparisons, 12 have both headwords in the accepted source lookups. Five involve excluded Danish phrases: near, vomit, yesterday, far, and fear. Dutch's fear phrase is also absent. Thus most misses are candidate retrieval gaps, not wholesale Dutch source failure. The exact forms and lookup checks are saved in `missing_diagnosis.json`.

## Danish–Dutch: open vocabulary

The category-stratified reservoir selects 35 rows. One known reserved-family row is withheld without replacement. All 34 remaining full sense inventories were reviewed before scoring the fixed categories, using the unchanged E2 meaning-profile mapping.

Only 13/32 scorable cases have compatible practical labels; two remain unresolved. This is a small, equally allocated category sample, not a population accuracy estimate. It exposes failures hidden by the concept panel: grammatical relatives treated as equivalent, restricted or obsolete overlap, modern shared meanings classified as false friends, and semantically associated terms treated as translations. A source noun tag on `fritere` is suspect and is flagged rather than silently repaired. The metonymy definition and the scope of cunningness remain unresolved.

This poor open-vocabulary result prevents interpreting the concept transfer pass as a successful admission. The new source is usable, while the fixed classification and display methods retain important errors.

## Checks and next work

Full structural verification passes on all 803,662 rows. It compares every original nonderived field and sense inventory, permits only the existing root normalization and claim attachments, and checks each inverse row. The first verifier completed all assertions but failed while writing its code hash due to a string/Path mistake. That run is retained; the corrected verifier completed in `e5-dutch-build002`, alongside saved build protocols and stage manifests.

Continue the remaining four Dutch meaning and label reviews, historical evidence and task-specific game checks. Record intervals and per-pair decisions. Then build and assess Icelandic, including Dutch–Icelandic, and complete assembled old-row preservation and reserved-family/product checks. Neither row counts nor the transfer pass approve publication.
