# Linduistics: Performance, Database Indexing & Memory Tuning Guide

This document records the database indexing architecture, memory allocations, caching strategies, and networking diagnostics for the Linduistics platform across both local development and dedicated production environments.

---

## 1. Dataset Profile & Working Set Footprint

The Linduistics database contains precomputed phonetic, semantic, morphological, and etymological relationships across five Germanic languages (`en`, `de`, `sv`, `da`, `nb`). The application functions strictly as a query engine over these static tables.

| Table | Live Rows | Table Size | Index Size | Total On-Disk | Primary Workload |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `word_inflections` | **4,990,817** | 552 MB | 504 MB | **1.05 GB** | Grammatical slot matching in NLP service |
| `word_comparisons` | **403,298** | 505 MB | 118 MB | **733 MB** | Lexicon pairs, inspector cross-lingual links |
| `word_forms` | **1,291,413** | 70 MB | 97 MB | **167 MB** | Surface inflected form $\to$ lemma resolution |
| `lemma_synonyms` | **187,263** | 36 MB | 29 MB | **65 MB** | Wiktionary synonym candidate discovery |
| `cognate_clusters` | **7,772** | 7.1 MB | 5.9 MB | **16 MB** | Proto-root cognate group navigation |
| **Total** | **~6.88M** | **~1.17 GB** | **~754 MB** | **~1.92 GB** | Entire dataset |

> [!NOTE]
> The **total active database size is ~1.92 GB** (data + indexes). On any machine with $\ge 8\text{ GB}$ of RAM, the entire active dataset can reside permanently in memory.

---

## 2. Query Indexing Architecture (Migration 006)

Prior to migration `006_performance_indexes.sql`, several key queries suffered from sequential table scans and planner estimation skew. The following indexes were added to eliminate disk thrashing:

### 2.1 Form Resolution (`idx_word_forms_form`)
- **Index**: `CREATE INDEX idx_word_forms_form ON word_forms (form);`
- **Problem**: `word_forms` had composite indexes `(lang, form, lemma)` and `(lang, form)`. In Pan-Germanic mode (`sourceLang == "pan"`), queries omit `lang` (`WHERE form = ANY($1)`), which prevented index usage and forced a `Parallel Seq Scan` over **1.29 million rows**.
- **Result**: Execution time dropped from **106.6 ms to 0.127 ms (839× speedup)**.

### 2.2 Cross-Lingual Word Lookups (`idx_word_comparisons_word_a`)
- **Index**: `CREATE INDEX idx_word_comparisons_word_a ON word_comparisons (word_a);`
- **Problem**: `word_comparisons` had indexes beginning with `lang_a`. When searching across all languages (`WHERE word_a = ANY($1)`), Postgres fell back to a GIN trigram index scan (`idx_trgm_word_a`).
- **Result**: Execution time dropped from **4.07 ms to 0.252 ms (16× speedup)**.

### 2.3 Reverse Synonym Expansion (`idx_lemma_synonyms_synonyms_gin`)
- **Index**: `CREATE INDEX idx_lemma_synonyms_synonyms_gin ON lemma_synonyms USING gin (synonyms);`
- **Query Pattern**: Must use PostgreSQL array containment: `WHERE lang = %s AND synonyms @> ARRAY[%s]::text[]` (scalar `= ANY(synonyms)` does not trigger GIN index scans in Postgres).
- **Result**: Execution time dropped from **2.73 ms (scanning 15,800 arrays) to 0.079 ms (35× speedup)**.

### 2.4 Lexicon Pair Slider Sorting (`idx_comparisons_slider_sort`)
- **Index**: `CREATE INDEX idx_comparisons_slider_sort ON word_comparisons (lang_a, lang_b, phonetic_sim DESC, semantic_sim DESC);`
- **Problem**: Bounding-box queries on GiST `(sim_point)` retrieve ~20,000 candidate rows for a language pair. Sorting by `phonetic_sim DESC, semantic_sim DESC` required pulling full heap rows (including large text definitions and JSON senses) into memory before sorting.
- **Result**: Sort operations resolve directly within the index, preventing temporary file disk spills.

---

## 3. Dedicated 16 GB Server Memory Tuning

On a dedicated machine with 16 GB RAM where the database is primarily read-only ETL queries, the default PostgreSQL configuration (`shared_buffers = 128MB`, `random_page_cost = 4.0`) is severely suboptimal.

### 3.1 Recommended `postgresql.conf` Configuration

```ini
# ==============================================================================
# PostgreSQL 16 Tuning: Dedicated 16 GB RAM Machine (Linduistics Workload)
# ==============================================================================

# Memory Allocation
# Total active DB is 1.92 GB; 4 GB shared_buffers ensures 100% of tables and
# indexes fit permanently in memory buffer cache with zero disk reads after warm-up.
shared_buffers = 4GB

# Informs query planner of memory available between shared_buffers and OS page cache.
effective_cache_size = 12GB

# Dedicated memory for complex sorts, hash aggregates, and in-memory joins per operation.
# Prevents multi-language grouping queries from writing temporary disk files.
work_mem = 64MB

# Accelerates manual maintenance, bulk COPY, and re-indexing operations.
maintenance_work_mem = 1GB

# Storage & Planner Tuning (Assumes NVMe / SSD)
# Default is 4.0 (for spinning HDDs). 1.1 reflects near-equal random vs sequential SSD access,
# ensuring the planner aggressively favors index scans over sequential scans.
random_page_cost = 1.1

# Allows the operating system to prefetch disk blocks concurrently on SSDs.
effective_io_concurrency = 200

# Improves planner accuracy on multi-dimensional spatial points (sim_point).
default_statistics_target = 200

# Write-Ahead Log (WAL) & Checkpoints (Read-Heavy Tuning)
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB

# Worker Threads
max_worker_processes = 8
max_parallel_workers = 8
max_parallel_workers_per_gather = 2
```

---

## 4. Application-Level In-Memory Caching Strategy

### 4.1 `/api/languages` Language Matrix Cache
- **Current Behavior**: [`GetLanguageStats`](file:///c:/Users/ollem/Git/Github/linduistics/backend/internal/repository/comparisons.go#L350-L367) performs a full sequential scan across 403,298 rows with multiple conditional aggregations (`count(*) FILTER ...`), taking **~200 ms** per call.
- **Production Architecture**:
  - The dataset is static. Pairwise metrics (pair count, average phonetic similarity, average semantic similarity, cognate counts) do not change between dataset builds.
  - In production, cache the response in Go memory on application startup (`sync.Once` or `atomic.Pointer[models.LanguagesResponse]`).
  - When the frontend calls `/api/languages`, serve the cached in-memory struct directly.
  - **Latency Impact**: Reduces response time from **~200 ms to < 0.2 ms**.

### 4.2 Lexicon Pagination Dual-Query Optimization
- **Current Behavior**: [`QueryPairs`](file:///c:/Users/ollem/Git/Github/linduistics/backend/internal/repository/comparisons.go#L29-L100) executes two independent queries per page:
  1. `countQuery`: `SELECT count(*) FROM word_comparisons WHERE ...` (~60 ms)
  2. `dataQuery`: `SELECT ... FROM word_comparisons WHERE ... LIMIT 50 OFFSET $N` (~55 ms)
- **Production Architecture**:
  - For default sliders ($0.0 \to 1.0$), fetch total count alongside data using a window function: `COUNT(*) OVER() AS full_count`.
  - Alternatively, query data first. If the row count returned is `< limit` and `offset == 0`, total count is `len(rows)` without executing the count query.

---

## 5. Development Networking & Browser Loopback Latency

### 5.1 The 2,000 ms "Localhost" Penalty on Windows
During local development in Firefox or Chrome on Windows, requests to `http://localhost:5173` may display a uniform **~2,040 ms latency** across initial document loads, lazy chunks, and API calls.

- **Root Cause**:
  1. In Windows 10/11, `# 127.0.0.1 localhost` and `# ::1 localhost` are commented out by default in `C:\Windows\System32\drivers\etc\hosts`.
  2. When querying `localhost`, Windows issues DNS queries to the local network router or broadcasts via LLMNR/NetBIOS. This times out after **exactly 2,000 ms** before falling back to `127.0.0.1`.
  3. When Vite defaults to binding to IPv6 `::1`, dual-stack browsers experience connection resets or timeouts on IPv4 before switching to IPv6.

### 5.2 Resolution
1. **Frontend Vite Configuration** ([`vite.config.ts`](file:///c:/Users/ollem/Git/Github/linduistics/frontend/vite.config.ts)):
   ```ts
   server: {
     host: '0.0.0.0', // Binds to all loopback interfaces simultaneously
     port: 5173,
     proxy: {
       '/api': {
         target: 'http://127.0.0.1:8080', // Direct IPv4 bypasses DNS
         changeOrigin: true,
       },
     },
   }
   ```
2. **Local Browser Access**:
   Always navigate to **`http://127.0.0.1:5173`** instead of `http://localhost:5173`. Document load times drop from **2,166 ms to 5 ms**.
3. **Optional Permanent System Fix**:
   Add loopback entries to `C:\Windows\System32\drivers\etc\hosts` in an Administrator shell:
   ```powershell
   Add-Content -Path C:\Windows\System32\drivers\etc\hosts -Value "`n127.0.0.1 localhost`n::1 localhost"
   ```
