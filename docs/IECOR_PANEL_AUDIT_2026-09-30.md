# IE-CoR panel audit — 2026-09-30

## What this checks

This is a bounded test of the current data pipeline, not a claim about the full vocabularies of these languages. It uses IE-CoR v1.1's 169 meanings with forms in Danish, English, German, Norwegian Bokmål, and Swedish, then links those spellings to the project's Wiktionary-derived local records. IE-CoR's cognate-set assignments remain reference evidence; they are not copied onto local entries.

The panel has 169 meanings × 10 language pairs = **1,690 meaning-level pairs**. A pair is marked `shared_cognate_set` when at least one form on each side is assigned to the same IE-CoR cognate set. `no_shared_cognate_set` means no shared set was found in IE-CoR; it does **not** mean “false cognate.” These counts describe this panel only.

## Results

### Local-form coverage

| Measure | Result |
| --- | ---: |
| IE-CoR forms in the five languages | 853 |
| Forms with an exact local Wiktionary-derived entry | 835 (97.9%) |
| Forms without an exact local entry | 18 (2.1%) |
| Meanings with exact local entries in all five languages | 159 of 169 |
| Local source-sense candidates emitted | 8,422 |
| Local candidate rows with Wiktionary page links | 8,422 of 8,422 |

Exact matching uses normalized spelling only. It does not infer that a phrase, inflected form, alternate spelling, or merely related sense is the right match. The 18 missing forms and the ten meanings affected by them remain explicit gaps.

The existing eight-meaning sense review contributes 40 primary links, six additional compatible links, and one rejected candidate. In the expanded crosswalk those reviewed decisions appear on 53 candidate rows because a reviewed sense may be linked to more than one reference-form row. The other 8,369 local candidate rows are unreviewed.

### IE-CoR relationships

| Reference result | Meaning-level pairs |
| --- | ---: |
| Shared cognate set | 1,094 (64.7%) |
| No shared cognate set | 596 (35.3%) |

This is a count over a selected set of meanings, not a percentage of all words in any language. A shared set also does not, by itself, tell us whether a local word was inherited or borrowed.

### Current live database

The read-only PostgreSQL query found **1,638,454 directed rows**, representing **819,227 unique unordered word pairs**. Every canonical row had a reverse-direction row, and the two directions agreed on category and etymological relation.

| Current category | Directed rows | Unique word pairs | Share |
| --- | ---: | ---: | ---: |
| Other | 1,145,886 | 572,943 | 69.9% |
| False friend | 361,880 | 180,940 | 22.1% |
| Translation pair | 106,546 | 53,273 | 6.5% |
| True cognate | 14,864 | 7,432 | 0.9% |
| Partial cognate | 9,278 | 4,639 | 0.6% |

The stored etymological relation is separate from that display category: 24,962 directed rows say `cognate`; 1,613,492 say `unknown`. The database currently has no `false_cognate` relation rows. These are counts of database comparisons, not estimates of vocabulary proportions.

### How the current database overlaps the panel

The panel crosswalk finds exact local forms on both sides for 1,632 of 1,690 meaning-level pairs. The live database contains at least one exact word-pair comparison for 1,422 panel pairs, yielding 1,479 matching comparison rows across multi-form cases.

Category presence is not exclusive in this panel check: where multiple exact forms exist for one meaning, their database rows can have different categories. Among panel pairs with a database match, `other` appears in 543, `true_cognate` in 477, `translation_pair` in 227, `partial_cognate` in 205, and `false_friend` in three. These numbers overlap and should not be added into a distribution.

Among the 1,094 IE-CoR shared-set pairs, 969 have an exact local word-pair row; 659 have a database row whose etymological relation is `cognate`, while 334 include an `unknown` relation. Twenty-four pairs have both relation values across matching exact forms. Among the 596 no-shared-set pairs, 453 have a database row; 23 include `cognate`, 431 include `unknown`, and one has both. These are diagnostic disagreements or limitations to inspect, not labels to overwrite automatically.

### Reviewed-sense alignment

For the eight meanings with manually reviewed local sense links, there are 80 meaning–language pairs:

| Database alignment | Pairs |
| --- | ---: |
| Exact word-pair row exists | 70 |
| Both reviewed senses appear in the database row | 61 |
| Both reviewed senses are marked as the active comparison | 26 |
| Word-pair row missing | 10 |
| One reviewed sense absent from the comparison row | 9 |
| Both senses present but not both active | 35 |

All 26 active pairs also share an IE-CoR cognate set. Their current database categories are 17 `true_cognate`, four `partial_cognate`, and five `other`; their stored etymological relations are 21 `cognate` and five `unknown`.

This is the clearest issue found so far: **the local forms often exist, but the application's active sense pairing usually does not select the senses that were mapped to the same basic meaning.** That means the current category is not consistently answering “what is the relationship between these two words in this shared meaning?” Some rows say `other` even though their stored relation says `cognate`; in five active reviewed pairs, the category is `other` and the relation remains `unknown`. The disagreement points to sense-selection and relation-evidence gaps; it does not prove which individual label is wrong.

## Reproduction

After generating the local lemma Parquet files and source-record JSONL, place the IE-CoR v1.1 CLDF files under `pipeline/data/references/iecor-v1.1/`, then run:

```powershell
python pipeline/src/build_iecor_local_sense_crosswalk.py --force
python pipeline/src/audit_iecor_panel_against_db.py
```

The first command creates ignored local outputs in `pipeline/data/`: an 8,440-row crosswalk (8,422 local sense candidates plus 18 missing-form rows), the 1,690-row IE-CoR pair panel, and a manifest with input/output hashes. The second command runs a repeatable read-only, repeatable-read transaction against `word_comparisons` and writes the database audit JSON plus per-pair JSONL files. Set `DATABASE_URL` or pass `--db-url` if the local PostgreSQL connection differs from the development default.

The generated local manifest records the exact hashes. The audit was run against the live database on 2026-09-30; rerunning against a changed database may produce different counts.

## What this establishes—and does not

- It establishes that the project can align a bounded meaning panel to local dictionary-derived source senses, preserve separate IE-CoR cognate evidence, query the actual database, and quantify where the two disagree.
- It does not establish a whole-vocabulary cognate percentage, validate all Wiktionary histories, settle the complete taxonomy, or prove IE-CoR is right in every disputed case.
- It did not modify the live database.
- It does show that the current display taxonomy is too coarse to carry the separate questions of meaning alignment and historical relationship by itself.

## Next work

Expand sense review from the eight-meaning pilot, starting with the 18 exact-form gaps and the 54 reviewed-sense comparisons that do not become an active database pairing. Fix the shared selection/extraction rule that causes those mismatches, then rerun this exact audit before changing broad database labels. Keep the resulting sample metric explicitly scoped to the 169 meanings.
