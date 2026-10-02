/**
 * Lexicographical formatters for dictionary presentation.
 */

/**
 * Full display names for raw POS values present in the dataset.
 * Maps every raw POS string (from pos_a / pos_b columns) to its
 * unabbreviated English name suitable for filter labels and treemap tiles.
 */
export const POS_FULL_NAMES: Record<string, string> = {
  noun: 'Noun',
  adj: 'Adjective',
  adjective: 'Adjective',
  verb: 'Verb',
  name: 'Proper noun',
  adv: 'Adverb',
  adverb: 'Adverb',
  prep: 'Preposition',
  preposition: 'Preposition',
  pron: 'Pronoun',
  pronoun: 'Pronoun',
  intj: 'Interjection',
  interjection: 'Interjection',
  num: 'Numeral',
  numeral: 'Numeral',
  conj: 'Conjunction',
  conjunction: 'Conjunction',
  det: 'Determiner',
  article: 'Article',
  contraction: 'Contraction',
  particle: 'Particle',
  phrase: 'Phrase',
  postp: 'Postposition',
  punct: 'Punctuation',
};

/**
 * Returns the full unabbreviated display name for a raw POS string.
 * Falls back to a capitalised version of the raw value if unknown.
 */
export function getPosFullName(pos?: string | null): string {
  if (!pos) return '';
  const clean = pos.trim().toLowerCase();
  return POS_FULL_NAMES[clean] ?? (clean.charAt(0).toUpperCase() + clean.slice(1));
}

/**
 * Transforms verbose/raw part-of-speech strings into standard
 * 18th-century lexicographical abbreviations.
 * e.g., 'noun' -> 'n.', 'verb' -> 'v.', 'adjective' -> 'adj.'
 */
export function formatPos(pos?: string | null): string | null {
  if (!pos) return null;
  const clean = pos.trim().toLowerCase().replace(/^\[+|\]+$/g, '');
  const map: Record<string, string> = {
    noun: 'n.',
    n: 'n.',
    verb: 'v.',
    v: 'v.',
    adjective: 'adj.',
    adj: 'adj.',
    adverb: 'adv.',
    adv: 'adv.',
    preposition: 'prep.',
    prep: 'prep.',
    conjunction: 'conj.',
    conj: 'conj.',
    pronoun: 'pron.',
    pron: 'pron.',
    numeral: 'num.',
    num: 'num.',
    interjection: 'interj.',
    int: 'interj.',
    article: 'art.',
    art: 'art.',
    participle: 'part.',
    ptcp: 'part.',
    proper_noun: 'prop. n.',
  };
  return map[clean] || (clean.endsWith('.') ? clean : `${clean}.`);
}

/**
 * Parses raw ancestral roots into clean lemma and language components.
 * e.g., "Proto-Germanic *setą" -> { lemma: "*setą", language: "Proto-Germanic" }
 *       "Old Norse upp" -> { lemma: "upp", language: "Old Norse" }
 *       "*setą" -> { lemma: "*setą", language: fallbackProto || "Proto-Germanic" }
 */
export function parseEtymRoot(
  rawRoot?: string | null,
  fallbackProto?: string | null,
): { lemma: string; language: string } {
  if (!rawRoot || !rawRoot.trim()) {
    return { lemma: '', language: fallbackProto?.trim() || '' };
  }
  const str = rawRoot.trim();
  const match = str.match(
    /^((?:Proto-[A-Za-z-]+|Old\s+[A-Za-z]+|Middle\s+[A-Za-z]+|PIE|PGmc|Latin|Ancient Greek|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*))\s+(\*?.*)$/,
  );
  if (match) {
    const language = match[1].trim();
    let lemma = match[2].trim();
    if (
      !lemma.startsWith('*') &&
      (/proto/i.test(language) || language === 'PIE' || language === 'PGmc')
    ) {
      lemma = `*${lemma}`;
    }
    return { lemma, language };
  }

  let lemma = str;
  const language = fallbackProto?.trim() || '';
  if (
    !lemma.startsWith('*') &&
    (/proto/i.test(language) || language === 'PIE' || language === 'PGmc')
  ) {
    lemma = `*${lemma}`;
  }
  return { lemma, language };
}

