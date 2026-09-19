export type SpecimenCategory = 
  | 'true_cognate'       // True Cognates (Herbarium moss green)
  | 'false_friend'       // False Friends (Dried oxblood red)
  | 'partial_cognate'    // Partial Cognates (Raw ochre / amber)
  | 'translation_pair'   // Translation Pairs (Iron gall blue)
  | 'other';             // Other / Unclassified (Slate)

export type FalseFriendType = 'etymological_shift' | 'surface_collision' | null;

export interface SenseItem {
  sense_id: number;
  gloss: string;
  pos?: string;
  tags?: string[];
  is_active: boolean;
  is_active_match: boolean;
  similarity_to_counterpart: number;
}

export interface SpecimenPair {
  id: number;
  catalogId: string;
  langA: string;
  wordA: string;
  ipaA?: string;
  defA: string;
  posA?: string;
  langB: string;
  wordB: string;
  ipaB?: string;
  defB: string;
  posB?: string;
  orthographicSim: number;
  phoneticSim: number;
  semanticSim: number;
  category: SpecimenCategory;
  rawCategory: string;
  falseFriendType?: FalseFriendType;
  sensesA: SenseItem[];
  sensesB: SenseItem[];
  etymRoot?: string | null;
  etymTextA?: string | null;
  etymTextB?: string | null;
  marginalia?: string;
}

export interface LanguagePairStats {
  source: string;
  target: string;
  pair_count: number;
  avg_orthographic: number;
  avg_phonetic: number;
  avg_semantic: number;
  identical_ratio: number;
  shifted_ratio: number;
  false_friends_ratio: number;
  divergent_ratio: number;
}

export interface LanguagesResponse {
  languages: string[];
  pairs: LanguagePairStats[];
}

export interface LanguageProfile {
  code: string;
  name: string;
  pairCount: number;
  phoneticDistance: number;
  spellingDistance: number;
  semanticDistance: number;
  ratios: {
    identical: number;
    shifted: number;
    falseFriends: number;
    divergent: number;
  };
}

export interface TargetMatch {
  word: string;
  ipa?: string;
  def: string;
  category: string;
  semantic_sim: number;
  phonetic_sim: number;
}

export interface TokenAnalysis {
  token: string;
  lemma?: string;
  status: 'universal' | 'branch_specific' | 'isolate';
  coverage_ratio: number;
  matches: Record<string, TargetMatch>;
}

export interface InspectResponse {
  source_lang: string;
  target_langs: string[];
  total_tokens: number;
  unique_tokens: number;
  universality_score: number;
  tokens: TokenAnalysis[];
}

export interface RawComparisonDto {
  id: number;
  lang_a: string;
  word_a: string;
  ipa_a?: string;
  def_a: string;
  pos_a?: string;
  lang_b: string;
  word_b: string;
  ipa_b?: string;
  def_b: string;
  pos_b?: string;
  orthographic_sim: number;
  phonetic_sim: number;
  semantic_sim: number;
  category: string;
  false_friend_type?: FalseFriendType;
  senses_a?: SenseItem[];
  senses_b?: SenseItem[];
  etym_root?: string | null;
  etym_text_a?: string | null;
  etym_text_b?: string | null;
}

export interface PairsQueryParams {
  source?: string;
  target?: string;
  min_phon?: number;
  max_phon?: number;
  min_sem?: number;
  max_sem?: number;
  category?: string;
  false_friend_type?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface PairsResultDto {
  items: RawComparisonDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface HealthStatus {
  status: string;
  database: string;
}

export interface QuizItemDto extends RawComparisonDto {
  options: string[];
  correct_option: number;
}

export interface ClusterMember {
  lang: string;
  word: string;
  ipa: string;
  pos: string;
  gloss: string;
  etym_text?: string;
}

export interface CognateCluster {
  id: number;
  root: string;
  proto_language: string;
  language_count: number;
  languages: string[];
  members: ClusterMember[];
  sample_gloss?: string;
}

export interface ClustersQueryParams {
  min_langs?: number;
  proto?: string;
  lang?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface ClustersResultDto {
  items: CognateCluster[];
  total: number;
  limit: number;
  offset: number;
}
