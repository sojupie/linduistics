# E1: choosing displayed meanings

Runs: E1-001 and corrected E1-002. Fixed before scoring variants, 2026-10-03.

## Hypothesis and scope

Usage tags, translation-sense evidence, and entry-local sense order can improve the displayed meaning without erasing valid secondary correspondences. This tests display selection only. The baseline's rows, scores, sense records, source claims, and historical categories remain unchanged. The live database is not modified.

Use the 995 found development concept comparisons and 207 open-vocabulary development cases frozen by E0. Do not open reserved test families. The concept test is conditional on the published intended meaning; an ordinary headline can still be unsuitable for another concept of the same word. Report that limitation alongside results.

## Control and variants

The control is the saved baseline display, not a newly inferred replacement. Reconstruct pairwise gloss scores with the existing normalized MiniLM encoder and pinned revision from `semantic_matcher.py`. Use the builder's clipping and identical-headword translation override. Report any difference between reconstructed and saved control selection; do not silently replace the control.

Both variants preserve the builder's active-sense eligibility and English source-sense restriction when the recorded identity resolves. If no active pair remains, retain the baseline display rather than manufacture an ordinary meaning.

**E1-002 input correction:** E1-001 omitted `source_identity_candidates` when reconstructing translation eligibility from annotated baseline senses. The builder clears a selected identity when several same-gloss source senses are indistinguishable and retains their candidate identities. Resolve eligibility against that list as well as direct identities. This restores existing eligibility; it does not establish a unique source or historical origin. Preserve E1-001 as an invalid reconstruction run. Its apparent improvements or losses cannot decide the hypothesis. Parameters and evaluation cases remain unchanged for E1-002.

- **A: usage preference.** Consider pairs within 0.10 cosine units of the highest eligible pair. Minimize the number of sides marked with a restricted usage tag, then maximize cosine. Restricted tags: slang, vulgar, offensive, rare, dialectal, regional, poetic, literary, archaic, obsolete, dated. Domain tags and historical subject matter do not automatically receive a penalty.
- **B: usage plus source order.** Start with A's close-score set and minimum usage restriction. Within that set, maximize cosine minus 0.05 times the average normalized sense rank of the two sides. Rank distinct sense identities within the same source entry, part of speech, and etymology group, in their recorded order. Multiple glosses belonging to one source sense share a rank. Missing source identity receives no order bonus or penalty. Dictionary order is not asserted to be corpus frequency.

These numerical preferences are provisional experimental parameters. Do not tune them on the results of this run. A later change requires a new run ID and preserved results.

## Checks and review

Save all original sense lists and full reconstructed pair matrices once per undirected comparison. Record chosen indices separately from baseline match flags. Keeping the matrix makes secondary correspondences available even when they do not appear in the headline. Verify originals and maximum semantic scores are unchanged; classify nothing during this experiment.

Reuse saved E0 judgments only for identical concept, language, word, and displayed gloss. Prepare a deduplicated packet for every new displayed gloss, with variant names, labels, and scores hidden. Review every new item against the same concept rubric before counting results. Review changed open-vocabulary displays separately against all available meanings; do not treat agreement with the encoder as ground truth.

Use the saved E0 acceptance rules: at least five percentage points of concept-conditioned gain, lower bound of the paired 95% family interval above zero, and no unresolved flagged subgroup loss. Use 2,000 resamples and seed 20261003. Retain all original sense identities and supported secondary matches. Report changed selections, unresolved cases, and losses per language pair. Agent judgments remain exploratory, not independent human linguistic gold.

## Required result

Save the protocol, reproducible command, selected pairs, blinded review packet, judgments, paired measurements, and readable report. Decide separately for A and B: adopt, revise, reject, or inconclusive. Development success does not authorize publishing the dataset.
