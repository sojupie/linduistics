# What to do next with the dataset

## Aim

Keep building and transforming the data ourselves. The first public result does not need to serve a large audience: a small, reproducible dataset that helps one or two people inspect lexical relationships would be worthwhile. The sourcing and pipeline work is part of the project, so do not replace it with a finished corpus or turn the project into a CRUD app.

The useful thing we can offer is a traceable set of comparisons: what the source says about each entry, how those entries relate (if the evidence supports a link), what our pipeline observes about their forms and meanings, and which steps produced the result. Do not present candidate counts as language-wide cognate percentages.

CLDF is fine as a sharing format. Keep the working pipeline shaped around the evidence we need to retain; map the finished slice to CLDF modules where they fit, and add a small linked table for project-specific evidence if needed.

## Where the work stands

- The arbitrary candidate caps are removed. The local rebuild has 1,638,454 directed comparison candidates, about four times the previous file. This is candidate output, not a measure of vocabulary coverage.
- All 23 previously flagged comparison spellings are present in the uncapped output after case-fold matching: 20 exact spellings and three lowercase canonical forms.
- Translation mining now retains the source sense that supplied each candidate. This fixes the demonstrated `haben` / `own` sense mismatch and preserves multiple source translation claims for `fressen` / `fret` and `bis` / `till`.
- The refreshed 270-case audit now has a comparison row for every case and active source-sense links on both sides. Three German–English spellings (`Haben`, `Fressen`, `Bis`) resolve through an explicitly recorded unique case-fold match.
- The source-claim projection contains 2,341 normalized edges backed by 2,396 source-template records. It skips 292 claims without a normalized relation; those claims remain in the audit files.
- A small case ledger now documents concrete examples and separates source paths, comparison observations, and evidence-link status in [DATASET_CASE_REVIEW.md](DATASET_CASE_REVIEW.md).
- The pipeline test suite passes: 95 tests.
- None of this changes the live database or proves the generated category labels correct. The old `other` value remains a candidate-builder remainder, not a linguistic relationship.

See [the stage record](NEXT_DATASET_STAGE.md) and [the running findings log](DATASET_NEXT_STEPS.md) for methods, examples, and limitations.

## Next work, in order

### 1. Review the refreshed source audit

The three fresh 90-pair audits and their compact edge projection are complete. Now review the concrete cases where the evidence surfaces distinct paths or identity limits, especially the examples already named in the stage record. Keep three things distinct:

- **Source claims:** what Wiktionary records, including the exact entry, sense, direction, wording, and template evidence.
- **Comparison observations:** computed spelling, sound, meaning, and translation evidence.
- **Our interpretation:** what those records support, what is ambiguous, and what remains unresolved.

A claim attached to a word entry is not automatically a claim about the selected sense. A missing link is not evidence that two words are unrelated. Record unresolved matches rather than guessing.

### 2. Make a small reviewed case set that tests the data model

Use [the reviewed case ledger](DATASET_CASE_REVIEW.md) and existing audits, not a new research project or broad manual survey. Include examples that exercise:

- inheritance and cognate mentions;
- direct borrowing and borrowing from a shared donor;
- derivation, compounds, and component-level relationships;
- homographs and multiple senses;
- similar forms with uncertain or missing origin evidence.

The existing examples around *bank*, *bankman*, *sandbank*, *ombudsman*, *clown*, *fleece*, and the refreshed translation pairs are a practical starting set. For each, preserve the full-word relationship separately from any component relationship. One pair can have more than one historical path.

Do not force all evidence into one exclusive pair label. Store source-backed relationships as directed, provenance-linked claims; store similarity scores as separate observations. Any summary category should be a view over that evidence, not a replacement for it. Treat `other` as “no more specific candidate label assigned” until the evidence explains which records can be described more precisely.

### 3. Fix only demonstrated transformation gaps

For each case, identify the earliest step that loses or misjoins useful evidence: source extraction, entry identity, sense alignment, component resolution, relation normalization, or candidate selection. Add a regression check for a reproduced failure, fix that step, then rerun the bounded case set from the recorded local inputs.

Do not bulk-relabel the database based on this case set. Do not infer a confirmed relationship from surface similarity, a shared donor alone, a headword-level note, or an unresolved source link.

### 4. Package a small, rerunnable release

Publish only the reviewed slice and its provenance. The first release should include stable IDs; language-specific entries and senses; directed source claims with links back to source records; separate computed observations; the transformation version and rerun command; and a short note describing what the slice can and cannot establish.

Use CLDF for compatible forms, senses, and relationship tables where that helps reuse. Keep extra source evidence and project-specific interpretations in clearly linked tables. If CLDF makes the first slice harder to inspect, ship the simplest readable TSV/JSONL alongside it rather than delaying the data work. Do not publish raw dumps or generated source text without checking their terms.

## The first release should let someone

1. Pick a word comparison and see which source entries and senses were matched.
2. Follow each historical claim to the source record and see its direction and evidence.
3. Distinguish a source assertion from a computed similarity score and from our interpretation.
4. See ambiguity, missing links, and multiple paths without silently turning them into “unrelated” or one confident label.
5. Rebuild the released slice from the documented inputs and pipeline version.

## Defer until the cases show a need

- Adding another source just to make the dataset look broader. Add one when a concrete case shows which missing fact it could contribute; keep Wiktionary sourcing and transformation central.
- A broad typological or genealogical database. Language-level genealogy, area, and typology are separate data dimensions and can be added when there is a useful source and a concrete question.
- Reclassifying every comparison or claiming language-wide cognate proportions.
- Building a new data platform or forcing CLDF to become the internal pipeline model.

## Done for this stage when

- The refreshed case audits produce a compact source-claim edge file with active-sense links and unresolved matches visible. **Complete:** 270/270 cases now have comparison rows and active links on both sides; the 2,341-edge projection is reproducible from the local audit files.
- The selected cases demonstrate that source claims, lexical paths, comparison observations, and project interpretations stay distinct.
- Reproduced transformation failures have regression checks, and the slice can be rebuilt from recorded local inputs.
- A small release is understandable and useful without claiming completeness or expert adjudication.
- CLDF compatibility has been checked, and the release uses it where it helps rather than as a prerequisite.
