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
