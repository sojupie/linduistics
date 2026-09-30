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
| `iecor_meaning_pairs` | 1,690 | Meaning-scoped IE-CoR relation plus local sense links and ancestry evidence |

The 8,353 sense-link rows include 40 `selected_primary`, six `selected_additional`, one `rejected_sense_mismatch`, and 8,306 `unreviewed` records. They contain 7,117 distinct source-sense IDs, another reason not to treat that ID alone as the record key. Each link also retains the root label parsed for that local sense; the root is evidence text, not a normalized ancestor identity.

The live `word_comparisons` table remains at 1,638,454 directed rows. Existing categories and selected glosses were not rewritten. These new tables are queryable in PostgreSQL but are not yet exposed through a Go API or UI.

The 1,690 meaning-pair rows currently have 58 `shared_direct_ancestor_claim`, seven `shared_proto_ancestor_mention`, 15 `no_common_ancestor_evidence`, and 1,610 `unreviewed` local statuses. `no_common_ancestor_evidence` is not a false-cognate verdict.

### Root-label check on the reviewed eight meanings

The read-only audit joins the 40 manually selected local senses into 80 meaning-level language pairs and compares their parsed root labels after trimming, collapsing whitespace, and ignoring case.

| Check | Pairs |
| --- | ---: |
| Both local senses have a root label | 73 of 80 |
| Root labels match exactly after normalization | 55 |
| Root labels differ | 18 |
| One side has no root label | 7 |

All 55 exact-label matches are among IE-CoR's shared-set pairs. Five more IE-CoR shared-set pairs have different root labels; the remaining 13 different-label pairs have no shared set in IE-CoR. All seven pairs missing a root are IE-CoR shared-set pairs. This is a selected eight-meaning pilot, not a random sample or a verified accuracy score.

The source records show why root-string equality is too strict. English `fire` and German `Feuer` have different selected root labels, but both extracted entries include an inherited-from claim to Proto-West Germanic `*fuir`. Danish `kvinde` and Swedish `kvinna` likewise both include a Proto-Germanic `*kwenǭ` claim. These are inspectable source claims in the local dump; they support building a shared-ancestor path, while still requiring correct entry and sense matching.

The audit writes `iecor_panel_db_audit_v1.1_reviewed_roots.jsonl` with the selected words, senses, root labels, and per-pair result. The root result is explicitly `same_root_label`, `different_root_labels`, or a missing-root state; it is not written back as a `word_comparisons` category.

### Direct source-claim check

The next audit compared the full extracted records for the same 40 selected local senses. It matched explicit `inherited_from` and `derived_from` claims by ancestor language and form, then separately checked Proto-language ancestors written in the etymology text before any “Cognates” section. A `cognate_mention` is not treated as an ancestry path.

| Local evidence found | Pairs | IE-CoR shared-set pairs | IE-CoR no-shared-set pairs |
| --- | ---: | ---: | ---: |
| Same direct ancestry claim | 58 | 58 | 0 |
| Same Proto-ancestor text mention, no direct match | 7 | 7 | 0 |
| No common ancestor evidence extracted | 15 | 2 | 13 |

So, for this selected sample, our extracted source data exposes a common ancestor for **65 of the 67** IE-CoR shared-set pairs. It finds no common-ancestor evidence in the 13 pairs IE-CoR marks as having no shared set. Two shared-set pairs remain unresolved: Danish–Norwegian Bokmål and Norwegian Bokmål–Swedish for “woman.” The Bokmål entry stops at Old Norse `kvinna`; the current five-language dump does not include that historical entry to follow the ancestry further. This is promising evidence that a useful result is possible, not a general accuracy claim: the eight meanings were deliberately reviewed, the reference is not ground truth, and the two missing paths remain unresolved.

The reproducible result is `iecor_reviewed_ancestry_v1.1.jsonl`; its manifest records hashes for the exact crosswalk, pair list, and 1.08 GB extracted Wiktionary records. All 80 reviewed results are loaded into `iecor_meaning_pairs` with the selected local words, senses, source links, and evidence. The remaining 1,610 pairs stay `unreviewed`.

### Full-panel ancestry candidate pass

The eight-meaning review showed that a full-panel pass was possible without pretending every sense had already been selected. The new pass compares unique exact-form Wiktionary etymology entries for all 1,690 meaning pairs, keeps the senses under each entry as alternatives, and exports each matching source-claim path. This avoids multiplying the same entry-level ancestry claim once for every sense listed under that entry.

| Candidate evidence status | Meaning pairs |
| --- | ---: |
| Shared direct ancestor claim found in at least one local entry pair | 849 |
| Shared Proto-ancestor mention found, with no direct match for the pair | 38 |
| No common ancestry claim found in available records | 545 |
| Candidate source records missing, so the result is incomplete | 200 |
| No exact local entry on both sides | 58 |
| **Total** | **1,690** |

The reference comparison is useful because it exposes both signal and disagreement:

| IE-CoR reference relation | Local direct claim | Local Proto mention only | No local ancestry found | Incomplete source records | No two-sided local entry |
| --- | ---: | ---: | ---: | ---: | ---: |
| Shared cognate set | 816 | 36 | 162 | 54 | 26 |
| No shared cognate set | 33 | 2 | 383 | 146 | 32 |

The 33 direct-claim and two Proto-mention pairs in IE-CoR's `no_shared_cognate_set` group are a concrete review queue, not automatic corrections. For example, the Danish and German entries for “play” both point to Proto-West Germanic `*spilōn`; matching sense candidates describe playing a game or performance. IE-CoR assigns no shared set to that pair. This is the kind of inspectable discrepancy that can improve our source-derived classifications.

The full output retains **1,668 entry-pair evidence records**, including both supporting and disagreeing comparisons. It also exposes the current coverage gap: 1,496 of 1,623 exact entry keys were found in the extracted source records, leaving 832 entry-pair combinations incomplete. A pair can have candidate evidence and still have other missing entry records, so use its missing-record count as well as its status.

These numbers are a broad candidate pass, not final sense-level classifications. The exact headword match identifies the form, but a word can have several senses and etymology sections. Candidate evidence conflicts with IE-CoR's no-shared-set status in 35 pairs, while 162 shared-set pairs have no common ancestry claim in the currently extracted records. Preserve those differences for inspection; do not choose a winner automatically. The detailed outputs are `iecor_candidate_ancestry_v1.1_pairs.jsonl` and `iecor_candidate_ancestry_v1.1_evidence.jsonl`; the manifest hashes all three source inputs and both outputs.

## Reproduction

After generating the local lemma Parquet files and source-record JSONL, place the IE-CoR v1.1 CLDF files under `pipeline/data/references/iecor-v1.1/`, then run:

```powershell
python pipeline/src/build_iecor_local_sense_crosswalk.py --force
python pipeline/src/audit_iecor_panel_against_db.py
python pipeline/src/audit_iecor_reviewed_ancestry.py
python pipeline/src/audit_iecor_candidate_ancestry.py
```

The first command creates ignored local outputs in `pipeline/data/`: an 8,440-row crosswalk (8,422 local sense candidates plus 18 missing-form rows), the 1,690-row IE-CoR pair panel, and a manifest with input/output hashes. The second command runs a repeatable read-only, repeatable-read transaction against `word_comparisons` and writes the database audit JSON plus per-pair JSONL files. Set `DATABASE_URL` or pass `--db-url` if the local PostgreSQL connection differs from the development default.

To load the panel, apply migrations 010, 011, and 012, then run `python pipeline/src/seed_iecor_panel.py --replace`. The seed replaces only the IE-CoR v1.1 rows in these four tables; it does not update `word_comparisons`.

The generated local manifest records the exact hashes. The audit was run against the live database on 2026-09-30; rerunning against a changed database may produce different counts.

## What this establishes—and does not

- It establishes that the project can align a bounded meaning panel to local dictionary-derived source senses, preserve separate IE-CoR cognate evidence, query the actual database, and quantify where the two disagree.
- It does not establish a whole-vocabulary cognate percentage, validate all Wiktionary histories, settle the complete taxonomy, or prove IE-CoR is right in every disputed case.
- It does not automatically transfer IE-CoR cognate-set IDs to local words or rewrite existing categories.
- It does show that the current display taxonomy is too coarse to carry the separate questions of meaning alignment and historical relationship by itself.

## Next work

Use the loaded 169-meaning panel as the first project-owned, meaning-aligned comparison set. The next steps are:

1. Review the 35 IE-CoR no-shared-set pairs where the local entry claims point to a common ancestor. Start with “play” (Danish *spille* and German *spielen*) and record whether the forms, senses, and source claims support the same historical relationship.
2. Inspect the 162 IE-CoR shared-set pairs with no common ancestor found, separating actual etymology gaps from the 54 incomplete source-record cases and 26 pairs without two-sided local entries.
3. Repair the 127 missing source-entry records and resolve the 18 local form misses, then rerun the candidate export. Keep the output as evidence candidates until the conflicting and unresolved cases have a sense-level decision.
4. Only after those checks, write accepted relationships into the project's own data model. Keep IE-CoR assignments and local Wiktionary claims as separate evidence, and keep multiple relations possible for one pair.

The full 169-meaning pass now produces reproducible, source-linked candidate evidence files without changing the existing app comparison table or loading these new candidate results into PostgreSQL. It shows that useful counts are possible, and it identifies specific source gaps and disagreements to review before promoting candidates to classifications.
