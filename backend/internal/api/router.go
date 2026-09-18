package api

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/sojupie/linduistics/backend/internal/handlers"
	"github.com/sojupie/linduistics/backend/internal/middleware"
	"github.com/sojupie/linduistics/backend/internal/repository"
	"github.com/sojupie/linduistics/backend/internal/services"
)

func NewRouter(pool *pgxpool.Pool, corsOrigin string) http.Handler {
	mux := http.NewServeMux()

	repo := repository.NewComparisonsRepository(pool)
	inspector := services.NewInspectorService(repo)

	healthHandler := handlers.NewHealthHandler(pool)
	pairsHandler := handlers.NewPairsHandler(repo)
	inspectHandler := handlers.NewInspectHandler(inspector)
	ffHandler := handlers.NewFalseFriendsHandler(repo)
	searchHandler := handlers.NewSearchHandler(repo)
	languagesHandler := handlers.NewLanguagesHandler(repo)
	clustersRepo := repository.NewClustersRepository(pool)
	clustersHandler := handlers.NewClustersHandler(clustersRepo)

	// Standard library method matching
	mux.HandleFunc("GET /api/health", healthHandler.HandleHealth)
	mux.HandleFunc("GET /api/languages", languagesHandler.HandleGetLanguages)
	mux.HandleFunc("GET /api/pairs", pairsHandler.HandleGetPairs)
	mux.HandleFunc("POST /api/inspect", inspectHandler.HandleInspect)
	mux.HandleFunc("GET /api/false-friends", ffHandler.HandleGetFalseFriends)
	mux.HandleFunc("GET /api/search", searchHandler.HandleSearch)
	mux.HandleFunc("GET /api/clusters", clustersHandler.HandleGetClusters)
	mux.HandleFunc("GET /api/clusters/by-root", clustersHandler.HandleGetClusterByRoot)

	return middleware.Chain(
		mux,
		middleware.Recoverer,
		middleware.Logger,
		middleware.Cors(corsOrigin),
	)
}
