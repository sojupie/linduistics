# Prior dataset investigation: source findings and candidate designs

**Checked:** 2026-09-29
**Status:** Historical investigation from the previous design direction. The source findings and measurements below remain evidence to reuse selectively. Its proposed lexical graph, two-layer output, source choices, and pilot plan are hypotheses—not the current project direction. See [the ground-up exploration](DATASET_PROJECT_DIRECTION.md) for the open question and current candidate comparison.

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
| IE-CoR | A focused cognacy reference for 170 tightly defined meanings, with expert-selected primary lexemes and cognate sets | The checked release has 169 complete concept slots across all five project languages. It is not exhaustive; its judgments focus on inherited cognacy, with loans represented separately. | Use its own forms for a five-language method sanity check. Record coverage and disagreements; do not treat its 169 meanings as a vocabulary-wide denominator. |
| Dunn's IELex / Lexibank `dunnielex` | A published Indo-European cognate-coded wordlist derived from Dunn's 2012 dataset | The CLDF release includes English, German, Swedish, and Danish, but not Norwegian Bokmål. The checked release has 198 concepts present in all four and cognate-set assignments; it is older and its selected forms are not a direct labeling of Linduistics' Wiktionary senses. | Use it as a second method check for the four overlapping languages. Keep its cognate sets attached to its own form records; do not copy them to a Linduistics word merely because it has the same concept ID. |
| Lexibank² | A catalog of separately curated CLDF wordlists; its `CogCore` subset marks wordlists with phonetic transcriptions and manually annotated cognate sets | The 2025 release describes 134 source datasets, 5,501 varieties, and 1.74 million lexemes overall. Most of that aggregate is not cognate-annotated. The current registry places IE-CoR and Dunn/IELex in `CogCore`; they remain selective datasets with their own chosen forms. | Use the catalog to discover and inspect a candidate source. Use `CogCore` to find cognacy-annotated method fixtures, while keeping each dataset's selected forms and labels together. Do not ingest the aggregate as a flat replacement corpus. |
| UniMorph | Inflectional paradigms: lemmas paired with inflected forms and cross-language feature bundles | The current index lists English (115,523 forms / 22,765 paradigms), German (179,339 / 15,060), Swedish (78,411 / 10,553), Danish (25,503 / 3,193), and Norwegian Bokmål (19,238 / 5,527). It models inflectional form/feature relations; it does not itself supply morpheme segmentation, historical ancestry, or cognacy labels. These counts and each dataset's license should be rechecked before use. | This can support the project's morphological-analysis or re-inflection work for all five varieties. Keep paradigm features separate from word-history relations, and do not assume its lemmas align to the project's selected Wiktionary senses. |
| Glottolog | Language and variety identifiers and genealogical classifications | Language-level genealogy, not word-level origin; classifications can be revised | Link stable language identifiers and sourced family context if a page needs it. Keep the source and date. |
| WALS | Documented typological features | Feature data is sparse and does not prove genealogy or lexical relationships | Add only for a clear language-comparison question. It is not needed to repair lexical classifications. |
| CLDF | Interchange schemas for wordlists, cognate judgments, borrowings, and custom linked data | A format, not a data source or an epistemic guarantee; its standard wordlist tables model cognate judgments and borrowings as separate relations | Export the records that fit. Keep a project-specific internal model if it is clearer. The [CLDF terms](https://cldf.clld.org/v1.0/terms.html) define separate `CognateTable`, `CognatesetTable`, and `BorrowingTable` structures. |

The source review points to supplementation, not replacement. Wiktionary can remain central to the project's own source and transformation work. Other sources should be added when they provide a distinct piece of evidence that the current edition does not.

## A practical cognate method, and its limits

The current English-Wiktionary candidate pool is the wrong input for a broad cognate detector: it is not aligned by meaning, and includes pairs introduced by spelling collisions. First make a concept-aligned wordlist, then run a sound-correspondence method on the selected pronunciations.

NorthEuraLex is a plausible starting frame: its CLDF release has 1,016 concepts and includes English, German, Swedish, Danish, and Norwegian Bokmål. It is a source of concept-linked forms, not Linduistics' own lexical history. Its conversion notes say that IPA was adjusted; preserve the published transcription and any Linduistics normalization separately. The live release check found forms for all five varieties in 1,014 parameter slots, with mapped Concepticon IDs shared across all five for 952 slots. The NorthEuraLex–IE-CoR common Concepticon set is 155; the NorthEuraLex–Dunn/IELex set for English, German, Swedish, and Danish is 166. These are bounded concept frames, not sense identity or label transfer.

The local lemma Parquet files already have almost complete non-empty `ipa` fields:

| Language | Lemma rows | Non-empty `ipa` | Empty |
| --- | ---: | ---: | ---: |
| English | 536,633 | 536,631 | 2 |
| German | 86,390 | 86,390 | 0 |
| Swedish | 53,525 | 53,524 | 1 |
| Danish | 22,544 | 22,544 | 0 |
| Norwegian Bokmål | 21,315 | 21,315 | 0 |

These counts come from the current local Parquet files. They measure populated output fields, **not source-pronunciation coverage**: the parser normalizes source IPA and applies its G2P fallback when IPA is absent, but the final `ipa` column does not distinguish those origins. This proves that forms are available to test, not that every transcription is equally trustworthy. Keep pronunciation provenance visible in any method pilot; do not treat near-100% field population as near-100% sourced IPA.

LingPy's LexStat method expects transcribed, concept-aligned wordlists. It derives language-specific sound scores from the observed data and uses those scores to cluster words by meaning. This is a much better fit for proposing inherited cognate sets than comparing raw spelling or gloss embeddings. The implementation can return distances and clusters; those are algorithmic proposals, not source statements or final historical verdicts.

The method literature gives a useful warning against treating any one algorithm as the answer. In one evaluation across six datasets and five language families, the best method reached 89% on those test sets, but performance varied by dataset. The paper also found that the tested algorithms did poorly on partial-cognate cases because they were not designed to represent shared morphemes inside otherwise different words. Its authors frame automatic results as pre-analysis for inspection and note that language-specific methods need at least around 200 words for moderately close languages, with larger lists for more diverse data. Those figures do not predict performance on this project's English-German-Scandinavian data.

### Match methods to the question

| Question | Useful evidence/method | Do not use it to claim |
| --- | --- | --- |
| Which pairs deserve a look? | Keep the existing translation and spelling-collision candidate search; add transparent phonetic retrieval where it improves discovery. Record the trigger and algorithm version. | That the candidate set is balanced, or that a high similarity score implies ancestry. |
| Are two forms misleadingly similar now? | A clearly defined modern-form and meaning comparison; keep it queryable for the quiz even when historical origin is unknown. | That the words are historically unrelated. |
| Do words descend from a common ancestor? | Select forms for the same meanings, preserve IPA provenance, then use sound-class or correspondence-based clustering (SCA/LexStat) to propose groups. Inspect against cognate sets such as IE-CoR/IELex on their own forms. | A verdict for every unrelated candidate pair, or a whole-vocabulary cognate percentage from this small list. |
| Is one form borrowed from another? | Preserve a directed source claim with donor, recipient, source entry/sense, and snapshot. Use targeted dictionaries and borrowing resources such as WOLD when coverage fits. | That a loan has no deeper shared ancestry, or that a loan is a cognate in the inheritance sense. |
| Are words related through components or morphology? | Keep whole forms and components separately identified; attach derivation/compound evidence at the relevant scope. Use paradigmatic resources only for the morphology they encode. | That shared spelling chunks prove shared morphemes, or that an inflected-form dataset establishes etymology. |
| What is the relationship between the languages? | Link language varieties to sourced genealogical, typological, or areal facts using resources such as Glottolog and WALS. | A conclusion about the history of an individual word pair. |

This separation means a useful first public dataset does not need to solve every historical relationship. It can combine a broad discovery index with a small concept-aligned comparison sample and expose which kind of evidence each result contains. Expand only when a concrete question needs more coverage.

### What the live CLDF overlap check found

I read the public CLDF tables for NorthEuraLex, IE-CoR, and Dunn/IELex and counted concept and form coverage for the project's target varieties. Concepticon IDs connect concept lists but do not prove that two datasets chose the same lexeme. I initially attempted to use exact generic CLDF `Form` strings as a cross-resource identity check; that comparison was invalid because the resources use `Form` for different representations. Those exact-string overlap counts below are withdrawn.

The counts below use these upstream snapshots: NorthEuraLex `e9a8119f25cf6078299132d8c4e7db338d46ff23`, IE-CoR v1.1 `10418a1aa10a097830240dbcec8dc85b66900bcf`, and Dunn/IELex v1.1 `f6f9150e707f49294f4b84d2e6e9d04cf446e50e`. I selected the listed language varieties by their CLDF language IDs, counted unique `Parameter_ID` values with at least one form, and separately counted mapped `Concepticon_ID` values. The form counts describe each resource's own selected rows; they are not cross-resource lexical identity matches.

| Resource | Forms by project language | Complete slots for covered project languages | Concepticon IDs shared by covered project languages | Cognacy labels |
| --- | --- | ---: | ---: | --- |
| NorthEuraLex | English 1,021; German 1,016; Swedish 1,170; Danish 1,086; Bokmål 1,121 | 1,014 of 1,016 | 952 | None: all 121,611 `Cognacy` and `Loan` fields are empty. Every row has a segmented transcription. |
| IE-CoR v1.1 | English 170; German 172; Swedish 172; Danish 169; Bokmål 170 | 169 of 170 | 169 | Selected forms have `Cognateset_ID` assignments in its separate cognate table. |
| Dunn/IELex v1.1 | English 202; German 215; Swedish 245; Danish 204 | 198 of 207 | 198 | Selected forms have `Cognateset_ID` assignments. |

The five-way NorthEuraLex/IE-CoR intersection is **155 Concepticon IDs**. The four-way NorthEuraLex/IELex intersection is **166 IDs**. These concept intersections are valid coverage counts, but they say nothing about whether the datasets selected the same word or sense. The previously reported normalized exact-string overlaps (including the claims of only 2 or 3 matches in some languages and zero in others) are withdrawn. I compared generic `Form` values without accounting for source-specific semantics: NorthEuraLex's conversion sets `Form` from raw IPA and `Value` from the orthographic word; Dunn/IELex sets `Value` to the original form and `Form` to a tokenized representation. The conversion code must be inspected for every resource before matching fields. An exact form match is still only a surface match, not sense identity.

A third resource materially improves the method plan. The Dunn/IELex CLDF release contains selected wordforms and cognate-set assignments for English, German, Swedish, and Danish. The live tables contain 198 concept slots shared by all four and assigned forms in each language. That makes it a useful four-language method test bed, while IE-CoR remains the only checked reference here that includes Norwegian Bokmål. IELex and IE-CoR have their own selected lexemes and decisions; their cognate labels should be tested on their own selected forms or transferred only after actual lexeme/sense alignment.

This changes the benchmark plan. NorthEuraLex is a strong broad meaning-and-form frame, but not a cognacy benchmark. IE-CoR supplies cognate group labels for a 169-slot five-language overlap; Dunn/IELex supplies labels for a 198-slot English-German-Swedish-Danish overlap. Neither set labels NorthEuraLex's or Linduistics' different selected forms by shared concept alone. A direct comparison must either align actual forms/lexemes or run the method on the reference dataset's own forms and compare with that dataset's cognate groups. These are useful method sanity checks, not broad accuracy claims; do not tune parameters and report the same items as an independent test.

The current Linduistics parser supplies another possible source of forms: its five lemma Parquet files contain 720,407 lemma rows, and only three rows have an empty final `ipa` field. By language: English 536,633 rows / 2 empty; German 86,390 / 0; Swedish 53,525 / 1; Danish 22,544 / 0; Norwegian Bokmål 21,315 / 0. This is not equivalent to source-IPA coverage because the parser fills missing transcriptions using G2P and does not preserve that origin in the final field. See [`parser.py`](../pipeline/src/parser.py) for the fallback behavior.

### Small method pilot

1. Use the counted NorthEuraLex frame (1,014 complete parameter slots; 952 common Concepticon IDs), Dunn/IELex (198 complete slots shared across four languages), and IE-CoR (169 complete slots across all five; 155 shared with NorthEuraLex) as the known bounds. Verify the meaning mapping and inspect exact selected forms before treating any overlap as a comparison.
2. Build one stable row per concept, language, source entry/sense, and selected form. Keep source dataset IDs, original IPA, normalized IPA, alternative forms, pronunciation origin, and missingness visible. Do not silently choose among synonyms or turn an absent form into a negative judgment.
3. Treat NorthEuraLex as a broad form/concept frame. Its published cognacy and loan columns are empty. Test a sound-class method on it for discovery only; any cluster is a derived proposal. The local Wiktionary/Kaikki forms can be added after concept and sense alignment, with source-provided IPA distinguished from G2P output.
4. Run one method sanity check on Dunn/IELex's own four-language forms against its `Cognateset_ID` groups, then repeat on IE-CoR's own five-language forms. The overlaps are 198 and 169 concepts, respectively, so these are diagnostic checks near or below the paper's rough 200-word guidance—not robust estimates. Start with SCA, which the paper recommends for very short lists; treat LexStat only as an exploratory comparison, and do not tune and evaluate on the same items.
5. Compare labels between resources only after actual forms/lexemes have been aligned, not merely because rows share a Concepticon ID. Report coverage and unresolved mapping counts alongside any cluster metric. IE-CoR and IELex are references for inherited cognacy, not labels for every dictionary entry or loan relation.
6. Check the existing named cases separately. A method that groups *bank* forms because of sound correspondence still cannot resolve homographic senses, whole-word versus component relations, or a loan with deeper ancestry without the source-linked records.

This route gives the project two useful outputs from one source effort: the current broad candidate finder for surprising or misleading pairs, and a smaller meaning-aligned wordlist where cognate hypotheses can be tested. It avoids pretending that a candidate remainder is a vocabulary taxonomy. It also keeps the project’s sourcing and transformation work central: outside datasets provide comparison frames and benchmarks, while Linduistics retains its own source records, transformations, and explanations.

### A concrete cross-edition case: German *Bank*

A first check of the French-edition extraction already gives us a useful structural test. Its German `Bank` page has two separate noun records with separate sense IDs and separate `etymology_texts`: the “bench / bank of sand” record traces through Middle High German, Old High German, and Old Saxon to a Germanic root; the financial-institution record says it comes from Italian *banco* and lists related forms including English and Swedish *bank*. The first record also lists `Sandbank` among derived forms. The page exposes the corresponding raw Wiktextract JSON as well as the rendered French glosses.

This is evidence that the second-edition extract is worth testing against the project's known homograph and compound cases. It is **not yet evidence that it adds a claim missing from the current English-edition data**: both are Wiktionary editions, the rendered page is post-processed, and the project must compare exact records and raw fields. In particular, the two histories of German *Bank* should not be collapsed into one headword root, and a component or derived-form link must not automatically become a whole-word cognacy judgment.

## A useful dataset shape

Build two connected but distinct products from the same source work:

### 1. Candidate index for exploration

Preserve broad form and translation candidates for searching, sorting, and the quiz. Store why each candidate exists and keep its computed spelling, sound, and meaning observations. Labels such as “misleadingly similar” describe a queryable modern pattern. They do not settle lexical history.

### 2. Evidence-backed comparison slice

Create a bounded sample with a clear inclusion rule. NorthEuraLex is a plausible broad frame because its published concept list covers the five current project languages; use Concepticon mappings where appropriate. For a smaller cognacy-method comparison, IE-CoR has 170 tightly defined meanings and includes those five varieties. Neither supplies Linduistics' own source history or a complete vocabulary denominator. Identify one or more of the project's own source senses per concept and language, record missing or multiple matches, and compare external judgments as references rather than verdicts. The unit is a **concept slot in a defined sample**, not a pair mined from every dictionary collision. Report coverage and the denominator explicitly.

### First five-language crosswalk against local records

I joined IE-CoR v1.1's selected orthographic forms to the `word` fields in `pipeline/data/identity-rebuild/lemmas_{en,de,sv,da,nb}.parquet`. The join used explicit variety IDs (English 22, German 27, Swedish 69, Danish 20, Norwegian Bokmål 58) and exact spelling after Unicode NFC normalization, trimming, and case-folding. Of the 169 meanings with a selected form in all five varieties, **159 have an exact spelling hit in all five local language files**. The remaining ten are incomplete exact matches, often because IE-CoR selected a phrase or a form variant; the miss does not prove that the local source has no equivalent.

This confirms that a small, meaning-aligned slice can be built from the project's own source entries without replacing them with IE-CoR forms. It is a surface-coverage result only. It does not establish that the local entry has the intended sense, nor transfer IE-CoR's cognate set to that entry. The joins and examples below were checked against the local per-sense `senses_json` records; the Parquet's top-level `pos` and `etym_root` are aggregated row summaries and can hide the more useful per-sense evidence. This was a read-only check of the local Parquet rebuild, not a query of or change to the live application database.

For those same 159 meaning slots, I compared IE-CoR's own cognate-set assignments for its selected forms. The count is how many slots have at least one shared cognate-set ID between the two languages, divided by 159:

| Pair | Same IE-CoR cognate set |
| --- | ---: |
| English–German | 88 / 159 (55.3%) |
| English–Swedish | 79 / 159 (49.7%) |
| English–Danish | 81 / 159 (50.9%) |
| English–Bokmål | 82 / 159 (51.6%) |
| German–Swedish | 95 / 159 (59.7%) |
| German–Danish | 98 / 159 (61.6%) |
| German–Bokmål | 96 / 159 (60.4%) |
| Swedish–Danish | 134 / 159 (84.3%) |
| Swedish–Bokmål | 132 / 159 (83.0%) |
| Danish–Bokmål | 141 / 159 (88.7%) |

These are **not corrected values for the existing overview**. They count shared cognate sets among selected forms in 159 concept slots; the overview counts categories among mined candidate-pair rows. The measures have different units and denominators. The contrast does show that the current candidate pool cannot serve as a view of basic shared vocabulary: a meaning-aligned slice produces the pattern one would expect for closely related Scandinavian varieties. IE-CoR is a comparison reference here; its assignments have not been written into local records.

| Meaning | IE-CoR selected forms and cognate sets | What the local per-sense records show |
| --- | --- | --- |
| Heart | `heart / Herz / hjärta / hjerte / hjerte`; all set 6458 | All five local entries have a matching heart sense and an extracted Proto-Germanic `*hertô` root. |
| Night | `night / Nacht / natt / nat / natt`; all set 266 | All five have matching senses. English, Danish, and Bokmål have extracted `*nahts`; the German and Swedish senses do not. Missing extraction is not evidence against the relationship. |
| Eye | `eye / Auge / öga / øje / øye`; all set 211 | All five have matching senses and extracted Proto-Germanic `*augô` roots. Several entries have other senses, so the selected sense still matters. |
| Hand | `hand / Hand / hand / hånd / hånd`; all set 234 | All five have matching senses and extracted Proto-Germanic `*handuz` roots. |
| Blood | `blood / Blut / blod / blod / blod`; all set 189 | All five have matching senses and extracted Proto-Germanic `*blōþą` roots. |
| Water | `water / Wasser / vatten / vand / vann`; all set 335 | All five have matching water senses and extracted Proto-Germanic `*watōr` roots. The English row's top-level POS is `name`, but its per-sense H₂O record is a noun. |
| Fire | `fire / Feuer / eld / ild / ild`; English and German set 219, Swedish, Danish, and Bokmål set 1314 | The local senses have roots recorded at different historical depths: `*fōr`, `*fuir`, `*ailidaz` (Swedish/Danish), and Old Norse `eldr` (Bokmål). Exact root-string equality would miss the two-group pattern visible in IE-CoR. |
| Woman | `woman / Frau / kvinna / kvinde / kvinne`; sets 1365, 346, 671, 671, 671 | The local entries also retain different roots: Old English `wīfmann`, Proto-Germanic `*frawjǭ`, Proto-Germanic `*kwenǭ` (Swedish/Danish), and Old Norse `kvinna` (Bokmål). A meaning row need not imply one cognate group across all five languages. |

The ten concepts without exact hits in every local file are `hair` (German), `near` (Danish), `nose` (Bokmål), `smoke` (Bokmål), `swell` (Bokmål), `vomit` (English, German, Danish, Bokmål), `far` (Swedish, Danish), `fear` (English, German, Swedish, Danish), `yesterday` (Danish, Bokmål), and `navel` (English). Several selected forms are multiword expressions (`be sick`, `Angst haben`, `i går`) or carry alternatives in parentheses (`nese (nase)`, `røyk (røk)`), so the next matching step should distinguish lemma matches, inflected forms, alternative spellings, and phrases rather than weakening the exact matcher indiscriminately.

### Exact-lemma misses expose a lexical-unit boundary

The local parser explicitly rejects any headword containing whitespace or hyphens (`pipeline/src/parser.py`, `_INVALID_WORD_PATTERN`). Across the 169 shared IE-CoR meanings, the 159 exact five-language matches leave **18 language-form slots** unmatched in ten concepts. Of those, 13 are multiword expressions (`i nærheden`, `kaste op`, `sich übergeben`, `kaste opp`, `be sick`, `langt borta`, `langt væk`, `be scared`, `Angst haben`, `vara rädd`, `være bange`, and `i går` in two varieties); English `belly-button` is hyphenated. This is expected under the current lemma-only filter; it is not proof those expressions are absent from the Wiktionary source.

Some other misses may be recovered without adding new source data. German `Haare` appears in the local form table as an inflection of both `Haar` and `haaren`, so POS and sense evidence must disambiguate it. Bokmål `nese (nase)` has both `nese` and `nase` as local lemmas; `røyk (røk)` has local `røyk`, while `røk` maps to more than one lemma. Bokmål `hovne` has no exact local lemma or inflection match in these artifacts. These are different cases and should not be treated as one generic spelling-normalization problem.

Sense inspection gives three concrete recovery leads. IE-CoR defines `hair` as the mass/body of hair on a person's head; the local German lemma `Haar` has a matching sense, distinct from the single-strand sense. The IE-CoR Bokmål form `nese (nase)` can link to local `nese` (`a nose`), while the local `nase` entry says it is superseded by `nese`. The Bokmål form `røyk (røk)` can link to local `røyk` (`smoke`); the alternate `røk` is ambiguous in the form table, so `røyk` is the cleaner path. These three are **sense-compatible mapping candidates**, not stored judgments. If accepted, they could raise the five-language surface crosswalk from 159 to 162 complete concepts; they are not counted as complete yet. The remaining 15 unmatched language-form slots are 13 phrases, one hyphenated form, and `hovne`, which has no local lemma or inflection match in these artifacts.

The aligned comparison unit therefore needs to be a **lexical form or expression** linked to a source entry and sense, not only a whitespace-free base lemma. It should support multiword values, explicit alternative forms, and inflected-form-to-lemma links while retaining the source's own segmentation. Components can be linked separately when the source supports that analysis; do not infer whole-word cognacy from a phrase or compound's parts. Keep the current lemma table as one source of forms rather than broadening its filter in a way that changes every existing candidate row. The 159 count is an exact-lemma lower bound; possible recoveries are not counted until their local sense links are checked.

For a first sense-level pass, [`docs/data/iecor_local_sense_candidates_2026-09-29.tsv`](data/iecor_local_sense_candidates_2026-09-29.tsv) contains eight concepts across five languages: 40 concept-language slots and 47 local sense candidates. The extra rows preserve duplicate source senses instead of choosing silently. Each candidate came from an exact spelling match plus an explicit target-gloss text rule; every row is marked `provisional_gloss_match`. `reference_cognateset_id` records IE-CoR's set only as comparison metadata. The file does not assign a Linduistics cognacy judgment or change application data. This worksheet is a reviewable starting point, not a validated release.


Use the current named cases as a separate mechanism test suite. Cases such as *fleece*, *ombudsman*, *bankman*, *sandbank*, *aften/afton*, and *væg/väg/vägg* test loans, deeper lineage, compounds, homographs, sense matching, and ambiguous source claims. They do not estimate rates.

This combination retains the fun and utility of finding surprising pairs while adding a small view that can support defensible comparisons. It avoids presenting a giant candidate pool as a sample of ordinary vocabulary.

### CLDF can carry more than one relationship type

CLDF is a practical publication format for this shape, not a replacement for the source data or a demand to make every record fit one label. Its Wordlist module has separate tables for forms, cognate sets, and assignments of forms to cognate sets. It also defines a Borrowing table that links donor and recipient forms, and a Partial Cognate table for component-level assignments. Those distinctions directly address the cases that broke the current single-category model: a borrowed form can have deeper ancestry, and a compound can share a component without being a whole-word cognate.

The project should retain Wiktionary's source statements and entry/sense identities in its own relational records, then export the comparison slice to CLDF. Where the standard tables do not capture a source-specific statement or its exact scope, add a documented custom table or a linked source record; do not flatten the claim into a cognate-set assignment. A concept ID identifies the meaning slot, while the selected Wiktionary entry and sense remain explicit links. This lets the site and a reusable export share the same underlying work without making the export format the application database schema.

This is enough structure for a small pilot: one row per selected source form, explicit concept and sense mapping, cognate-set assignment only where the project actually makes one, directed borrowing records, and component assignments where relevant. The broader candidate index can remain outside that aligned wordlist while still linking back to the same source forms.

## A practical sequence

1. **Correct the source manifest before altering rules.** Record source edition (`enwiktionary`, `frwiktionary`, `dewiktionary`, or another source), provider, dump date, extraction version, raw file hash, and license/attribution terms. Treat current `kaikki_sv`/`kaikki_da` names as language-slice names, not edition identifiers.
2. **Run a bounded cross-edition pilot.** Start with German *Bank* and other named cases, then compare English-edition records with the French-edition extract for five `other` candidates from each of the ten undirected language pairs. Include loans, compounds, homographs, and apparent cognates in the named cases. This is a coverage and extraction test, not a prevalence estimate. Track matching entry/sense coverage, new or conflicting etymology claims, and fields absent from one edition. French glosses need not be forced into English semantic matching; first see whether form, entry links, and etymology claims add value. Do not merge by spelling alone.
3. **Use independent dictionaries where they add a distinct account.** Test the German-edition extraction for German cases and the official Bokmål dictionary for the named Norwegian cases. Keep each source entry and claim distinct from English-Wiktionary-derived records.
4. **Build a small concept-aligned sample with two reference roles.** Start from the checked NorthEuraLex frame (1,014 complete slots; 952 mapped Concepticon IDs shared across the five varieties) and its 155-ID overlap with IE-CoR. Use NorthEuraLex to select a bounded set of meanings, then compare sound-class and LexStat proposals against IE-CoR's cognate sets on IE-CoR's own forms. Map the concepts to the project's own entries and senses; record gaps and disagreements instead of silently adopting outside forms or labels.
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
- Broad dataset discovery and cognate subset: [Lexibank² repository and release notes](https://github.com/lexibank/lexibank-analysed), [collection workflow](https://github.com/lexibank/lexibank-analysed/blob/main/workflow.md), [CogCore criteria and collection code](https://github.com/lexibank/lexibank-analysed/blob/main/lexibank_lexibank_analysed.py), [dataset registry](https://github.com/lexibank/lexibank-analysed/blob/main/etc/lexibank.tsv), [variety-level coverage](https://github.com/lexibank/lexibank-analysed/blob/main/cldf/languages.csv).
- Inflectional morphology and current language coverage: [UniMorph schema and language index](https://unimorph.github.io/), [feature schema](https://unimorph.github.io/schema/).
- Cognacy/loan distinction: [IE-CoR processing options for loans and parallel derivation](https://github.com/lexibank/iecor/blob/master/iecorcommands/make_nexus.py).
- CLDF Wordlist has separate form, cognate-set, cognate-assignment, borrowing, and partial-cognate tables: [CLDF terms](https://cldf.clld.org/v1.0/terms.html), [CLDF examples](https://github.com/cldf/cldf/blob/master/examples/README.md).
- Meaning anchors: [Concepticon about concept lists and concept sets](https://concepticon.clld.org/about).
- Broad concept frame: [NorthEuraLex CLDF release and statistics](https://github.com/lexibank/northeuralex), [its language table, including English, German, Swedish, Danish, and Norwegian Bokmål](https://github.com/lexibank/northeuralex/blob/master/cldf/languages.csv).
- Cognacy reference and verified form field: [IE-CoR overview and protocols](https://www.eva.mpg.de/de/linguistic-and-cultural-evolution/research/ie-cor/), [v1.1 conversion maps romanised forms into CLDF `Form` and copies that into `Value`](https://github.com/lexibank/iecor/blob/v1.1/lexibank_iecor.py), [v1.1 lexeme field mapping](https://github.com/lexibank/iecor/blob/v1.1/mappings.py), [IE-CoR language table](https://github.com/lexibank/iecor/blob/v1.1/cldf/languages.csv), [IE-CoR cognate-set browser](https://iecor.clld.org/cognatesets).
- IE-CoR target-sense descriptions used for the hair, nose, and smoke checks: [v1.1 parameter table](https://github.com/lexibank/iecor/blob/v1.1/cldf/parameters.csv).
- Four-language cognacy reference: [Dunn/IELex CLDF release](https://github.com/SequenceComparison/dunnielex/tree/v1.1), [language and concept coverage](https://lexibank.clld.org/contributions/dunnielex). Its checked forms/cognate tables contain 198 concept slots shared by English, German, Swedish, and Danish; Bokmål is not included.
- Cognate-detection method: [LingPy LexStat documentation](https://lingpy.org/docu/compare/lexstat.html), [LexStat paper (List 2012)](https://aclanthology.org/W12-0216/), and [evaluation of automatic word-comparison methods (List, Greenhill & Gray 2017)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0170046). The evaluation reports dataset-dependent performance and limitations for partial cognates; its accuracy figures should not be projected onto Linduistics without a local test.
- Other comparative reference: [Lexibank IELex dataset](https://lexibank.clld.org/contributions/dunnielex).
- Language identifiers and genealogy: [Glottolog languoids](https://glottolog.org/glottolog/glottologinformation).
- Language structure: [WALS features](https://wals.info/feature).
- Interchange format: [CLDF terms](https://cldf.clld.org/v1.0/terms.html).
