package services

import (
	"testing"
)

func TestTokenize(t *testing.T) {
	text := "Katten, hunden och fågeln sjunger! Åtminstone på kvällen."
	ordered, unique := Tokenize(text)

	expectedUnique := []string{"katten", "hunden", "och", "fågeln", "sjunger", "åtminstone", "på", "kvällen"}
	if len(unique) != len(expectedUnique) {
		t.Fatalf("expected %d unique tokens, got %d: %v", len(expectedUnique), len(unique), unique)
	}

	for i, exp := range expectedUnique {
		if unique[i] != exp {
			t.Errorf("at index %d: expected %s, got %s", i, exp, unique[i])
		}
	}

	if len(ordered) != 8 {
		t.Errorf("expected 8 ordered tokens, got %d", len(ordered))
	}
}

func TestTokenizePunctuationAndNumbers(t *testing.T) {
	text := "123 hej... det här är 456 ett test!"
	_, unique := Tokenize(text)

	expected := []string{"hej", "det", "här", "är", "ett", "test"}
	if len(unique) != len(expected) {
		t.Fatalf("expected %d tokens, got %d: %v", len(expected), len(unique), unique)
	}
}
