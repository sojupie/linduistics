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

const MAX_PAIR_PAGE_SIZE = 200;
const MAX_CLUSTER_PAGE_SIZE = 100;

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

export async function fetchLanguages(source?: string, target?: string): Promise<LanguagesResponse> {
  const params = new URLSearchParams();
  if (source) params.set('source', source);
  if (target) params.set('target', target);
  const q = params.toString();
  return apiClient<LanguagesResponse>(`/api/languages${q ? `?${q}` : ''}`);
}

export async function fetchPairs(params: PairsQueryParams = {}): Promise<PairsResultDto> {
  const query = new URLSearchParams();
  if (params.id !== undefined) query.set('id', params.id.toString());
  if (params.source) query.set('source', params.source);
  if (params.target) query.set('target', params.target);
  if (params.min_phon !== undefined) query.set('min_phon', params.min_phon.toString());
  if (params.max_phon !== undefined) query.set('max_phon', params.max_phon.toString());
  if (params.min_sem !== undefined) query.set('min_sem', params.min_sem.toString());
  if (params.max_sem !== undefined) query.set('max_sem', params.max_sem.toString());
  if (params.category) query.set('category', params.category);
  if (params.etymological_relation) query.set('etymological_relation', params.etymological_relation);
  if (params.q) query.set('q', params.q);
  if (params.pos) query.set('pos', params.pos);
  if (params.limit !== undefined) query.set('limit', params.limit.toString());
  if (params.offset !== undefined) query.set('offset', params.offset.toString());

  const qs = query.toString();
  return apiClient<PairsResultDto>(qs ? `/api/pairs?${qs}` : '/api/pairs');
}

export async function fetchRandomPairs(params: PairsQueryParams = {}): Promise<PairsResultDto> {
  const { total } = await fetchPairs({ ...params, limit: 1 });
  if (!total) return { items: [], total: 0, limit: 0, offset: 0 };
  const limit = Math.min(total, MAX_PAIR_PAGE_SIZE);
  const offset = Math.floor(Math.random() * (total - limit + 1));
  return fetchPairs({ ...params, limit, offset });
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
  relation?: string,
  posInclude?: string,
): Promise<QuizItemDto[]> {
  const params: Record<string, string> = {
    mode: 'quiz',
    source,
    target,
    limit: limit.toString(),
  };
  if (relation && relation !== 'all') {
    params.relation = relation;
  }
  if (posInclude) {
    params.pos_include = posInclude;
  }
  const query = new URLSearchParams(params);
  return apiClient<QuizItemDto[]>(`/api/false-friends?${query.toString()}`);
}

export async function searchHeadwords(
  query: string,
  lang = 'all',
  limit = QUERY_CONFIG.DEFAULT_SEARCH_LIMIT,
): Promise<RawComparisonDto[]> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });
  if (lang && lang !== 'all') {
    params.set('lang', lang);
  }
  return apiClient<RawComparisonDto[]>(`/api/search?${params.toString()}`);
}

export async function fetchClusters(params: ClustersQueryParams = {}): Promise<ClustersResultDto> {
  const query = new URLSearchParams();
  if (params.min_langs !== undefined) query.set('min_langs', params.min_langs.toString());
  if (params.proto) query.set('proto', params.proto);
  if (params.lang) query.set('lang', params.lang);
  if (params.q) query.set('q', params.q);
  if (params.limit !== undefined) query.set('limit', params.limit.toString());
  if (params.offset !== undefined) query.set('offset', params.offset.toString());

  const qs = query.toString();
  return apiClient<ClustersResultDto>(qs ? `/api/clusters?${qs}` : '/api/clusters');
}

export async function fetchRandomClusters(params: ClustersQueryParams = {}): Promise<ClustersResultDto> {
  const { total } = await fetchClusters({ ...params, limit: 1 });
  if (!total) return { items: [], total: 0, limit: 0, offset: 0 };
  const limit = Math.min(total, MAX_CLUSTER_PAGE_SIZE);
  const offset = Math.floor(Math.random() * (total - limit + 1));
  return fetchClusters({ ...params, limit, offset });
}

export async function fetchClusterByRoot(root: string): Promise<CognateCluster | null> {
  try {
    const params = new URLSearchParams({ root });
    return await apiClient<CognateCluster>(`/api/clusters/by-root?${params.toString()}`);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) {
      return null;
    }
    throw err;
  }
}
