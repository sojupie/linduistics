/**
 * Lexicographical formatters for dictionary presentation.
 */

/**
 * Transforms verbose/raw part-of-speech strings into standard
 * 18th-century lexicographical abbreviations in Warbler Italic.
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

