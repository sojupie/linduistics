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

	// A selected ID should lead matching local results, including reversed language order.
	selected, selectedTotal, err := repo.QueryPairs(context.Background(), models.PairsQueryParams{
		ID:         items[0].ID,
		SourceLang: items[0].LangB,
		TargetLang: items[0].LangA,
		MaxPhon:    1,
		MaxSem:     1,
		Search:     items[0].WordA,
		Limit:      50,
	})
	if err != nil {
		t.Fatalf("QueryPairs by ID failed: %v", err)
	}
	if selectedTotal == 0 || len(selected) == 0 || selected[0].ID != items[0].ID {
		t.Fatalf("expected selected pair %d first, got total=%d items=%v", items[0].ID, selectedTotal, selected)
	}
	if selected[0].LangA != items[0].LangB || selected[0].LangB != items[0].LangA {
		t.Fatalf("expected selected pair in requested language order, got %s→%s", selected[0].LangA, selected[0].LangB)
	}

	// Test 2: False friends
	ff, err := repo.GetFalseFriends(context.Background(), "sv", "en", "", "", 5)
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

	// Test 5: Language Stats and In-Memory Caching
	stats1, err := repo.GetLanguageStats(context.Background(), "", "")
	if err != nil {
		t.Fatalf("GetLanguageStats failed: %v", err)
	}
	if len(stats1.Languages) == 0 || len(stats1.Pairs) == 0 {
		t.Fatalf("expected non-empty stats from GetLanguageStats")
	}
	stats2, err := repo.GetLanguageStats(context.Background(), "", "")
	if err != nil {
		t.Fatalf("GetLanguageStats cached failed: %v", err)
	}
	if len(stats2.Pairs) != len(stats1.Pairs) {
		t.Fatalf("cached stats mismatch: got %d, expected %d", len(stats2.Pairs), len(stats1.Pairs))
	}

	// Test 6: Target Languages and In-Memory Caching
	targets1, err := repo.GetTargetLanguages(context.Background(), "sv")
	if err != nil {
		t.Fatalf("GetTargetLanguages failed: %v", err)
	}
	if len(targets1) == 0 {
		t.Fatalf("expected non-empty target languages for sv")
	}
	targets2, err := repo.GetTargetLanguages(context.Background(), "sv")
	if err != nil {
		t.Fatalf("GetTargetLanguages cached failed: %v", err)
	}
	if len(targets2) != len(targets1) {
		t.Fatalf("cached targets mismatch")
	}

	// Test 7: Distractor Pool
	pool, err := repo.GetDistractorPool(context.Background(), "en", 10)
	if err != nil {
		t.Fatalf("GetDistractorPool failed: %v", err)
	}
	if len(pool) == 0 {
		t.Fatalf("expected distractors in pool")
	}
	defs, err := repo.GetDistractorDefs(context.Background(), "en", pool[0], 3)
	if err != nil {
		t.Fatalf("GetDistractorDefs failed: %v", err)
	}
	for _, d := range defs {
		if d == pool[0] {
			t.Fatalf("expected excluded def to not appear in distractors")
		}
	}
}
