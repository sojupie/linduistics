package repository

import (
	"context"
	"fmt"
	"sort"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/sojupie/linduistics/backend/internal/models"
)

type ComparisonsRepository struct {
	pool *pgxpool.Pool
}

func NewComparisonsRepository(pool *pgxpool.Pool) *ComparisonsRepository {
	return &ComparisonsRepository{pool: pool}
}

func (r *ComparisonsRepository) QueryPairs(ctx context.Context, p models.PairsQueryParams) ([]models.WordComparison, int, error) {
	if p.Limit <= 0 || p.Limit > 200 {
		p.Limit = 50
	}
	if p.Offset < 0 {
		p.Offset = 0
	}

	whereClause := "WHERE lang_a = $1 AND lang_b = $2 AND sim_point <@ box(point($3, $4), point($5, $6))"
	args := []any{p.SourceLang, p.TargetLang, p.MinPhon, p.MinSem, p.MaxPhon, p.MaxSem}

	if p.Category != "" {
		args = append(args, p.Category)
		whereClause += fmt.Sprintf(" AND category = $%d", len(args))
	}

	countQuery := "SELECT count(*) FROM word_comparisons " + whereClause
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count pairs error: %w", err)
	}

	dataQuery := fmt.Sprintf(`
		SELECT id, lang_a, word_a, ipa_a, def_a, pos_a,
		       lang_b, word_b, ipa_b, def_b, pos_b,
		       orthographic_sim, phonetic_sim, semantic_sim, category
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
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan pair error: %w", err)
		}
		items = append(items, c)
	}
	if items == nil {
		items = []models.WordComparison{}
	}

	return items, total, nil
}

func (r *ComparisonsRepository) GetByTokens(ctx context.Context, sourceLang string, tokens []string, targetLangs []string, minSem float32) ([]models.WordComparison, error) {
	query := `
		SELECT id, lang_a, word_a, ipa_a, def_a, pos_a,
		       lang_b, word_b, ipa_b, def_b, pos_b,
		       orthographic_sim, phonetic_sim, semantic_sim, category
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
		); err != nil {
			return nil, fmt.Errorf("scan token match error: %w", err)
		}
		items = append(items, c)
	}
	return items, nil
}

func (r *ComparisonsRepository) GetFalseFriends(ctx context.Context, sourceLang, targetLang string, limit int) ([]models.WordComparison, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	query := `
		SELECT id, lang_a, word_a, ipa_a, def_a, pos_a,
		       lang_b, word_b, ipa_b, def_b, pos_b,
		       orthographic_sim, phonetic_sim, semantic_sim, category
		FROM word_comparisons
		WHERE lang_a = $1 AND lang_b = $2 AND category = 'false_friend'
		ORDER BY random()
		LIMIT $3
	`
	rows, err := r.pool.Query(ctx, query, sourceLang, targetLang, limit)
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
		); err != nil {
			return nil, fmt.Errorf("scan false friend error: %w", err)
		}
		items = append(items, c)
	}
	return items, nil
}

func (r *ComparisonsRepository) GetDistractorDefs(ctx context.Context, targetLang string, excludeDef string, limit int) ([]string, error) {
	query := `
		SELECT DISTINCT def_b
		FROM word_comparisons
		WHERE lang_b = $1 AND def_b != $2 AND length(def_b) > 5
		ORDER BY random()
		LIMIT $3
	`
	rows, err := r.pool.Query(ctx, query, targetLang, excludeDef, limit)
	if err != nil {
		return nil, fmt.Errorf("get distractors error: %w", err)
	}
	defer rows.Close()

	var defs []string
	for rows.Next() {
		var d string
		if err := rows.Scan(&d); err != nil {
			return nil, err
		}
		defs = append(defs, d)
	}
	return defs, nil
}

func (r *ComparisonsRepository) SearchHeadwords(ctx context.Context, lang, prefix string, limit int) ([]models.WordComparison, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	query := `
		SELECT id, lang_a, word_a, ipa_a, def_a, pos_a,
		       lang_b, word_b, ipa_b, def_b, pos_b,
		       orthographic_sim, phonetic_sim, semantic_sim, category
		FROM word_comparisons
		WHERE lang_a = $1 AND word_a ILIKE $2 || '%'
		ORDER BY phonetic_sim DESC, semantic_sim DESC
		LIMIT $3
	`
	rows, err := r.pool.Query(ctx, query, lang, prefix, limit)
	if err != nil {
		return nil, fmt.Errorf("search headwords error: %w", err)
	}
	defer rows.Close()

	var items []models.WordComparison
	for rows.Next() {
		var c models.WordComparison
		if err := rows.Scan(
			&c.ID, &c.LangA, &c.WordA, &c.IpaA, &c.DefA, &c.PosA,
			&c.LangB, &c.WordB, &c.IpaB, &c.DefB, &c.PosB,
			&c.OrthographicSim, &c.PhoneticSim, &c.SemanticSim, &c.Category,
		); err != nil {
			return nil, fmt.Errorf("scan search result error: %w", err)
		}
		items = append(items, c)
	}
	return items, nil
}

func (r *ComparisonsRepository) ResolveForms(ctx context.Context, lang string, forms []string) (map[string][]string, error) {
	query := `
		SELECT form, lemma
		FROM word_forms
		WHERE lang = $1 AND form = ANY($2)
	`
	rows, err := r.pool.Query(ctx, query, lang, forms)
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

func (r *ComparisonsRepository) GetLanguageStats(ctx context.Context, source string) (*models.LanguagesResponse, error) {
	whereClause := ""
	var args []any
	if source != "" {
		whereClause = "WHERE lang_a = $1"
		args = append(args, source)
	}

	query := fmt.Sprintf(`
		SELECT 
			lang_a,
			lang_b,
			count(*) AS pair_count,
			COALESCE(avg(orthographic_sim), 0) AS avg_ortho,
			COALESCE(avg(phonetic_sim), 0) AS avg_phon,
			COALESCE(avg(semantic_sim), 0) AS avg_sem,
			COALESCE(count(*) FILTER (WHERE category IN ('true_cognate', 'cognate')), 0) AS cognates,
			COALESCE(count(*) FILTER (WHERE category = 'false_friend'), 0) AS false_friends,
			COALESCE(count(*) FILTER (WHERE category IN ('partial_cognate', 'cousin')), 0) AS shifted,
			COALESCE(count(*) FILTER (WHERE category IN ('translation_pair', 'schism', 'divergent')), 0) AS divergent
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
		var cognates, falseFriends, shifted, divergent int64
		if err := rows.Scan(
			&p.Source,
			&p.Target,
			&p.PairCount,
			&p.AvgOrthographic,
			&p.AvgPhonetic,
			&p.AvgSemantic,
			&cognates,
			&falseFriends,
			&shifted,
			&divergent,
		); err != nil {
			return nil, fmt.Errorf("scan language pair stats error: %w", err)
		}

		if p.PairCount > 0 {
			countF := float32(p.PairCount)
			p.IdenticalRatio = float32(cognates) / countF
			p.ShiftedRatio = float32(shifted) / countF
			p.FalseFriendsRatio = float32(falseFriends) / countF
			p.DivergentRatio = float32(divergent) / countF
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

	return &models.LanguagesResponse{
		Languages: languages,
		Pairs:     pairs,
	}, nil
}

