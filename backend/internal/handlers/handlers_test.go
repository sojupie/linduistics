package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/sojupie/linduistics/backend/internal/api"
	"github.com/sojupie/linduistics/backend/internal/database"
	"github.com/sojupie/linduistics/backend/internal/services"
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

func TestInspectSentenceDependencyAndAlternatives(t *testing.T) {
	router := setupTestServer(t)
	body := `{"text": "jag åker bil till staden", "source_lang": "sv", "target_langs": ["en", "de", "da", "nb"]}`
	req := httptest.NewRequest("POST", "/api/inspect", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp services.InspectResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(resp.Tokens) < 5 {
		t.Fatalf("expected at least 5 tokens, got %d", len(resp.Tokens))
	}

	// Verify åker is identified as verb åka with ROOT dependency
	var akerToken *services.TokenAnalysis
	for i := range resp.Tokens {
		if resp.Tokens[i].Token == "åker" {
			akerToken = &resp.Tokens[i]
			break
		}
	}

	if akerToken == nil {
		t.Fatalf("token 'åker' not found in response")
	}

	if akerToken.Lemma != "åka" {
		t.Errorf("expected lemma 'åka' for 'åker', got %s", akerToken.Lemma)
	}
	if akerToken.Pos != "VERB" {
		t.Errorf("expected pos 'VERB' for 'åker', got %s", akerToken.Pos)
	}
	if akerToken.DepRel != "ROOT" {
		t.Errorf("expected dep_rel 'ROOT' for 'åker', got %s", akerToken.DepRel)
	}

	// Verify alternatives contain inflected 'far' (lemma 'fara')
	var foundFar bool
	for _, alt := range akerToken.Alternatives {
		if alt.Form == "far" && alt.Lemma == "fara" {
			foundFar = true
			if alt.UniversalityDelta <= 0 {
				t.Errorf("expected positive universality delta for 'far', got %f", alt.UniversalityDelta)
			}
			break
		}
	}
	if !foundFar {
		t.Errorf("expected 'far' (fara) among alternatives for 'åker', got: %+v", akerToken.Alternatives)
	}

	// Verify approximate translations are populated
	if len(resp.ApproximateTranslations) == 0 {
		t.Errorf("expected non-empty approximate_translations")
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

func TestLanguagesEndpoint(t *testing.T) {
	router := setupTestServer(t)
	req := httptest.NewRequest("GET", "/api/languages", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestClustersEndpoint(t *testing.T) {
	router := setupTestServer(t)
	req := httptest.NewRequest("GET", "/api/clusters?min_langs=3&limit=5", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestClusterByRootEndpoint(t *testing.T) {
	router := setupTestServer(t)
	req := httptest.NewRequest("GET", "/api/clusters/by-root?root=Proto-Germanic%20*hundaz", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}
}

