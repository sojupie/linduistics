# Comparison dataset refresh — 2026-09-29

## What changed

- Rebuilt all five lemma files from the local Kaikki dumps with the parser's root cleaner fixed to distinguish Wiktextract `<key:value>` annotations from HTML tags. It preserves text wrapped in HTML and uses an inline `alt` form when that is the only ancestor form. This avoids both annotation-contaminated roots and the first attempted cleaner's loss of HTML-wrapped text.
- Rebuilt the full candidate set and verified all 1,638,454 directed pair keys still exist. Compared by pair identity, the cleaned roots changed 384 root fields, 18 `shared_etym_root` fields, 12 category values, and 14 etymological-relation values. All three similarity measurements were unchanged.
- Re-extracted and rematched source claims from the raw dumps. The matcher now writes `claim.scope` explicitly as entry → form; the enriched data retains multiple claims, source identity, evidence, uncertainty, target identity status, and exact versus case-fold form matching. Claims do not automatically set a pair-level historical relation.
- Pinned the default embedding model to the exact Hugging Face revision used by the rebuild, so a future run won’t silently resolve a newer model under the same name.
- The existing database seeder now defaults to the enriched full artifact and requires `--truncate` to replace a loaded table.

## Full-data results

The local development database had 403,694 rows before the first full refresh. It contained 28,820 `false_cognate` relation values, including rows where the value came from unequal root strings. The rebuilt artifact contains 1,638,454 directed comparison rows across ten language pairs. Its current relation rule only asserts `cognate` for equal root fields; missing or unequal roots remain `unknown`.

| Measure | Before: local DB | After: refreshed DB |
| --- | ---: | ---: |
| Directed comparison rows | 403,694 | 1,638,454 |
| `cognate` relation | 19,938 | 24,962 |
| `false_cognate` relation | 28,820 | 0 |
| `unknown` relation | 354,936 | 1,613,492 |
| `other` category rows | 174,156 | 1,145,886 |

The refreshed category totals are 361,880 `false_friend`, 1,145,886 `other`, 9,278 `partial_cognate`, 106,546 `translation_pair`, and 14,864 `true_cognate`. These are comparison-candidate row counts, not shares of either language’s total vocabulary. `other` remains a similarity/display bucket; it does not mean “unrelated.”

The source-claim matcher produced 20,188 claim matches. They became 40,376 directed attachments on 35,188 rows. Of those attachments, 39,566 have an available target entry/sense identity and 810 retain an ambiguous target identity. No matched claim record was dropped. Wiktionary claims with entry/form scope are still not proof that the selected cross-language senses share that relation.

## Rebuilding and loading

The complete local rebuild used these five raw Kaikki files (SHA-256 recorded by the source-export manifest):

| Dump | Bytes | SHA-256 |
| --- | ---: | --- |
| `kaikki_sv.jsonl` | 353,587,315 | `89faff8e49dccc32cbea87de565656a77cc2a775ce50fea7757ab71707a49bd7` |
| `kaikki_da.jsonl` | 95,556,980 | `c1782b489514765b960408c1b1fdc21f343c3ba4823ec9af709f39b01a8abc7a` |
| `kaikki_nb.jsonl` | 85,047,177 | `8aefc87034058ea2276eea9779f67b2ce122f646841e92955446f4b6ab2ee9ad` |
| `kaikki_de.jsonl` | 1,076,822,474 | `db551663e13e917884a90bdf89f01d5d09e7c3dd46eeaa8d6b3deb904c75917e` |
| `kaikki_en.jsonl` | 3,245,973,435 | `e38fe0e9b53e3387673fe46429a02b3dcecfd3e5bf5771d7766c5afa6fd41f25` |

The candidate scoring model was `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` at Hugging Face revision `e8f8c211226b894fcb81acc59f3b34ba3efd5f42`, using `sentence-transformers 6.1.0`, `torch 2.6.0+cu124`, `transformers 5.17.0`, and `pyarrow 25.0.1`. Rebuild the same local stage with:

```powershell
$py = "pipeline\.venv\Scripts\python.exe"
$lemmaDir = "pipeline\data\lemmas_rebuild_20260929"
foreach ($lang in @("sv", "da", "nb", "de", "en")) {
    & $py pipeline\src\parser.py --input "pipeline\data\kaikki_$lang.jsonl" --output "$lemmaDir\lemmas_$lang.parquet" --lang $lang
}
$env:HF_HUB_OFFLINE = "1"
& $py pipeline\src\build_crosslingual_dataset.py --lemma-dir $lemmaDir --output pipeline\data\all_comparisons_rebuild_20260929.parquet
& $py pipeline\src\extract_etymology_records.py --input-dir pipeline\data --languages sv da nb de en --output pipeline\data\etymology_records_rebuild_20260929.jsonl --force
& $py pipeline\src\audit_source_cognate_coverage.py --source-records pipeline\data\etymology_records_rebuild_20260929.jsonl --comparisons pipeline\data\all_comparisons_rebuild_20260929.parquet --matches-output pipeline\data\candidate_source_claim_matches_rebuild_20260929.jsonl --force
& $py pipeline\src\enrich_comparisons_with_source_claims.py --comparisons pipeline\data\all_comparisons_rebuild_20260929.parquet --source-claim-matches pipeline\data\candidate_source_claim_matches_rebuild_20260929.jsonl --output pipeline\data\all_comparisons_with_source_claims_rebuild_20260929.parquet --force
```

The generated stages have these hashes: source-record export `717e04e01608216d3d00bd8eab63c65f28a28fb587a7fe73148429532cf6d961` (710,110 records); candidate Parquet `a29d50eb6c6dad6731143c306797a81ea736d7e5302fbe2df2dd9adbfc5a33a3`; source-claim matches `bd8a0dc4a555b2a64699c911f170c7f9e98993df9c1870b5877ba7b15adebd26` (20,188 matches); and enriched Parquet `7f95943588e910141afdb586ea3b7a36dd6842f6114f4b6a5d75a56ccfbb2d5f`. The enriched manifest records full category/relation counts, attachments, ambiguities, and unmatched claims. These data artifacts are locally generated and ignored by Git; preserve the raw dumps and cached model revision to rerun this pipeline.

Load or replace the local database with:

```powershell
python db/seed_db.py --input pipeline/data/all_comparisons_with_source_claims.parquet --truncate
```

The first refresh saved the original 403,694-row table to `pipeline/data/word_comparisons_before_source_claims_20260929.dump` (SHA-256 `2E9D4A46718510B5412A5FB58C74535450238C4884C4D0FC0F75B4501473CB82`). Before the final raw-source rebuild was loaded, a fresh full-database rollback dump was created at `pipeline/data/linduistics_db_before_rebuild_20260929.dump` (SHA-256 `1f79ee2690cc2f3989fa902d64e1f78143196605a29d3daeb32d4210d9100791`). The existing seeder then committed all 1,638,454 rebuilt rows and ran `ANALYZE`.

## Verification

- Full Parquet scan: 1,638,454 rows; no values exceed the target database `VARCHAR` limits; maximum root length is 46 characters; no `false_cognate` relations remain.
- Full before/after comparison: category and relation counts match the manifest; source claims resolve to their exact active source senses; target ambiguity and claim scope are preserved.
- Pipeline tests: 46 passed across parser, enrichment, candidate building, classifier, source-claim matching, source-claim inventory, and semantic-model loading. Tests cover HTML-wrapped roots, inline annotations, alternate forms, multiple claims on one sense, ambiguous target identity, case-fold fallback, root cleanup/reclassification, and the pinned model revision.
- Go tests: `go test ./...` passed.
- Local API smoke checks: `/api/health`, `/api/languages?source=sv`, `/api/pairs?source=sv&target=da&q=dygn`, `/api/false-friends?source=sv&target=da`, and `/api/search?q=bank&lang=sv` returned HTTP 200. The `dygn` pair response included a `cognate_mention` with `entry` → `form` scope and an available target identity; the pair relation remained `unknown`.
- Direct database check: 1,638,454 rows, 40,376 claim attachments, maximum root length 46, and zero `false_cognate` relations. All database rows were streamed against the canonical Parquet in insertion order: no text or JSON mismatches; similarity values differed by at most `5.9e-8` because the existing PostgreSQL schema stores those fields as 32-bit `real` while Parquet stores 64-bit floats.

## Named edge cases queried in the loaded database

| Pair | Current record | What the evidence says |
| --- | --- | --- |
| Swedish–English *fleece* | `other` / `unknown`; English root is Proto-West Germanic `*fleus`, Swedish root is blank | The Swedish entry’s `borrowed_from` claim to English is attached with available target identity. English ancestry is not copied onto Swedish. |
| Swedish–English *clown* | `other` / `unknown`; the English entry has a root, Swedish does not | The Swedish-to-English borrowing claim is retained. The English entry’s older, qualified ancestry does not turn the Swedish loan into an inherited cognate. |
| Swedish–English *ombudsman* | `true_cognate` / `cognate`; both roots are Old Norse `umboðsmaðr` | The English-to-Swedish borrowing claim and shared older root coexist as distinct kinds of evidence. |
| Swedish–Danish *dygn–døgn* | `other` / `unknown`; roots differ | Swedish’s `cognate_mention` is retained as entry/form scope. Unequal reconstructed forms do not become a `false_cognate` judgment. |
| Danish–Swedish *aften–afton* | `other` / `unknown`; roots differ | Reciprocal `cognate_mention` claims remain visible despite the divergent recorded roots. The source conflict is not flattened into certainty. |
| Swedish–English *sandbank* | `other` / `unknown`; one target identity is ambiguous | The cognate mention is retained together with the ambiguous identity status; the pair relation stays unresolved. |
| Swedish–Bokmål *torta–tort* | `false_friend` / `unknown`; no matched source claim | `false_friend` is the similarity/meaning category here, not an etymological finding. Current evidence does not establish the historical relation for these selected forms. |
| Swedish–English *bankman* | `other` / `unknown`; roots and matched claims are absent | It remains unresolved. The possible compound relationship is not inferred from the surface form alone. |

## Read-only check: source claims inside `other`

After the refresh, I queried the local Postgres `word_comparisons` table directly. A candidate counts as “with a source claim” when either side's stored sense JSON contains at least one matched `source_claims` record. These are directed comparison rows, so the reverse direction is a separate row.

| Display category | Candidate rows | Rows with a matched source claim |
| --- | ---: | ---: |
| `false_friend` | 361,880 | 332 |
| `other` | 1,145,886 | 27,212 |
| `partial_cognate` | 9,278 | 2,992 |
| `translation_pair` | 106,546 | 1,028 |
| `true_cognate` | 14,864 | 3,624 |

The `other` coverage varies by language pair. Counts below are for **one direction**; the reverse direction has the same candidate and claim-bearing row counts in this database.

| Language pair | `other` rows per direction | Rows with a matched claim per direction |
| --- | ---: | ---: |
| German–English | 179,854 | 4,366 |
| English–Swedish | 98,698 | 1,548 |
| Swedish–German | 48,282 | 1,372 |
| Danish–German | 28,517 | 1,133 |
| Swedish–Danish | 26,447 | 1,046 |
| English–Danish | 63,237 | 1,015 |
| Norwegian Bokmål–German | 25,776 | 886 |
| English–Norwegian Bokmål | 56,325 | 836 |
| Danish–Norwegian Bokmål | 20,367 | 707 |
| Norwegian Bokmål–Swedish | 25,440 | 697 |

This makes the first end-to-end slice a choice between two goals. German–English has the most claim-bearing `other` candidates and a separate German-edition Wiktionary extract is available for a source comparison. Swedish–Danish directly tests the original Scandinavian concern and already has 1,046 claim-bearing candidates per direction. Either is large enough to exercise an evidence view without claiming to resolve the whole dataset.

The 27,212 `other` rows with claims are about **2.4%** of `other`. The other **1,118,674** rows have no matched claim attached in this build. “No matched claim” does not mean the source has no relevant history: the claim may be absent from this Wiktionary edition or dump, use a form the matcher did not connect, refer to a different etymon, or fail the current identity match.

Those 27,212 rows contain 30,534 attached claim records. The relationship and target-identity counts are:

| Source claim relation | Target identity available | Target identity ambiguous | Total attachments |
| --- | ---: | ---: | ---: |
| `cognate_mention` | 14,248 | 222 | 14,470 |
| `borrowed_from` | 10,852 | 268 | 11,120 |
| `derived_from` | 3,570 | 68 | 3,638 |
| `calque_of` | 640 | 8 | 648 |
| `inherited_from` | 356 | 2 | 358 |
| `noncognate_mention` | 148 | 2 | 150 |
| `semantic_loan_from` | 58 | 2 | 60 |
| `partial_calque_of` | 54 | 0 | 54 |
| `pseudo_loan_based_on` | 30 | 2 | 32 |
| `influenced_by` | 4 | 0 | 4 |
| **Total** | **29,960** | **574** | **30,534** |

This is a practical opening for a better lexicon view: some current `other` candidates already have useful, inspectable source claims. It is not a basis for relabeling all 27,212 rows. The claims can be entry-to-form statements, may coexist, and may not apply to the selected comparison senses as a pair. The current API stores the claims inside the sense JSON, but the frontend does not present them as a distinct evidence view.

This check was a read-only query against the local database. It did not alter the database or category labels. Re-run it after any subsequent load before treating these counts as current.

## Remaining limits

- `other` still contains 1,145,886 candidate rows. This pass does not turn the entire candidate set into historical classifications; most entries have no matched structured claim, and a matched claim may not apply to the selected target sense.
- The claim source identifies Wiktionary through the Kaikki/Wiktextract dump, page URL, entry key, and extracted template data. It does not currently pin a Wiktionary revision ID.
- The API returns the evidence inside its existing sense JSON. This refresh does not add a dedicated evidence presentation in the frontend.
- The full input dumps and intermediate generated Parquet/JSONL files are local ignored data. The manifests and this report record hashes, but durable reproducibility depends on retaining those dumps and the specified model revision.
