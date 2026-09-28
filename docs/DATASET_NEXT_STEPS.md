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

## Do this next

### 1. Keep translation surfaces and their source claims

Build a small source-level table from Wiktionary's English translation senses. Keep the English entry and sense IDs, the target language and exact translated form, and any target form-of links with their source sense IDs, parts of speech, and tags. Preserve multiple lemma candidates and unresolved links. Use the reviewed *trübe* and *tidigare* cases as tests. Only after those links are inspectable should we decide which unique form links can create comparison candidates.

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
