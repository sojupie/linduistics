package repository

import (
	"context"
	"fmt"
	"math/rand/v2"
	"sort"
	"strings"
	"sync"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/sojupie/linduistics/backend/internal/models"
)

type ComparisonsRepository struct {
	pool            *pgxpool.Pool
	statsMu         sync.RWMutex
	statsCache      map[string]*models.LanguagesResponse
	targetsMu       sync.RWMutex
	targetsCache    map[string][]string
	distractorMu    sync.RWMutex
	distractorCache map[string][]string
}

func normalizeLang(code string) string {
	if code == "no" {
		return "nb"
	}
	return code
}

func NewComparisonsRepository(pool *pgxpool.Pool) *ComparisonsRepository {
	return &ComparisonsRepository{
		pool:            pool,
		statsCache:      make(map[string]*models.LanguagesResponse),
		targetsCache:    make(map[string][]string),
		distractorCache: make(map[string][]string),
	}
}

func (r *ComparisonsRepository) QueryPairs(ctx context.Context, p models.PairsQueryParams) ([]models.WordComparison, int, error) {
	p.SourceLang = normalizeLang(p.SourceLang)
	p.TargetLang = normalizeLang(p.TargetLang)

	if p.Limit <= 0 || p.Limit > 200 {
		p.Limit = 50
	}
	if p.Offset < 0 {
		p.Offset = 0
	}

	whereClause := "WHERE lang_a = $1 AND lang_b = $2 AND phonetic_sim >= $3 AND semantic_sim >= $4 AND phonetic_sim <= $5 AND semantic_sim <= $6"
	args := []any{p.SourceLang, p.TargetLang, p.MinPhon, p.MinSem, p.MaxPhon, p.MaxSem}

	if p.Category != "" {
		switch strings.ToLower(strings.TrimSpace(p.Category)) {
		case "cognate", "cognates":
			whereClause += " AND category IN ('true_cognate', 'full_cognate', 'partial_cognate', 'semantic_narrowing', 'semantic_broadening', 'archaic_cognate')"
		case "true_cognate", "full_cognate":
			whereClause += " AND category IN ('true_cognate', 'full_cognate')"
		case "false_friend", "cognate_false_friend", "accidental_lookalike":
			whereClause += " AND category IN ('false_friend', 'cognate_false_friend', 'accidental_lookalike')"
		case "partial_cognate", "semantic_shift", "semantic_shifts", "semantic_narrowing", "semantic_broadening", "archaic_cognate":
			whereClause += " AND category IN ('partial_cognate', 'semantic_narrowing', 'semantic_broadening', 'archaic_cognate')"
		case "translation_pair", "translation_equivalent", "translation_equivalents", "unrelated_equivalent":
			whereClause += " AND category IN ('translation_pair', 'unrelated_equivalent')"
		case "other", "unrelated", "unrelated_lexicon", "independent_root":
			whereClause += " AND category IN ('other', 'independent_root')"
		default:
			args = append(args, p.Category)
			whereClause += fmt.Sprintf(" AND category = $%d", len(args))
		}
	}
	if p.EtymologicalRelation != "" {
		args = append(args, p.EtymologicalRelation)
		whereClause += fmt.Sprintf(" AND etymological_relation = $%d", len(args))
	}
	if p.Search != "" {
		args = append(args, "%"+p.Search+"%")
		whereClause += fmt.Sprintf(" AND (word_a ILIKE $%d OR word_b ILIKE $%d)", len(args), len(args))
	}

	dataQuery := fmt.Sprintf(`
		SELECT id, lang_a, word_a, ipa_a, def_a, pos_a,
		       lang_b, word_b, ipa_b, def_b, pos_b,
		       orthographic_sim, phonetic_sim, semantic_sim, category,
		       etymological_relation, senses_a, senses_b, etym_root_a, etym_root_b, shared_etym_root, etym_text_a, etym_text_b
		FROM word_comparisons
		%s
		ORDER BY phonetic_sim DESC, semantic_sim DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, len(args)+1, len(args)+2)

	queryArgs := append(args, p.Limit, p.Offset)
	rows, err := r.pool.Query(ctx, dataQuery, queryArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("query pairs error: %w", err)
	}
	defer rows.Close()

	var items []models.WordComparison
	for rows.Next() {
		var c models.WordComparison
		err := rows.Scan(
			&c.ID, &c.LangA, &c.WordA, &c.IpaA, &c.DefA, &c.PosA,
			&c.LangB, &c.WordB, &c.IpaB, &c.DefB, &c.PosB,
			&c.OrthographicSim, &c.PhoneticSim, &c.SemanticSim, &c.Category,
			&c.EtymologicalRelation, &c.SensesA, &c.SensesB, &c.EtymRootA, &c.EtymRootB, &c.SharedEtymRoot, &c.EtymTextA, &c.EtymTextB,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan pair error: %w", err)
		}
		items = append(items, c)
	}
	if items == nil {
		items = []models.WordComparison{}
	}

	if p.Offset == 0 && len(items) < p.Limit {
		return items, len(items), nil
	}

	countQuery := "SELECT count(*) FROM word_comparisons " + whereClause
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count pairs error: %w", err)
	}

	return items, total, nil
}

func (r *ComparisonsRepository) GetByTokens(ctx context.Context, sourceLang string, tokens []string, targetLangs []string, minSem float32) ([]models.WordComparison, error) {
	sourceLang = normalizeLang(sourceLang)
	normTargets := make([]string, len(targetLangs))
	for i, l := range targetLangs {
		normTargets[i] = normalizeLang(l)
	}
	targetLangs = normTargets

	if sourceLang == "pan" {
		query := `
			SELECT id, lang_a, word_a, ipa_a, def_a, pos_a,
			       lang_b, word_b, ipa_b, def_b, pos_b,
			       orthographic_sim, phonetic_sim, semantic_sim, category,
			       etymological_relation, senses_a, senses_b, etym_root_a, etym_root_b, shared_etym_root, etym_text_a, etym_text_b
			FROM word_comparisons
			WHERE word_a = ANY($1)
			  AND lang_b = ANY($2)
			  AND lang_a != lang_b
			  AND semantic_sim >= $3
			ORDER BY word_a, semantic_sim DESC
		`
		rows, err := r.pool.Query(ctx, query, tokens, targetLangs, minSem)
		if err != nil {
			return nil, fmt.Errorf("get by tokens pan error: %w", err)
		}
		defer rows.Close()

		var items []models.WordComparison
		for rows.Next() {
			var c models.WordComparison
			if err := rows.Scan(
				&c.ID, &c.LangA, &c.WordA, &c.IpaA, &c.DefA, &c.PosA,
				&c.LangB, &c.WordB, &c.IpaB, &c.DefB, &c.PosB,
				&c.OrthographicSim, &c.PhoneticSim, &c.SemanticSim, &c.Category,
				&c.EtymologicalRelation, &c.SensesA, &c.SensesB, &c.EtymRootA, &c.EtymRootB, &c.SharedEtymRoot, &c.EtymTextA, &c.EtymTextB,
			); err != nil {
				return nil, fmt.Errorf("scan token match error: %w", err)
			}
			items = append(items, c)
		}
		return items, nil
	}

	query := `
		SELECT id, lang_a, word_a, ipa_a, def_a, pos_a,
		       lang_b, word_b, ipa_b, def_b, pos_b,
		       orthographic_sim, phonetic_sim, semantic_sim, category,
		       etymological_relation, senses_a, senses_b, etym_root_a, etym_root_b, shared_etym_root, etym_text_a, etym_text_b
		FROM word_comparisons
		WHERE lang_a = $1
		  AND word_a = ANY($2)
		  AND lang_b = ANY($3)
		  AND semantic_sim >= $4
		ORDER BY word_a, semantic_sim DESC
	`
	rows, err := r.pool.Query(ctx, query, sourceLang, tokens, targetLangs, minSem)
	if err != nil {
		return nil, fmt.Errorf("get by tokens error: %w", err)
	}
	defer rows.Close()

	var items []models.WordComparison
	for rows.Next() {
		var c models.WordComparison
		if err := rows.Scan(
			&c.ID, &c.LangA, &c.WordA, &c.IpaA, &c.DefA, &c.PosA,
			&c.LangB, &c.WordB, &c.IpaB, &c.DefB, &c.PosB,
			&c.OrthographicSim, &c.PhoneticSim, &c.SemanticSim, &c.Category,
			&c.EtymologicalRelation, &c.SensesA, &c.SensesB, &c.EtymRootA, &c.EtymRootB, &c.SharedEtymRoot, &c.EtymTextA, &c.EtymTextB,
		); err != nil {
			return nil, fmt.Errorf("scan token match error: %w", err)
		}
		items = append(items, c)
	}
	return items, nil
}

func (r *ComparisonsRepository) GetFalseFriends(ctx context.Context, sourceLang, targetLang, relation string, limit int) ([]models.WordComparison, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	whereClause := "WHERE lang_a = $1 AND lang_b = $2 AND category IN ('false_friend', 'cognate_false_friend', 'accidental_lookalike')"
	args := []any{sourceLang, targetLang}
	if relation != "" && relation != "all" {
		args = append(args, relation)
		whereClause += fmt.Sprintf(" AND etymological_relation = $%d", len(args))
	}
	args = append(args, limit)
	query := fmt.Sprintf(`
		SELECT id, lang_a, word_a, ipa_a, def_a, pos_a,
		       lang_b, word_b, ipa_b, def_b, pos_b,
		       orthographic_sim, phonetic_sim, semantic_sim, category,
		       etymological_relation, senses_a, senses_b, etym_root_a, etym_root_b, shared_etym_root, etym_text_a, etym_text_b
		FROM word_comparisons
		%s
		ORDER BY random()
		LIMIT $%d
	`, whereClause, len(args))
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("get false friends error: %w", err)
	}
	defer rows.Close()

	var items []models.WordComparison
	for rows.Next() {
		var c models.WordComparison
		if err := rows.Scan(
			&c.ID, &c.LangA, &c.WordA, &c.IpaA, &c.DefA, &c.PosA,
			&c.LangB, &c.WordB, &c.IpaB, &c.DefB, &c.PosB,
			&c.OrthographicSim, &c.PhoneticSim, &c.SemanticSim, &c.Category,
			&c.EtymologicalRelation, &c.SensesA, &c.SensesB, &c.EtymRootA, &c.EtymRootB, &c.SharedEtymRoot, &c.EtymTextA, &c.EtymTextB,
		); err != nil {
			return nil, fmt.Errorf("scan false friend error: %w", err)
		}
		items = append(items, c)
	}
	return items, nil
}

func (r *ComparisonsRepository) GetDistractorDefs(ctx context.Context, targetLang string, excludeDef string, limit int) ([]string, error) {
	if limit <= 0 {
		limit = 3
	}
	pool, err := r.GetDistractorPool(ctx, targetLang, limit*4)
	if err != nil {
		return nil, err
	}
	var defs []string
	for _, d := range pool {
		if d != excludeDef {
			defs = append(defs, d)
			if len(defs) >= limit {
				break
			}
		}
	}
	return defs, nil
}

func (r *ComparisonsRepository) GetDistractorPool(ctx context.Context, targetLang string, limit int) ([]string, error) {
	if limit <= 0 {
		limit = 40
	}
	targetLang = normalizeLang(targetLang)

	r.distractorMu.RLock()
	pool, ok := r.distractorCache[targetLang]
	r.distractorMu.RUnlock()

	if !ok || len(pool) < limit {
		query := `
			SELECT def_b FROM (
				SELECT DISTINCT def_b
				FROM word_comparisons
				WHERE lang_b = $1 AND length(def_b) > 5
				LIMIT 200
			) d
		`
		rows, err := r.pool.Query(ctx, query, targetLang)
		if err != nil {
			return nil, fmt.Errorf("get distractor pool error: %w", err)
		}
		defer rows.Close()

		var fetched []string
		for rows.Next() {
			var d string
			if err := rows.Scan(&d); err == nil {
				fetched = append(fetched, d)
			}
		}

		r.distractorMu.Lock()
		r.distractorCache[targetLang] = fetched
		pool = fetched
		r.distractorMu.Unlock()
	}

	if len(pool) == 0 {
		return []string{}, nil
	}

	perm := rand.Perm(len(pool))
	result := make([]string, 0, limit)
	for i := 0; i < len(perm) && len(result) < limit; i++ {
		result = append(result, pool[perm[i]])
	}
	return result, nil
}

func canonicalPairKey(langA, wordA, langB, wordB string) string {
	a := strings.ToLower(langA) + ":" + strings.ToLower(wordA)
	b := strings.ToLower(langB) + ":" + strings.ToLower(wordB)
	if a < b {
		return a + "<->" + b
	}
	return b + "<->" + a
}

func flipComparison(c models.WordComparison) models.WordComparison {
	return models.WordComparison{
		ID:                  c.ID,
		LangA:               c.LangB,
		WordA:               c.WordB,
		IpaA:                c.IpaB,
		DefA:                c.DefB,
		PosA:                c.PosB,
		LangB:               c.LangA,
		WordB:               c.WordA,
		IpaB:                c.IpaA,
		DefB:                c.DefA,
		PosB:                c.PosA,
		OrthographicSim:     c.OrthographicSim,
		PhoneticSim:         c.PhoneticSim,
		SemanticSim:         c.SemanticSim,
		Category:            c.Category,
		EtymologicalRelation: c.EtymologicalRelation,
		SensesA:             c.SensesB,
		SensesB:             c.SensesA,
		EtymRootA:           c.EtymRootB,
		EtymRootB:           c.EtymRootA,
		SharedEtymRoot:      c.SharedEtymRoot,
		EtymTextA:           c.EtymTextB,
		EtymTextB:           c.EtymTextA,
	}
}

func (r *ComparisonsRepository) SearchHeadwords(ctx context.Context, lang, prefix string, limit int) ([]models.WordComparison, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	fetchLimit := limit * 3
	if fetchLimit < 30 {
		fetchLimit = 30
	} else if fetchLimit > 150 {
		fetchLimit = 150
	}

	var query string
	var rows pgx.Rows
	var err error

	if lang == "" || lang == "all" {
		query = `
			SELECT id, lang_a, word_a, ipa_a, def_a, pos_a,
			       lang_b, word_b, ipa_b, def_b, pos_b,
			       orthographic_sim, phonetic_sim, semantic_sim, category,
			       etymological_relation, senses_a, senses_b, etym_root_a, etym_root_b, shared_etym_root, etym_text_a, etym_text_b
			FROM word_comparisons
			WHERE word_a ILIKE $1 || '%' OR word_b ILIKE $1 || '%'
			ORDER BY phonetic_sim DESC, semantic_sim DESC
			LIMIT $2
		`
		rows, err = r.pool.Query(ctx, query, prefix, fetchLimit)
	} else {
		lang = normalizeLang(lang)
		query = `
			SELECT id, lang_a, word_a, ipa_a, def_a, pos_a,
			       lang_b, word_b, ipa_b, def_b, pos_b,
			       orthographic_sim, phonetic_sim, semantic_sim, category,
			       etymological_relation, senses_a, senses_b, etym_root_a, etym_root_b, shared_etym_root, etym_text_a, etym_text_b
			FROM word_comparisons
			WHERE (lang_a = $1 AND word_a ILIKE $2 || '%') OR (lang_b = $1 AND word_b ILIKE $2 || '%')
			ORDER BY phonetic_sim DESC, semantic_sim DESC
			LIMIT $3
		`
		rows, err = r.pool.Query(ctx, query, lang, prefix, fetchLimit)
	}
	if err != nil {
		return nil, fmt.Errorf("search headwords error: %w", err)
	}
	defer rows.Close()

	var items []models.WordComparison
	seenKeys := make(map[string]bool)
	lowerPrefix := strings.ToLower(prefix)

	for rows.Next() {
		var c models.WordComparison
		if err := rows.Scan(
			&c.ID, &c.LangA, &c.WordA, &c.IpaA, &c.DefA, &c.PosA,
			&c.LangB, &c.WordB, &c.IpaB, &c.DefB, &c.PosB,
			&c.OrthographicSim, &c.PhoneticSim, &c.SemanticSim, &c.Category,
			&c.EtymologicalRelation, &c.SensesA, &c.SensesB, &c.EtymRootA, &c.EtymRootB, &c.SharedEtymRoot, &c.EtymTextA, &c.EtymTextB,
		); err != nil {
			return nil, fmt.Errorf("scan search result error: %w", err)
		}

		matchA := strings.HasPrefix(strings.ToLower(c.WordA), lowerPrefix)
		matchB := strings.HasPrefix(strings.ToLower(c.WordB), lowerPrefix)

		if lang != "" && lang != "all" {
			normLang := strings.ToLower(normalizeLang(lang))
			if strings.ToLower(c.LangA) != normLang && strings.ToLower(c.LangB) == normLang {
				c = flipComparison(c)
			}
		} else if !matchA && matchB {
			c = flipComparison(c)
		}

		key := canonicalPairKey(c.LangA, c.WordA, c.LangB, c.WordB)
		if seenKeys[key] {
			continue
		}
		seenKeys[key] = true
		items = append(items, c)
		if len(items) >= limit {
			break
		}
	}
	return items, nil
}

func (r *ComparisonsRepository) ResolveForms(ctx context.Context, lang string, forms []string) (map[string][]string, error) {
	lang = normalizeLang(lang)
	var query string
	var rows pgx.Rows
	var err error

	if lang == "pan" {
		query = `
			SELECT form, lemma
			FROM word_forms
			WHERE form = ANY($1)
		`
		rows, err = r.pool.Query(ctx, query, forms)
	} else {
		query = `
			SELECT form, lemma
			FROM word_forms
			WHERE lang = $1 AND form = ANY($2)
		`
		rows, err = r.pool.Query(ctx, query, lang, forms)
	}
	if err != nil {
		return nil, fmt.Errorf("resolve forms error: %w", err)
	}
	defer rows.Close()

	mapping := make(map[string][]string)
	for rows.Next() {
		var f, l string
		if err := rows.Scan(&f, &l); err != nil {
			return nil, err
		}
		mapping[f] = append(mapping[f], l)
	}
	return mapping, nil
}

func (r *ComparisonsRepository) GetTargetLanguages(ctx context.Context, sourceLang string) ([]string, error) {
	sourceLang = normalizeLang(sourceLang)

	r.targetsMu.RLock()
	if cached, ok := r.targetsCache[sourceLang]; ok {
		r.targetsMu.RUnlock()
		return cached, nil
	}
	r.targetsMu.RUnlock()

	var query string
	var rows pgx.Rows
	var err error

	if sourceLang == "pan" {
		query = `SELECT DISTINCT lang_b FROM word_comparisons ORDER BY lang_b`
		rows, err = r.pool.Query(ctx, query)
	} else {
		query = `SELECT DISTINCT lang_b FROM word_comparisons WHERE lang_a = $1 ORDER BY lang_b`
		rows, err = r.pool.Query(ctx, query, sourceLang)
	}
	if err != nil {
		return nil, fmt.Errorf("get target languages error: %w", err)
	}
	defer rows.Close()

	var targets []string
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			return nil, err
		}
		targets = append(targets, t)
	}

	r.targetsMu.Lock()
	r.targetsCache[sourceLang] = targets
	r.targetsMu.Unlock()

	return targets, nil
}

func (r *ComparisonsRepository) GetLanguageStats(ctx context.Context, source string) (*models.LanguagesResponse, error) {
	cacheKey := normalizeLang(source)

	r.statsMu.RLock()
	if cached, ok := r.statsCache[cacheKey]; ok {
		r.statsMu.RUnlock()
		return cached, nil
	}
	r.statsMu.RUnlock()

	whereClause := ""
	var args []any
	if source != "" {
		whereClause = "WHERE lang_a = $1"
		args = append(args, normalizeLang(source))
	}

	query := fmt.Sprintf(`
		SELECT 
			lang_a,
			lang_b,
			count(*) AS pair_count,
			COALESCE(avg(orthographic_sim), 0) AS avg_ortho,
			COALESCE(avg(phonetic_sim), 0) AS avg_phon,
			COALESCE(avg(semantic_sim), 0) AS avg_sem,
			COALESCE(count(*) FILTER (WHERE category IN ('true_cognate', 'full_cognate')), 0) AS true_cognates,
			COALESCE(count(*) FILTER (WHERE category IN ('false_friend', 'cognate_false_friend', 'accidental_lookalike')), 0) AS false_friends,
			COALESCE(count(*) FILTER (WHERE category IN ('partial_cognate', 'semantic_narrowing', 'semantic_broadening', 'archaic_cognate')), 0) AS partial_cognates,
			COALESCE(count(*) FILTER (WHERE category IN ('translation_pair', 'unrelated_equivalent')), 0) AS translation_pairs,
			COALESCE(count(*) FILTER (WHERE category IN ('other', 'independent_root') OR category IS NULL OR category NOT IN (
				'true_cognate', 'full_cognate', 'false_friend', 'cognate_false_friend', 'accidental_lookalike',
				'partial_cognate', 'semantic_narrowing', 'semantic_broadening', 'archaic_cognate',
				'translation_pair', 'unrelated_equivalent'
			)), 0) AS other_count
		FROM word_comparisons
		%s
		GROUP BY lang_a, lang_b
		ORDER BY lang_a, lang_b;
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("get language stats error: %w", err)
	}
	defer rows.Close()

	langSet := make(map[string]bool)
	var pairs []models.LanguagePairStats

	for rows.Next() {
		var p models.LanguagePairStats
		var trueCognates, falseFriends, partialCognates, translationPairs, otherCount int64
		if err := rows.Scan(
			&p.Source,
			&p.Target,
			&p.PairCount,
			&p.AvgOrthographic,
			&p.AvgPhonetic,
			&p.AvgSemantic,
			&trueCognates,
			&falseFriends,
			&partialCognates,
			&translationPairs,
			&otherCount,
		); err != nil {
			return nil, fmt.Errorf("scan language pair stats error: %w", err)
		}

		if p.PairCount > 0 {
			countF := float32(p.PairCount)
			p.TrueCognatesRatio = float32(trueCognates) / countF
			p.PartialCognatesRatio = float32(partialCognates) / countF
			p.FalseFriendsRatio = float32(falseFriends) / countF
			p.TranslationPairsRatio = float32(translationPairs) / countF
			p.OtherRatio = float32(otherCount) / countF
		}

		langSet[p.Source] = true
		langSet[p.Target] = true
		pairs = append(pairs, p)
	}

	if pairs == nil {
		pairs = []models.LanguagePairStats{}
	}

	languages := make([]string, 0, len(langSet))
	for l := range langSet {
		languages = append(languages, l)
	}
	sort.Strings(languages)

	resp := &models.LanguagesResponse{
		Languages: languages,
		Pairs:     pairs,
	}

	r.statsMu.Lock()
	r.statsCache[cacheKey] = resp
	r.statsMu.Unlock()

	return resp, nil
}

func normalizeCategory(cat string) string {
	switch strings.ToLower(strings.TrimSpace(cat)) {
	case "true_cognate", "full_cognate":
		return "true_cognate"
	case "false_friend", "cognate_false_friend", "accidental_lookalike":
		return "false_friend"
	case "partial_cognate", "semantic_narrowing", "semantic_broadening", "archaic_cognate":
		return "partial_cognate"
	case "translation_pair", "unrelated_equivalent":
		return "translation_pair"
	case "sister_loanword":
		return "sister_loanword"
	case "other", "independent_root":
		return "other"
	default:
		return cat
	}
}
