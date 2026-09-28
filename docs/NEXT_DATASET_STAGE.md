# Next dataset stage

## Purpose

Keep building Linduistics' own source-and-transform pipeline for lexical relationships across the Germanic varieties already covered by the site. Sourcing and transforming the data is part of the project, not work to replace with a finished corpus. The aim is to make the results more useful and inspectable, and to learn what the data can support. A small public release that helps another person is a welcome outcome, not a research-program requirement.

The site is the first consumer. We do not need full language coverage or expert review of every row. We do need to show what each value means and where it came from. CLDF is acceptable as an export format if it makes the data easier to reuse; it does not need to become the internal model.

This project does not aim to replace Glottolog, Grambank, Wiktionary, or specialist dictionaries. We can link to their records, use them as inputs, and compare our results with them. The lexical data and transformations remain ours.

## The next milestone

Keep the work centered on the part that makes this project fun: taking source data apart, deciding what it can support, and building a transformation that someone else can inspect and rerun. A useful public dataset for one or two people would be a good result. It does not need to become a research project or a general-purpose linguistic database.

The next milestone is a small, end-to-end slice where a comparison can be traced from the selected source senses, through the Wiktionary claims and our transformation, to the result shown by the site. Fix source identity before changing the bulk labels: the current parser merges homographs and etymologies, so its root or part-of-speech fields can belong to a different sense from the one being compared.

### Work order

1. **Keep source identity through parsing.** Preserve source-entry ID, etymology number, source-sense ID, part of speech, root, and etymology text on each sense. Keep distinct homographic entries. When a comparison sense cannot be linked to one source sense, leave that link unresolved instead of choosing a headword-level fallback.
2. **Use the selected senses in comparisons.** Populate comparison part of speech and etymology evidence from the matched active senses. Do not use a merged headword's scalar root to classify a comparison. Add small regression cases for the identity failures already found.
3. **Represent what sources say before deciding what it means.** Keep the source's claim, direction, components, wording, and uncertainty separate from our normalized interpretation and any computed similarity. Allow one word pair to have several paths, such as direct borrowing plus a deeper shared origin. Keep misleading similarity queryable even when origin is unknown.
4. **Compare a narrow rerun with today's output.** Use the existing five varieties and the seeded audit cases. Review each changed result against the linked source sense. Keep the old labels available for comparison; do not apply broad relabeling rules based on this diagnostic sample.
5. **Make one useful result inspectable.** Let a person follow a result back to its source entry and see what the pipeline did. If that slice is worth sharing, publish a small versioned export with its source manifest, rerun command, limits, and license notes. Use CLDF for the parts it already describes well; keep any extra project fields in a small documented extension.

The milestone is complete when the slice reruns from recorded inputs, its source-to-result links are inspectable, known identity failures have regression checks, and ambiguous cases remain marked as unresolved. This is enough to learn whether the approach is useful before applying it to the rest of the data.

CLDF is just an output format here. Do not build around it in advance. Export to it when it makes the slice easier for another person to read or reuse.

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

The source-level exporter reads the five local Kaikki/Wiktextract dumps, keeps each entry's raw etymology templates and arguments, and writes normalized claims. Each source record also retains compact source sense IDs, glosses, raw glosses, and tags so comparison senses can be linked back without copying examples or translations. The current run contains 710,110 source records, 978,265 source-sense records, 1,138,433 template instances, and 1,148,705 claim records. The extra claims come from templates that name more than one source or relationship step. The five source-dump hashes match the previous run, so the change below measures normalization coverage rather than input drift. The full pipeline test suite passes (100 tests).

The most common normalized relations are `formed_from` (425,262), `derived_from` (163,876), `cognate_mention` (117,693), `borrowed_from` (99,803), `inherited_from` (87,466), and `compound_of` (72,456). This run also records `doublet_of` (20,254), `confix_of` (10,539), and `surface_analysis` (9,638). These count normalized source-claim records, not unique word pairs, distinct historical relationships, or shares of a vocabulary. A `cognate_mention` is a source claim, not a reviewed cognate-set judgment. Wiktionary's `der` template is a broad fallback for cases where borrowing or inheritance does not apply; it is not the same as a morphology-only “derived word” label. The extractor marks source claims with an explicit `<unc>` qualifier as uncertain and keeps the full template arguments beside every claim. It reads top-level steps; nested inline etymologies remain in the raw arguments and are not expanded yet.

A normalization audit found plain-language source-template names that carried relationship arguments but had no normalized relation. The exporter now maps verified forms for derived and inherited links, cognate and noncognate mentions, borrowing variants, partial calques, semantic loans, pseudo-loans, piecewise doublets, surface analysis, and back-formation. It also records 1,506 `named_after` relations and 2,379 `coined_by` relations with named entities. Three named-after claims have no linked entity. The five source dumps now yield 7,815 more normalized relation records than the previous export. These source claims remain distinct from project judgments about lexical history.

The exporter records 2,379 `coinage` and 1,561 `onomatopoeic` formation facts separately from relationship counts. Coinage facts can also carry a `coined_by` relation; these dimensions overlap. The `onom` and `onomatopoeic` templates do not name a related word, so they are not projected as edges. The `named-after/list` template is a display helper and remains in raw templates without creating a duplicate claim. Wiktionary's documentation defines these templates as source assertions about eponyms, coiners, and onomatopoeic formation: [named after](https://en.wiktionary.org/wiki/Template:named_after), [coinage](https://en.wiktionary.org/wiki/Template:coinage), [onomatopoeic and related etymology templates](https://en.wiktionary.org/wiki/Module:etymology/templates/documentation).

The compact [source-facts slice](SOURCE_FACTS_SLICE.md) exports 5,446 unique fact IDs to local ignored JSONL. All rows have source URLs. Its language counts are English 4,642, German 391, Swedish 308, Danish 69, and Norwegian Bokmål 36. These are extracted records, not occurrence rates or independent confirmation. The slice does not include full source prose.

The refreshed 270-row audit projection now uses edge schema version 5 and contains 2,346 normalized edges backed by 2,401 source-template records, up from 2,341 edges and 2,396 evidence records. Five new sample edges are explicit unadapted-borrowing claims for the sampled Orvieto comparisons. The projection keeps entity targets in its edge key so distinct people cannot merge. This small, stratified sample does not measure how often these source templates occur across the languages. The updated export and audit files stay in ignored `pipeline/data/`; the live database is unchanged.

A pass over all 710,110 source records found 11,758 case-folded language/headword/POS groups with multiple explicit etymology numbers, plus 3,305 groups with multiple source records but no distinct numbered etymologies. Across 635,677 case-folded language/headword groups, 47,879 contain more than one part of speech. This confirms that a scalar root and part of speech on a headword cannot safely stand in for entry-level evidence.

The parser now uses the same source-entry key function as the etymology exporter. Each parsed sense keeps its source-entry key, source-sense ID, etymology number, part of speech, root, and etymology text. The lemma aggregation preserves same-gloss senses from distinct source entries and leaves its legacy root/text fields blank when merged entries disagree. The comparison builder uses the selected sense pair for comparison part of speech and etymology fields. If multiple same-POS source senses have the same normalized gloss but different identities, it withholds the selected entry/sense ID; conflicting roots and text stay blank. The source-pair audit uses exact IDs when present and reports unresolved identity instead of treating a gloss tie as a unique match.

I rebuilt all five lemma Parquet files into the ignored local directory `pipeline/data/identity-rebuild/`, leaving the existing data and database untouched. The rebuild contains 720,407 lemma rows and 1,124,436 parsed senses. Every parsed sense has both a source-entry key and source-sense ID. The Swedish *gift* entries produce three distinct senses: the noun “poison,” adjective “married,” and a separate noun “gift, present”; their generated entry keys match the source exporter exactly.

I then rebuilt the comparison Parquet from those lemmas and the existing Wiktionary translation dump. It contains 403,952 directed candidate rows, compared with 403,694 in the existing comparison file. On 392,200 new rows, both selected senses link to exact source entry and sense IDs. The other 11,752 rows are explicitly marked as ambiguous because multiple same-POS source senses have the same normalized gloss. No row-level part of speech disagrees with its selected sense. The rebuild reports 20,284 rows with a confirmed shared root and 383,668 with unknown origin; the previous file had 19,938 `cognate`, 354,936 `unknown`, and 28,820 `false_cognate` rows. Unequal roots no longer create a separate-origin result.

These are candidate-pair counts, not shares of any language's vocabulary. The comparison builder also reran semantic matching, and its model revision is not pinned, so score-driven category changes cannot be attributed only to the source-identity fix. The full pipeline test suite passes (71 tests). The generated Parquets remain ignored local artifacts; the comparison rebuild has not been loaded into the database, and the database migration remains unapplied.

### Spot checks against the rebuilt candidates

The source audit can now read comparison rows from a Parquet file, so the rebuilt candidate can be checked without loading it into the database. The initial spot checks show why the data needs separate source claims, computed matches, and origin judgments:

| Case | Identity-aware candidate result | What it says about the data |
|---|---|---|
| Swedish–English *fleece* and *clown* | Each selected Swedish sense links to a source entry with a direct English borrowing claim. The root relation remains `unknown`. | A direct loan can be clear even when the scalar shared-root test cannot classify the pair. Keep borrowing as its own directed relation. |
| Swedish–English *ombudsman* | The selected senses share an Old Norse root, and the English source entry also has a direct borrowing claim from Swedish. | Shared deeper origin and a direct loan can both describe this pair. |
| Swedish–Danish *greve* | The selected entries have different Proto-West Germanic root spellings. A Swedish source entry explicitly mentions Danish *greve* as a cognate, linked to the active sense. | A root-string mismatch is not enough to reject a source-supported cognate claim. Preserve the claim and its source rather than silently normalizing the roots. |
| Swedish–Danish *universitet* | The selected roots are recorded as Latin *universitas* and *ūniversitās*. The current exact-root check reports `unknown`. | These spellings may represent the same Latin form with different vowel-length notation. Resolve such cases from the source paths or an explicit normalization rule, not by stripping all diacritics globally. |
| Swedish–Norwegian *axel–akse* | The selected Swedish “axis” sense links to its own etymology entry and has root Old Norse *ǫxull*. It no longer receives the Proto-Germanic root from the separate “shoulder” etymology. The pair remains `unknown`. | Entry identity fixes the wrong-root attachment; it does not by itself prove or disprove a cognate relationship. |
| Swedish–English *sandbank* | The English cognate mention links to the active English sense. Swedish has two same-POS source senses with the same normalized gloss, so its exact source identity and conflicting root evidence remain unresolved. | Exact source metadata can expose ambiguity instead of hiding it behind one preferred homograph. |
| Swedish–English *gift* | The selected comparison is Swedish adjective “married” versus English verb “to give as a gift,” not the noun–noun senses “poison” and “present.” | A surface candidate can select a cross-part-of-speech sense pair. Keep the selected senses visible and do not read this row as a noun–noun comparison. |
| Swedish–English *bankman* | The candidate compares a Swedish noun with an English name entry; no English comparison sense links to a retained source sense. | Some apparent false-friend cases are entry/POS mismatches or missing source coverage. Keep their origin unknown until the compared entries are clear. |
| Swedish–Danish *leja–leje* | The pair has no row in the rebuilt candidate file. | This is a candidate-retrieval gap, not a classification result. A taxonomy change cannot recover a pair the candidate generator never emits. |

These are diagnostic examples, not adjudicated labels or vocabulary statistics. The next useful change is to carry source claims as independent, queryable relations beside candidate similarity and any project judgment. That will let the site show, for example, a direct borrowing claim without forcing it into the single shared-root field.

### Source cognate-claim coverage

`pipeline/src/audit_source_cognate_coverage.py` counts explicit Wiktionary `cognate_mention` claims and checks whether each claim reaches a rebuilt comparison candidate. A claim is counted once per source-entry key, template index, target language, and target form. “Active source-entry candidate” means the claiming entry is the selected active source entry in a comparison for the named target form. “Both active sense IDs” further requires the target side of that candidate to link to one exact source sense.

| Language pair | Source claims | Active source-entry candidate | Both active sense IDs |
|---|---:|---:|---:|
| Swedish–Danish | 3,451 | 1,128 | 1,098 |
| Swedish–Norwegian Bokmål | 1,847 | 664 | 653 |
| German–English | 9,648 | 1,262 | 1,236 |

These are source-claim and candidate-coverage counts. A Wiktionary mention is evidence to inspect, not a reviewed judgment. A claim that does not reach a candidate may reflect candidate retrieval, a form or sense mismatch, or an incomplete source link; it does not show that the claim is false. This audit gives us a concrete next target: keep source claims queryable even when no current comparison row exists.

The script also checks the residual `other` set for a claim attached to an exact active source entry that names the counterpart language and the compared form. It finds such a claim on 636 of 9,409 Swedish–Danish `other` candidates, 504 of 10,039 Swedish–Norwegian candidates, and 2,785 of 11,769 German–English candidates. The claim types overlap:

| Pair | `other` candidates | With a pair-specific claim | Claim types found |
|---|---:|---:|---|
| Swedish–Danish | 9,409 | 636 | 561 cognate mentions; 47 `borrowed_from`; 25 `derived_from`; 3 noncognate mentions; 2 calque claims |
| Swedish–Norwegian Bokmål | 10,039 | 504 | 476 cognate mentions; 16 `borrowed_from`; 14 `derived_from` |
| German–English | 11,769 | 2,785 | 2,143 `borrowed_from`; 440 cognate mentions; 199 `derived_from`; 7 calque claims; 4 noncognate mentions; 2 semantic-loan claims; 1 influence claim |

This is a strict source-to-candidate link, not an adjudication. A source entry can have several claims, and a claim may not tell us the full relationship between the selected forms. The remaining `other` candidates may have claims that name another etymon, use another spelling, lack a target-language link, or have no extracted claim. These counts identify where the source already makes a pair-specific assertion; they do not define the entire residual bucket.

The manifest records hashes and local modification times for the input files. It does not pin a Wiktionary revision or prove when the files were downloaded. The raw dumps and generated JSONL are local, ignored data files; this repository contains the command and tests needed to recreate the export when those inputs are available.

An initial local audit slice contains 27 source entries matching *fleece*, *clown*, *ombudsman*, *bankman*, *sandbank*, and *gift* across the five covered varieties. It is generated from the full export at `pipeline/data/etymology_audit_slice.jsonl` and is ignored by Git because it contains source text. The slice confirms that separate Swedish *gift* entries survive extraction, Swedish *fleece* and *clown* state direct English borrowing, *ombudsman* preserves both Swedish components and the English borrowing direction, and *sandbank*/*bankman* preserve component claims. `pipeline/src/build_source_pair_audit.py` joins these source records to live comparison rows, preferring exact language and spelling and using a clearly marked casefold fallback when needed. It keeps every matching source entry per side. The six-row initial audit is written to `pipeline/data/source_pair_audit.jsonl`; generated files are ignored by Git.

The slice also shows why a normalized claim cannot stand alone: a source's broad `der` template can produce a `derived_from` convenience label even when its accompanying prose describes a historical path. Keep the raw template name, arguments, and prose as the evidence; review the normalization before treating that label as a precise relationship. The form-level join also exposes missing identity: one database row can correspond to multiple source entries, while the stored comparison row retains only one selected part of speech and sense match.

### First source-to-current-row check

I queried the live database through the read-only pairs API and matched the returned Swedish–English rows against the retained source entries. These six examples are diagnostic, not a statistical sample. “Current relation” is the database's three-state origin field; it does not encode every path in the source history.

| Form | Current comparison row | Source evidence retained in the dump | What this reveals |
|---|---|---|---|
| *fleece* | `other` / `unknown`; Swedish root empty, English root Proto-West Germanic `*fleus`. | Swedish entry says it was borrowed from English; English entry traces inheritance through Middle English and Old English to Proto-West Germanic. | The current row misses a clear borrowing path because the recipient's root is empty. It should not be called unrelated. |
| *clown* | `other` / `unknown`; Swedish root empty, English root Proto-Indo-European `*gel-`. | Swedish entry says borrowed from English. The English entry presents several possible histories, including a tentative deeper connection. | The direct borrowing is clearer than the English word's deeper ancestry. A single root field obscures that difference in certainty and scope. |
| *ombudsman* | `true_cognate` / `cognate`; both roots and the shared root are Old Norse `umboðsmaðr`. | Swedish entry gives *ombud + man* and an Old Norse source; English entry says it was borrowed from Swedish and also names that Old Norse form. | The cognate relation captures shared older origin, but the row does not also represent the direct English borrowing from Swedish. |
| *bankman* | `false_friend` / `unknown`; English side is tagged `name`, with no root or etymology text. The source export has no matching English entry. | Swedish entry analyzes *bank + man*. | This candidate may be a part-of-speech/entry mismatch before it is a false-friend judgment. Headword equality alone is not enough. |
| *sandbank* | `other` / `unknown`; both roots are empty. | Both entries show *sand + bank*. The English entry has an explicit `cog` template naming Swedish *sandbank*. | The source explicitly marks the Swedish entry as cognate, but the current classifier does not carry that source claim into the pair row. It still needs sense/entry review before promotion: the Swedish database row can point to multiple source senses, and a dictionary claim is evidence with provenance, not automatic adjudication. |
| *gift* | `false_friend` / `cognate`; the selected noun row gives both sides and the shared root as Proto-Germanic `*giftiz`. | The Swedish poison noun is traced through German; English *gift* is traced through older English forms and Old Norse to the same Proto-Germanic root. Separate Swedish *gift* entries have distinct meanings and etymologies in the source export. | The false-friend candidate and cognate-origin relation can both be true. The current one-row-per-spelling comparison still collapses the homographic entries. |

The pairs API returned a healthy database connection during this check. The source side has more entries than the comparison row for *fleece* (two English entries), *clown* (two), and *gift* (five Swedish and two English entries); the database still stores one row per headword pair. Form matching cannot establish which source sense or etymology that row represents. Keep this audit as a regression guide; do not promote these six rows into bulk correction rules.

### Seeded category sample

To look beyond known examples, I sampled the five current categories from three directed language pairs. The expanded sample used seed `20261001`, drew ten rows from each named category and fifty rows from `other` in each pair, and selected random offsets within the API's score-ordered results. It contains 270 rows: 30 from each named category and 150 from `other`. The local output and manifests retain pair IDs, offsets, category totals, source match method, and source dump manifest hash. This is a diagnostic sample, not a representative sample; it does not estimate error rates or vocabulary shares.

| Pair | `true_cognate` | `partial_cognate` | `false_friend` | `translation_pair` | `other` | Current `true_cognate` share | `other` share |
|---|---:|---:|---:|---:|---:|---:|---:|
| Swedish–Danish | 1,460 | 72 | 1,416 | 7,406 | 9,520 | 7.3% | 47.9% |
| Swedish–Norwegian Bokmål | 1,010 | 44 | 1,523 | 6,707 | 10,078 | 5.2% | 52.1% |
| German–English | 891 | 106 | 3,022 | 10,160 | 11,719 | 3.4% | 45.3% |

The table contains current directed-row counts from the database, not coverage of each language's vocabulary. In the 150 sampled `other` rows, 139 contain at least one normalized source relationship claim. The current origin field is `unknown` in 136 and `false_cognate` in 14. Matching source entries were available on both sides for 106 rows, on one side for 33, and on neither side for 11. “No source entry” means this extraction found no matching entry with etymology data; it does not mean Wiktionary lacks a word entry.

A full read-only census of the current database found 28,820 directed rows labeled `false_cognate` across the five varieties. Every row has two parseable root strings from the same recorded ancestral language, and every pair of strings differs; none is missing a root or has identical roots. The dataset stores both comparison directions, so these rows represent about 14,410 distinct comparisons. This is the output of the old root-mismatch rule, not independent evidence that the origins are separate. Of those rows, 3,530 are also `false_friend` candidates based on form and meaning similarity. The classifier now leaves unequal roots as `unknown`; migration `db/migrations/009_stop_inferring_false_cognates_from_root_mismatch.sql` is prepared to update the stored database. The migration has not yet been applied.

I also sampled 30 rows with that old relation value: ten each from Swedish–Danish, Swedish–Norwegian Bokmål, and German–English, using seed `20260929`. Both language sides had matching source entries in all 30 rows. Two rows had an explicit source cognate mention, but neither mention supports the selected comparison as-is. The Swedish *sen*–Norwegian *siden* row compares Swedish adjective *sen* “late” with Norwegian adverb *siden* “afterwards, later”; the source mention names *sen* without identifying which of its adjective and adverb entries it means. German *Barsch*–English *barse* compares the German adjective “harsh” with the English slang noun “perineum”; the claim's English source entry matches the fish sense, not the selected slang sense. The audit output now distinguishes same-form entry candidates from entries linked to the active comparison sense, and records whether each claim's source entry links to that sense. Across the expanded 270-row audit there are 79 cross-language evidence records with 121 source-claim references; 18 claim references come from entries that do not link by exact gloss to the active comparison sense. These are review flags, not automatic rejections. The sample is a diagnostic, not an estimate of how many labels are wrong.

Across all 270 rows, there are 2,178 comparison senses. The audit linked 1,626 to source senses by exact gloss, excluded 438 for part-of-speech mismatch, and left 114 unmatched. It links comparison senses to source sense IDs only when their part of speech matches and their glosses are equal after Unicode NFC normalization, case-folding, and whitespace normalization. It does not guess through paraphrase. This is an identity crosswalk, not independent linguistic confirmation: both data layers come from Wiktionary. It reduces obvious homograph mixing but does not disambiguate multiple same-POS etymologies by itself.

In 47 of the 270 sampled rows, at least one active matched sense has a different part of speech from the row's top-level `pos_a` or `pos_b`: 14 mismatches on side A and 35 on side B, with two rows mismatching on both. The mismatches appear in all five display categories. The active sense pair is what the similarity score describes, so row-level part of speech must come from that pair. This also means etymological roots must follow the active source sense rather than the merged headword.

Within `other`, the matcher found 11 rows with a direct borrowing claim, six with an explicit source cognate mention, five with a shared borrowing-source claim, and three with a shared inherited-form claim. These overlap; their union is 24 rows. Eight direct borrowing rows have a matched donor entry; three do not. Five cognate-mention rows link to a target source entry; one does not. Entry-level claims are leads, not confirmation that the compared senses share a history. The sample shows that `other` mixes distinct source paths; it does not establish how common those paths are in the full dataset.

Several rows expose problems deeper than a label rule:

| Audit case | What the current row says | What the retained source data indicates | What to fix |
|---|---|---|---|
| Swedish–Danish *greve* | `other` / `false_cognate`; the stored Proto-West Germanic root strings differ. | The Swedish entry explicitly names Danish *greve* as a cognate. Wiktionary's reconstruction entry lists both forms under Proto-West Germanic *garāfijō*. | A string mismatch between selected root fields cannot establish separate origin. Preserve source cognate claims and root identity separately. |
| Swedish–Danish *universitet* | `other` / `false_cognate`; the root strings differ in spelling. | Both entries trace through Latin *universitas* (one via Medieval Latin); the relationship is a shared borrowing lineage. | Represent borrowing paths and deeper source lineage. Do not use the root string as a one-field cognacy test. |
| Swedish–Norwegian *axel–akse* | `other` / `false_cognate`; the stored Swedish root is Proto-Germanic *ahslō*. | The selected Swedish sense is “axis,” but *ahslō* belongs to a different Swedish *axel* etymology meaning “shoulder.” | Bind roots and claims to source entry and etymology identity, not only spelling or a merged lemma. |
| Swedish–Danish *leja–leje* | `other` / `false_cognate`; the selected senses have different parts of speech. | Danish *leje* has a noun sense from Old Norse *leiga* and a separate verb etymology corresponding to Swedish *leja*. | Keep comparison sense and etymology identity distinct; do not merge evidence from another homographic entry. |

These cases do not justify automatic relabeling. They show that the current scalar root and one-row-per-spelling model can attach evidence to the wrong sense or hide a real source path.

The next taxonomy should describe supported paths, not assign each pair to one exclusive etymology box. Keep comparison candidate labels (such as misleading similarity) separate from historical relations. Store directed borrowing and inheritance claims as edges between identified entries; allow a pair to have multiple paths. A shared donor is different from one language borrowing from the other, and matching components are not enough to claim that whole compounds share one history. Use `false_cognate` only when distinct origins are supported; missing source material remains unknown. These sampled claims are leads for testing that model, not enough evidence to relabel the sample automatically.

Rebuild the expanded sample after the local API and database are running:

```powershell
python pipeline/src/build_source_pair_audit.py --source sv --target da --sample-per-category 10 --other-sample-count 50 --seed 20261001 --output pipeline/data/source_pair_audit_sv_da_expanded.jsonl --force
python pipeline/src/build_source_pair_audit.py --source sv --target nb --sample-per-category 10 --other-sample-count 50 --seed 20261001 --output pipeline/data/source_pair_audit_sv_nb_expanded.jsonl --force
python pipeline/src/build_source_pair_audit.py --source de --target en --sample-per-category 10 --other-sample-count 50 --seed 20261001 --output pipeline/data/source_pair_audit_de_en_expanded.jsonl --force
```

Rebuild the local joined slice after regenerating the source export and starting the local API/database:

```powershell
python pipeline/src/build_source_pair_audit.py --force
```

The script is intentionally an audit aid, not a bulk import. Its output retains the whole source records and can contain Wiktionary text, so it stays in the ignored local data directory.

Do the next work in this order:

1. **Make the audit cases reproducible.** Keep the seeded 270-row sample as a local diagnostic artifact. Record source dump hashes and retrieval details; do not commit raw Wiktionary dumps or generated files containing source text. Add a small reviewed ledger for concrete cases such as *greve*, *universitet*, *axel–akse*, *leja–leje*, *fleece*, *ombudsman*, *bankman*, *sandbank*, and *gift*. For each case, record the selected entries and senses, the source wording, the source relationship, the evidence scope, and what remains uncertain.
2. **Fix identity before rules.** The sample points to an entry/sense/etymology mismatch, not just a bad threshold. Preserve distinct source entry and etymology IDs, attach comparison senses to them when evidence supports the link, and mark unresolved links as unresolved. Keep multiple etymologies and homographs separate. Add regression checks for each confirmed extraction or join failure.
3. **Keep evidence dimensions independent.** Store source claims (including direction, components, and uncertainty) separately from computed form or meaning similarities and from project judgments. Allow multiple relationships for one pair: for example, a word may be borrowed directly from a language while also sharing a deeper ancestor, and a compound may have component-level links without whole-word cognacy. Treat `other` as the current classifier's residual bucket, not as a linguistic class. Keep “misleadingly similar” queryable as a form/meaning candidate for the quiz even when origin is unknown. The root-only classifier now treats unequal roots as `unknown`; regenerate the Parquet dataset when the local processing runtime is available, then apply the database migration and compare category and relation counts.
4. **Test a narrow transformation.** Choose a small slice from the existing five varieties that includes direct loans, shared donors, compounds, partial cognacy, homographs, and unknown origins. Run the new identity links and source-claim mapping beside the current output. Review every changed result against its source entry. Do not bulk-relabel rows or publish vocabulary percentages from this sample.
5. **Expose one useful slice.** Make it possible to inspect a result from comparison sense to source entry, source wording, normalized claim, and transformation. Use it in the site or as a small downloadable data slice. Export to CLDF when the records fit its existing tables; keep project-specific claims and provenance in documented linked tables. CLDF is a convenient exchange format, not a new research program or a replacement for the source-and-transform pipeline.

The immediate milestone is not “correct the whole dataset.” It is a small, rerunnable slice where source identity is right, claims do not overstate their evidence, and a user can see how a result was produced. Once that works, expand the same process to more rows and decide whether another source would resolve a known gap.

The current API and comparison table are consumers of this work, not the definition of the data model. Keep the initial scope to the existing five varieties. Add another language or a new source only when it helps answer a concrete question or reveals a gap in the extraction.

### This next stage is complete when

- The expanded audit sample and reviewed case ledger can be regenerated from recorded source and database inputs.
- Confirmed identity, extraction, and mapping failures have regression checks; ambiguous cases stay explicitly unresolved.
- At least one end-to-end slice can explain a result from comparison sense through source record and transformation to site-facing output.
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

### Source-sense-aware refresh (2026-09-28)

The 270 seeded comparisons were rejoined against the uncapped, source-sense-aware local candidate build. The audit loader originally required exact case for both forms, leaving three German–English rows without a comparison: *Haben–own*, *Fressen–fret*, and *Bis–till*. The candidate build contains each German form in lowercase. The loader now prefers exact spelling and uses a case-fold fallback only when exactly one candidate pair matches; it records `candidate_pair_match_method` so the fallback is visible. If multiple candidates share the folded spelling, it leaves the row unresolved instead of choosing one.

After that correction, all 270 audited cases have a comparison row and active source-sense links on both sides. The three fallback rows retain the candidate's canonical forms and sense data while the audit key keeps the sampled spelling. All three translation-sense references were preserved:

| Requested pair | Candidate sense result | Translation-source references |
| --- | --- | --- |
| German *Haben* – English *own* | Verb–verb; English active sense `en-own-en-verb-en:owner`; candidate remains `translation_pair` / `unknown`. | One source reference, and it matches the active English sense. |
| German *Fressen* – English *fret* | Verb–verb; English active sense `en-fret-en-verb-nTIPPIzo`; candidate remains `other` / `unknown`. | Two source references are retained; one matches the active English sense, one points to another English verb sense. |
| German *Bis* – English *till* | Conjunction–conjunction; English active sense `en-till-en-conj-lkWBUfuv`; candidate remains `other` / `unknown`. | Two source references are retained; the conjunction matches the active sense, while a preposition reference does not. |

These examples show why a translation statement must keep its source-sense ID. A target spelling can have claims from more than one source sense; only one may be the active comparison sense. The claims remain useful evidence, but the mismatched sense does not establish a relationship for the selected pair. The candidate's `other` value is still a pipeline bucket, not a conclusion about word history.

The three audits project to 2,341 normalized source edges with 2,396 template-evidence records. The schema-4 projection keeps translation-source sense IDs and the exact/case-fold pair-lookup method in comparison context. It skips 292 claims that have no normalized relation; the original claim records remain in the audit files. The edge total is not a count of pair classifications: it includes entry-level claims, including claims that do not target the counterpart form or active sense.

The local uncapped candidate file contains 1,638,454 directed rows (608,101,499 bytes). All 23 previously flagged sampled spellings are found after case-fold matching: 20 exact forms and three lowercase candidate forms. Removing candidate caps changed retrieval coverage and the selected comparisons; it does not show that the output labels are correct or indicate vocabulary-level shares.

The refreshed 270-row sample now contains 152 `other` labels. A strict pair-claim matcher finds specific source evidence on 28: 11 direct borrowing claims, nine cognate mentions, six shared donors, five shared inherited forms, and one noncognate mention. These evidence types overlap. The other 124 rows have no pair-specific claim found by this matcher; that is not evidence of unrelated origins. See [the case ledger](DATASET_CASE_REVIEW.md) for the examples and limits.

The retained English translation-claim snapshot has 302,640 rows, all with a source-sense ID. The builder now leaves an absent ID explicitly null and does not use it to constrain sense selection; its missing-input branch also returns both expected result maps.

The full pipeline test suite passes (95 tests). The rebuilt Parquet, refreshed audit JSONL, and edge projection stay in ignored `pipeline/data/`; the live database is unchanged. The 270-case sample remains a diagnostic from earlier API sampling, not a representative sample.

Rejoin the exact saved sample to the source-sense-aware candidate file with `--pairs-from-audit`. This preserves the old pair spellings and sample metadata while using the new comparison data:

```powershell
pipeline\.venv\Scripts\python.exe pipeline/src/build_source_pair_audit.py --source sv --target da --pairs-from-audit pipeline/data/source_pair_audit_sv_da_source_sense.jsonl --comparison-parquet pipeline/data/all_comparisons_source_sense.parquet --translation-claims pipeline/data/translation_claims_all.jsonl --output pipeline/data/source_pair_audit_sv_da_source_sense_casefold.jsonl --force
pipeline\.venv\Scripts\python.exe pipeline/src/build_source_pair_audit.py --source sv --target nb --pairs-from-audit pipeline/data/source_pair_audit_sv_nb_source_sense.jsonl --comparison-parquet pipeline/data/all_comparisons_source_sense.parquet --translation-claims pipeline/data/translation_claims_all.jsonl --output pipeline/data/source_pair_audit_sv_nb_source_sense_casefold.jsonl --force
pipeline\.venv\Scripts\python.exe pipeline/src/build_source_pair_audit.py --source de --target en --pairs-from-audit pipeline/data/source_pair_audit_de_en_source_sense.jsonl --comparison-parquet pipeline/data/all_comparisons_source_sense.parquet --translation-claims pipeline/data/translation_claims_all.jsonl --output pipeline/data/source_pair_audit_de_en_source_sense_casefold.jsonl --force
pipeline\.venv\Scripts\python.exe pipeline/src/project_source_case_edges.py --input pipeline/data/source_pair_audit_sv_da_source_sense_casefold.jsonl --input pipeline/data/source_pair_audit_sv_nb_source_sense_casefold.jsonl --input pipeline/data/source_pair_audit_de_en_source_sense_casefold.jsonl --output pipeline/data/source_pair_edges_source_sense_casefold.jsonl --force
```
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
