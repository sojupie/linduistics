# Linduistics: engineering postmortem and project learnings

**Written:** 2026-09-29
**Use:** Reference for future work on the project and its dataset.
**Scope:** The language-comparison UI work and the 2026 dataset refresh. Counts below are a dated local baseline, not a guarantee about a later database state.

## The project we meant to build

Linduistics is a portfolio project about sourcing, transforming, and exploring language data. The goal is a small public resource that may be useful to a few people: compare words, inspect why they look or sound alike, explore recorded histories, and find misleadingly similar pairs for the lexicon and quiz. The data work is part of the project’s value. This is not intended to become a research institution, a definitive dictionary, or a CRUD front end for somebody else’s finished dataset.

The user is a computer engineer, not a linguist. The project should make room for curiosity and useful transformations without pretending to settle every scholarly question. Crude categories are acceptable when they are understandable and useful. Confidence scores are not a product requirement.

## Executive summary

The dataset looked wrong for a real reason. The language overview showed very few cognates and a large `other` category. English–Swedish had 401 `true_cognate` and 795 `partial_cognate` rows among 142,410 comparison rows. English–Danish and English–Bokmål showed similarly small cognate counts. Those numbers were not vocabulary-wide rates, but they still exposed that the product’s categories were not telling a satisfying story about its candidate data.

The work made the pipeline more repeatable and retained more Wiktionary evidence. It also removed one unsupported negative inference: unequal extracted root strings no longer count as proof of `false_cognate`. But the broad outcome did not improve. The refreshed local database contains 1,638,454 directed candidate rows; 1,145,886 (about 70%) still display as `other`. A separate `etymological_relation` field is mostly `unknown` and does not replace the category that the overview displays.

The core mistake was allowing engineering activity to stand in for the requested outcome. Parser fixes, a full refresh, source-claim extraction, tests, reports, and an export are useful only if they let a person inspect and query meaningful relationships in the existing product. The next pass should begin with one small, database-backed, user-visible improvement and prove that it works before scaling it.

## System shape

As inspected on 2026-09-29, the frontend is React/TypeScript with Vite, the primary application API is Go, and PostgreSQL stores the comparison data. The Python pipeline reads Wiktionary-derived source dumps, builds lemma and comparison artifacts, and supports the data refresh. A Python FastAPI NLP service provides syntactic dependency parsing, morphological analysis, slot-preserving re-inflection, and universal rewriting. Keep these roles distinct when diagnosing a problem: a UI symptom, API failure, NLP behavior, pipeline transformation, and stale generated artifact are not interchangeable causes.

The current builder docstring calls its output “authoritative” and “balanced” and claims “strict sense-level alignment.” The candidate-generation and database evidence documented here do not support those descriptions. Comments and docs should describe the implemented inputs and behavior, not aspirations. This mismatch is an early warning that a reader may otherwise trust the dataset beyond what it actually measures.

## What the database represents

The loaded local `word_comparisons` table has **1,638,454 directed candidate rows** for English, German, Swedish, Danish, and Norwegian Bokmål. It is not five vocabulary lists, nor a balanced sample of those vocabularies. Reverse comparisons are separate rows.

The candidate builder seeds pairs from translation links in English-edition Wiktionary and adds exact or near spelling collisions. It then calculates spelling, pronunciation, and gloss similarity and assigns one display category. Those categories are outputs of current pipeline rules, not reviewed linguistic conclusions.

| Display category at the 2026-09-29 refresh | Directed rows | What the label currently means |
| --- | ---: | --- |
| `other` | 1,145,886 | A candidate-builder remainder; it does not mean unrelated. |
| `false_friend` | 361,880 | A threshold-based form/meaning pattern, not a reviewed false-friend count. |
| `translation_pair` | 106,546 | A gloss-similarity branch of the current classifier. |
| `true_cognate` | 14,864 | An exact extracted-root match plus the current gloss rule. |
| `partial_cognate` | 9,278 | An exact extracted-root match plus the other branch of the gloss rule. |
| **Total** | **1,638,454** | **Candidate rows, not vocabulary items.** |

The refreshed `etymological_relation` field has 24,962 `cognate`, 1,613,492 `unknown`, and zero `false_cognate` rows. It asks a separate and narrow question based on the extracted root fields. The overview still uses the older `category` field. In particular, `unknown` does not mean unrelated.

The old local table had 403,694 rows, including 28,820 `false_cognate` relation values that could arise solely because root strings differed. The refreshed candidate universe grew to 1,638,454 rows while this rule changed. Therefore the before/after percentages are not a controlled accuracy comparison. `other` grew from 174,156 (about 43% of the old table) to 1,145,886 (about 70% of the new table). That is not evidence the words became less related; it is evidence that the refresh did not resolve the product’s catch-all category.

The overview called its distribution a “vocabulary breakdown.” That was misleading: the denominator is candidate rows. A vocabulary-wide share would require a defined list of meanings or words, a selection rule, and a denominator.

## What changed, and what did not

The 2026-09-29 refresh changed the **local development database**. There is no evidence in these records that a production or hosted dataset was changed.

The refresh:

- Rebuilt lemma artifacts from five local Kaikki/Wiktextract dumps.
- Fixed root parsing around Wiktionary annotations and HTML-wrapped text.
- Pinned the sentence-embedding model to a specific Hugging Face revision.
- Rebuilt and loaded the full candidate set.
- Extracted and attached source-backed etymology claims while retaining direction, scope, source identity, ambiguity, and multiple claims.
- Changed root comparison so unequal or missing root strings no longer establish that a pair is unrelated. This removed the 28,820 old `false_cognate` values; it did not establish what those pairs are.
- Added a CLDF export candidate and a selected, source-linked case slice.

It did **not**:

- Meaningfully split the displayed `other` category.
- Make `true_cognate`, `partial_cognate`, or `false_friend` reliable reviewed labels across the full table.
- Make the candidate set representative of each language’s vocabulary.
- Add a dedicated evidence view to the existing lexicon UI.
- Establish licensing and attribution readiness for public redistribution.

The source-claim matcher recorded 20,188 claim matches, attached in both directions to 35,188 comparison rows. In the refreshed table, 27,212 `other` rows (about 2.4%) have at least one matched claim. That is a useful subset to expose, not a license to relabel all of it. A claim can concern an entry or form rather than the exact pair of selected senses. “No matched claim” means no claim was connected by this extraction and matching pass; it does not mean the source has no relevant history.

The case slice in the working notes contains 18 groups, 70 directed comparisons, 21 pinned source pages, and 70 curated assertions. It is a diagnostic fixture, not representative coverage or a public release. Likewise, passing an exporter validator proves the export is structurally valid; it does not prove its historical claims.

Detailed commands, hashes, database results, API checks, and the named edge cases are in the [refresh report](DATASET_REFRESH_2026-09-29.md). The refresh report records that 46 pipeline tests, `go test ./...`, the listed API smoke checks, and database-to-Parquet comparison passed at that time. Those checks validate tested software paths and data loading, not linguistic correctness. They have not been rerun as part of writing this retrospective.

## Why the data feels wrong

### A candidate list was presented like a taxonomy

The builder has a broad retrieval job: find pairs worth comparing. It draws from translations and surface collisions. The classifier then forces every candidate into one exclusive display label. The `other` bucket is simply the remainder of those rules. It mixes unrelated reasons for inclusion and does not describe one linguistic relationship.

`false_friend` also sounds like a human-reviewed claim, but currently reflects form and gloss thresholds. It can contain surprising pairs whose label is an artifact of the chosen thresholds. These labels may be useful as discovery signals, but the UI should not present them as established lexical facts.

### Similarity, evidence, and history were collapsed

These are different data questions and should not be answered by one enum:

1. **Candidate reason:** Why did the pair enter the table—translation link, spelling collision, sound similarity, or a source relation?
2. **Observed similarity:** How similar are the written forms, pronunciations, or meanings under a named calculation?
3. **Source claim:** What does a particular source say about a particular entry, sense, form, or component, and in which direction?
4. **Project interpretation:** What relationship do we infer from the claims that apply to the selected units?

Similarity can be valuable without known ancestry. A misleadingly similar pair should remain searchable for the quiz and lexicon even when its history is unresolved.

### Word histories can overlap and live at different levels

Language genealogy, typology, and areal contact are language-level facts. Inheritance, borrowing, derivation, semantic loans, and compound components concern word histories. Sound, spelling, and gloss similarity are observations. They should be linked where useful, not collapsed together.

A loan can have a borrowing path and an older ancestry. A compound can contain cognate morphemes without being a whole-word cognate. A homograph can have separate senses and etymologies. Thus a pair may have multiple relations at different scopes. A single “root” string and a single category cannot preserve that structure.

Examples that exposed this:

- **`fleece` (Swedish–English):** the Swedish entry is recorded as borrowed from English; English has its own older history. Showing the English root beside the Swedish form does not mean both forms independently descend from it.
- **`ombudsman`:** borrowing and shared deeper history can coexist; they are different edges in a history.
- **`bank`, `bankman`, `sandbank`:** homographic senses and compound components must be distinguished. A shared part does not automatically make the whole forms cognate.
- **`clown`:** a loan can be hidden in `other` by the display classifier.
- **`dygn/døgn` and `aften/afton`:** differing extracted root strings do not settle whether the words are historically related.

These examples diagnose modeling problems. They do not justify bulk relabeling by themselves.

### The source set and extraction are uneven

The five local Kaikki files are language slices from English Wiktionary, not five independent native-edition dictionaries. Wiktionary is useful source material, but its entries do not form a balanced, sense-aligned comparative wordlist. Coverage, structure, and detail vary. The English-centered translation graph also affects which pairs appear.

Extraction is not interpretation. A template can name a donor, a root, or a related form; it may not apply to the selected sense or comparison pair. Preserve what was extracted, its page/entry/sense identity and direction, and the boundary where project interpretation starts.

One implementation lesson from the refresh: generated data can lag source code. A local lemma Parquet sample lacked source entry and sense identity fields that the current parser code was expected to emit. Before trusting an artifact, inspect its schema and build provenance; do not infer that code and generated files match because their filenames do.

### External dataset overlap was initially overclaimed

NorthEuraLex, IE-CoR, and Dunn/IELex use the same generic CLDF column names for fields with different meanings. In NorthEuraLex, `Value` is the orthographic word and `Form` is IPA. In Dunn/IELex, `Value` is the original form while `Form` is a tokenized representation. Therefore the earlier exact-string comparison of generic `Form` fields was invalid as a cross-resource lexical-identity check. Its reported exact-overlap counts must not be used as evidence that the datasets selected different words.

Shared Concepticon IDs and slot counts remain useful for locating concept-list overlap. They do **not** show that the datasets selected the same lexeme or sense, nor do they transfer cognate labels. The full field semantics and method plan are recorded in [dataset salvage research](DATASET_SALVAGE_RESEARCH.md); its invalid exact-`Form` claims are being corrected alongside this document.

## Product and engineering failures

### We did work around the outcome instead of proving it

The requested dataset improvement was to make the large `other` remainder more useful and queryable. We added a separate `etymological_relation` field but left the old category driving the overview. We produced audits, reports, tests, and an export before demonstrating that a person could inspect a previously uninformative row in the actual lexicon. That was the main project failure: process artifacts accumulated while the core user outcome stayed mostly the same.

Moving unequal roots from `false_cognate` to `unknown` is a real correction to an unsupported inference. It is not a broader discovery that those pairs are unrelated, and it is not a completed taxonomy.

### The language overview work repeatedly lost the whole-page goal

The intended combined page was the existing Language Overview with its complete table and breakdown, plus the language map and pair matrix. A parallel preview was a place to prove the full direction before replacing the original route. It was not permission to make a reduced substitute. Early attempts kept only parts of the old overview and did not fulfill the combination.

The map and matrix should work as coordinated views over the same pair state. A selection in one should update the others and the global reference/comparison controls. Map-only controls belong with the map. A click should behave locally and predictably; navigating to the lexicon should be explicit. The map’s 2D and 3D views both need to stay available, with depth cues and controls designed for the map rather than copied from a prototype.

Several corrections required repeated user intervention: unclear 3D depth, missing axis explanations, unrelated collision avoidance, a null-coordinate crash, absent relationship lines, changing header order, inconsistent selector and tooltip conventions, misleading line encodings, map/grid overlap order, mobile layout shifts, and controls positioned or expanded incorrectly. The recurring lesson is to test the interaction and the actual viewport outcome, not only the component code or a static screenshot. When a drawing layer has depth, order objects by their actual depth instead of putting every grid line unconditionally above every node and relation.

The user’s authored copy and the site’s established conventions are part of the reference implementation. “Keep copy minimal” means do not add redundant explanation; it does not mean remove existing copy or replace it with labels. A chart should communicate only what its data supports, in the established typographic and interaction system.

### Communication obscured the work

The user had to repeatedly ask what had changed, whether the data was real, and whether it was correct. Status should have started with a direct database query and a plain account of the changed rows and fields. Counts need their unit and denominator. Test results need their limits. A prior API failure must not be repeated after it has been fixed. Effort and commit count are not results.

When a mistake is found, correct the document or artifact that future work may rely on, and say what conclusion is withdrawn. Do not defend the prior answer or quietly leave the false claim in a research note.

## Rules for future work

1. **Start with the user-visible result.** State what a user will be able to do after the change. An audit, field, export, or test suite is supporting work, not the deliverable by itself.
2. **Name the data unit and denominator.** Keep candidate row, undirected pair, lexical entry, sense, morpheme, source claim, concept slot, and sampled vocabulary distinct. Never report a candidate-row share as a vocabulary rate.
3. **Record candidate provenance.** Preserve why each pair was retrieved. Do not let a translation link or spelling collision imply a historical relation.
4. **Keep observations, source claims, and interpretation separate.** Similarity scores are computed observations; dictionary statements are source claims; project classifications are interpretations. Make each traceable.
5. **Preserve identity and scope.** Carry the source entry, sense, etymology, form, and component identity needed to distinguish homographs and compounds. An entry-level claim is not automatically a claim about every sense or pair containing the spelling.
6. **Allow overlapping, directed relations.** Model borrowing, inheritance, derivation, and components as separate relations with direction and scope. Do not force one exclusive pair label to carry a word’s entire history.
7. **Treat unknown as unknown.** Missing or conflicting extraction does not imply unrelatedness. Keep similarity candidates queryable regardless of historical classification.
8. **Use external data for a specific job.** A meaning list can provide a comparison frame; a cognate-coded dataset can test a method on its own forms; a dictionary can add a source claim. Shared concept IDs do not establish shared lexemes or transferable labels. Verify each dataset’s field semantics before comparing it.
9. **Prove one end-to-end slice before scaling.** Pick a few cases covering a loan, compound, homograph, misleading similarity, and unresolved relationship. Follow raw source → parser → stored record → query → existing UI. Make the evidence useful there, then expand.
10. **Protect the whole user experience.** Preserve existing authored content and behavior unless requested. For combined pages, retain the complete existing page and coordinate new views through one understandable state. Check responsive interaction in the browser.
11. **Use tests for what they can prove.** Tests and schema validators catch software errors. They do not establish historical truth. Pair automated checks with direct database inspection and named source cases.
12. **Make progress easy to audit.** For every change, report the before/after query, exact local or hosted environment affected, checks run, and remaining unknowns. Keep detailed logs in linked reports rather than duplicating them in status messages.

## A practical next pass

Do not relabel 1.6 million rows. Do not start a new research project. Make a small improvement inside the existing app and data pipeline:

1. Choose a handful of already discussed records: `fleece`, `clown`, `ombudsman`, `bank/bankman/sandbank`, and one Scandinavian pair such as `dygn/døgn`.
2. Query the loaded database first. Capture the selected source and target entries, senses, current category, similarity values, roots, candidate reason, and attached claims.
3. Correct one concrete source or identity loss in the pipeline. Preserve multiple directed claims and their exact scope; do not infer a whole-word relation from a component.
4. Make that evidence inspectable and queryable in the existing lexicon. Keep similarity-based search available for quiz use even when history remains unknown.
5. Re-query those records, exercise the existing page, and run the smallest relevant tests. Report what changed in the database, what the user can now see/query, and what remains unresolved.

If the slice works for different cases without changing what a claim means, then choose a bounded expansion path. An aligned concept list can help test sound-comparison methods; a cognate-coded resource can serve as a method fixture on its own selected forms; targeted independent dictionary entries can fill a specific source gap. None should replace the project’s own sourcing and transformation work by default. CLDF is an optional interchange format, not the goal.

## Reference documents

- [Dataset refresh and local database results](DATASET_REFRESH_2026-09-29.md) — exact rebuild inputs, hashes, counts, commands, checks, and named rows.
- [Dataset retrospective](DATASET_RETROSPECTIVE_2026-09-29.md) — more detail on the candidate-generation and classification behavior.
- [Dataset salvage research](DATASET_SALVAGE_RESEARCH.md) — resource/method exploration and its corrected field-semantics caveat.
- [Dataset case review](DATASET_CASE_REVIEW.md) — curated diagnostic cases.
- [Dataset work plan](DATASET_WORK_PLAN.md) — next bounded milestone.
