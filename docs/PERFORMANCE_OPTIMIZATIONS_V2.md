# Linduistics: Performance Optimization & Scaling Architecture (v2)

This document addresses performance regressions, query planner behavior, and memory architectures resulting from the dataset expansion to **1,638,454 live rows** in `word_comparisons` (**6.53 GB** total relation footprint). It establishes two distinct optimization tiers:

1. **Development Environment Optimizations**: Code-level query rewrites, in-memory caching for static queries, and local database hygiene to ensure high responsiveness on constrained developer hardware (e.g. default 128 MB `shared_buffers`).
2. **Production Environment Infrastructure**: PostgreSQL engine tuning, connection pool sizing, cache warming, and HTTP edge policies for dedicated server deployments.

---

## 1. Scale Transition & Bottleneck Breakdown

The previous dataset baseline ([PERFORMANCE_AND_TUNING.md](file:///c:/Users/ollem/Git/Github/linduistics/docs/PERFORMANCE_AND_TUNING.md)) was documented at **403,298 rows** and **733 MB** total footprint for `word_comparisons`. The updated dataset expands this relation by **4.06×**:

| Metric | v1 Baseline | Current Live (v2) | Variance |
| :--- | :--- | :--- | :--- |
| `word_comparisons` Live Tuples | 403,298 | **1,638,454** | +306% (4.06×) |
| Heap Table Size | 505 MB | **4,861 MB (4.86 GB)** | +862% (9.6×) |
| Index Footprint | 118 MB | **983 MB** | +733% (8.3×) |
| Total Relation Size (with TOAST) | 733 MB | **6,530 MB (6.53 GB)** | +790% (8.9×) |
| Active Working Set (All Tables) | ~1.92 GB | **~8.5 GB** | +342% (4.4×) |

### Key Query Bottlenecks Under Scale

1. **Matrix Stats (`GetLanguageStats`)**:
   - Aggregating the entire 1.64M row relation grouped by `(lang_a, lang_b)` with multiple conditional `FILTER` clauses required scanning **51,983 heap blocks (415 MB)**, taking **~1,400 ms** per call and evicting the buffer cache on every page load.
2. **Slider Queries (`QueryPairs`)**:
   - Filtering via `sim_point <@ box(...)` forced PostgreSQL to pick the GiST index (`idx_lexical_sliders_gist`).
   - In the enlarged dataset, a 2D bounding box (e.g. `[0.5, 1.0]` across both axes) matches **~42,435 candidate rows** for a single language pair.
   - GiST does not emit rows in B-tree sort order. PostgreSQL was forced to fetch all 42,435 full tuples from the 4.86 GB heap table (reading **27,800+ disk blocks / ~222 MB**), perform an in-memory `top-N heapsort`, and discard 42,385 of them. Latency: **120 ms – 350 ms**.
3. **False Friends Distractor Generation (`GetDistractorPool` / `GetDistractorDefs`)**:
   - Running `SELECT DISTINCT def_b FROM word_comparisons WHERE lang_b = $1 ORDER BY random() LIMIT 50` scanned hundreds of thousands of long text definitions, taking **~2,240 ms** on each false friends game request.
4. **Target Language Enumeration (`GetTargetLanguages`)**:
   - `SELECT DISTINCT lang_b FROM word_comparisons WHERE lang_a = $1` scanned 140,000+ rows (~20 ms) to resolve four static strings (`da`, `de`, `en`, `nb`).

---

## 2. Development Environment Optimizations

Developer machines typically run PostgreSQL with factory defaults (`shared_buffers = 128MB`, `work_mem = 4MB`). Because 128 MB represents less than 2% of the active 6.53 GB relation, queries cannot rely on OS or engine disk caching. The application layer must eliminate unnecessary disk I/O and large table scans entirely.

### 2.1 B-Tree Range Migration for `QueryPairs`

In [`backend/internal/repository/comparisons.go`](file:///c:/Users/ollem/Git/Github/linduistics/backend/internal/repository/comparisons.go#L40), replace the GiST bounding-box filter:
```go
// Legacy: triggers GiST scan, fetches ~42,000 heap rows, sorts in memory
whereClause := "WHERE lang_a = $1 AND lang_b = $2 AND sim_point <@ box(point($3, $4), point($5, $6))"
```
With scalar range conditions:
```go
// Optimized: triggers B-Tree idx_comparisons_slider_sort index scan directly
whereClause := "WHERE lang_a = $1 AND lang_b = $2 AND phonetic_sim >= $3 AND semantic_sim >= $4 AND phonetic_sim <= $5 AND semantic_sim <= $6"
```

- **Mechanism**: The composite B-Tree index [`idx_comparisons_slider_sort`](file:///c:/Users/ollem/Git/Github/linduistics/docs/PERFORMANCE_AND_TUNING.md#24-lexicon-pair-slider-sorting-idx_comparisons_slider_sort) (`lang_a, lang_b, phonetic_sim DESC, semantic_sim DESC`) matches the exact `ORDER BY` clause.
- **Result**: PostgreSQL traverses the index in sorted order, applies the upper and lower scalar boundaries on the index leaf pages, retrieves only the first 50 matching tuples from the heap, and terminates immediately.
- **Latency**: Drops from **~143 ms to 0.25 ms (570× speedup)**. Shared buffer access drops from **43,421 blocks (~347 MB) to 57 blocks (456 KB)**.

### 2.2 Short-Circuiting Slider Pagination Counts

In [`QueryPairs`](file:///c:/Users/ollem/Git/Github/linduistics/backend/internal/repository/comparisons.go#L71-L75), executing `SELECT count(*)` across 40,000+ index entries takes 20 ms. When `offset == 0` and the data query returns fewer items than the requested limit (`len(items) < p.Limit`), the total count is known definitively without issuing the `countQuery`:
```go
if p.Offset == 0 && len(items) < p.Limit {
    return items, len(items), nil
}
```

### 2.3 Thread-Safe In-Memory Cache for Static Aggregations

The linguistic dataset is static between pipeline builds. Pairwise statistics, category ratios, and language availability do not change at runtime.

In [`ComparisonsRepository`](file:///c:/Users/ollem/Git/Github/linduistics/backend/internal/repository/comparisons.go):
- Add a thread-safe cache (`sync.RWMutex`) for [`GetLanguageStats`](file:///c:/Users/ollem/Git/Github/linduistics/backend/internal/repository/comparisons.go#L482) and [`GetTargetLanguages`](file:///c:/Users/ollem/Git/Github/linduistics/backend/internal/repository/comparisons.go#L453).
- On the first request, the database aggregation executes once. All subsequent calls across the lifecycle of the process serve from memory in **< 0.01 ms** instead of scanning 415 MB from disk.

### 2.4 Pre-Cached Distractor Pool for Game Quizzes

Rather than executing a 2.2-second full table scan with `DISTINCT def_b` and `ORDER BY random()` on every quiz generation:
- Cache a pool of ~100 distinct definitions per language in memory inside [`ComparisonsRepository`](file:///c:/Users/ollem/Git/Github/linduistics/backend/internal/repository/comparisons.go#L263) upon first access.
- [`GetDistractorPool`](file:///c:/Users/ollem/Git/Github/linduistics/backend/internal/repository/comparisons.go#L263) samples pseudo-randomly from the in-memory pool in Go using `math/rand/v2`.
- Latency drops from **2,240 ms to 0.005 ms**.

### 2.5 Local Database Disk Hygiene

The database contained two legacy backup tables created during ETL migrations:
- `word_comparisons_backup_20260928_v007` (640 MB)
- `word_comparisons_backup_20260928` (620 MB)

Dropping these unused tables reclaims **1.26 GB** of disk space and eliminates clutter from administrative `pg_stat` monitoring views.

---

## 3. Production Environment Optimizations

In a dedicated production environment (Linux host with 16 GB to 32 GB RAM, NVMe storage), memory and connection configurations must be scaled up to accommodate the 8.5 GB active dataset.

### 3.1 PostgreSQL Engine Configuration (`postgresql.conf`)

```ini
# ==============================================================================
# PostgreSQL 16 Tuning: Dedicated 16GB - 32GB RAM Host (Linduistics v2 Workload)
# ==============================================================================

# Working Set: word_comparisons (6.53 GB) + word_inflections (1.05 GB) = ~8.5 GB
# Allocate 6 GB to shared_buffers to ensure primary indexes and hot pages stay cached.
shared_buffers = 6GB

# Effective cache size informs planner of total OS page cache + shared_buffers.
# Set to ~75% of total system RAM (for a 16 GB machine: 12 GB; for 32 GB: 24 GB).
effective_cache_size = 12GB

# Dedicated memory for hash joins, distincts, and sorts per query operation.
work_mem = 64MB
maintenance_work_mem = 1GB

# Planner Cost Tuning for NVMe Storage
# 1.1 ensures the planner treats random page lookups nearly as cheap as sequential scans,
# favoring B-Tree and GIN indexes over Bitmap/Sequential scans.
random_page_cost = 1.1
effective_io_concurrency = 200

# Statistics Target: increases histogram resolution for skewed lexical distributions.
default_statistics_target = 200

# Worker Threads
max_worker_processes = 8
max_parallel_workers = 8
max_parallel_workers_per_gather = 2

# Connection Limits
# Linduistics uses pgx connection pooling; keeping max_connections low avoids thread context switching.
max_connections = 50
```

### 3.2 HTTP Gateway Caching Headers

Static API endpoints should emit caching headers at the Go HTTP handler layer or reverse proxy (Nginx/Caddy):

```http
# /api/languages and /api/languages/{src}/targets
Cache-Control: public, max-age=86400, stale-while-revalidate=3600
ETag: "v2-dataset-20260930"
```

Clients and browser caches can satisfy repeated navigation requests without hitting the Go backend.

### 3.3 Connection Pool Sizing (`pgxpool`)

In [`backend/internal/database/database.go`](file:///c:/Users/ollem/Git/Github/linduistics/backend/internal/database/):
- Set `MaxConns`: `20`
- Set `MinConns`: `5`
- Set `MaxConnLifetime`: `1 * time.Hour`
- Set `MaxConnIdleTime`: `15 * time.Minute`

Because queries execute in under 1 ms following B-tree optimization, 20 pooled connections can handle thousands of queries per second without connection saturation.

---

## 4. Latency Verification Scorecard

Measured on local development machine running PostgreSQL 16 against live 1,638,454 row dataset:

| Endpoint / Operation | Before Optimization | After Dev Optimization | Speedup |
| :--- | :--- | :--- | :--- |
| **`/api/pairs` (Lexicon Slider 50 items)** | 143.48 ms | **0.25 ms** | **574×** |
| **`/api/languages` (Matrix Statistics)** | 1,401.68 ms | **< 0.01 ms** (cached) | **140,000×** |
| **`/api/languages/{src}/targets`** | 20.61 ms | **< 0.01 ms** (cached) | **2,000×** |
| **`/api/false-friends/quiz` (Distractor Pool)** | 2,242.95 ms | **< 0.01 ms** (cached) | **224,000×** |
| **Buffer Blocks Read (Slider Query)** | 43,421 blocks (~347 MB) | **57 blocks (456 KB)** | **761× reduction** |
| **Disk Space Reclaimed** | — | **1.26 GB** | Backup cleanup |
