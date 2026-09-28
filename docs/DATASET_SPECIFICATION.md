# Linduistics Dataset & Computational Lexicology Specification

This document defines the architectural requirements, linguistic principles, storage structures, and validation rules for the Linduistics dataset pipeline. 

Dataset integrity and linguistic rigor take absolute precedence over user interface drafting.

---

## 1. False Friends and Etymological Relation

**False friend** describes a misleading modern form-and-meaning comparison. It does not establish whether the words share a history. A false-friend pattern can coexist with a cognate mention, a borrowing path, or unresolved origins.

The current `etymological_relation` column is a **legacy root-match heuristic**, not a verified historical relationship: matching scalar root strings produce `cognate`; missing, unequal, or incomparable roots produce `unknown`. The classifier does not emit `false_cognate`. This name and behavior are too strong for the evidence and should not be treated as a public data contract.

The source-claim audit demonstrates the problem: **192 unique candidate pairs** have both a matched `borrowed_from` claim and equal recorded roots. The current heuristic calls their root relation `cognate` even though the source records a direct loan path. The source claim, the shared recorded root, and any whole-word cognacy judgment must remain separate facts. Likewise, unequal or missing scalar roots do not establish unrelated origins.

For the data model, keep four scopes distinct: source assertions and directed historical paths; recorded-root comparisons; modern form/meaning observations; and project cognacy assessments with an explicit whole-word or partial scope. A `false_cognate` judgment requires evidence of distinct histories, not only different root strings. Partial cognacy requires identified partial or component correspondences, not a semantic-similarity cutoff. Terminology differs across linguistic and language-learning literature; [Sampedro Mella (2024)](https://onlinelibrary.wiley.com/doi/full/10.1111/stul.12225) summarizes that variation.

---

## 2. Sense Alignment Integrity & Disambiguation Rules

### The Core Inaccuracy: Sense Cross-Wiring
In polysemous headwords, treating words as monolithic entities with a single definition produces gross errors:

1. **The "Pool" Inaccuracy:**
   * Swedish *pool* has senses: [1. resource reserve; 2. swimming pool; 3. billiards].
   * English *pool* has senses: [1. small body of water / swimming pool; 2. resource reserve; 3. billiards].
   * **Failure Mode:** Pairing Swedish Sense 1 ("A set of resources that are kept ready to use") with English Sense 1 ("a swimming pool") and reporting $95\%$ semantic similarity. The definitions do not match.
2. **The "Halva" Inaccuracy:**
   * Swedish *halva* has senses: [1. Turkish/Middle Eastern confection; 2. inflected form of *halv* (a half)].
   * English *halva* has sense: [1. Turkish/Middle Eastern confection].
   * **Failure Mode:** Pairing the Swedish confection sense with English "a half" (or vice-versa), reporting $12\%$ semantic similarity, and categorizing the pair as a False Friend. In reality, *halva* is an identical shared loanword in both languages.

### Strict Sense-Matching Rules
1. **Sense Pair Integrity:** Any calculated semantic similarity score $S_{\text{sem}}$ must reflect a specific, verified sense pair $(i, j)$ where $\cos(\mathbf{e}_{A,i}, \mathbf{e}_{B,j})$ is maximized. The stored text `def_a` and `def_b` **must** be the exact texts of sense $i$ and sense $j$. Cross-wiring definitions across mismatched senses is strictly prohibited.
2. **False Friend Disqualification Rule:** A headword pair $(W_A, W_B)$ **cannot** be classified as a global False Friend if there exists *any* active sense pair with $S_{\text{sem}} \ge 0.75$. High meaning similarity does not establish cognacy: `true_cognate` still requires matching structured roots; otherwise use `translation_pair` when surface similarity is low, or `other` when the evidence conflicts.
3. **Contrastive Sense Storage:** For every pair, the pipeline must record:
   * `active_def_a`, `active_def_b`: The aligned definitions that produced the similarity score.
   * `primary_def_a`, `primary_def_b`: The primary (Sense 1) definitions of both headwords.
   * `contrasting_senses_a`, `contrasting_senses_b`: The non-aligned secondary definitions that create ambiguity.

---

## 3. Storage Architecture: Relational & Polysemous Schema

### 3.1 Database Schema Definition (`word_comparisons`)

```sql
CREATE TABLE word_comparisons (
    id BIGSERIAL PRIMARY KEY,
    
    -- Headwords & Phonetics
    lang_a VARCHAR(5) NOT NULL,
    word_a VARCHAR(100) NOT NULL,
    ipa_a VARCHAR(100),
    pos_a VARCHAR(20),
    
    lang_b VARCHAR(5) NOT NULL,
    word_b VARCHAR(100) NOT NULL,
    ipa_b VARCHAR(100),
    pos_b VARCHAR(20),
    
    -- Continuous Linguistic Metrics
    orthographic_sim REAL NOT NULL,
    phonetic_sim REAL NOT NULL,
    semantic_sim REAL NOT NULL,
    
    -- Spatial Query Point
    sim_point POINT GENERATED ALWAYS AS (POINT(phonetic_sim, semantic_sim)) STORED,
    
    -- Similarity category plus an independent origin relation
    category VARCHAR(30) NOT NULL,             -- true_cognate, partial_cognate, false_friend, translation_pair, other
    etymological_relation VARCHAR(30) NOT NULL, -- cognate, false_cognate, unknown; independent of category
    
    -- Active Aligned Senses (The exact matching sense pair)
    def_a TEXT NOT NULL,
    def_b TEXT NOT NULL,
    
    -- Full Polysemous Inventory (All senses for deep inspection)
    senses_a JSONB NOT NULL DEFAULT '[]'::jsonb,
    senses_b JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Each word's root and a shared root only when both structured roots agree
    etym_root_a VARCHAR(100),
    etym_root_b VARCHAR(100),
    shared_etym_root VARCHAR(100),
    etym_text_a TEXT,
    etym_text_b TEXT
);

-- Primary 2D spatial slider index
CREATE INDEX idx_lexical_sliders_gist 
ON word_comparisons USING gist (lang_a, lang_b, sim_point);

-- Unique constraint ensuring exactly ONE comparison entry per headword pair
CREATE UNIQUE INDEX idx_unique_headword_pair
ON word_comparisons (lang_a, lang_b, word_a, word_b);

-- Trigram indexing for autocomplete and headword lookup
CREATE INDEX idx_trgm_word_a ON word_comparisons USING gin (word_a gin_trgm_ops);
CREATE INDEX idx_trgm_word_b ON word_comparisons USING gin (word_b gin_trgm_ops);
```

### 3.2 Structure of `senses_a` and `senses_b` (JSONB)

```json
[
  {
    "sense_id": 1,
    "gloss": "A confection usually made from crushed sesame seeds and honey.",
    "is_active_match": true,
    "similarity_to_counterpart": 0.96
  },
  {
    "sense_id": 2,
    "gloss": "A half; a half portion.",
    "is_active_match": false,
    "similarity_to_counterpart": 0.12
  }
]
```

---

## 4. UI & Storage Granularity: The Dense Word List Specification

The user interface for browsing specimens (the Specimen Register) must reject large, repetitive marketing cards and adopt the structure of a **dense botanical register / lexicological table**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Headword (Source)      Target Counterpart     Category           Orth.    Phon.    Sem.     Active Meaning   │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ gift  /jɪft/ (noun)    gift  /ɡɪft/ (noun)    False Friend [A]   100%     65%      18%      poison ↔ present │
│ pool  /puːl/ (noun)    pool  /puːl/ (noun)    True Cognate       100%     100%     96%      swimming pool    │
│ halva /halva/ (noun)   halva /hɑːlvə/ (noun)  Direct Borrowing   100%     90%      95%      confection       │
│ hund  /hɵnd/ (noun)    dog   /dɒɡ/ (noun)     Translation Pair   25%      15%      98%      canine animal    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Presentation Rules:
1. **One Entry Per Headword Pair:** The primary list query returns exactly one row per `(word_a, word_b)` pair. Multiple cards for different senses of *pool* are banned from the primary register.
2. **Dense, Paginated List:** Rendered as a structured table with fixed column widths, crisp typography ($\ge 14\text{px}$ Cardo/Serif), and sentence case.
3. **Expansions & Deep Inspection:** Clicking a row expands the row inline or opens the **Specimen Detail Drawer**, displaying:
   * Both headwords with complete IPA and grammatical tags.
   * Etymological lineage tracing ancestral roots.
   * The **Full Polysemous Contrast Matrix**: A side-by-side list of all definitions for Word A and Word B, highlighting which sense pair is aligned and which senses represent semantic drift.

---

## 5. Phonetic Alignment: Articulatory Feature Matrix & Weighted Wagner-Fischer

Raw string Levenshtein fails to capture regular historical sound shifts (e.g. $/d/ \leftrightarrow /t/$, $/t/ \leftrightarrow /s/$, $/p/ \leftrightarrow /f/$). The pipeline replaces string Levenshtein with continuous articulatory distance minimization. For the complete mathematical derivation, dense ID space cache architecture, and phoneme inventory, refer directly to [`docs/phonetic_alignment_strategy.md`](phonetic_alignment_strategy.md).

### The Feature Vector Model:
Each phoneme is mapped to a vector of articulatory features:
* **Consonants ($w_m=0.40, w_p=0.40, w_v=0.20$):**
  * **Manner:** Plosive, Affricate, Fricative, Nasal, Liquid, Glide.
  * **Place:** Bilabial, Labiodental, Dental, Alveolar, Postalveolar, Retroflex, Palatal, Velar, Uvular, Glottal.
  * **Voicing:** Voiced ($+1$) vs. Voiceless ($0$).
* **Vowels ($w_h=0.45, w_b=0.40, w_r=0.15$):**
  * **Height:** Close, Near-close, Close-mid, Mid, Open-mid, Near-open, Open.
  * **Backness:** Front, Central, Back.
  * **Rounding:** Rounded vs. Unrounded.
* **Cross-Class & Rhotic Bridges:** Vocalized rhotics ($/ʁ, r/ \leftrightarrow /ɐ, ɚ, ɝ/$) and semivowel glides ($/j/ \leftrightarrow /i/$, $/w/ \leftrightarrow /u/$) are bridged at distance $0.15\text{--}0.25$. Default consonant-to-vowel substitutions are penalized at $1.00$.

### Implementation Architecture:
* **Dense ID Space & L1 Cache Fit:** All $\approx 79$ canonical Germanic phones are indexed $0..K-1$ with slot $K$ as OOV. The $(80 \times 80)$ `float32` matrix takes $25.0\,\text{KB}$, fitting completely within the CPU's 32 KB L1 Data Cache.
* **Metric Closure:** The feature table undergoes Floyd-Warshall metric closure, strictly satisfying the symmetric triangle inequality ($M[i, k] \le M[i, j] + M[j, k]$).
* **JIT-Compiled Alignment:** Sequence alignment is executed via Numba `@njit(fastmath=True)` Weighted Wagner-Fischer dynamic programming with indel cost $0.70$, operating at $\approx 0.78\,\mu\text{s}$ per pair.

$$S_{\text{phon}}(P, Q) = 1.0 - \frac{\text{WagnerFischerCost}(P, Q)}{\max(|P|, |Q|)}$$

---

## 6. Implementation Status Matrix

The following records the local taxonomy refresh and application state verified on 2026-09-28. Aggregate checks establish consistency and counts, not linguistic correctness for each row; no individual pair review or manually labeled gold set was completed in this stage.

Before the taxonomy refresh, the database contained 403,298 directed rows. Its category counts were 155,126 `true_cognate`, 33,720 `partial_cognate`, 21,310 `false_friend`, 173,008 `translation_pair`, and 20,134 `other`; the old root field was not reliable evidence of shared origin. Those rows are preserved in `word_comparisons_backup_20260928`.

The refreshed live database contains 403,694 directed rows, regenerated from the five local Kaikki dumps using structured etymology templates for roots. Current categories are 18,514 `true_cognate`, 1,210 `partial_cognate`, 37,736 `false_friend`, 172,078 `translation_pair`, and 174,156 `other`. Across all categories, `etymological_relation` is `cognate` on 19,938 rows, `false_cognate` on 28,820, and `unknown` on 354,936.

`other` remains a score-based similarity category, but it is no longer an origin-data bucket. Every row now carries a separate `etymological_relation`. That exposes the subset whose roots support a more specific origin label without confusing ancestry with modern meaning:

| `other` rows | Origin relation | Semantic similarity | Count | Interpretation |
| :--- | :--- | :--- | ---: | :--- |
| `false_cognate` | Different structured roots recorded at the same level | ≥ 0.75 | 8,408 | Similar form and strong meaning match, but distinct recorded roots. Keep the evidence in the origin dimension; do not infer a shared origin from the meaning score. |
| `false_cognate` | Different structured roots recorded at the same level | > 0.30 and < 0.75 | 3,820 | Similar form, partial meaning overlap, and distinct recorded roots. |
| `unknown` | Missing or incomparable structured roots | ≥ 0.75 | 129,422 | Similar form and strong meaning match; origin remains unresolved. |
| `unknown` | Missing or incomparable structured roots | > 0.30 and < 0.75 | 32,506 | Similar form, partial meaning overlap; neither ancestry nor a more specific meaning relation is established. |

All `other` rows meet the current form-similarity threshold; none have matching structured roots. The 12,228 `false_cognate` relations are the `other` records that can be separated by recorded origin. The 161,928 `unknown` records cannot responsibly be renamed as cognates, partial cognates, or false cognates from these fields alone. The 137,830 high semantic-score rows are a useful review slice, not a new linguistic category: an embedding score does not establish equivalent senses. Keep `category = 'other'` until a more specific score-and-sense rule is supported by evidence; use `etymological_relation` to expose the origin distinction now.

| Layer / Component | Status | Verified Capabilities | Active Limitations / Open Work |
| :--- | :--- | :--- | :--- |
| **Pipeline: Parser (`parser.py`)** | **Updated and tested** | Structured source templates populate roots; prose is retained for display but is not used to infer roots. | A fallback still accepts a template argument beginning with `*`; template coverage and source quality need review. |
| **Pipeline: Classifier (`classifier.py`)** | **Updated and tested** | Similar form plus low meaning similarity remains queryable as `false_friend`; origin is independently `cognate`, `false_cognate`, or `unknown` on every pair. | Similarity thresholds identify candidates; they do not prove ancestry or replace a sense-level audit. |
| **Database/API** | **Migrations 007–008 applied and seeded** | Pair data distinguishes both per-word roots, an optional shared root, and `etymological_relation` on every row. API endpoints were checked after restarting the stale local Go process. | Rollback snapshots: `word_comparisons_backup_20260928` (pre-refresh) and `word_comparisons_backup_20260928_v007` (immediately before migration 008). |
| **Frontend** | **Built locally** | Quiz/lexicon retain false-friend candidates and expose origin relation separately; Language Overview combines its existing table and breakdown with the new map and matrix. | Build verifies TypeScript and bundling; it is not a substitute for visual interaction review. |
| **Routes and inspector** | **Updated locally** | Legacy Gallery and Language Orbit routes/pages were removed; inspector and lexicon layouts were adjusted for responsive use. | No production deployment is implied by the local build. |
| **Language Overview and lexicon** | **Updated locally** | The overview combines its existing table and vocabulary breakdown with the relationship map and pair matrix. The lexicon exposes etymological relation and separate recorded roots. | The sister-cognate cluster section remains Pan-Germanic-specific; see `todo.md`. |

### 6.1 Refresh procedure for taxonomy data

The taxonomy refresh and migrations 007–008 were completed on 2026-09-28. The canonical local comparison artifact and database use the new schema; Parquet outputs and the local database are not committed to Git. For a future refresh, build into a staging directory, audit aggregate counts and invariants, and preserve the existing artifacts and database before promotion. Apply each migration only when the database has the immediately preceding schema; do not rerun them on the current schema. Then seed the validated comparison file and run `python pipeline/src/build_cognate_clusters.py` to refresh derived clusters.

Validation completed in this stage: the complete pipeline suite passed (39 tests); Go packages compiled with `go test ./... -run '^$'`; and the frontend production build passed. Read-only database checks confirmed 403,694 rows, valid relation values, symmetric reverse-direction rows, and the category/relation counts above. Root-string checks must normalize case and optional asterisk formatting: 80 raw strings differ while describing the same normalized root. API checks returned HTTP 200 for health, languages, pairs, false-friends, search, clusters, cluster-by-root, and `POST /api/inspect`. The false-friends endpoint initially returned 500 because an old Go process still referenced the pre-migration column; restarting from current source resolved it.

This is an aggregate validation pass, not proof that all 403,694 records are linguistically correct. The next correctness pass should extend `pipeline/tests` and `pipeline/src/audit_db.py`: add a small source-linked set of clear cognates, distinct-root lookalikes, missing/incomparable roots, and known edge cases, then review stratified examples from each large result group. This keeps validation inside the existing pipeline and does not require a separate project.

---

## 7. Known Lexicological Caveats & Architectural Edge Cases

This section documents active boundary conditions, edge cases, algorithmic trade-offs, and data limitations that must remain explicitly tracked across all pipeline and UI iterations:

### 7.1 Homographs with Divergent Ancestral Origins Under One Headword
* **The Problem:** A single orthographic string in a language may represent two historically distinct words (homographs with different etymologies). For example, Swedish *gift* represents:
  1. *gift¹* (noun, neuter): poison $\leftarrow$ Middle Low German / German *Gift* ($\leftarrow$ Proto-Germanic *\*gifti*).
  2. *gift²* (adjective): married $\leftarrow$ Old Swedish *gipt* / Old Norse *gipta* ($\leftarrow$ Proto-Germanic *\*giftiz*).
* **Dataset Decision:** Due to the strict primary invariant of **one row per headword pair** (`UNIQUE(lang_a, lang_b, word_a, word_b)`), both homographs share a single database record. When compared to English *gift* (noun: present, verb: give), the argmax sense evaluator selects Swedish *married* ($S_{\text{sem}} = 0.22$) over *poison* ($S_{\text{sem}} = 0.04$) because $0.22 > 0.04$. This edge case is not solved by the taxonomy refresh; it needs entry/sense identity in candidate generation and storage before multiple etymologies can be represented safely.
* **Pedagogical Requirement:** While both senses satisfy $S_{\text{sem}} \le 0.30$, the pair remains a false-friend candidate. Its origin is labeled cognate only when the structured roots support that claim. The detail view should show each word's etymology separately.

### 7.2 Obsolete / Historical Sense Filtering & The Disqualification Rule
* **The Problem:** If archaic or obsolete dictionary senses are treated as active meanings, legitimate modern False Friends would be disqualified. In historical Swedish, *gift* was once an obsolete noun meaning "a present" (attested from Proto-Germanic *\*giftiz*). If an unconstrained sense search evaluates this sense against English *gift*, $S_{\text{sem}}$ reaches $\approx 0.72$, falsely categorizing the pair as a cognate.
* **Invariant:** Senses flagged with `obsolete`, `archaic`, `historical`, or `dated` tags in Wiktextract are tagged with `is_active: false`. Classification checks only active senses. High semantic similarity can remove a pair from the false-friend class, but cannot by itself establish that the words are cognate. Obsolete senses remain in `senses_a` and `senses_b` for inspection.
* **Caveat:** If a Wiktionary contributor neglected to tag an archaic meaning with appropriate template markup, that sense remains `is_active: true` and can artificially inflate $S_{\text{sem}}$.

### 7.3 Identity & Circular Definitions in Foreign Loanwords
* **The Problem:** In Wiktextract, shared internationalisms and culinary loanwords are frequently given circular single-word definitions in the source language (e.g., the Swedish Wiktionary entry for *halva* is defined simply as `['halva']`). Passing the isolated token `"halva"` into a multilingual sentence transformer against a descriptive English gloss (*"A confection usually made from crushed sesame seeds and honey..."*) produces an artificially depressed cosine similarity of $\approx 0.12$, triggering a false False Friend classification.
* **Invariant:** In `align_pair_senses`, if two identical headwords (`word_a.lower() == word_b.lower()`) have a definition gloss that literally matches the counterpart headword (`gloss == word_b`), the sense pair is recognized as a direct lexicographical identity with $S_{\text{sem}} = 1.00$. This prevents shared loanwords (*halva*, *taco*, *sushi*) from collapsing into False Friends.
* **Caveat:** Exact string matching only handles literal gloss-to-headword identities (`"halva" == "halva"`). If the Wiktionary gloss contains qualifying phrasing (e.g., `"a type of halva"`, `"sesame halva"`, or variant spelling `"halvah"`), it falls back to raw embedding cosine similarity, which may score lower than intended.

### 7.4 Phonetic Similarity Representation & Source Transcription Variance
* **Current State:** Phonetic similarity executes via the JIT-compiled Articulatory Feature Matrix with Weighted Wagner-Fischer sequence alignment (`pipeline/src/articulatory_matrix.py`, `pipeline/src/ipa_normalizer.py`), replacing character-level string Levenshtein.
* **Remaining Caveat:** Wiktionary transcriptions vary in phonetic granularity across languages (e.g. narrow Swedish transcriptions with grave/acute tonal diacritics vs. broad English CMU-derived phonemic representations). While suprasegmental stripping, affricate normalization (`t͡ʃ` $\rightarrow$ `č`), and vocalic rhotic bridges mitigate this variance, deep dialectal differences in source data can cause slight asymmetries in phone lengths.


### 7.5 Etymology Template Coverage Asymmetry
* **The Problem:** Wiktionary's crowd-sourced nature means etymology coverage is non-uniform. High-frequency words possess rich structured templates (`inh`, `der`, `gem-pro`), but rarer vocabulary may only have unstructured prose text or no etymology section at all.
* **Behavior:** Structured Wiktionary etymology fields populate each word's own root. Prose is retained for display but is not parsed into a root because it can mention sister words or unrelated examples.
* **Caveat:** Missing structured roots leave the origin relation `unknown`; they do not prove the words unrelated.

### 7.6 Pairwise Storage vs. Multi-Language Root Cliques
* **Current State:** Data is currently indexed and queried pairwise across the 20 directed pairs in `word_comparisons`.
* **Caveat:** Pair rows store both per-word roots and an optional `shared_etym_root`; the separate `cognate_clusters` table groups multi-language roots. Cross-language universality is currently derived at query time via `GetByTokens`.

### 7.7 Dual-Channel Candidate Recall Boundaries (Non-Identical Homophones)
* **Current State:** Exact-spelling collisions are exhaustively captured (5,112 per language pair). Candidate generation for spelling-divergent pairs relies on:
  1. Channel A: Character 2-gram/3-gram inverted index ($S_{\text{orth}} \ge 0.50$ or $S_{\text{phon}} \ge 0.50$).
  2. Channel B: Semantic vector ANN ($S_{\text{sem}} \ge 0.50$).
* **Caveat:** Homophones or near-homophones with drastically divergent orthography and low semantic overlap (e.g., German *See* [lake] vs. Swedish *sjö* [lake/sea] if evaluated as a false friend against an unrelated homophone) can fail candidate recall if they share fewer than 50% character $n$-grams and are not returned by the semantic Top-K retrieval channel.

### 7.8 Symmetrical Pair Directionality & Asymmetric Polysemy
* **Current State:** The database stores symmetrical rows (`A -> B` and `B -> A`).
* **Caveat:** While continuous scores ($S_{\text{orth}}, S_{\text{phon}}, S_{\text{sem}}$) are symmetric, semantic polysemy is inherently directional. A headword in Language A may have 8 distinct senses while the counterpart in Language B has only 1. The argmax alignment captures the optimal intersection, but the proportion of unaligned semantic mass is asymmetric. Senses arrays (`senses_a`, `senses_b`) must be inspected to evaluate the full directional asymmetry.

### 7.9 Taxonomy Boundaries
* **Cognate** describes a shared historical origin; similarity scores alone cannot establish it.
* **False friend** describes a misleading cross-language form/meaning relationship and can be cognate or unrelated. `etymological_relation` records `cognate`, `false_cognate`, or `unknown` for every pair.
* **False cognate** is reserved for similar forms with distinct recorded roots. Missing roots or roots at incomparable historical levels remain `unknown`.
* **Translation pair** is a high-meaning-similarity, low-form-similarity candidate. **Partial cognate** is used only for a shared recorded root whose aligned meanings are not fully similar.

### 7.10 Semantic Blurring in Metaphorical and Figurative Senses ($0.30 < S_{\text{sem}} < 0.75$)
* **The Problem:** Many cognates retain a shared literal meaning but have developed divergent metaphorical extensions, or vice versa.
* **Classification Impact:** Senses with cosine similarity between 0.30 and 0.75 become `partial_cognate` only when structured roots match. A moderate match without root evidence is not labeled cognate. Threshold boundaries remain candidate-screening cutoffs, not linguistic proof.

### 7.10 Translation Graph Mining Slicing & Core Lemma Prioritization
* **The Problem:** The English Wiktionary translation graph contains $>66,000$ translation links between high-density language pairs like German and English. In naive candidate generators, converting raw Python sets to lists and applying unseeded head-slices (`[:10000]`) arbitrarily omits foundational core vocabulary (e.g. *water* $\leftrightarrow$ *Wasser*, *apple* $\leftrightarrow$ *Apfel*) depending on non-deterministic memory hash ordering.
* **Invariant:** Mined translation links must be sorted deterministically prior to candidate bounding (`max_translation_pairs = 15000`), prioritizing pairs with available per-entry roots and shorter lexical lengths (canonical core vocabulary over obscure multi-token or rare compounds).

### 7.11 Multi-Language Cognate Clique Aggregation & Homograph Shielding
* **The Problem:** Pairwise tables (`word_comparisons`) store edges ($A \leftrightarrow B$), but comparative Germanic philology models ancestral root nodes ($N$-way cliques: e.g. Proto-Germanic *\*hundaz* $\rightarrow$ English *hound*, German *Hund*, Swedish *hund*, Danish *hund*, Norwegian *hund*). Furthermore, polysemous headwords with multiple homograph entries (e.g. English *hound* noun: dog vs nautical mast timber from Proto-Germanic *\*hūnaz*) risked having primary ancestral roots overwritten by rare secondary homographs during ingestion.
* **Invariants:**
  1. A lemma's structured root is protected against secondary overwrites in `parser.py`; pair-level shared roots are emitted only when both per-word roots match.
  2. Multi-language cognate cliques are materialized in `cognate_clusters` (indexed on `root`, `language_count`, `languages` via GIN, and trigram search), allowing the Specimen Detail Drawer to render all pan-Germanic siblings under their ancestral Proto-Germanic root node.
