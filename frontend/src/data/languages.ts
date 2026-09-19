import type { LanguagePairStats, LanguageProfile } from '../types/linguistics';

/**
 * Resolves standard ISO language codes to their full English names
 * dynamically using the browser's native Internationalization API.
 */
export function getLanguageName(code: string): string {
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
  return {
    code: pair.target,
    name: getLanguageName(pair.target),
    pairCount: pair.pair_count,
    phoneticDistance: Math.max(0, 1.0 - pair.avg_phonetic),
    spellingDistance: Math.max(0, 1.0 - pair.avg_orthographic),
    semanticDistance: Math.max(0, 1.0 - pair.avg_semantic),
    ratios: {
      trueCognates: pair.true_cognates_ratio,
      partialCognates: pair.partial_cognates_ratio,
      falseFriends: pair.false_friends_ratio,
      translationPairs: pair.translation_pairs_ratio,
      other: pair.other_ratio,
    },
  };
}
