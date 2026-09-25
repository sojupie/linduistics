package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

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

type AlternativeMatch struct {
	Word        string  `json:"word"`
	Category    string  `json:"category"`
	PhoneticSim float32 `json:"phonetic_sim"`
	SemanticSim float32 `json:"semantic_sim"`
}

type AlternativeWord struct {
	Form              string                      `json:"form"`
	Lemma             string                      `json:"lemma"`
	Pos               string                      `json:"pos"`
	UniversalityScore float32                     `json:"universality_score"`
	UniversalityDelta float32                     `json:"universality_delta"`
	SentenceDelta     float32                     `json:"sentence_delta"`
	ContextFit        float32                     `json:"context_fit"`
	CognateMatches    map[string]AlternativeMatch `json:"cognate_matches"`
}

type TokenAnalysis struct {
	ID              int                    `json:"id"`
	Token           string                 `json:"token"`
	Lemma           string                 `json:"lemma,omitempty"`
	Pos             string                 `json:"pos,omitempty"`
	DepRel          string                 `json:"dep_rel,omitempty"`
	HeadID          int                    `json:"head_id"`
	HeadText        string                 `json:"head_text,omitempty"`
	Morph           map[string]string      `json:"morph,omitempty"`
	IsPunct         bool                   `json:"is_punct"`
	IsStop          bool                   `json:"is_stop"`
	Status          string                 `json:"status"` // "universal", "branch_specific", "isolate"
	CoverageRatio   float32                `json:"coverage_ratio"`
	LanguageMatches map[string]TargetMatch `json:"matches"`
	Alternatives    []AlternativeWord      `json:"alternatives,omitempty"`
}

type InspectResponse struct {
	SourceLang              string                 `json:"source_lang"`
	TargetLangs             []string               `json:"target_langs"`
	TotalTokens             int                    `json:"total_tokens"`
	UniqueTokens            int                    `json:"unique_tokens"`
	UniversalityScore       float32                `json:"universality_score"` // 0.0 to 100.0%
	Tokens                  []TokenAnalysis        `json:"tokens"`
	ApproximateTranslations map[string]string      `json:"approximate_translations,omitempty"`
	PanGermanicTranslations map[string]string      `json:"pan_germanic_translations,omitempty"` // backward compat alias
	RootID                  int                    `json:"root_id"`
	ServiceMode             string                 `json:"service_mode"` // "nlp_service" or "db_fallback"
}

type InspectorService struct {
	repo       *repository.ComparisonsRepository
	httpClient *http.Client
	nlpBaseURL string
}

func NewInspectorService(repo *repository.ComparisonsRepository) *InspectorService {
	url := os.Getenv("NLP_SERVICE_URL")
	if url == "" {
		url = "http://127.0.0.1:5001"
	}
	return &InspectorService{
		repo: repo,
		httpClient: &http.Client{
			Timeout: 4 * time.Second,
		},
		nlpBaseURL: url,
	}
}

// NLP Service DTOs
type nlpTokenInfo struct {
	ID       int               `json:"id"`
	Text     string            `json:"text"`
	Lemma    string            `json:"lemma"`
	Pos      string            `json:"pos"`
	DepRel   string            `json:"dep_rel"`
	HeadID   int               `json:"head_id"`
	HeadText string            `json:"head_text"`
	Morph    map[string]string `json:"morph"`
	IsPunct  bool              `json:"is_punct"`
	IsStop   bool              `json:"is_stop"`
}

type nlpAnalyzeResponse struct {
	Lang   string         `json:"lang"`
	Text   string         `json:"text"`
	Tokens []nlpTokenInfo `json:"tokens"`
	RootID int            `json:"root_id"`
}

type nlpAlternativesRequest struct {
	Lang        string            `json:"lang"`
	Token       string            `json:"token"`
	Lemma       string            `json:"lemma"`
	Pos         string            `json:"pos"`
	Morph       map[string]string `json:"morph"`
	TargetLangs []string          `json:"target_langs"`
	TotalTokens int               `json:"total_tokens"`
	ContextText string            `json:"context_text,omitempty"`
}

type nlpAlternativesResponse struct {
	OriginalToken string            `json:"original_token"`
	OriginalLemma string            `json:"original_lemma"`
	OriginalScore float32           `json:"original_score"`
	Alternatives  []AlternativeWord `json:"alternatives"`
}

type nlpApproximateTranslationRequest struct {
	SourceLang  string         `json:"source_lang"`
	TargetLangs []string       `json:"target_langs"`
	Tokens      []nlpTokenInfo `json:"tokens"`
}

type nlpApproximateTranslationResponse struct {
	Translations map[string]string `json:"translations"`
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
		targets, err := s.repo.GetTargetLanguages(ctx, req.SourceLang)
		if err == nil && len(targets) > 0 {
			req.TargetLangs = targets
		} else {
			req.TargetLangs = []string{"en"}
		}
	}

	trimmedText := strings.TrimSpace(req.Text)
	if trimmedText == "" {
		return &InspectResponse{
			SourceLang:        req.SourceLang,
			TargetLangs:       req.TargetLangs,
			TotalTokens:       0,
			UniqueTokens:      0,
			UniversalityScore: 0,
			Tokens:            []TokenAnalysis{},
			ServiceMode:       "nlp_service",
		}, nil
	}

	// 1. Attempt spaCy dependency parse via local Python NLP service
	nlpResp, err := s.callNLPAnalyze(ctx, trimmedText, req.SourceLang)
	if err == nil && len(nlpResp.Tokens) > 0 {
		return s.inspectWithNLP(ctx, req, nlpResp)
	}

	// 2. Fallback to basic DB lookup if NLP service is unreachable
	return s.inspectFallback(ctx, req)
}

func (s *InspectorService) callNLPAnalyze(ctx context.Context, text, lang string) (*nlpAnalyzeResponse, error) {
	payload := map[string]string{"text": text, "lang": lang}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.nlpBaseURL+"/analyze", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("nlp service returned status %d", resp.StatusCode)
	}

	var res nlpAnalyzeResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	return &res, nil
}

func (s *InspectorService) inspectWithNLP(ctx context.Context, req InspectRequest, nlpResp *nlpAnalyzeResponse) (*InspectResponse, error) {
	// Collect lemmas and words to query in word_comparisons
	lookupWords := make([]string, 0, len(nlpResp.Tokens)*2)
	seenLookup := make(map[string]bool)

	for _, t := range nlpResp.Tokens {
		if t.IsPunct {
			continue
		}
		tokLower := strings.ToLower(t.Text)
		if !seenLookup[tokLower] {
			seenLookup[tokLower] = true
			lookupWords = append(lookupWords, tokLower)
		}
		if t.Lemma != "" && !seenLookup[t.Lemma] {
			seenLookup[t.Lemma] = true
			lookupWords = append(lookupWords, t.Lemma)
		}
	}

	matches, err := s.repo.GetByTokens(ctx, req.SourceLang, lookupWords, req.TargetLangs, 0.20)
	if err != nil {
		return nil, err
	}

	// Map: word -> lang_b -> TargetMatch
	matchMap := make(map[string]map[string]TargetMatch)
	for _, m := range matches {
		if _, ok := matchMap[m.WordA]; !ok {
			matchMap[m.WordA] = make(map[string]TargetMatch)
		}
		curr, exists := matchMap[m.WordA][m.LangB]
		// Priority: true_cognate > partial_cognate > other
		isBetter := !exists
		if exists {
			currRank := cognateCategoryRank(curr.Category)
			newRank := cognateCategoryRank(m.Category)
			if newRank > currRank || (newRank == currRank && m.PhoneticSim > curr.PhoneticSim) {
				isBetter = true
			}
		}
		if isBetter {
			matchMap[m.WordA][m.LangB] = TargetMatch{
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
	var totalCognacyPoints float32
	var scoredTokenCount int
	numTargets := len(req.TargetLangs)

	var scoredCount int
	for _, t := range nlpResp.Tokens {
		if !t.IsPunct {
			scoredCount++
		}
	}
	if scoredCount == 0 {
		scoredCount = 1
	}

	for _, t := range nlpResp.Tokens {
		tokLower := strings.ToLower(t.Text)
		langMatches := make(map[string]TargetMatch)

		// Check lemma first, then surface token
		if lMatches, ok := matchMap[t.Lemma]; ok {
			for k, v := range lMatches {
				langMatches[k] = v
			}
		}
		if sMatches, ok := matchMap[tokLower]; ok {
			for k, v := range sMatches {
				if _, exists := langMatches[k]; !exists {
					langMatches[k] = v
				}
			}
		}

		var cognacyScoreSum float32
		if !t.IsPunct {
			for _, m := range langMatches {
				switch m.Category {
				case "true_cognate", "cognate":
					sim := m.PhoneticSim
					if sim <= 0 {
						sim = 0.8
					}
					cognacyScoreSum += 1.0 * sim
				case "partial_cognate", "sound_shift", "cousin":
					sim := m.PhoneticSim
					if sim <= 0 {
						sim = 0.5
					}
					cognacyScoreSum += 0.6 * sim
				default:
					// translation_pair, false_friend, other count as 0.0 towards universality
				}
			}
		}

		ratio := float32(0)
		if numTargets > 0 && !t.IsPunct {
			ratio = cognacyScoreSum / float32(numTargets)
			totalCognacyPoints += ratio
			scoredTokenCount++
		}

		status := "isolate"
		if ratio >= 0.55 {
			status = "universal"
		} else if ratio >= 0.20 {
			status = "branch_specific"
		}

		// Fetch universal alternatives for content words
		var alternatives []AlternativeWord
		if !t.IsPunct && (t.Pos == "VERB" || t.Pos == "NOUN" || t.Pos == "ADJ" || t.Pos == "ADV" || !t.IsStop) {
			alts, err := s.callNLPAlternatives(ctx, nlpAlternativesRequest{
				Lang:        req.SourceLang,
				Token:       t.Text,
				Lemma:       t.Lemma,
				Pos:         t.Pos,
				Morph:       t.Morph,
				TargetLangs: req.TargetLangs,
				TotalTokens: scoredCount,
				ContextText: req.Text,
			})
			if err == nil && alts != nil {
				alternatives = alts.Alternatives
			}
		}

		tokenAnalyses = append(tokenAnalyses, TokenAnalysis{
			ID:              t.ID,
			Token:           t.Text,
			Lemma:           t.Lemma,
			Pos:             t.Pos,
			DepRel:          t.DepRel,
			HeadID:          t.HeadID,
			HeadText:        t.HeadText,
			Morph:           t.Morph,
			IsPunct:         t.IsPunct,
			IsStop:          t.IsStop,
			Status:          status,
			CoverageRatio:   ratio,
			LanguageMatches: langMatches,
			Alternatives:    alternatives,
		})
	}

	var overallScore float32
	if scoredTokenCount > 0 {
		overallScore = (totalCognacyPoints / float32(scoredTokenCount)) * 100.0
	}

	// Fetch cross-lingual approximate translations
	var translations map[string]string
	transResp, err := s.callNLPApproximateTranslation(ctx, nlpApproximateTranslationRequest{
		SourceLang:  req.SourceLang,
		TargetLangs: req.TargetLangs,
		Tokens:      nlpResp.Tokens,
	})
	if err == nil && transResp != nil {
		translations = transResp.Translations
	}

	return &InspectResponse{
		SourceLang:              req.SourceLang,
		TargetLangs:             req.TargetLangs,
		TotalTokens:             len(nlpResp.Tokens),
		UniqueTokens:            len(lookupWords),
		UniversalityScore:       overallScore,
		Tokens:                  tokenAnalyses,
		ApproximateTranslations: translations,
		PanGermanicTranslations: translations,
		RootID:                  nlpResp.RootID,
		ServiceMode:             "nlp_service",
	}, nil
}

func (s *InspectorService) callNLPAlternatives(ctx context.Context, reqBody nlpAlternativesRequest) (*nlpAlternativesResponse, error) {
	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.nlpBaseURL+"/alternatives", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("alternatives returned %d", resp.StatusCode)
	}

	var res nlpAlternativesResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	return &res, nil
}

func (s *InspectorService) callNLPApproximateTranslation(ctx context.Context, reqBody nlpApproximateTranslationRequest) (*nlpApproximateTranslationResponse, error) {
	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.nlpBaseURL+"/translate-approximate", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("approximate translation returned %d", resp.StatusCode)
	}

	var res nlpApproximateTranslationResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	return &res, nil
}

func (s *InspectorService) inspectFallback(ctx context.Context, req InspectRequest) (*InspectResponse, error) {
	orderedTokens, uniqueTokens := Tokenize(req.Text)
	if len(uniqueTokens) == 0 {
		return &InspectResponse{
			SourceLang:        req.SourceLang,
			TargetLangs:       req.TargetLangs,
			TotalTokens:       0,
			UniqueTokens:      0,
			UniversalityScore: 0,
			Tokens:            []TokenAnalysis{},
			ServiceMode:       "db_fallback",
		}, nil
	}

	formMap, _ := s.repo.ResolveForms(ctx, req.SourceLang, uniqueTokens)

	lookupWords := make([]string, 0, len(uniqueTokens)*2)
	seenLookup := make(map[string]bool)
	for _, tok := range uniqueTokens {
		if !seenLookup[tok] {
			seenLookup[tok] = true
			lookupWords = append(lookupWords, tok)
		}
		if lemmas, ok := formMap[tok]; ok {
			for _, l := range lemmas {
				if !seenLookup[l] {
					seenLookup[l] = true
					lookupWords = append(lookupWords, l)
				}
			}
		}
	}

	matches, err := s.repo.GetByTokens(ctx, req.SourceLang, lookupWords, req.TargetLangs, 0.20)
	if err != nil {
		return nil, err
	}

	tokenMap := make(map[string]map[string]TargetMatch)
	for _, m := range matches {
		if _, ok := tokenMap[m.WordA]; !ok {
			tokenMap[m.WordA] = make(map[string]TargetMatch)
		}
		curr, exists := tokenMap[m.WordA][m.LangB]
		isBetter := !exists
		if exists {
			currRank := cognateCategoryRank(curr.Category)
			newRank := cognateCategoryRank(m.Category)
			if newRank > currRank || (newRank == currRank && m.PhoneticSim > curr.PhoneticSim) {
				isBetter = true
			}
		}
		if isBetter {
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
	var totalCognacyPoints float32
	numTargets := len(req.TargetLangs)

	for i, tok := range uniqueTokens {
		langMatches := tokenMap[tok]
		var resolvedLemma string

		if len(langMatches) == 0 {
			if lemmas, ok := formMap[tok]; ok {
				for _, l := range lemmas {
					if lMatches, found := tokenMap[l]; found && len(lMatches) > 0 {
						langMatches = lMatches
						resolvedLemma = l
						break
					}
				}
			}
		}

		if langMatches == nil {
			langMatches = make(map[string]TargetMatch)
		}

		var cognacyScoreSum float32
		for _, m := range langMatches {
			switch m.Category {
			case "true_cognate", "cognate":
				sim := m.PhoneticSim
				if sim <= 0 {
					sim = 0.8
				}
				cognacyScoreSum += 1.0 * sim
			case "partial_cognate", "sound_shift", "cousin":
				sim := m.PhoneticSim
				if sim <= 0 {
					sim = 0.5
				}
				cognacyScoreSum += 0.6 * sim
			}
		}

		ratio := float32(0)
		if numTargets > 0 {
			ratio = cognacyScoreSum / float32(numTargets)
			totalCognacyPoints += ratio
		}

		status := "isolate"
		if ratio >= 0.55 {
			status = "universal"
		} else if ratio >= 0.20 {
			status = "branch_specific"
		}

		tokenAnalyses = append(tokenAnalyses, TokenAnalysis{
			ID:              i,
			Token:           tok,
			Lemma:           resolvedLemma,
			Status:          status,
			CoverageRatio:   ratio,
			LanguageMatches: langMatches,
		})
	}

	var overallScore float32
	if len(uniqueTokens) > 0 {
		overallScore = (totalCognacyPoints / float32(len(uniqueTokens))) * 100.0
	}

	return &InspectResponse{
		SourceLang:        req.SourceLang,
		TargetLangs:       req.TargetLangs,
		TotalTokens:       len(orderedTokens),
		UniqueTokens:      len(uniqueTokens),
		UniversalityScore: overallScore,
		Tokens:            tokenAnalyses,
		ServiceMode:       "db_fallback",
	}, nil
}

func cognateCategoryRank(cat string) int {
	switch strings.ToLower(strings.TrimSpace(cat)) {
	case "true_cognate", "cognate":
		return 3
	case "partial_cognate", "sound_shift", "cousin":
		return 2
	case "translation_pair", "translation":
		return 1
	default:
		return 0
	}
}
