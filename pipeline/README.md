# Dataset build and publication

The pipeline preserves the accepted five-language result. It does not change candidate selection, sense selection, roots, thresholds, or category meanings.

## Run

From the repository root, with the local dumps, cached model, and PostgreSQL available:

```powershell
pipeline/.venv/Scripts/python.exe pipeline/run.py --run-dir pipeline/data/builds/20261003-formalized
```

This builds and verifies files without changing application tables. Add `--publish` to publish the verified result. Repeating the command reuses completed stages only when their inputs, code, environment, and output hashes still match.

Use a new directory when those inputs change. Completed build files are immutable. An interrupted stage has no completed manifest entry and runs again. Logs are saved per stage; `report.txt` summarizes the result in plain text.

The installed versions used for the verified baseline are recorded in `requirements.lock.txt`. Install them in a fresh environment with `python -m pip install -r pipeline/requirements.lock.txt`. The manifest also records Python, OS, PostgreSQL, model revision, device, and installed package versions. A dependency upgrade requires a new build and equivalence check.

## Build contract

The order is parsing, form extraction, comparison generation and sense selection, source-evidence extraction, claim matching, enrichment, and final v2 classification. The recovered source matcher is tracked in `src/audit_source_cognate_coverage.py`; no Git-history extraction is needed to run it.

`src/languages.py` defines language membership. Historical traversal orders remain where they affect output. The comparison writer releases each language pair after writing it, while preserving pair and row order. Model encoding order and batch settings are unchanged.

Final classification uses the existing `classify_pair_senses` function with the same scalar inputs, empty sense lists, shared-root fallback, and PostgreSQL `REAL` conversion as the historical database update. It does not realign senses. It verifies every field and row against the reference before completing `final.parquet`.

The default reference is the verified reconstruction at `data/reproduce-five-language-20261002/all_comparisons_v2.parquet`. Its accepted `is_core` membership is preserved: the historical frequency query has no tie-break for equal counts, so reranking could change tags. Categories are freshly calculated and must match; they are not copied from the reference.

The accepted inflection, synonym, and cluster tables are immutable lookup inputs under `data/reproduce-five-language-20261002/lookups`. They preserve IDs, array order, and cluster creation times. These are snapshots of the accepted application lookups, not newly inferred data. The cluster builder runs on the new lemmas and final comparisons and must reproduce the same roots, members, languages, and sample meanings. Updating raw data, core policy, or lookup content requires a separately reviewed reference; this refactor deliberately rejects such changes.

## Publication

The publisher checks final and lookup hashes before opening its write transaction. It loads comparisons, form mappings, inflections, synonyms, and clusters in one transaction. An exception rolls them all back. Pair IDs retain their historical row order; other lookup IDs are loaded explicitly. `is_core` is loaded directly. There is no live reclassification interval or second full comparison update.

Publication takes database locks while replacing these tables; readers can wait during the load. This is atomic publication, not a claim of zero downtime. The immutable build file remains the source of truth. Restart the backend after a successful publication to clear caches; do not restart on failure.

The existing individual scripts remain available for diagnosis. `db/seed_db.py` now loads core tags when the input includes them. Use the runner and publisher for a complete release rather than combining individual commands manually.

## Verification

```powershell
pipeline/.venv/Scripts/python.exe -m pytest pipeline/tests -q -p no:cacheprovider
```

For the PostgreSQL rollback check, create an empty disposable database whose name starts with `linduistics_pipeline_test`, set `PIPELINE_TEST_DB` to its connection URL, and run the same tests. The test publishes a tiny dataset, deliberately fails during form loading, and verifies that previous comparisons and lookups remain present. It refuses the live database name.

Successful baseline equivalence proves that the refactor preserves behavior. It does not by itself prove linguistic accuracy. Changes to selection or classification remain separate work.
