# E2: meaning coverage separate from history

Run E2-001, fixed before scoring, 2026-10-03. Branch `e2`.

## Hypothesis

A profile of recorded meaning coverage and grammatical context will produce more compatible practical labels than one category derived from a maximum cosine and two root strings. An unknown historical relationship must not suppress a supported ordinary meaning match. Similar generic definitions must not establish identity of names or equivalence of whole compounds.

Use the 207 reviewed open-vocabulary development cases as the primary evaluation. Save every profile-to-label mapping before scoring. Report unresolved references, source gaps, and all diagnostic groups. Use the 995 found concept comparisons as a separate positive-coverage check; their expert concept alignment does not establish complete equivalence across all senses.

The concept panel has 14 capitalization mismatches between its German reference headword and the frozen selected row, plus four `ss`/`ß` spelling differences. Preserve and report these cases; do not silently repair the input or count a changed headword as a classification improvement. There are no such reference-headword differences in the primary open panel.

## Inputs and fixed control

Use the original comparison rows and complete matrices verified in E1-003. Retain their original definitions, maximum scores, categories, source claims, and translation references. Read orthographic and phonetic scores from the frozen baseline, matching exact recorded row identity. Do not change candidates, encoder, or displayed senses. Neither E1 selector was adopted.

Map control categories to their meaning claims: full/true cognate and translation equivalent imply equivalence; narrowing/broadening/partial imply partial overlap; archaic implies historical overlap; false-friend/lookalike implies different modern meanings; independent/other implies no supported match. Evaluate these practical meaning claims separately from the control's historical claims. This deliberately gives the control credit for a useful meaning label even where its ancestry wording is unsupported.

## Experimental profile

- Match all recorded sense pairs at cosine at least **0.75**, provided grammatical classes are compatible. Treat determiner/article as one class; retain other recorded parts of speech separately.
- Do not turn a spelling redirect, broad surname/given-name description, or source heading into an interchangeable meaning. Preserve such records and record why they cannot support a match.
- Modern availability follows the recorded active flag, except that a historical-subject tag alone does not establish obsolete usage. Explicit obsolete, archaic, and dated tags remain inactive. Keep inactive overlap as a separate observation.
- Deduplicate identical glosses within their source entry and grammatical class when calculating coverage. Weight distinct senses in entry-local order by `1/(1 + rank)`. This is a tested weak ordinary-meaning signal, not measured corpus frequency. Missing identity receives no invented global frequency rank.
- Record directional weighted coverage, all supported pairs, cross-class associations, and inactive matches. Coverage at least **0.80 in both directions** yields equivalent meanings; other supported modern matches yield partial overlap.
- If no compatible modern match exists, a cross-class score at least **0.60** yields a related-form candidate; a compatible-class score at least **0.60** yields a related-meaning candidate. Lower evidence yields different meanings as an observation, not unrelated ancestry. If one side has no usable modern definitions, say that specifically.
- Names require more than a generic category match. Same named entities require matching normalized headwords and concrete matching entity types; name variants require an explicit variant/form statement about the counterpart. Different concrete entities and unresolved generic-name identities have distinct labels. A common noun/name collision remains distinct from name identity. Retain ordinary matched senses in mixed words rather than excluding the whole word because it has a name entry.
- Preserve the legacy history field separately, marked as unchanged and not newly verified in E2. Preserve form scores separately. Product labels describe the observed meaning profile and do not claim that unequal roots establish unrelatedness.

These thresholds and mapping rules are experimental. Do not adjust them against this run's mistakes. Later changes require a new saved run.

## Review mapping and checks

`e2_reference.json` records expected compatible labels and scorable status for every case. It is derived from the already reviewed source evidence, never supplied to the classifier. Ordinary overlap can admit equivalent or partial labels because it establishes an ordinary correspondence, not exhaustive equivalence. Explicit partial-overlap profiles require a partial/contextual label. Related grammatical forms remain separate from equivalents. Generic names must be flagged without asserting shared identity. Source-gap cases remain visible even when the missing dictionary sense prevents recovery.

Include an always-partial control to expose permissive scoring. Report a confusion table, coverage, and every incompatible label by language pair and E0 diagnostic group. Do not treat uncertainty labels as correct on unresolved references.

Use the E0 acceptance rules: gain at least five percentage points with positive lower bound of the paired family interval; useful labeled coverage loss at most two points; resolve any flagged group/pair loss. Use 2,000 family resamples and seed 20261003. Also require identifying every reviewed unsupported generic-name equivalence and unsupported full-compound claim. Report performance against the trivial control, not merely against the legacy categories.

## Output and decision

Produce a readable report, case results, uncertainty intervals, retained-input checks, and reproducible commands. Decide adopt, revise, reject, or inconclusive. Complete evaluation even if the method fails. No live database or product changes during this run. E3 tests historical evidence separately.
