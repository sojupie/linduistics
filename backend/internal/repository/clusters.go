package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/sojupie/linduistics/backend/internal/models"
)

type ClustersRepository struct {
	pool *pgxpool.Pool
}

func NewClustersRepository(pool *pgxpool.Pool) *ClustersRepository {
	return &ClustersRepository{pool: pool}
}

func (r *ClustersRepository) QueryClusters(ctx context.Context, p models.ClustersQueryParams) ([]models.CognateCluster, int, error) {
	if p.Limit <= 0 || p.Limit > 100 {
		p.Limit = 25
	}
	if p.Offset < 0 {
		p.Offset = 0
	}
	if p.MinLanguages <= 0 {
		p.MinLanguages = 2
	}

	whereClause := "WHERE language_count >= $1"
	args := []any{p.MinLanguages}

	if p.ProtoLanguage != "" {
		args = append(args, p.ProtoLanguage)
		whereClause += fmt.Sprintf(" AND proto_language = $%d", len(args))
	}
	if p.Language != "" {
		p.Language = normalizeLang(p.Language)
		args = append(args, p.Language)
		whereClause += fmt.Sprintf(" AND $%d = ANY(languages)", len(args))
	}
	if p.Search != "" {
		args = append(args, "%"+p.Search+"%")
		whereClause += fmt.Sprintf(" AND (root ILIKE $%d OR members::text ILIKE $%d)", len(args), len(args))
	}

	countQuery := "SELECT count(*) FROM cognate_clusters " + whereClause
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count clusters error: %w", err)
	}

	dataQuery := fmt.Sprintf(`
		SELECT id, root, proto_language, language_count, languages, members, sample_gloss
		FROM cognate_clusters
		%s
		ORDER BY language_count DESC, root ASC
		LIMIT $%d OFFSET $%d
	`, whereClause, len(args)+1, len(args)+2)

	dataArgs := append(args, p.Limit, p.Offset)

	rows, err := r.pool.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("query clusters error: %w", err)
	}
	defer rows.Close()

	var items []models.CognateCluster
	for rows.Next() {
		var c models.CognateCluster
		if err := rows.Scan(
			&c.ID,
			&c.Root,
			&c.ProtoLanguage,
			&c.LanguageCount,
			&c.Languages,
			&c.Members,
			&c.SampleGloss,
		); err != nil {
			return nil, 0, fmt.Errorf("scan cluster error: %w", err)
		}
		items = append(items, c)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate clusters error: %w", err)
	}

	return items, total, nil
}

func (r *ClustersRepository) GetClusterByRoot(ctx context.Context, root string) (*models.CognateCluster, error) {
	query := `
		SELECT id, root, proto_language, language_count, languages, members, sample_gloss
		FROM cognate_clusters
		WHERE root = $1
		LIMIT 1
	`
	var c models.CognateCluster
	err := r.pool.QueryRow(ctx, query, root).Scan(
		&c.ID,
		&c.Root,
		&c.ProtoLanguage,
		&c.LanguageCount,
		&c.Languages,
		&c.Members,
		&c.SampleGloss,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}
