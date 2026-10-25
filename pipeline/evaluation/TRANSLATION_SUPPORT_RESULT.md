# T1-001: translation evidence is useful, but its scope must stay visible

Date: 2026-10-25. Plan committed at `5981c43`; first API and runner at `7ba05e8`. Offline development run. No production classifier, headline or database changed.

## What was implemented

`pipeline/src/translation_support.py::describe_meaning_evidence` exposes three separate evidence channels for a comparison:

1. Inherited dictionary translation links, resolved to their English source meanings. Direct English links and links through a common English source sense remain distinct. One source entry/sense identity counts as one unit even when it has several glosses.
2. Explicit lexical-gloss correspondences, including qualifications and endpoint indices. These are useful inferences from definitions, not raw translation statements.
3. Embedding suggestions, with their original scores and endpoint indices. A dictionary link never becomes a fabricated cosine of 1.0.

Each dictionary unit retains source glosses and usage, exact versus ambiguous merged source identities, inferred target candidates, unlocalized compatible grammar, explicit conflicts and unresolved identities. Exact source identity is not exact target-sense identity. Low association alone does not reject a translation. Historical, entity and unresolved source links remain available.

The API reuses the previously tested E2 conflict-only method rather than introducing another classifier or weighted score. Its `current_dictionary_support` flag means inherited translation evidence supports **possible** current overlap under that method. It is not a verified translation judgment. `existing_experimental_meaning_label` remains a separate, unchanged E2 output. The production `translation_pair` category is not used as evidence.

The runner is `pipeline/evaluation/t1.py`. Inputs are frozen source rows, English lemma meanings and cached matrices. The raw Kaikki translation statements and reverse links are not present in this Fedora snapshot. Therefore the output identifies inherited build references, marks raw translation rechecking false, and claims zero independent confirmations. Multiple paths within this Wiktionary-derived source do not count as independent sources.

## Measurements

The run covers 1,201 familiar E1 comparisons plus the existing 50 reviewed E2 pilot comparisons. These are development cases, not a representative sample of the full dataset.

| Comparison-level evidence | Count out of 1,251 |
| --- | ---: |
| Inherited dictionary support under E2's audit rules | 1,084 |
| Lexical-gloss support | 1,014 |
| Embedding suggestion above the existing cutoff | 786 |
| Dictionary or lexical support | 1,119 |
| Dictionary or lexical support without an embedding match | 336 |

These channels overlap. **336 is not a count of corrected comparisons.** It shows evidence an embedding-only decision would miss; its quality still needs source review.

Of 628 requested source identities, 627 resolve. Across 2,202 comparison/source units, 937 are direct English links and 1,265 connect foreign words through an English source sense. Units recur across different comparisons; those counts are not independent evidence counts. Source statuses are:

| Status | Units |
| --- | ---: |
| Current source translation supported under the inherited audit method | 2,089 |
| Historical source link | 23 |
| Source scope unresolved | 50 |
| Name/entity source link | 21 |
| Explicit endpoint usage/grammar conflict | 18 |
| Source identity unresolved | 1 |

The output also explicitly distinguishes 82 merged source-identity candidate occurrences from exact source identities. These occurrence counts can repeat a candidate across source glosses; they are not counts of independently confirmed senses.

## What the source reviews establish

The frozen procedure selected twelve supported comparisons without an embedding match. All twelve received source-guided review:

- Nine have clear recorded shared meanings: seed, tail, new, count, navel, sharp, bite, dig and sweet.
- Pedantic/finical and foot/furniture-leg provide narrower or contextual overlap, not ordinary whole-word equivalence.
- Sich/sig has a known gap in the saved German definitions. The earlier review records native-source confirmation of reflexive use; the new run does not independently repeat that external check.

Even a supported comparison can contain a bad individual link. Sweet/søt has a valid taste correspondence, but the English fragrant source meaning is not established by the recorded Norwegian taste definition. Its 0.639 association is a locator, not proof. The output preserves that distinction in the review rather than declaring all source units correct because the pair is useful.

Against the unchanged source-guided references, current dictionary/lexical support is asserted in 114 of 197 scorable open cases: 107 compatible and seven conflicting. In the pilot it is asserted in 24 of 47 scorable cases: 23 compatible and one conflicting. Absence of dictionary support is **not** a wrong prediction; other inference remains available. The other thirteen reference cases remain unresolved. These are familiar diagnostic measurements, not accuracy estimates or independent expert validation.

All eight conflicts were reviewed without altering the original references:

| Comparison | Finding |
| --- | --- |
| kendsgerning / Wirklichkeit | Fact and reality are related; the inherited source link does not establish a common endpoint meaning. |
| Jarl / jarl | Both record the Norse title. The earlier reference treated a historical subject as excluding current use; flag this reference for adjudication. British earl remains a different sense. |
| Obersattel / mutter | Instrument nut versus bolt nut: explicit object qualifications distinguish the senses. |
| verletzen / invadera | Injury/violation versus invasion: inherited source scope needs audit. |
| blunt / joint | Related cannabis smoking products; a translation link does not establish exact cigar/cigarette equivalence. |
| band / bindel | Musical group versus body strap: English band is polysemous. |
| hoppe / springa | Direct Swedish jump is archaic; the source headword leap bypasses the old exact-alias conflict check. |
| tante / tant | Dated kinship versus current older-woman uses; an English fictive-kin source does not settle the Norwegian endpoint scope. |

These are useful findings about inherited source scope and reference quality. They do not justify suppressing all weakly localized links or returning to a hard cosine veto. The complete [case review](TRANSLATION_SUPPORT_CASE_REVIEW.md) preserves all twenty judgments and their caveats.

## Water/Wasser trace

The output resolves a source unit containing the ordinary chemical definition of water and the serving-of-water reading. German `water (H₂O)` also supplies explicit lexical-gloss evidence for the English headword. Ordinary correspondence therefore has evidence beyond its 0.686 cosine. Separate source units retain mixture/body-fluid/urine and classical-element readings.

This establishes that ordinary correspondence can be supported without winning the embedding ranking. It does not relabel every German water sense as an exact match to every English source gloss. The original urine headline remains unchanged in this experiment; headline selection is a separate task.

## Decision and follow-through

Keep this evidence API and use it as the input contract for the next display experiment. It makes source scope, ambiguity and conflicting signals inspectable without altering scores or claiming that a translation is an unrelated-word category.

Do not automatically promote inherited links to verified target-sense matches or complete equivalence. Before production use, test two concrete general changes under a separate frozen plan:

1. Choose an ordinary headline independently of the strongest shared-sense match. Keep the latter with its usage scope. Use source-order and entry information as cues, not frequency truth.
2. Check source-link localization against endpoint qualifications and synonymous inactive meanings. The nut/band and leap/jump failures show why literal shared aliases and compatible grammar alone do not resolve polysemy. Reconstruct raw translation statements in a separate source refresh so that approximate translations and missing endpoint meanings can be distinguished from extraction errors.

There is no new universal pass threshold. This run demonstrates useful evidence coverage and working provenance handling. It does not demonstrate improved classification accuracy: all 257 reviewed E2 audit labels reproduce unchanged. It also does not authorize a live dataset replacement.

## Checks and reproduction

The API self-check covers low-cosine support, duplicate references, missing source identities, ambiguous merged identities, historical source records, grammatical conflicts, retained original scores and absence of exhaustive-equivalence claims. The runner checks source/row/matrix preservation and unchanged E2 audit labels. A separate-directory replay reproduces all five result files byte for byte. Original outputs and source snapshots remain archived; the final output changes localization descriptions to distinguish exact, merged, inferred and unlocalized candidates, without changing support assertions or reference counts.

```bash
PYTHONPATH=pipeline/src pipeline/.venv/bin/python pipeline/src/translation_support.py
PYTHONPATH=pipeline/src:pipeline/evaluation:. pipeline/.venv/bin/python -m pipeline.evaluation.t1 --output pipeline/data/t1-replay
```

The output directory must be new. The runner makes no database or encoder calls. [Final protocol](translation-support001/final/protocol.json) records input/code hashes; [metrics](translation-support001/final/metrics.json) and [review](translation-support001/final/review.json) record measurements and judgments. Large profile and review-packet JSON artifacts are gzip-compressed in Git without losing their contents; replay hashes are computed on uncompressed content.
