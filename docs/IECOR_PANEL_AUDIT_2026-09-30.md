# IE-CoR panel audit — 2026-09-30

## What this checks

This is a bounded test of the current data pipeline, not a claim about the full vocabularies of these languages. It uses IE-CoR v1.1's 169 meanings with forms in Danish, English, German, Norwegian Bokmål, and Swedish, then links those spellings to the project's Wiktionary-derived local records. IE-CoR's cognate-set assignments remain reference evidence; they are not copied onto local entries.

The complete panel has 169 meanings × 10 language pairs = **1,690 meaning-level pairs**. The source forms also include one additional concept with entries in only four languages; it is kept in the form table for coverage visibility but has no meaning-pair rows. A pair is marked `shared_cognate_set` when at least one form on each side is assigned to the same IE-CoR cognate set. `no_shared_cognate_set` means no shared set was found in IE-CoR; it does **not** mean “false cognate.” These counts describe this panel only.

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

The existing eight-meaning sense review contributes 40 primary links, six additional compatible links, and one rejected candidate. They appear on 47 candidate rows after matching by language, normalized word, source-sense ID, and exact gloss. The other 8,375 local candidate rows are unreviewed.

The source data reuses some `source_sense_id` values for different gloss records, so an ID alone is not a unique candidate key. The reviewed overlay is matched by language, normalized word, source-sense ID, and exact gloss. The PostgreSQL load fingerprints the form, source key, ID, gloss, tags, and root to distinguish records; it does not copy gloss text into the new tables.

### IE-CoR relationships

| Reference result | Meaning-level pairs |
| --- | ---: |
| Shared cognate set | 1,094 (64.7%) |
| No shared cognate set | 596 (35.3%) |

This is a count over a selected set of meanings, not a percentage of all words in any language. A shared set also does not, by itself, tell us whether a local word was inherited or borrowed.

Each language pair has the same denominator: 169 meanings. This is the useful comparison view; the pooled 64.7% hides differences between pairs.

| Language pair | Shared sets | No shared set | Shared-set rate | Both forms have exact local entries |
| --- | ---: | ---: | ---: | ---: |
| Danish–German | 105 | 64 | 62.1% | 164 of 169 |
| Danish–English | 86 | 83 | 50.9% | 164 of 169 |
| Danish–Norwegian Bokmål | 149 | 20 | 88.2% | 164 of 169 |
| Danish–Swedish | 143 | 26 | 84.6% | 164 of 169 |
| German–Norwegian Bokmål | 102 | 67 | 60.4% | 166 of 169 |
| German–Swedish | 102 | 67 | 60.4% | 166 of 169 |
| English–German | 95 | 74 | 56.2% | 166 of 169 |
| English–Norwegian Bokmål | 86 | 83 | 50.9% | 166 of 169 |
| English–Swedish | 86 | 83 | 50.9% | 166 of 169 |
| Norwegian Bokmål–Swedish | 140 | 29 | 82.8% | 164 of 169 |

The rate means “share of this fixed 169-meaning list whose forms belong to a shared IE-CoR cognate set.” It is quantifiable and repeatable, but it describes this reference list, not the full vocabulary or the project's own Wiktionary-derived classification.

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

## Data added to PostgreSQL

Migration `db/migrations/010_create_iecor_meaning_panel.sql` adds four tables alongside the app's existing headword comparisons:

| Table | Rows loaded | Purpose |
| --- | ---: | --- |
| `iecor_reference_concepts` | 170 | IE-CoR concepts, including the one incomplete four-language concept |
| `iecor_reference_forms` | 853 | Reference forms, cognate-set IDs, local exact-form matches, and source URLs |
| `iecor_local_sense_links` | 8,353 | Distinct local sense candidate records with review status and source link |
| `iecor_meaning_pairs` | 1,690 | Meaning-scoped language pairs and their IE-CoR cognate-set relation |

The 8,353 sense-link rows include 40 `selected_primary`, six `selected_additional`, one `rejected_sense_mismatch`, and 8,306 `unreviewed` records. They contain 7,117 distinct source-sense IDs, another reason not to treat that ID alone as the record key.

The live `word_comparisons` table remains at 1,638,454 directed rows. Existing categories and selected glosses were not rewritten. These new tables are queryable in PostgreSQL but are not yet exposed through a Go API or UI.

## Reproduction

After generating the local lemma Parquet files and source-record JSONL, place the IE-CoR v1.1 CLDF files under `pipeline/data/references/iecor-v1.1/`, then run:

```powershell
python pipeline/src/build_iecor_local_sense_crosswalk.py --force
python pipeline/src/audit_iecor_panel_against_db.py
```

The first command creates ignored local outputs in `pipeline/data/`: an 8,440-row crosswalk (8,422 local sense candidates plus 18 missing-form rows), the 1,690-row IE-CoR pair panel, and a manifest with input/output hashes. The second command runs a repeatable read-only, repeatable-read transaction against `word_comparisons` and writes the database audit JSON plus per-pair JSONL files. Set `DATABASE_URL` or pass `--db-url` if the local PostgreSQL connection differs from the development default.

To load the panel, apply migration 010, then run `python pipeline/src/seed_iecor_panel.py --replace`. The seed replaces only the IE-CoR v1.1 rows in these four tables; it does not update `word_comparisons`.

The generated local manifest records the exact hashes. The audit was run against the live database on 2026-09-30; rerunning against a changed database may produce different counts.

## What this establishes—and does not

- It establishes that the project can align a bounded meaning panel to local dictionary-derived source senses, preserve separate IE-CoR cognate evidence, query the actual database, and quantify where the two disagree.
- It does not establish a whole-vocabulary cognate percentage, validate all Wiktionary histories, settle the complete taxonomy, or prove IE-CoR is right in every disputed case.
- It does not automatically transfer IE-CoR cognate-set IDs to local words or rewrite existing categories.
- It does show that the current display taxonomy is too coarse to carry the separate questions of meaning alignment and historical relationship by itself.

## Next work

Use the loaded 169-meaning panel as the first project-owned, meaning-aligned comparison set. The next steps are:

1. Resolve the 18 missing local headword matches; keep unresolved spellings visible instead of silently dropping those slots.
2. For the eight already reviewed meanings, fix the sense-selection path so all 80 selected meaning pairs reach the database as active meaning-aligned comparisons. The audit currently finds 26 active, 9 with one reviewed sense absent, 35 with both senses present but inactive, and 10 with no headword-pair row.
3. Review the remaining local sense choices for the 169 meanings. For each of the ten language pairs, publish counts as `shared cognate evidence / pairs with aligned local senses`, alongside alignment coverage. Do not use all 169 as the denominator when a pair is missing local forms or aligned senses.
4. Compare that project-derived result to the IE-CoR baseline table above. Keep mismatches inspectable as concrete form/sense/source examples; do not overwrite local labels from the reference set.

The acceptance check is a queryable table with one row per concept and language pair, the local forms and selected senses, their source links, a simple relationship classification, and an explicit aligned/not-aligned state. Its summary must report numerator, denominator, and coverage together. That is a useful, bounded dataset product; a percentage without those three values is not.
