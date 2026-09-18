# Phase 3: Database Layer & Spatial Seeding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the PostgreSQL database layer, execute schema migrations with spatial GiST indexing, bulk-seed 145k+ precomputed comparison pairs via the binary COPY protocol, and verify sub-millisecond 2D slider bounding-box queries.

**Architecture:** Docker Compose PostgreSQL 16 service, DDL migration with `btree_gist` composite 2D index over `(lang_a, lang_b, sim_point)`, Python streaming seeder with `psycopg3` binary `COPY`, and benchmark test suite.

**Tech Stack:** Docker, PostgreSQL 16, Python 3.13, Psycopg 3, PyArrow.

---

### Task 1: Docker Compose & Environment Setup

**Files:**
- Create: `db/docker-compose.yml`
- Create: `.env.example`
- Create: `.env`

- [x] **Step 1: Write db/docker-compose.yml with postgres:16-alpine and healthcheck**
- [x] **Step 2: Create .env and .env.example with DATABASE_URL**
- [x] **Step 3: Start docker compose service and verify readiness**

---

### Task 2: Schema Migrations & Spatial Indexing DDL

**Files:**
- Create: `db/migrations/001_create_word_comparisons.sql`

- [x] **Step 1: Write DDL enabling btree_gist and pg_trgm extensions**
- [x] **Step 2: Define word_comparisons table with stored generated column sim_point**
- [x] **Step 3: Add spatial GiST index on (lang_a, lang_b, sim_point) and trigram GIN indexes**
- [x] **Step 4: Execute migration against local PostgreSQL container**

---

### Task 3: Bulk Seeding Engine

**Files:**
- Create: `db/seed_db.py`
- Modify: `pipeline/pyproject.toml` (add `psycopg[binary]>=3.1.0`)

- [x] **Step 1: Install psycopg in pipeline/.venv**
- [x] **Step 2: Implement streaming Parquet-to-PostgreSQL binary COPY in db/seed_db.py**
- [x] **Step 3: Execute seed_db.py to ingest pipeline/data/test_comparisons.parquet (144k rows)**
- [x] **Step 4: Verify row count and planner statistics (ANALYZE)**

---

### Task 4: Query Benchmark & Performance Audit

**Files:**
- Create: `db/benchmark_queries.py`

- [x] **Step 1: Implement 2D bounding-box slider query (<@ box(...)) benchmark**
- [x] **Step 2: Implement universality token array inspector query benchmark**
- [x] **Step 3: Implement false friend quiz random-sample query benchmark**
- [x] **Step 4: Run EXPLAIN ANALYZE on all queries, verify index scans, and log latency (expect < 5ms)**
