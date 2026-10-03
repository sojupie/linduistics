# E4-B001: phonetic retrieval needs revision

**Decision: revise; do not adopt this retrieval rule.** It recovers useful missing vocabulary, but falls short of the predeclared recall gate and admits many weak comparisons. Learned correspondences do not outperform the unlearned phonetic arm in this run. No threshold was tuned after viewing evaluation families.

## What was tested

The [plan](E4_PLAN.md) fixed parameters before either candidate variant ran. The original candidate channels remain the control. The correspondence model uses calibration families only: 580 concept records were available for calibration; 268 source-pronunciation-supported same-expert-set records supplied training observations across 49 families. Word pairs were deduplicated while learning. Evaluation uses 588 comparisons in 50 different development families. The final reserved test families remain unopened.

The method learned 31 directed symbol replacements. It searched the whole target lemma vocabulary for each of 1,156 evaluation queries, without a spelling-prefix or frequency condition. It shortlisted pronunciation strings, reranked them with the existing articulatory score, and kept at most five headwords. The unlearned arm uses the same retrieval procedure. This tests a simple substitution model; it does not represent context-sensitive sound laws or exhaustively search all articulatory distances.

## Expected-pair recall

| Arm | Found / 588 | Additional expected comparisons |
| --- | ---: | ---: |
| Original control | 513 | — |
| Unlearned phonetic addition | 522 | 9 |
| B: learned correspondence addition | 521 | 8 |
| A+B: prefixes removed, B added | 519 | 6 net |

B raises recall from 87.2% to 88.6%, a 1.36-point gain. It retains every control comparison, so it introduces no control recall loss. The eight gains span six language pairs. The gate required **ten additional comparisons across at least two pairs**. B and the unlearned arm both miss it.

| Languages | B recovery | Source pronunciation on both endpoints? |
| --- | --- | --- |
| English–Norwegian | see / se | Yes |
| English–Swedish | see / se | Yes |
| Danish–German | knogle / Knochen | Yes |
| Danish–German | tunge / Zunge | Yes |
| Danish–Norwegian | løbe / løpe | Yes |
| English–Swedish | come / komma | Yes |
| English–Norwegian | foot / fot | No; existing fallback contributes |
| German–Norwegian | Fuß / fot | No; existing fallback contributes |

Unlearned retrieval also recovers `brænde` / `brennen`. Learned replacements raise competing candidates and push that pair outside the five-headword shortlist. Adding mapping-based scores is therefore not monotonic under a fixed retrieval limit. A+B still loses `tunge` / `tunga` and `komme` / `komma` in these evaluation families. It does not make the rejected prefix removal safe.

## Pronunciation coverage

The parser fills absent IPA with generated spelling-to-sound output. I checked the original source dumps with the existing entry parser and matched their recorded normalized IPA to the stored value. This distinguishes source pronunciation from fallback without replacing either.

| Language | Lemmas | Stored IPA matching an accepted source entry | Share |
| --- | ---: | ---: | ---: |
| Danish | 22,544 | 6,426 | 28.5% |
| German | 86,390 | 53,562 | 62.0% |
| English | 536,633 | 72,815 | 13.6% |
| Norwegian | 21,315 | 3,368 | 15.8% |
| Swedish | 53,525 | 4,851 | 9.1% |

These figures describe this frozen source/input set. Matching IPA at a headword does not guarantee a pronunciation for every homograph sense. Source-supported pronunciations occur in 906/1,156 queries. Twenty-eight queries lack a matching lemma; the remaining 222 non-source-supported queries use stored generated fallback. B adds 4,864 previously absent normalized comparisons: 2,495 have a retrieval observation with source pronunciation on both endpoints, and 2,369 require some generated fallback. Pronunciation availability is not lexical accuracy.

## Every changed case reviewed

The unfiltered reservoir sample contains six new candidates per pair, 60 total, selected before reading meanings or categories. It includes rejected-looking outputs rather than only promising recoveries. The [case account](E4_B_CASES.md) records all 60 sample judgments and all nine expected recoveries from either arm.

No sampled pair has supported modern meaning overlap. Forty-three are weak matches, 16 are potential phonetic traps, and one is a restricted dialectal trap. Potential traps are review leads, not established false friends or approved game questions. This is a source-guided agent assessment on an equally allocated diagnostic sample, not an independent human or population precision estimate.

Systematic problems are visible without asking the user for examples:

- Broad sound similarity admits unrelated words, such as `araber` / `Bauchnabel` and `femten` / `werfen`.
- Name/common-word matches survive retrieval, including `fjer` / `Phek`, `Tallinn` / `tann`, and `Heeger` / `höger`.
- The extended vocabulary admits abbreviations such as `holl.` and `pol.` into ordinary-word queries. This does not justify silently deleting them from the lexicon.
- Different grammatical meanings and nearby contexts inflate matching: `weit` / `vart` receives a semantic-narrowing label although far/wide and where/to where are not equivalent.
- Unchanged root-string classification calls `brænde` / `brennen` accidental lookalikes despite their shared burn meaning. Retrieval exposes the existing historical-classification weakness; it does not repair it.

All nine independent expected recoveries have their expected meaning somewhere in the retained inventories. Seven selected displays suit the concept. English–Swedish `see` / `se` instead selects mental visualization, and English–Norwegian `foot` / `fot` selects the twelve-inch unit rather than the anatomical foot. Thus improved candidate recall can reproduce the same display failure that motivated E1. The candidate experiment cannot claim these as display improvements.

## Reproduction and disposition

The fixed V2 category and relation function reproduced all 1,201 frozen E1 comparison controls exactly before classifying new review candidates. Their full senses, source identities, selected definitions, and scores are saved in `e4-b001-review`. No E1, E2, or E3 replacement was substituted into this test.

Run `pipeline\.venv\Scripts\python.exe -X utf8 pipeline/evaluation/e4.py B --output <new-directory>`. The saved artifacts reproduced byte-for-byte; metrics match after excluding elapsed time. Retrieval took 99.75 seconds in the first run and 100.08 seconds in reproduction. The original-source pronunciation audit took 31.05 seconds. These are scoped evaluation costs, not an estimate for regenerating the entire lexicon's candidates.

**Next methodological check:** before another phonetic variant, compare retrieval ranks for all expected targets and weak matches under pronunciation provenance, word length, grammatical compatibility, and named-entity scope. Use those measurements to define a new development protocol. Test context-sensitive correspondences and retrieval limits separately; do not combine changed meaning rules with a new channel and attribute the result to sound matching. Preserve this failed run and continue E5's source admission audit with the unchanged accepted candidate generator.

The production pipeline and live database remain unchanged. Neither A nor B is accepted for the final combined method. E3's source-scoped evidence layer remains the only accepted experimental addition, subject to the final reserved-family evaluation.
