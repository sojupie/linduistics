# Linduistics Dataset & Computational Lexicology Specification

This document defines the architectural requirements, linguistic principles, storage structures, and validation rules for the Linduistics dataset pipeline. 

Dataset integrity and linguistic rigor take absolute precedence over user interface drafting.

---

## 1. The Two Classes of False Friends

A major source of lexicological distortion is conflating accidental surface collisions with true historical semantic divergence. The pipeline and database must distinguish between two explicit tiers of False Friends:

```
                          ┌──────────────────────────────────────────────┐
                          │   High Surface Overlap (S_orth/S_phon >= 0.70)│
                          │   Disjoint / Low Meaning (S_sem <= 0.30)     │
                          └──────────────────────┬───────────────────────┘
                                                 │
                     ┌───────────────────────────┴───────────────────────────┐
                     ▼                                                       ▼
      ┌─────────────────────────────┐                         ┌─────────────────────────────┐
      │  Type A: Academic / Strict  │                         │  Type B: Casual / Deceptive │
      │  (Etymological Divergence)  │                         │     (Surface Collision)     │
      ├─────────────────────────────┤                         ├─────────────────────────────┤
      │ • Verified common ancestor  │                         │ • Different ancestral roots │
      │   (Proto-Germanic, Latin)   │                         │ • Accidental homographs     │
      │ • Meaning drifted over time │                         │ • Unrelated loanword clashes│
      │ • e.g., gift / gift         │                         │ • e.g., bra / bra           │
      │   (poison vs. present, both │                         │   (Swedish 'good' vs.       │
      │   from *giftiz 'to give')   │                         │   English 'brassiere')      │
      │ • e.g., semester / semester │                         │ • e.g., mist / Mist         │
      │   (holiday vs. academic     │                         │   (English 'fog' vs.        │
      │   term, both from Latin)    │                         │   German 'manure')          │
      └─────────────────────────────┘                         └─────────────────────────────┘
```

### Type A: Academic / Etymological False Friends (`false_friend_etymological`)
* **Definition:** Pairs that share a verified historical etymon (inherited from Proto-Germanic, Proto-Indo-European, or a common classical borrowing), but whose semantic paths diverged over centuries of linguistic evolution.
* **Examples:**
  * Swedish *gift* (poison) vs. English *gift* (present) $\leftarrow$ Proto-Germanic *\*giftiz* ("a giving / that which is given"). English preserved the positive gifting sense; High German and Scandinavian narrowed to euphemistic poison/dosage.
  * Swedish *semester* (holiday / vacation) vs. English *semester* (academic term) $\leftarrow$ Latin *semestris* ("six-month period").
  * German *bald* (soon) vs. English *bold* $\leftarrow$ Proto-Germanic *\*balþaz* (originally "brave", shifting in German via "promptly/hastily" to "soon").

### Type B: Casual / Deceptive Surface Collisions (`false_friend_collision`)
* **Definition:** Pairs that look or sound nearly identical due to chance phonetic convergence, identical spelling of completely unrelated native roots, or borrowing from disparate third-party languages.
* **Examples:**
  * Swedish *bra* (good; $\leftarrow$ Italian *bravo* via Middle Low German) vs. English *bra* (brassiere; clipping of French *brassière*).
  * German *Mist* (manure; native Germanic *\*mihstaz*) vs. English *mist* (light fog; native Germanic *\*mihstaz* / *\*mihstuz*, though distantly cognate, functioning in practical modern pedagogy as an accidental homograph).
  * German *Hell* (bright) vs. English *hell* (underworld).
  * German *Rat* (council, advice) vs. English *rat* (rodent).

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
2. **False Friend Disqualification Rule:** A headword pair $(W_A, W_B)$ **cannot** be classified as a global False Friend if there exists *any* active sense pair with $S_{\text{sem}} \ge 0.75$. If Swedish *halva* and English *halva* share the confection sense, the primary classification is `true_cognate` / `direct_borrowing`, with secondary divergent senses documented in the inspection drawer.
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
    
    -- Detailed Taxonomy
    category VARCHAR(30) NOT NULL,             -- 'true_cognate', 'false_friend', 'partial_cognate', 'translation_pair'
    false_friend_type VARCHAR(30),            -- 'etymological_shift', 'surface_collision', NULL
    
    -- Active Aligned Senses (The exact matching sense pair)
    def_a TEXT NOT NULL,
    def_b TEXT NOT NULL,
    
    -- Full Polysemous Inventory (All senses for deep inspection)
    senses_a JSONB NOT NULL DEFAULT '[]'::jsonb,
    senses_b JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Etymological Lineage
    etym_root VARCHAR(100),                   -- e.g., 'Proto-Germanic *giftiz'
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

## 5. Phonetic Alignment: Articulatory Feature Matrix (Replacing Levenshtein)

Raw string Levenshtein fails to capture natural phonetic shifts:
* $/d/ \leftrightarrow /t/$ is a single-feature voicing shift (low articulatory distance $\approx 0.10$).
* $/d/ \leftrightarrow /m/$ alters voicing, nasality, and place of articulation (high articulatory distance $\approx 0.85$).

### The Feature Vector Model:
Each phoneme is mapped to a vector of articulatory features:
* **Manner:** Plosive, Fricative, Affricate, Nasal, Liquid, Glide, Vowel.
* **Place:** Bilabial, Labiodental, Dental, Alveolar, Postalveolar, Palatal, Velar, Uvular, Glottal.
* **Voicing:** Voiced ($+1$) vs. Voiceless ($0$).
* **Vowel Dimension:** Height (High, Mid, Low), Backness (Front, Central, Back), Rounding (Rounded vs. Unrounded).

Phonetic similarity between aligned sequences $P = (p_1, \dots, p_k)$ and $Q = (q_1, \dots, q_k)$ is:
$$S_{\text{art}}(P, Q) = 1.0 - \frac{\sum_{i=1}^k \text{ArticulatoryDistance}(p_i, q_i)}{k}$$
This recognizes Germanic consonant shifts (Grimm's Law: $p \rightarrow f$, $t \rightarrow \theta$, $k \rightarrow h$; High German shift: $t \rightarrow ts$, $p \rightarrow pf$) as close phonetic relatives.

---

## 6. Implementation Status Matrix

The following table defines the current operational status across all architectural layers:

| Layer / Component | Status | Verified Capabilities | Active Limitations / Open Work |
| :--- | :--- | :--- | :--- |
| **Pipeline: Parser (`parser.py`)** | **Deployed** | Extracts full `senses` JSON (gloss, pos, tags, `is_active`); parses ancestral etymology templates (`gem-pro`, `ine-pro`, `la`) and regex fallbacks; fast CMU dict + rule fallback for English G2P. | Obsolete sense classification relies strictly on Wiktextract tags (`obsolete`, `archaic`, `historical`, `dated`). |
| **Pipeline: Alignment & Classifier (`build_crosslingual_dataset.py`, `classifier.py`)** | **Deployed** | Full $N \times M$ sense matrix alignment; argmax binding $(i^*, j^*)$ for `def_a`/`def_b`; False Friend Disqualification Rule ($S_{\text{sem}} \ge 0.75$ on active senses); Type A vs Type B tagging; exact-spelling collision inclusion (5,112/pair). | Loanword identity override requires exact string match between gloss and counterpart headword. Articulatory distance matrix not yet integrated. |
| **Database Schema (`003_add_polysemy_and_etymology.sql`)** | **Deployed** | 320,374 pairs populated across 20 directed pairs; `senses_a` and `senses_b` JSONB columns; `false_friend_type`, `etym_root`, `etym_text_a`, `etym_text_b`; unique constraint on `(lang_a, lang_b, word_a, word_b)`. | Pairwise edge storage only; no unified $N$-language clique cluster table. |
| **Backend API (`internal/repository/comparisons.go`)** | **Deployed** | Queries return `senses_a`, `senses_b`, `false_friend_type`, `etym_root`, `etym_text_a`, `etym_text_b`; spatial GiST slider indexing; 100% test pass rate. | Endpoints return raw JSONB; no cluster aggregation endpoint for root lineages. |
| **Frontend Types & API (`frontend/src/types/`, `frontend/src/api/`)** | **Pending** | Basic `WordComparison` interface in place. | Needs updated TypeScript fields for `senses_a`, `senses_b`, `false_friend_type`, `etym_root`, `etym_text_a`, `etym_text_b`. |
| **Frontend UI (`frontend/src/routes/specimens.lazy.tsx`)** | **Pending** | Basic routing and layout. | Currently uses legacy card deck (`SpecimenDecks.tsx`). Must be rewritten to a dense, paginated table with detail drawer. |

---

## 7. Known Lexicological Caveats & Architectural Edge Cases

This section documents active boundary conditions, edge cases, algorithmic trade-offs, and data limitations that must remain explicitly tracked across all pipeline and UI iterations:

### 7.1 Homographs with Divergent Ancestral Origins Under One Headword
* **The Problem:** A single orthographic string in a language may represent two historically distinct words (homographs with different etymologies). For example, Swedish *gift* represents:
  1. *gift¹* (noun, neuter): poison $\leftarrow$ Middle Low German / German *Gift* ($\leftarrow$ Proto-Germanic *\*gifti*).
  2. *gift²* (adjective): married $\leftarrow$ Old Swedish *gipt* / Old Norse *gipta* ($\leftarrow$ Proto-Germanic *\*giftiz*).
* **Dataset Decision:** Due to the strict primary invariant of **one row per headword pair** (`UNIQUE(lang_a, lang_b, word_a, word_b)`), both homographs share a single database record. When compared to English *gift* (noun: present, verb: give), the argmax sense evaluator selects Swedish *married* ($S_{\text{sem}} = 0.22$) over *poison* ($S_{\text{sem}} = 0.04$) because $0.22 > 0.04$. 
* **Pedagogical Requirement:** While both senses satisfy $S_{\text{sem}} \le 0.30$ (preserving the Type A False Friend tag), the UI Specimen Detail Drawer must prominently surface the *poison* sense alongside *married* so learners understand the primary semantic collision.

### 7.2 Obsolete / Historical Sense Filtering & The Disqualification Rule
* **The Problem:** If archaic or obsolete dictionary senses are treated as active meanings, legitimate modern False Friends would be disqualified. In historical Swedish, *gift* was once an obsolete noun meaning "a present" (attested from Proto-Germanic *\*giftiz*). If an unconstrained sense search evaluates this sense against English *gift*, $S_{\text{sem}}$ reaches $\approx 0.72$, falsely categorizing the pair as a cognate.
* **Invariant:** Senses flagged with `obsolete`, `archaic`, `historical`, or `dated` tags in Wiktextract are tagged with `is_active: false`. The **False Friend Disqualification Rule** ($S_{\text{sem}} \ge 0.75$) checks **only active modern senses**. Obsolete senses are retained in `senses_a` and `senses_b` for historical inspection in the drawer, but are strictly barred from disqualifying modern False Friends.
* **Caveat:** If a Wiktionary contributor neglected to tag an archaic meaning with appropriate template markup, that sense remains `is_active: true` and can artificially inflate $S_{\text{sem}}$.

### 7.3 Identity & Circular Definitions in Foreign Loanwords
* **The Problem:** In Wiktextract, shared internationalisms and culinary loanwords are frequently given circular single-word definitions in the source language (e.g., the Swedish Wiktionary entry for *halva* is defined simply as `['halva']`). Passing the isolated token `"halva"` into a multilingual sentence transformer against a descriptive English gloss (*"A confection usually made from crushed sesame seeds and honey..."*) produces an artificially depressed cosine similarity of $\approx 0.12$, triggering a false False Friend classification.
* **Invariant:** In `align_pair_senses`, if two identical headwords (`word_a.lower() == word_b.lower()`) have a definition gloss that literally matches the counterpart headword (`gloss == word_b`), the sense pair is recognized as a direct lexicographical identity with $S_{\text{sem}} = 1.00$. This prevents shared loanwords (*halva*, *taco*, *sushi*) from collapsing into False Friends.
* **Caveat:** Exact string matching only handles literal gloss-to-headword identities (`"halva" == "halva"`). If the Wiktionary gloss contains qualifying phrasing (e.g., `"a type of halva"`, `"sesame halva"`, or variant spelling `"halvah"`), it falls back to raw embedding cosine similarity, which may score lower than intended.

### 7.4 Phonetic Similarity Limitation: Levenshtein vs. Articulatory Features
* **Current State:** Phonetic similarity in `pipeline/src/ipa_normalizer.py` operates via normalized Levenshtein string edit distance over IPA representations after suprasegmental stripping and affricate mapping.
* **Caveat:** String edit distance treats all phoneme substitutions equally ($/d/ \leftrightarrow /t/$ costs the same as $/d/ \leftrightarrow /m/$). This underestimates sound shifts governed by regular phonetic laws (e.g., Grimm's Law: $p \rightarrow f$, $t \rightarrow \theta$, $k \rightarrow h$; High German consonant shift: $t \rightarrow ts$, $p \rightarrow pf$). Implementation of the full articulatory feature matrix (Section 5) remains an open work item.
* **Transcription Variability:** Phonemic transcriptions in Wiktionary vary in phonetic granularity across languages (e.g., narrow Swedish transcriptions with tone accents vs. broad English CMU transcriptions). Suprasegmental normalization mitigates but does not fully eliminate transcription bias.

### 7.5 Etymology Template Coverage Asymmetry
* **The Problem:** Wiktionary's crowd-sourced nature means etymology coverage is non-uniform. High-frequency words possess rich structured templates (`inh`, `der`, `gem-pro`), but rarer vocabulary may only have unstructured prose text or no etymology section at all.
* **Behavior:** If a word lacks structured ancestral templates, `classifier.py` falls back to regex matching on `etymology_text`. If no ancestral link can be verified from the extracted text, a deceptive surface overlap defaults conservatively to Type B (`surface_collision`) rather than assuming historical cognacy.
* **Caveat:** Some genuine historical cognates with unparsed prose etymologies may currently be classified as Type B rather than Type A.

### 7.6 Pairwise Storage vs. Multi-Language Root Cliques
* **Current State:** Data is currently indexed and queried pairwise across the 20 directed pairs in `word_comparisons`.
* **Caveat:** While `etym_root` records ancestral roots (e.g., `Proto-Germanic *hundaz`), there is no first-class `cognate_cliques` table grouping all 5 languages into a single graph node. Cross-language universality is currently derived at query time via `GetByTokens`.

### 7.7 Dual-Channel Candidate Recall Boundaries (Non-Identical Homophones)
* **Current State:** Exact-spelling collisions are exhaustively captured (5,112 per language pair). Candidate generation for spelling-divergent pairs relies on:
  1. Channel A: Character 2-gram/3-gram inverted index ($S_{\text{orth}} \ge 0.50$ or $S_{\text{phon}} \ge 0.50$).
  2. Channel B: Semantic vector ANN ($S_{\text{sem}} \ge 0.50$).
* **Caveat:** Homophones or near-homophones with drastically divergent orthography and low semantic overlap (e.g., German *See* [lake] vs. Swedish *sjö* [lake/sea] if evaluated as a false friend against an unrelated homophone) can fail candidate recall if they share fewer than 50% character $n$-grams and are not returned by the semantic Top-K retrieval channel.

### 7.8 Symmetrical Pair Directionality & Asymmetric Polysemy
* **Current State:** The database stores symmetrical rows (`A -> B` and `B -> A`).
* **Caveat:** While continuous scores ($S_{\text{orth}}, S_{\text{phon}}, S_{\text{sem}}$) are symmetric, semantic polysemy is inherently directional. A headword in Language A may have 8 distinct senses while the counterpart in Language B has only 1. The argmax alignment captures the optimal intersection, but the proportion of unaligned semantic mass is asymmetric. Senses arrays (`senses_a`, `senses_b`) must be inspected to evaluate the full directional asymmetry.

### 7.9 Semantic Blurring in Metaphorical and Figurative Senses ($0.30 < S_{\text{sem}} < 0.75$)
* **The Problem:** Many cognates retain a shared literal meaning but have developed divergent metaphorical extensions, or vice versa.
* **Classification Impact:** Senses with cosine similarity between 0.30 and 0.75 fall into `partial_cognate`. If a headword's primary modern sense is deceptive but a secondary figurative sense produces a moderate similarity score (e.g., 0.35), the pair avoids the `false_friend` label. The threshold boundaries ($S_{\text{sem}} \le 0.30$ for False Friends; $S_{\text{sem}} \ge 0.75$ for True Cognates) are discrete cutoffs applied to continuous semantic distributions.


