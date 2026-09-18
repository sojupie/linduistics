import { useMutation, useQuery } from '@tanstack/react-query';
import {
  fetchFalseFriendsQuiz,
  fetchHealth,
  fetchPairs,
  inspectText,
  searchHeadwords,
} from './apiClient';
import type {
  HealthStatus,
  InspectResponse,
  PairsQueryParams,
  PairsResultDto,
  QuizItemDto,
  RawComparisonDto,
} from '../types/linguistics';

export function useHealthQuery() {
  return useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30000,
    retry: 1,
  });
}

export function usePairsQuery(params: PairsQueryParams) {
  return useQuery<PairsResultDto>({
    queryKey: ['pairs', params],
    queryFn: () => fetchPairs(params),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
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
  limit = 10,
  options?: { enabled?: boolean },
) {
  return useQuery<QuizItemDto[]>({
    queryKey: ['false-friends', 'quiz', source, target, limit],
    queryFn: () => fetchFalseFriendsQuiz(source, target, limit),
    staleTime: 1000 * 60 * 2,
    enabled: options?.enabled ?? true,
  });
}

export function useHeadwordSearchQuery(query: string, lang = 'sv') {
  const trimmed = query.trim();
  return useQuery<RawComparisonDto[]>({
    queryKey: ['search', lang, trimmed],
    queryFn: () => searchHeadwords(trimmed, lang),
    enabled: trimmed.length >= 2,
    staleTime: 1000 * 60 * 2,
  });
}
