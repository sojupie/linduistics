# Dataset project retrospective — 2026-09-29

## Why this document exists

This is a record of what the dataset work set out to do, what it actually changed, what the checks proved, and why the result did not meet the main goal. It is written for the next engineer who resumes the work. Read it with the detailed [database refresh report](DATASET_REFRESH_2026-09-29.md) and the evolving [next-steps notes](DATASET_NEXT_STEPS.md); those documents contain rebuild commands and case-level findings.

## The intended project

The project was meant to make a small, useful public resource from data we source and transform ourselves. The site should let a curious person compare languages and explore why two words look, sound, or mean something alike. It should also let people query misleadingly similar pairs for the lexicon and quiz.

This was not meant to be a definitive linguistic authority or a wrapper around a finished outside corpus. The value was in collecting source material, transforming it, and making the resulting claims inspectable. CLDF was acceptable as an exchange format, not as the goal or a reason to redesign the whole pipeline.

The data needs to keep distinct questions separate:

- Language-level facts such as genealogy, typological features, and areal contact.
- Word, sense, and component histories such as inheritance, borrowing, derivation, and compounds.
- Computed observations such as spelling, sound, and gloss similarity.
- Project interpretations built from those facts and observations.

One pair may have several histories. Similarity does not prove ancestry. Missing evidence does not prove unrelatedness. A candidate that is misleadingly similar can remain queryable even when its history is unknown.

## What the current comparison table represents

The database does not contain a balanced sample of each language's vocabulary. It contains **1,638,454 directed comparison-candidate rows** across ten directions for five languages: English, German, Swedish, Danish, and Norwegian Bokmål. A row represents a pair selected by the pipeline, not a vocabulary item sampled from either language.

The candidate builder combines two sources of candidates:

1. It mines translation links from English Wiktionary entries and forms cross-language pairs, including target-to-target pairs linked through an English entry.
2. It adds exact spelling collisions and near-spelling collisions. Near matches are selected by a short-prefix index, a word-length limit, and an orthographic-similarity threshold.

It then computes spelling, phonetic, and gloss-embedding similarity. A single rule assigns one display category:

- `false_friend`: similar spelling or sound, plus a gloss score at or below a fixed cutoff, except for certain source-translation or name cases.
- `true_cognate` or `partial_cognate`: the extracted root strings match exactly; the gloss score then separates the two labels.
- `translation_pair`: the gloss score is high enough and the forms are not similar enough.
- `other`: every remaining candidate.

These are pipeline outputs, not reviewed linguistic judgments. In particular, `other` is a **candidate-builder remainder**, not a type of historical relationship. The false-friend count is also a threshold result, not a count of checked false friends. A direct query of English–Swedish candidates returned examples such as *celtist–cellist* and *extract–extremt* under `false_friend`; their labels follow the thresholds, not case-by-case review.

The source creates limits too. Wiktionary is a large, collaborative dictionary with uneven coverage and varying entry structure. Its translations and etymologies are useful source material, but they do not form a balanced, sense-aligned cross-language lexicon by themselves. The local build uses Wiktionary-derived Kaikki dumps. The English dump supplies the translation graph that seeds many pairs. Wiktionary's data format allows translations to be attached at an entry or sense level; extraction and target-sense alignment still require care. See the [Wiktextract data documentation](https://github.com/tatuylonen/wiktextract/blob/master/README.md) and [Wiktextract paper](https://aclanthology.org/2022.lrec-1.140.pdf).

## What the database says now

These counts were read directly from the local Postgres `word_comparisons` table after the 2026-09-29 refresh. Rows are directed; reverse directions are separate records.

| Existing display category | Rows |
| --- | ---: |
| `other` | 1,145,886 |
| `false_friend` | 361,880 |
| `translation_pair` | 106,546 |
| `true_cognate` | 14,864 |
| `partial_cognate` | 9,278 |
| **Total** | **1,638,454** |

The same table has a separate `etymological_relation` field:

| Relation field | Rows |
| --- | ---: |
| `cognate` | 24,962 |
| `unknown` | 1,613,492 |
| `false_cognate` | 0 |

That field does not replace the display category. The overview still counts the old `category` values. The root rule behind the new field records `cognate` when the extracted root strings match and `unknown` when either root is missing or the roots differ. It does not establish that the unknown rows are unrelated.

For the English rows shown in the overview, the local database contains:

| Target | Rows | True cognate | Partial cognate | False friend | Translation pair | Other | Avg. phonetic | Avg. spelling | Avg. semantic |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| German | 246,233 | 583 | 1,195 | 56,163 | 8,438 | 179,854 | 73.4% | 64.0% | 39.5% |
| Swedish | 142,410 | 401 | 795 | 37,077 | 5,439 | 98,698 | 73.2% | 65.8% | 38.2% |
| Danish | 91,614 | 344 | 714 | 25,241 | 2,078 | 63,237 | 75.6% | 69.1% | 37.4% |
| Norwegian Bokmål | 84,818 | 286 | 554 | 25,468 | 2,185 | 56,325 | 74.5% | 68.9% | 35.5% |

For English–Swedish, for example, the database labels 401 rows `true_cognate` and 795 `partial_cognate`. These are counts of rows that pass the exact-root rule. They are **not** estimates of the number or share of cognates in English and Swedish vocabularies.

The local database before the full refresh had 403,694 rows and 174,156 `other` rows. After refresh, it has 1,638,454 rows and 1,145,886 `other` rows. The candidate universe grew, and `other` grew from about 43% to about 70% of its rows. This is not a controlled before-and-after measure of linguistic accuracy, but it does show that the refresh did not solve the catch-all problem.

## What changed during the work

The 2026-09-29 refresh made real engineering changes:

- Rebuilt lemma data from five local Kaikki dumps and fixed root parsing around Wiktionary annotations and HTML-wrapped text.
- Rebuilt the full candidate set and loaded it into the local database. The existing seeder now defaults to the enriched artifact and requires `--truncate` before replacing loaded rows.
- Compared candidate records across the root-parser correction. The report records 384 changed root fields, 18 changed shared-root fields, 12 changed category values, and 14 changed relation values; similarity scores did not change.
- Pinned the embedding model to a specific Hugging Face revision so a rerun does not silently use a newer model.
- Extracted and matched structured etymology claims. The refreshed artifact records 20,188 source-claim matches, attached in both directions to 35,188 comparison rows. Of 40,376 attachments, 810 have an ambiguous target identity.
- Preserved claim scope, source identity, raw evidence, and ambiguity instead of treating every entry-level claim as proof about a selected word pair.
- Changed the root-based relation rule so unequal roots no longer imply `false_cognate`. This removed 28,820 such values from the previous local database and left them `unknown`.
- Built a separate, deliberately selected source-linked case slice and a CLDF Generic export candidate. The current notes record 18 case groups, 70 directed comparisons, 21 pinned source pages, and 70 curated assertions. The slice passed its focused exporter tests and PyCLDF validation. It is a diagnostic sample, not a representative dataset or public release.

These changes improved extraction, provenance, repeatability, and protection against one bad inference: different root strings alone are not proof that words are unrelated. They did **not** substantially improve the main display categories or split `other` into meaningful, queryable relationships.

## Why the result went wrong

The work drifted from fixing the confusing data into building more audit and evidence infrastructure. That infrastructure is useful, but I treated more extraction coverage, passing tests, and validated exports as progress toward a classification improvement they did not deliver.

The biggest model mistake was adding `etymological_relation` beside the existing `category` field. That created two parallel answers, but the overview still reads `category`; most of the source claims were not used to change it. The new `unknown` field is a coarse root-comparison outcome, not a breakdown of `other`.

The candidate builder also makes the results look more authoritative than they are. It combines translation-derived pairs with large sets of spelling collisions, including rare or specialized forms, then maps all of them into one exclusive category. For example, the database labels English–Swedish *celtist–cellist* and *extract–extremt* as `false_friend` because they meet form-similarity and gloss-score thresholds. Those labels have not been individually reviewed.

The root comparison is too narrow for a cognacy classification. It compares one normalized ancestor-language/root-form pair per selected sense. Related languages can record different intermediate roots for words with a deeper shared ancestor; compounds and loans can have component or borrowing paths alongside older ancestry. One scalar label cannot preserve those paths.

Finally, the page called the ratios a “Vocabulary breakdown.” The denominator is candidate rows. That wording made a pipeline distribution look like a statistic about language vocabularies. The UI was showing actual database category counts, but the interpretation implied by the labels was not supported.

## What the checks established—and what they did not

The refresh report records 46 pipeline tests and `go test ./...` passing. Checks also confirmed that the loaded database matched the generated Parquet records, with only the expected floating-point rounding from PostgreSQL `real` columns. API smoke tests returned HTTP 200 for the listed routes.

Those checks show that parsing, transformations, loading, and application queries ran as expected for the tested cases. They do not show that:

- `true_cognate`, `partial_cognate`, or `false_friend` labels are linguistically correct across the full database;
- `other` has been meaningfully classified;
- the candidate set is a representative sample of any language's vocabulary;
- `unknown` means unrelated, or has one consistent cause;
- a matched entry-level source claim applies to the exact senses selected by the comparison builder;
- the database is cleared for public redistribution.

Named cases expose real structural gaps. Swedish *fleece* has a borrowing claim from English while English has its own older root. *Ombudsman* can have a direct borrowing path and a deeper shared history. *Sandbank* and *bankman* need component-level evidence; their components do not automatically settle the whole-word relation. *Clown* has source-backed borrowing paths that the scalar category does not show. These examples support changes to the data model, but they do not justify bulk relabeling on their own.

## Lessons for the next pass

1. **State the user-visible outcome before starting infrastructure work.** “Improve the classification of `other`” means that records currently in `other` become more informative and queryable, not that a new field or report exists beside them.
2. **Keep candidate generation separate from classification.** Record why a pair entered the dataset: a translation claim, a surface collision, a source relation, or another rule. Do not let candidate origin silently become a linguistic label.
3. **Keep observations, source claims, and interpretations separate.** Similarity scores find or describe candidates. Wiktionary claims record what an entry says. Project labels should not overwrite either.
4. **Allow several relations per pair.** Inheritance, borrowing, shared components, and meaning similarity can coexist. A single enum cannot represent that.
5. **Treat `other` as an implementation remainder, not a linguistic concept.** Decompose it only where the data supports a named relationship or a clear candidate-generation reason. Do not turn missing extraction into “unrelated.”
6. **Do not publish vocabulary percentages without a sampling frame.** Candidate-row shares are valid only as candidate-row shares.
7. **Use case examples as regression tests, not as grounds for bulk classification.** Keep *bank*, *bankman*, *ombudsman*, *sandbank*, *clown*, *fleece*, *dygn/døgn*, and *aften/afton* available to test identity, components, loans, and conflicting source claims.
8. **Report progress in terms of changed data and remaining gaps.** Test counts and artifact hashes matter, but they must not stand in for the requested outcome.

## A practical definition of success

The next useful result is a change in the existing dataset and its queries, not another audit-only project. A user should be able to:

- search a pair because it is misleadingly similar, regardless of whether its ancestry is known;
- query source-backed relations such as inheritance, borrowing, derivation, cognate mention, and compound components independently;
- inspect which entry, sense, or component supports a relation and how the pipeline matched it;
- distinguish an unresolved record from a negative historical claim;
- understand whether a displayed count is a count of candidates, source claims, or a defined vocabulary sample.

Use those functions to test the concrete cases above. Keep similarity and candidate search available for the quiz and lexicon. Keep language genealogy, typology, and area/contact as language-level data, not substitutes for word histories. Add another source only when a specific case exposes a gap that source can fill. Use CLDF if it makes this result easier to reuse.

## Reference files

- [Dataset refresh and local database results](DATASET_REFRESH_2026-09-29.md)
- [Dataset next steps and detailed extraction audits](DATASET_NEXT_STEPS.md)
- [Current work plan](DATASET_WORK_PLAN.md)
- [Next actions and source-evidence milestone](DATASET_NEXT_ACTIONS.md)
- [Curated case review](DATASET_CASE_REVIEW.md)
