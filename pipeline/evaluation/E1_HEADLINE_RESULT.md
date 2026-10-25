# Ordinary headlines: a substantial development gain, with specific remaining losses

Date: 2026-10-25. Runs E1-005 (D), E1-006 (E), E1-007 (F). All offline. No published definitions, classification labels or database rows changed.

## Decision

Keep **F as the frozen development candidate for broader verification**. Separating a headline from the strongest shared-sense match produces a much larger improvement on the sampled independent concepts than the earlier close-score preferences. It also preserves valid secondary overlap. Source order alone was insufficient; the tested revisions add source-entry spelling, metadata filtering and ordinary lexical-entry preference.

Do not publish yet. The 100-case concept test is a sample of familiar development cases, the reviews are source-guided and unblinded, and the broader diagnostic review still finds real losses. F also loses a specific Sun reading outside the sample. These limits are reasons for a wider frozen test, not an automatic percentage veto or a claim that the original dataset must stay unchanged.

## What changed and why

The previous selector sought the strongest shared definition match, then considered alternatives only within 0.10 of its cosine. This let a good secondary match exclude an ordinary meaning before order or usage preferences ran.

The new API, `sense_display.select_headline(..., variant='F')`, chooses from early current, unrestricted readings within source entries. It excludes spelling/form metadata, prefers exact entry spelling within the same grammatical class, and uses proper-name entries as fallbacks when ordinary lexical entries exist. Dictionary translation evidence supplies a grammatical-use cue. It does not restrict headline selection to the exact English source senses of a narrower translation link. The original cosine breaks ties after those structural choices; no new numerical weight, embedding model or word exception was introduced.

The output has **separate headline and original strongest-match indices**. Every original strongest display reconstructs exactly, and all 81,143 matrix cells remain available in the unchanged source artifact. A valid secondary meaning is retained even when it stops being the headline. Shared ancestry and modern classification are separate, unchanged fields.

The three plans were committed before their respective implementations and scoring:

- [D: early usable readings outside the close-score window](E1_HEADLINE_PLAN.md), commit `51bc609`.
- [E: source spelling and metadata](E1_HEADLINE_REVISION_PLAN.md), commit `6e635c4`, after D's observed failures.
- [F: ordinary lexical entries before proper names](E1_HEADLINE_ENTRY_PLAN.md), commit `8f013ab`, after E's observed failures.

E and F are explicit exploratory revisions. They are not independent confirmation runs.

## Concept test: 65 suitable displays becomes 85

Before implementing D, the runner froze ten cases sampled without replacement from each of the ten language pairs. Seed: 20261025. The frame contains 995 found development IE-CoR comparisons. Sample size: 100. All expected concepts come from the independent reference; the agent judges whether the displayed dictionary glosses express them.

| Selector | Suitable | Wrong concept | Restricted/broader concept |
| --- | ---: | ---: | ---: |
| Original control | 65 | 24 | 11 |
| B: usage and weak order | 66 | 24 | 10 |
| C: compatible entries within close-score window | 66 | 23 | 11 |
| D: early usable readings | 84 | 9 | 7 |
| E: metadata and source spelling | 85 | 7 | 8 |
| F: lexical entries before named fallbacks | 85 | 7 | 8 |

There are no unresolved judgments in this sample. Existing exact-identity judgments were reused. D required 24 new concept/gloss judgments, E one, F none. Those are source-guided judgments, not independent expert gold.

F gains 25 suitable concept comparisons and loses five against the original. Its weighted supported share in the **fixed 995-case development frame** is 84.85%, versus 64.88% originally: a gain of 19.97 percentage points. The finite-population sampling standard error of that paired gain is 4.97 points. This measures sampling uncertainty conditional on the saved judgments. It does not measure reviewer bias, unseen-family behavior or full-dataset correctness. The 995-case frame is found vocabulary, so this test does not measure missing-pair retrieval.

### Language-pair breakdown

Each row has ten sampled cases.

| Pair | Original | C | D | E | F |
| --- | ---: | ---: | ---: | ---: | ---: |
| Danish–German | 8 | 8 | 10 | 10 | 10 |
| Danish–English | 8 | 8 | 8 | 8 | 8 |
| Danish–Norwegian | 8 | 8 | 10 | 10 | 10 |
| Danish–Swedish | 6 | 7 | 9 | 9 | 9 |
| German–English | 6 | 6 | 6 | 6 | 6 |
| German–Norwegian | 7 | 7 | 9 | 9 | 9 |
| German–Swedish | 6 | 6 | 9 | 9 | 9 |
| English–Norwegian | 4 | 4 | 7 | 8 | 8 |
| English–Swedish | 4 | 4 | 7 | 7 | 7 |
| Norwegian–Swedish | 8 | 8 | 9 | 9 | 9 |

### Gains and losses that explain the result

Gains recur across ordinary concepts: rain replaces figurative falling matter; throwing an object replaces rolling dice; the tongue organ replaces a shoe tongue; sweet taste replaces pleasant disposition; forests replace generic surname entries; hearts as organs replace symbols; ice replaces ice cream. Night, wind, biting, drinking and plant flowers also improve. These are not word-specific overrides; the same structural rules select the definitions.

The five sampled F losses remain:

| Comparison | Why it loses the specified concept |
| --- | --- |
| Norwegian mage / Swedish mage | Swedish stomach organ replaces the abdominal region. Both are ordinary; source order chooses the wrong one for this concept. |
| Danish våd / English wet | Liquid substance replaces an object covered with liquid. |
| English wet / Swedish blöt | The same English substance-versus-covered-object distinction. |
| German Rennen / English run | Race as a contest replaces the act of running. The stored German headword is capitalized Rennen; the experiment does not silently replace it with the verb rennen. |
| Danish hår / English hair | General mammal hair replaces specifically human scalp hair. |

E and F also lose D's sampled recovery of the specific Sun by selecting a generic star acting as a sun. The original display in that case was already generic, so this is a loss against D rather than against the original. F introduces another unsampled Danish–German specific-Sun loss. Both are saved in the case records. Generic star is a valid meaning, but it does not satisfy the independently specified concept of our Sun.

## Broader diagnostic review: improvement is smaller and mixed

The runner generates proposals for all 1,201 saved rows / 1,202 cases. F changes 470 concept displays and 69 of the 207 open diagnostic displays. Only the frozen 100 concept cases receive the concept score above; the other concept proposals are not silently counted as reviewed successes.

All 69 changed open F displays have explicit source-guided reviews of substantive headline plausibility and selected-sense alignment. The remaining 138 displays are exactly unchanged. A plausible headline is a substantive introduction to the recorded word; these judgments do not establish its most frequent meaning from corpus data.

| Plausibility on the same 69 changed cases | Original | F |
| --- | ---: | ---: |
| Suitable | 44 | 50 |
| Secondary/specialized | 15 | 13 |
| Entry/metadata problem | 4 | 2 |
| Unresolved | 6 | 4 |

F has twelve plausibility gains and six losses on those changed cases. Examples of gains include general connection instead of a transport-system link, the discus object instead of discus throwing, a general supplement instead of a vitamin dosage, and an ordinary animal dog instead of a heading. Losses include specialized fencing-foil blunt, cosmogonic chaos, a historical musical-neume reading, and mouth-specific froth. The original and revised individual reviews are available in [the case report](E1_HEADLINE_CASE_REVIEW.md).

Of those 69 proposed headline pairs, 14 share a selected meaning, 16 have contextual/narrower overlap, 16 are related without a shared selected sense, 21 differ, and two remain unresolved. These are not 55 errors: the diagnostic sample includes false friends, related forms, names and disjoint comparisons. Nor do ordinary definitions prove translation. Old shared readings remain in the secondary output, including ones displaced by a correctly contrasting headline.

One D review initially marked tapestry repair as a suitable ordinary headline although its written reason called it specialized. The categorical value was corrected to match that reason before E. Initial review/metrics and the explicit correction remain saved. Concept scores did not change.

## What the revisions teach us

D's first-reading rule exposed capitalization records and proper names. E removed metadata and used exact source-entry spelling within a grammatical class, but could still select a zodiac Dog rather than the animal. F's lexical-entry preference repairs those proper-name intrusions without erasing named-only words.

All seventeen F-versus-E changes were read, including the unsampled ones. They include animal dog instead of a zodiac/language name and anatomical eye instead of a magazine title. These do not occur in the 100-case sample, so F's sampled score equals E's. Some repairs remain partial: Danish øje can still select an opening for thread against an English eye organ; German horn material is not the same selected sense as an animal horn. The extra Sun loss remains visible. Full diagnostic reasons are in `e1-headline007/entry_changes_review.json`.

The remaining systematic limits are concrete:

- Entry order cannot choose between multiple ordinary senses for the intended comparison.
- Some words' default grammatical use conflicts with a narrower translation link's class. Compatibility can still select an unusual noun, such as fencing-foil blunt.
- Usage tags and source identities are incomplete. A first recorded sense is not measured frequency.
- Exact source spelling reduces case-merging errors but does not repair the underlying comparison identity or prove target-sense alignment.

These need broader measurement rather than more word-specific changes on this sample.

## Water/Wasser and preserved secondary meanings

F proposes `water (H₂O)` against the full English chemical definition. The original `urine` / `Urine.` pair remains the separate strongest match at the same original indices and score. Ordinary water can become the headline without denying the valid secondary correspondence or boosting its cosine.

Saga also demonstrates the distinction: the proposed English Norse-prose reading versus Swedish fairy tale is plausible as two ordinary entries, but less aligned than the original general-story pair. The original narrative alignment is retained separately. A production interface must label the two outputs clearly rather than present every headline pair as a shared sense.

## Preservation, replay and next action

Eight of the 1,202 cases have no current substantive proposal under F; they retain the original display with an explicit reason. No new residual classification category is introduced. All definitions, candidate membership, source inventories, maximum scores, original strongest matches, modern classifications and historical fields remain unchanged on disk.

The selector self-check covers ordinary-versus-secondary selection, metadata-only records, missing identities, entry spelling, proper-name fallback and historical subjects. All B/C selections and original strongest displays reconstruct exactly. Initial D and E selector/runner snapshots match their recorded hashes. Separate-directory replays reproduce proposals, pending reviews, open packets, sampled results and metrics for all three runs.

**Next:** keep F fixed and test it on reserved concept families and a broader probability sample, with unknown-family exploratory cases reported separately. Review ordinary headline plausibility, factual entry/sense correctness and shared-sense alignment as separate questions. Compare F with the original and inspect losses; do not tune F against that confirmation set. Include the secondary output in a product preview before any publication decision. No improved dataset is approved by this development run alone.

Reproduction from the repository root (use fresh output directories):

```bash
PYTHONPATH=pipeline/src pipeline/.venv/bin/python pipeline/src/sense_display.py
PYTHONPATH=pipeline/src:pipeline/evaluation:. pipeline/.venv/bin/python pipeline/evaluation/e1_headline.py --output pipeline/data/headline-f-replay --variant F
cp pipeline/evaluation/e1-headline007/review.json pipeline/data/headline-f-replay/review.json
PYTHONPATH=pipeline/src:pipeline/evaluation:. pipeline/.venv/bin/python pipeline/evaluation/e1_headline.py --output pipeline/data/headline-f-replay --summarize
```

Replace F/007 with D/005 or E/006 to replay the earlier arms. Input plans, sample, source artifacts, reviews and code hashes are recorded in each run's protocol. No encoder or database call is needed.
