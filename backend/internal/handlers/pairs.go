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
		Category:        q.Get("category"),
		FalseFriendType: q.Get("false_friend_type"),
		Limit:           ParseInt(q.Get("limit"), 50),
		Offset:          ParseInt(q.Get("offset"), 0),
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
