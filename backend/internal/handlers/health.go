package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

type HealthHandler struct {
	pool *pgxpool.Pool
}

func NewHealthHandler(pool *pgxpool.Pool) *HealthHandler {
	return &HealthHandler{pool: pool}
}

func (h *HealthHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	dbStatus := "connected"
	if err := h.pool.Ping(r.Context()); err != nil {
		dbStatus = "disconnected"
	}

	WriteJSON(w, http.StatusOK, map[string]string{
		"status":   "ok",
		"database": dbStatus,
	})
}
