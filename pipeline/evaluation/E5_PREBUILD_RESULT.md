# E5: frozen panel and old-pair regression

Date: 2026-10-03. Branch: `e5`. This completes preparation and the candidate/classifier regression before new-language sense alignment. It does not complete admission.

## What was fixed

[E5_ADMISSION_PLAN.md](E5_ADMISSION_PLAN.md) separates source admission, retrieval, displayed meanings, practical labels, and game suitability. Transfer limits are project decisions. Matching the old dataset's quality is not enough to approve a release. New core vocabulary statistics are not inferred from comparison degree.

The independent panel contains all 1,900 IE-CoR comparisons involving Dutch or Icelandic: 1,293 development cases, 574 reserved cases, and 33 diagnostic bridge cases. Every new language pairing has its own cases. Shared concept, expert-set, and lexical links carry the existing family separation forward. Water, lake, and sea link previously separate development and reserved groups; their new comparisons are diagnostic rather than clean held-out evidence. No saved reserved meaning judgments or new predictions were read to construct the panel.

Two panel runs produce identical case and count files. E5-panel001 retains the first code hash; E5-panel002 is the authoritative preparation protocol after a role-name self-check correction. No case assignment changed.

## Regression result

Seven-language translation mining produces 480,040 undirected translation candidates. For the original ten language pairings:

- All 819,227 canonical candidate headword pairs and their order match the saved baseline exactly, including the translation, identical-spelling, and prefix channels.
- All old translation source-entry and source-sense reference sets match exactly. Added membership introduces no extra old translation pair.
- All 1,638,454 directed old rows reproduce their final category and historical relation through the unchanged V2 scalar classifier.
- The eleven frozen baseline and lemma/form input hashes match. The source audit's new lemma hashes and the saved English source hash also match.

This check took 100.9 seconds. These are full candidate and final-label replays, not sample checks. It does **not** regenerate old embeddings, reselect old definitions, or reattach old source claims. Those inputs remain unchanged and hash-verified; whole-field preservation of the assembled expanded artifact still needs checking after the new-pair build.

### New translation candidates

| Pair | Candidates |
| --- | ---: |
| Danish–Dutch | 17,677 |
| German–Dutch | 49,824 |
| English–Dutch | 35,882 |
| Norwegian–Dutch | 17,120 |
| Dutch–Swedish | 30,809 |
| Danish–Icelandic | 7,196 |
| German–Icelandic | 13,562 |
| English–Icelandic | 8,808 |
| Icelandic–Norwegian | 6,987 |
| Icelandic–Swedish | 10,150 |
| Icelandic–Dutch | 10,530 |

These are retrieved links, not validated translations or correctly labeled word pairs. Source-sense references are retained in the per-pair Parquet files. New surface candidates and full sense alignment have not run yet.

## Failed first replay and correction

E5-candidates001 incorrectly converted scalar scores with Python binary32 rounding. The historical pipeline uses text input converted to PostgreSQL REAL and returned through psycopg's text result representation. These are different at threshold boundaries. The first disagreement was `bent` / `Benedikt`: the saved phonetic score is 0.6500000059604645; direct binary32 rounding falls below the classifier's 0.65 threshold and changes the category.

E5-candidates002 uses the existing `dataset_artifact.py` conversion through read-only SQL. Every old final label then matches. This is a replay correction, not a classification change. The failure record is preserved.

## Reproduction

```powershell
.\pipeline\.venv\Scripts\python.exe -X utf8 pipeline/evaluation/e5_panel.py --output pipeline/evaluation/<new-panel-directory>
.\pipeline\.venv\Scripts\python.exe -X utf8 pipeline/evaluation/e5_candidates.py --output pipeline/evaluation/<new-candidate-directory>
```

The replay requires the existing local PostgreSQL server for the historical numeric conversion. It sets the transaction read-only and does not mutate the database. Output directories must be new; existing artifacts are never overwritten. Protocols record code, plan, panel, input, and translation artifact hashes.

## Decision and remaining work

Proceed to Dutch's five full pair builds using these retained translation references and the unchanged methods. Then review development recall, selected meanings, open vocabulary, historical evidence, and game eligibility per pair. Repeat for Icelandic, including Dutch–Icelandic. Assemble the expanded offline artifact, check every old field and row order, and evaluate reserved families and actual product behavior after methods are fixed. No language admission or publication has passed yet.
