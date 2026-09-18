export type SpecimenCategory = 
  | 'cognate'     // True Cognates (Herbarium moss green)
  | 'minefield'   // False Friends (Dried oxblood red)
  | 'cousin'      // Sound-Shifted Cousins (Raw ochre / amber)
  | 'schism'      // Semantic Divergence / Translation Pairs (Iron gall blue)
  | 'alien';      // Unrelated Lexicon (Slate)

export interface SpecimenPair {
  id: number;
  catalogId: string;
  wordA: string;
  ipaA?: string;
  defA: string;
  posA?: string;
  wordB: string;
  ipaB?: string;
  defB: string;
  posB?: string;
  orthographicSim: number;
  phoneticSim: number;
  semanticSim: number;
  category: SpecimenCategory;
  marginalia?: string;
}

export interface LanguageProfile {
  code: string;
  name: string;
  taxonomicName?: string;
  branch: 'North Germanic' | 'West Germanic';
  everydayDistance: number;
  academicDistance: number;
  phoneticDistance: number;
  spellingDistance: number;
  ratios: {
    identical: number;
    shifted: number;
    falseFriends: number;
    divergent: number;
  };
  radarProfile: {
    orthography: number;
    phonetics: number;
    heritageSurvival: number;
    classicalLoanwords: number;
    deceptionFactor: number;
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
}

export interface PairsQueryParams {
  source?: string;
  target?: string;
  min_phon?: number;
  max_phon?: number;
  min_sem?: number;
  max_sem?: number;
  category?: string;
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
