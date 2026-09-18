package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
)

func WriteJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func WriteError(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, map[string]string{"error": message})
}

func ParseFloat(s string, defaultVal float32) float32 {
	if s == "" {
		return defaultVal
	}
	val, err := strconv.ParseFloat(s, 32)
	if err != nil {
		return defaultVal
	}
	return float32(val)
}

func ParseInt(s string, defaultVal int) int {
	if s == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(s)
	if err != nil {
		return defaultVal
	}
	return val
}
