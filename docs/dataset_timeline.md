Listed directory brain
Ran command: `git log -n 10 --oneline 6eef373 -- "*.py" "*.go"`
Ran command: `git log --oneline 6eef373..80190a5 -- "*.py" "*.go"`
Ran command: `git show 1e4743c --stat`
Ran command: `git show 1e4743c -p pipeline/src/build_crosslingual_dataset.py`
Ran command: `git log --oneline 80190a5..8933161 -- "*.py" "*.go"`
Ran command: `git show 9c94611 --stat`
Ran command: `git show 9c94611^:llmchathandover.md`
Ran command: `git show 9c94611^:docs/PROJECT_POSTMORTEM_AND_LEARNINGS.md`
Ran command: `git show 9c94611^:docs/DATASET_RETROSPECTIVE_2026-09-29.md`
Ran command: `git log -n 1 --stat 9c94611 | Select-String "realignment"`
Ran command: `git show 9c94611 --name-only | Select-String "realignment"`
Viewed 2026-10-01-dataset-and-product-realignment.md:1-100
Ran command: `git log -n 5 --oneline 8933161 -- "*.py" "*.go"`
Ran command: `git show --stat 8933161`
Ran command: `git show --stat cba2440`
Ran command: `git log --stat 9c94611..8933161 -- "*.md"`
Viewed taxonomy.ts:1-100
Viewed taxonomy.ts:100-144
Viewed reclassify_dataset.py:85-164
Ran command: `git show adc6040:backend/internal/repository/comparisons.go`
Viewed PERFORMANCE_OPTIMIZATIONS_V2.md:1-70

Date: 2026-10-02  
Repository: `C:\Users\ollem\Git\Github\linduistics` 

The fundamental differences across the five stages explain why the current dataset reproduces the v1.2 failure:

---

### Stage 1: v1 (Milestone `6eef373`) — Continuous Metric Heuristic
* **Data Scale**: 5 languages (da, de, en, nb, sv), 20 directed pairs, ~403,298 total rows (~20k rows per pair).
* **Pipeline Mechanism** ([`build_crosslingual_dataset.py`](file:///c:/Users/ollem/Git/Github/linduistics/pipeline/src/build_crosslingual_dataset.py)):
  * Strict candidate caps: `max_translation_pairs = 10,000` mined translation cliques, `max_collision_candidates = 2,500` prefix lookalikes.
  * Mined translations had an artificial semantic anchor: `if is_mined_translation: best_sem_sim = max(best_sem_sim, 0.95)`.
  * Classification was purely heuristic on surface and semantic score quadrants (`classifier.py`). No etymological root extraction or provenance checks existed.
* **Result**:
  * Clean macro numbers: ~43% translations, ~38% true cognates, ~8% partial cognates, ~5% false friends, ~5% other.
* **Why it had to change**:
  * Scientifically indefensible. High spelling + high meaning similarity was assumed to prove Proto-Germanic descent, incorrectly labeling international Latin/French borrowings (*nation*, *information*, *restaurang*) and parallel modern loans as native Germanic cognates.

---

### Stage 2: v1.2 (Milestone `80190a5`) — The Unconstrained Scraper Swamp
* **Data Scale**: Still 5 languages, but exploded 4× to **1,638,454 rows** (see attached image: 142k Swedish–English pairs alone).
* **What Happened in Code**:
  1. Commit `1e4743c` ("retain uncapped comparison candidates"): Removed `max_translation_pairs` and `max_prefix_candidates`. The generator took every 3-letter prefix match across English's 536k Kaikki lemmas against the other languages, pumping over 1.2 million accidental string collisions into the table.
  2. Commit `97e6d8589`: Imposed rigid etymological gating (`if origin == 'cognate'`). If Wiktionary lacked an explicit structured `{{etymon}}` Proto-Germanic root template on both sides, the pair was disqualified from cognacy.
  3. Commit `c9efd7a5`: Stripped the `0.95` semantic anchor for translations. Raw sentence-transformer embeddings between verbose English definitions and brief target glosses regularly scored 0.40–0.65.
* **Result (The Failure in the Attached Image)**:
  * False friends exploded to **22–26%** (361k pairs): every arbitrary 3-letter prefix collision with low semantic similarity (*celtist/cellist*, *extract/extremt*) was classified as a false friend.
  * Cognates collapsed to **0–1%**: only ~3–5% of Wiktionary entries possess machine-readable proto-root templates; the remaining 95% of real cognates were barred from cognacy and fell through into `other`.
  * `other` swelled to **70%** (1.15M pairs).
  * Translation pairs collapsed to **4–6%**.

---

### Stage 3: v2 (Milestone `8933161`) — Gemini's Realignment & Salvage
* **Data Scale**: Kept the 1.64M rows but introduced a **bounded denominator frame** and **graduated sense alignment**.
* **What Happened in Code**:
  1. **5,000-Lemma Frequency Baseline** ([`build_lemma_baseline.py`](file:///c:/Users/ollem/Git/Github/linduistics/pipeline/src/build_lemma_baseline.py)):
     * Recognized that candidate-scraper row proportions cannot serve as vocabulary statistics.
     * Established a core 5,000 frequent lemma set per language, tagging pairs with `is_core = TRUE`. This bounded the vocabulary denominator to $O(N)$ concept slots (~5,000 pairs) instead of $O(N^2)$ Cartesian collision noise.
  2. **Graduated Sense Alignment & Micro-Categories** ([`sense_aligner.py`](file:///c:/Users/ollem/Git/Github/linduistics/pipeline/src/sense_aligner.py)):
     * Acknowledged source data limitations: Wiktionary does not and never will have machine-extractable Proto-Germanic root templates for 100% of Germanic vocabulary.
     * When roots are confirmed cognates: partitioned into `full_cognate`, `semantic_narrowing`, `semantic_broadening`, `archaic_cognate`, or `cognate_false_friend`.
     * **When roots are unextracted in Wiktionary (`origin == 'unknown'`)**:
       * High surface + high semantic similarity (`max_sem >= 0.80`) was admitted to `full_cognate` while preserving `relation = 'unknown'` (so provenance is not falsified).
       * High surface + moderate semantic similarity (`0.50 <= max_sem < 0.80`) became `semantic_narrowing`.
       * High surface + low semantics became `accidental_lookalike` (false cognate lookalike).
       * Distant surface + high semantics (`max_sem >= 0.70`) became `unrelated_equivalent`.
       * Remainder became `independent_root`.
  3. **Backend & Frontend Macro Mapping** ([`comparisons.go`](file:///c:/Users/ollem/Git/Github/linduistics/backend/internal/repository/comparisons.go#L340-L380), [`taxonomy.ts`](file:///c:/Users/ollem/Git/Github/linduistics/frontend/src/constants/taxonomy.ts)):
     * Backend SQL aggregated micro-categories into the canonical macro categories (`full_cognate` $\rightarrow$ `true_cognate`, `semantic_narrowing` $\rightarrow$ `partial_cognate`, `accidental_lookalike` $\rightarrow$ `false_friend`, `unrelated_equivalent` $\rightarrow$ `translation_pair`).
     * Added `idx_is_core`, `idx_category`, B-tree range queries, and in-memory caches.

---

### Stage 4: v3 (Milestone `cba2440`) — The 7-Language Regression
* **What Happened**:
  * Dutch (`nl`) and Icelandic (`is`) were added to the download configs, translation mining, and parsers.
  * **The Fatal Misstep**: Whoever executed commit `cba2440` did not execute `sense_aligner.py` or the v2 reclassification. They ran the un-realigned **legacy v1.2 builder** ([`build_crosslingual_dataset.py`](file:///c:/Users/ollem/Git/Github/linduistics/pipeline/src/build_crosslingual_dataset.py)) using the legacy rigid [`classifier.py`](file:///c:/Users/ollem/Git/Github/linduistics/pipeline/src/classifier.py).
  * Without candidate caps or sense alignment, 1,020,450 new uncurated rows flooded in.
  * The resulting 2,658,904 rows were dumped into PostgreSQL.
  * **Result**: The exact v1.2 catastrophe was re-created at 7-language scale (574,000 false friends, 1.81 million `other`, 1% cognates).

---

### Stage 5: v3.1 (Current State)
* Fixing `etym_root` fallback and intermediate `gem-pro` nodes in `parser.py` recovered template extraction for high-profile benchmark pairs (*water*, *winter*, *hand*, *father*, *brother*, *house*).
* **Why it remained a massive failure**:
  * It only rescued words that actually had a Proto-Germanic template in Kaikki.
  * It still used the legacy v1.2 classification rules in `classifier.py` and the uncurated candidate pool.
  * The 95% of real Germanic vocabulary without structured Wiktionary templates remained trapped in `other` (68.1%) or `false_friend` (21.6%), with total cognacy stuck at 1.61%.