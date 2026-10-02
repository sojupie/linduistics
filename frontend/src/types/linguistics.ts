export type SpecimenCategory = 
  | 'true_cognate'       // True Cognates (Herbarium moss green)
  | 'false_friend'       // False Friends (Dried oxblood red)
  | 'partial_cognate'    // Partial Cognates (Raw ochre / amber)
  | 'translation_pair'   // Translation Pairs (Iron gall blue)
  | 'other'              // Other / Unclassified (Slate)
  | 'full_cognate'
  | 'semantic_narrowing'
  | 'semantic_broadening'
  | 'archaic_cognate'
  | 'cognate_false_friend'
  | 'accidental_lookalike'
  | 'sister_loanword'
  | 'unrelated_equivalent'
  | 'independent_root';

export type EtymologicalRelation = 'cognate' | 'false_cognate' | 'unknown' | 'borrowed_stratum' | 'unrelated' | 'independent';

export interface SenseItem {
  sense_id: number;
  gloss: string;
  pos?: string;
  tags?: string[];
  is_active: boolean;
  is_active_match: boolean;
  similarity_to_counterpart: number;
}

export interface WordPair {
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
  etymologicalRelation: EtymologicalRelation;
  sensesA: SenseItem[];
  sensesB: SenseItem[];
  etymRootA?: string | null;
  etymRootB?: string | null;
  sharedEtymRoot?: string | null;
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
  true_cognates_ratio: number;
  partial_cognates_ratio: number;
  false_friends_ratio: number;
  translation_pairs_ratio: number;
  other_ratio: number;
}

export interface LanguagesResponse {
  languages: string[];
  pairs: LanguagePairStats[];
  pos_counts: PosCount[];
}

export interface PosCount {
  category?: string;
  side?: 'source' | 'target';
  pos: string;
  count: number;
}

export interface LanguageProfile {
  code: string;
  name: string;
  pairCount: number;
  phoneticDistance: number;
  spellingDistance: number;
  semanticDistance: number;
  phoneticSimilarity: number;
  spellingSimilarity: number;
  semanticSimilarity: number;
  ratios: {
    trueCognates: number;
    partialCognates: number;
    falseFriends: number;
    translationPairs: number;
    other: number;
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

export interface AlternativeMatch {
  word: string;
  category: string;
  phonetic_sim: number;
  semantic_sim: number;
}

export interface AlternativeWord {
  form: string;
  lemma: string;
  pos: string;
  universality_score: number;
  universality_delta: number;
  sentence_delta?: number;
  context_fit?: number;
  cognate_matches: Record<string, AlternativeMatch>;
}

export interface TokenAnalysis {
  id?: number;
  token: string;
  lemma?: string;
  pos?: string;
  dep_rel?: string;
  head_id?: number;
  head_text?: string;
  morph?: Record<string, string>;
  is_punct?: boolean;
  is_stop?: boolean;
  status: 'universal' | 'branch_specific' | 'isolate';
  coverage_ratio: number;
  matches: Record<string, TargetMatch>;
  alternatives?: AlternativeWord[];
}

export interface InspectResponse {
  source_lang: string;
  target_langs: string[];
  total_tokens: number;
  unique_tokens: number;
  universality_score: number;
  tokens: TokenAnalysis[];
  approximate_translations?: Record<string, string>;
  pan_germanic_translations?: Record<string, string>;
  root_id?: number;
  service_mode?: string;
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
  etymological_relation: EtymologicalRelation;
  senses_a?: SenseItem[];
  senses_b?: SenseItem[];
  etym_root_a?: string | null;
  etym_root_b?: string | null;
  shared_etym_root?: string | null;
  etym_text_a?: string | null;
  etym_text_b?: string | null;
}

export interface PairsQueryParams {
  id?: number;
  source?: string;
  target?: string;
  min_phon?: number;
  max_phon?: number;
  min_sem?: number;
  max_sem?: number;
  category?: string;
  etymological_relation?: string;
  q?: string;
  pos?: string;
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
  trap_option?: number;
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
