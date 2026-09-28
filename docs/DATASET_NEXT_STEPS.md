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
