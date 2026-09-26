import type { LanguagePairStats, LanguageProfile } from '../types/linguistics';

/**
 * Resolves standard ISO language codes to their full English names
 * dynamically using the browser's native Internationalization API.
 */
export function getLanguageName(code: string): string {
  if (code.toLowerCase() === 'pan') {
    return 'Pan-Germanic (Hybrid)';
  }
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
    const resolved = displayNames.of(code);
    if (resolved) return resolved;
  } catch {
    // Fall back if the runtime does not support the given tag
  }
  return code.toUpperCase();
}

/**
 * Converts a live database pair statistics record into a language profile
 * for comparative displays and orbits.
 */
export function pairStatsToProfile(pair: LanguagePairStats): LanguageProfile {
  const phoneticSimilarity = Math.max(0, Math.min(1.0, pair.avg_phonetic));
  const spellingSimilarity = Math.max(0, Math.min(1.0, pair.avg_orthographic));
  const semanticSimilarity = Math.max(0, Math.min(1.0, pair.avg_semantic));

  return {
    code: pair.target,
    name: getLanguageName(pair.target),
    pairCount: pair.pair_count,
    phoneticSimilarity,
    spellingSimilarity,
    semanticSimilarity,
    phoneticDistance: Math.max(0, 1.0 - phoneticSimilarity),
    spellingDistance: Math.max(0, 1.0 - spellingSimilarity),
    semanticDistance: Math.max(0, 1.0 - semanticSimilarity),
    ratios: {
      trueCognates: pair.true_cognates_ratio,
      partialCognates: pair.partial_cognates_ratio,
      falseFriends: pair.false_friends_ratio,
      translationPairs: pair.translation_pairs_ratio,
      other: pair.other_ratio,
    },
  };
}
