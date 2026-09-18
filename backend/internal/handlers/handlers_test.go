package handlers_test

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
