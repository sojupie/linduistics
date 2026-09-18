package handlers

import (
	"math/rand"
	"net/http"

	"github.com/sojupie/linduistics/backend/internal/models"
	"github.com/sojupie/linduistics/backend/internal/repository"
)

type FalseFriendsHandler struct {
	repo *repository.ComparisonsRepository
}

func NewFalseFriendsHandler(repo *repository.ComparisonsRepository) *FalseFriendsHandler {
	return &FalseFriendsHandler{repo: repo}
}

type QuizItem struct {
	models.WordComparison
	Options       []string `json:"options"`
	CorrectOption int      `json:"correct_option"`
}

func (h *FalseFriendsHandler) HandleGetFalseFriends(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	source := q.Get("source")
	if source == "" {
		source = "sv"
	}
	target := q.Get("target")
	if target == "" {
		target = "en"
	}
	limit := ParseInt(q.Get("limit"), 20)
	mode := q.Get("mode")

	pairs, err := h.repo.GetFalseFriends(r.Context(), source, target, limit)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if mode == "quiz" {
		var quizItems []QuizItem
		for _, pair := range pairs {
			distractors, _ := h.repo.GetDistractorDefs(r.Context(), target, pair.DefB, 3)
			options := append([]string{pair.DefB}, distractors...)
			rand.Shuffle(len(options), func(i, j int) {
				options[i], options[j] = options[j], options[i]
			})

			correctIdx := 0
			for idx, opt := range options {
				if opt == pair.DefB {
					correctIdx = idx
					break
				}
			}

			quizItems = append(quizItems, QuizItem{
				WordComparison: pair,
				Options:        options,
				CorrectOption:  correctIdx,
			})
		}
		WriteJSON(w, http.StatusOK, quizItems)
		return
	}

	WriteJSON(w, http.StatusOK, pairs)
}
