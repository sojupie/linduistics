/**
 * Canonical taxonomy definitions, linguistic explanations, and styling tokens.
 * Provides standardized labels, tooltips, and styles across Lexicon, Overview, and Inspector.
 */

export interface TaxonomyCategoryMeta {
  key: string;
  label: string;
  tooltip: string;
  style: string;
  macroCategory: 'cognate' | 'semantic_shift' | 'false_friend' | 'translation_pair' | 'other';
}

export const TAXONOMY_DEFINITIONS: Record<string, TaxonomyCategoryMeta> = {
  true_cognate: {
    key: 'true_cognate',
    label: 'True Cognate',
    tooltip: 'True Cognate: Descended from a common ancestral Proto-Germanic root with unbroken semantic continuity and regular phonetic correspondence.',
    style: 'bg-cognate-ink text-page-surface',
    macroCategory: 'cognate',
  },
  full_cognate: {
    key: 'full_cognate',
    label: 'True Cognate',
    tooltip: 'True Cognate: Descended from a common ancestral Proto-Germanic root with unbroken semantic continuity and regular phonetic correspondence.',
    style: 'bg-cognate-ink text-page-surface',
    macroCategory: 'cognate',
  },
  semantic_narrowing: {
    key: 'semantic_narrowing',
    label: 'Semantic Narrowing',
    tooltip: 'Semantic Narrowing: Direct cognate whose meaning in this language has specialized to a narrower or more specific conceptual domain.',
    style: 'bg-shifted-ink text-page-surface',
    macroCategory: 'semantic_shift',
  },
  semantic_broadening: {
    key: 'semantic_broadening',
    label: 'Semantic Broadening',
    tooltip: 'Semantic Broadening: Direct cognate whose meaning in this language has generalized to denote a broader conceptual domain.',
    style: 'bg-shifted-ink text-page-surface',
    macroCategory: 'semantic_shift',
  },
  archaic_cognate: {
    key: 'archaic_cognate',
    label: 'Archaic Cognate',
    tooltip: 'Archaic Cognate: Direct historical cognate preserved primarily in literary, poetic, dialectal, or archaic registers.',
    style: 'bg-shifted-ink text-page-surface',
    macroCategory: 'semantic_shift',
  },
  partial_cognate: {
    key: 'partial_cognate',
    label: 'Semantic Shift',
    tooltip: 'Semantic Shift: Cognate sharing a common ancestral root, but having undergone semantic divergence, specialization, or register drift.',
    style: 'bg-shifted-ink text-page-surface',
    macroCategory: 'semantic_shift',
  },
  semantic_divergence: {
    key: 'semantic_divergence',
    label: 'Semantic Shift',
    tooltip: 'Semantic Shift: Cognate sharing a common ancestral root, but having undergone semantic divergence, specialization, or register drift.',
    style: 'bg-shifted-ink text-page-surface',
    macroCategory: 'semantic_shift',
  },
  false_friend: {
    key: 'false_friend',
    label: 'False Friend',
    tooltip: 'False Friend: Words resembling each other in form or pronunciation across languages that denote misleadingly divergent meanings.',
    style: 'bg-falsefriend-ink text-page-surface',
    macroCategory: 'false_friend',
  },
  cognate_false_friend: {
    key: 'cognate_false_friend',
    label: 'Cognate False Friend',
    tooltip: 'Cognate False Friend: Etymologically related words whose meanings have diverged so radically that treating them as equivalents causes semantic error.',
    style: 'bg-falsefriend-ink text-page-surface',
    macroCategory: 'false_friend',
  },
  accidental_lookalike: {
    key: 'accidental_lookalike',
    label: 'Accidental Lookalike',
    tooltip: 'Accidental Lookalike: Words that resemble each other purely by phonetic coincidence, with entirely unrelated etymological roots.',
    style: 'bg-falsefriend-ink text-page-surface',
    macroCategory: 'false_friend',
  },
  translation_pair: {
    key: 'translation_pair',
    label: 'Translation Equivalent',
    tooltip: 'Translation Equivalent: Functional translation counterparts denoting the same concept, but derived from distinct, unrelated lexical roots.',
    style: 'bg-divergent-ink text-page-surface',
    macroCategory: 'translation_pair',
  },
  unrelated_equivalent: {
    key: 'unrelated_equivalent',
    label: 'Translation Equivalent',
    tooltip: 'Translation Equivalent: Functional translation counterparts denoting the same concept, but derived from distinct, unrelated lexical roots.',
    style: 'bg-divergent-ink text-page-surface',
    macroCategory: 'translation_pair',
  },
  sister_loanword: {
    key: 'sister_loanword',
    label: 'Shared Loan Stratum',
    tooltip: 'Shared Loan Stratum: Words borrowed independently from a common third language (such as Latin, Old French, or Middle Low German).',
    style: 'bg-divergent-ink text-page-surface',
    macroCategory: 'translation_pair',
  },
  independent_root: {
    key: 'independent_root',
    label: 'Unrelated Lexicon',
    tooltip: 'Unrelated Lexicon: Morphologically and etymologically independent roots with no direct cognate or translation equivalence.',
    style: 'bg-ink-muted text-page-surface',
    macroCategory: 'other',
  },
  other: {
    key: 'other',
    label: 'Unrelated Lexicon',
    tooltip: 'Unrelated Lexicon: Morphologically and etymologically independent roots with no direct cognate or translation equivalence.',
    style: 'bg-ink-muted text-page-surface',
    macroCategory: 'other',
  },
};

export function getTaxonomyMeta(category?: string, etymologicalRelation?: string): TaxonomyCategoryMeta {
  const normalized = (category || 'other').toLowerCase();
  const base = TAXONOMY_DEFINITIONS[normalized] || TAXONOMY_DEFINITIONS.other;

  // Refine false friends if etymological relation provides deeper disambiguation
  if (normalized === 'false_friend' || normalized === 'cognate_false_friend' || normalized === 'accidental_lookalike') {
    if (etymologicalRelation === 'cognate' || normalized === 'cognate_false_friend') {
      return {
        ...TAXONOMY_DEFINITIONS.cognate_false_friend,
        label: 'Cognate False Friend',
      };
    }
    if (etymologicalRelation === 'false_cognate' || normalized === 'accidental_lookalike') {
      return {
        ...TAXONOMY_DEFINITIONS.accidental_lookalike,
        label: 'Accidental Lookalike',
      };
    }
  }

  return base;
}
