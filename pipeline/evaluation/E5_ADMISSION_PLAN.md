# E5 admission tests

Fixed after the source audit and before new comparison generation or scoring.
These are project limits for testing transfer, not established linguistic standards.

## Build and controls

Build Dutch against the original five languages, then Icelandic against all six.
Use the frozen old lemma files, the audited new lemma files, the unchanged English
translation source, candidate builder, sense selection, encoder revision, and V2
final classifier. E1, E2, and E4 replacements were not accepted. E3 historical
evidence remains a separate, source-scoped result.

Keep old rows and their core flags unchanged. Verify their full fields and order.
Also replay old translation mining with seven-language membership and compare
every old pair and source-sense reference. Preserve this regression result before
scoring new pairs. Copying old rows alone cannot prove generator stability.

Do not rank new core vocabulary by comparison degree and call it frequency.
New pair evaluation covers the full candidate output, without an `is_core` filter.
Publication of new core statistics requires a separately justified baseline.

## Independent panel and separation

Freeze every IE-CoR form combination involving Dutch or Icelandic. Retain exact
reference spelling, missing forms, independent concept definitions, expert sets,
and source URLs. Inherit the old family assignments through concept, lexical
identity, and expert-set membership. New links joining development and reserved
families are diagnostic cases, excluded from clean held-out claims. Report these
bridges rather than silently changing old assignments. No parameters are learned
in this admission experiment.

Use development cases first. Do not inspect reserved meanings or predictions
until methods are fixed for the final evaluation. Source coverage inspection is
not an admission outcome. A missing reference phrase remains missing in the
primary exact-form result; documented alternatives get a separate result.

## Transfer limits

1. Source admission requires at least 90% exact independent concept-form coverage,
   nonempty glosses, and source entry identities for every accepted sense. Missing
   pronunciation remains empty. Structured ancestry is not required for admission.
2. For every new pair, expected-pair recall must be no more than five percentage
   points below the old development recall for comparable concepts involving the
   same old partner. Report the comparator cases and counts. Dutch–Icelandic uses
   the five-language overall development comparator. Report small cells directly.
3. Compare displayed concept meanings on found cases with the same old-partner
   comparator. A decline above five points fails transfer. Report missing rows
   separately and also report end-to-end successful displays over all cases.
4. Review open vocabulary separately for each pair: seeded reservoir samples of
   five canonical rows per final category, without filtering on apparent quality.
   Freeze sampling before review. Report modern meaning compatibility, source
   ambiguity, names, compounds, restricted usage, and historical support separately.
   Do not substitute category proportions for accuracy or call agreement with the
   fixed classifier candidate usefulness. Unresolved judgments are not correct.
5. Passing transfer does not make the baseline's errors acceptable or approve a
   release. Review every concept-display failure and every sampled label failure.
   Group recurring failures and give a source or method diagnosis. No word-specific
   exceptions are part of this run.
6. Review game suitability by task. Definition questions need an ordinary active
   target meaning and distinct plausible choices; sorting/grid questions need a
   supported practical classification; family/odd-word questions need relevant
   whole-word historical evidence. Report eligible and rejected cases with reasons.
   Do not infer game suitability from a high similarity score or any graph path.

Zero unintended old-row changes and zero lost source identities are hard limits.
Use the existing paired family bootstrap when comparing genuinely paired cases;
new and old language-pair cases are not paired observations just because they
share a concept. Report transfer differences as descriptive comparisons with
separate family intervals. No aggregate pass overrides a failed individual pair.

## Result and publication

Save full new-pair artifacts, hashes, commands, runtime, missing cases, reviews,
and a readable per-pair decision. Failed builds remain evidence. After development
decisions, freeze methods and evaluate reserved families plus actual search,
lexicon, API, and games. This experiment does not write to the live database.
Record transfer and release decisions separately; a release remains unapproved
until its user-facing checks and unresolved failures have been assessed.
