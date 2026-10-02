package handlers

import (
	"net/http"

	"github.com/sojupie/linduistics/backend/internal/repository"
)

type LanguagesHandler struct {
	repo *repository.ComparisonsRepository
}

func NewLanguagesHandler(repo *repository.ComparisonsRepository) *LanguagesHandler {
	return &LanguagesHandler{repo: repo}
}

func (h *LanguagesHandler) HandleGetLanguages(w http.ResponseWriter, r *http.Request) {
	source := r.URL.Query().Get("source")
	target := r.URL.Query().Get("target")
	stats, err := h.repo.GetLanguageStats(r.Context(), source, target)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, stats)
}
