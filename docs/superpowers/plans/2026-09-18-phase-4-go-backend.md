# Phase 4: Go Backend Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-performance Go HTTP REST service providing sub-millisecond endpoints for 2D spatial slider queries, dynamic text universality inspection, false friends quizzes, and fuzzy headword search.

**Architecture:** Pure Go standard library `net/http.ServeMux` (method-pattern routing introduced in Go 1.22+), standard middleware chaining, `pgx/v5` connection pooling against PostgreSQL spatial GiST indexes, and decoupled domain services.

**Tech Stack:** Go 1.27, `net/http`, `log/slog`, `github.com/jackc/pgx/v5`, PostgreSQL 16.

---

### Task 1: Go Module Initialization & Connection Pool

**Files:**
- Create: `backend/go.mod`
- Create: `backend/internal/config/config.go`
- Create: `backend/internal/database/db.go`
- Test: `backend/internal/config/config_test.go`
- Test: `backend/internal/database/db_test.go`

- [ ] **Step 1: Initialize Go module and install pgx dependency**

Run from project root:
```bash
mkdir -p backend/cmd/server backend/internal/config backend/internal/database backend/internal/models backend/internal/repository backend/internal/services backend/internal/handlers backend/internal/middleware
cd backend
go mod init github.com/sojupie/linduistics/backend
go get github.com/jackc/pgx/v5@v5.7.2
```

- [ ] **Step 2: Implement configuration loader with fallback defaults**

Write `backend/internal/config/config.go`:
```go
package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	Port        string
	DatabaseURL string
	CorsOrigin  string
}

func loadDotEnv(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") || !strings.Contains(line, "=") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		key := strings.TrimSpace(parts[0])
		val := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, val)
		}
	}
}

func Load() *Config {
	loadDotEnv(".env")
	loadDotEnv(filepath.Join("..", ".env"))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/linduistics?sslmode=disable"
	}

	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "*"
	}

	return &Config{
		Port:        port,
		DatabaseURL: dbURL,
		CorsOrigin:  corsOrigin,
	}
}
```

- [ ] **Step 3: Implement database pool wrapper with healthcheck**

Write `backend/internal/database/db.go`:
```go
package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
}

func New(ctx context.Context, dbURL string) (*DB, error) {
	cfg, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return nil, fmt.Errorf("parse db url error: %w", err)
	}

	cfg.MaxConns = 25
	cfg.MinConns = 5
	cfg.MaxConnLifetime = 1 * time.Hour
	cfg.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create pool error: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping db error: %w", err)
	}

	return &DB{Pool: pool}, nil
}

func (d *DB) Close() {
	if d.Pool != nil {
		d.Pool.Close()
	}
}
```

- [ ] **Step 4: Write and run config and db pool tests**

Write `backend/internal/config/config_test.go` and `backend/internal/database/db_test.go`:
```go
// backend/internal/config/config_test.go
package config

import (
	"os"
	"testing"
)

func TestLoadDefaults(t *testing.T) {
	_ = os.Unsetenv("PORT")
	cfg := Load()
	if cfg.Port != "8080" {
		t.Fatalf("expected default port 8080, got %s", cfg.Port)
	}
	if cfg.DatabaseURL == "" {
		t.Fatal("expected non-empty default database url")
	}
}
```

```go
// backend/internal/database/db_test.go
package database

import (
	"context"
	"os"
	"testing"
)

func TestDBConnection(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/linduistics?sslmode=disable"
	}

	db, err := New(context.Background(), dbURL)
	if err != nil {
		t.Skipf("skipping live db test: %v", err)
		return
	}
	defer db.Close()

	if err := db.Pool.Ping(context.Background()); err != nil {
		t.Fatalf("ping failed: %v", err)
	}
}
```

Run: `cd backend && go test -v ./internal/config ./internal/database`
Expected: PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add backend/go.mod backend/go.sum backend/internal/config backend/internal/database
git commit -m "feat(backend): initialize go module and pgx connection pool"
```

---

### Task 2: Domain Models & Spatial Repository Layer

**Files:**
- Create: `backend/internal/models/comparison.go`
- Create: `backend/internal/repository/comparisons.go`
- Test: `backend/internal/repository/comparisons_test.go`

- [ ] **Step 1: Define domain models**

Write `backend/internal/models/comparison.go`:
```go
package models

type WordComparison struct {
	ID              int64   `json:"id"`
	LangA           string  `json:"lang_a"`
	WordA           string  `json:"word_a"`
	IpaA            *string `json:"ipa_a,omitempty"`
	DefA            string  `json:"def_a"`
	PosA            *string `json:"pos_a,omitempty"`
	LangB           string  `json:"lang_b"`
	WordB           string  `json:"word_b"`
	IpaB            *string `json:"ipa_b,omitempty"`
	DefB            string  `json:"def_b"`
	PosB            *string `json:"pos_b,omitempty"`
	OrthographicSim float32 `json:"orthographic_sim"`
	PhoneticSim     float32 `json:"phonetic_sim"`
	SemanticSim     float32 `json:"semantic_sim"`
	Category        string  `json:"category"`
}

type PairsQueryParams struct {
	SourceLang string
	TargetLang string
	MinPhon    float32
	MaxPhon    float32
	MinSem     float32
	MaxSem     float32
	Category   string
	Limit      int
	Offset     int
}

type PairsResult struct {
	Items  []WordComparison `json:"items"`
	Total  int              `json:"total"`
	Limit  int              `json:"limit"`
	Offset int              `json:"offset"`
}
```

- [ ] **Step 2: Implement repository methods**

Write `backend/internal/repository/comparisons.go`:
```go
package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/sojupie/linduistics/backend/internal/models"
)

type ComparisonsRepository struct {
	pool *pgxpool.Pool
}

func NewComparisonsRepository(pool *pgxpool.Pool) *ComparisonsRepository {
	return &ComparisonsRepository{pool: pool}
}

func (r *ComparisonsRepository) QueryPairs(ctx context.Context, p models.PairsQueryParams) ([]models.WordComparison, int, error) {
	if p.Limit <= 0 || p.Limit > 200 {
		p.Limit = 50
	}
	if p.Offset < 0 {
		p.Offset = 0
	}

	whereClause := "WHERE lang_a = $1 AND lang_b = $2 AND sim_point <@ box(point($3, $4), point($5, $6))"
	args := []any{p.SourceLang, p.TargetLang, p.MinPhon, p.MinSem, p.MaxPhon, p.MaxSem}

	if p.Category != "" {
		args = append(args, p.Category)
		whereClause += fmt.Sprintf(" AND category = $%d", len(args))
	}

	countQuery := "SELECT count(*) FROM word_comparisons " + whereClause
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count pairs error: %w", err)
	}

	dataQuery := fmt.Sprintf(`
		SELECT id, lang_a, word_a, ipa_a, def_a, pos_a,
		       lang_b, word_b, ipa_b, def_b, pos_b,
		       orthographic_sim, phonetic_sim, semantic_sim, category
		FROM word_comparisons
		%s
		ORDER BY phonetic_sim DESC, semantic_sim DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, len(args)+1, len(args)+2)

	queryArgs := append(args, p.Limit, p.Offset)
	rows, err := r.pool.Query(ctx, dataQuery, queryArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("query pairs error: %w", err)
	}
	defer rows.Close()

	var items []models.WordComparison
	for rows.Next() {
		var c models.WordComparison
		err := rows.Scan(
			&c.ID, &c.LangA, &c.WordA, &c.IpaA, &c.DefA, &c.PosA,
			&c.LangB, &c.WordB, &c.IpaB, &c.DefB, &c.PosB,
			&c.OrthographicSim, &c.PhoneticSim, &c.SemanticSim, &c.Category,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan pair error: %w", err)
		}
		items = append(items, c)
	}
	if items == nil {
		items = []models.WordComparison{}
	}

	return items, total, nil
}

func (r *ComparisonsRepository) GetByTokens(ctx context.Context, sourceLang string, tokens []string, targetLangs []string, minSem float32) ([]models.WordComparison, error) {
	query := `
		SELECT id, lang_a, word_a, ipa_a, def_a, pos_a,
		       lang_b, word_b, ipa_b, def_b, pos_b,
		       orthographic_sim, phonetic_sim, semantic_sim, category
		FROM word_comparisons
		WHERE lang_a = $1
		  AND word_a = ANY($2)
		  AND lang_b = ANY($3)
		  AND semantic_sim >= $4
		ORDER BY word_a, semantic_sim DESC
	`
	rows, err := r.pool.Query(ctx, query, sourceLang, tokens, targetLangs, minSem)
	if err != nil {
		return nil, fmt.Errorf("get by tokens error: %w", err)
	}
	defer rows.Close()

	var items []models.WordComparison
	for rows.Next() {
		var c models.WordComparison
		if err := rows.Scan(
			&c.ID, &c.LangA, &c.WordA, &c.IpaA, &c.DefA, &c.PosA,
			&c.LangB, &c.WordB, &c.IpaB, &c.DefB, &c.PosB,
			&c.OrthographicSim, &c.PhoneticSim, &c.SemanticSim, &c.Category,
		); err != nil {
			return nil, fmt.Errorf("scan token match error: %w", err)
		}
		items = append(items, c)
	}
	return items, nil
}

func (r *ComparisonsRepository) GetFalseFriends(ctx context.Context, sourceLang, targetLang string, limit int) ([]models.WordComparison, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	query := `
		SELECT id, lang_a, word_a, ipa_a, def_a, pos_a,
		       lang_b, word_b, ipa_b, def_b, pos_b,
		       orthographic_sim, phonetic_sim, semantic_sim, category
		FROM word_comparisons
		WHERE lang_a = $1 AND lang_b = $2 AND category = 'false_friend'
		ORDER BY random()
		LIMIT $3
	`
	rows, err := r.pool.Query(ctx, query, sourceLang, targetLang, limit)
	if err != nil {
		return nil, fmt.Errorf("get false friends error: %w", err)
	}
	defer rows.Close()

	var items []models.WordComparison
	for rows.Next() {
		var c models.WordComparison
		if err := rows.Scan(
			&c.ID, &c.LangA, &c.WordA, &c.IpaA, &c.DefA, &c.PosA,
			&c.LangB, &c.WordB, &c.IpaB, &c.DefB, &c.PosB,
			&c.OrthographicSim, &c.PhoneticSim, &c.SemanticSim, &c.Category,
		); err != nil {
			return nil, fmt.Errorf("scan false friend error: %w", err)
		}
		items = append(items, c)
	}
	return items, nil
}

func (r *ComparisonsRepository) GetDistractorDefs(ctx context.Context, targetLang string, excludeDef string, limit int) ([]string, error) {
	query := `
		SELECT DISTINCT def_b
		FROM word_comparisons
		WHERE lang_b = $1 AND def_b != $2 AND length(def_b) > 5
		ORDER BY random()
		LIMIT $3
	`
	rows, err := r.pool.Query(ctx, query, targetLang, excludeDef, limit)
	if err != nil {
		return nil, fmt.Errorf("get distractors error: %w", err)
	}
	defer rows.Close()

	var defs []string
	for rows.Next() {
		var d string
		if err := rows.Scan(&d); err != nil {
			return nil, err
		}
		defs = append(defs, d)
	}
	return defs, nil
}

func (r *ComparisonsRepository) SearchHeadwords(ctx context.Context, lang, prefix string, limit int) ([]models.WordComparison, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	query := `
		SELECT id, lang_a, word_a, ipa_a, def_a, pos_a,
		       lang_b, word_b, ipa_b, def_b, pos_b,
		       orthographic_sim, phonetic_sim, semantic_sim, category
		FROM word_comparisons
		WHERE lang_a = $1 AND word_a ILIKE $2 || '%'
		ORDER BY phonetic_sim DESC, semantic_sim DESC
		LIMIT $3
	`
	rows, err := r.pool.Query(ctx, query, lang, prefix, limit)
	if err != nil {
		return nil, fmt.Errorf("search headwords error: %w", err)
	}
	defer rows.Close()

	var items []models.WordComparison
	for rows.Next() {
		var c models.WordComparison
		if err := rows.Scan(
			&c.ID, &c.LangA, &c.WordA, &c.IpaA, &c.DefA, &c.PosA,
			&c.LangB, &c.WordB, &c.IpaB, &c.DefB, &c.PosB,
			&c.OrthographicSim, &c.PhoneticSim, &c.SemanticSim, &c.Category,
		); err != nil {
			return nil, fmt.Errorf("scan search result error: %w", err)
		}
		items = append(items, c)
	}
	return items, nil
}
```

- [ ] **Step 3: Write and run repository integration test**

Write `backend/internal/repository/comparisons_test.go`:
```go
package repository

import (
	"context"
	"os"
	"testing"

	"github.com/sojupie/linduistics/backend/internal/database"
	"github.com/sojupie/linduistics/backend/internal/models"
)

func TestRepositoryQueries(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/linduistics?sslmode=disable"
	}

	db, err := database.New(context.Background(), dbURL)
	if err != nil {
		t.Skipf("skipping db integration test: %v", err)
		return
	}
	defer db.Close()

	repo := NewComparisonsRepository(db.Pool)

	// Test 1: QueryPairs spatial search
	items, total, err := repo.QueryPairs(context.Background(), models.PairsQueryParams{
		SourceLang: "sv",
		TargetLang: "en",
		MinPhon:    0.5,
		MaxPhon:    1.0,
		MinSem:     0.6,
		MaxSem:     1.0,
		Limit:      10,
	})
	if err != nil {
		t.Fatalf("QueryPairs failed: %v", err)
	}
	if total == 0 {
		t.Fatal("expected non-zero total for cognate spatial search")
	}
	if len(items) == 0 {
		t.Fatal("expected items returned from QueryPairs")
	}

	// Test 2: False friends
	ff, err := repo.GetFalseFriends(context.Background(), "sv", "en", 5)
	if err != nil {
		t.Fatalf("GetFalseFriends failed: %v", err)
	}
	if len(ff) == 0 {
		t.Fatal("expected false friends returned")
	}

	// Test 3: Token lookup
	tokens := []string{"katt", "hund", "hus"}
	tokMatches, err := repo.GetByTokens(context.Background(), "sv", tokens, []string{"en"}, 0.70)
	if err != nil {
		t.Fatalf("GetByTokens failed: %v", err)
	}
	if len(tokMatches) == 0 {
		t.Fatal("expected token matches for basic words")
	}
}
```

Run: `cd backend && go test -v ./internal/repository`
Expected: PASS

- [ ] **Step 4: Commit Task 2**

```bash
git add backend/internal/models backend/internal/repository
git commit -m "feat(backend): implement comparison domain models and spatial repository"
```

---

### Task 3: Text Universality Inspector Service

**Files:**
- Create: `backend/internal/services/inspector.go`
- Test: `backend/internal/services/inspector_test.go`

- [ ] **Step 1: Implement Tokenizer and Universality Scoring Logic**

Write `backend/internal/services/inspector.go`:
```go
package services

import (
	"context"
	"regexp"
	"strings"

	"github.com/sojupie/linduistics/backend/internal/models"
	"github.com/sojupie/linduistics/backend/internal/repository"
)

type InspectRequest struct {
	Text        string   `json:"text"`
	SourceLang  string   `json:"source_lang"`
	TargetLangs []string `json:"target_langs"`
}

type TargetMatch struct {
	Word        string  `json:"word"`
	Ipa         *string `json:"ipa,omitempty"`
	Def         string  `json:"def"`
	Category    string  `json:"category"`
	SemanticSim float32 `json:"semantic_sim"`
	PhoneticSim float32 `json:"phonetic_sim"`
}

type TokenAnalysis struct {
	Token           string                 `json:"token"`
	Status          string                 `json:"status"` // "universal", "branch_specific", "isolate"
	CoverageRatio   float32                `json:"coverage_ratio"`
	LanguageMatches map[string]TargetMatch `json:"matches"`
}

type InspectResponse struct {
	SourceLang        string          `json:"source_lang"`
	TargetLangs       []string        `json:"target_langs"`
	TotalTokens       int             `json:"total_tokens"`
	UniqueTokens      int             `json:"unique_tokens"`
	UniversalityScore float32         `json:"universality_score"` // 0.0 to 100.0%
	Tokens            []TokenAnalysis `json:"tokens"`
}

type InspectorService struct {
	repo *repository.ComparisonsRepository
}

func NewInspectorService(repo *repository.ComparisonsRepository) *InspectorService {
	return &InspectorService{repo: repo}
}

var nonLetterRegex = regexp.MustCompile(`[^\p{L}\p{M}]+`)

func Tokenize(text string) ([]string, []string) {
	rawTokens := nonLetterRegex.Split(text, -1)
	var orderedTokens []string
	seen := make(map[string]bool)
	var uniqueTokens []string

	for _, t := range rawTokens {
		token := strings.ToLower(strings.TrimSpace(t))
		if token == "" || len([]rune(token)) < 2 {
			continue
		}
		orderedTokens = append(orderedTokens, token)
		if !seen[token] {
			seen[token] = true
			uniqueTokens = append(uniqueTokens, token)
		}
	}
	return orderedTokens, uniqueTokens
}

func (s *InspectorService) InspectText(ctx context.Context, req InspectRequest) (*InspectResponse, error) {
	if req.SourceLang == "" {
		req.SourceLang = "sv"
	}
	if len(req.TargetLangs) == 0 {
		req.TargetLangs = []string{"en"}
	}

	orderedTokens, uniqueTokens := Tokenize(req.Text)
	if len(uniqueTokens) == 0 {
		return &InspectResponse{
			SourceLang:        req.SourceLang,
			TargetLangs:       req.TargetLangs,
			TotalTokens:       0,
			UniqueTokens:      0,
			UniversalityScore: 0,
			Tokens:            []TokenAnalysis{},
		}, nil
	}

	matches, err := s.repo.GetByTokens(ctx, req.SourceLang, uniqueTokens, req.TargetLangs, 0.70)
	if err != nil {
		return nil, err
	}

	tokenMap := make(map[string]map[string]TargetMatch)
	for _, m := range matches {
		if _, ok := tokenMap[m.WordA]; !ok {
			tokenMap[m.WordA] = make(map[string]TargetMatch)
		}
		curr, exists := tokenMap[m.WordA][m.LangB]
		if !exists || m.SemanticSim > curr.SemanticSim {
			tokenMap[m.WordA][m.LangB] = TargetMatch{
				Word:        m.WordB,
				Ipa:         m.IpaB,
				Def:         m.DefB,
				Category:    m.Category,
				SemanticSim: m.SemanticSim,
				PhoneticSim: m.PhoneticSim,
			}
		}
	}

	var tokenAnalyses []TokenAnalysis
	var totalMatchesAcrossTokens int
	numTargets := len(req.TargetLangs)

	for _, tok := range uniqueTokens {
		langMatches := tokenMap[tok]
		if langMatches == nil {
			langMatches = make(map[string]TargetMatch)
		}

		matchedCount := len(langMatches)
		totalMatchesAcrossTokens += matchedCount
		ratio := float32(matchedCount) / float32(numTargets)

		status := "isolate"
		if ratio >= 0.75 {
			status = "universal"
		} else if matchedCount > 0 {
			status = "branch_specific"
		}

		tokenAnalyses = append(tokenAnalyses, TokenAnalysis{
			Token:           tok,
			Status:          status,
			CoverageRatio:   ratio,
			LanguageMatches: langMatches,
		})
	}

	possibleMaxMatches := len(uniqueTokens) * numTargets
	var overallScore float32
	if possibleMaxMatches > 0 {
		overallScore = (float32(totalMatchesAcrossTokens) / float32(possibleMaxMatches)) * 100.0
	}

	return &InspectResponse{
		SourceLang:        req.SourceLang,
		TargetLangs:       req.TargetLangs,
		TotalTokens:       len(orderedTokens),
		UniqueTokens:      len(uniqueTokens),
		UniversalityScore: overallScore,
		Tokens:            tokenAnalyses,
	}, nil
}
```

- [ ] **Step 2: Write unit tests for Tokenizer and scoring**

Write `backend/internal/services/inspector_test.go`:
```go
package services

import (
	"testing"
)

func TestTokenize(t *testing.T) {
	text := "Katten, hunden och fågeln sjunger! Åtminstone på kvällen."
	ordered, unique := Tokenize(text)

	expectedUnique := []string{"katten", "hunden", "och", "fågeln", "sjunger", "åtminstone", "kvällen"}
	if len(unique) != len(expectedUnique) {
		t.Fatalf("expected %d unique tokens, got %d: %v", len(expectedUnique), len(unique), unique)
	}

	for i, exp := range expectedUnique {
		if unique[i] != exp {
			t.Errorf("at index %d: expected %s, got %s", i, exp, unique[i])
		}
	}
}

func TestTokenizePunctuationAndNumbers(t *testing.T) {
	text := "123 hej... det här är 456 ett test!"
	_, unique := Tokenize(text)

	expected := []string{"hej", "det", "här", "ett", "test"}
	if len(unique) != len(expected) {
		t.Fatalf("expected %d tokens, got %d: %v", len(expected), len(unique), unique)
	}
}
```

Run: `cd backend && go test -v ./internal/services`
Expected: PASS

- [ ] **Step 3: Commit Task 3**

```bash
git add backend/internal/services
git commit -m "feat(backend): implement universality text inspector and tokenizer service"
```

---

### Task 4: Standard Library HTTP Handlers, Middleware & Router

**Files:**
- Create: `backend/internal/middleware/middleware.go`
- Create: `backend/internal/handlers/helpers.go`
- Create: `backend/internal/handlers/pairs.go`
- Create: `backend/internal/handlers/inspect.go`
- Create: `backend/internal/handlers/false_friends.go`
- Create: `backend/internal/handlers/search.go`
- Create: `backend/internal/handlers/health.go`
- Create: `backend/internal/api/router.go`
- Test: `backend/internal/handlers/handlers_test.go`

- [ ] **Step 1: Write pure standard library middleware stack**

Write `backend/internal/middleware/middleware.go`:
```go
package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"
)

type Middleware func(http.Handler) http.Handler

func Chain(h http.Handler, middlewares ...Middleware) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(rw, r)
		slog.Info("http request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rw.statusCode,
			"duration_ms", time.Since(start).Milliseconds(),
			"remote", r.RemoteAddr,
		)
	})
}

func Recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("panic recovered", "error", rec, "stack", string(debug.Stack()))
				http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func Cors(allowedOrigin string) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Max-Age", "300")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
```

- [ ] **Step 2: Write JSON helpers and HTTP handlers**

Write `backend/internal/handlers/helpers.go`:
```go
package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
)

func WriteJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func WriteError(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, map[string]string{"error": message})
}

func ParseFloat(s string, defaultVal float32) float32 {
	if s == "" {
		return defaultVal
	}
	val, err := strconv.ParseFloat(s, 32)
	if err != nil {
		return defaultVal
	}
	return float32(val)
}

func ParseInt(s string, defaultVal int) int {
	if s == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(s)
	if err != nil {
		return defaultVal
	}
	return val
}
```

Write `backend/internal/handlers/pairs.go`:
```go
package handlers

import (
	"net/http"

	"github.com/sojupie/linduistics/backend/internal/models"
	"github.com/sojupie/linduistics/backend/internal/repository"
)

type PairsHandler struct {
	repo *repository.ComparisonsRepository
}

func NewPairsHandler(repo *repository.ComparisonsRepository) *PairsHandler {
	return &PairsHandler{repo: repo}
}

func (h *PairsHandler) HandleGetPairs(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	source := q.Get("source")
	if source == "" {
		source = "sv"
	}
	target := q.Get("target")
	if target == "" {
		target = "en"
	}

	params := models.PairsQueryParams{
		SourceLang: source,
		TargetLang: target,
		MinPhon:    ParseFloat(q.Get("min_phon"), 0.0),
		MaxPhon:    ParseFloat(q.Get("max_phon"), 1.0),
		MinSem:     ParseFloat(q.Get("min_sem"), 0.0),
		MaxSem:     ParseFloat(q.Get("max_sem"), 1.0),
		Category:   q.Get("category"),
		Limit:      ParseInt(q.Get("limit"), 50),
		Offset:     ParseInt(q.Get("offset"), 0),
	}

	items, total, err := h.repo.QueryPairs(r.Context(), params)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, models.PairsResult{
		Items:  items,
		Total:  total,
		Limit:  params.Limit,
		Offset: params.Offset,
	})
}
```

Write `backend/internal/handlers/inspect.go`:
```go
package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/sojupie/linduistics/backend/internal/services"
)

type InspectHandler struct {
	inspector *services.InspectorService
}

func NewInspectHandler(inspector *services.InspectorService) *InspectHandler {
	return &InspectHandler{inspector: inspector}
}

func (h *InspectHandler) HandleInspect(w http.ResponseWriter, r *http.Request) {
	var req services.InspectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Text == "" {
		WriteError(w, http.StatusBadRequest, "text field cannot be empty")
		return
	}

	resp, err := h.inspector.InspectText(r.Context(), req)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}
```

Write `backend/internal/handlers/false_friends.go`:
```go
package handlers

import (
	"math/rand"
	"net/http"

	"github.com/sojupie/linduistics/backend/internal/models"
	"github.com/sojupie/linduistics/backend/internal/repository"
)

type FalseFriendsHandler struct {
	repo *repository.ComparisonsRepository
}

func NewFalseFriendsHandler(repo *repository.ComparisonsRepository) *FalseFriendsHandler {
	return &FalseFriendsHandler{repo: repo}
}

type QuizItem struct {
	models.WordComparison
	Options       []string `json:"options"`
	CorrectOption int      `json:"correct_option"`
}

func (h *FalseFriendsHandler) HandleGetFalseFriends(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	source := q.Get("source")
	if source == "" {
		source = "sv"
	}
	target := q.Get("target")
	if target == "" {
		target = "en"
	}
	limit := ParseInt(q.Get("limit"), 20)
	mode := q.Get("mode")

	pairs, err := h.repo.GetFalseFriends(r.Context(), source, target, limit)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if mode == "quiz" {
		var quizItems []QuizItem
		for _, pair := range pairs {
			distractors, _ := h.repo.GetDistractorDefs(r.Context(), target, pair.DefB, 3)
			options := append([]string{pair.DefB}, distractors...)
			rand.Shuffle(len(options), func(i, j int) {
				options[i], options[j] = options[j], options[i]
			})

			correctIdx := 0
			for idx, opt := range options {
				if opt == pair.DefB {
					correctIdx = idx
					break
				}
			}

			quizItems = append(quizItems, QuizItem{
				WordComparison: pair,
				Options:        options,
				CorrectOption:  correctIdx,
			})
		}
		WriteJSON(w, http.StatusOK, quizItems)
		return
	}

	WriteJSON(w, http.StatusOK, pairs)
}
```

Write `backend/internal/handlers/search.go`:
```go
package handlers

import (
	"net/http"

	"github.com/sojupie/linduistics/backend/internal/repository"
)

type SearchHandler struct {
	repo *repository.ComparisonsRepository
}

func NewSearchHandler(repo *repository.ComparisonsRepository) *SearchHandler {
	return &SearchHandler{repo: repo}
}

func (h *SearchHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	query := q.Get("q")
	if len(query) < 2 {
		WriteError(w, http.StatusBadRequest, "query 'q' must be at least 2 characters")
		return
	}
	lang := q.Get("lang")
	if lang == "" {
		lang = "sv"
	}
	limit := ParseInt(q.Get("limit"), 20)

	results, err := h.repo.SearchHeadwords(r.Context(), lang, query, limit)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, results)
}
```

Write `backend/internal/handlers/health.go`:
```go
package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

type HealthHandler struct {
	pool *pgxpool.Pool
}

func NewHealthHandler(pool *pgxpool.Pool) *HealthHandler {
	return &HealthHandler{pool: pool}
}

func (h *HealthHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	dbStatus := "connected"
	if err := h.pool.Ping(r.Context()); err != nil {
		dbStatus = "disconnected"
	}

	WriteJSON(w, http.StatusOK, map[string]string{
		"status":   "ok",
		"database": dbStatus,
	})
}
```

- [ ] **Step 3: Assemble standard library ServeMux with method matching**

Write `backend/internal/api/router.go`:
```go
package api

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/sojupie/linduistics/backend/internal/handlers"
	"github.com/sojupie/linduistics/backend/internal/middleware"
	"github.com/sojupie/linduistics/backend/internal/repository"
	"github.com/sojupie/linduistics/backend/internal/services"
)

func NewRouter(pool *pgxpool.Pool, corsOrigin string) http.Handler {
	mux := http.NewServeMux()

	repo := repository.NewComparisonsRepository(pool)
	inspector := services.NewInspectorService(repo)

	healthHandler := handlers.NewHealthHandler(pool)
	pairsHandler := handlers.NewPairsHandler(repo)
	inspectHandler := handlers.NewInspectHandler(inspector)
	ffHandler := handlers.NewFalseFriendsHandler(repo)
	searchHandler := handlers.NewSearchHandler(repo)

	// Go standard library method-pattern routes
	mux.HandleFunc("GET /api/health", healthHandler.HandleHealth)
	mux.HandleFunc("GET /api/pairs", pairsHandler.HandleGetPairs)
	mux.HandleFunc("POST /api/inspect", inspectHandler.HandleInspect)
	mux.HandleFunc("GET /api/false-friends", ffHandler.HandleGetFalseFriends)
	mux.HandleFunc("GET /api/search", searchHandler.HandleSearch)

	return middleware.Chain(
		mux,
		middleware.Recoverer,
		middleware.Logger,
		middleware.Cors(corsOrigin),
	)
}
```

- [ ] **Step 4: Write comprehensive HTTP integration tests**

Write `backend/internal/handlers/handlers_test.go`:
```go
package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/sojupie/linduistics/backend/internal/api"
	"github.com/sojupie/linduistics/backend/internal/database"
)

func setupTestServer(t *testing.T) http.Handler {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/linduistics?sslmode=disable"
	}
	db, err := database.New(context.Background(), dbURL)
	if err != nil {
		t.Skipf("skipping handler integration test: %v", err)
	}
	return api.NewRouter(db.Pool, "*")
}

func TestHealthEndpoint(t *testing.T) {
	router := setupTestServer(t)
	req := httptest.NewRequest("GET", "/api/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
}

func TestPairsEndpoint(t *testing.T) {
	router := setupTestServer(t)
	req := httptest.NewRequest("GET", "/api/pairs?source=sv&target=en&min_phon=0.6&min_sem=0.6&limit=10", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestInspectEndpoint(t *testing.T) {
	router := setupTestServer(t)
	body := `{"text": "katten och hunden bor i huset", "source_lang": "sv", "target_langs": ["en"]}`
	req := httptest.NewRequest("POST", "/api/inspect", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestFalseFriendsQuizEndpoint(t *testing.T) {
	router := setupTestServer(t)
	req := httptest.NewRequest("GET", "/api/false-friends?source=sv&target=en&limit=5&mode=quiz", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSearchEndpoint(t *testing.T) {
	router := setupTestServer(t)
	req := httptest.NewRequest("GET", "/api/search?q=vat&lang=sv&limit=5", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}
}
```

Run: `cd backend && go test -v ./internal/handlers`
Expected: PASS

- [ ] **Step 5: Commit Task 4**

```bash
git add backend/internal/middleware backend/internal/handlers backend/internal/api
git commit -m "feat(backend): implement standard library HTTP handlers, middleware, and router"
```

---

### Task 5: Server Entry Point & Live Verification

**Files:**
- Create: `backend/cmd/server/main.go`

- [ ] **Step 1: Write main.go with graceful shutdown**

Write `backend/cmd/server/main.go`:
```go
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/sojupie/linduistics/backend/internal/api"
	"github.com/sojupie/linduistics/backend/internal/config"
	"github.com/sojupie/linduistics/backend/internal/database"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg := config.Load()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	slog.Info("connecting to database", "url", cfg.DatabaseURL)
	db, err := database.New(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	router := api.NewRouter(db.Pool, cfg.CorsOrigin)

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		slog.Info("linduistics backend listening", "port", cfg.Port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("http server failed", "error", err)
			os.Exit(1)
		}
	}()

	<-stop
	slog.Info("shutting down server gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced to shutdown", "error", err)
	}
	slog.Info("server exited cleanly")
}
```

- [ ] **Step 2: Build server executable and run tests across all packages**

Run:
```bash
cd backend
go build -o server.exe ./cmd/server
go test -v ./...
```
Expected: PASS across all packages.

- [ ] **Step 3: Commit Task 5**

```bash
git add backend/cmd/server
git commit -m "feat(backend): implement server main entrypoint with graceful shutdown"
```
