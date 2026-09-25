import { useMutation, useQuery } from '@tanstack/react-query';
import {
  fetchClusterByRoot,
  fetchClusters,
  fetchFalseFriendsQuiz,
  fetchHealth,
  fetchLanguages,
  fetchPairs,
  inspectText,
  searchHeadwords,
} from './apiClient';
import type {
  ClustersQueryParams,
  ClustersResultDto,
  CognateCluster,
  HealthStatus,
  InspectResponse,
  LanguagesResponse,
  PairsQueryParams,
  PairsResultDto,
  QuizItemDto,
  RawComparisonDto,
} from '../types/linguistics';
import { QUERY_CONFIG } from '../constants/config';

export function useHealthQuery() {
  return useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: QUERY_CONFIG.HEALTH_POLL_INTERVAL_MS,
    retry: QUERY_CONFIG.HEALTH_RETRY_COUNT,
  });
}

export function useLanguagesQuery(source?: string) {
  return useQuery<LanguagesResponse>({
    queryKey: ['languages', source],
    queryFn: () => fetchLanguages(source),
    staleTime: QUERY_CONFIG.PAIRS_STALE_TIME_MS,
  });
}

export function usePairsQuery(params: PairsQueryParams) {
  return useQuery<PairsResultDto>({
    queryKey: ['pairs', params],
    queryFn: () => fetchPairs(params),
    staleTime: QUERY_CONFIG.PAIRS_STALE_TIME_MS,
  });
}

export function useInspectMutation() {
  return useMutation<
    InspectResponse,
    Error,
    { text: string; source_lang: string; target_langs: string[] }
  >({
    mutationFn: (payload) => inspectText(payload),
  });
}

export function useFalseFriendsQuizQuery(
  source = 'sv',
  target = 'en',
  limit = QUERY_CONFIG.DEFAULT_QUIZ_LIMIT,
  options?: { enabled?: boolean },
) {
  return useQuery<QuizItemDto[]>({
    queryKey: ['false-friends', 'quiz', source, target, limit],
    queryFn: () => fetchFalseFriendsQuiz(source, target, limit),
    staleTime: QUERY_CONFIG.QUIZ_STALE_TIME_MS,
    enabled: options?.enabled ?? true,
  });
}

export function useHeadwordSearchQuery(query: string, lang = 'all') {
  const trimmed = query.trim();
  return useQuery<RawComparisonDto[]>({
    queryKey: ['search', lang, trimmed],
    queryFn: () => searchHeadwords(trimmed, lang),
    enabled: trimmed.length >= QUERY_CONFIG.MIN_HEADWORD_SEARCH_CHARS,
    staleTime: QUERY_CONFIG.SEARCH_STALE_TIME_MS,
  });
}

export function useClustersQuery(params: ClustersQueryParams = {}) {
  return useQuery<ClustersResultDto>({
    queryKey: ['clusters', params],
    queryFn: () => fetchClusters(params),
    staleTime: QUERY_CONFIG.PAIRS_STALE_TIME_MS,
  });
}

export function useClusterByRootQuery(root?: string | null) {
  const trimmed = (root ?? '').trim();
  return useQuery<CognateCluster | null>({
    queryKey: ['cluster-by-root', trimmed],
    queryFn: () => fetchClusterByRoot(trimmed),
    enabled: Boolean(trimmed),
    staleTime: QUERY_CONFIG.PAIRS_STALE_TIME_MS,
  });
}
