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

	// Test 4: Search headwords
	srch, err := repo.SearchHeadwords(context.Background(), "sv", "vat", 5)
	if err != nil {
		t.Fatalf("SearchHeadwords failed: %v", err)
	}
	// We might have words starting with vat (like vatten)
	if len(srch) == 0 {
		t.Log("Note: no words starting with 'vat' found in test dataset")
	}
}
