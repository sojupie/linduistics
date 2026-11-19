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

The branch is already pushed to GitHub. In the other machine's checkout:

```bash
git fetch origin
git switch codex/e2-sense-scope
```

The code, startup instructions, handoff note, and saved evaluation cases are in Git. The saved rows, matrices and reviews are under `pipeline/evaluation/headline-confirmation002/`.

The full dataset is **not in Git**. To rerun selection and evaluate fresh cases, copy this directory from the Linux machine into the same relative location in the other checkout:

`pipeline/data/reproduce-five-language-20261002/` — approximately 724 MB, containing the comparison, lemma and word-form Parquets.

Recreate dependencies using the root README. Download the pinned embedding model if it is not cached; its revision and the dataset hashes are recorded in `pipeline/evaluation/headline-confirmation002/protocol.json`. Offline selector work does not need a database.
