# Dataset & Product Realignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Realign Linduistics from an uncurated 1.6M-row scraper swamp into an academically defensible, curated Germanic comparative explorer by purging `other` noise from the active denominator, establishing frequency-stratified lemma baselines, enforcing sense-aware alignment, and harmonizing the existing four application pillars (Overview, Lexicon, Quiz, Inspector).

**Architecture:** Replace the open Cartesian scraper with a 5,000-lemma frequency-ranked core per language. For every core lemma, evaluate both translation counterparts and form lookalikes. This bounds the comparative space to $O(N)$ concept slots (~5,000 rows per pair) rather than $O(N^2)$ Cartesian combinations, allowing exact quantification of both cognates and non-related vocabulary without database bloat. Classify pairs into granular linguistic micro-categories (narrowing, broadening, archaic drift, cognate false friends, accidental lookalikes, Hanseatic loans). Update the Go backend to serve these proportions, and adapt the React frontend with understated, classical linguistic terminology.

**Tech Stack:** Python (pipeline, Wiktextract parsing, PanPhon phonetic metrics, spaCy), Go (REST API, PostgreSQL / pgx), React 19 / TypeScript / Vite / TailwindCSS / TanStack Router & Query.

---

### Task 1: Frequency-Stratified Lemma Baseline & Bounded Denominator Frame

**Files:**
- Create: `pipeline/src/build_lemma_baseline.py`
- Modify: `pipeline/src/build_crosslingual_dataset.py`
- Test: `pipeline/tests/test_lemma_baseline.py`

- [x] **Step 1: Write failing test for lemma baseline generator**

```python
# pipeline/tests/test_lemma_baseline.py
import pytest
from pipeline.src.build_lemma_baseline import filter_to_core_lemmas, LemmaEntry

def test_filter_to_core_lemmas_bounds_vocabulary():
    raw_entries = [
        LemmaEntry(lemma="hund", lang="sv", pos="noun", frequency_rank=120),
        LemmaEntry(lemma="hittepåord", lang="sv", pos="noun", frequency_rank=45000),
        LemmaEntry(lemma="dog", lang="en", pos="noun", frequency_rank=85),
        LemmaEntry(lemma="defenestration", lang="en", pos="noun", frequency_rank=32000),
    ]
    core = filter_to_core_lemmas(raw_entries, max_rank=5000)
    assert len(core) == 2
    assert {e.lemma for e in core} == {"hund", "dog"}
```

- [x] **Step 2: Run test to verify it fails**

Run: `pytest pipeline/tests/test_lemma_baseline.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'pipeline.src.build_lemma_baseline'`

- [x] **Step 3: Implement core lemma filter and baseline builder**

```python
# pipeline/src/build_lemma_baseline.py
from dataclasses import dataclass
from typing import List

@dataclass(frozen=True)
class LemmaEntry:
    lemma: str
    lang: str
    pos: str
    frequency_rank: int

def filter_to_core_lemmas(entries: List[LemmaEntry], max_rank: int = 5000) -> List[LemmaEntry]:
    """Filters vocabulary entries to the top N frequency-ranked core lemmas per language."""
    return [e for e in entries if e.frequency_rank <= max_rank]
```

- [x] **Step 4: Run test to verify it passes**

Run: `pytest pipeline/tests/test_lemma_baseline.py -v`
Expected: PASS

- [x] **Step 5: Concept-anchored candidate generation in `build_crosslingual_dataset.py`**

Quantify the entire vocabulary (both cognates and non-related words) without Cartesian explosion ($O(N)$ instead of $O(N^2)$):
For each lemma in the 5,000 core vocabulary of Language A:
1. **Primary Concept Counterpart:** Map to primary translation equivalent in Language B.
   - If they share an ancestral root $\rightarrow$ Classify as **Cognate** (full cognate, semantic narrowing, or broadening).
   - If they have distinct roots $\rightarrow$ Classify as **Unrelated Equivalent** (`unrelated_equivalent`, e.g. *barn* $\leftrightarrow$ *child*, *hund* $\leftrightarrow$ *dog*).
2. **Surface Collision Check:** Match against lookalikes with $\Delta_o \ge 0.65$ or $\Delta_p \ge 0.65$ that diverge in meaning ($\Delta_s < 0.40$).
   - If shared root $\rightarrow$ **Cognate False Friend** (e.g. German *Gift* $\leftrightarrow$ English *gift*).
   - If distinct roots $\rightarrow$ **Accidental Lookalike / False Cognate** (e.g. Swedish *bra* $\leftrightarrow$ English *bra*).
3. **Independent Lexicon:** Any core lemma with no cognate counterpart in Language B is classified as **Independent Lexicon** (`independent_root`), capturing language-specific innovations and separate non-Germanic loan strata.

This precisely accounts for 100% of the core vocabulary—including non-related words—while capping the dataset at ~5,000 bounded records per language pair.

---

### Task 2: Sense-Level Alignment & False Friend Disambiguation

**Files:**
- Create: `pipeline/src/sense_aligner.py`
- Modify: `pipeline/src/classifier.py`
- Test: `pipeline/tests/test_sense_aligner.py`

- [x] **Step 1: Write test for sense alignment and micro-category classification**

```python
# pipeline/tests/test_sense_aligner.py
import pytest
from pipeline.src.sense_aligner import align_senses, classify_pair_senses

def test_classify_micro_categories():
    # 1. Full invariant cognate
    res_winter = classify_pair_senses(
        word_a="vinter", lang_a="sv", senses_a=["the coldest season of the year"], root_a="*wintruz",
        word_b="winter", lang_b="en", senses_b=["the coldest season of the year"], root_b="*wintruz",
        ortho_sim=0.83, phono_sim=0.90, max_semantic_sim=0.98
    )
    assert res_winter.category == "full_cognate"

    # 2. Semantic narrowing (hound vs hund)
    res_hound = classify_pair_senses(
        word_a="hund", lang_a="sv", senses_a=["domestic canine, dog"], root_a="*hundaz",
        word_b="hound", lang_b="en", senses_b=["hunting dog, hound"], root_b="*hundaz",
        ortho_sim=0.80, phono_sim=0.85, max_semantic_sim=0.72
    )
    assert res_hound.category == "semantic_narrowing"

    # 3. Cognate false friend (Gift vs gift)
    res_gift = classify_pair_senses(
        word_a="Gift", lang_a="de", senses_a=["poison, venom"], root_a="*geb-",
        word_b="gift", lang_b="en", senses_b=["present, offering"], root_b="*geb-",
        ortho_sim=1.0, phono_sim=0.90, max_semantic_sim=0.15
    )
    assert res_gift.category == "cognate_false_friend"
    assert res_gift.etymological_relation == "cognate"

    # 4. Accidental lookalike / false cognate (bra vs bra)
    res_bra = classify_pair_senses(
        word_a="bra", lang_a="sv", senses_a=["good, well"], root_a="*brav-",
        word_b="bra", lang_b="en", senses_b=["undergarment, brassiere"], root_b="brassière",
        ortho_sim=1.0, phono_sim=0.95, max_semantic_sim=0.05
    )
    assert res_bra.category == "accidental_lookalike"
    assert res_bra.etymological_relation == "false_cognate"

    # 5. Unrelated translation equivalent (barn vs child)
    res_barn = classify_pair_senses(
        word_a="barn", lang_a="sv", senses_a=["young human, offspring"], root_a="*barną",
        word_b="child", lang_b="en", senses_b=["young human, offspring"], root_b="*kilþaz",
        ortho_sim=0.0, phono_sim=0.10, max_semantic_sim=0.95
    )
    assert res_barn.category == "unrelated_equivalent"
    assert res_barn.etymological_relation == "unrelated"
```

- [x] **Step 2: Run test to verify failure**

Run: `pytest pipeline/tests/test_sense_aligner.py -v`
Expected: FAIL

- [x] **Step 3: Implement micro-category classification logic**

```python
# pipeline/src/sense_aligner.py
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class AlignedClassification:
    category: str
    etymological_relation: str
    active_sense_a: str
    active_sense_b: str
    semantic_sim: float

def classify_pair_senses(
    word_a: str, lang_a: str, senses_a: List[str], root_a: Optional[str],
    word_b: str, lang_b: str, senses_b: List[str], root_b: Optional[str],
    ortho_sim: float, phono_sim: float, max_semantic_sim: float,
    is_archaic: bool = False, is_borrowed_layer: bool = False
) -> AlignedClassification:
    shared_root = bool(root_a and root_b and root_a == root_b)
    high_surface = (ortho_sim >= 0.65 or phono_sim >= 0.65)
    
    if shared_root:
        if is_borrowed_layer:
            category = "sister_loanword"
            relation = "borrowed_stratum"
        elif max_semantic_sim >= 0.85:
            category = "full_cognate"
            relation = "cognate"
        elif max_semantic_sim >= 0.60:
            category = "archaic_cognate" if is_archaic else "semantic_narrowing"
            relation = "cognate"
        elif high_surface:
            category = "cognate_false_friend"
            relation = "cognate"
        else:
            category = "semantic_divergence"
            relation = "cognate"
    else:
        distinct_roots = bool(root_a and root_b and root_a != root_b)
        if high_surface and max_semantic_sim < 0.40:
            category = "accidental_lookalike"
            relation = "false_cognate" if distinct_roots else "unknown"
        elif max_semantic_sim >= 0.70:
            category = "unrelated_equivalent"
            relation = "unrelated"
        else:
            category = "independent_root"
            relation = "independent"

    return AlignedClassification(
        category=category,
        etymological_relation=relation,
        active_sense_a=senses_a[0] if senses_a else "",
        active_sense_b=senses_b[0] if senses_b else "",
        semantic_sim=max_semantic_sim
    )
```

- [x] **Step 4: Run test to verify pass**

Run: `pytest pipeline/tests/test_sense_aligner.py -v`
Expected: PASS

---

### Task 3: Backend API & Aggregation Refactoring

**Files:**
- Modify: `backend/internal/repository/language_repository.go`
- Modify: `backend/internal/handlers/language_handler.go`
- Test: `backend/internal/repository/language_repository_test.go`

- [x] **Step 1: Write test for bounded denominator language stats**

Verify `GetLanguagePairStats` calculates percentages based on the curated core vocabulary rather than raw row counts including deprecated `other` rows.

- [x] **Step 2: Update repository query in `language_repository.go`**

Adjust SQL aggregations in `GetLanguagePairStats` to compute proportions over the bounded 5,000-lemma core:
- Total Baseline = Bounded core lemma count ($N = 5,000$).
- Cognate Proportion = `COUNT(*) FILTER (WHERE category IN ('full_cognate', 'semantic_narrowing', 'semantic_broadening', 'archaic_cognate'))::float / total_core`
- False Friend Proportion = `COUNT(*) FILTER (WHERE category IN ('cognate_false_friend', 'accidental_lookalike'))::float / total_core`
- Unrelated Proportion = `COUNT(*) FILTER (WHERE category IN ('unrelated_equivalent', 'independent_root'))::float / total_core`
- Shared Loan Stratum = `COUNT(*) FILTER (WHERE category = 'sister_loanword')::float / total_core`

- [x] **Step 3: Run backend test suite**

Run: `go test ./backend/...`
Expected: PASS

---

### Task 4: Frontend UI Taxonomy & Metric Harmonization

**Files:**
- Modify: `frontend/src/components/languages/TaxonomyRatioBar.tsx`
- Modify: `frontend/src/components/languages/LanguageOverviewTable.tsx`
- Modify: `frontend/src/components/lexicon/LexiconTable.tsx`
- Modify: `frontend/src/components/lexicon/WordPairDetails.tsx`
- Modify: `frontend/src/types/linguistics.ts`

- [x] **Step 1: Update `TaxonomyRatioBar.tsx`**

Replace arbitrary scraper remainder segments with authentic comparative proportions:
- Shared Cognates (Green)
- Semantic Shifts & Narrowing (Amber)
- False Friends & Traps (Coral)
- Unrelated Lexicon (Slate/Neutral)
- Shared Historical Loans (Indigo)

- [x] **Step 2: Update `LanguageOverviewTable.tsx` with understated linguistic labels**

Replace platform-predictable marketing buzzwords ("Friction", "Density") with direct linguistic terminology:
- "Shared Cognates" (% of core vocabulary with common Germanic roots)
- "False Friends" (% of lookalikes with conflicting meanings)
- "Unrelated Lexicon" (% of core vocabulary with independent roots)
- "Phonetic Similarity" ($\Delta_p$)
- "Spelling Similarity" ($\Delta_o$)
- "Lexical Proximity" (combined phonological and etymological alignment)

- [x] **Step 3: Update `LexiconTable.tsx` & `WordPairDetails.tsx` for micro-categories**

Ensure badges, filter dropdowns, and specimen detail panels recognize and format:
- `full_cognate` ("Full Cognate")
- `semantic_narrowing` ("Semantic Narrowing")
- `semantic_broadening` ("Semantic Broadening")
- `archaic_cognate` ("Archaic / Poetic Cognate")
- `cognate_false_friend` ("Cognate False Friend")
- `accidental_lookalike` ("Accidental Lookalike")
- `sister_loanword` ("Shared Loan Stratum")
- `unrelated_equivalent` ("Unrelated Equivalent")

- [x] **Step 4: Run frontend typecheck and build**

Run: `npm run build --prefix frontend`
Expected: PASS with 0 errors

---

### Task 5: End-to-End System Verification

**Files:**
- Script: `pipeline/scratch/verify_all.py`
- Test: `frontend/src/test/integration.test.ts`

- [x] **Step 1: Verify data integrity against test pairs**
Check the canonical reference specimens across Swedish, English, and German:
- *hund* (SV) $\leftrightarrow$ *hound* (EN): True Cognate, `*hundaz`.
- *gift* (DE) $\leftrightarrow$ *gift* (EN): False Friend · Cognate, `*geb-`.
- *bra* (SV) $\leftrightarrow$ *bra* (EN): False Friend · False Cognate.
- *barn* (SV) $\leftrightarrow$ *child* (EN): Translation Pair.

- [x] **Step 2: Verify all 4 primary application pillars render cleanly**
1. `/languages`: Language Overview & 2D/3D MDS Relationship Map.
2. `/lexicon`: Comparative Lexicon Table & Specimen Dossier with descent chains.
3. `/quiz`: False Friends Quiz with Trap Avoidance and Autopsy.
4. `/inspector`: Text Inspector with dependency syntax and multi-language substitution.
