package handlers

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/sojupie/linduistics/backend/internal/models"
	"github.com/sojupie/linduistics/backend/internal/repository"
)

type ClustersHandler struct {
	repo *repository.ClustersRepository
}

func NewClustersHandler(repo *repository.ClustersRepository) *ClustersHandler {
	return &ClustersHandler{repo: repo}
}

func (h *ClustersHandler) HandleGetClusters(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	params := models.ClustersQueryParams{
		MinLanguages:  ParseInt(q.Get("min_langs"), 2),
		ProtoLanguage: q.Get("proto"),
		Language:      q.Get("lang"),
		Search:        q.Get("q"),
		Limit:         ParseInt(q.Get("limit"), 25),
		Offset:        ParseInt(q.Get("offset"), 0),
	}

	items, total, err := h.repo.QueryClusters(r.Context(), params)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, models.ClustersResult{
		Items:  items,
		Total:  total,
		Limit:  params.Limit,
		Offset: params.Offset,
	})
}

func (h *ClustersHandler) HandleGetClusterByRoot(w http.ResponseWriter, r *http.Request) {
	root := r.URL.Query().Get("root")
	if root == "" {
		WriteError(w, http.StatusBadRequest, "missing root query parameter")
		return
	}

	cluster, err := h.repo.GetClusterByRoot(r.Context(), root)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteError(w, http.StatusNotFound, "cluster not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, cluster)
}
