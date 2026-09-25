package repository

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/sojupie/linduistics/backend/internal/models"
)

type ComparisonsRepository struct {
	pool *pgxpool.Pool
}

func normalizeLang(code string) string {
	if code == "no" {
		return "nb"
	}
	return code
}

func NewComparisonsRepository(pool *pgxpool.Pool) *ComparisonsRepository {
	return &ComparisonsRepository{pool: pool}
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

	whereClause := "WHERE lang_a = $1 AND lang_b = $2 AND sim_point <@ box(point($3, $4), point($5, $6))"
	args := []any{p.SourceLang, p.TargetLang, p.MinPhon, p.MinSem, p.MaxPhon, p.MaxSem}

	if p.Category != "" {
		category := normalizeCategory(p.Category)
		args = append(args, category)
		whereClause += fmt.Sprintf(" AND category = $%d", len(args))
	}
	if p.FalseFriendType != "" {
		args = append(args, p.FalseFriendType)
		whereClause += fmt.Sprintf(" AND false_friend_type = $%d", len(args))
	}
	if p.Search != "" {
		args = append(args, "%"+p.Search+"%")
		whereClause += fmt.Sprintf(" AND (word_a ILIKE $%d OR word_b ILIKE $%d)", len(args), len(args))
	}

	countQuery := "SELECT count(*) FROM word_comparisons " + whereClause
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count pairs error: %w", err)
	}

	dataQuery := fmt.Sprintf(`
		SELECT id, lang_a, word_a, ipa_a, def_a, pos_a,
		       lang_b, word_b, ipa_b, def_b, pos_b,
		       orthographic_sim, phonetic_sim, semantic_sim, category,
		       false_friend_type, senses_a, senses_b, etym_root, etym_text_a, etym_text_b
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
			&c.FalseFriendType, &c.SensesA, &c.SensesB, &c.EtymRoot, &c.EtymTextA, &c.EtymTextB,
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
			       false_friend_type, senses_a, senses_b, etym_root, etym_text_a, etym_text_b
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
				&c.FalseFriendType, &c.SensesA, &c.SensesB, &c.EtymRoot, &c.EtymTextA, &c.EtymTextB,
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
		       false_friend_type, senses_a, senses_b, etym_root, etym_text_a, etym_text_b
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
			&c.FalseFriendType, &c.SensesA, &c.SensesB, &c.EtymRoot, &c.EtymTextA, &c.EtymTextB,
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
		       orthographic_sim, phonetic_sim, semantic_sim, category,
		       false_friend_type, senses_a, senses_b, etym_root, etym_text_a, etym_text_b
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
			&c.FalseFriendType, &c.SensesA, &c.SensesB, &c.EtymRoot, &c.EtymTextA, &c.EtymTextB,
		); err != nil {
			return nil, fmt.Errorf("scan false friend error: %w", err)
		}
		items = append(items, c)
	}
	return items, nil
}

func (r *ComparisonsRepository) GetDistractorDefs(ctx context.Context, targetLang string, excludeDef string, limit int) ([]string, error) {
	query := `
		SELECT def_b FROM (
			SELECT DISTINCT def_b
			FROM word_comparisons
			WHERE lang_b = $1 AND def_b != $2 AND length(def_b) > 5
		) d
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

func (r *ComparisonsRepository) GetDistractorPool(ctx context.Context, targetLang string, limit int) ([]string, error) {
	if limit <= 0 {
		limit = 40
	}
	query := `
		SELECT def_b FROM (
			SELECT DISTINCT def_b
			FROM word_comparisons
			WHERE lang_b = $1 AND length(def_b) > 5
		) d
		ORDER BY random()
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, targetLang, limit)
	if err != nil {
		return nil, fmt.Errorf("get distractor pool error: %w", err)
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
		       orthographic_sim, phonetic_sim, semantic_sim, category,
		       false_friend_type, senses_a, senses_b, etym_root, etym_text_a, etym_text_b
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
			&c.FalseFriendType, &c.SensesA, &c.SensesB, &c.EtymRoot, &c.EtymTextA, &c.EtymTextB,
		); err != nil {
			return nil, fmt.Errorf("scan search result error: %w", err)
		}
		items = append(items, c)
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
	return targets, nil
}

func (r *ComparisonsRepository) GetLanguageStats(ctx context.Context, source string) (*models.LanguagesResponse, error) {
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
			COALESCE(count(*) FILTER (WHERE category IN ('true_cognate', 'cognate')), 0) AS cognates,
			COALESCE(count(*) FILTER (WHERE category = 'false_friend'), 0) AS false_friends,
			COALESCE(count(*) FILTER (WHERE category IN ('partial_cognate', 'cousin', 'sound_shift')), 0) AS shifted,
			COALESCE(count(*) FILTER (WHERE category IN ('translation_pair', 'schism', 'divergent')), 0) AS divergent,
			COALESCE(count(*) FILTER (WHERE category = 'other' OR category IS NULL OR category NOT IN ('true_cognate', 'cognate', 'false_friend', 'partial_cognate', 'cousin', 'sound_shift', 'translation_pair', 'schism', 'divergent')), 0) AS other_count
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
		var cognates, falseFriends, shifted, divergent, otherCount int64
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
			&otherCount,
		); err != nil {
			return nil, fmt.Errorf("scan language pair stats error: %w", err)
		}

		if p.PairCount > 0 {
			countF := float32(p.PairCount)
			p.TrueCognatesRatio = float32(cognates) / countF
			p.PartialCognatesRatio = float32(shifted) / countF
			p.FalseFriendsRatio = float32(falseFriends) / countF
			p.TranslationPairsRatio = float32(divergent) / countF
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

	return &models.LanguagesResponse{
		Languages: languages,
		Pairs:     pairs,
	}, nil
}

func normalizeCategory(cat string) string {
	switch strings.ToLower(strings.TrimSpace(cat)) {
	case "true_cognate", "cognate":
		return "true_cognate"
	case "false_friend", "minefield":
		return "false_friend"
	case "partial_cognate", "sound_shift", "cousin", "shifted":
		return "partial_cognate"
	case "translation_pair", "translation", "schism", "divergent":
		return "translation_pair"
	case "other", "alien":
		return "other"
	default:
		return cat
	}
}
