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
