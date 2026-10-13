# Fedora recovery result

Completed 2026-10-14. The accepted five-language application dataset is running
again. This recovered existing output; it did not rebuild or improve its labels.

## Active state

- Branch: `codex/fedora-recovery`. The later `e5` history is merged, including
  experiments, reviews, the verification protocol and its sampling tool.
- Database: `linduistics_recovery_20261014`, in the existing Docker PostgreSQL
  container. The original `linduistics` database had no application tables and
  remains untouched. Local `.env` selects the verified recovery database.
- App: `http://127.0.0.1:5173/languages`; Go API on port 8080 and NLP on 5001.
- Existing Fedora launcher and README edits were preserved and remain uncommitted.
- Windows files and the pre-expansion dump remain untouched. Independent reference
  files and all 11 frozen evaluation inputs are now available locally and pass
  their original hashes.

The imported artifact is `pipeline/data/builds/20261003-formalized/final.parquet`,
SHA-256 `a7e2bfe3ffa75931c9134f3e570eec53cbf644713b738bedc055fdc9b44b120f`.
Publication used the existing atomic publisher after migrations 001–017.

## Verification results

| Check | Result |
| --- | --- |
| Comparisons | 1,638,454; all IDs and persisted fields checked against the artifact |
| Languages | Danish, German, English, Norwegian Bokmål and Swedish |
| Directed language pairs | 20; API counts sum to the imported total |
| Core comparisons | 288,512, matching the saved build |
| Categories | Every category count matches the saved build |
| Form mappings | 1,296,113; all five language counts match their source files |
| Inflections | 4,993,030; every stored lookup field matches |
| Synonym records | 187,263; every stored lookup field matches |
| Cognate clusters | 6,151; every stored lookup field matches |
| Search links | Ten results resolve to their exact pair IDs and endpoint words |
| Seeded queries | Same seed repeats the sample; another seed changes it |
| Quiz data | Ten questions have four distinct options and the correct answer index points to the stored target definition |
| Text Inspector | Uses the NLP service; all five spaCy parsing models installed |

Numeric comparison checks account for the existing PostgreSQL `REAL` storage
and text COPY conversion. They do not require a double-precision parquet value
to equal a text-rendered database float. No score column or classifier changed.

Firefox checks covered overview, lexicon, games menu, all five game routes and
Text Inspector. The lexicon opens Champagner/champignon with the local search
prefilled. Sort the Pairs allows changes, keeps options stable and completes a
round. Odd Word Out enforces one choice and advances. Word Family keeps options
stable and shows scoring. Cognate Grid shows language labels and advances to the
second grid. False Friends reveals the source in Target Only and advances to the
next question.

These are functional checks, not proof that every generated question or historical
label is linguistically correct. Known dataset quality issues remain for experiments.

Other checks passed: frontend production build, all Go tests against the recovered
database, five Linux launcher tests, the verification self-check, the new manifest
path regression test and both publication tests, including real database rollback
in a disposable database.

## Recovery fixes

1. Added migration 017 for core tags, their index and the accepted origin relation
   constraint. Previously the reclassification script made these schema changes;
   importing an accepted result should not require running that classifier.
2. Added a shared reader for historical Windows paths in evaluation manifests.
   The manifests stay unchanged. E0, E2, E4 and E5 candidate checks use it; a test
   checks that it preserves spelling case and rejects ambiguous duplicate paths.
3. Blocked an empty Cognate Grid submission. Browser testing found it awarded
   points without any selected pair. The disabled button and prompt use existing
   design tokens; no CSS values or components were introduced.

## E2 is reproducible on Fedora

Replayed the existing dictionary-evidence method with the frozen inputs and
references. All 207 profiles, labels and decisions match the old result:

- Legacy classifier: 80/197 compatible labels.
- Dictionary evidence: 169/197.
- Always predict partial overlap: 114/197.

These remain development results against source-guided agent judgments, not
population accuracy or new evidence of improvement. The old numerical gates
printed by that runner remain historical diagnostics under the revised adoption
criteria. The replay did not tune or open reserved families.

## How to restart

```bash
docker start linduistics-postgres
./run-backends.sh
```

In another terminal:

```bash
pnpm --dir frontend dev --host 127.0.0.1
```

Services were left running after verification. Stop an existing launcher before
starting another one; its port checks deliberately refuse occupied ports.
The Linux virtual environment is installed for publication, NLP and the tested
evaluation replay. It is not a recreated full embedding-build environment.
The current package versions are recorded under `pipeline/data`.

## Evidence and next work

Local audit artifacts are under `pipeline/data`: publication, import verification,
API and browser checks, screenshots, package versions and the E2 replay. Recovery
check scripts are saved in `pipeline/data/fedora-recovery-20261014` with hashes.
They are operational audit files, not new dataset training or evaluation references.

The next improvement is E2's endpoint sense check. Test whether dictionary links
refer to the actual source and target entries, grammar and modern usage before
using them to establish overlap. Keep candidates, headline selection, dense scores
and history fixed. Compare with the reproduced E2 method, the legacy and dense
controls, and the trivial partial-overlap predictor. Preserve narrower or secondary
overlap and the inference path when dictionary evidence is absent.

Save its sampling frame, review allocation and trade-off criteria under the
[verification protocol](DATASET_VERIFICATION.md) before implementation or scoring.
The old 207 cases are a diagnostic check; fresh weighted development review and
later reserved-family confirmation are still required. Do not adopt a change
because it only improves that familiar slice.
