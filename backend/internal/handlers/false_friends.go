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
	TrapOption    int      `json:"trap_option"`
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
	relation := q.Get("relation")
	posInclude := q.Get("pos_include")
	limit := ParseInt(q.Get("limit"), 10)
	mode := q.Get("mode")

	pairs, err := h.repo.GetFalseFriends(r.Context(), source, target, relation, posInclude, limit)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if mode == "quiz" {
		distractorPool, _ := h.repo.GetDistractorPool(r.Context(), target, 50)
		var quizItems []QuizItem

		for _, pair := range pairs {
			seen := make(map[string]bool)
			seen[pair.DefB] = true

			options := []string{pair.DefB}
			var trapDef string

			if pair.DefA != "" && pair.DefA != pair.DefB && len(pair.DefA) > 3 {
				trapDef = pair.DefA
				options = append(options, trapDef)
				seen[trapDef] = true
			}

			for _, d := range distractorPool {
				if len(options) >= 4 {
					break
				}
				if !seen[d] && len(d) > 3 {
					options = append(options, d)
					seen[d] = true
				}
			}

			if len(options) < 4 {
				extra, _ := h.repo.GetDistractorDefs(r.Context(), target, pair.DefB, 4-len(options))
				for _, e := range extra {
					if len(options) >= 4 {
						break
					}
					if !seen[e] {
						options = append(options, e)
						seen[e] = true
					}
				}
			}

			rand.Shuffle(len(options), func(i, j int) {
				options[i], options[j] = options[j], options[i]
			})

			correctIdx := 0
			trapIdx := -1
			for idx, opt := range options {
				if opt == pair.DefB {
					correctIdx = idx
				} else if trapDef != "" && opt == trapDef {
					trapIdx = idx
				}
			}

			quizItems = append(quizItems, QuizItem{
				WordComparison: pair,
				Options:        options,
				CorrectOption:  correctIdx,
				TrapOption:     trapIdx,
			})
		}
		WriteJSON(w, http.StatusOK, quizItems)
		return
	}

	WriteJSON(w, http.StatusOK, pairs)
}
