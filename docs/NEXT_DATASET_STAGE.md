# Next dataset stage

## Purpose

Build an exploratory, source-linked dataset about lexical relationships across the Germanic varieties already covered by Linduistics. The data pipeline is part of the project: we source, parse, compare, and revise the data ourselves.

The site is the first consumer of the dataset. A public release should also help another person inspect the sources, reproduce transformations, or reuse part of the data. We do not need complete language coverage or expert review of every row to make a useful release. We do need to show what each value means and where it came from.

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
- Wiktionary reuse terms: <https://en.wiktionary.org/wiki/Wiktionary:Copyrights>.
