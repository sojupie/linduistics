# Resume dataset work on Fedora

Checked 2026-10-14. This is a recovery plan, not a new dataset experiment.

## What survived

- Fedora is on `main` at `d0c1141`. It includes the reconstructed five-language
  pipeline and atomic publisher, but predates the experiments and verification
  protocol. Local Linux launcher and dependency edits remain uncommitted.
- The mounted Windows checkout is on `e5` at `765f156`. Its history is now
  preserved locally as `codex/recovered-e5`; the active branch was not changed.
- Both the five-language reconstruction and the formalized build have SHA-256
  `a7e2bfe3ffa75931c9134f3e570eec53cbf644713b738bedc055fdc9b44b120f`.
  Their file contents match. The saved build reports 1,638,454 directed comparisons
  for Danish, German, English, Norwegian Bokmål and Swedish.
- The final parquet, lemma/form files, lookup snapshots, manifest and report were
  copied to `pipeline/data/builds/20261003-formalized` on Fedora. These are the
  existing publication inputs, not a fresh build. Copied data files were checked
  against the saved manifest hashes.
- The pre-expansion PostgreSQL backup remains on Windows at
  `pipeline/data/backups/pre-language-expansion-20261002/linduistics-before-language-expansion.dump`.
  Windows is mounted at `/run/media/sojupie/001C3C8E1C3C8128`; the checkout is under
  `Users/ollem/Git/Github/linduistics`. Source files were not changed.
- Docker already has a stopped `linduistics-postgres` container and a named data
  volume. Its database contents have not been inspected. Do not assume it is empty.

## What the previous work established

We recreated the accepted five-language output and formalized an equivalent build
and atomic publication. That established reproducibility, not linguistic accuracy.

The later experiments found promising improvements in dictionary-based meaning
evidence and selecting useful displayed senses. Candidate removal had real losses;
historical extraction also had scope errors. Dutch and Icelandic remained offline
experiments. None of those methods was adopted as an improved release.

The final agreement was to freeze criteria before experiments, check independent
expected vocabulary, review broader reproducible samples and report retrieval,
display, modern meaning, history and task quality separately. The control is not
a gold standard. Reserved families and actual product checks remained unfinished.

## Do next, in this order

1. **Reconcile code.** Preserve current Linux edits, then continue from
   `codex/recovered-e5` and bring those launcher changes across. Recover the
   verification protocol, experiment records and independent reference files.
   Do not overwrite the current checkout with Windows files wholesale.
2. **Inspect the existing PostgreSQL volume.** Start the existing container,
   inspect schemas and counts, and identify whether it holds data worth retaining.
   Back up populated application tables before replacing them.
3. **Restore the accepted application state.** Apply the required migrations in
   an isolated recovery database, then use `db.publish_dataset.publish` with the
   copied verified build. Check all publication inputs first. This reuses the
   accepted result without rerunning parsing, embeddings or classification.
   Keep the older pre-expansion dump for reference; do not treat it as the latest
   verified publication source.
4. **Prove the app works on Fedora.** Verify all five languages, 20 directed
   pairs, comparison/core/category totals, forms and lookup tables. Run API search,
   exact detail links, lexicon displays and games. Report data defects separately
   from migration or startup defects. Only then choose the application database.
5. **Resume one bounded improvement.** Start with E2's dictionary evidence linked
   to actual endpoint senses. Keep retrieval and headline selection fixed for
   that experiment. Freeze the plan and sample first; compare gains and losses
   using the recovered verification workflow. E1's headline selection comes next.

Success for recovery is a working Fedora app serving the verified five-language
artifact with the later evaluation history available. Success for improvement is
better independently checked output, not reproduction of the control's mistakes.

No database import, service start, branch switch or new experiment was performed
while recording this plan.

## Recovery completed

The user subsequently authorized this plan. The [recovery result](FEDORA_RECOVERY_RESULT.md)
records the restored application, full import checks, browser checks, recovery
fixes and successful E2 replay. Use that result for current state.
