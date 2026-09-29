# Dataset salvage: first-principles plan and source findings

**Checked:** 2026-09-29
**Purpose:** Decide what Linduistics should be as a dataset, which sources can serve that purpose, and how to make a useful result without replacing the project's own sourcing and transformation work with a finished corpus.

## The important source finding

The files named `kaikki_sv.jsonl`, `kaikki_da.jsonl`, `kaikki_nb.jsonl`, `kaikki_de.jsonl`, and `kaikki_en.jsonl` look like five independent dictionary sources. They are not. The URLs in [`download_dumps.py`](../pipeline/src/download_dumps.py) point to language-filtered dictionaries under `kaikki.org/dictionary/`. Kaikki says those dictionaries were extracted from the **English-language edition of Wiktionary** and have English glosses. Its separate raw-data page identifies the English-edition dump as `enwiktionary`.

This has a direct consequence: the Swedish, Danish, German, and Bokmål records in this project are mostly language entries curated on English Wiktionary, not independent records from the corresponding native-language Wiktionary editions. The five files provide broad cross-language coverage, but they do not provide five independent editorial perspectives. A missing local etymology claim means “not found in this edition, extraction, and snapshot,” not “no such claim exists in the language's own dictionary sources.”

This does **not** prove that the current candidate counts are wrong, nor does it by itself explain every `other` row. It does reveal a strong source-coverage limitation that the filenames and prior analysis obscured. It is a plausible contributor to the thin or oddly distributed relationship evidence.

There is already a feasible independent comparison source for German. Kaikki publishes a separate `dewiktionary` extraction, based on the German-language Wiktionary edition, with German glosses. The provider marks non-English-edition extracts as works in progress that may contain errors or omissions. This is useful as an additional sourced account, not a drop-in replacement for the current English-edition entries.

As of the checked Kaikki raw-data page, there are separate hosted extracts for German and other listed editions, but not Swedish, Danish, or Norwegian Bokmål. This is a statement about Kaikki's current hosted extracts, not a claim that those Wiktionary editions or Wikimedia XML dumps do not exist. Supporting another edition may require a separate extractor and tests for its templates.

## What the dataset should be

The project is trying to answer more than one kind of question. The data should preserve those questions as linked layers rather than compress them into one pair category.

| Layer | Unit | Example question | What it must not be confused with |
| --- | --- | --- | --- |
| Language context | A language or variety and a sourced fact | Are two varieties genealogically related? What structural feature or contact setting is recorded? | The history of a particular word pair |
| Lexical identity | A source-specific entry, etymology, sense, form, or component | Which sense of `bank` is this? Which `bank` component is in `bankman`? | A spelling-only headword key |
| Source claim | A directed, versioned statement tied to a source record | Does this entry say “borrowed from,” “inherited from,” or “cognate with” another form? | The project's conclusion about a selected pair |
| Comparison observation | A computed relation between selected forms or senses | How similar are spelling, pronunciation, and definitions? | Historical descent |
| Candidate reason | Why a pair entered the search set | Did it come from a translation link or a form collision? | A linguistic relationship |
| Project interpretation | A rule-bound reading of the linked evidence | Does the selected evidence support whole-word cognacy or only shared components? | The raw source statement or an embedding score |

The core data structure is best thought of as a **source-linked lexical graph**: records for source editions, entries, senses, forms, and components; directed relation claims between them; and separate comparison observations between selected records. Each claim keeps its source, source edition, version or snapshot, relation, direction, and scope. A claim may apply to a whole entry, a sense, a form, or a component.

The graph should allow several paths at once. A loan can also have deeper ancestry. A compound can have cognate components without the whole compound being inherited as a unit. Homographs can have different histories. Similarity can be high while the history is unresolved. A simple status such as **source-stated**, **project-inferred**, or **unresolved** is enough to mark the evidence boundary; a numerical certainty score is not required.

`false_friend` belongs to the comparison/search layer: it can describe a misleading modern form/meaning pattern that is useful in the quiz. It must not assert “not cognate.” Candidate discovery and historical classification are separate jobs. `other` is neither a language relation nor a lexical relation; it is a legacy output for candidates that did not match a more specific rule.

## Why the present percentages fail

The builder combines English Wiktionary translation links with exact and near spelling collisions. It then calculates spelling, sound, and gloss similarity and puts each candidate into one display category. The classifier uses surface and gloss thresholds for `false_friend`, a matching extracted root for cognate labels, and a gloss threshold for `translation_pair`. The remaining candidates become `other`.

The builder's module docstring still describes the output as an “authoritative, balanced lexical comparison dataset” with “strict sense-level alignment.” That language overstates what the implementation does: candidate generation includes surface collisions, and a computed gloss match is not a confirmed historical or sense-level relation. The description should be corrected when the builder is next edited so the code does not promise a stronger dataset than it produces.

Those rules answer “which current candidate rule fired?” They do not answer “what share of this language's vocabulary has this historical relationship?” The row set is neither an explicitly sampled vocabulary nor a balanced concept list. Some candidates come from translations; others exist because forms collide. The database's 70% `other` is therefore a property of this candidate-and-rule system. It cannot serve as the fraction of words that have unknown or unrelated origins.

Keep the candidate finder. It is useful for the lexicon and misleading-similarity quiz. Change what the counts claim, and do not use that candidate pool as the denominator for vocabulary statistics.

## Source options and their jobs

| Resource | Useful for | Fit and limits for Linduistics | Practical use |
| --- | --- | --- | --- |
| English Wiktionary / Kaikki English-edition extracts | Broad, multilingual entries, translations, pronunciations, and etymology templates | One edition's coverage and editorial conventions; senses and claims can be entry-scoped, inconsistent, or missing | Keep as the broad discovery and transformation source. Record edition and snapshot explicitly. |
| German Wiktionary / Kaikki `dewiktionary` extract | An independent native-edition account for German records | Hosted extraction is explicitly a work in progress; glosses are German, so matching them directly to English-edition glosses needs care | Pilot it on a short list such as `platt/plat`, `bank`, and `clown`. Preserve it as a second source, not a replacement row. |
| Bokmålsordboka and Nynorskordboka | Modern Norwegian spelling, meanings, usage examples, and short etymologies; an official API and downloadable content exist | Covers standard entries, not all historical or dialect material; it is not a cognacy database | A practical independent source for Norwegian Bokmål. Preserve article IDs, retrieval date, and attribution. Check the current open-data terms before publishing extracted content. |
| SAOB | Historical Swedish entries, definitions, short etymologies, and dated usage citations | Swedish-only, historical scope; it excludes some proper names, technical terms, dialect-only words, and foreign words without Swedish inflection. Bulk reuse terms were not checked here. | Use as a targeted reference for difficult Swedish cases first, not as an assumed bulk input. |
| WOLD | Loanword/source-word/donor-language relations across edited language vocabularies | A curated loanword resource with vocabularies for 41 recipient languages, not a complete dictionary. Overlap with the project's five varieties was not confirmed in this pass. | Check actual language coverage and reuse terms; use it to test borrowing representation and selected cases, not to fill every `other` row. |
| Concepticon | Linking published concept lists through defined concept sets | A concept mapping is a meaning anchor, not proof that two dictionary senses are equivalent; its maintainers describe cross-language concept definition as difficult | Use it to define a bounded comparison sample and record mapping plus sense-selection decisions. |
| Lexibank / IELex | A reproducible external lexical dataset with concept-linked forms and cognate coding | Not Linduistics' own source work; it is a comparison fixture and not automatically the right scope or answer | Check language and concept coverage. Compare selected overlapping cases to test transformation behavior; do not import its judgments as project truth. |
| Glottolog | Language and variety identifiers and genealogical classifications | Language-level genealogy, not word-level origin; classifications can be revised | Link stable language identifiers and sourced family context if a page needs it. Keep the source and date. |
| WALS | Documented typological features | Feature data is sparse and does not prove genealogy or lexical relationships | Add only for a clear language-comparison question. It is not needed to repair lexical classifications. |
| CLDF | Interchange schemas for wordlists, cognate judgments, borrowings, and custom linked data | A format, not a data source or an epistemic guarantee; its standard wordlist tables model cognate judgments and borrowings as separate relations | Export the records that fit. Keep a project-specific internal model if it is clearer. The [CLDF terms](https://cldf.clld.org/v1.0/terms.html) define separate `CognateTable`, `CognatesetTable`, and `BorrowingTable` structures. |

The source review points to supplementation, not replacement. Wiktionary can remain central to the project's own source and transformation work. Other sources should be added when they provide a distinct piece of evidence that the current edition does not.

## A useful dataset shape

Build two connected but distinct products from the same source work:

### 1. Candidate index for exploration

Preserve broad form and translation candidates for searching, sorting, and the quiz. Store why each candidate exists and keep its computed spelling, sound, and meaning observations. Labels such as “misleadingly similar” describe a queryable modern pattern. They do not settle lexical history.

### 2. Evidence-backed comparison slice

Create a bounded sample with a clear inclusion rule. A concept-aligned sample is one option: select a published meaning list, map its meanings through Concepticon where appropriate, identify one or more source senses per language, and record missing or multiple matches. The unit is a **concept slot in a defined sample**, not a pair mined from every dictionary collision. Report coverage and the denominator explicitly. Only make cognacy summaries within that defined sample, and say what a missing form or unresolved history means.

Use the current named cases as a separate mechanism test suite. Cases such as *fleece*, *ombudsman*, *bankman*, *sandbank*, *aften/afton*, and *væg/väg/vägg* test loans, deeper lineage, compounds, homographs, sense matching, and ambiguous source claims. They do not estimate rates.

This combination retains the fun and utility of finding surprising pairs while adding a small view that can support defensible comparisons. It avoids presenting a giant candidate pool as a sample of ordinary vocabulary.

## A practical sequence

1. **Correct the source manifest before altering rules.** Record source edition (`enwiktionary`, `dewiktionary`, or another source), provider, dump date, extraction version, raw file hash, and license/attribution terms. Treat current `kaikki_sv`/`kaikki_da` names as language-slice names, not edition identifiers.
2. **Run a German source pilot.** The separate German-edition extraction is immediately available and small enough to test against existing cases. Compare the same German words from English and German editions. Keep their entry/sense IDs distinct; inspect how often entry counts, etymology claims, and sense meanings differ. This will directly test whether a second edition contributes evidence or only translation noise.
3. **Use a small Bokmål pilot from the official dictionary source.** Resolve the same handful of Bokmål cases through the official API. Keep dictionary article IDs and source claims separate from Wiktionary. This adds a second editorial source without building a new project or replacing the existing pipeline.
4. **Create the smallest concept-aligned sample.** Reuse a published concept list that covers the target languages; verify overlap first. Begin with enough concepts to exercise the pipeline, preserve multiple lexicalizations, and test missing senses. Do not optimize for a large headline count.
5. **Make one end-to-end record inspectable.** A reader should be able to see: why the pair was retrieved; source edition and entry; selected sense; source claim and its scope; calculations; any project interpretation; and unresolved links. Keep the same record queryable in the site.
6. **Expand only when the pilot identifies a gap.** If a missing Swedish historical claim blocks a specific case, consult SAOB and check its terms. If the task is donor-language history, compare against WOLD where the language and concept coverage match. If it is language context, add Glottolog or WALS independently.
7. **Only then reshape summaries.** Make candidate counts honest candidate counts. Make concept-sample summaries use their actual sample denominator. Keep source history relations multi-valued and queryable. Export to CLDF if it helps reuse.

## What this approach does not claim

- It does not establish the correct history of every candidate.
- It does not assume one extra dictionary is a universal gold standard.
- It does not make concept mappings equivalent to sense alignment.
- It does not infer “unrelated” from absent source claims or different extracted roots.
- It does not require confidence scores, expert adjudication of the full corpus, or a new standalone project.
- It does not call candidate-pool ratios the fraction of a language's vocabulary that is cognate.

## Sources checked

- Kaikki identifies its language dictionaries as extracted from English Wiktionary and its separate raw page identifies the English-edition dump: [Kaikki overview](https://kaikki.org/), [raw data downloads](https://kaikki.org/dictionary/rawdata.html).
- Kaikki separately publishes German-edition raw data from a `dewiktionary` dump, and marks non-English extraction as work in progress: [German raw data](https://kaikki.org/dewiktionary/rawdata.html), [Wiktextract README](https://github.com/tatuylonen/wiktextract/blob/master/README.md).
- Official Bokmålsordboka/Nynorskordboka API and data: [API documentation](https://ord.uib.no/ord_2_API.html), [open-data and copyright terms](https://ordbokene.no/about/open-data). The API page describes search and article lookup; the open-data page says dictionary content is downloadable under stated terms, including commercial use.
- SAOB scope and etymology material: [Swedish Academy overview](https://www.svenskaakademien.se/svenska-spraket/svenska-akademiens-ordbok-saob).
- Loan evidence: [WOLD overview](https://wold.clld.org/), [WOLD field definitions](https://wold.clld.org/terms).
- Meaning anchors: [Concepticon about concept lists and concept sets](https://concepticon.clld.org/about).
- Comparative reference: [Lexibank IELex dataset](https://lexibank.clld.org/contributions/dunnielex).
- Language identifiers and genealogy: [Glottolog languoids](https://glottolog.org/glottolog/glottologinformation).
- Language structure: [WALS features](https://wals.info/feature).
- Interchange format: [CLDF terms](https://cldf.clld.org/v1.0/terms.html).
