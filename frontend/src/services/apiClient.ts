import type {
  HealthStatus,
  InspectResponse,
  LanguagesResponse,
  PairsQueryParams,
  PairsResultDto,
  QuizItemDto,
  RawComparisonDto,
} from '../types/linguistics';
import { QUERY_CONFIG } from '../constants/config';

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export async function apiClient<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type') && !(options?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
    throw new ApiError(res.status, errorBody.error || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchHealth(): Promise<HealthStatus> {
  return apiClient<HealthStatus>('/api/health');
}

export async function fetchLanguages(source?: string): Promise<LanguagesResponse> {
  const query = source ? `?source=${encodeURIComponent(source)}` : '';
  return apiClient<LanguagesResponse>(`/api/languages${query}`);
}

export async function fetchPairs(params: PairsQueryParams = {}): Promise<PairsResultDto> {
  const query = new URLSearchParams();
  if (params.source) query.set('source', params.source);
  if (params.target) query.set('target', params.target);
  if (params.min_phon !== undefined) query.set('min_phon', params.min_phon.toString());
  if (params.max_phon !== undefined) query.set('max_phon', params.max_phon.toString());
  if (params.min_sem !== undefined) query.set('min_sem', params.min_sem.toString());
  if (params.max_sem !== undefined) query.set('max_sem', params.max_sem.toString());
  if (params.category) query.set('category', params.category);
  if (params.limit !== undefined) query.set('limit', params.limit.toString());
  if (params.offset !== undefined) query.set('offset', params.offset.toString());

  const qs = query.toString();
  return apiClient<PairsResultDto>(qs ? `/api/pairs?${qs}` : '/api/pairs');
}

export async function inspectText(payload: {
  text: string;
  source_lang: string;
  target_langs: string[];
}): Promise<InspectResponse> {
  return apiClient<InspectResponse>('/api/inspect', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}


export async function fetchFalseFriendsQuiz(
  source = 'sv',
  target = 'en',
  limit = QUERY_CONFIG.DEFAULT_QUIZ_LIMIT,
): Promise<QuizItemDto[]> {
  const query = new URLSearchParams({
    mode: 'quiz',
    source,
    target,
    limit: limit.toString(),
  });
  return apiClient<QuizItemDto[]>(`/api/false-friends?${query.toString()}`);
}

export async function searchHeadwords(
  query: string,
  lang = 'sv',
  limit = QUERY_CONFIG.DEFAULT_SEARCH_LIMIT,
): Promise<RawComparisonDto[]> {
  const params = new URLSearchParams({
    q: query,
    lang,
    limit: limit.toString(),
  });
  return apiClient<RawComparisonDto[]>(`/api/search?${params.toString()}`);
}
