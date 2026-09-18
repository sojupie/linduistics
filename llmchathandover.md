# Project: Linduistics
**Name Meaning:** Lin-duistics
- **Lin**: Swedish word "Lind" (linden tree)
- **Duistics**: Linguistics, language

Linduistics is a platform for cross-lingual Germanic language learning, lexical analysis, and comparative etymology.
**Tech Stack:**
- **Data Pipeline:** Python (Kaikki parser, sentence-transformers, inverted index, vector ANN)
- **Backend Service:** Go (REST API, SQL/pgx)
- **Frontend App:** React, Vite, Tailwind CSS, Shadcn UI
- **Database:** PostgreSQL (with `btree_gist` extension, spatial GiST indexing, and `pg_trgm`)
- **Deployment:** Docker / Docker Compose hosted on homelab behind Cloudflare tunnel

---

# Technical Specification: Cross-Lingual Germanic Lexical Engine

---

## 1. Executive Summary & Core Hypothesis

The engine maps, quantifies, and categorizes cross-lingual lexical relationships across Germanic languages (initially Swedish `sv` and English `en`, architected for expansion to German `de`, Dutch `nl`, and Danish `da`).

The system decouples **surface similarity** (how words look and sound) from **semantic similarity** (what words mean). By computing both dimensions independently across headwords, the vocabulary space partitions into four deterministic quadrants:

```
                      ▲ Semantic Similarity (Meaning)
                      │
   Translation Pairs  │   True Cognates & Direct Borrowings
   (Low sound/spell,  │   (High sound/spell, high meaning)
    high meaning)     │   e.g., hund / dog (translation)
   e.g., äta / eat    │   e.g., banan / banana (cognate)
                      │
──────────────────────┼────────────────────────────────────►
                      │                               Phonetic / Orthographic
   Unrelated Lexicon  │   False Friends (Deceptive Cognates)   Similarity
   (Low sound/spell,  │   (High sound/spell, low meaning)
    low meaning)      │   e.g., gift / gift, semester / semester
                      ▼
```

### Core Technical Principle

**Zero machine learning at runtime.** Candidate generation, phonetic alignment, and cross-lingual semantic embedding scoring are precomputed offline via an ETL pipeline. The production application is purely a query engine over precomputed, spatially indexed relationship tables in PostgreSQL.

---

## 2. Linguistic Mechanics & Scoring Formulations

Every comparison pair (w_A, w_B) between languages L_A and L_B receives three continuous scores bounded in [0.00, 1.00]:

### 2.1 Orthographic Similarity (S_orth)

Evaluates spelling distance over normalized lowercase graphemes:

```text
S_orth(w_A, w_B) = 1.0 - ( Levenshtein(w_A, w_B) / max(|w_A|, |w_B|) )
```

### 2.2 Phonetic Similarity (S_phon)

Raw orthography fails across Germanic languages due to disparate spelling conventions (e.g., Swedish *kyrka* vs. English *church*, or Swedish *sjö* vs. German *See*).

#### Normalization Pipeline:
1. **Suprasegmental Stripping:** Remove primary stress (`ˈ`), secondary stress (`ˌ`), tone contours, and vowel length markers (`ː`).
2. **Affricate Decomposition / Normalization:** Replace multi-character affricates and digraphs with atomic representations (e.g., `t͡ʃ` -> `č`, `d͡ʒ` -> `ǧ`) so character-level edit distance is not artificially inflated by multi-code-point glyphs.
3. **Phonetic Distance:** Compute normalized Levenshtein distance over the cleaned IPA representations:

```text
S_phon(w_A, w_B) = 1.0 - ( Levenshtein(ipa_A, ipa_B) / max(|ipa_A|, |ipa_B|) )
```

### 2.3 Semantic Similarity (S_sem) & Sense Attribution

Measures conceptual overlap between definition glosses.

1. Each headword has a set of definition glosses: `D_A = {d_{A,1}, d_{A,2}, ...}` and `D_B = {d_{B,1}, d_{B,2}, ...}`.
2. Definitions are encoded into dense vectors using a multilingual sentence transformer (e.g., `paraphrase-multilingual-MiniLM-L12-v2` or `bge-m3`).
3. Pair similarity is the maximum cosine similarity across all sense pairs:

```text
S_sem(w_A, w_B) = max_{i, j} ( (e_{A,i} · e_{B,j}) / (||e_{A,i}|| * ||e_{B,j}||) )
```

4. **Sense Attribution (Argmax Tracking):** The ETL pipeline retains the specific gloss pair `(d_{A, i*}, d_{B, j*})` that produced the maximum score. Storing the matching glosses alongside headwords allows the UI to explain *why* two words were categorized as related or divergent.

### 2.4 Lexical Classification Taxonomy & False Friend Tiers

The taxonomy enforces strict sense-to-sense correspondence (no cross-wired definitions). See detailed specification in [`docs/DATASET_SPECIFICATION.md`](docs/DATASET_SPECIFICATION.md).

* **True Cognate / Direct Borrowing:** (S_phon >= 0.65 OR S_orth >= 0.70) AND S_sem >= 0.75.
* **False Friends (Deceptive Cognates):** (S_phon >= 0.65 OR S_orth >= 0.70) AND S_sem <= 0.30 across all shared primary senses:
  * **Type A (Academic / Etymological Shift):** Verified common historical root (Proto-Germanic/Latin) where meaning diverged over centuries (e.g., *gift* / *gift*, *semester* / *semester*, *bald* / *bold*).
  * **Type B (Casual / Surface Collision):** Accidental homographs/homophones or unrelated loanword clashes with different roots (e.g., Swedish *bra* [good] vs. English *bra* [brassiere]; German *Mist* [manure] vs. English *mist* [fog]).
* **False Friend Disqualification Rule:** A headword pair CANNOT be classified as a False Friend if they share *any* active sense with S_sem >= 0.75 (e.g., *halva* is a shared loanword confection in both Swedish and English; it must not be labeled a false friend due to unaligned secondary senses).
* **Partial Cognate:** S_phon >= 0.65 AND 0.30 < S_sem < 0.75.
* **Translation Pair:** S_sem >= 0.75 AND S_phon < 0.65 AND S_orth < 0.70.
* **UI & Storage Invariant:** One entry per unique headword pair in primary register list. The list must render as a dense, paginated table (not floating cards). Clicking or expanding reveals the complete polysemous drawer contrasting all definitions.

---

## 3. Data Extraction & Dual-Channel Offline Pipeline

### 3.1 Data Source: Kaikki.org (Wiktextract Dumps)

* Pre-parsed line-delimited JSON (`JSONL`):
  - `kaikki.org-dictionary-Swedish.jsonl`
  - `kaikki.org-dictionary-English.jsonl`
  - *(Subsequent phases: German, Dutch, Danish)*
* **Key Structural Advantage:** Because these extracts derive from the English edition of Wiktionary, Swedish headword entries already provide their core sense glosses in English. This allows direct, high-accuracy embedding comparison without preliminary machine translation.

### 3.2 Ingestion, Lemma Filtering & G2P Fallback

Raw Wiktionary dumps are dominated by inflected forms (*hundarna*, *sprungit*, *flickors*). Processing inflections causes a 10x explosion in combinatorial candidates and distorts vector matches with grammatical boilerplate ("*definite plural of...*").

#### Parsing Rules:
1. **Lemma Filtering:** Discard entries containing `"form-of"` in the `tags` array or non-empty `form_of` references. Keep only canonical headwords/lemmas.
2. **Compound / Phrase Filtering:** Discard entries containing whitespace or hyphens to focus on lexical roots and uncompounded terms.
3. **Field Extraction:**
   - Headword (`word`)
   - Part of speech (`pos`)
   - Cleaned IPA (`sounds[].ipa` normalized per Section 2.2)
   - English definition glosses (`senses[].glosses`)
4. **G2P Fallback:** For headwords lacking native IPA transcriptions, invoke a rule-based or containerized G2P converter (`epitran` or `phonemizer`).

### 3.3 Complexity Reduction: Dual-Channel Candidate Generation

Comparing two 100k-word lexicons creates 10^10 pairs. Evaluating all pairs via transformers or naive loops is computationally infeasible. Conversely, filtering candidates solely on surface similarity completely discards Quadrant 1 (Translation Pairs).

To guarantee complete coverage across all four quadrants without evaluating 10^10 combinations, the engine employs a **Dual-Channel Retrieval Architecture**:

```
 ┌───────────────────────────┐         ┌───────────────────────────┐
 │   Swedish Lemmas (100k)   │         │   English Lemmas (100k)   │
 └─────────────┬─────────────┘         └─────────────┬─────────────┘
               │                                     │
       ┌───────┴─────────────────────────────────────┴───────┐
       ▼                                                     ▼
┌───────────────────────────────┐           ┌───────────────────────────────┐
│ Channel A: Surface Candidates │           │ Channel B: Semantic Candidates│
│ (Cognates & False Friends)    │           │ (Translation Pairs)           │
├───────────────────────────────┤           ├───────────────────────────────┤
│ • Character 2-gram/3-gram     │           │ • Pre-encode all lemma glosses│
│   inverted index              │           │   via sentence-transformers   │
│ • Filter: S_orth >= 0.50 OR   │           │ • Vector ANN Index (FAISS/    │
│   S_phon >= 0.50              │           │   USearch / HNSW)             │
│ • Yields ~150k-300k pairs     │           │ • Retrieve Top-10 semantic    │
│                               │           │   neighbors per headword      │
│                               │           │ • Yields ~150k-300k pairs     │
└──────────────┬────────────────┘           └──────────────┬────────────────┘
               │                                           │
               └─────────────────────┬─────────────────────┘
                                     ▼
                      ┌─────────────────────────────┐
                      │   Candidate Union & Dedupe  │
                      │    (~300k - 500k pairs)     │
                      └──────────────┬──────────────┘
                                     ▼
                      ┌─────────────────────────────┐
                      │ Exact Scoring & Classifying │
                      │ S_orth, S_phon, S_sem,      │
                      │ Best Gloss Attribution      │
                      └──────────────┬──────────────┘
                                     ▼
                      ┌─────────────────────────────┐
                      │ Symmetrical Seed to DB      │
                      │ (sv->en AND en->sv)         │
                      └─────────────────────────────┘
```

1. **Channel A (Surface / Inverted Index):**
   - Indexes character 2-grams and normalized IPA tokens.
   - Retrieves pairs satisfying `S_orth >= 0.50` or `S_phon >= 0.50`.
   - Guarantees capture of True Cognates, Borrowings, and False Friends.
2. **Channel B (Semantic / Vector ANN):**
   - Embeds definition glosses into dense vectors.
   - Queries an Approximate Nearest Neighbor index (e.g., USearch, FAISS, or HNSW) for the top semantic matches (`S_sem >= 0.50`) regardless of spelling or sound.
   - Guarantees capture of Translation Pairs (*hund* / *dog*, *äta* / *eat*) and sound-shifted cognates (*kyrka* / *church*).
3. **Union & Final Scoring:**
   - Merges candidate sets into a deduplicated candidate pool of ~300k–500k pairs.
   - Computes full continuous scores (`S_orth`, `S_phon`, `S_sem`), tags the quadrant category, and records the argmax gloss pair.

---

## 4. Relational Storage Schema

### 4.1 Schema Definition (PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE word_comparisons (
    id BIGSERIAL PRIMARY KEY,
    lang_a VARCHAR(5) NOT NULL,            -- e.g., 'sv'
    word_a VARCHAR(100) NOT NULL,          -- e.g., 'gift'
    ipa_a VARCHAR(100),                    -- e.g., 'jɪft'
    def_a TEXT NOT NULL,                   -- Best-matching sense gloss for Word A
    pos_a VARCHAR(20),                     -- e.g., 'noun'
    
    lang_b VARCHAR(5) NOT NULL,            -- e.g., 'en'
    word_b VARCHAR(100) NOT NULL,          -- e.g., 'gift'
    ipa_b VARCHAR(100),                    -- e.g., 'ɡɪft'
    def_b TEXT NOT NULL,                   -- Best-matching sense gloss for Word B
    pos_b VARCHAR(20),                     -- e.g., 'noun'
    
    orthographic_sim REAL NOT NULL,        -- Range: 0.00 to 1.00
    phonetic_sim REAL NOT NULL,            -- Range: 0.00 to 1.00
    semantic_sim REAL NOT NULL,            -- Range: 0.00 to 1.00
    
    sim_point POINT GENERATED ALWAYS AS (POINT(phonetic_sim, semantic_sim)) STORED,
    category VARCHAR(30) NOT NULL          -- 'true_cognate', 'false_friend', 'partial_cognate', 'translation_pair'
);

-- Primary 2D spatial index for dual-slider matrix queries
CREATE INDEX idx_lexical_sliders_gist 
ON word_comparisons USING gist (lang_a, lang_b, sim_point);

-- Index for exact word lookups
CREATE INDEX idx_lookup_lang_a_word 
ON word_comparisons (lang_a, word_a);

-- Trigram indexes for autocomplete and fuzzy search
CREATE INDEX idx_trgm_word_a ON word_comparisons USING gin (word_a gin_trgm_ops);
CREATE INDEX idx_trgm_word_b ON word_comparisons USING gin (word_b gin_trgm_ops);
```

### 4.2 Symmetrical Storage Strategy

To avoid complex SQL unions or bidirectional `OR` conditions (`WHERE (lang_a = 'sv' AND lang_b = 'en') OR (lang_a = 'en' AND lang_b = 'sv')`), all evaluated pairs are inserted **symmetrically** during ETL:
- Record 1: `sv` -> `en` (`word_a = 'gift'`, `word_b = 'gift'`)
- Record 2: `en` -> `sv` (`word_a = 'gift'`, `word_b = 'gift'`)

For a dataset of ~300k–500k unique pairs, duplicating rows (~600k–1M total rows) consumes minimal disk space while keeping API queries direct and fast (`WHERE lang_a = :source AND lang_b = :target`).

---

## 5. Core Feature Logic & Query Specifications

### 5.1 Dual-Slider 2D Matrix Query

Enables interactive exploration of vocabulary across continuous sound and meaning thresholds:

```sql
SELECT word_a, ipa_a, def_a, word_b, ipa_b, def_b, phonetic_sim, semantic_sim, category
FROM word_comparisons
WHERE lang_a = :lang_a 
  AND lang_b = :lang_b
  AND sim_point <@ box(point(:min_phon, :min_sem), point(:max_phon, :max_sem))
ORDER BY phonetic_sim DESC
LIMIT :limit OFFSET :offset;
```

### 5.2 Dynamic Text Universality Inspector

Analyzes arbitrary text to quantify how "pan-Germanic" its vocabulary is:

1. **Tokenize & Lemmatize:** Normalize input, strip punctuation, lowercase, and extract unique tokens: `['det', 'här', 'är', 'ett', 'test']`.
2. **Batch Query:**
```sql
SELECT word_a, lang_b, word_b, category, semantic_sim, phonetic_sim
FROM word_comparisons
WHERE lang_a = :source_lang
  AND word_a = ANY(:tokens::text[])
  AND semantic_sim >= 0.70;
```
3. **Universality Metrics:**
   - For each input token, calculate cognate/translation coverage across target languages ($L_B \in \{\text{en}, \text{de}, \text{nl}, \text{da}\}$).
   - `Universality Score` = `(sum(cognate_matches) / (total_tokens * target_languages_count)) * 100%`
   - Classification per token:
     - **Universal (Green):** Present in >= 75% of evaluated Germanic languages.
     - **Branch-Specific (Yellow):** Present exclusively in North Germanic or West Germanic.
     - **Isolate (Red):** No semantic/etymological siblings detected.

### 5.3 False Friend Discovery & Quiz Generator

Retrieves high-sound, low-meaning pairs for confusion-matrix discovery or quizzes:

```sql
SELECT word_a, ipa_a, def_a, word_b, ipa_b, def_b, phonetic_sim, semantic_sim
FROM word_comparisons
WHERE lang_a = :lang_a 
  AND lang_b = :lang_b
  AND sim_point <@ box(point(0.70, 0.00), point(1.00, 0.30))
ORDER BY phonetic_sim DESC
LIMIT :limit;
```

---

## 6. Execution Roadmap for Implementation

### Phase 1: Ingestion Pipeline (`/pipeline`)
* `parse_dumps.py`: Stream Kaikki Swedish and English JSONL files. Filter out `"form-of"` inflections, extract clean lemmas, English glosses, and normalized IPAs (with suprasegmental stripping and affricate mapping).
* Output: Cleaned lemma datasets in Parquet / SQLite (`data/lemmas_sv.parquet`, `data/lemmas_en.parquet`).

### Phase 2: Dual-Channel Scoring Engine (`/pipeline`)
* `score_pairs.py`:
  - **Channel A:** Build 2-gram/3-gram inverted index over headwords and IPAs to extract surface candidates.
  - **Channel B:** Encode glosses using `sentence-transformers` and perform ANN Top-K retrieval via USearch / FAISS.
  - **Scorer:** Merge candidate sets, compute exact `S_orth`, `S_phon`, `S_sem`, track best gloss attribution, and classify quadrants.
* Output: `data/comparisons_sv_en.parquet`.

### Phase 3: Database Setup & Seeding (`/db`)
* PostgreSQL container initialization scripts with `btree_gist` and `pg_trgm`.
* `seed_db.py`: Bulk copy symmetrical comparison pairs into PostgreSQL using binary/streaming protocol.

### Phase 4: Go Backend Service (`/backend`)
* High-performance HTTP REST API using Go (`chi` or standard library `net/http` + `pgx/v5`).
* Endpoints:
  - `GET /api/pairs`: Dual-slider matrix bounding-box query with pagination.
  - `POST /api/inspect`: Universality analysis for arbitrary text blocks.
  - `GET /api/false-friends`: Filtered confusion pairs for quizzes.
  - `GET /api/search`: Fuzzy headword lookup with trigram indexing.

### Phase 5: Frontend Web Application (`/frontend`)
* Vite + React SPA with Tailwind CSS and Shadcn UI.
* Components:
  - **Interactive 2D Matrix / Slider Interface:** Dual-axis continuous sliders controlling phonetic and semantic bounds, with responsive scatter visualization.
  - **Universality Text Inspector:** Live textarea with real-time token highlighting (Universal / Branch / Isolate) and breakdown drawer.
  - **False Friend Flashcard / Quiz Mode:** Quick-test mode leveraging deceptive cognate pairs.