# Continue the sense-selection work

Handoff written 2026-11-19. Last implementation/audit work: 2026-10-25, on Fedora Linux.

## Where we stopped

Branch: `codex/e2-sense-scope`. Latest audit: `5b84f6d`.

Verification, a development preview, and a detailed adoption audit are committed. **The corrected selector is not implemented.** The live dataset was not changed by this work.

Start with [HEADLINE_ADOPTION_AUDIT.md](../pipeline/evaluation/HEADLINE_ADOPTION_AUDIT.md). It supersedes the earlier recommendation to stop at a preview and await another reviewer. The agent must assess the outputs; the user should not have to find counterexamples.

## What we learned

A reasonable definition of each word does not necessarily explain their comparison. The candidate improves many ordinary readings but can replace a valid “fire/fire” comparison with “fire/kick.” Keep ordinary word introductions separate from the sense pairs that support the relationship. Preserve useful secondary meanings.

## Next work

1. Correct the general rules in `pipeline/src/sense_display.py`: premature source-order exclusions, auxiliary/lexical conflation, grammar preferences overriding meaningful relationships, name/entity filtering, and priority accidentally granted by missing metadata.
2. Use the actual endpoint candidates from `translation_support.py`, not just their grammatical classes. Preserve inferred versus directly identified evidence.
3. Assess existing cases as development material, including unchanged cases. Check introductory quality, comparison correctness and retained secondary meanings separately. Do not add word-specific exceptions.
4. Freeze the revision, evaluate fresh cases, then integrate the demonstrated improvement into the actual lexicon using existing design/components. Do not stop at another preview or ask the user to adjudicate a dump.

Preserve original results. The old dataset is a starting point, not an accuracy target. Do not invent another automatic percentage gate.

## Moving machines

Transfer this branch and its commits; a local commit is not automatically synced. Saved sample rows, matrices and reviews are in `pipeline/evaluation/headline-confirmation002/`.

Full reruns also need the ignored local inputs: `pipeline/data/reproduce-five-language-20261002/` (including comparisons and lemma Parquets), plus the pinned model or permission to download it. Model revision and input hashes are in that run's `protocol.json`. Recreate Python/frontend dependencies; a database is unnecessary for offline selection work.

Check `git status` before moving: startup changes in `run_backends.py`, `run-backends.ps1`, `pipeline/README.md`, and untracked startup/dependency/test files remain uncommitted. Transfer them separately if wanted; preserve them during this work.
