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

## 6. Implementation Action Plan

1. **Pipeline Extraction Enhancement (`parser.py`):**
   * Extract all valid senses and definitions into `senses: List[dict]`.
   * Extract `etymology_text` and parse `etymology_templates` (`inh`, `bor`, `der`, `cog`).
2. **Sense Alignment & Disqualification Engine (`build_crosslingual_dataset.py`):**
   * Compute full $N \times M$ sense matrix between Word A and Word B.
   * Isolate the argmax sense pair $(i^*, j^*)$ and store their exact texts in `def_a` and `def_b`.
   * Disqualify pairs from False Friend classification if any primary sense matches with $S_{\text{sem}} \ge 0.75$.
   * Tag `false_friend_type` as `'etymological_shift'` or `'surface_collision'`.
3. **Database Migration (`003_add_polysemy_and_etymology.sql`):**
   * Add `senses_a JSONB`, `senses_b JSONB`, `etym_root VARCHAR(100)`, `etym_text_a TEXT`, `etym_text_b TEXT`, `false_friend_type VARCHAR(30)`.
   * Add unique index on `(lang_a, lang_b, word_a, word_b)`.
4. **Dense Table Frontend (`SpecimenDecks.tsx`):**
   * Replace card deck with a dense, paginated register table.
   * One row per headword pair.
   * Drawer displays full polysemous contrast and etymological lineage.
