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

## Candidate-to-source-claim evidence export (2026-09-28)

I extended the source-claim audit to export matched claim records as compact JSONL. Its first version covered only Swedish–Danish, Swedish–Norwegian Bokmål, and German–English; it now checks all 10 language pairs produced by the comparison builder.

The earlier export used stale comparison tables: every historical relation in that comparison build was `unknown`. Its counts and category shares are superseded below. The source-aware builder now preserves multiple candidate target identities when an exact sense cannot be selected.

### Source-aware rebuild and audit

On 2026-09-28, I rebuilt lemma tables from all five local Wiktionary dumps into `pipeline/data/lemmas_source_identity/`. The build has 1,060,087 active senses, all with source-entry and source-sense IDs. A source root is extracted on 222,272 senses. I then rebuilt all 10 language pairs into `pipeline/data/all_comparisons_source_identity.parquet`: 1,638,454 directed comparison candidates, 24,872 with equal extracted roots and 1,613,582 with an unknown root relation. These are counts in the generated candidate set, not vocabulary-wide rates.

The all-pair export at `pipeline/data/candidate_source_claim_matches_all_pairs.jsonl` contains **20,354 claim-to-candidate evidence rows** across all 10 language pairs. Claims overlap within a candidate. **13,143 `other` candidates** have at least one entry-level source claim naming the compared form:

| Pair | `other` candidates | With a matching source claim | Share of `other` candidates |
| --- | ---: | ---: | ---: |
| Danish–German | 20,122 | 1,118 | 5.6% |
| Danish–English | 56,023 | 936 | 1.7% |
| Danish–Norwegian Bokmål | 18,446 | 707 | 3.8% |
| Danish–Swedish | 21,978 | 1,034 | 4.7% |
| German–English | 144,580 | 4,219 | 2.9% |
| German–Norwegian Bokmål | 18,121 | 885 | 4.9% |
| German–Swedish | 28,830 | 1,331 | 4.6% |
| English–Norwegian Bokmål | 49,647 | 791 | 1.6% |
| English–Swedish | 82,780 | 1,426 | 1.7% |
| Norwegian Bokmål–Swedish | 21,601 | 696 | 3.2% |
| **Combined** | **462,128** | **13,143** | **2.8%** |

This confirms that `other` is a mixed candidate-builder remainder, not an etymological category. Across the all-pair export, the claims include 5,916 borrowings, 11,458 cognate mentions, 2,054 derivations, 378 calques, 356 inheritance claims, 91 noncognate mentions, and other relations. The 406 target identities that could not be selected are ambiguous; the output retains their possible IDs. An entry-level claim plus a form match still does not prove that the claim applies to the exact aligned target sense.

### What the examples show

| Case | What the source-backed build says | What remains wrong or unresolved |
| --- | --- | --- |
| *bankman* (Swedish–English) | The selected Swedish sense is a common noun, “bank employee”; the selected English sense is a surname. Both forms are identical. | It was labeled `false_friend`. I changed the classifier so a name-to-common-word collision remains `other`; it is still inspectable as a candidate, but is no longer presented as a lexical false friend. |
| *fleece* (Swedish–English) | The English sense traces to Proto-West Germanic `*fleus`; the Swedish source entry contains both the prose and a structured `borrowed_from(en, fleece)` claim. | The comparison is `other` with unknown root relation because the classifier uses shared roots and does not consume the directed borrowing edge. This pair now appears in the all-pair claim export. |
| *clown* | Swedish, Danish, and Bokmål entries contain structured `borrowed_from(en, clown)` claims. The German entry also has two structured borrowing templates for English *clown*. | The Scandinavian borrowing paths now appear in the all-pair audit. The German templates remain separate evidence records; a graph projection can show that both support the same directed edge while retaining their provenance. |
| *ombudsman* (Danish/Swedish–English) | The English entry says it was borrowed from Swedish; the Danish and Swedish entries trace to Old Norse `umboðsmaðr`. | Exact root equality makes the pair `cognate`, collapsing the direct borrowing path into a root match. Both facts need to coexist as different relation types and paths. |
| *bank* | Danish financial *bank* traces through French to Italian *banco*; Swedish traces through German/Dutch or Low German to Italian *banco*. | The root-only comparison is unknown. The source histories show a shared loan source with different paths, not enough to call the modern words inherited cognates. |
| *sandbank* | English and German entries give compound structure, and English explicitly mentions German *Sandbank* as a cognate. The Swedish entry has a structured `formed_from` claim with components `sand` and `bank`. | The pair remains `other`; components are not linked to component entries or senses. Whole-word source claims and component paths are not projected together. |

These cases point to three independent layers in the next data model: **directed lexical-history edges** (including borrowing and derivation), **component links** for compounds, and **shared-root/cognate observations**. Each edge should keep its source entry, sense, raw wording or template, and uncertainty. Similarity scores remain observations that find candidates, not evidence of history. Do not turn any one layer into an exclusive pair label.

Reproduce the source-aware build and audit from local inputs:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\build_crosslingual_dataset.py --lemma-dir pipeline\data\lemmas_source_identity --output pipeline\data\all_comparisons_source_identity.parquet
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_cognate_coverage.py --source-records pipeline\data\etymology_records_all.jsonl --comparisons pipeline\data\all_comparisons_source_identity.parquet --matches-output pipeline\data\candidate_source_claim_matches_all_pairs.jsonl --force
```

The current manifest records source-record SHA-256 `1406623aa2bd12cdcf23eb19b575ed2f61f015759e2cb49e5144b49b5274be4b`, comparison SHA-256 `3e80e59c2229ba908bafc52e4f955f0035ef80e9f10c72961a8d0d8a80770943`, and all-pair evidence-export SHA-256 `287084ecff01540617cd2a9635007d63e4339dc1e4399675a111920be09076c7`. The full pipeline test suite passes 102 tests with the all-pair audit extension. Generated files remain local and ignored; the live database is unchanged.

### Component entry coverage

I also ran the existing component-entry audit on the fresh source records and five local dumps. It indexed **2,315,293 dump entries** and checked **1,003,229 component occurrences** from 510,622 component-claim records. Of those occurrences, **451,016 (45.0%)** match one exact source entry, **452,714 (45.1%)** match multiple entries, and **99,499 (9.9%)** have no exact entry. These are exact language-and-spelling lookups, not sense matches or evidence that two components are historically related.

The named compounds show the difference. Swedish *sandbank* has one exact source entry for each component (*sand*, *bank*), but the *bank* entry still contains multiple senses. Swedish *bankman* has one exact *bank* entry but three possible *man* entries. Danish *ombudsmand* links to one exact entry for both *ombud* and *mand*. English *sandbank* has multiple entries for both components, while German *Sandbank* has one *Sand* entry and two *Bank* etymology entries. The audit keeps those candidates instead of choosing by spelling alone.

Reproduce this audit with:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\audit_etymology_component_entries.py --etymology-records pipeline\data\etymology_records_all.jsonl --candidates-output pipeline\data\component_entry_candidates_source_identity.jsonl.gz --output pipeline\data\component_entry_coverage_source_identity.json --force
```

This gives the project a useful first component-link layer. Next, link only resolved source entries, preserve multiple candidate entries, and record whether the component sense is known. Do not infer whole-word cognacy from a compound's components.

The component projection now retains the POS, etymology number, source-sense IDs, glosses, and tags for every exact candidate entry. The existing `candidate_entry_keys` field remains for the shared-component audit. This is evidence for review, not automatic sense alignment: Swedish *bankman* now exposes the adult-male, husband, and workforce readings of *man*, along with separate homographic entries. The refreshed compressed output hash is `294cb74914db90fb349e66b0552fb15fb115dd3a259193b52229a925d46a8013`.

I reran the existing shared-component ancestry scan on this richer projection. It finds **2,306 candidate proto-root nodes** appearing in components from at least two languages when all exact-entry candidates are allowed. Requiring one exact entry per component leaves **592 nodes**; excluding entries that also record a direct path through another project language leaves **569** (440 in two varieties, 109 in three, and 20 in four). The output has 1,161 linked component-use rows across the two stricter views. These are discovery candidates, not cognate sets; a single source entry may still contain several senses.

One useful lead is Proto-Germanic `*samdaz`, which appears as the *sand* component in German *Sandbank*, Bokmål *sandbanke*, and Swedish *sandbank*. That supports checking the component histories together. It does not establish that the whole compounds are cognate, nor select the sense of *bank* used in each compound. The peer-language filter also only removes known paths; absence of a recorded borrowing path does not prove independent inheritance.

Next, review the source-to-result slice below for specific transformation or identity failures before considering broader reclassification. A public machine-readable release can follow; try CLDF as an export format only after the slice shape is clear, and retain it if it makes reuse easier.

## Source-linked case slice (2026-09-28)

I added `pipeline/src/build_case_evidence_slice.py` to join the current comparison candidates with their active source-entry records, pair-specific claim matches, and component-entry candidates. It uses the source-aware build and local Wiktionary-derived inputs; no live API or database is involved. The generated `pipeline/data/named_case_evidence_slice.jsonl` and manifest are ignored local files.

| Case | Directed comparison rows | Source etymology records | Pair-specific claim matches | Component claim records |
| --- | ---: | ---: | ---: | ---: |
| *bank* | 8 | 6 | 0 | 0 |
| *bankman* | 2 | 1 | 0 | 1 |
| *fleece* | 4 | 3 | 2 | 0 |
| *clown* | 8 | 5 | 5 | 0 |
| *ombudsman* | 8 | 4 | 1 | 2 |
| *sandbank* | 6 | 3 | 2 | 4 |
| **Total** | **36** | **22** | **10** | **7** |

The comparison rows are directed records, so reversed versions of the same form pair are counted twice. These totals describe this deliberately selected case set, not dataset coverage. All 22 selected source etymology records overlap an active comparison sense ID, but an entry or etymology-level claim still does not automatically become a claim about that sense. The slice preserves candidate target identity as available or ambiguous. Component records retain every exact entry/sense candidate rather than selecting one.

### What the linked rows show

- **Bank:** the current rows remain `other` / `unknown` and have no source claim directly naming the paired language and form. Source entries do record different paths involving French, Italian, Dutch, German, and Low German. That is a lead for modeling shared donors and separate routes; it does not establish direct inheritance between the compared modern words.
- **Bankman:** the current rows are now `other` / `unknown`, not `false_friend`. Swedish *bankman* has a `compound_of` claim for *bank + man*. The component lookup finds one exact *bank* entry and three possible *man* entries. The English comparison sense is the surname; the source data does not establish a whole-word relationship.
- **Fleece:** Swedish and German source claims say `borrowed_from(en, fleece)`; the English entry separately traces its history through Old English to Proto-West Germanic `*fleus`. Both pair rows remain `other` / `unknown`. The pair-specific claim matches have available target entry and sense identities, but the borrowing claim is still not reflected in the scalar comparison relation.
- **Clown:** Swedish, Danish, Bokmål, and German have five pair-specific borrowing claim matches to English *clown* (German has two template encodings). All current comparison rows remain `other` / `unknown`. The English entry also retains its own deeper-origin claims; keep those as separate source paths.
- **Ombudsman:** six directed rows are `true_cognate` / `cognate`, while the German pair's two rows are `other` / `unknown`. One source claim matches English *ombudsman* borrowed from Swedish, while Danish and Swedish entries also record compound and Old Norse relationships. This is the case where a deeper shared path and a direct borrowing path coexist.
- **Sandbank:** all six rows remain `other` / `unknown`. English has a cognate mention naming Swedish *sandbank* and German *Sandbank*. The German target identity is available; the Swedish target identity is ambiguous and its candidate IDs remain in the slice. Component records show the compound analyses and the unresolved component-entry choices.

This demonstrates two concrete limitations without turning the six cases into bulk labels: the scalar relation misses some directly encoded borrowing or cognate-mention evidence, while the `other` value mixes pair rows that have different source evidence. It also shows that the source matcher can find a form but still encounter ambiguous target identity, as for Swedish *sandbank*. No category migration follows from this small review slice.

Rebuild from the recorded local artifacts:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\build_case_evidence_slice.py --force
```

The manifest fingerprints the comparison table, source claim match export, source etymology records, component candidates, and generated JSONL. The builder's focused tests check case matching, active-sense links, pair-claim identity, and component retention. The full pipeline suite must be rerun after the next pipeline change.

## Separate source translation evidence from embedding scores (2026-09-28)

The candidate builder previously raised `semantic_sim` and its classification input to at least **0.95** for every pair mined from an English Wiktionary translation. That wrote a source assertion into a field presented as an embedding similarity. The pair also already retained its source-sense reference in `translation_source_senses`.

I removed the floor. `semantic_sim` now records the cosine score for the selected sense pair; the translation source references remain alongside it. A low embedding score alone does not label a pair `false_friend` when the candidate has direct translation-source evidence. This leaves the row inspectable as `other` while preserving both facts, rather than falsifying the numeric score or treating a source translation as proof of the target sense. The reference still identifies the English source sense, not a resolved target sense.

The change keeps the same 1,638,454 directed candidates and 542,990 directed rows with translation source-sense references. The relation counts are unchanged: 24,872 rows have equal extracted roots and 1,613,582 have unknown root relation. The local candidate categories changed as follows:

| Category | Before score separation | After score separation |
| --- | ---: | ---: |
| `true_cognate` | 21,646 | 14,810 |
| `partial_cognate` | 2,410 | 9,246 |
| `translation_pair` | 328,262 | 106,556 |
| `false_friend` | 361,880 | 361,880 |
| `other` | 924,256 | 1,145,962 |

The translation-pair decrease is 221,706 directed rows; the `other` increase is the same amount. Another 6,836 rows move from `true_cognate` to `partial_cognate` when the embedding score is no longer floored. This is a change in heuristic candidate labels, not new etymological evidence. The corrected snapshot remains local; none of these changes have been applied to the database.

The named cases show why the score and source claim must coexist:

- Swedish and German *fleece* retain borrowing claims to English, but their selected-sense embeddings are 0.198 and 0.609. Both comparison candidates stay `other`; the source claims and target identities remain inspectable.
- Danish and Bokmål *ombudsman* rows move from `true_cognate` to `partial_cognate` because the selected-sense embedding scores are 0.427 and 0.664. Their extracted Old Norse roots still match, and the English-to-Swedish borrowing claim remains. The score alone does not settle whether these are partial cognates; this is a review candidate, not an accepted reclassification.
- *bankman* remains `other`; its English comparison is a surname, and the Swedish compound still has one exact *bank* component entry and three *man* candidates.

The refreshed all-pair claim audit still has 20,354 evidence rows and 406 ambiguous target identities. It now associates 13,738 source-claim matches with `other` candidates, among 572,981 unique `other` form pairs. The normalized claim inventory itself is unchanged.

Rebuild the corrected comparison snapshot, source-claim matches, and six-case slice from local files:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\build_crosslingual_dataset.py --lemma-dir pipeline\data\lemmas_source_identity --output pipeline\data\all_comparisons_separated_translation_evidence.parquet
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_cognate_coverage.py --source-records pipeline\data\etymology_records_all.jsonl --comparisons pipeline\data\all_comparisons_separated_translation_evidence.parquet --matches-output pipeline\data\candidate_source_claim_matches_separated_translation_evidence.jsonl --force
pipeline\.venv\Scripts\python.exe pipeline\src\build_case_evidence_slice.py --comparisons pipeline\data\all_comparisons_separated_translation_evidence.parquet --claim-matches pipeline\data\candidate_source_claim_matches_separated_translation_evidence.jsonl --output pipeline\data\named_case_evidence_slice_separated_translation_evidence.jsonl --force
```

The corrected comparison SHA-256 is `0d7a686246b261a7d44ac75b596714bd8b68b5c2c3b53264e888d427905866c1`. The refreshed claim export SHA-256 is `3773ba3d5c983ad6878324be9175e6ea71a6863e7a4725ee5aaca1ce2d62de36`. These ignored local files contain no live database changes. The full pipeline suite passes 105 tests.

## Restore source forms for three etymology templates (2026-09-28)

I inventoried all 1,148,705 source-claim records from 710,110 entries. Three already-classified template types had a relation but generally lost the endpoint form during extraction: `ellipsis`, `nom`, and `sylabbr`. The normalizer now reads their documented or observed source-form argument while preserving the original arguments. For `ellipsis`, Wiktionary specifies argument 1 as the source language and argument 2 as the source term; argument 3 is display text, so it is not promoted to a source form when argument 2 is empty. See the [ellipsis template documentation](https://en.wiktionary.org/wiki/Template:ellipsis/documentation).

The corrected extraction keeps all 710,110 entries and 1,148,705 claims. It moves **480 claims** from no structured target to a target shape: 283 `ellipsis_of`, 164 `nominalized_from`, and 33 `syllabically_abbreviated_from`. The total number of claims per relation is unchanged. The remaining 140 endpoint-less claims are six different relation types whose local source arguments do not provide a form or entity; their raw arguments remain available for a later audit.

A streamed field-by-field comparison of all 710,110 old and rebuilt records confirmed that exactly 480 claim records changed, and only their `related_language` or `related_form` fields. Source entry and sense identities, relation names, raw template arguments, and all other claim fields remained identical. Of the 480 changes, 448 now include a form and 32 carry only a source language because the original argument does not name a form.

The inventory also found **232 `cognate_mention` claims** whose source template has an empty term parameter. Wiktionary documents that as a request for a missing term; the next positional value is only an alternate display form. Those 232 claims correctly remain language-only rather than being converted into links to a form the source did not assert.

I rebuilt the all-pair claim-to-candidate audit against the corrected source export. It still has 20,354 matched evidence rows and 406 ambiguous target identities; no new claims from these three template types matched the current comparison candidates. Candidate categories, comparison scores, and the database are unchanged. This is an extraction-completeness improvement, not a reclassification.

The original source export remains intact. The corrected 1,148,705-claim snapshot is `pipeline/data/etymology_records_relation_targets.jsonl` with SHA-256 `02ed58bc2becfe28a91b828d692904602217d0a248f511260e0aa8da07037739`. Its compact summary is `pipeline/data/source_claim_inventory_relation_targets.json`; both are ignored local artifacts. The refreshed all-pair evidence export has the same 20,354 rows and 406 ambiguous target identities. The full pipeline suite passes 109 tests.

Rebuild and compare the corrected local outputs:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\extract_etymology_records.py --output pipeline\data\etymology_records_relation_targets.jsonl --force
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_claim_inventory.py --source-records pipeline\data\etymology_records_relation_targets.jsonl --output pipeline\data\source_claim_inventory_relation_targets.json --force
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_cognate_coverage.py --source-records pipeline\data\etymology_records_relation_targets.jsonl --comparisons pipeline\data\all_comparisons_separated_translation_evidence.parquet --matches-output pipeline\data\candidate_source_claim_matches_relation_targets.jsonl --force
```

## Use template language arguments for source forms (2026-09-28)

The next full-export scan found that several template normalizers read the source form from argument 2 but assigned the page language as the source language. Wiktionary's template documentation defines argument 1 as the language of the source term for [deverbals](https://en.wiktionary.org/wiki/Template:deverbal/documentation), [clippings](https://en.wiktionary.org/wiki/Template:clipping/documentation), [back-formations](https://en.wiktionary.org/wiki/Template:back-formation/documentation), [abbreviations](https://en.wiktionary.org/wiki/Template:abbreviation/documentation), [acronyms](https://en.wiktionary.org/wiki/Template:acronym/documentation), and [initialisms](https://en.wiktionary.org/wiki/Template:initialism). The same rule applies to the `init` and `acro` aliases. Alternate display text is not used as a source form.

The normalizer now uses that argument for these templates. It only accepts language-code-shaped values in this template family; the raw argument remains in the claim either way. Eight `abbr` records use values such as `2sg`, `q.v.`, or `lit.` in argument 1, so the export leaves their source endpoint unresolved rather than substituting the page language. This is conservative normalization, not a judgment about those words' histories.

The full export still has 710,110 source records, 978,265 source-sense records, and 1,148,705 claims. A line-by-line comparison against the previous corrected export found **210 changed claims in 205 entries**. In 117 existing mapped claims, the target language now follows argument 1; 80 `init` and five `acro` claims now expose their previously missing target fields; eight invalid `abbr` argument values are no longer misread as source languages. Every difference is limited to `related_language` or `related_form`. The relation totals are unchanged.

The refreshed all-pair matcher still has 20,354 rows and 406 ambiguous target identities. It does not use these abbreviation and word-formation relations to alter comparison categories, and the database was not updated. The inventory reports the same 1,053,726 claims with normalized relations and 94,979 records without a normalized relation; many of those are formatting or metadata templates, not missing historical links. The full pipeline suite passes **111 tests**.

The new export is `pipeline/data/etymology_records_source_languages_ordered.jsonl`, SHA-256 `fce0c4f677a8b247feb8bcae4c20c5abb09a8c5cd1628130ab3b8df01fc24340`. Its inventory is `pipeline/data/source_claim_inventory_source_languages.json`. The all-pair join is `pipeline/data/candidate_source_claim_matches_source_languages.jsonl`, SHA-256 `c73f8e332fe445a8d0824bb8f70c704ec2b0b0a8ba77d799295062769448885a`. These are separate ignored artifacts; the earlier snapshots remain available for comparison.

Rebuild the corrected export and audits from the local five-language dumps:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\extract_etymology_records.py --input-dir pipeline\data --languages sv da nb de en --output pipeline\data\etymology_records_source_languages_ordered.jsonl --force
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_claim_inventory.py --source-records pipeline\data\etymology_records_source_languages_ordered.jsonl --output pipeline\data\source_claim_inventory_source_languages.json --force
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_cognate_coverage.py --source-records pipeline\data\etymology_records_source_languages_ordered.jsonl --comparisons pipeline\data\all_comparisons_separated_translation_evidence.parquet --matches-output pipeline\data\candidate_source_claim_matches_source_languages.jsonl --force
```

## Preserve additional word-formation evidence (2026-09-28)

The template inventory exposed further cases where the source extract retained raw arguments but the normalized claim lost a relationship or the kind of formation. Wiktionary documents `bf` as a back-formation template; it defines the `reduplication` source term, the components of a `univerbation` or `contraction`, and source terms for apheretic, apocopic, syncopic, rebracketed, and infixed forms. The [metathesis](https://en.wiktionary.org/wiki/Template:metathesis/documentation) template makes a process claim without requiring a source form. See the documentation for [reduplication](https://en.wiktionary.org/wiki/Template:reduplication/documentation), [univerbation](https://en.wiktionary.org/wiki/Template:univerbation/documentation), [contraction](https://en.wiktionary.org/wiki/Template:contraction/documentation), [apheretic forms](https://en.wiktionary.org/wiki/Template:apheretic_form/documentation), [apocopic forms](https://en.wiktionary.org/wiki/Template:apocopic_form/documentation), [syncopic forms](https://en.wiktionary.org/wiki/Template:syncopic_form), [rebracketing](https://en.wiktionary.org/wiki/Template:rebracketing/documentation), and [infixation](https://en.wiktionary.org/wiki/Template:infix/documentation).

The extractor now normalizes the `bf` alias, the full `reduplication` template, and `univerbation`; it keeps contraction as `contraction_of` with its parts. For phonological or morphological formation types, it records a general `derived_from` source link when a source form is given, plus a separate `formation_type`: `apheresis`, `apocope`, `syncope`, `rebracketing`, or `infixation`. Infix claims also keep the infix in `formation_detail`. Metathesis is recorded as a `formation_type` without inventing an endpoint.

The full export still has 710,110 source entries and 1,148,705 claims. Compared line by line with the previous export, **316 claims in 315 entries changed**. This adds 154 `bf` back-formation claims, 109 direct reduplication claims, 134 univerbation claims, and 180 contraction claims. In addition, 284 claims now have a normalized `derived_from` relation, and 316 claims carry a formation type. Total claims with a normalized relation rise from 1,053,726 before the source-template passes to **1,054,587**. The remaining 94,118 claims without a normalized relation include source templates that express no endpoint or relation, process-only statements, and formatting/metadata templates; they are not a count of unrelated words.

The all-pair candidate audit remains at 20,354 evidence rows and 406 ambiguous target identities. None of the newly linked source forms match a current comparison candidate under the audit's exact language-and-form rule. This adds queryable source evidence but does not alter pair categories, scores, or the live database. The full pipeline suite passes **114 tests**.

The updated ignored source export is `pipeline/data/etymology_records_formation_processes.jsonl`, SHA-256 `90c93a5236d9efe43372b0254ca4bda7968a57d002b134e33b8a268bd7111806`. The inventory is `pipeline/data/source_claim_inventory_formation_processes.json`. The all-pair match file is `pipeline/data/candidate_source_claim_matches_formation_processes.jsonl`, SHA-256 `aa67eafbcc2896b042123bca5fc8c386409fa5ab9591fccc2de69e625d261449`. Earlier snapshots remain available for comparison; no database rows were changed.

Rebuild the latest local artifacts:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\extract_etymology_records.py --input-dir pipeline\data --languages sv da nb de en --output pipeline\data\etymology_records_formation_processes.jsonl --force
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_claim_inventory.py --source-records pipeline\data\etymology_records_formation_processes.jsonl --output pipeline\data\source_claim_inventory_formation_processes.json --force
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_cognate_coverage.py --source-records pipeline\data\etymology_records_formation_processes.jsonl --comparisons pipeline\data\all_comparisons_separated_translation_evidence.parquet --matches-output pipeline\data\candidate_source_claim_matches_formation_processes.jsonl --force
```

## Retain clipping, inflection, and PIE-word links (2026-09-28)

The next scan found three useful templates whose raw arguments were kept but not normalized. Wiktionary defines `clipping of` as a form made by clipping one or more terms, with the language in argument 1 and the source term in argument 2 ([template documentation](https://en.wiktionary.org/wiki/Template:clipping_of/documentation)). `past participle of` links an inflected form to its lemma using the same argument order; Wiktionary explicitly describes it as a definition-line template, not an etymology template ([documentation](https://en.wiktionary.org/wiki/Template:past_participle_of/documentation)). The `PIE word` template identifies a Proto-Indo-European word associated with an entry, using argument 2 for the PIE form, and places it in Wiktionary's "terms derived from Proto-Indo-European words" categories ([template documentation](https://en.wiktionary.org/wiki/Template:PIE_word)).

The extractor now records `clipping of` and its `clip of` alias as `clipped_from`, `past participle of` as `inflectional_form_of`, and `PIE word` as `derived_from` with language `ine-pro` and the reconstructed form prefixed by `*`. A PIE link represents the source's broader derivation claim; it does not prove that the PIE form was the immediate source. An inflection link describes a grammatical form relation, not an etymological descent. Raw template names and arguments remain on every claim.

The full export still has 710,110 source entries and 1,148,705 claims. Compared line by line with the previous export, **823 claims in 778 entries changed**: 59 clipping claims (45 `clipping of`, 14 `clip of`), 42 inflection links, and 722 PIE-word claims. Normalized relation counts rise to **1,055,410**. The all-pair candidate matcher remains exactly **20,354 rows**, with no old or new match IDs; this pass adds inspectable source relationships without changing comparison scores, categories, or the database. The full suite passes **115 tests**.

The new ignored local export is `pipeline/data/etymology_records_source_relations_complete.jsonl`, SHA-256 `d234d59d893b3aa93e3b9955e59ace9f862eb2059e276bf51c26c40ff736f94a`. Its inventory is `pipeline/data/source_claim_inventory_source_relations_complete.json`. The candidate match export is `pipeline/data/candidate_source_claim_matches_source_relations_complete.jsonl`, SHA-256 `3bc2ec6f03c79f2672c65372bc59ba536f55c2dc7dfb0076444782d4deaeb0c86`.

Rebuild these artifacts from the five local Wiktionary-derived dumps:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\extract_etymology_records.py --input-dir pipeline\data --languages sv da nb de en --output pipeline\data\etymology_records_source_relations_complete.jsonl --force
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_claim_inventory.py --source-records pipeline\data\etymology_records_source_relations_complete.jsonl --output pipeline\data\source_claim_inventory_source_relations_complete.json --force
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_cognate_coverage.py --source-records pipeline\data\etymology_records_source_relations_complete.jsonl --comparisons pipeline\data\all_comparisons_separated_translation_evidence.parquet --matches-output pipeline\data\candidate_source_claim_matches_source_relations_complete.jsonl --force
```

## Preserve same-language derivation and source-kind claims (2026-09-28)

The next inventory pass highlighted claims that should not be flattened into cross-language borrowing. Wiktionary defines `from` for derivation within one language and says it works like `mention`, with the language and source form in arguments 1 and 2 ([documentation](https://en.wiktionary.org/wiki/Template:from/documentation)). `internationalism` marks words whose immediate source may be unclear and recommends a more specific borrowed/derived claim when it is known ([template page](https://en.wiktionary.org/wiki/Template:internationalism)). The dump also contains the short `intnat` template; its recorded expansions say “Internationalism,” so it is normalized to the same source label while the original template and arguments remain intact. Wiktionary's sound-symbolism category explicitly distinguishes sound-symbolic words from strict onomatopoeia ([category definition](https://en.wiktionary.org/wiki/Category:Sound-symbolic_terms_by_language)).

The extractor now records `from` as a same-language `derived_from` edge. `internationalism` and `intnat` receive `diffusion_type: internationalism` without an invented donor edge. `sound-symbolic` receives `formation_type: sound_symbolic`, with its optional `title` retained as `source_label`; it stays distinct from the existing `onomatopoeic` value.

Compared line by line with the preceding source export, **396 claims in 392 entries changed**: 124 `from` links gained `derived_from` and same-language targets; 219 claims gained the internationalism diffusion label; 53 sound-symbolic claims gained their own process value, including 24 source labels. The full export has 710,110 source entries, 1,148,705 claims, and **1,055,534 claims with normalized relations**. The all-pair claim join remains exactly **20,354 match IDs** (no additions or removals), and comparison scores, categories, and live database rows are unchanged. The full suite passes **116 tests**.

The refreshed ignored export is `pipeline/data/etymology_records_source_claim_kinds.jsonl`, SHA-256 `511ba4c8c84cb3745729ac7b145b631f7f22a227ce0a733dca3e962ac6a624a5`. Its inventory is `pipeline/data/source_claim_inventory_source_claim_kinds.json`. The candidate match export is `pipeline/data/candidate_source_claim_matches_source_claim_kinds.jsonl`, SHA-256 `f623128143716b7f6e8a46d972f955ed645f3ba01d263ae6a31408de029ecf37`.

Rebuild the local artifacts:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\extract_etymology_records.py --input-dir pipeline\data --languages sv da nb de en --output pipeline\data\etymology_records_source_claim_kinds.jsonl --force
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_claim_inventory.py --source-records pipeline\data\etymology_records_source_claim_kinds.jsonl --output pipeline\data\source_claim_inventory_source_claim_kinds.json --force
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_cognate_coverage.py --source-records pipeline\data\etymology_records_source_claim_kinds.jsonl --comparisons pipeline\data\all_comparisons_separated_translation_evidence.parquet --matches-output pipeline\data\candidate_source_claim_matches_source_claim_kinds.jsonl --force
```

## First linked CLDF Generic case export (2026-09-28)

The existing nine-case source-linked slice now has a normalized CLDF Generic preview. Generic is useful here because the project-specific tables can keep historical claims, component analyses, comparison observations, and pipeline interpretations separate without pretending every row is a cognate judgment. CLDF describes Generic as imposing no requirements on table or column content, while its metadata still declares the table schemas and links.

The local output directory is `pipeline/data/cldf_case_evidence_dercat_fix/`. It contains:

| Table | Rows | Purpose |
| --- | ---: | --- |
| `languages.csv` | 5 | Language identifiers and names |
| `entries.csv` | 32 | Source entries with stable export IDs and page links |
| `senses.csv` | 121 | Entry-linked source sense IDs and glosses |
| `forms.csv` | 37 | The comparison-side forms and exact or unresolved sense identities |
| `source-claims.csv` | 211 | Directed source claims and their template evidence |
| `component-links.csv` | 14 | Compound-component forms and all candidate entry matches |
| `comparisons.csv` | 24 | Unique unordered pairs and computed similarity observations |
| `claim-matches.csv` | 19 | Links between a source claim and a candidate comparison |

Eighteen claim matches have an available target identity; one remains ambiguous. The tables retain the old candidate and root-match outputs under `Legacy_` field names. The manifest records the source-slice hash, upstream input hashes, original five Kaikki dump hashes, and every CSV hash. The output is ignored local data; the repo contains only its exporter and test. No live database rows changed.

The 19 matched source claims cross the old display labels: seven `borrowed_from` claims match `other` pairs, and five `cognate_mention` claims match `other` pairs (one target is ambiguous). A borrowing claim also matches a `partial_cognate` pair and a `true_cognate` pair. The regenerated manifest reports this label-by-claim matrix so it can be recomputed from the tables. It reinforces that the display label cannot stand in for source history.

The exporter checks stable table IDs and every declared foreign key. The focused tests pass. The environment does not include `pycldf`, so this is not yet verified by the official CLDF validator. Wiktionary-derived gloss and claim fields retain their source page URLs; the preview selects CC BY-SA 4.0 and records the source attribution. Review the terms and metadata before publishing a larger dataset.

Rebuild the export after regenerating the case slice:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\export_case_evidence_cldf.py --force
```

The official [CLDF specification](https://github.com/cldf/cldf) defines Generic datasets as a way to describe custom tables in CLDF metadata. Wiktionary’s [copyright page](https://en.wiktionary.org/wiki/Wiktionary:Copyrights) describes its dual CC BY-SA/GFDL licensing.

The same case slice exposes a classifier artifact. `classifier.py` calls an equal-root pair `partial_cognate` whenever `semantic_sim < 0.75`; it does not look for partial component correspondence. In the corrected full snapshot this accounts for **9,270 directed rows / 4,635 unordered pairs**, all below the threshold. Three rows of the small case slice receive this label, including Danish/Norwegian Bokmål *kurv*. Keep the old values for comparison, but do not present this as source-backed partial cognacy. The next taxonomy change should preserve the underlying scores and source paths separately before deciding what to display or query.

## Ignore `dercat` language lists during root extraction (2026-09-28)

Wiktionary documents [`dercat`](https://en.wiktionary.org/wiki/Template:dercat) as a compact categorization template: its numbered parameters list language codes in a descent chain and may omit early historical steps. They are not ancestor-form parameters. The root extractor previously looked for a known ancestral-language code in those same argument positions, so German *Ente* could receive `Proto-Germanic *ine-pro` even though the actual ancestor template records Proto-West Germanic `*anad`.

The parser now skips `dercat` while searching for ancestor forms. A regression test for German *Ente* verifies that the actual `inh`/`der` templates yield `Proto-West Germanic *anad`. The focused parser tests pass, and the full pipeline suite passes **121 tests**.

I rebuilt the five lemma tables and the comparison dataset to separate local files; the working baseline and live database remain unchanged. The five lemma tables still contain **720,407 rows**. The previous 223 language-code “roots” are all gone; **275** lemma root fields changed in total, including legitimate conflicts that now remain blank. Lemmas with a scalar root decreased from **64,362 to 64,289**.

The old and corrected comparison snapshots contain the same **1,638,454 directed rows and pair identities**. Root-based relation changes affect **108 rows / 54 unique pairs**: 92 `unknown` → `cognate` and 16 `cognate` → `unknown`. The number of equal-root rows rises from **24,872 to 24,948**. Candidate labels change on 106 directed rows:

| Label transition | Directed rows |
| --- | ---: |
| `other` → `true_cognate` | 52 |
| `translation_pair` → `true_cognate` | 10 |
| `true_cognate` → `other` | 12 |
| `other` → `partial_cognate` | 28 |
| `partial_cognate` → `other` | 4 |

The corrected candidate distribution is 14,860 `true_cognate`, 9,270 `partial_cognate`, 1,145,898 `other`, 106,546 `translation_pair`, and 361,880 `false_friend`. These are generated candidate rows, not shares of vocabulary. Semantic-score values differ at floating-point scale in the two builds (188,616 rows, maximum absolute difference **0.00000155**); orthographic and phonetic scores are unchanged. No score differs by more than 0.00001. Preserve that as a reproducibility detail, not a linguistic result.

The exact-first source-claim crosswalk retains **all 20,188 match IDs**: 18,500 exact target-form matches and 1,688 case-fold fallbacks. But 36 evidence rows across 27 unique pairs have a different candidate label after the root repair. Twenty-six pairs carry a `cognate_mention` claim and one carries a `borrowed_from` claim. That is entry-linked source evidence, not independent verification or proof that the claim belongs to the selected sense.

Three examples show why the parser fix is useful and why it does not solve the whole taxonomy:

- German *gut* – Danish *god*: the old German root was the bogus code `Proto-Germanic *ine-pro`; the corrected root is `Proto-Germanic *gōdaz`, matching Danish. Both Wiktionary entries explicitly list one another as cognates. This is a clear repair to the extracted source evidence.
- Danish *arbejde* – Swedish *arbete*: the old shared `Proto-West Germanic *gem-pro` came from `dercat`. The corrected scalar roots are blank because the structured history instead records Middle Low German and Old Saxon forms. That leaves the pair unresolved at this root field; it does not establish unrelatedness.
- Danish *kurv* – Norwegian Bokmål *kurv*: the Bokmål entry says it is borrowed from Danish *kurv*. Both point to Proto-West Germanic `*korb`, while the selected senses are Danish “basket” and Bokmål “the contents of a basket.” Their semantic score is 0.748805, so the current rule calls the pair `partial_cognate` and the shared root makes its separate origin field say `cognate`. This exposes two problems beyond `dercat`: direct borrowing is being collapsed into a cognate label, and a semantic threshold is being used to name “partial cognacy.” Keep the borrowing path, common ancestry evidence, sense alignment, and similarity observation as separate data.

I added these three groups to the existing case-slice builder and regenerated it against the corrected snapshot. The nine groups now contain **48 comparison rows**, **32 case-level source-entry records**, **19 pair-claim matches**, and **7 component links**. The new cases retain exact active-sense links to the entry-level claims above. The local artifact is `pipeline/data/named_case_evidence_slice_dercat_fix.jsonl`, SHA-256 `03560db766d5c1f0b7281f276410883cfaeb96064a24e72f3e9327ece4fa477b`; its manifest records all input hashes and the per-case counts. The full pipeline suite passes **121 tests**, including recognition of the three added case groups.

Rebuild the source-linked case slice:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\build_case_evidence_slice.py --comparisons pipeline\data\all_comparisons_dercat_fix.parquet --source-records pipeline\data\etymology_records_source_origin_status.jsonl --claim-matches pipeline\data\candidate_source_claim_matches_dercat_fix.jsonl --component-candidates pipeline\data\component_entry_candidates_source_identity.jsonl.gz --output pipeline\data\named_case_evidence_slice_dercat_fix.jsonl --force
```

## Shared-component overlap case slice (2026-09-28)

The shared-component audit overlapped four of the 4,635 unordered comparisons currently labeled `partial_cognate`: Danish–Swedish *oversætte/översätta*, Danish–Swedish *ramsløg/ramslök*, German–English *berauben/bereave*, and German–English *Stieftochter/stepdaughter*. Their legacy labels result from equal extracted roots plus `semantic_sim < 0.75`; the classifier does not inspect components. Each pair's selected source senses overlap exactly with the corresponding Wiktionary entry senses.

The pair records have similarity values of 0.713, 0.342, 0.616, and 0.494, respectively. The Danish and Swedish *ramsløg/ramslök* senses are glossed “ramson” and “ramsons, Allium ursinum,” yet the embedding score is 0.342. This is a concrete reason to inspect sense alignment and gloss scoring separately from origin evidence; it does not justify manually replacing the category.

The source and component records reveal several different structures:

- Both *oversætte* entries trace the whole form through Middle Low German and Old Saxon to Proto-West Germanic `*ubarsattjan`. Separate component claims match Danish *sætte* and Swedish *sätta* at Proto-Germanic `*satjaną`.
- Both *ramsløg* entries trace the first element through Middle Low German *ramese* to Proto-West Germanic `*hramusō`; their final components *løg/lök* share the Proto-Germanic `*laukaz` candidate. The source component records also carry a `gmq-pro` rune-form claim. Keep that form as recorded and inspect it before treating it as a distinct useful relationship.
- *Berauben/bereave* both record Proto-Germanic `*biraubōną` for the whole word and *be-* formations. Their *be-* components share the `*bi-` candidate.
- *Stieftochter/stepdaughter* both record Proto-Germanic `*steupaduhtēr` for the whole word and a prefix-plus-daughter formation. Their prefixes share the Proto-West Germanic `*steupa-` candidate.

This shows why `partial_cognate` is currently a misleading name for the classifier output: it means a shared extracted root with a low embedding score, not a finding that only part of a word is cognate. It also demonstrates useful overlapping evidence in one pair: a whole-word path, a component formation, and a computed semantic score should remain separate records.

The source-linked case builder now includes exact source records for comparison entries and candidate component entries, plus the projected shared-component ancestor records. The CLDF Generic preview exports 5 languages, 79 unique entries, 262 senses, 45 comparison forms, 520 source claims, 30 component links, 12 shared-component ancestor candidates, 28 unordered comparisons, and 25 claim matches. Candidate-entry resolution counts are 27 fully resolved, one partially resolved, one unresolved, and one with no candidate keys. The remaining candidate keys stay in the export even when their source entry could not be included. Every shared-ancestor use resolves to exported parent and component entries. These resolution counts are export coverage, not relationship confidence.

The 12 ancestor rows include the four new comparison pairs and an additional German *Sandbank*–Norwegian Bokmål *sandbanke* component match at Proto-Germanic `*samdaz`. Multiple rows for the same ancestor reflect the audit's two candidate-generation bases (`unique_exact_entry_only` and `unique_exact_entry_without_peer_source_recorded`), not independent evidence. The rows are projected candidates, not reviewed component cognate sets or whole-word classifications.

The generated slice is `pipeline/data/named_case_evidence_slice_dercat_fix.jsonl`, SHA-256 `c0f51f30a55ca45a321c97ab4d0dde5da9d945c3317c19f7dedcd2672720834b`. Its manifest records the five input hashes, including the source component candidate and shared-ancestor files. The ignored CLDF Generic preview is `pipeline/data/cldf_case_evidence_dercat_fix`; it contains a new `shared-component-ancestor-candidates.csv` table and retains the component entries' own source claims. The exporter verifies stable table IDs and declared CSV foreign keys, and a local check confirms the component IDs stored in JSON fields resolve. The official CLDF validator is not installed and has not been run. The full pipeline suite passes **124 tests**. No comparison categories or live database rows changed.

Rebuild both artifacts from the recorded local snapshots:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\build_case_evidence_slice.py --comparisons pipeline\data\all_comparisons_dercat_fix.parquet --source-records pipeline\data\etymology_records_source_origin_status.jsonl --claim-matches pipeline\data\candidate_source_claim_matches_dercat_fix.jsonl --component-candidates pipeline\data\component_entry_candidates_source_identity.jsonl.gz --shared-ancestor-candidates pipeline\data\component_shared_ancestor_candidates_source_identity.jsonl.gz --output pipeline\data\named_case_evidence_slice_dercat_fix.jsonl --force
pipeline\.venv\Scripts\python.exe pipeline\src\export_case_evidence_cldf.py --force
```

## Reproduce low semantic scores in the component cases (2026-09-28)

I re-encoded the stored glosses with the current `SemanticMatcher` default, `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, and reran the same `align_pair_senses` function used to build the comparison artifact. The current scores reproduce to floating-point precision:

| Pair | Stored score | Recomputed with source-aware alignment | Selected glosses |
| --- | ---: | ---: | --- |
| *oversætte/översätta* | 0.7132165 | 0.7132165 | “to translate” / “to translate; to change from one language to another, usually written text” |
| *ramsløg/ramslök* | 0.3421778 | 0.3421779 | “ramson” / “ramsons, Allium ursinum” |
| *berauben/bereave* | 0.6162728 | 0.6162729 | “to deprive” / “To take away someone or something that is important or close; deprive.” |
| *Stieftochter/stepdaughter* | 0.4944662 | 0.4944662 | “stepdaughter” / “The daughter of one's spouse from a previous relationship.” |

The current default model reproduces the stored values for these examples; no score mismatch appeared. The original embedding revision is not recorded, so this does not prove which exact checkpoint produced the historical file. For *berauben/bereave*, dropping the source-translation sense restriction changes the best active English gloss to “To deprive by or as if by violence; to rob; to strip.” and raises the score to 0.624. Reapplying the recorded English source-sense reference reproduces 0.616. That restriction is part of the meaning of the stored observation, not a change in the embedding itself.

The existing Danish–Norwegian Bokmål *kurv* case scores **0.7488054**, only 0.0012 below the classifier cutoff. Its selected glosses are “basket” and “the contents of a basket; an amount that a basket holds.” This makes the cutoff's category consequence especially sensitive to small score differences. The four new cases also show that the cutoff's output `partial_cognate` is not a component-cognacy result: it follows equal roots plus a score under 0.75.

No score bug was reproduced. The remaining problem is interpretive and reproducibility-related: an embedding score is being used to split a historical label, while the comparison output has no recorded model revision or explicit score-level field describing whether source-sense evidence restricted alignment. A separate `translation_source_senses` field can explain that restriction when the link exists. The case CLDF export keeps source entries, their claims, component candidates, and similarity observations distinct, but its legacy label remains exactly that: legacy output. Do not relabel the full 4,635 unordered pairs from these selected examples.

Next, add a comparison-build manifest with the model revision and a direct record of the sense restriction used for alignment, then test a replacement for `partial_cognate` against the current case slice. Keep the data rule separate from the presentation label and preserve the existing score as an observation.

## Preserve the scope of source-claim matches (2026-09-28)

The *fleece* source trace confirms that Swedish records `borrowed_from(en, fleece)` while English separately records its inherited path to Proto-West Germanic `*fleus`. The Swedish claim names a source entry and a related form; it does not specify a target sense. The comparison's selected English textile sense is useful context, but should not look like part of the source's borrowing claim.

The CLDF export now records `Claim_Source_Scope=entry` and derives `Claim_Target_Scope` from the normalized claim target (`form`, `entity`, `components`, `language`, or `none`). In this 520-claim slice, 458 target forms, 17 component lists, two language-only derivations, and 43 claims with no normalized target are represented. Normalized entity and component references are retained as JSON. The linked selected senses are named `Comparison_Source_Sense_ID` and `Comparison_Target_Sense_ID`, with metadata descriptions that say they are comparison context. This is a representation correction; it does not change the source claim, candidate classification, similarity score, or live database. The rebuilt case preview retains the same 5 languages, 79 entries, 262 senses, 45 forms, 520 source claims, 30 component links, 12 shared-component ancestor candidates, 28 comparisons, and 25 claim matches.

The local snapshots and manifests are:

- `pipeline/data/all_comparisons_dercat_fix.parquet`, SHA-256 `1d85f6f65f3ca45d11a95065998c929fa21b3e8bc5e03408be29377ad26267b9`.
- `pipeline/data/candidate_source_claim_matches_dercat_fix.jsonl`, SHA-256 `e832299fa8ae9cd17e991d1f770f3b047a1ee4f2e72bc30a167771bd1b890889`.
- The crosswalk manifest records the source-export, comparison, generator, and output hashes. These generated files are ignored local artifacts, not release inputs.

Rebuild the corrected comparison and evidence crosswalk from the five rebuilt lemma tables and the preserved source export:

```powershell
foreach ($lang in @("sv", "da", "nb", "de", "en")) {
    pipeline\.venv\Scripts\python.exe pipeline\src\parser.py --input "pipeline\data\kaikki_$lang.jsonl" --output "pipeline\data\lemmas_dercat_fix\lemmas_$lang.parquet" --lang $lang
}
pipeline\.venv\Scripts\python.exe pipeline\src\build_crosslingual_dataset.py --lemma-dir pipeline\data\lemmas_dercat_fix --output pipeline\data\all_comparisons_dercat_fix.parquet
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_cognate_coverage.py --source-records pipeline\data\etymology_records_source_origin_status.jsonl --comparisons pipeline\data\all_comparisons_dercat_fix.parquet --matches-output pipeline\data\candidate_source_claim_matches_dercat_fix.jsonl --force
```

The parser fix is supported by both a clear source-template definition and the entry-level claims on the changed cases. Next, review the 54 changed pairs and the loan/cognacy distinction before promoting the snapshot. Do not bulk-relabel candidates or infer vocabulary-wide cognate percentages from this rebuild.

## Source claims overlap current candidate labels (2026-09-28)

I added a deduplicated source-claim-by-candidate-label matrix to the existing crosswalk manifest. It counts unique exact-form candidate pairs with at least one matched source claim, once per pair and claim type; relation types overlap. The corrected snapshot has **20,188 evidence rows** across **17,594 unique candidate pairs**. Those links are entry-level source statements joined to active comparison identities; they are not independent verification, and a source-entry claim is not automatically sense-specific.

| Current candidate label | Pairs with any matched source claim | `cognate_mention` | `borrowed_from` | `inherited_from` | `noncognate_mention` |
| --- | ---: | ---: | ---: | ---: | ---: |
| `false_friend` | 166 | 62 | 70 | 0 | 0 |
| `other` | 13,609 | 6,530 | 4,772 | 136 | 72 |
| `partial_cognate` | 1,494 | 1,346 | 88 | 15 | 0 |
| `translation_pair` | 514 | 385 | 9 | 0 | 15 |
| `true_cognate` | 1,811 | 1,543 | 101 | 109 | 0 |

These counts show why the display label cannot be the relationship taxonomy. `cognate_mention` is linked to **62 `false_friend` candidates**, which is consistent with “misleading modern meanings” and shared history being separate questions. `borrowed_from` occurs under every display label, including **101 `true_cognate`** and **88 `partial_cognate`** candidates. A pair can have an explicit loan path as well as a shared deeper root. **132 pairs** have more than one distinct matched source-claim type.

The `partial_cognate` label is especially misleading: `classifier.py` currently assigns it when roots match but semantic similarity is below 0.75. That is a meaning-similarity threshold, not evidence that only part of a word is cognate. Keep the score as an observation; reserve partial cognacy for component-level correspondences that the data actually identifies.

This is a bounded crosswalk, not a complete audit of the candidate population. It can show which current labels coexist with linked source claims; it cannot estimate the share of a language's words that are loans or cognates. The new manifest field is `unique_candidates_with_source_claim_by_category_and_relation`; regenerate it with the crosswalk command above.

## Prefer exact target forms and keep active-sense evidence (2026-09-28)

The candidate-to-source-claim audit previously used case-folded spellings as its only join key. That can merge distinct capitalized and lowercase entries when both exist. German *platt* (“flat”) and *Platt* (“Low German”) show why the distinction matters: English *plat* explicitly mentions German *platt* as a cognate, but the old crosswalk also attached that claim to the capitalized German noun. The audit now prefers an exact target spelling and uses case-fold matching only when there is no exact-form candidate for that source entry. It records which method matched each row.

The crosswalk now carries the active comparison senses' glosses and extracted roots alongside their IDs. Its manifest records the generator's file hash as well as source and comparison input hashes, so a local artifact can be tied to both data and transformation code. No comparison labels or database rows were changed.

On the current five-language inputs, the regenerated crosswalk has **20,188 evidence rows**: 18,500 exact-form matches and 1,688 case-fold fallbacks. It covers **17,594 unique candidate pairs**, with 405 target identities still ambiguous. Of these, **13,623** are `other` candidates, among 572,981 `other` form pairs. These are source-entry claim links, not pair-level verdicts.

The root fields on **7,252 `cognate_mention` evidence rows** attached to `other` candidates expose another structural limitation: only 9 rows have equal recorded roots; 1,485 have roots recorded at different language levels, 755 have different roots at the same level, and 5,003 have at least one missing root. These are counts of selected active-sense evidence rows, not confirmed cognate counts. Different root levels and missing roots do not establish unrelatedness.

English adjective *plat* and German adjective *platt* are a concrete case. The selected source senses gloss “flat” and “flat; level.” English Wiktionary explicitly lists German *platt* as a cognate, with “flat” as the gloss. The active English root field is Proto-Indo-European `*pleth₂-`; the German root field is Ancient Greek `πλατύς`. The English entry marks the deeper connection as uncertain/possible, so preserve the source claim and both paths without converting this one claim into automatic proof. The current candidate remains `other` / `unknown`; the mismatch makes it a good test for representing more than one point in an etymological path.

Rebuild the local crosswalk from the preserved exports:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_cognate_coverage.py --source-records pipeline\data\etymology_records_source_origin_status.jsonl --comparisons pipeline\data\all_comparisons_separated_translation_evidence.parquet --matches-output pipeline\data\candidate_source_claim_matches_source_origin_status.jsonl --force
```

## Preserve source distinction between unknown and uncertain origins (2026-09-28)

Wiktionary distinguishes two source status markers that our export previously left as untyped templates. `unknown` (shortcut `unk`) marks an etymology as unknown; `uncertain` (shortcut `unc`) marks an etymology as uncertain ([unknown template](https://en.wiktionary.org/wiki/Template:unknown), [uncertain template](https://en.wiktionary.org/wiki/Template:uncertain)). These markers describe the source editor's status for an entry's history; they do not imply that the entry contains no proposed paths or cognate mentions. For example, Swedish *torta* begins with “Unknown” and then lists Norwegian and Danish cognate forms.

The extractor now preserves this distinction as `source_etymology_status: unknown` or `source_etymology_status: uncertain`. The field records Wiktionary's template-level assessment; it does not state that our project verified the history or that a comparison pair belongs in a particular category. A separate cognate, borrowing, or derivation claim may coexist with the marker. Customized template wording is retained as `source_label`, with the raw template arguments still available.

Across the full export, the four template names produce **1,833 unknown claims** and **1,652 uncertain claims** (3,485 total). They add no relation endpoints and do not change the 1,055,534 normalized relation count, the 20,354 pair-claim match IDs, candidate scores, categories, or database rows. The full suite passes **117 tests**.

The ignored local export is `pipeline/data/etymology_records_source_origin_status.jsonl`, SHA-256 `717e04e01608216d3d00bd8eab63c65f28a28fb587a7fe73148429532cf6d961`. The matching evidence file is `pipeline/data/candidate_source_claim_matches_source_origin_status.jsonl`, SHA-256 `8e02b7e71966b83de73d04fbb11e641cb603f1b4a02f09ef49d1098ba0040b10`.

Rebuild these local artifacts:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\extract_etymology_records.py --input-dir pipeline\data --languages sv da nb de en --output pipeline\data\etymology_records_source_origin_status.jsonl --force
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_claim_inventory.py --source-records pipeline\data\etymology_records_source_origin_status.jsonl --output pipeline\data\source_claim_inventory_source_origin_status.json --force
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_cognate_coverage.py --source-records pipeline\data\etymology_records_source_origin_status.jsonl --comparisons pipeline\data\all_comparisons_separated_translation_evidence.parquet --matches-output pipeline\data\candidate_source_claim_matches_source_origin_status.jsonl --force
```

## Link origin-status claims to active candidates (2026-09-28)

The source status labels are now joined to active comparison senses by exact source-entry identity. The output distinguishes an exact active-sense overlap from a status attached to the same entry but outside the selected sense. The status remains attached to the source etymology; it does not become a pair-level verdict.

Of the **1,833 `unknown` status claims**, 865 link to at least one active candidate source entry; 968 do not. Of the **1,652 `uncertain` claims**, 832 link and 820 do not. A linked source claim can fan out to many candidate pairs: the audit produced **8,986 evidence rows**, all with exact active-sense overlap, covering **4,518 unique candidate pairs** with an `unknown` status and **4,365** with an `uncertain` status. Candidate counts by current label are:

| Current candidate label | Unknown status | Uncertain status |
| --- | ---: | ---: |
| `other` | 3,129 | 3,210 |
| `false_friend` | 1,042 | 760 |
| `translation_pair` | 336 | 368 |
| `partial_cognate` | 4 | 14 |
| `true_cognate` | 7 | 13 |

The evidence-row total is larger than the unique-pair total because a candidate can link to more than one active source sense or status claim. Source-claim counts, pair counts, and evidence-row counts are different measures. Unlinked status claims have no active candidate entry under the current join; that does not mean they lack a relationship or are unrelated. Both source statuses occur alongside every current candidate label. They report source etymology status; neither determines whether a candidate is a cognate, a borrowing, a translation, or a misleading form match.

At the source-record level, **790 of 1,823** records marked `unknown` and **1,168 of 1,649** marked `uncertain` also contain at least one normalized relationship claim. This counts structured claims in the same exported record, not every relation stated in prose. It confirms that these status markers cannot be treated as “no relationship claim”; Swedish *torta* is one visible example.

The most common co-occurring relation types are:

| Relation in the same source record | `unknown` records | `uncertain` records |
| --- | ---: | ---: |
| `derived_from` | 402 | 713 |
| `cognate_mention` | 366 | 651 |
| `inherited_from` | 206 | 464 |
| `borrowed_from` | 129 | 183 |
| `formed_from` | 75 | 171 |
| `noncognate_mention` | 44 | 112 |

These counts overlap: a record can contain several relation types. They show that a source can leave an ultimate etymology uncertain while still recording a nearer derivation, borrowing, comparison, or formation path. That is useful granularity to preserve, not a contradiction to resolve by choosing one category.

The Swedish *torta* entry is a useful sense-identity test. It marks the origin `Unknown`, then lists Norwegian and Danish cognates; structured templates retain `no:turt` and `da:turt`, while the full source text also names other Norwegian forms including *tort*. Our `nb:tort` candidate is a distinct entry sense meaning a legal offense, recorded as borrowed from French and ultimately Latin. So the word-form mention should not by itself override the candidate's sense-level comparison. It also exposes two transformation questions for later work: how to preserve the untemplated form list and how to relate the source's Norwegian code `no` to the project's Norwegian Bokmål records without implying exact variety identity. Source entries: [Swedish *torta*](https://en.wiktionary.org/wiki/torta#Swedish) and [Norwegian Bokmål *tort*](https://en.wiktionary.org/wiki/tort#Norwegian_Bokm%C3%A5l).

The reproducible artifact is `pipeline/data/source_origin_status_matches.jsonl` with manifest `pipeline/data/source_origin_status_matches.jsonl.manifest.json`. The source export hash is `717e04e01608216d3d00bd8eab63c65f28a28fb587a7fe73148429532cf6d961`; the comparison snapshot hash is `0d7a686246b261a7d44ac75b596714bd8b68b5c2c3b53264e888d427905866c1`; the match file hash is `4c0573d4da810b7e2479553d0c5be2454ad129764e2e39c4f1bdba042924de13`. Each row carries the matched source sense's Wiktionary glosses as well as its ID.

Rebuild the local crosswalk:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_origin_status_coverage.py --source-records pipeline\data\etymology_records_source_origin_status.jsonl --comparisons pipeline\data\all_comparisons_separated_translation_evidence.parquet --output pipeline\data\source_origin_status_matches.jsonl --force
```

The full pipeline suite passes **118 tests**. No pair labels or live database rows changed.

## Source claims within the `other` candidate bucket (2026-09-28)

The refreshed source-claim join has **20,354 evidence rows** across **17,753 exact-case candidate form pairs**. Of those, **13,738** pairs currently marked `other` have at least one source-entry claim whose language and form match the paired entry. The other bucket contains **572,981 unique exact-case candidate form pairs** in this candidate build; 559,243 have no match under this exact entry-claim join.

Among the 13,738 matched `other` pairs, source claims give these overlapping evidence facets:

| Source claim | Exact candidate pairs |
| --- | ---: |
| Cognate mention | 6,575 |
| Borrowed from | 4,828 |
| Derived from | 1,832 |
| Calque of | 321 |
| Inherited from | 136 |
| Noncognate mention | 72 |
| Semantic loan from | 31 |
| Partial calque of | 27 |
| Pseudo-loan based on | 16 |
| Influenced by | 2 |

The counts overlap: **102 pairs have more than one distinct claim type**. These are claims attached to Wiktionary entries, not independently verified relations for a selected sense. They show why `other` cannot serve as a linguistic category and why one exclusive relation field loses useful distinctions. They do not justify migrating the matched pairs into cognate, loan, or false-cognate labels by themselves. The remaining pairs have no match under this narrow join; that is missing linked evidence, not evidence of unrelatedness.

The refreshed file `pipeline/data/candidate_source_claim_matches_source_claim_kinds.jsonl` has 20,354 rows and the same match IDs as the prior export. This breakdown describes the current candidate build and exact-form join, not vocabulary-wide coverage.

## Preserve same-language derivation and source-kind claims (2026-09-28)

The next inventory pass highlighted claims that should not be flattened into cross-language borrowing. Wiktionary defines `from` for derivation within one language and says it works like `mention`, with the language and source form in arguments 1 and 2 ([documentation](https://en.wiktionary.org/wiki/Template:from/documentation)). `internationalism` marks words whose immediate source may be unclear and recommends a more specific borrowed/derived claim when it is known ([template page](https://en.wiktionary.org/wiki/Template:internationalism)). The dump also contains the short `intnat` template; its recorded expansions say “Internationalism,” so it is normalized to the same source label while the original template and arguments remain intact. Wiktionary's sound-symbolism category distinguishes words that use sound symbolism from strict onomatopoeia ([category definition](https://en.wiktionary.org/wiki/Category:Sound-symbolic_terms_by_language)).

The extractor now records `from` as a same-language `derived_from` edge. `internationalism` and `intnat` receive `diffusion_type: internationalism` without an invented donor edge. `sound-symbolic` receives `formation_type: sound_symbolic`, with its optional `title` retained as `source_label`; it stays distinct from the existing `onomatopoeic` value.

Compared line by line with the preceding source export, **396 claims in 392 entries changed**: 124 `from` links gained `derived_from` and same-language targets; 219 claims gained the internationalism diffusion label; 53 sound-symbolic claims gained their own process value, including 24 source labels. The full export has 710,110 source entries, 1,148,705 claims, and **1,055,534 claims with normalized relations**. The all-pair claim join remains exactly **20,354 match IDs** (no additions or removals), and comparison scores, categories, and live database rows are unchanged. The full suite passes **116 tests**.

The refreshed ignored export is `pipeline/data/etymology_records_source_claim_kinds.jsonl`, SHA-256 `511ba4c8c84cb3745729ac7b145b631f7f22a227ce0a733dca3e962ac6a624a5`. Its inventory is `pipeline/data/source_claim_inventory_source_claim_kinds.json`. The candidate match export is `pipeline/data/candidate_source_claim_matches_source_claim_kinds.jsonl`, SHA-256 `f623128143716b7f6e8a46d972f955ed645f3ba01d263ae6a31408de029ecf37`.

Rebuild the local artifacts:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\extract_etymology_records.py --input-dir pipeline\data --languages sv da nb de en --output pipeline\data\etymology_records_source_claim_kinds.jsonl --force
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_claim_inventory.py --source-records pipeline\data\etymology_records_source_claim_kinds.jsonl --output pipeline\data\source_claim_inventory_source_claim_kinds.json --force
pipeline\.venv\Scripts\python.exe pipeline\src\audit_source_cognate_coverage.py --source-records pipeline\data\etymology_records_source_claim_kinds.jsonl --comparisons pipeline\data\all_comparisons_separated_translation_evidence.parquet --matches-output pipeline\data\candidate_source_claim_matches_source_claim_kinds.jsonl --force
```
# Resolve form-level source claims to local target entries (2026-09-28)

The case-slice audit `pipeline/src/audit_case_claim_target_entries.py` scans the five local Kaikki/Wiktextract dumps (`da`, `de`, `en`, `nb`, `sv`) for each distinct source claim with a related form. It preserves all exact spelling matches, including separate parts of speech and etymology sections, along with source entry keys, source URLs, etymology text, senses, and normalized claims. Case-folded candidates are a fallback only when no exact spelling exists. This resolves candidate entries, not target senses.

In the initial 13-case slice, the manifest reported **495 distinct form-level claims**: **78** with exact target entries, **415** whose language codes were not represented by the five dumps, and **2** without a matching spelling in the recorded dump. The exact matches produced **152 candidate-entry links** across **105 unique candidate entries**. No case-fold-only match occurred. These historical figures describe only that selected slice; they are not vocabulary coverage, relationship accuracy, or a language-pair cognate rate. The expanded 15-case totals are in the later multi-target section.

Among the **78** exact-form claims, **49** are whole-entry claims and **29** are component-only claims in their case context. Twenty whole-entry claims and 14 component claims have multiple target entries. A single candidate entry may itself contain multiple senses, so these counts do not establish sense identity.

The *fleece* and *clown* claims each match both English noun and verb entries. The target noun and verb entries record the same histories, so their wording does not resolve the claim to one grammatical entry; the comparison's selected sense cannot break the tie. Swedish *bank* has a `derived_from(de, Bank)` claim, but German *Bank* has two numbered etymologies (one traced to Proto-West Germanic `*banki`, another described as semantically after Italian *banco/banca*). The claim names only `Bank`, leaving its intended target etymology unresolved. These cases show that target-side text can preserve useful history without identifying the entry or sense meant by a form-level claim.

A reverse-claim scan compared each exact target candidate's normalized claims with the source entry's language and spelling. **29 of 78** claim rows have at least one exact language-and-form match in the target side: 24 are cognate-mention rows (16 whole-entry, eight component), four are doublet rows (two whole-entry, two component), and one is a component borrowing claim whose target entry mentions the source as a cognate. Across candidates, the corresponding relation-pair observations are 37 `cognate_mention`/`cognate_mention`, six `borrowed_from`/`cognate_mention`, and seven `doublet_of`/`doublet_of`. No whole-entry borrowing claim has an exact reverse claim, which is consistent with the direction of borrowing. These are internal Wiktionary cross-references, not independent verification; the relation pairs do not all assert the same kind of path. The other 49 rows have no exact reverse claim, which is missing reciprocal evidence rather than evidence against the source claim.

The first pass counted 12 component-related reverse rows by entry key alone. That mis-scoped the Swedish *bank* source entry across cases: it is a component in *bankman* and a whole-word entry in the separate *bank* case. Rejoining by case and source-entry key yields **11 component-only** reverse rows.

The Danish *berøve* target resolves locally. The equivalent Norwegian claim uses code `no`, while the available dump is Bokmål `nb`, so the result is correctly `language_not_indexed`; the two varieties must not be silently equated. Two unmatched forms are literal `-` values in source cognate templates and remain unmodified.

The ignored output is `pipeline/data/case_claim_target_entries.jsonl`, with `pipeline/data/case_claim_target_entries.jsonl.manifest.json`. The manifest hashes the case slice and each input dump. Rebuild with:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\audit_case_claim_target_entries.py --force
```

## Export target-entry candidates as linked CLDF data (2026-09-28)

The CLDF Generic exporter now consumes the target-entry audit and adds candidate source entries, senses, etymology text, dump line numbers, and their source claims to the corresponding tables. `claim-target-resolutions.csv` records one row per unique source claim, including unresolved and unsupported-language outcomes; `claim-target-candidates.csv` contains one row per resolved source-claim/target-entry link. The relationship remains explicitly a spelling-based candidate link, not a target-sense match or a verified etymological relation.

The initial local preview had 151 entries, 607 senses, 1,322 source claims, 458 unique target-form resolutions, and 145 deduplicated candidate-entry links. The 458 resolutions comprised 76 exact matches, 380 language codes outside the five indexed dumps, and two not found in those snapshots; two exact claim rows repeated across cases collapsed to unique claim IDs in CLDF. It retained 28 comparison rows and 25 matched comparison claims. These are historical counts; the expanded preview totals are in the later multi-target section. The target lookup JSONL and its manifest hashes are recorded in the CLDF `manifest.json`. The exporter validates all declared CSV foreign keys and stable IDs; the official CLDF validator remains unavailable in this environment.

Rebuild in this order:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\audit_case_claim_target_entries.py --force
pipeline\.venv\Scripts\python.exe pipeline\src\export_case_evidence_cldf.py --force
```

The next check in this initial pass was to review the then-current 78 exact target links by claim scope and relation direction. The multi-target correction below supersedes those totals; rerun the reciprocal-claim audit against the expanded target-specific claim IDs before using any reverse-match count. Preserve candidate sets when Wiktionary leaves identity unresolved; do not force a target sense from comparison alignment. The CLDF preview keeps candidates for inspection rather than deciding among them.

## Preserve multi-target template claims (2026-09-28)

The prior exact-link audit collapsed some claims because its ID identified the source template but not each normalized target. Wiktionary templates can name several targets in one occurrence—for example, `cog` with a comma-separated language list, or `doublet` with several forms. The extractor expands those values into separate target claims. The old audit deduplicated those claims as if they were one, and the first CLDF export retained some normalized targets without a linked claim row.

The claim ID now includes the normalized relation target. A separate `Template_Occurrence_ID` groups the expanded claims back to the originating template, keeping raw arguments and uncertainty available. The target audit and comparison-claim join use the same target-aware identity. The exporter now rejects normalized relation rows with no source-claim reference.

After rebuilding the 15-case slice, the target audit contains **539 form-target claim records**: 95 exact matches, 442 using language codes outside the five local dumps, and two forms not found in those snapshots. Those records produce 185 candidate-entry links across 125 unique target entries. The CLDF slice deduplicates repeated case resolutions to **499 unique claim-target lookups**: 91 exact, 406 not indexed, and two not found, with 173 candidate links. These are still selected-case counts, not language coverage.

The expanded CLDF contains 1,556 source-claim records representing 1,462 distinct template-occurrence IDs. Of these, 1,420 records have normalized relations and link to 1,373 unique relation-target rows; the remaining 47 records are repeated source claims for an already represented relation target. Every relation-target row is referenced, and the exporter reports no missing or orphan relation IDs. One template occurrence can now point to multiple target-specific claims without losing its common provenance.

The exporter now includes `claim-target-cross-references.csv` for exact return mentions from each target candidate back to the source entry's language and form. The regenerated slice has **57** such rows covering **34** source claims, **51** target claims, and **44** target entries: six `borrowed_from`→`cognate_mention`, 40 `cognate_mention`→`cognate_mention`, and 11 `doublet_of`→`doublet_of`. These are cross-references within Wiktionary, not independent confirmation or necessarily equivalent relationship assertions. A row count is not a count of unique historical relations or pair verdicts. Earlier counts are pre-expansion snapshots and should not be compared directly with the deduplicated CLDF table.

The focused exporter and target-audit tests pass (**9 tests**), and the full pipeline suite passes (**130 tests**). Generated artifacts remain local; no database classifications were changed.

Rebuild with the commands in the section above. The next action is to preserve a Wiktionary revision ID or an explicit unavailable status for reviewed entries, then compare pinned pages with the local dump and record any differences. The current actions and rationale are in [DATASET_NEXT_ACTIONS.md](DATASET_NEXT_ACTIONS.md).

## Package the bounded CLDF case slice as a release candidate (2026-09-28)

The exporter now derives the case-group count from its input instead of embedding a stale count. Its generated README lists the rebuild commands, explains that the selected entries come from Kaikki/Wiktextract, and points to Wiktionary's attribution and licensing terms. `manifest.json` lists the 15 case groups, Kaikki raw-data URL and extraction-manifest timestamp, source dump names and hashes, upstream input hashes, and SHA-256 fingerprints for the case builder, target-entry audit, and CLDF exporter. Entry-level Wiktionary revision IDs are still missing for some records; source dump hashes identify the local snapshot but do not replace page revisions.

A source-scope check on *fleece* confirms that the export keeps the Swedish `borrowed_from` claim directed to English, while the English entry records the inheritance chain to Proto-West Germanic `*fleus`. The English noun and verb entries remain separate. That root therefore belongs to the English source records in this artifact; it is not copied onto the Swedish entry as if Swedish inherited it directly. The separate pinned-page seed is linked from the generated README but is not represented as a revision ID for every CLDF row.

The resulting tracked candidate is in [`datasets/cldf-case-evidence/`](../datasets/cldf-case-evidence/). It has 5 languages, 179 entries, 677 senses, 49 forms, 1,586 source-claim rows from 1,492 template occurrences, 1,395 normalized relation targets, 30 comparisons, 26 claim matches, 524 deduplicated target-form resolutions, 187 candidate-entry links, 60 exact return-mention cross-references, 35 component links, and 12 shared-component ancestor candidates. These counts describe this deliberately selected diagnostic slice only.

The focused exporter test functions were invoked directly with temporary directories in the available bundled Python runtime, and both source files passed `py_compile`. Generated table SHA-256 values and row counts were checked. The repository's pipeline virtualenv could not be launched, the bundled runtime does not contain pytest, and the official CLDF validator was not run. The exporter itself checks stable IDs and declared foreign keys. Do not report official CLDF validation as complete.

The artifact is a **local release candidate, not cleared for redistribution yet**. Wiktionary's [copyright page](https://en.wiktionary.org/wiki/Wiktionary:Copyrights) licenses entry text under CC BY-SA 4.0 and GFDL, while warning that individual entries can include outside material with separate terms. Because the selected `Etymology_Text` has not been reviewed entry by entry for such material, retain the article attribution, CC BY-SA notice, modifications statement, and this limitation; complete that check before publishing the extracted prose. Kaikki/Wiktextract is the extraction route, not the original source.

The next data task is to take one case from the existing ledger, locate a reproduced extraction or identity failure, fix the earliest failing step, add a source-based regression, and regenerate only after the correction is demonstrated. Keep this case slice out of bulk relabeling and vocabulary-rate claims.

## Pin the *ombudsman* paths across varieties (2026-09-28)

Added four revision-pinned Wiktionary pages to [`datasets/source-evidence/`](../datasets/source-evidence/): English/Swedish *ombudsman* (one multilingual page), Danish *ombudsmand*, Norwegian Bokmål *ombudsmann*, and German *Ombudsmann*. The seed now contains 12 pinned pages, 30 structured assertions, and six bounded pair reviews. Each added assertion points to a permanent page revision; none copies the source entry prose.

The records keep several path types apart. The English and German entries name Swedish as donor; the Bokmål entry says inherited from Old Norse and analyzes the surface form as *ombud* + *-s-* + *mann*; the Danish entry traces its form through Old Danish to Old Norse and identifies *ombud* + *mand*; the Swedish section also records an Old Norse source. This is evidence for different immediate histories and a shared older form in some comparisons, not one exclusive pair label. The structured claims preserve what each page states and leave project-level cognacy interpretation open.

The source-evidence README now defines each field and all claim types used in the table. In particular, it distinguishes an explicitly recorded root from direct inheritance and distinguishes component analysis from whole-word history.

Joining these page claims to the local comparison rows exposes the classifier mismatch directly: English–Swedish is labeled `true_cognate` despite the English source's explicit `borrowed_from` claim; English–Danish and English–Bokmål are `partial_cognate` because their semantic scores fall below the 0.75 rule, not because a partial component match was found; English–German is `other` although both pages name the same Swedish donor. These are not all the same kind of relation. Keep the candidate label as legacy output, while making each directed borrowing, inheritance, shared source, and component analysis independently queryable.

The local evidence tables were checked for unique page and claim IDs, valid claim-to-page references, valid page-revision URLs, and valid source IDs in all ten pair reviews. The current official Wiktionary pages show the cited revisions and support these transcriptions: [English/Swedish *ombudsman*](https://en.wiktionary.org/w/index.php?title=ombudsman&oldid=92308148), [Danish *ombudsmand*](https://en.wiktionary.org/w/index.php?title=ombudsmand&oldid=67901999), [Norwegian Bokmål *ombudsmann*](https://en.wiktionary.org/w/index.php?title=ombudsmann&oldid=91547796), and [German *Ombudsmann*](https://en.wiktionary.org/w/index.php?title=Ombudsmann&oldid=90665622). The *ombudsman* Bokmål comparison also confirms that an exact gloss does not always identify one source sense; both candidate IDs are now preserved in the export.

## Pin the *clown* borrowing paths (2026-09-28)

Added three revision-pinned pages to [`datasets/source-evidence/`](../datasets/source-evidence/): English/Swedish *clown*, Danish and Bokmål *klovn*, and German *Clown*. The four non-English entries explicitly record borrowing from English. The English entry has a more complex, qualified history, with a proposed North Germanic connection through Middle Low German and related forms. These claims are recorded separately: the four direct loan paths do not settle the English form's deeper origin.

All four corresponding candidates in the current CLDF slice carry the legacy label `other` and an unknown root-match status. This is a concrete illustration of the bucket's meaning: it can contain a source-recorded borrowing path, not merely pairs with no relationship evidence. The local comparison selects noun senses on both sides in all four pairs; the Bokmål and English glosses both refer to circus performers. The extracted loan claims resolve the target spelling `en:clown` to two entries, noun and verb. The selected comparison noun is one candidate, but the source claim itself does not select it. Keep that target identity ambiguous: the source assertions are entry-level, not sense-specific, so the pair link is useful context rather than an automatic verdict or reason for bulk relabeling.

The pinned pages are [English/Swedish *clown*](https://en.wiktionary.org/w/index.php?title=clown&oldid=92140682), [Danish/Bokmål *klovn*](https://en.wiktionary.org/w/index.php?title=klovn&oldid=91044780), and [German *Clown*](https://en.wiktionary.org/w/index.php?title=Clown&oldid=91060358). The source evidence ledger now contains 21 page revisions and 70 structured assertions. Its ten existing pair reviews link to CLDF comparison IDs and selected source-sense IDs when available; the newer `torta-tort`, `dygn`, and `aften-afton` case notes have not yet been joined to the CLDF slice. The pinned English `tort` section names Bokmål `tort` as a cognate and records English's Proto-Indo-European root; the ledger keeps that root attached to English. The Swedish `dygn` entry's alternate Proto-Germanic form is now captured separately from the Danish and Bokmål paths. The `aften-afton` records retain two source cognate claims and the Danish page's uncertainty about reconstructed roots. The *ombudsman* comparison's two possible Bokmål sense IDs now survive through the case builder and CLDF export, linked to the source entry and both sense rows. The four *clown* borrowing claims still resolve to both English noun and verb entries; the selected comparison noun remains one candidate rather than an assumed unique source target.

## Count exact cognate mentions in Scandinavian `other` candidates (2026-09-28)

I scanned `pipeline/data/candidate_source_claim_matches_dercat_fix.jsonl`, generated from the matching `dercat_fix` comparison snapshot. The filter kept candidate pairs labeled `other` where a source entry has a `cognate_mention`, the target form match is exact, and the target resolves to an active entry and sense. Deduplicating direction-independent `(language, case-folded form)` pairs yields **1,712** pairs across Danish–Swedish (909), Swedish–Bokmål (464), and Danish–Bokmål (339). **231** pairs have source mentions in both directions (161, 43, and 27 respectively); 1,481 have a one-way mention.

This demonstrates that `other` does not mean “no source cognate assertion found” for this subset. It does not prove 1,712 historical relationships: each assertion applies at entry/form scope, exact target resolution only shows which active target sense the crosswalk selected, and reciprocal Wiktionary mentions are not independent evidence. The pinned *aften/afton* example makes one such disagreement inspectable: both pages name the other as a cognate and align to evening senses, while the Danish etymology says its reconstructed form's relationship to `*ēbanþs` is unclear and the Swedish entry records `*ēbanþs` in its own chain. See the [case review](DATASET_CASE_REVIEW.md) and [source ledger](../datasets/source-evidence/README.md).

## Preserve ambiguous comparison-sense identities in the CLDF export (2026-09-28)

The *ombudsman* comparison already retained a Bokmål gloss and two possible source-sense IDs with the same gloss in the local case JSONL. The case-slice builder only collected a source entry when the active comparison sense had one exact `source_entry_key`; it ignored `source_identity_candidates`. The CLDF exporter then emitted a form marked ambiguous but discarded both candidate IDs and omitted their Bokmål entry from the linked tables.

The builder now includes candidate source entries and records candidate sense IDs separately from exact active IDs. The alignment status is `ambiguous_sense_overlap` when those candidates match source-record senses. The exporter adds `Source_Identity_Candidates_JSON` to `forms.csv`, linking each candidate source entry and sense to the exported `entries.csv` and `senses.csv` records when available. It validates those embedded links. The singular `Source_Entry_ID` and `Source_Sense_ID` stay blank because no unique identity is supported.

The rebuilt CLDF slice contains the Bokmål *ombudsmann* entry and both candidate senses. This preserves the data needed to inspect the ambiguity; it does not resolve which source sense Wiktionary intended. The focused builder/exporter tests pass, the full case slice and CLDF export were regenerated from the recorded local inputs, and the exporter's stable-ID and link checks pass. The official CLDF validator has not run.

## Separate the Swedish plant name *torta* from Bokmål legal *tort* (2026-09-28)

The 270-row comparison review has a Swedish *torta* / Bokmål *tort* candidate labeled `false_friend`, with unknown root relation. Source inspection shows why neither output is a complete historical account. The pinned Swedish Wiktionary page (revision 92286236) says the plant-name etymology is unknown and calls several Norwegian forms, including *tort*, cognates in prose. Its structured `cog` templates only encode Norwegian `turt` and Danish `turt`. The pinned Bokmål *tort* page (revision 92191644) describes the legal word as borrowed from French and records Latin `tortum` in the chain. Bokmålsordboka gives the legal sense and a French/Latin origin as well.

Two botanical records add useful identity evidence without proving word history. Artsdatabanken lists Bokmål and Nynorsk `turt` as the standard name for *Cicerbita alpina*. A digitized *Svensk Botanik* plate for *Sonchus alpinus* records `Tort, Torta` as Jämtland regional plant names. This makes it plausible that the Swedish Wiktionary prose refers to a regional plant-name form, not the current Bokmål legal entry. The records do not identify the exact Norwegian variety or prove the plant-name etymology.

I pinned the two Wiktionary revisions, captured the prose cognate mention separately from the template-derived French loan and Latin derivation, and added three supporting-source records with explicit scope limits. The case remains outside the 15-group CLDF slice; its source note does not yet link to an exported comparison ID. Do not use this selected pair to claim that all forms *torta* and *tort* are unrelated or to recategorize the full dataset.
