# Dataset salvage: first-principles plan and source findings

**Checked:** 2026-09-29
**Purpose:** Decide what Linduistics should be as a dataset, which sources can serve that purpose, and how to make a useful result without replacing the project's own sourcing and transformation work with a finished corpus.

## The important source finding

The files named `kaikki_sv.jsonl`, `kaikki_da.jsonl`, `kaikki_nb.jsonl`, `kaikki_de.jsonl`, and `kaikki_en.jsonl` look like five independent dictionary sources. They are not. The URLs in [`download_dumps.py`](../pipeline/src/download_dumps.py) point to language-filtered dictionaries under `kaikki.org/dictionary/`. Kaikki says those dictionaries were extracted from the **English-language edition of Wiktionary** and have English glosses. Its separate raw-data page identifies the English-edition dump as `enwiktionary`.

This has a direct consequence: the Swedish, Danish, German, and Bokmål records in this project are mostly language entries curated on English Wiktionary, not independent records from the corresponding native-language Wiktionary editions. The five files provide broad cross-language coverage, but they do not provide five independent editorial perspectives. A missing local etymology claim means “not found in this edition, extraction, and snapshot,” not “no such claim exists in the language's own dictionary sources.”

This does **not** prove that the current candidate counts are wrong, nor does it by itself explain every `other` row. It does reveal a strong source-coverage limitation that the filenames and prior analysis obscured. It is a plausible contributor to the thin or oddly distributed relationship evidence.

There is now a practical cross-edition comparison path for all five project languages. Kaikki publishes a French-edition (`frwiktionary`) extraction. Its current browse index lists English, German, Swedish, Danish, and Norwegian Bokmål entries. The listed counts are **sense counts**, not headword or entry counts: 224,758 English senses, 2,201,519 German, 47,946 Swedish, 8,878 Danish, and 1,724 Bokmål. The raw-data page offers the French extract as JSONL (699.9 MB compressed in the checked snapshot), based on a `frwiktionary` dump dated 2026-09-01.

This is a second Wiktionary edition, not an independent dictionary authority. Its separate editorial history may contribute different entries and etymology claims, but its glosses are in French and its extraction is marked as work in progress. Coverage is especially sparse for Bokmål. Do not merge records by spelling alone or treat an absent French-edition entry as negative evidence. The separate German-edition (`dewiktionary`) extract remains useful for German-specific comparisons, and Bokmålsordboka remains a stronger independent source for selected Bokmål cases.

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
| French Wiktionary / Kaikki `frwiktionary` extraction | A second edition with listed coverage for all five project languages | French glosses; counts are uneven sense counts; extraction is marked work in progress. It is not independent of Wiktionary as a project, and coverage does not imply matching senses | Run a bounded cross-edition comparison on named cases and a stratified sample of current `other` candidates. Match edition-specific records and senses; retain both claims and record unmatched entries. |
| German Wiktionary / Kaikki `dewiktionary` extract | An independent native-edition account for German records | Hosted extraction is explicitly a work in progress; glosses are German, so matching them directly to English-edition glosses needs care | Pilot it on a short list such as `platt/plat`, `bank`, and `clown`. Preserve it as a second source, not a replacement row. |
| Bokmålsordboka and Nynorskordboka | Modern Norwegian spelling, meanings, usage examples, and short etymologies; an official API and downloadable content exist | Covers standard entries, not all historical or dialect material; it is not a cognacy database | A practical independent source for Norwegian Bokmål. Preserve article IDs, retrieval date, and attribution. Check the current open-data terms before publishing extracted content. |
| SAOB | Historical Swedish entries, definitions, short etymologies, and dated usage citations | Swedish-only, historical scope; it excludes some proper names, technical terms, dialect-only words, and foreign words without Swedish inflection. Bulk reuse terms were not checked here. | Use as a targeted reference for difficult Swedish cases first, not as an assumed bulk input. |
| WOLD | Loanword/source-word/donor-language relations across edited language vocabularies | A curated loanword resource with vocabularies for 41 recipient languages, not a complete dictionary. Overlap with the project's five varieties was not confirmed in this pass. | Check actual language coverage and reuse terms; use it to test borrowing representation and selected cases, not to fill every `other` row. |
| Concepticon | Linking published concept lists through defined concept sets | A concept mapping is a meaning anchor, not proof that two dictionary senses are equivalent; its maintainers describe cross-language concept definition as difficult | Use it to define a bounded comparison sample and record mapping plus sense-selection decisions. |
| NorthEuraLex | A broad northern Eurasian wordlist with 1,016 concept slots, including all five project languages | Useful for a meaning-aligned coverage frame; its 107 varieties and 121,611 lexemes are not a complete dictionary, and a concept slot still needs sense selection in the project's own sources | Use its concepts to define a small, reproducible sample and compare coverage/forms. Preserve NorthEuraLex forms as a reference; resolve Linduistics' own entries and histories from its own sources. |
| IE-CoR | A focused cognacy reference for 170 tightly defined meanings, with expert-selected primary lexemes and cognate sets | It includes the five project languages, but it is intentionally not an exhaustive dictionary or all-known-cognates inventory. Its cognacy judgments model vertical inheritance; loan paths need to be represented separately. | Compare only the overlapping meanings and forms as a method check. Record disagreements and coverage gaps; do not import its judgments as Linduistics facts or treat its 170 meanings as a vocabulary-wide denominator. |
| Lexibank / IELex | Other reproducible lexical datasets with concept-linked forms and cognate coding | Each release has its own language coverage, scope, and decisions; none is Linduistics' own source work or automatically the right answer | Inspect a specific release only when it adds a comparison beyond NorthEuraLex or IE-CoR. Do not add a catalogue of datasets without a concrete question. |
| Glottolog | Language and variety identifiers and genealogical classifications | Language-level genealogy, not word-level origin; classifications can be revised | Link stable language identifiers and sourced family context if a page needs it. Keep the source and date. |
| WALS | Documented typological features | Feature data is sparse and does not prove genealogy or lexical relationships | Add only for a clear language-comparison question. It is not needed to repair lexical classifications. |
| CLDF | Interchange schemas for wordlists, cognate judgments, borrowings, and custom linked data | A format, not a data source or an epistemic guarantee; its standard wordlist tables model cognate judgments and borrowings as separate relations | Export the records that fit. Keep a project-specific internal model if it is clearer. The [CLDF terms](https://cldf.clld.org/v1.0/terms.html) define separate `CognateTable`, `CognatesetTable`, and `BorrowingTable` structures. |

The source review points to supplementation, not replacement. Wiktionary can remain central to the project's own source and transformation work. Other sources should be added when they provide a distinct piece of evidence that the current edition does not.

### A concrete cross-edition case: German *Bank*

A first check of the French-edition extraction already gives us a useful structural test. Its German `Bank` page has two separate noun records with separate sense IDs and separate `etymology_texts`: the “bench / bank of sand” record traces through Middle High German, Old High German, and Old Saxon to a Germanic root; the financial-institution record says it comes from Italian *banco* and lists related forms including English and Swedish *bank*. The first record also lists `Sandbank` among derived forms. The page exposes the corresponding raw Wiktextract JSON as well as the rendered French glosses.

This is evidence that the second-edition extract is worth testing against the project's known homograph and compound cases. It is **not yet evidence that it adds a claim missing from the current English-edition data**: both are Wiktionary editions, the rendered page is post-processed, and the project must compare exact records and raw fields. In particular, the two histories of German *Bank* should not be collapsed into one headword root, and a component or derived-form link must not automatically become a whole-word cognacy judgment.

## A useful dataset shape

Build two connected but distinct products from the same source work:

### 1. Candidate index for exploration

Preserve broad form and translation candidates for searching, sorting, and the quiz. Store why each candidate exists and keep its computed spelling, sound, and meaning observations. Labels such as “misleadingly similar” describe a queryable modern pattern. They do not settle lexical history.

### 2. Evidence-backed comparison slice

Create a bounded sample with a clear inclusion rule. NorthEuraLex is a plausible broad frame because its published concept list covers the five current project languages; use Concepticon mappings where appropriate. For a smaller cognacy-method comparison, IE-CoR has 170 tightly defined meanings and includes those five varieties. Neither supplies Linduistics' own source history or a complete vocabulary denominator. Identify one or more of the project's own source senses per concept and language, record missing or multiple matches, and compare external judgments as references rather than verdicts. The unit is a **concept slot in a defined sample**, not a pair mined from every dictionary collision. Report coverage and the denominator explicitly.

Use the current named cases as a separate mechanism test suite. Cases such as *fleece*, *ombudsman*, *bankman*, *sandbank*, *aften/afton*, and *væg/väg/vägg* test loans, deeper lineage, compounds, homographs, sense matching, and ambiguous source claims. They do not estimate rates.

This combination retains the fun and utility of finding surprising pairs while adding a small view that can support defensible comparisons. It avoids presenting a giant candidate pool as a sample of ordinary vocabulary.

## A practical sequence

1. **Correct the source manifest before altering rules.** Record source edition (`enwiktionary`, `frwiktionary`, `dewiktionary`, or another source), provider, dump date, extraction version, raw file hash, and license/attribution terms. Treat current `kaikki_sv`/`kaikki_da` names as language-slice names, not edition identifiers.
2. **Run a bounded cross-edition pilot.** Start with German *Bank* and other named cases, then compare English-edition records with the French-edition extract for five `other` candidates from each of the ten undirected language pairs. Include loans, compounds, homographs, and apparent cognates in the named cases. This is a coverage and extraction test, not a prevalence estimate. Track matching entry/sense coverage, new or conflicting etymology claims, and fields absent from one edition. French glosses need not be forced into English semantic matching; first see whether form, entry links, and etymology claims add value. Do not merge by spelling alone.
3. **Use independent dictionaries where they add a distinct account.** Test the German-edition extraction for German cases and the official Bokmål dictionary for the named Norwegian cases. Keep each source entry and claim distinct from English-Wiktionary-derived records.
4. **Build a small concept-aligned sample with two reference roles.** Use NorthEuraLex to check broad concept coverage and IE-CoR to compare the cognacy treatment on the smaller set of shared meanings. Confirm the actual language and concept overlap in the checked releases before choosing the sample. Map forms to the project's own entries and senses; record gaps and disagreements instead of silently adopting the external forms or labels.
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
- Kaikki's French-edition index lists all five target languages and their current sense counts; the raw-data page lists the French-edition dump and download size. Kaikki marks non-English extraction as work in progress: [French-edition index](https://kaikki.org/frwiktionary/index.html), [raw data downloads](https://kaikki.org/dictionary/rawdata.html), [Kaikki overview](https://kaikki.org/).
- A concrete French-edition extraction example with separate German `Bank` noun records, sense IDs, raw etymology text, and a `Sandbank` derived-form link: [German *Bank* in French Wiktionary](https://kaikki.org/frwiktionary/Allemand/meaning/B/Ba/Bank.html).
- Kaikki separately publishes German-edition raw data from a `dewiktionary` dump: [German raw data](https://kaikki.org/dewiktionary/rawdata.html), [Wiktextract README](https://github.com/tatuylonen/wiktextract/blob/master/README.md).
- Official Bokmålsordboka/Nynorskordboka API and data: [API documentation](https://ord.uib.no/ord_2_API.html), [open-data and copyright terms](https://ordbokene.no/about/open-data). The API page describes search and article lookup; the open-data page says dictionary content is downloadable under stated terms, including commercial use.
- SAOB scope and etymology material: [Swedish Academy overview](https://www.svenskaakademien.se/svenska-spraket/svenska-akademiens-ordbok-saob).
- Loan evidence: [WOLD overview](https://wold.clld.org/), [WOLD field definitions](https://wold.clld.org/terms).
- Meaning anchors: [Concepticon about concept lists and concept sets](https://concepticon.clld.org/about).
- Broad concept frame: [NorthEuraLex CLDF release and statistics](https://github.com/lexibank/northeuralex), [its language table, including English, German, Swedish, Danish, and Norwegian Bokmål](https://github.com/lexibank/northeuralex/blob/master/cldf/languages.csv).
- Cognacy reference: [IE-CoR overview and protocols](https://www.eva.mpg.de/de/linguistic-and-cultural-evolution/research/ie-cor/), [IE-CoR language table](https://github.com/lexibank/iecor/blob/v1.1/cldf/languages.csv), [IE-CoR cognate-set browser](https://iecor.clld.org/cognatesets).
- Other comparative reference: [Lexibank IELex dataset](https://lexibank.clld.org/contributions/dunnielex).
- Language identifiers and genealogy: [Glottolog languoids](https://glottolog.org/glottolog/glottologinformation).
- Language structure: [WALS features](https://wals.info/feature).
- Interchange format: [CLDF terms](https://cldf.clld.org/v1.0/terms.html).
