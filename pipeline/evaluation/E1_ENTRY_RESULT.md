# E1-004: compatible entries improve some displays, but do not choose ordinary meanings reliably

Date: 2026-10-25. Plan committed at `34f31b0`; selection implementation at `af41e4c`. Offline development experiment. No live data changed.

## Result and decision

C adds name-status and grammatical-class preferences to the previous usage/order selector B. On the same independently specified IE-CoR concepts, it gains seven suitable displays and loses one against B. It also repairs B's saga name mismatch in the broader development sample. This is a useful, modest result, with a real cost: English–Norwegian sun loses its specific solar-system reading.

**Keep C as a research comparator; do not publish it as the display solution.** Its 28-case net gain against the original control deserves further testing. Its remaining errors show that grammar compatibility cannot decide which shared meaning should be the headline. No five-point gate decides this result.

| Measure | Original control | B: usage and order | C: compatible entries, usage and order |
| --- | ---: | ---: | ---: |
| Suitable specified-concept displays | 630/995 | 652/995 | 658/995 |
| Wrong concept senses | 259 | 240 | 234 |
| Restricted concept senses | 99 | 96 | 96 |
| Unresolved concept cases | 7 | 7 | 7 |
| Shared displayed readings in the open sample, including restricted matches and documented name variants | 96/207 | 96/207 | 97/207 |

Against the original control, C gains 29 suitable concept displays and loses one. Against B it gains seven and loses one. The open sample gains one shared reading and loses none against either comparator: scrape/skrapa improves over control, while saga/saga repairs B. The sample also includes false friends and disjoint pairs, so the remaining cases are not all errors.

## What changed

Within the existing 0.10 cosine window, C first prefers matching name status, then matching nonempty grammatical classes. It applies the existing usage preference and 0.05 source-order penalty to those candidates. When no compatible alternative exists, it retains the available candidates. No new threshold was fitted to the results.

The seven new suitable concept comparisons are two name comparisons, three salt comparisons, and two breathe comparisons. Salt now selects the substance on both sides; breathe selects two verbs instead of breath against a breathing verb. Name reuses the previous review's acceptance of “full name”; this is still narrower than every possible use of name.

The reused name helper also flags glosses that mention “given name” or “surname.” That can describe the ordinary noun name rather than a proper-name entry. The two name gains therefore do not validate that heuristic; they show why source entry type and a description of names must be distinguished in the next method. This diagnosis does not change C or its saved result.

The lost sun comparison still shares a valid meaning: both definitions describe a generic star acting as a sun. It no longer displays the specific Sun required by the benchmark. One dictionary calls that specific reading a proper name; another calls it a noun. The compatibility preference favors matching dictionary labels even when their previous readings were already semantically aligned.

Other changes are not successes merely because grammar now matches. Round/rund switches to plump: a legitimate shared secondary use, but not the specified circular-shape concept. Indio/indigo switches from a California city versus dye to an indigenous person versus a color; neither pair shares a meaning. Bad still selects licentious in English. Every C-versus-B change and its reason appears in [the case review](E1_ENTRY_CASE_REVIEW.md).

## Results by language pair

| Pair | Cases | Original suitable | B suitable | C suitable |
| --- | ---: | ---: | ---: | ---: |
| Danish–German | 95 | 68 | 71 | 72 |
| Danish–English | 95 | 45 | 47 | 48 |
| Danish–Norwegian | 100 | 80 | 85 | 86 |
| Danish–Swedish | 103 | 71 | 75 | 77 |
| German–English | 103 | 51 | 52 | 52 |
| German–Norwegian | 92 | 69 | 70 | 70 |
| German–Swedish | 104 | 73 | 75 | 76 |
| English–Norwegian | 93 | 50 | 50 | 49 |
| English–Swedish | 105 | 45 | 46 | 46 |
| Norwegian–Swedish | 105 | 78 | 81 | 82 |

These are familiar development cases, not a probability sample of the full lexicon. No population accuracy estimate or new confidence interval follows from these counts. IE-CoR supplies independent expected concepts; source-guided agent judgments determine whether the selected definitions express them. It does not validate all modern senses or false friends.

## Why important failures remain

After scoring C, a descriptive audit of all 1,201 frozen rows found two separate constraints. This was a post-result diagnosis, not an additional preregistered success measure.

**Translation-source eligibility can exclude the ordinary sense before ranking.** Of 482 English comparisons, 440 exclude some active English senses through the existing source-identity restriction. That is often useful evidence, not 440 errors. Nine admit only senses with the selector's restricted-usage tags while excluding other untagged active senses. They involve bad, come, yellow and blunt. This is a warning to review source-link scope, not proof that all nine links are wrong: blunt/joint can legitimately share a drug sense. For bad/dårlig, the admitted English readings are excellent/cool, licentious, and attractive; ordinary bad is unavailable to the selector. Increasing the order preference cannot recover an excluded sense.

**The close-score window can exclude an ordinary shared meaning even when source eligibility allows it.** In the frozen water/Wasser row, urine/Urine scores 0.8557; ordinary water (H₂O) and its full English definition score 0.6861. The 0.10 window excludes that ordinary pair before usage, order or C's compatibility preference runs. The urine reading has no restricted-usage tag in these records. A good secondary match therefore becomes the only competitive headline. Preserving it is useful; making it the default is a separate decision.

Neither diagnosis justifies deleting secondary senses, ignoring translation evidence, or expanding a similarity window until familiar examples pass. It does justify a separate experiment in which ordinary-headline choice and secondary alignment have different jobs.

## What stayed fixed and what was checked

All 1,201 source rows and their 81,143 matrix cells remain in the original hashed artifact. This experiment writes selections and reviews to separate files. It changes no stored definition, sense record, candidate, maximum similarity, modern label, historical relation, or database row. All 1,202 saved B case displays reconstruct exactly. The extra case uses an already shared comparison row.

Eight previously unreviewed concept/gloss identities received explicit source-guided judgments. Every one of the 22 C-versus-B changes received a separate alignment/scope note. Source membership is checked against the selected indices. Factual correctness beyond the supplied dictionary records is explicitly not independently checked. This is an unblinded review by one agent who knows the method, not expert gold or confirmation on unseen families.

The selector self-check covers name/ordinary compatibility, grammar, the fixed window and retention of restricted secondary matches. An independent-directory replay reproduces all five selection and scoring artifacts byte for byte. The all-row anchor diagnosis also reproduces. The initial runner source and hash remain saved alongside the protocol; the final runner adds scoring and the post-result diagnosis without altering selection.

## Next experiment

Freeze a two-part display experiment before running variants:

1. Keep a strongest shared-sense match as a separate secondary result. This retains legitimate urine, plump, slang and technical overlap.
2. Choose the headline from source entry and sense order, grammatical use and usage scope **without requiring it to fall within 0.10 of that secondary maximum**. Source order is a weak ordering cue, not a claim of measured word frequency. Treat a translation link as evidence for its recorded sense, not an exhaustive list of what the word can mean.
3. Score headline factual correctness, ordinary suitability and pair alignment separately. A normal false-friend headline may correctly show different meanings. It must not be called a translation merely because both definitions are ordinary.
4. Include all fixed development cases and a separately frozen broader sample. Include unknown-family cases in a separately identified exploratory sample if needed; do not silently call them independent held-out families. Preserve a final reserved test after method selection.

This tests the structural cause of the remaining failures. It does not add water- or bad-specific rules. C's sun loss remains recorded and must be measured alongside any improvement.

## Reproduction

From the repository root, use a new output directory:

```bash
PYTHONPATH=pipeline/src:. pipeline/.venv/bin/python pipeline/src/sense_display.py
PYTHONPATH=pipeline/src:. pipeline/.venv/bin/python pipeline/evaluation/e1_entry.py --output pipeline/data/e1-entry-replay
cp pipeline/evaluation/e1-entry004/review.json pipeline/data/e1-entry-replay/review.json
PYTHONPATH=pipeline/src:. pipeline/.venv/bin/python pipeline/evaluation/e1_entry.py --output pipeline/data/e1-entry-replay --summarize
PYTHONPATH=pipeline/src:. pipeline/.venv/bin/python pipeline/evaluation/e1_entry.py --output pipeline/data/e1-entry-replay --diagnose-anchors
```

The scorer checks frozen input hashes and exact review identities. Source-guided judgments are replayed, not regenerated. [Artifacts](e1-entry004/protocol.json) retain inputs and implementation hashes; [metrics](e1-entry004/metrics.json) retain every gain/loss case ID.
