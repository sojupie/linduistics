package services

import (
	"context"
	"regexp"
	"strings"

	"github.com/sojupie/linduistics/backend/internal/repository"
)

type InspectRequest struct {
	Text        string   `json:"text"`
	SourceLang  string   `json:"source_lang"`
	TargetLangs []string `json:"target_langs"`
}

type TargetMatch struct {
	Word        string  `json:"word"`
	Ipa         *string `json:"ipa,omitempty"`
	Def         string  `json:"def"`
	Category    string  `json:"category"`
	SemanticSim float32 `json:"semantic_sim"`
	PhoneticSim float32 `json:"phonetic_sim"`
}

type TokenAnalysis struct {
	Token           string                 `json:"token"`
	Status          string                 `json:"status"` // "universal", "branch_specific", "isolate"
	CoverageRatio   float32                `json:"coverage_ratio"`
	LanguageMatches map[string]TargetMatch `json:"matches"`
}

type InspectResponse struct {
	SourceLang        string          `json:"source_lang"`
	TargetLangs       []string        `json:"target_langs"`
	TotalTokens       int             `json:"total_tokens"`
	UniqueTokens      int             `json:"unique_tokens"`
	UniversalityScore float32         `json:"universality_score"` // 0.0 to 100.0%
	Tokens            []TokenAnalysis `json:"tokens"`
}

type InspectorService struct {
	repo *repository.ComparisonsRepository
}

func NewInspectorService(repo *repository.ComparisonsRepository) *InspectorService {
	return &InspectorService{repo: repo}
}

var nonLetterRegex = regexp.MustCompile(`[^\p{L}\p{M}]+`)

func Tokenize(text string) ([]string, []string) {
	rawTokens := nonLetterRegex.Split(text, -1)
	var orderedTokens []string
	seen := make(map[string]bool)
	var uniqueTokens []string

	for _, t := range rawTokens {
		token := strings.ToLower(strings.TrimSpace(t))
		if token == "" || len([]rune(token)) < 2 {
			continue
		}
		orderedTokens = append(orderedTokens, token)
		if !seen[token] {
			seen[token] = true
			uniqueTokens = append(uniqueTokens, token)
		}
	}
	return orderedTokens, uniqueTokens
}

func (s *InspectorService) InspectText(ctx context.Context, req InspectRequest) (*InspectResponse, error) {
	if req.SourceLang == "" {
		req.SourceLang = "sv"
	}
	if len(req.TargetLangs) == 0 {
		req.TargetLangs = []string{"en"}
	}

	orderedTokens, uniqueTokens := Tokenize(req.Text)
	if len(uniqueTokens) == 0 {
		return &InspectResponse{
			SourceLang:        req.SourceLang,
			TargetLangs:       req.TargetLangs,
			TotalTokens:       0,
			UniqueTokens:      0,
			UniversalityScore: 0,
			Tokens:            []TokenAnalysis{},
		}, nil
	}

	matches, err := s.repo.GetByTokens(ctx, req.SourceLang, uniqueTokens, req.TargetLangs, 0.70)
	if err != nil {
		return nil, err
	}

	// Group matches by token and target lang (keeping highest semantic sim)
	tokenMap := make(map[string]map[string]TargetMatch)
	for _, m := range matches {
		if _, ok := tokenMap[m.WordA]; !ok {
			tokenMap[m.WordA] = make(map[string]TargetMatch)
		}
		curr, exists := tokenMap[m.WordA][m.LangB]
		if !exists || m.SemanticSim > curr.SemanticSim {
			tokenMap[m.WordA][m.LangB] = TargetMatch{
				Word:        m.WordB,
				Ipa:         m.IpaB,
				Def:         m.DefB,
				Category:    m.Category,
				SemanticSim: m.SemanticSim,
				PhoneticSim: m.PhoneticSim,
			}
		}
	}

	var tokenAnalyses []TokenAnalysis
	var totalMatchesAcrossTokens int
	numTargets := len(req.TargetLangs)

	for _, tok := range uniqueTokens {
		langMatches := tokenMap[tok]
		if langMatches == nil {
			langMatches = make(map[string]TargetMatch)
		}

		matchedCount := len(langMatches)
		totalMatchesAcrossTokens += matchedCount
		ratio := float32(matchedCount) / float32(numTargets)

		status := "isolate"
		if ratio >= 0.75 {
			status = "universal"
		} else if matchedCount > 0 {
			status = "branch_specific"
		}

		tokenAnalyses = append(tokenAnalyses, TokenAnalysis{
			Token:           tok,
			Status:          status,
			CoverageRatio:   ratio,
			LanguageMatches: langMatches,
		})
	}

	possibleMaxMatches := len(uniqueTokens) * numTargets
	var overallScore float32
	if possibleMaxMatches > 0 {
		overallScore = (float32(totalMatchesAcrossTokens) / float32(possibleMaxMatches)) * 100.0
	}

	return &InspectResponse{
		SourceLang:        req.SourceLang,
		TargetLangs:       req.TargetLangs,
		TotalTokens:       len(orderedTokens),
		UniqueTokens:      len(uniqueTokens),
		UniversalityScore: overallScore,
		Tokens:            tokenAnalyses,
	}, nil
}
