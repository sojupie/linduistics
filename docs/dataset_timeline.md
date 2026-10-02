# Dataset timeline: what changed, why, and what to avoid

This timeline explains how each build changed the rows and their labels. The commit hashes mark approximate stages; they do not claim that one commit alone caused every change. Counts below describe database rows. They are not percentages of a language's vocabulary, and the labels have not been checked by linguists row by row.

## Stage 1: v1 — smaller build, overconfident labels

**Data:** Five languages: Danish, German, English, Norwegian Bokmål, and Swedish. A saved database snapshot had 403,298 directed rows across 20 language directions.

**How it worked:** [`build_crosslingual_dataset.py`](../pipeline/src/build_crosslingual_dataset.py) capped mined translation pairs at 15,000 and prefix matches at 2,500 per language pair. It already read and passed etymological roots to the classifier; it is inaccurate to say that root extraction did not exist. However, the old roots were not reliable proof of shared ancestry, and a matching root was not required before spelling and meaning scores could label a pair `true_cognate`. Mined translations also received a minimum semantic-similarity score of 0.95.

**What the database showed:** `true_cognate` 155,126 (38.5%); `partial_cognate` 33,720 (8.4%); `false_friend` 21,310 (5.3%); `translation_pair` 173,008 (42.9%); and `other` 20,134 (5.0%). A later pre-refresh snapshot had 403,694 rows, so the total depends on which saved state is used.

**Why this was a problem:** High spelling and meaning similarity could label unrelated loans as cognates, including international words with Latin or French origins. The 0.95 score floor also made mined translations look more semantically alike than their measured scores showed. These category percentages looked clean, but they were not reliable measures of historical relationship.

## Stage 2: v1.2 — removing limits added too many weak pairs

**Data:** Five languages and 1,638,454 rows, about four times the earlier snapshot.

**How it changed:**

1. Commit `1e4743c` removed the 15,000 translation-pair and 2,500 prefix-match caps. The builder then retained every mined pair and prefix match it found. The English Kaikki file contained roughly 536,000 lemmas, and the expanded prefix search added over a million weak spelling matches.
2. Commit `97e6d85` changed cognate labeling to require the same structured root. A pair without matching root records could no longer be called a cognate, even when the spelling and meaning looked right.
3. Commit `c9efd7a5` removed the 0.95 minimum semantic score for mined translations. Embedding scores between long definitions and short glosses could be much lower, so fewer pairs passed the translation threshold.

**What the database showed:** `false_friend` 361,880 (22.1%); `other` 1,145,886 (69.9%); `translation_pair` 106,546 (6.5%); `true_cognate` 14,864 (0.9%); and `partial_cognate` 9,278 (0.6%).

**Why this was worse:** Removing the limits added many pairs that only shared a short prefix. Low meaning similarity then pushed many of them into `false_friend`; pairs that failed every category rule fell into `other`. At the same time, the new root requirement excluded likely cognates when the source dictionaries had no matching structured roots. The result was objectively worse for the product: a much noisier list, with most rows labelled `other` or `false_friend` and very few labelled as cognates. The problem was both pair selection and category rules, not simply that the database had more rows.

## The September 29 rebuild — better roots and source evidence, same labels

This was a separate operation between the five-language build and the v2 relabeling. The pipeline rebuilt the five-language data from local Kaikki dumps, corrected root parsing, matched source claims, and loaded all 1,638,454 rows into PostgreSQL. It created a full database rollback dump before loading the rebuilt data. The October 2 pre-expansion database backup preserves this five-language state.

This rebuild changed roots on 384 rows, shared-root values on 18 rows, category values on 12 rows, and origin-relation values on 14 rows. It also attached 20,188 source-claim matches to 35,188 comparison rows, in both directions. It did **not** replace the existing category labels with the later v2 labels: the display categories were still `true_cognate`, `partial_cognate`, `false_friend`, `translation_pair`, and `other`. The database still showed about 70% `other` and 22% `false_friend`.

The source claims were evidence attached to the selected senses. They did not automatically determine the category for the whole word pair. This rebuild improved extraction and preserved evidence, but it did not solve the noisy category distribution.

## Stage 3: v2 — kept 1.64 million rows, changed their labels

The v2 classifier and database update script were added around commit `9c94611`. The October 2 pre-expansion database backup proves that the update ran: it still has all 1,638,454 rows, but its labels and origin values have changed. It also has 288,512 rows marked `is_core`.

### What the v2 classifier did

[`sense_aligner.py`](../pipeline/src/sense_aligner.py) added more detailed categories. In the initial version:

- When both roots matched, the classifier could use `full_cognate`, `semantic_narrowing`, `archaic_cognate`, `cognate_false_friend`, or `semantic_divergence`.
- When both roots existed but differed, it could use `accidental_lookalike`, `unrelated_equivalent`, or `independent_root`.
- When a root was missing or could not be compared, high spelling similarity plus a meaning score of at least 0.80 could produce `full_cognate`; a score of at least 0.50 could produce `semantic_narrowing`. In both cases, the origin stayed `unknown`.
- For confirmed shared roots, the initial full-cognate threshold was 0.85 and the semantic-narrowing threshold was 0.55. Later commits changed several thresholds and added direct-translation handling.

The initial v2 labels in the restored backup are: `accidental_lookalike` 903,784; `cognate_false_friend` 3,930; `full_cognate` 165,482; `independent_root` 191,462; `semantic_divergence` 516; `semantic_narrowing` 233,192; and `unrelated_equivalent` 140,088. The origin counts are `cognate` 24,962; `false_cognate` 87,874; `independent` 191,462; `unknown` 1,194,068; and `unrelated` 140,088.

The backend grouped detailed labels into the familiar cognate, false-friend, semantic-shift, and translation-pair totals. It also added indexes and caches to speed up database queries.

### What “core” meant in this update

The update marked a row `is_core` when both words appeared among the top 5,000 words for their language. The script ranked words by how often they appeared in the existing comparison rows, not by counts from an independent frequency dictionary. It marked 288,512 rows as core, but still processed and kept all 1,638,454 rows. So v2 did reclassify the database; it did not reduce it to a 5,000-word sample or create a representative measure of each language's vocabulary.

Despite the `sense_aligner.py` name, the bulk update did not compare the stored senses. [`reclassify_dataset.py`](../pipeline/src/reclassify_dataset.py) passed empty sense lists to the classifier and did not read the attached source claims. It classified each row using its scalar similarity scores and root fields. The separate `align_senses()` function was not called by that update script. This matters because the category labels can change without the classifier checking whether the compared definitions describe the same sense.

## Stage 4: v3 — seven-language load replaced the v2 labels

The expansion added Dutch and Icelandic, with 1,020,450 new rows and 2,658,904 rows in total. It preserved the five-language rows from the older enriched Parquet file and built new Dutch and Icelandic pairs with the existing comparison pipeline. The old Parquet file still had the five legacy category labels. Loading the combined file into PostgreSQL therefore replaced the v2 labels on the original 1,638,454 rows. This is how the earlier problem returned: the database update changed labels, but the saved data file used for expansion had not been updated with those labels.

The seven-language database showed: `other` 1,811,138 (68.12%); `false_friend` 574,352 (21.60%); `translation_pair` 230,574 (8.67%); `true_cognate` 27,496 (1.03%); and `partial_cognate` 15,344 (0.58%). These are database row shares, not shares of each language's vocabulary.

The lesson is to keep the rebuild steps in one repeatable pipeline and save a new data file and manifest after each category update. Before replacing the database, check that the file to be loaded has the expected categories and row counts. A backup protects data, but it does not stop a later load from restoring old labels.

## Stage 5: root fixes, then more classifier changes

Later parser changes handled more forms of Proto-Germanic etymology nodes and used an entry-level root when a selected sense had no root. They recovered roots for some named examples, including *water*, *winter*, *hand*, *father*, *brother*, and *house*. This did not recover roots for every word or fix the large number of weak spelling matches.

The subsequent classifier commits (`9f88f65`, `999a8d5`) adjusted spelling and sound thresholds, direct-translation evidence, and cognate/false-friend rules. They changed code after the root-fixed staging file had been produced. The current database still matches that earlier staging file, so its counts do not include these later classifier changes.

The first root-fixed staging build had 2,658,904 rows: `other` 1,811,138 (68.12%); `false_friend` 574,352 (21.60%); `translation_pair` 230,574 (8.67%); `true_cognate` 27,496 (1.03%); and `partial_cognate` 15,344 (0.58%). Five of its ten named category examples matched their expected labels. The misses included *father*, *mother*, *brother*, *house*, and *dog*. This exposed both the stale labels and a classifier that put too much weight on missing or mismatched root records.

The later offline review rebuild keeps all 2,658,904 rows and applies a score-based fallback when roots are missing or recorded at different depths. Strong form and meaning matches become likely cognates while their historical relation remains `unknown`; moderate meaning matches become likely semantic shifts; strong form matches with very different meanings become false friends; high meaning matches without form similarity become translation equivalents. Direct translation records can support meaning equivalence but cannot raise the score used to infer cognacy. Matching roots or explicit shared-borrowing statements still provide stronger historical evidence. A part-of-speech mismatch no longer overrides matching-root or explicit-borrowing evidence.

In this rebuilt file, the categories are `other` 1,020,596 (38.38%); `unrelated_equivalent` 650,666 (24.47%); `full_cognate` 400,998 (15.08%); `semantic_narrowing` 368,330 (13.85%); `false_friend` 183,260 (6.89%); and 35,054 rows in the remaining categories. The ten benchmark pairs now all receive a useful category, including *mother/Mutter*; *advent/advent* is separately verified as `sister_loanword`. These are still algorithmic labels, not expert review. The 1,020,596 `other` rows have weak or conflicting form and meaning evidence and remain unclassified rather than being assigned an unsupported relation. Most rows (2,529,578) still have historical relation `unknown`; the category is a useful estimate from similarity, not proof of ancestry.

This review file has not been loaded into PostgreSQL. The live database still has the earlier seven-language labels. Keep the file and database states distinct when reporting results.

That staging load also replaced the comparison senses without their attached source claims. A live query found no comparison sense with a `source_claims` field after the load. The older enriched Parquet and pre-expansion database backup still preserve those claims; the statement applies to the current database rows. Separate IE-CoR claim data and root fields also remain.

## Lessons for the next rebuild

- Keep the word-pair rows, category labels, source claims, and origin evidence together in the saved build file. Do not update labels only inside PostgreSQL and then later reload an older file.
- Keep pair-generation rules bounded or review the effect of removing those bounds before accepting the added rows.
- Do not treat percentages of generated word pairs as percentages of a language's vocabulary.
- Do not call a bulk classifier “sense alignment” unless it actually reads and compares the senses.
- Check named examples and category totals in the built file before loading it. Preserve a backup, then verify the live database against the exact file that was loaded.

## October 2: reproduce the five-language checkpoint

The user requested a return to the code immediately before Dutch and Icelandic were added, followed by a fresh run of that historical pipeline. The checkpoint is `f640802`, the parent of expansion commit `cba2440`. It already includes the v2 classifier, database update script, and backend/frontend changes. Rollback commit `2bea545` restores that code. The earlier timeline above is retained.

### What was actually reproduced

The pipeline parsed the five local Kaikki dumps again, generated all ten language combinations, extracted the source evidence again, matched its claims to the generated comparisons, and enriched the output. No database backup was restored or loaded into a container.

- All five newly parsed lemma Parquet files are byte-for-byte identical to the September 29 rebuild inputs.
- Newly extracted source records have the same SHA-256: `717e04e01608216d3d00bd8eab63c65f28a28fb587a7fe73148429532cf6d961`.
- The comparison output is byte-for-byte identical to the September 29 rebuild: `a29d50eb6c6dad6731143c306797a81ea736d7e5302fbe2df2dd9adbfc5a33a3`.
- The enriched output is byte-for-byte identical to the preserved five-language file: `7f95943588e910141afdb586ea3b7a36dd6842f6114f4b6a5d75a56ccfbb2d5f`. This verifies the complete rows, definitions, senses, roots, scores, labels, and attached evidence—not just the totals.
- It contains 1,638,454 directed rows, 20,188 matched source records, and 40,376 attached source claims on 35,188 rows.
- The restored historical pipeline passes all 102 existing tests.

The source matcher had been deleted by `9c94611`. The run used its unchanged version from `9c94611^`, whose generator SHA-256 matches the historical manifest: `f9f097df79e47edde154f947edfb5841792a47d19e0b9ef7ebe53b3bead248c5`. The generated match records are identical as a collection; their line order differs. The enriched Parquet nevertheless matches byte-for-byte.

The on-disk backup remains at `pipeline/data/backups/pre-language-expansion-20261002/`. Its database dump still has SHA-256 `ce406d9e4241b165fa6a1d48573f2bfb23391b627e8a212dd8c47df508d264c7`.

### Database replacement

The fresh enriched file was loaded into the live database, then the unchanged `reclassify_dataset.py` applied the historical v2 labels and core tags. All 1,638,454 loaded rows passed full-field verification against the reconstructed file and historical classifier. Scores were compared using the same PostgreSQL `REAL` conversion as the historical loader; definitions, senses, roots, source claims, and other fields were checked exactly.

The resulting category totals match the recorded pre-expansion v2 database:

| Database category | Reproduced rows |
| --- | ---: |
| `full_cognate` | 165,482 |
| `semantic_narrowing` | 233,192 |
| `accidental_lookalike` | 903,784 |
| `cognate_false_friend` | 3,930 |
| `unrelated_equivalent` | 140,088 |
| `independent_root` | 191,462 |
| `semantic_divergence` | 516 |

Origin totals also match: `cognate` 24,962; `false_cognate` 87,874; `independent` 191,462; `unknown` 1,194,068; and `unrelated` 140,088. The run marked 288,512 rows `is_core`, matching the recorded v2 total. All 40,376 attached source claims remain present.

The final v2 file was saved with the source rows and core tags, then copied to both canonical comparison-file paths. Its SHA-256 is `a7e2bfe3ffa75931c9134f3e570eec53cbf644713b738bedc055fdc9b44b120f`. This final file is not claimed to be byte-identical to the historical database dump: the proven byte-identical artifact is the enriched input before v2, and the final database categories and origin/core totals match the recorded v2 state.

The form lookup table was freshly rebuilt for the five languages, with 1,296,113 rows. Dutch and Icelandic rows were removed from the inflection and synonym tables. The historical cluster builder produced 6,151 clusters, including 939 spanning at least three languages. The comparison, form, inflection, synonym, and cluster tables contain no languages outside the original five. The historical rules were not changed during this reconstruction.

The API and NLP services were restarted from the restored code. `/api/health` reports a connected database; `/api/languages` returns exactly `da`, `de`, `en`, `nb`, and `sv`, with twenty directed comparisons. Swedish–Danish and English–German pair queries return results. The live state is now this five-language reconstruction; earlier statements in Stage 5 about the current seven-language state describe the dataset it replaced.

Commands and verification artifacts are saved under `pipeline/data/reproduce-five-language-20261002/`. Run `reproduce.ps1` from the repository root with the restored code and local dumps. It stops on failed stages, checks the rebuilt rows against the reference file, loads the fresh output, runs v2, verifies the loaded data, and saves the final labels with the source rows. The backup is a reference file, not a restore input.
