# Phase 1: Ingestion Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Python ingestion pipeline for parsing raw Kaikki Wiktextract dumps, filtering out inflectional bloat, normalizing IPA transcriptions, and calculating surface similarity metrics.

**Architecture:** Streaming JSONL parser with early lemma filtering, C++-backed string distance algorithms via RapidFuzz, phonetic normalization (suprasegmental removal and affricate mapping), and Parquet columnar output.

**Tech Stack:** Python 3.13, RapidFuzz, PyArrow, Orjson, Pytest.

---

### Task 1: Pipeline Setup & Dependencies

**Files:**
- Create: `pipeline/requirements.txt`
- Create: `pipeline/pyproject.toml`
- Create: `pipeline/src/__init__.py`
- Create: `pipeline/tests/__init__.py`

- [x] **Step 1: Create requirements.txt and pyproject.toml**
- [x] **Step 2: Initialize virtual environment and install dependencies**
- [x] **Step 3: Verify installation via import check**

---

### Task 2: Linguistic Metrics & Orthographic Similarity

**Files:**
- Create: `pipeline/src/linguistic_metrics.py`
- Create: `pipeline/tests/test_linguistic_metrics.py`

- [x] **Step 1: Write unit tests for orthographic similarity**
- [x] **Step 2: Implement orthographic_similarity()**
- [x] **Step 3: Run pytest and confirm all pass**

---

### Task 3: IPA Normalization & Phonetic Similarity

**Files:**
- Create: `pipeline/src/ipa_normalizer.py`
- Create: `pipeline/tests/test_ipa_normalizer.py`

- [x] **Step 1: Write unit tests for suprasegmental stripping and affricate mapping**
- [x] **Step 2: Implement normalize_ipa() and phonetic_similarity()**
- [x] **Step 3: Run pytest and confirm all pass**

---

### Task 4: Kaikki Wiktextract Streaming Parser

**Files:**
- Create: `pipeline/src/parser.py`
- Create: `pipeline/tests/test_parser.py`

- [x] **Step 1: Write unit tests with synthetic Kaikki JSON lines**
- [x] **Step 2: Implement stream_kaikki_entries() and parse_dump()**
- [x] **Step 3: Run pytest and verify inflectional filtering, compound dropping, and Parquet serialization**
