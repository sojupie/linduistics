# Phase 2: Dual-Channel Scoring & Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the dual-channel candidate retrieval engine (surface n-gram index + semantic vector embeddings), continuous multi-metric scoring, argmax sense attribution, and 4-quadrant lexical classification.

**Architecture:** 
1. **Channel A (Surface Retrieval):** Inverted character n-gram index and phonetic filter to capture Cognates and False Friends.
2. **Channel B (Semantic Retrieval):** Precomputed dense gloss embeddings with cosine / vector ANN search to capture Translation Pairs and sound-shifted cognates.
3. **Candidate Fusion & Scoring:** Merge candidate pools, compute exact $S_{\text{orth}}$, $S_{\text{phon}}$, $S_{\text{sem}}$, track argmax sense glosses $(d_{A, i^*}, d_{B, j^*})$, classify quadrant, and export symmetrical Parquet dataset.

**Tech Stack:** Python 3.13, PyTorch / Sentence-Transformers (`paraphrase-multilingual-MiniLM-L12-v2`), RapidFuzz, PyArrow, Pytest.

---

### Task 1: Dependencies & Environment Setup

**Files:**
- Modify: `pipeline/requirements.txt`
- Modify: `pipeline/pyproject.toml`

- [x] **Step 1: Add sentence-transformers and vector index dependencies**
- [x] **Step 2: Install dependencies into pipeline/.venv**
- [x] **Step 3: Verify PyTorch and SentenceTransformer imports**

---

### Task 2: Channel A — Surface Candidate Indexer

**Files:**
- Create: `pipeline/src/surface_index.py`
- Create: `pipeline/tests/test_surface_index.py`

- [x] **Step 1: Write unit tests for inverted n-gram candidate generator**
- [x] **Step 2: Implement SurfaceIndex class (2-gram/3-gram indexing, S_orth >= 0.50, S_phon >= 0.50 candidate retrieval)**
- [x] **Step 3: Run pytest and confirm all pass**

---

### Task 3: Channel B — Vector Semantic Embeddings & Sense Matcher

**Files:**
- Create: `pipeline/src/semantic_matcher.py`
- Create: `pipeline/tests/test_semantic_matcher.py`

- [x] **Step 1: Write unit tests for gloss embedding, cross-sense max cosine similarity, and argmax attribution**
- [x] **Step 2: Implement SemanticMatcher class (batched encoding, sense cross-scoring, Top-K candidate retrieval)**
- [x] **Step 3: Run pytest and confirm all pass**

---

### Task 4: Classifier, Candidate Fusion & Symmetrical Export

**Files:**
- Create: `pipeline/src/classifier.py`
- Create: `pipeline/src/score_pairs.py`
- Create: `pipeline/tests/test_classifier.py`

- [x] **Step 1: Write unit tests for taxonomy classification rules**
- [x] **Step 2: Implement classify_pair() logic**
- [x] **Step 3: Implement score_pairs.py combining Channel A + Channel B into symmetrical Parquet**
- [x] **Step 4: Verify end-to-end scoring pipeline on sample Swedish and English lemmas**
