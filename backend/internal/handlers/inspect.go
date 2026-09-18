package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/sojupie/linduistics/backend/internal/services"
)

type InspectHandler struct {
	inspector *services.InspectorService
}

func NewInspectHandler(inspector *services.InspectorService) *InspectHandler {
	return &InspectHandler{inspector: inspector}
}

func (h *InspectHandler) HandleInspect(w http.ResponseWriter, r *http.Request) {
	var req services.InspectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Text == "" {
		WriteError(w, http.StatusBadRequest, "text field cannot be empty")
		return
	}

	resp, err := h.inspector.InspectText(r.Context(), req)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}
