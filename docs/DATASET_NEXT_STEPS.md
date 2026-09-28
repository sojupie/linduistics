# Dataset next steps

## Aim

Keep building the data, source links, and transformations ourselves. The work is useful even if the first public result serves only a small number of people. It should be possible to inspect a result, see which source records support it, and rerun the transformation that produced it.

Wiktionary remains the first source, not the whole definition of the project. CLDF is a valid way to share compatible tables. It does not need to shape the internal pipeline, and we do not need a complete CLDF release before we have a useful data slice.

## Completed: preserve case-distinct entries

The comparison loader used lowercased headwords as dictionary keys. In the current German lemma file, that reduced 86,390 exact spellings to 85,093 keys, overwriting 1,297 entries. For example, translation mining could match Norwegian *TV* to lowercase German *fernsehen* (“to watch television”) instead of capitalized *Fernsehen* (“television”).

The loader now keeps the exact headword. Lookups prefer exact spelling; they use lowercase fallback only when one entry matches. Ambiguous fallback matches are skipped instead of being attached to an arbitrary entry. Surface matching compares lowercase spellings while preserving each source entry as a separate candidate.

Regression coverage checks entry retention, exact and ambiguous translation matching, surface candidates, and exact mined-pair selection. The pipeline suite passes: 75 tests.

I rebuilt the local candidate output from the identity-aware lemma files. It contains 405,250 directed rows, compared with 403,952 from the same builder before this fix. A concrete changed match is German *Fernsehen*: the old candidate selected the verb sense “to watch television”; the exact target spelling now selects the noun sense “television.”

These totals do not prove that the new classifications are all correct. The semantic model revision is not pinned, and the full build recomputes semantic matches. Keep the generated Parquet files local and do not treat category-count changes as caused only by the spelling fix. The live database remains untouched.

## Completed: preserve exact lemma identity in form links

The form extractor had the same overwrite risk: it keyed lemmas by lowercase spelling. It now keeps exact lemma names, accepts a lowercase fallback only when it identifies one lemma, and counts skipped ambiguous references. The `form` column stays lowercase for the inspector's token lookup; the `lemma` column keeps its exact spelling.

I regenerated the five form tables from the local Wiktionary dumps and identity-aware lemma tables. They contain 415,544 English, 391,985 German, 311,745 Swedish, 111,760 Danish, and 65,079 Norwegian Bokmål form-to-lemma pairs. The extractor skipped 17 ambiguous lowercase lemma links in German and none in the other four languages.

The new [audit_translation_form_coverage.py](../pipeline/src/audit_translation_form_coverage.py) measures source and target lookup coverage. It reproduces these results with the current local inputs:

- The English dump has 1,102,025 eligible source-entry records. Direct lemma lookup resolves 481,677 exact spellings and 151,258 unique lowercase fallbacks; 469,090 entries do not match a lemma.
- Of those unmatched English entries, 401 source-entry occurrences contain target translations. Their form tables link 55 to one lemma, link seven to multiple lemmas, and have no matching form record for 339. Those records contribute 825 translation occurrences.
- Matched English source entries contain 214,450 eligible target translation occurrences. Direct target-lemma lookup resolves 147,606 exact spellings and 3,751 unique lowercase fallbacks. Of the other 63,093 occurrences, form tables link 7,084 to one lemma, link 576 to multiple lemmas, and have no matching form record for 55,433.

The form table is a lookup index, not enough evidence to choose a comparison sense. For example, German *trübe* maps to both *trüb* and *trüben*; its raw source records include different adjective and verb analyses. Swedish *tidigare* has separate adjective and adverb form-of senses. The current form table drops those source sense IDs, tags, and paths. Keep these links out of automatic comparison generation until the translation surface, source sense, candidate lemma, part of speech, and source form claim can be inspected together.

Rerun the coverage summary against these local snapshots with:

```powershell
pipeline\.venv\Scripts\python.exe pipeline/src/audit_translation_form_coverage.py --english-dump pipeline/data/kaikki_en.jsonl --lemma-dir pipeline/data/identity-rebuild --form-dir pipeline/data/form-identity-rebuild --output pipeline/data/form-identity-rebuild/coverage.json
```

## Completed: preserve translation statements by source sense

The new [extract_translation_claims.py](../pipeline/src/extract_translation_claims.py) exports each in-scope translation attached to an English Wiktionary sense. It keeps the exact source entry key and line, source sense ID and glosses, target language code and spelling, and the complete raw translation record. It does not call a translation a cognate or select a target lemma.

Running it on the local English dump produced 302,640 claims: 152,113 German, 73,032 Swedish, 39,251 Danish, and 38,244 Norwegian Bokmål. The manifest records the input SHA-256 (`e38fe0e9b53e3387673fe46429a02b3dcecfd3e5bf5771d7766c5afa6fd41f25`), dump size, source-entry count, and claim counts. The generated JSONL and manifest are local ignored artifacts, not committed data.

Rerun with:

```powershell
pipeline\.venv\Scripts\python.exe pipeline/src/extract_translation_claims.py --input pipeline/data/kaikki_en.jsonl --output pipeline/data/translation_claims_en.jsonl
```

The pipeline suite passed: 78 tests at this stage. This artifact is a source-preserving intermediate table; it is not a release dataset or evidence that a translation has a particular historical relationship.

## Completed: link translation surfaces to target entries

The new [link_translation_target_entries.py](../pipeline/src/link_translation_target_entries.py) joins each distinct translated form to every matching entry in the target-language Wiktionary dump. It writes source entry IDs and line numbers, etymology text and templates, and sense glosses, tags, and `form_of` links. Exact-spelling matches remain distinct from case-only matches; homographic entries stay separate.

Across the 302,640 exported English translation claims, 371 had no usable target spelling. The remaining claims supplied 211,255 distinct forms across the four targets. Exact target entries were found for 113,227 forms; 1,197 more had case-only matches, 14 of those ambiguous across multiple target spellings. The other 96,831 forms had no source entry in these snapshots. The join produced 131,354 target source-entry records (117 MB). Per-language counts and SHA-256 fingerprints for every input are in the generated manifest. Both generated files stay local and ignored.

Rerun with:

```powershell
pipeline\.venv\Scripts\python.exe pipeline/src/link_translation_target_entries.py --claims pipeline/data/translation_claims_en.jsonl --target-dir pipeline/data --output pipeline/data/translation_target_entries.jsonl
```

### First source-backed cases

The examples already raised show why a spelling-pair label is too coarse:

| Case | Source entries say | What that supports |
| --- | --- | --- |
| Swedish *bankman* / English *Bankman* | Swedish: compound *bank + man*, “bank employee.” English capitalized *Bankman*: “A surname,” with no etymology claim. English lowercase *bankman* is a separate alternative form of *banksman*. | The current same-spelling row draws on a case-distinct English name and Swedish compound. The source does not establish their historical relationship. Component-level evidence belongs beside, not inside, the whole-word relation. |
| Swedish *fleece* / English *fleece* | Swedish entry: borrowed from English. English entry: inherited through Old English from Proto-West Germanic. | A borrowing edge is supported. The English root describes English’s history; it is not evidence that Swedish independently inherited the same root. |
| German *Fleece* / English *fleece* | German entry: borrowed from English; also marked as a doublet of *Vlies*. | Again, loan history and doublet information are separate claims. |
| Swedish *clown* / English *clown* | Swedish entry: borrowed from English. The English entry describes competing, uncertain origin analyses. | The direction of the Swedish loan is recorded even though the English word’s deeper origin is uncertain. |
| *sandbank* / *sandbanke* | Swedish, Danish, Norwegian Bokmål, and German entries all describe compounds; the English source separately lists entries and senses for the written form. | Preserve compound components and each language’s own source claim. Shared components alone do not prove that the complete words descend from one shared lexical ancestor. |
| *ombudsman* forms | Swedish traces the word to Old Swedish/Old Norse and marks its compound parts; Norwegian Bokmål records Old Norse inheritance; German says it was borrowed from Swedish. | One spelling family can contain inherited, compound, and borrowed relations depending on the language pair. |

The generated candidate table illustrates the mismatch: for example, it labels Swedish *fleece* versus English *fleece* `false_friend` with unknown relation, while the source explicitly records borrowing. For *bankman*, it labels a false friend although the English sense it selected is the capitalized surname and its source has no origin claim. These are not yet bulk corrections; they are concrete failures the next transformation should encode and test.

## Completed: scan all five source dumps

The translation exporter now accepts several input dumps. Scanning all five local language snapshots counted 2,315,293 entries. The English dump supplied all 302,640 in-scope translation claims; the other four dumps supplied zero. That is a property of these local extracts, not a claim that Wiktionary has no translation data in those languages. We should treat reversed English-to-target links as joins derived from the English claim plus target source entry, not as independently stated target-to-English claims.

The existing [extract_etymology_records.py](../pipeline/src/extract_etymology_records.py) produced a separate source-linked export across all five dumps: 710,110 entries with etymology data, 978,265 sense records, and 1,138,433 raw templates. Its current normalizer emitted 1,045,911 relation claims, including 99,626 borrowings, 87,404 inheritances, 72,456 compounds, 117,612 explicit cognate mentions, and 4,603 noncognate mentions. It also left 103,729 templates without a normalized relation; common ones include glossary and layout helpers, so they must not be interpreted as “unknown origin.”

The normalized output contains 5,448 repeated edge encodings across 5,103 source entries. Often Wiktionary includes both a base template and its `+` form for the same claim (for example, `inh` and `inh+`). Preserve those templates as provenance, but deduplicate their projected relation edge carefully before counting lexical relationships. Rerun the all-language extraction with:

```powershell
pipeline\.venv\Scripts\python.exe pipeline/src/extract_etymology_records.py --input-dir pipeline/data --languages da de en nb sv --output pipeline/data/etymology_records_all.jsonl
```

The first component-to-entry audit originally searched only the 710,110 entries with etymology records. That was not enough to call a component unmatched: many ordinary source entries have no etymology and therefore are absent from that export. The corrected scan indexes all 2,315,293 entries across the five local dumps. It found 527,311 raw claim vectors with component lists; collapsing repeated normalized lists within each source entry leaves 492,125 vectors and 1,001,433 component positions. Exact language-and-spelling lookup across the full dumps found one source-entry candidate for 449,908 positions (44.9%), multiple candidates for 452,108 (45.1%), and none for 99,417 (9.9%). The lookup removes Wiktionary `<t:...>` gloss tags but preserves spelling and case. Multiple matches are distinct source entry keys before sense resolution; no exact match means no exact spelling in these five snapshots. Neither result proves or disproves cognacy.

The repeatable scan records hashes for both the five full entry dumps and the etymology-record export, plus its matching rules. It writes aggregate counts and a compressed candidate-link table under the ignored local data directory. The table preserves the source entry, relationship, template evidence, component order, and all exact candidate entry keys; it does not choose among ambiguous candidates:

```powershell
pipeline\.venv\Scripts\python.exe pipeline/src/audit_etymology_component_entries.py --etymology-records pipeline/data/etymology_records_all.jsonl --entry-dump pipeline/data/kaikki_da.jsonl --entry-dump pipeline/data/kaikki_de.jsonl --entry-dump pipeline/data/kaikki_en.jsonl --entry-dump pipeline/data/kaikki_nb.jsonl --entry-dump pipeline/data/kaikki_sv.jsonl --candidates-output pipeline/data/component_entry_candidates.jsonl.gz --output pipeline/data/component_entry_coverage.json --force
```

I then intersected those component candidates with exact, non-uncertain `inherited_from` claims that point to the same reconstructed language and form. Across `compound_of` and `formed_from` records, 2,302 reconstructed nodes appeared in components from at least two varieties if ambiguous entry candidates were allowed. Requiring exactly one source entry for each component spelling reduces that to 592 nodes: 443 represented in two varieties, 122 in three, 26 in four, and one in all five.

That five-variety result exposed another problem: the Norwegian Bokmål *tyv* entry has `inherited_from` claims to Danish *tyv*, Old Norse *þjófr*, and Proto-Germanic `*þeubaz`. The source text starts “From Danish tyv.” Across the export, there are 612 Bokmål-to-Danish `inherited_from` claims on 424 source entries; 203 entries begin their etymology text with “From Danish,” while the other 221 mention Danish elsewhere. A literal template-to-relation mapping therefore cannot treat every listed proto-root as evidence of independent descent.

I kept the original candidate view and added a second view that excludes component entries with any recorded `inherited_from`, `borrowed_from`, or `derived_from` link to another one of the five present-day varieties. This reduces the unique-entry result from 592 nodes to 569: 440 across two varieties, 109 across three, and 20 across four. The Bokmål *tyv* entry no longer supplies the fifth member of the `*þeubaz` component set. This filter does not relabel the source claim as borrowing; it prevents a peer-variety path from being counted as independent descent evidence. Missing such a path still does not prove independent inheritance.

The compressed local projection now has 1,161 rows across both bases; each row links a reconstructed node to exact component entries and the parent compounds or derived forms that use them. It is a reviewable discovery set, not a count of cognate sets. Even a unique source entry can contain several senses: Swedish *man* in *bankman* still has three entry candidates. Swedish and English *man* entries both record Proto-Germanic `*mann-`, but that evidence alone does not resolve the component sense in *bankman* or establish the relationship of the English surname *Bankman*.

Rerun the shared-ancestor scan with:

```powershell
pipeline\.venv\Scripts\python.exe pipeline/src/audit_shared_component_proto_claims.py --etymology-records pipeline/data/etymology_records_all.jsonl --component-candidates pipeline/data/component_entry_candidates.jsonl.gz --shared-candidates-output pipeline/data/component_shared_ancestor_candidates.jsonl.gz --output pipeline/data/shared_component_proto_claims.json --force
```

For Swedish *bankman*, the generated component table links *bank* to one Swedish source entry and keeps all three *man* entry candidates rather than selecting a sense automatically.

## Completed: first comparison-to-source edge slice

Using the existing pair-audit tool, I joined 19 selected Swedish, Danish, German, and Norwegian Bokmål comparisons to their exact source entries and senses. Eighteen have a current comparison row; the German *Ombudsmann* / English *ombudsman* source entries exist, but the local candidate build has no comparison row for that pair. Of the 19 requested cases, the current classifications are 14 `other`, three `true_cognate`, one `false_friend`, and one missing comparison. The audit also joins the original English translation statements: 18 cases have an exact source-sense claim for the compared forms; *bankman* is the one without a direct translation claim in these inputs.

The audit makes several mismatches concrete:

- Swedish–English *ombudsman* is currently `true_cognate`, while the English source says it was borrowed from Swedish. Danish–English and Bokmål–English receive the same label; the English borrowing claim still applies.
- Swedish *bankman* / English *Bankman* is currently `false_friend`. The English source entry is a capitalized surname with no etymology; lowercase English *bankman* is a separate alternative form of *banksman*. Swedish *bankman* is a compound of *bank + man*. The source does not establish the whole-word relation.
- For Danish *klovn* / English *clown*, the candidate comparison selects the English gloss “A clownfish.” The English translation claims for Danish *klovn* are attached to the performer and silly-person senses instead.
- For Danish *bank* / English *bank*, the candidate selects an English verbal sense (“To store in a bank”) while the English translation entries link Danish *bank* to financial-institution senses. The source’s exact sense links expose this alignment gap.
- The English translation records for *clown* attach Danish and Swedish *klovn/clown* to the performer and silly-person senses. They are useful sense evidence, but do not establish historical relationship by themselves.
- Several current `other` rows have direct source statements for borrowing or compounding, including *clown*, *fleece*, *sandbank*, and *sandbanke*.

The new [project_source_case_edges.py](../pipeline/src/project_source_case_edges.py) turns the audits into a directed edge view. For these 19 cases it produced 386 normalized source edges supported by 407 template records; 21 repeated encodings were grouped while preserving each template as evidence. The 53 claims without normalized relations remain in the source audits and are not treated as unknown origins. The generated case audits, edge file, and manifests are local ignored artifacts.

Rerun the projection with:

```powershell
pipeline\.venv\Scripts\python.exe pipeline/src/project_source_case_edges.py --input pipeline/data/source_case_audit_da_en.jsonl --input pipeline/data/source_case_audit_de_en.jsonl --input pipeline/data/source_case_audit_nb_en.jsonl --input pipeline/data/source_case_audit_sv_en.jsonl --output pipeline/data/source_case_edges.jsonl
```

## Completed: compare a stratified sample with source claims

I reviewed 270 seeded comparisons across Swedish–Danish, Swedish–Bokmål, and German–English. Each pair has 10 rows from each of `true_cognate`, `partial_cognate`, `false_friend`, and `translation_pair`, plus 50 rows from `other`. The manifests record the category populations at sampling time; for `other`, these were 9,520, 10,078, and 11,719 rows respectively. The sample was selected from the live API and then joined to the local Wiktionary snapshots. It is a diagnostic sample, not a population estimate.

The comparison values are from an older database snapshot, not a rebuild of the current pipeline. The sample contains `false_cognate`, while the checked-in [classifier](../pipeline/src/classifier.py) now returns only `cognate` or `unknown` for root evidence. The local `all_comparisons.parquet` also predates the later classifier and entry-identity changes. Use this sample to inspect source claims and matching failures; do not treat its category counts or relation values as current output.

The 150 sampled `other` rows show why the value cannot mean “unrelated” or “no etymology.” The pair-audit projection found these row-level source links:

| Pair | Both exact source entries | Both active comparison senses linked | Direct borrowing from the paired language | Shared borrowing source | Explicit cognate mention of the paired form | Shared inherited form |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| German–English | 29/50 | 30/50 | 11/50 | 2/50 | 2/50 | 1/50 |
| Swedish–Danish | 34/50 | 26/50 | 0/50 | 0/50 | 3/50 | 1/50 |
| Swedish–Bokmål | 33/50 | 26/50 | 0/50 | 3/50 | 1/50 | 1/50 |

Evidence types overlap. “Both active comparison senses linked” means each side had an exact-gloss or source-identity match to the active comparison sense; it does not prove that every entry-level etymology claim belongs to that sense. The counts include only the relation types this pair-audit projection matches. Zero means no matching event in this projection, not that the source contains no useful evidence.

Several rows illustrate distinct facts that an exclusive pair label hides:

- German *Bestseller* / English *bestseller* is currently `other`. The German entry says “Borrowed from English bestseller,” and the audit links it to the active English noun entry. Wiktionary encodes this same loan in two templates, so the projected edge must be deduplicated while both templates remain provenance.
- Swedish *näck* / Bokmål *nøkk* is currently `other`. Both source entries trace the form to Old Norse *nykr*. This is a shared inherited path, separate from surface and meaning scores.
- Swedish *debut* / Bokmål *debut* is currently `other`. Both entries say the word comes from French *début*. That supports a shared donor path; it does not by itself mean the two varieties inherited the word from a common ancestor.
- Swedish *greve* / Danish *greve* is currently `other`. The Swedish entry explicitly lists Danish *greve* as a cognate. The entries also give their own source histories, which should remain separately inspectable.
- German *Nagel* / English *nail* is currently `other`. Both entries trace the compared noun to Proto-West Germanic `*nagl`; the English entry also lists German *Nagel* in its cognates. The active source senses are the fastening-tool meanings.

The sample also gives a useful limit case: the English *fret* entry mentions German *fressen* as a cognate, but the audit did not match that German form to an active comparison sense. Keep the source statement, but do not promote it to a confirmed relation for the compared senses without resolving that link.

This supports a data model with multiple source-backed paths and comparison observations, not a rule that maps every pair to exactly one historical label. It also exposes a separate identity task: 32–42% of sampled `other` rows did not have both sides linked to an exact source entry, and only 52–60% had active-sense source links on both sides. Improve the matching and retain unresolved links before using these rows to estimate category coverage.

### Project the sample as multiple source claims

I projected all 270 audits into 2,341 source-claim rows, backed by 2,396 template records. The projector grouped 55 repeated encodings of the same claim on a source entry while preserving the raw template evidence. It skipped 292 claims with no normalized relation; those remain in the pair audits and do not mean “unknown origin.”

| Normalized source relation | Projected rows |
| --- | ---: |
| `cognate_mention` | 723 |
| `inherited_from` | 645 |
| `derived_from` | 588 |
| `borrowed_from` | 135 |
| `formed_from` | 84 |
| `doublet_of` | 61 |
| `noncognate_mention` | 38 |
| `rooted_in` | 36 |
| `compound_of` | 14 |
| `clipped_from` | 8 |
| `surface_analysis` | 4 |
| `back_formed_from` | 2 |
| `calque_of` | 2 |
| `influenced_by` | 1 |

These rows describe claims attached to source entries used in the sample. Many point to third languages and do not connect the two compared forms. They are source evidence, not 2,341 confirmed pair classifications. Schema version 3 carries the compared forms and scores, source URL and entry key, and active comparison-sense links when the audit found them. Of the 2,341 rows, 1,216 carry such a link; it gives context for an entry-level claim, not proof that the claim belongs to that sense. The projection keeps only the active sense link rather than repeating every ambiguous gloss match. This reduced the local JSONL from 712 MB to 4.3 MB. All rows have a source URL, entry key, and part of speech. One lacks etymology prose but retains its template name and arguments. The generated JSONL and manifest stay local because they contain source text.

Rerun this projection from the saved local audits with:

```powershell
pipeline\.venv\Scripts\python.exe pipeline/src/project_source_case_edges.py --input pipeline/data/source_pair_audit_sv_da_expanded.jsonl --input pipeline/data/source_pair_audit_sv_nb_expanded.jsonl --input pipeline/data/source_pair_audit_de_en_expanded.jsonl --output pipeline/data/source_pair_edges_expanded.jsonl
```

The expanded audit JSONL files and their manifests remain local under `pipeline/data/`. The manifest records that sampling queried the live API, so an exact resample needs the same comparison snapshot; a fresh live sample may select different rows. [build_source_pair_audit.py](../pipeline/src/build_source_pair_audit.py) can rejoin explicit pairs to the retained source records. Keep these findings as a sample, not a reclassification of all rows in those populations.

## Do this next

### 1. Build a small multi-edge lexical-history slice

Start with the inspected pairs: *bank*, *bankman*, *fleece*, *clown*, *sandbank*, and *ombudsman*. Link each current candidate to its exact language-specific source entries and senses. Represent inherited, borrowed, derived, and compound-component links as separate directed claims with raw wording, template provenance, and uncertainty. Keep orthographic, phonetic, and semantic similarity as separate observations. Preserve multiple senses, homographs, component links, and missing origin claims; do not force each spelling pair into a single exclusive label.

For the slice, add a graph projection that collapses only duplicate normalized claims whose source template evidence points to the same edge. Keep the original source templates intact. Use cases such as *bankman* to test that a whole-word relationship can remain unestablished while its components have their own claims.

### 2. Make a rerunnable, source-backed slice

Use the existing language set and source dumps. Pick a bounded group of comparisons that exercises the problems already found: capitalization and homographs, same-gloss senses, direct loans, shared donors, compounds, partial relationships, misleading similarity, and missing or uncertain origins.

For each result, preserve links to the exact source entry, etymology, and sense when available. Keep the source wording and normalized source claim beside the pipeline's interpretation. Keep form and meaning similarity as separate computed observations. A pair may have several historical paths; absent evidence means “not established from these inputs,” not “unrelated.”

Use the existing audit scripts and candidate builder where possible. Add regression checks only for failures the slice demonstrates. Do not manually relabel the full dataset from a small sample.

### 3. Keep the dimensions separate

The data can support several kinds of questions, but they are not one taxonomy:

- **Language-level classification:** genealogy, contact or area, and typological features each need their own source and definition.
- **Lexical history:** inheritance, borrowing, calquing, derivation, compounds, and cognate-set links describe different relations. Preserve direction and components where the source gives them.
- **Comparison observations:** spelling, pronunciation, and meaning similarities describe forms or senses. They can find candidates and support a quiz; they do not prove a historical relation.
- **Evidence status:** record whether a link is source-stated, inferred by a named transformation, uncertain, conflicting, or not found in the available input.

Keep the current `other` value as a candidate-builder remainder until its contents are explained. Split it only when the source data supports a specific relation or when a distinct candidate type is useful. Do not turn it into a single replacement label.

### 4. Publish only what the slice can support

Package the slice with stable IDs, source names and versions, retrieval or dump details, transformation version, rerun command, license notes, and a short coverage and limitations note. Make it inspectable in the site or downloadable as simple machine-readable files.

Check whether CLDF's existing modules fit the released tables. Export the compatible parts if that helps another person use them; document any project-specific evidence links alongside them. Do not add a new source or all-language scope until a concrete gap in this slice justifies it.

## Done when

- The identity regression passes, including separate records for case-distinct spellings.
- The slice rebuilds from recorded local inputs and produces the same output for the same pipeline version.
- A reader can trace a result to its source wording and see which steps are source claims versus computed values.
- Unknown, conflicting, and ambiguous evidence stays visible instead of being converted to a confident label.
- The release makes one clear, useful claim and states what it cannot establish.

## Not part of this pass

- Replacing the Wiktionary pipeline with a ready-made corpus.
- Reclassifying every comparison or claiming vocabulary-wide cognate percentages.
- Applying the pending database migration or changing the live database before the candidate output is reviewed.
- Building a general-purpose linguistic ontology or making the site API the internal data model.

The longer audit history and current data model are in [NEXT_DATASET_STAGE.md](NEXT_DATASET_STAGE.md).
