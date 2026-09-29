# Linduistics: engineering postmortem and project learnings

**Written:** 2026-09-29
**Purpose:** A practical record for the next person working on this portfolio project. It explains what the project set out to do, what the dataset work changed, why the result fell short, what the evidence supports, and how to continue without repeating the same detour.

## Project in one paragraph

Linduistics is a small language-comparison project built by sourcing and transforming lexical data. The intended result is a public, inspectable resource: people should be able to find words that look, sound, or mean something alike, explore their recorded histories, and query misleadingly similar pairs for the lexicon or quiz. The project should make its own transformations useful and reproducible. It is not meant to become a research institution, a definitive dictionary, or a thin interface over a finished external corpus.

## What went wrong

The visible problem was the large `other` share and the implausibly small cognate share in the language overview. The work then drifted toward improving extraction, tracking more etymology claims, validating exports, and documenting audits. Those are useful engineering tasks, but they were treated as progress toward better user-facing classifications before they had changed those classifications in a meaningful way.

The actual result is mixed:

- The refreshed local database has **1,638,454 directed comparison-candidate rows**. `other` is **1,145,886 rows, about 70%**.
- The refresh improved repeatability and preserved more source evidence. It did **not** make most `other` rows informative historical relationships.
- A new `etymological_relation` field sits beside the old display `category`. The overview still uses `category`. The new field therefore did not solve the display or classification problem.
- The prior root rule treated unequal extracted roots as evidence of `false_cognate`. That was too strong. The refresh now marks only equal extracted roots as `cognate`; missing or unequal roots become `unknown`. This removed 28,820 `false_cognate` values, but did not prove those pairs unrelated or classify them further.
- The candidate universe expanded from **403,694 to 1,638,454 rows**. `other` rose from **174,156 (~43%) to 1,145,886 (~70%)**. Because the candidate set changed, this is not a controlled before-and-after accuracy comparison. It is still clear that the catch-all was not resolved.

The main failure was not that tests failed. The main failure was measuring progress by pipeline work instead of by whether a user could now understand and query the relationships that had previously been hidden in `other`.

A later read-only query against the loaded database found matched source claims on 27,212 of the 1,145,886 `other` rows (about 2.4%). Those rows contain several kinds of claims, especially `cognate_mention` and `borrowed_from`. This shows that an evidence view can improve a real subset, while also showing why it cannot by itself fix the whole remainder. The full counts and caveats are in the [refresh report](DATASET_REFRESH_2026-09-29.md#read-only-check-source-claims-inside-other).

## How the effort went off course

The sequence matters because each step looked reasonable in isolation:

1. The overview showed very few cognates and a large `other` share. The first response treated this mainly as a category-rule problem.
2. The old relation rule treated unequal extracted roots as `false_cognate`. That was not justified: a missing or differently written root does not show that two words have separate histories. The rule was changed to return `unknown` unless roots matched.
3. A full rebuild then loaded a much larger candidate set. The old database had 403,694 rows; the refreshed one had 1,638,454. The refresh was not a controlled experiment: candidate coverage changed as well as root handling, so the category percentages cannot be read as a before-and-after accuracy score.
4. The new `etymological_relation` field sat beside the existing display `category`. The UI still showed the old categories, so the new evidence model did not make the large `other` bucket more informative to users.
5. Work expanded into claim extraction, audits, test coverage, manifests, case slices, and a CLDF export. These artifacts made the pipeline easier to inspect, but they did not turn most existing candidates into useful, queryable historical relationships.
6. The user had to repeatedly ask what the database actually contained and what the work had changed. We should have queried the database and reported the concrete result before presenting more plans or infrastructure as progress.

The earlier attempt did make one defensible correction: it stopped calling unequal roots proof of unrelatedness. It did **not** make the dataset broadly more correct. `false_cognate` fell from 28,820 to zero while `unknown` rose. That is a correction to what the system claims, not a discovery that those 28,820 pairs are unrelated, related, or otherwise resolved.

## What a source check taught us

The dump names suggested that the project had five independent dictionary editions. The configured Kaikki URLs instead provide language slices extracted from **English Wiktionary**. This means the Swedish, Danish, Bokmål, and German rows are not independent editorial accounts from their native Wiktionaries. That source limitation was hidden by local filenames such as `kaikki_sv.jsonl`.

A small check against other editions and dictionaries made the limitation concrete:

- The local German `Clown` record from the English-edition slice says only that it was borrowed from English. The German Wiktionary entry contains a fuller account, including competing explanations for the deeper origin. A second edition can add useful evidence, but it does not automatically settle the history.
- The local German `Bank` slice already preserves separate records for the “bench/bank” and “financial institution” entries, with different plural forms and histories. This case points to an identity and modeling requirement: preserve distinct etymology entries and senses instead of flattening a spelling to one root.
- Bokmålsordboka records Bokmål `blive` as borrowed from Low German. That is a useful independent claim for the recipient entry, but it is still one directed borrowing path, not a complete account of every deeper ancestor.

These are diagnostic source comparisons, not a representative audit. They support supplementing Wiktionary with distinct sources where those sources add evidence. They do not support replacing the project with another corpus or treating a second dictionary as an automatic gold standard. Details and links are in [dataset salvage research](DATASET_SALVAGE_RESEARCH.md).

The *fleece* example needs particular care. The local comparison sidebar displays the English root `Proto-West Germanic *fleus`; that does not establish that Swedish *fleece* has the same root. The Swedish source entry says it was borrowed from English. The correct representation keeps the Swedish borrowing path and English ancestry attached to their respective entries. A single shared-root field cannot express that path faithfully.

## What the current numbers mean

The comparison table is not a sample of each language's vocabulary. A row is a pair selected by the pipeline. The pipeline gets candidates from translation links and from exact or near spelling collisions, then computes form and gloss similarities and assigns one display category.

Current display categories:

| Category | Directed rows | What it means today |
| --- | ---: | --- |
| `other` | 1,145,886 | No more specific candidate rule assigned a label. It does not mean unrelated. |
| `false_friend` | 361,880 | A threshold-based form/gloss pattern. Rows are not individually verified false friends. |
| `translation_pair` | 106,546 | A high gloss-similarity result without enough form similarity under the current rules. |
| `true_cognate` | 14,864 | An exact extracted-root match plus the current gloss rule. |
| `partial_cognate` | 9,278 | An exact extracted-root match plus the other branch of the current gloss rule. |

These counts are copied from the 2026-09-29 refresh report, which records a direct query of the local database after refresh. I did not rerun that query while writing this retrospective; verify the database again before using the counts as a current baseline.

There are **24,962 `cognate`** and **1,613,492 `unknown`** values in the separate `etymological_relation` field. Those counts answer a different, very limited root-comparison question; they are not replacements for the categories above. `unknown` currently combines multiple situations: missing extraction, different levels or spellings of reconstructed roots, and relationships the simple rule cannot establish.

For English–Swedish, the database has **401 `true_cognate`** and **795 `partial_cognate`** rows. These counts describe selected candidate rows that pass the current rule. They do not estimate the fraction of English or Swedish vocabulary that is cognate.

The overview's “vocabulary breakdown” label was therefore misleading. A category percentage can be a percentage of candidate rows, but not a vocabulary statistic without a defined sample and denominator.

## The data model lesson

The current design asks one label to answer several different questions. Keep these questions separate:

1. **Candidate retrieval:** Why did these two forms enter the comparison set? For example, a translation link, spelling match, phonetic match, or source relation.
2. **Observed comparison:** How similar are the spellings, pronunciations, or glosses? These are measurements and useful search signals. They are not proof of shared history.
3. **Source claim:** What does a cited entry say about a form, etymology, sense, or component? Preserve the direction, source identity, scope, wording or normalized fact, and version where available.
4. **Evidence link:** Does a source claim identify the selected entry, sense, or component? An entry-level statement may not apply to the specific sense selected by the comparison pipeline.
5. **Project interpretation:** What relationship do we infer from the available claims? Keep it explicit and allow more than one relationship for a pair.

Historical relationships are not mutually exclusive. A modern loan can have a borrowing path from its donor and a deeper relationship through an older ancestor. A compound can contain historically related parts even when the whole compound is not a cognate of another whole word. Homographs can have separate senses and etymologies. One scalar enum cannot preserve this structure.

For that reason:

- Treat `other` as a legacy candidate-builder remainder, not as a linguistic category.
- Keep misleadingly similar candidates searchable even when their history is unknown. The quiz and lexicon need that use case.
- Do not turn missing or mismatched evidence into a negative claim such as “unrelated.”
- Preserve multiple source-backed paths and component-level evidence. Do not force a single exclusive label.
- Keep language-level genealogy, typology, and areal/contact facts separate from word histories. They can be linked to lexical comparisons, but they do not settle them.

## Source and extraction lessons

Wiktionary is useful raw material for this project. It has forms, glosses, translations, etymologies, and links, and extracting those structures is part of the engineering work. The problem is not simply “Wiktionary is bad.” The problem is treating a collaborative dictionary as if it were a balanced, sense-aligned comparative vocabulary dataset with a complete, consistent etymology graph.

The pipeline's English-centered translation graph and spelling-collision generation create a candidate set with its own biases. Translation links can be entry-level or sense-level. Entries can have multiple etymologies or homographic senses. Templates and prose vary. Cross-references can name a related form that is not the form in the selected comparison. Source claims can change over time. Extracting a claim is not the same as proving that it applies to a selected pair.

Cases that exposed structural limits:

- **`fleece`:** Swedish is recorded as borrowed from English while English has an older history. The Swedish borrowing and English ancestry are distinct paths. A single “root” field does not represent this well.
- **`ombudsman`:** borrowing, older ancestry, and compound components can all matter. A form-level cognate label cannot explain which relation is being asserted.
- **`bank`, `bankman`, `sandbank`:** homographs and compounds require sense and component identity. A shared component does not prove that two whole words share a history.
- **`clown`:** a loan history can be present even when the current display category says `other`.
- **`aften/afton`, `dygn/døgn`, `væg/väg/vägg`:** source claims, reconstructed roots, and similar forms can point in different directions. Preserve each claim and the exact target it names; do not let surface similarity or a one-root comparison decide the history.
- **`blive`:** a local snapshot and a later Wiktionary revision give different accounts. Data version is part of the evidence, not incidental metadata.

These examples are diagnostic cases. They are not representative samples and do not justify bulk relabeling on their own.

## What the engineering work did accomplish

The refresh was not wasted, but its achievements need to be stated at the right level:

- Fixed root parsing around Wiktionary annotations and HTML-wrapped text.
- Pinned the sentence-embedding model revision used by the rebuild.
- Rebuilt and loaded the full local comparison table.
- Extracted and matched structured source claims while preserving scope, source identity, ambiguity, and multiple claims.
- Changed the root comparison so different root strings no longer automatically mean `false_cognate`.
- Created a deliberately selected source-linked case slice and a CLDF export candidate.

The case slice contains 18 groups, 70 directed comparisons, 21 pinned source pages, and 70 curated assertions in the current notes. It is a diagnostic artifact, not a representative dataset or public release. Its tests show that the exporter and transformations behave as expected for tested cases. They do not validate the full taxonomy or prove the history of every pair.

## Validation: what passed and what did not

The recorded checks include 46 pipeline tests, `go test ./...`, focused case-slice exporter tests, PyCLDF validation, a database-to-Parquet comparison, and API smoke tests. The refresh report records those checks passing at the time of the work; I did not rerun them while writing this retrospective.

They establish that the tested code runs, the local DB load corresponds to the generated artifact within expected floating-point rounding, and the tested endpoints responded. They do **not** establish that the categories are linguistically correct, that the source set is complete, that `other` means one thing, or that any displayed percentage describes a language's vocabulary. They also do not establish that the data is clear for redistribution; licensing and attribution still need review before release.

## Process lessons

These are the mistakes I would avoid on the next pass:

1. **Name the desired changed result before building supporting infrastructure.** “Improve `other`” means users can inspect real, queryable evidence for rows now buried there. A new audit field or report is not enough.
2. **Define the unit and denominator.** A directed candidate pair, source claim, lexical entry, sense, and sampled concept are different units. Never call their counts interchangeable.
3. **Separate retrieval from judgment.** Broad candidate generation is useful for discovery, but it must not make threshold labels look like reviewed linguistic facts.
4. **Use a narrow end-to-end case before scaling.** Trace a few difficult records through source, parsing, identity resolution, comparison, interpretation, database, and UI. Add a regression only when a concrete loss or bug is reproduced.
5. **Do not optimize for test counts.** Tests can protect extraction and exports. They cannot substitute for a useful result or domain correctness.
6. **Report shipped outcomes, not effort.** State whether the database changed, what rows or fields changed, what users can now do, what checks ran, and what remains unknown. Keep that update visible while work is underway.
7. **Keep the project enjoyable and appropriately small.** This is a portfolio project built through sourcing and transformation. Do not turn it into a broad research program or replace the learning and craft with a finished corpus.
8. **Answer the concrete question before proposing the next phase.** When asked what is in the database, query the database directly. Give the table, counts, definition of a row, and the limits of those counts before recommending more work.
9. **Do not call a safer label a more complete taxonomy.** Moving an unsupported negative claim to `unknown` improves restraint, but it does not explain the records or make them useful. Say exactly which claim changed and which user-facing question it now answers.
10. **Keep the goal stable across turns.** The goal is to make a useful, inspectable public dataset from sourced and transformed material. Audits and formats are means. They count as progress only when they improve the dataset's evidence, the user's ability to inspect it, or the reproducibility of that result.

## How the work itself went wrong

The technical detour was made worse by how I interpreted and reported the work. These are project lessons, not just communication preferences:

- **I replaced the product goal with a safer-sounding research goal.** The user wanted a useful public dataset made through the project's own sourcing and transformation work. I over-focused on proving correctness, defining confidence boundaries, and comparing established resources. That made a weekend project sound like a linguistic research program.
- **I treated “first principles” as a request for labels and caveats.** The question was about the underlying model: language-level genealogy, typology, and areal contact; word and morpheme histories; and smaller scales of cognacy. I kept returning to UI categories and wording. The data model must represent distinct kinds and levels of relationship before the UI chooses how to present them.
- **I confused caution with usefulness.** The user did not ask for certainty scores. Crude, useful categories are acceptable if their scope is clear. Uncertainty belongs where it helps explain a record; it should not dominate every label or make the product inert.
- **I let infrastructure stand in for the outcome.** More parsers, reports, test counts, exports, and commits did not mean `other` had become useful. The right progress measure is what a person can now find, inspect, compare, or query in the existing product.
- **I did not lead with the database facts.** The user had to repeatedly ask for a direct database query and for the actual counts. A progress report should first show the real table, its row unit, the category totals, the change made, and what remains unexplained. API results and screenshots are not substitutes for a database query when the question is about stored data.
- **I described stale or separate states as if they were current.** The display `category`, the separate `etymological_relation`, the generated artifact, and the loaded database are different things. Reports must identify which one they query and when. An old API failure report must not be repeated after the routes are fixed.
- **I proposed another plan when the user wanted the next useful change.** A plan is not progress when the diagnosis is already clear. The next step should be a small change in the existing dataset and lexicon, tested against named examples, not a new project or another planning-only stage.
- **I over-read brief corrections and then made broad changes.** Requests about copy, controls, layout, or chart behavior must be applied to the specific element named. Existing user-authored content should remain intact unless the user asks to change it. Before changing adjacent behavior, inspect the current UI and state the exact effect the change will have.

### Product requirements reconstructed from the work

These are the practical requirements that emerged from the user's prompts. They are a working summary, not a substitute for confirming future product decisions.

1. **Keep the sourcing and transformation work visible.** The project should add value through its own collection, parsing, linking, and transformation, rather than becoming a CRUD interface over a finished external corpus.
2. **Make comparisons useful even when history is not known.** People should be able to search and inspect misleadingly similar pairs for the lexicon and quiz. A missing historical classification must not remove a useful comparison candidate.
3. **Represent more than one kind of relationship.** Language ancestry, structural similarity, and contact are language-level dimensions. Inheritance, borrowing, derivation, calquing, and compound components concern word histories. Similarity scores describe forms or meanings. Keep those dimensions separate and allow more than one relevant relation on a pair.
4. **Make the evidence inspectable.** A reader should be able to see which entry, sense, or component supports a claim, what the source says, and where the project's transformation or interpretation begins.
5. **Use outside datasets as tools, not replacements.** A comparison dataset can help check coverage or provide a bounded reference sample. It should not displace the project's source work just because it is more complete or better curated.
6. **Do not claim vocabulary-wide rates from candidate rows.** If the site eventually reports a share of cognates in a language pair, it needs a defined meaning list, sampling frame, and denominator. Until then, report counts as candidate or comparison counts.
7. **Keep the scope enjoyable and achievable.** A small public resource that answers a real question for a few people is a valid result. The work should not grow into an academic validation program unless the user chooses that direction.

### Working protocol for the next engineer

For each proposed dataset improvement, write down these five items before expanding the pipeline:

1. **User outcome:** What new question can a person answer in the current product after this change?
2. **Data unit:** Is the change about a language, entry, sense, morpheme, candidate pair, source claim, or sample concept?
3. **Before state:** Query the loaded database and capture the counts and named records that expose the problem.
4. **Small end-to-end change:** Update the source transformation, stored representation, and existing query or view for a bounded set of cases. Do not stop at a report or export.
5. **Evidence of completion:** Query the database again, exercise the existing product path, run the checks that cover the changed behavior, and report what each check does and does not prove.

If the bounded change reveals a missing source or schema feature, add only what that case needs. Then test it against another case with a different relationship. Scale up only after the representation handles both without losing source scope, direction, or overlapping histories.

### Product and interface lessons from earlier work

The same outcome-first failure appeared in the language comparison UI:

- **“Combine” meant add both new views to the existing Language Overview.** The map and matrix were to join the existing table and breakdown. A parallel page was a safe place to prove that complete integration before replacing the original route; it was not a new, reduced product page.
- **A combination must preserve the existing page.** The table, breakdown, authored copy, layout, and existing controls were part of the requested result. Keeping only a small subset and calling it integrated missed the goal.
- **Coordinate interactions across views.** A language chosen from the table, map, matrix, or shared pair selector should produce one understandable comparison state. Map-only controls, such as 2D/3D, belong to the map. Avoid multiple filters that appear global but silently affect different panes.
- **Make actions match their visual affordance and stay usable at every viewport.** A control should not cover nodes or content. Persistent controls must remain reachable when the user is at the bottom of a long mobile page. Keep desktop and mobile defaults intentional.
- **Treat screenshots as evidence to inspect, not instructions to overgeneralize.** Confirm which object overlaps which, what a symbol means, and which plotted lines are in front before changing geometry or drawing order. Verify the result in the actual page after interaction, not only from code or a static screenshot.
- **Preserve copy and established component conventions.** Existing authored copy is not “redundancy” to trim. Change only the requested copy; use neighboring pages for visual and typographic conventions, and use the project's existing controls and icon system.

These are the same core lesson as the data work: do not optimize a local element while losing the user's requested whole. Define the whole-page or user-visible outcome first, then implement and verify the connected behavior.

## Practical direction from here

Do not start by relabeling all 1.6 million rows. First make one useful vertical slice work in the existing project:

1. Pick a small set of cases that covers borrowing, shared deeper ancestry, compounds/components, homographs, misleading similarity, and unresolved links.
2. For each case, preserve the specific source entries and senses, source claims and version, transformation output, similarity observations, and any project interpretation.
3. Make the resulting paths queryable in the current app. Keep the candidate search available even when no historical relation is established.
4. Use the slice to choose the smallest schema and interface changes that represent the evidence without losing multiple paths.
5. Only after that, test one expansion path. Use Concepticon as a possible way to align meanings for a deliberately defined comparison sample; use Lexibank/IELex as an external comparison fixture rather than a replacement; use WOLD when a borrowing question needs a targeted comparison. Glottolog and WALS can supply language-level context if a real product question needs it. These sources answer different questions and should not be merged into word-history verdicts. CLDF remains an optional export format.
6. Publish only after documenting source licenses, attribution, inputs, transformation versions, and the exact scope of every count.

A useful first release can be small. A reader should be able to inspect why a pair was found, what each source actually claims, which sense or component that claim concerns, what the pipeline computed, and where the project interpretation begins. The reader must not mistake the slice for a vocabulary-wide rate.

The first implementation target should be a small, end-to-end improvement in the existing product, not another planning artifact: choose a few already named cases, preserve their distinct source entries and paths, expose the evidence through the existing lexicon, and verify the records directly in the database. Keep the broader candidate finder and quiz useful while clearly separating their similarity signals from historical claims. Expand the slice only after a reader can inspect and understand it.

## Reference documents

- [Dataset refresh and current local database results](DATASET_REFRESH_2026-09-29.md)
- [Dataset retrospective and next-step plan](DATASET_RETROSPECTIVE_2026-09-29.md)
- [Detailed source extraction audits](DATASET_NEXT_STEPS.md)
- [Curated case review](DATASET_CASE_REVIEW.md)
- [Current work plan](DATASET_WORK_PLAN.md)
