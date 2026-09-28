# Next dataset stage

## Purpose

Keep building Linduistics' own source-and-transform pipeline for lexical relationships across the Germanic varieties already covered by the site. Sourcing and transforming the data is part of the project, not work to replace with a finished corpus. The aim is to make the results more useful and inspectable, and to learn what the data can support. A small public release that helps another person is a welcome outcome, not a research-program requirement.

The site is the first consumer. We do not need full language coverage or expert review of every row. We do need to show what each value means and where it came from. CLDF is acceptable as an export format if it makes the data easier to reuse; it does not need to become the internal model.

This project does not aim to replace Glottolog, Grambank, Wiktionary, or specialist dictionaries. We can link to their records, use them as inputs, and compare our results with them. The lexical data and transformations remain ours.

## Design rule

Store source records, linguistic claims, and computed results as different things.

- A **source record** is an entry, document, database row, or data release we read.
- A **claim** states a relationship or value and identifies its subject, object, scope, and evidence.
- A **computed result** records what a named pipeline version inferred from specified inputs.
- A **view** groups claims and results for a site feature. It does not replace the underlying data.

Do not treat an absent claim as evidence that the relationship does not exist. Record whether evidence is missing, not checked, disputed, or supports a claim.

## What the dataset describes

These are separate dimensions. Do not combine them into one language-pair or word-pair category.

### Languages and varieties

- **Genealogy:** a sourced classification of language varieties and their descent relationships. Preserve the classification source and version because classifications can differ or change.
- **Contact and area:** documented contact, borrowing, calquing, and shared regional features. Geography alone does not prove contact or diffusion.
- **Typology:** sourced values for defined features, such as word order or inflectional patterns. Keep the feature definition, value, source, and coverage with each value. A typological distance is a calculation over selected features, not a fact about ancestry.

Use stable internal IDs for varieties and keep crosswalks to outside identifiers such as ISO codes and Glottocodes. Do not use display names or two-letter site codes as entity identity.

### Lexical entries and relationships

Distinguish language-specific entries, senses, forms, morphemes, and reconstructed etyma. A spelling can have multiple entries and etymologies. A word can have more than one sense and more than one source claim.

Record these relationships independently where the evidence supports them:

- **Inheritance:** a word continued from an earlier form in the same language line.
- **Borrowing:** a directed relation from donor entry or language to recipient entry or language.
- **Calquing:** a word or expression formed by translating another language's components or pattern.
- **Derivation and compounds:** a word formed from identified components; component-level relations can be recorded separately.
- **Cognate-set membership:** entries linked through a supported ancestral form, with the scope of the judgment stated.
- **Distinct recorded origins:** separate source-supported histories. A missing shared root is not enough to assert this.

Keep meaning and form evidence separate from those historical relationships. Store translations and sense correspondences as their own links. Store spelling, pronunciation, and similarity scores as observations or computed values, not as proof of origin.

### Cognacy at more than one scale

The dataset should distinguish:

1. A **form candidate** selected because forms look or sound similar. This is a lead for inspection, not a cognacy judgment.
2. A **whole-entry cognacy judgment** supported by a shared inherited lexical history.
3. A **partial cognacy judgment** where identified components correspond but the whole words do not share the same history.
4. A **cognate set** connecting entries across languages to an ancestral form. Where available, record the proposed form and sound-correspondence evidence.

Keep the evidence basis and uncertainty beside the judgment. Do not use a semantic-similarity threshold as the definition of partial cognacy.

## Keep existing data useful

Keep the current comparison rows as generated candidates and analysis results. Do not silently turn them into historical facts. Preserve scores, candidate source, and pipeline version so a later transformation can be compared with the current one.

## What to do next

The source-level exporter reads the five local Kaikki/Wiktextract dumps, keeps each entry's raw etymology templates and arguments, and writes provisional normalized claims. The current run contains 710,110 source records, 1,138,433 template instances, and 1,149,640 normalized claims. The extra claims come from templates that name more than one source or relationship step. Twelve focused tests pass. A check of the full export found no duplicate source-entry keys.

The most common normalized claims are `formed_from` (425,262), `derived_from` (163,683), `cognate_mention` (117,612), `borrowed_from` (99,626), `inherited_from` (87,404), and `compound_of` (72,456). This run also separates `doublet_of` (20,254), `confix_of` (10,539), and `surface_analysis` (8,840). These count source-template claims, not unique word pairs, distinct historical relationships, or shares of a vocabulary. A `cognate_mention` is a claim found in an entry, not a reviewed cognate-set judgment. Wiktionary's `der` template is a broad fallback for cases where borrowing or inheritance does not apply; it is not the same as a morphology-only “derived word” label. The extractor marks source claims with an explicit `<unc>` qualifier as uncertain and keeps the full template arguments beside every claim. It reads top-level steps; nested inline etymologies remain in the raw arguments and are not expanded yet.

The manifest records hashes and local modification times for the input files. It does not pin a Wiktionary revision or prove when the files were downloaded. The raw dumps and generated JSONL are local, ignored data files; this repository contains the command and tests needed to recreate the export when those inputs are available.

An initial local audit slice contains 22 source entries matching *fleece*, *clown*, *ombudsman*, *bankman*, *sandbank*, and *gift* across the five covered varieties. It is generated from the full export at `pipeline/data/etymology_audit_slice.jsonl` and is ignored by Git because it contains source text. The slice confirms that separate Swedish *gift* entries survive extraction, Swedish *fleece* and *clown* state direct English borrowing, *ombudsman* preserves both Swedish components and the English borrowing direction, and *sandbank*/*bankman* preserve component claims. `pipeline/src/build_source_pair_audit.py` now joins these source records to six live Swedish–English rows by exact form and keeps every source entry per side. It writes `pipeline/data/source_pair_audit.jsonl` and a manifest; both are local generated data and ignored by Git.

The slice also shows why a normalized claim cannot stand alone: a source's broad `der` template can produce a `derived_from` convenience label even when its accompanying prose describes a historical path. Keep the raw template name, arguments, and prose as the evidence; review the normalization before treating that label as a precise relationship. The exact-form join also exposes missing identity: one database row can correspond to multiple source entries, while the stored comparison row retains only one selected part of speech and sense match.

### First source-to-current-row check

I queried the live database through the read-only pairs API and matched the returned Swedish–English rows against the retained source entries. These six examples are diagnostic, not a statistical sample. “Current relation” is the database's three-state origin field; it does not encode every path in the source history.

| Form | Current comparison row | Source evidence retained in the dump | What this reveals |
|---|---|---|---|
| *fleece* | `other` / `unknown`; Swedish root empty, English root Proto-West Germanic `*fleus`. | Swedish entry says it was borrowed from English; English entry traces inheritance through Middle English and Old English to Proto-West Germanic. | The current row misses a clear borrowing path because the recipient's root is empty. It should not be called unrelated. |
| *clown* | `other` / `unknown`; Swedish root empty, English root Proto-Indo-European `*gel-`. | Swedish entry says borrowed from English. The English entry presents several possible histories, including a tentative deeper connection. | The direct borrowing is clearer than the English word's deeper ancestry. A single root field obscures that difference in certainty and scope. |
| *ombudsman* | `true_cognate` / `cognate`; both roots and the shared root are Old Norse `umboðsmaðr`. | Swedish entry gives *ombud + man* and an Old Norse source; English entry says it was borrowed from Swedish and also names that Old Norse form. | The cognate relation captures shared older origin, but the row does not also represent the direct English borrowing from Swedish. |
| *bankman* | `false_friend` / `unknown`; English side is tagged `name`, with no root or etymology text. The source export has no matching English entry. | Swedish entry analyzes *bank + man*. | This candidate may be a part-of-speech/entry mismatch before it is a false-friend judgment. Headword equality alone is not enough. |
| *sandbank* | `other` / `unknown`; both roots are empty. | Both entries show *sand + bank*; the English entry compares forms in Dutch, German, and Swedish. | Matching compounds and a source's comparison list are useful leads, but do not by themselves establish component cognacy or the whole-word history. |
| *gift* | `false_friend` / `cognate`; the selected noun row gives both sides and the shared root as Proto-Germanic `*giftiz`. | The Swedish poison noun is traced through German; English *gift* is traced through older English forms and Old Norse to the same Proto-Germanic root. Separate Swedish *gift* entries have distinct meanings and etymologies in the source export. | The false-friend candidate and cognate-origin relation can both be true. The current one-row-per-spelling comparison still collapses the homographic entries. |

The pairs API returned a healthy database connection during this check. The source side has more entries than the comparison row for *fleece* (two English entries), *clown* (two), and *gift* (five Swedish and two English entries); the database still stores one row per headword pair. Exact spelling locates the row, but cannot establish which source sense or etymology that row represents. Keep this audit as a regression guide; do not promote these six rows into bulk correction rules.

Rebuild the local joined slice after regenerating the source export and starting the local API/database:

```powershell
python pipeline/src/build_source_pair_audit.py --force
```

The script is intentionally an audit aid, not a bulk import. Its output retains the whole source records and can contain Wiktionary text, so it stays in the ignored local data directory.

Do the next work in this order:

1. **Check the remaining gaps.** Review unmapped templates that may express origin status or uncertainty, starting with `unk` and `unc`. Keep formatting and metadata templates out of the relationship taxonomy. Inspect the regression examples below, plus homographs such as Swedish *gift*. Confirm that source pointers lead to the right language section. Fix extraction errors before using these claims downstream.
2. **Keep source statements intact.** Preserve the original template name, arguments, and prose alongside every normalized claim. Treat the normalized relation names as conveniences for analysis; do not turn them into facts stronger than the source statement. Record the dump identity, file hash, retrieval date, and reuse terms with each release.
3. **Finish one end-to-end slice.** The six-form inspection join now connects source entries to current rows by language and spelling. Add explicit entry/sense identity where the data allows it, and record when the comparison row cannot be tied to one source etymology. Include borrowing, compounds, a homograph, an uncertain etymology, and a possible cognate. Keep form similarity, meaning links, and historical claims separate.
4. **Compare before replacing.** Run that slice beside the current classifications. Add checks for concrete failures, and note where the source is silent or ambiguous. Do not regenerate the full dataset from a new rule until the slice behaves as expected.
5. **Choose the smallest useful output.** First make the source-linked records useful to the site and easy to inspect. Then export the stable subset to CLDF if a supported module fits. Keep project-specific evidence or uncertainty fields in documented extension tables where needed.

The current API and comparison table are consumers of this work, not the definition of the data model. Keep the initial scope to the existing five varieties. Add another language or a new source only when it helps answer a concrete question or reveals a gap in the extraction.

### This stage is complete when

- The extractor's coverage and unmapped-template counts are known and reviewed.
- The regression examples retain distinct source entries, source wording, and relationship direction where the source gives one.
- At least one end-to-end slice can explain a result from source record through transformation to site-facing output.
- The old bulk classifications remain intact until the new slice has been checked.
- A reproducible command, source manifest, tests, and short limitations note let someone else rerun the slice.

### Keep out of scope for now

- Replacing Wiktionary-derived data with a ready-made corpus.
- Claiming expert or complete historical classifications.
- Inferring unrelated origins from missing root data.
- Rebuilding every comparison row before the extraction and evidence links are checked.
- Building a general-purpose ontology or a full CLDF release before the project has a stable, useful slice.

The initial audit exposed cases that should become regression examples:

| Example | Current data behavior | What the pipeline should learn to represent | Source entry pointers |
|---|---|---|---|
| Swedish–English *fleece* | Category `other`; Swedish root is empty; Swedish etymology text says it was borrowed from English; English root is Proto-West Germanic. | A Swedish borrowing path and an English inheritance path, with no claim that the English root is the Swedish root. | [Swedish](https://en.wiktionary.org/wiki/fleece#Swedish), [English](https://en.wiktionary.org/wiki/fleece#English) |
| Swedish–English *clown* | Category `other`; Swedish etymology text says borrowed from English; English entry includes a tentative deeper connection. | The direct loan and the uncertainty of the English etymology as separate claims. | [Swedish](https://en.wiktionary.org/wiki/clown#Swedish), [English](https://en.wiktionary.org/wiki/clown#English) |
| Swedish–English *ombudsman* | Category `true_cognate`; both rows have the Old Norse root; English etymology text says borrowed from Swedish. | A directed borrowing path and a deeper shared origin without collapsing one into the other. | [Swedish](https://en.wiktionary.org/wiki/ombudsman#Swedish), [English](https://en.wiktionary.org/wiki/ombudsman#English) |
| Swedish–English *bankman* | Category `false_friend`; origin is unknown; Swedish etymology text gives `bank + man`. | A whole-word misleading-similarity candidate plus separately missing component relationships. | [Swedish](https://en.wiktionary.org/wiki/bankman#Swedish), [English](https://en.wiktionary.org/wiki/bankman#English) |
| Swedish–English *sandbank* | Category `other`; root fields are empty; both entries include compound text. | Compound components and their cross-language evidence, without inferring cognacy from matching spelling. | [Swedish](https://sv.wiktionary.org/wiki/sandbank), [English](https://en.wiktionary.org/wiki/sandbank) |
| Swedish–English *halva* | Category `other` despite identical forms and a semantic score of 1; roots are missing. | A useful form-and-meaning match whose historical path still needs evidence. | [Swedish](https://sv.wiktionary.org/wiki/halva), [English](https://en.wiktionary.org/wiki/halva#English) |
| Swedish–English *stark* | Category `partial_cognate`; roots match and the semantic score is about 0.61. | A whole-entry history plus a sense-level meaning relation; the current label is driven by a score cutoff. | [Swedish](https://en.wiktionary.org/wiki/stark#Swedish), [English](https://en.wiktionary.org/wiki/stark#English) |
| Swedish *båda*–English *portend* | Category `translation_pair`; semantic score is raised to at least 0.95 for mined translation links. | Translation-source provenance, distinct from model-computed semantic similarity. | [Swedish](https://en.wiktionary.org/wiki/b%C3%A5da#Swedish), [English](https://en.wiktionary.org/wiki/portend#English) |

This is a diagnostic set, not a statistical sample or a claim of expert adjudication. Keep it small, cite the source entry for each claim, and add examples when a real parser or modeling failure appears.

These links point to current Wiktionary pages. The comparison rows came from the local extracted dataset, which does not currently preserve the source dump revision for each entry. The links help inspection but do not make this audit fully reproducible yet.

## Work in stages

### 1. Define the project scope

Write down the varieties covered, the kinds of words included, and the questions the site should answer. Keep the initial scope to the current Germanic data. Do not claim a percentage of a language's vocabulary from the existing candidate-pair table.

### 2. Preserve source and transformation provenance

For each imported source, record its name, URL or stable identifier, release or revision where available, access date, license, and extraction method. Preserve source-specific entry identity and original etymology structure when available. For each computed value, record the pipeline step and version that produced it.

Check license terms before redistributing source text or large extracts. Wiktionary text has attribution and share-alike requirements; other sources may have different terms. Keep source links even when the release cannot include the source text.

### 3. Turn audit examples into pipeline checks

Use the examples above to test source parsing and transformations. Add a check when a case reveals a concrete rule or a known limitation. Keep expected results tied to cited source claims; do not mark a case correct merely because the current classifier agrees with itself.

### 4. Improve the data model only where examples require it

First represent multiple entries and senses for a spelling, source claims with direction, and component-level word formation. Avoid a broad ontology or a full language graph before the dataset has examples that need those structures.

### 5. Publish a small, reproducible release

Document the coverage, source set, transformations, limitations, and license. Publish machine-readable tables with stable IDs and a versioned changelog. Export to CLDF where its Wordlist, StructureDataset, Dictionary, or classification components fit. Use project-specific components for data CLDF does not describe directly.

CLDF is an exchange format, not the project model or a replacement corpus. Its modules are designed for cross-linguistic reuse and include forms, cognate sets, borrowings, structural features, and classification trees: <https://cldf.clld.org/>.

## First release should be able to answer

- Which source and source entry support this claim?
- Is this a form-based candidate, a translation link, a cognacy judgment, or a borrowing claim?
- Is the relationship whole-word or component-level?
- Which sense or entry does it apply to?
- Was the value copied from a source, transformed, inferred, or manually corrected?
- What is unknown or disputed?
- Which pipeline and source versions produced the release?

## Do not claim yet

- That current pair counts measure the share of a language's vocabulary that is cognate with another language.
- That a word is unrelated because one or both root fields are empty.
- That a computed similarity score proves cognacy, translation, or separate origin.
- That the dataset covers all language varieties, senses, or historical stages.

## References to build on

- CLDF: <https://cldf.clld.org/> — reusable formats for cross-linguistic wordlists, structures, dictionaries, cognate sets, borrowings, and classifications.
- Glottolog: <https://glottolog.org/> — sourced language-variety identifiers and genealogical classifications.
- Grambank: <https://grambank.clld.org/> — sourced typological feature data; check coverage and license for each release.
- Wiktionary etymology template types: <https://en.wiktionary.org/wiki/Module:etymology/templates>.
- Wiktionary `etymon` markers, multiple steps, and uncertainty: <https://en.wiktionary.org/wiki/Template:etymon>.
- Wiktionary `der` is a broad catch-all: <https://en.wiktionary.org/wiki/Template:derived/documentation>.
- Wiktionary `cog` and `noncog` source-claim semantics: <https://en.wiktionary.org/wiki/Template:cognate/documentation>, <https://en.wiktionary.org/wiki/Template:noncognate/documentation>.
- Wiktionary doublets and morphology/surface analysis: <https://en.wiktionary.org/wiki/Template:doublet>, <https://en.wiktionary.org/wiki/Template:confix>, <https://en.wiktionary.org/wiki/Template:surface_analysis>.
- Wiktionary reuse terms: <https://en.wiktionary.org/wiki/Wiktionary:Copyrights>.
