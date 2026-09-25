import React from 'react';
import type { TokenAnalysis, AlternativeWord } from '../../types/linguistics';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { LEXICON_CONFIG } from '../../constants/config';
import { Phonetic } from '../common/Phonetic';
import { getLanguageName } from '../../data/languages';

interface TokenDetailDrawerProps {
  tokenAnalysis: TokenAnalysis | null;
  onClose: () => void;
  onSubstitute?: (token: TokenAnalysis, newForm: string) => void;
}

const POS_FULL_MAP: Record<string, string> = {
  adj: 'adjective',
  adp: 'preposition',
  adv: 'adverb',
  aux: 'auxiliary verb',
  cconj: 'coordinating conjunction',
  det: 'determiner',
  intj: 'interjection',
  noun: 'noun',
  num: 'numeral',
  part: 'particle',
  pron: 'pronoun',
  propn: 'proper noun',
  punct: 'punctuation',
  sconj: 'subordinating conjunction',
  sym: 'symbol',
  verb: 'verb',
  x: 'other',
};

const formatPosFull = (pos?: string): string | null => {
  if (!pos) return null;
  const p = pos.toLowerCase();
  return POS_FULL_MAP[p] ?? p;
};

const DEP_REL_MAP: Record<string, string> = {
  root: 'predicate',
  obj: 'direct object',
  iobj: 'indirect object',
  nsubj: 'subject',
  'nsubj:pass': 'passive subject',
  csubj: 'clausal subject',
  'csubj:pass': 'passive clausal subject',
  obl: 'adverbial',
  'obl:agent': 'agent',
  amod: 'adjectival modifier',
  advmod: 'adverbial modifier',
  case: 'preposition',
  det: 'determiner',
  conj: 'conjunct',
  cc: 'coordinating conjunction',
  cop: 'copula',
  aux: 'auxiliary',
  'aux:pass': 'passive auxiliary',
  mark: 'marker',
  compound: 'compound',
  'compound:prt': 'particle',
  flat: 'name component',
  nummod: 'numeric modifier',
  appos: 'appositive',
  nmod: 'nominal modifier',
  'nmod:poss': 'possessive modifier',
  acl: 'clausal modifier',
  'acl:relcl': 'relative clause',
  advcl: 'adverbial clause',
  xcomp: 'clausal complement',
  ccomp: 'clausal complement',
  vocative: 'vocative',
  discourse: 'discourse element',
  punct: 'punctuation',
  fixed: 'fixed expression',
  list: 'list item',
  parataxis: 'parataxis',
  orphan: 'orphan',
  goeswith: 'word fragment',
  reparandum: 'speech repair',
  dep: 'dependent',
};

const formatDepContext = (depRel?: string, headText?: string): string | null => {
  if (!depRel) return null;
  const rel = depRel.toLowerCase();
  const roleName = DEP_REL_MAP[rel] ?? rel;
  return headText ? `${roleName} of “${headText}”` : roleName;
};

const MORPH_KEY_EXPANSIONS: Record<string, string> = {
  case: 'case',
  definite: 'definite',
  gender: 'gender',
  number: 'number',
  tense: 'tense',
  verbform: 'verb form',
  mood: 'mood',
  person: 'person',
  degree: 'degree',
  voice: 'voice',
  aspect: 'aspect',
  prontype: 'pronoun type',
  numtype: 'numeral type',
  poss: 'possessive',
  reflex: 'reflexive',
  polarity: 'polarity',
  abbr: 'abbreviation',
  foreign: 'foreign',
};

const MORPH_VALUE_EXPANSIONS: Record<string, Record<string, string>> = {
  case: {
    nom: 'nominative',
    acc: 'accusative',
    dat: 'dative',
    gen: 'genitive',
    ins: 'instrumental',
    loc: 'locative',
    voc: 'vocative',
    abl: 'ablative',
  },
  definite: {
    def: 'definite',
    ind: 'indefinite',
    spec: 'specific',
    cons: 'construct',
  },
  gender: {
    com: 'common',
    masc: 'masculine',
    fem: 'feminine',
    neut: 'neuter',
  },
  number: {
    sing: 'singular',
    plur: 'plural',
    dual: 'dual',
    pauc: 'paucal',
  },
  tense: {
    pres: 'present',
    past: 'past',
    fut: 'future',
    imp: 'imperfect',
    pqp: 'pluperfect',
  },
  verbform: {
    fin: 'finite',
    inf: 'infinitive',
    part: 'participle',
    sup: 'supine',
    ger: 'gerund',
    conv: 'converb',
  },
  mood: {
    ind: 'indicative',
    sub: 'subjunctive',
    imp: 'imperative',
    cnd: 'conditional',
    pot: 'potential',
    opt: 'optative',
  },
  person: {
    '1': 'first person',
    '2': 'second person',
    '3': 'third person',
    '0': 'impersonal',
  },
  degree: {
    pos: 'positive',
    cmp: 'comparative',
    comp: 'comparative',
    sup: 'superlative',
    abs: 'absolute superlative',
  },
  voice: {
    act: 'active',
    pass: 'passive',
    mid: 'middle',
    rcp: 'reciprocal',
    cau: 'causative',
  },
  aspect: {
    imp: 'imperfective',
    perf: 'perfective',
    iter: 'iterative',
  },
  prontype: {
    prs: 'personal',
    dem: 'demonstrative',
    rel: 'relative',
    int: 'interrogative',
    ind: 'indefinite',
    tot: 'total',
    neg: 'negative',
    art: 'article',
    emp: 'emphatic',
    exc: 'exclamative',
  },
  numtype: {
    card: 'cardinal',
    ord: 'ordinal',
    mult: 'multiplicative',
    frac: 'fraction',
  },
  polarity: {
    pos: 'positive',
    neg: 'negative',
  },
};

const GENERIC_VALUE_EXPANSIONS: Record<string, string> = {
  nom: 'nominative',
  acc: 'accusative',
  dat: 'dative',
  gen: 'genitive',
  def: 'definite',
  ind: 'indefinite',
  com: 'common',
  masc: 'masculine',
  fem: 'feminine',
  neut: 'neuter',
  sing: 'singular',
  plur: 'plural',
  pres: 'present',
  past: 'past',
  fin: 'finite',
  inf: 'infinitive',
  part: 'participle',
  sup: 'supine',
  act: 'active',
  pass: 'passive',
  pos: 'positive',
  cmp: 'comparative',
  comp: 'comparative',
};

const formatMorph = (morph?: Record<string, string>): string | null => {
  if (!morph || Object.keys(morph).length === 0) return null;
  return Object.entries(morph)
    .map(([rawKey, rawVal]) => {
      const keyLower = rawKey.toLowerCase();
      const valLower = rawVal.toLowerCase();
      const expandedKey = MORPH_KEY_EXPANSIONS[keyLower] ?? keyLower;
      const expandedVal =
        MORPH_VALUE_EXPANSIONS[keyLower]?.[valLower] ??
        GENERIC_VALUE_EXPANSIONS[valLower] ??
        valLower;
      return `${expandedKey}: ${expandedVal}`;
    })
    .join(', ');
};

export const TokenDetailDrawer: React.FC<TokenDetailDrawerProps> = ({
  tokenAnalysis,
  onClose,
  onSubstitute,
}) => {
  if (!tokenAnalysis) return null;

  const matches = Object.entries(tokenAnalysis.matches);
  const alternatives = tokenAnalysis.alternatives ?? [];
  const depContext = formatDepContext(tokenAnalysis.dep_rel, tokenAnalysis.head_text);
  const morphText = formatMorph(tokenAnalysis.morph);

  return (
    <div className="h-full flex flex-col min-h-0 font-serif select-text gap-4">
      {/* 1. Headword Plate */}
      <div className="border-b border-book-rule pb-3.5 space-y-1.5 shrink-0">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h2 className="typo-headword-display text-ink-main">
              {tokenAnalysis.token}{tokenAnalysis.pos ? ',' : ''}
            </h2>
            {tokenAnalysis.pos && (
              <span className="typo-pos">
                {formatPosFull(tokenAnalysis.pos)}
              </span>
            )}
            {tokenAnalysis.lemma && tokenAnalysis.lemma !== tokenAnalysis.token.toLowerCase() && (
              <span className="typo-note text-ink-muted">
                (lemma: <span className="text-ink-main not-italic font-deck">{tokenAnalysis.lemma}</span>)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink-main transition-colors cursor-pointer p-1"
            title="Close"
          >
            <MaterialSymbol icon="close" size={18} />
          </button>
        </div>

        {/* Syntactic context & inflection features */}
        {(depContext || morphText) && (
          <div className="typo-sublabel flex items-baseline gap-2 flex-wrap pt-0.5">
            {depContext && <span>{depContext}</span>}
            {depContext && morphText && <span className="text-book-rule-strong">•</span>}
            {morphText && <span className="text-ink-muted">{morphText}</span>}
          </div>
        )}
      </div>

      {/* 2. Attested Lexical Alternates */}
      {alternatives.length > 0 && (
        <div className="flex-1 min-h-0 flex flex-col space-y-2">
          <div className="typo-section-header border-b border-book-rule pb-1.5 flex items-center justify-between shrink-0">
            <span>Attested Alternates</span>
            <span className="typo-metric-table text-ink-muted">{alternatives.length}</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 space-y-2.5">
            {alternatives.map((alt: AlternativeWord, idx: number) => {
              const isSameForm = alt.form.toLowerCase() === tokenAnalysis.token.toLowerCase();
              const matchEntries = Object.entries(alt.cognate_matches);

              return (
                <div
                  key={idx}
                  className={`p-3 rounded border transition-colors space-y-2 ${isSameForm
                    ? 'border-book-rule bg-page-muted/40'
                    : 'border-book-rule bg-page-surface hover:border-book-rule-strong'
                    }`}
                >
                  {/* Top row: Alternate headword, lemma tag, and action button */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
                      <span className="typo-headword-row font-medium text-ink-main">
                        {alt.form}
                      </span>
                      {alt.lemma !== alt.form && (
                        <span className="typo-note text-ink-muted italic">
                          (lemma: {alt.lemma})
                        </span>
                      )}
                      {isSameForm && (
                        <span className="px-1.5 py-0.5 typo-subscript font-mono rounded bg-page-muted text-ink-muted">
                          current
                        </span>
                      )}
                    </div>

                    {onSubstitute && !isSameForm && (
                      <button
                        type="button"
                        onClick={() => onSubstitute(tokenAnalysis, alt.form)}
                        className="px-2.5 py-0.5 typo-sublabel font-medium text-cognate-ink hover:text-ink-main border border-cognate-border hover:border-book-rule-strong bg-page-surface rounded-xs transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1"
                      >
                        <span>Use alternate</span>
                        <MaterialSymbol icon="swap_horiz" size={15} />
                      </button>
                    )}
                  </div>

                  {/* Middle row: Structured, readable metrics */}
                  <div className="flex items-center gap-2.5 typo-sublabel text-ink-muted flex-wrap">
                    {typeof alt.sentence_delta === 'number' && alt.sentence_delta !== 0 ? (
                      <span
                        className={`font-medium ${alt.sentence_delta > 0 ? 'text-cognate-ink' : 'text-shifted-ink'
                          }`}
                        title={`Sentence impact: ${alt.sentence_delta > 0 ? '+' : ''}${alt.sentence_delta}% overall cognacy change`}
                      >
                        {alt.sentence_delta > 0 ? `+${alt.sentence_delta}%` : `${alt.sentence_delta}%`} sentence cognacy
                      </span>
                    ) : typeof alt.universality_delta === 'number' && alt.universality_delta !== 0 ? (
                      <span
                        className={`font-medium ${alt.universality_delta > 0 ? 'text-cognate-ink' : 'text-shifted-ink'
                          }`}
                        title={`Word universality: ${Math.round(alt.universality_score)}%`}
                      >
                        {alt.universality_delta > 0 ? `+${Math.round(alt.universality_delta)}%` : `${Math.round(alt.universality_delta)}%`} word cognacy
                      </span>
                    ) : null}

                    <span className="text-book-rule-strong select-none">•</span>

                    <span>
                      {matchEntries.length} {matchEntries.length === 1 ? 'target' : 'targets'} attested
                    </span>

                    {typeof alt.context_fit === 'number' && (
                      <>
                        <span className="text-book-rule-strong select-none">•</span>
                        <span title="Contextual semantic fit based on sentence context">
                          {Math.round(alt.context_fit * 100)}% context fit
                        </span>
                      </>
                    )}
                  </div>

                  {/* Bottom row: Target Language Correspondences with full name hover tooltips */}
                  {matchEntries.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-book-rule/40">
                      {matchEntries.map(([lang, m]) => (
                        <span
                          key={lang}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-book-rule bg-page-bg typo-sublabel"
                        >
                          <span
                            className="font-mono text-xs uppercase font-medium text-ink-muted cursor-help"
                            title={getLanguageName(lang)}
                          >
                            {lang.toUpperCase()}:
                          </span>
                          <span className="font-serif text-ink-main">{m.word}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Cross-Lingual Correspondences */}
      <div className={`space-y-2 ${matches.length > 0 ? 'flex-1 min-h-0 flex flex-col' : 'shrink-0'}`}>
        <div className="typo-section-header border-b border-book-rule pb-1.5 flex items-center justify-between shrink-0">
          <span>Cross-Lingual Correspondences</span>
          <span className="typo-metric-table text-ink-muted">{matches.length}</span>
        </div>

        {matches.length > 0 ? (
          <div className="divide-y divide-book-rule/50 flex-1 min-h-0 overflow-y-auto pr-1.5">
          {matches.map(([lang, match]) => {
            const isCognate = match.category === 'true_cognate' || match.category === 'cognate';
            const isPartial = match.category === 'partial_cognate' || match.category === 'cousin';
            const isFalseFriend = match.category === 'false_friend';
            const isTranslation = match.category === 'translation_pair';

            const categoryText = isCognate
              ? 'True Cognate'
              : isPartial
                ? 'Partial Cognate'
                : isFalseFriend
                  ? 'False Friend'
                  : isTranslation
                    ? 'Translation Pair'
                    : 'Other';

            const categoryStyle = isCognate
              ? 'text-cognate-ink bg-cognate-bg'
              : isPartial
                ? 'text-shifted-ink bg-shifted-bg'
                : isFalseFriend
                  ? 'text-falsefriend-ink bg-falsefriend-bg'
                  : isTranslation
                    ? 'text-divergent-ink bg-divergent-bg'
                    : 'text-ink-muted bg-page-muted';

            return (
              <div key={lang} className="py-2.5 space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span
                      className="typo-lang-code w-8 shrink-0 text-center cursor-help"
                      title={getLanguageName(lang)}
                    >
                      {lang.toUpperCase()}
                    </span>
                    <span className="typo-headword-row text-ink-main">
                      {match.word}
                    </span>
                    {match.ipa && <Phonetic ipa={match.ipa} className="table-ipa" />}
                  </div>
                  <span className={`typo-badge px-2 py-0.5 rounded ${categoryStyle} shrink-0`}>
                    {categoryText}
                  </span>
                </div>

                {match.def && (
                  <p className="typo-note pl-10.5">
                    “{match.def}”
                  </p>
                )}

                <div className="typo-metric-table text-ink-light pl-10.5 flex gap-4">
                  <span>
                    semantic: {(match.semantic_sim * LEXICON_CONFIG.SIMILARITY_SCALE).toFixed(0)}%
                  </span>
                  <span>
                    phonetic: {(match.phonetic_sim * LEXICON_CONFIG.SIMILARITY_SCALE).toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        ) : (
          <p className="typo-note text-ink-muted py-2">
            No cross-lingual correspondences recorded for selected targets.
          </p>
        )}
      </div>
    </div>
  );
};
