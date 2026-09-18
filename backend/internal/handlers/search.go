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
