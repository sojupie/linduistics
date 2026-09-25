import React from 'react';
import type { TokenAnalysis, AlternativeWord } from '../../types/linguistics';
import { X } from 'lucide-react';
import { LEXICON_CONFIG } from '../../constants/config';
import { Phonetic } from '../common/Phonetic';

interface TokenDetailDrawerProps {
  tokenAnalysis: TokenAnalysis | null;
  onClose: () => void;
  onSubstitute?: (token: TokenAnalysis, newForm: string) => void;
}

const formatDepContext = (depRel?: string, headText?: string): string | null => {
  if (!depRel) return null;
  const rel = depRel.toLowerCase();
  if (rel === 'root') return 'predicate';
  const roleName =
    rel === 'obj' ? 'direct object' :
    rel === 'iobj' ? 'indirect object' :
    rel === 'nsubj' || rel === 'nsubj:pass' ? 'subject' :
    rel === 'obl' ? 'adverbial' :
    rel === 'amod' ? 'adjectival modifier' :
    rel === 'advmod' ? 'adverbial modifier' :
    rel === 'case' ? 'preposition' :
    rel === 'det' ? 'determiner' :
    rel;

  return headText ? `${roleName} of “${headText}”` : roleName;
};

const formatMorph = (morph?: Record<string, string>): string | null => {
  if (!morph || Object.keys(morph).length === 0) return null;
  return Object.entries(morph).map(([k, v]) => `${k.toLowerCase()}: ${v.toLowerCase()}`).join(', ');
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
    <div className="space-y-6 font-serif select-text">
      {/* 1. Headword Plate */}
      <div className="border-b border-book-rule pb-4 space-y-1.5">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h2 className="typo-headword-display text-ink-main">
              {tokenAnalysis.token}{tokenAnalysis.pos ? ',' : ''}
            </h2>
            {tokenAnalysis.pos && (
              <span className="typo-pos">
                {tokenAnalysis.pos.toLowerCase()}
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
            <X size={16} />
          </button>
        </div>

        {/* Syntactic context & inflection features */}
        {(depContext || morphText) && (
          <div className="typo-sublabel flex items-baseline gap-2 flex-wrap pt-0.5">
            {depContext && <span>{depContext}</span>}
            {depContext && morphText && <span className="text-book-rule-strong">•</span>}
            {morphText && <span className="font-mono text-ink-light">{morphText}</span>}
          </div>
        )}
      </div>

      {/* 2. Attested Lexical Alternates */}
      {alternatives.length > 0 && (
        <div className="space-y-2">
          <div className="typo-section-header border-b border-book-rule pb-1.5 flex items-center justify-between">
            <span>Attested Alternates</span>
            <span className="typo-metric-table text-ink-muted">{alternatives.length}</span>
          </div>

          <div className="divide-y divide-book-rule/50">
            {alternatives.map((alt: AlternativeWord, idx: number) => {
              const isSameForm = alt.form.toLowerCase() === tokenAnalysis.token.toLowerCase();
              const matchEntries = Object.entries(alt.cognate_matches);

              return (
                <div
                  key={idx}
                  className="py-2.5 flex items-baseline justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="typo-headword-row text-ink-main">
                        {alt.form}
                      </span>
                      {alt.lemma !== alt.form && (
                        <span className="typo-note text-ink-muted">
                          ({alt.lemma})
                        </span>
                      )}
                      <span className="typo-metric-table text-ink-muted">
                        {matchEntries.length} {matchEntries.length === 1 ? 'target' : 'targets'}
                      </span>
                      {typeof alt.sentence_delta === 'number' && alt.sentence_delta !== 0 ? (
                        <span
                          className={`typo-metric-table ${
                            alt.sentence_delta > 0 ? 'text-cognate-ink' : 'text-shifted-ink'
                          }`}
                          title={`Sentence impact: ${alt.sentence_delta > 0 ? '+' : ''}${alt.sentence_delta}% (Token cognacy: ${Math.round(alt.universality_score)}%, ${alt.universality_delta > 0 ? '+' : ''}${Math.round(alt.universality_delta)}%)`}
                        >
                          {alt.sentence_delta > 0 ? `+${alt.sentence_delta}% sent` : `${alt.sentence_delta}% sent`}
                        </span>
                      ) : typeof alt.universality_delta === 'number' && alt.universality_delta !== 0 ? (
                        <span
                          className={`typo-metric-table ${
                            alt.universality_delta > 0 ? 'text-cognate-ink' : 'text-shifted-ink'
                          }`}
                          title={`Universality: ${Math.round(alt.universality_score)}% (${alt.universality_delta > 0 ? '+' : ''}${Math.round(alt.universality_delta)}% relative to current word)`}
                        >
                          {alt.universality_delta > 0 ? `+${Math.round(alt.universality_delta)}%` : `${Math.round(alt.universality_delta)}%`}
                        </span>
                      ) : null}
                      {typeof alt.context_fit === 'number' && (
                        <span
                          className="typo-metric-table text-ink-muted"
                          title={`Contextual semantic fit: ${Math.round(alt.context_fit * 100)}% based on cross-lingual MiniLM alignment`}
                        >
                          {Math.round(alt.context_fit * 100)}% fit
                        </span>
                      )}
                    </div>

                    {matchEntries.length > 0 && (
                      <div className="typo-sublabel flex items-baseline gap-2 flex-wrap pt-0.5">
                        {matchEntries.map(([lang, m]) => (
                          <span key={lang}>
                            <span className="font-mono uppercase text-ink-light mr-1">{lang}:</span>
                            <span className="text-ink-main">{m.word}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {onSubstitute && !isSameForm && (
                    <button
                      type="button"
                      onClick={() => onSubstitute(tokenAnalysis, alt.form)}
                      className="typo-sublabel text-cognate-ink hover:text-ink-main underline transition-colors cursor-pointer shrink-0"
                    >
                      Use alternate →
                    </button>
                  )}
                  {isSameForm && (
                    <span className="typo-note text-ink-muted shrink-0">
                      current form
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Cross-Lingual Correspondences */}
      <div className="space-y-2">
        <div className="typo-section-header border-b border-book-rule pb-1.5 flex items-center justify-between">
          <span>Cross-Lingual Correspondences</span>
          <span className="typo-metric-table text-ink-muted">{matches.length}</span>
        </div>

        <div className="divide-y divide-book-rule/50">
          {matches.map(([lang, match]) => {
            const isCognate = match.category === 'true_cognate' || match.category === 'cognate';
            const isPartial = match.category === 'partial_cognate' || match.category === 'cousin';
            const isTranslation = match.category === 'translation_pair';

            const categoryText = isCognate
              ? 'True Cognate'
              : isPartial
              ? 'Partial Cognate'
              : isTranslation
              ? 'Translation Pair'
              : 'Other';

            const categoryBg = isCognate
              ? 'text-cognate-ink bg-cognate-bg/60 border-cognate-border/70'
              : isPartial
              ? 'text-shifted-ink bg-shifted-bg/60 border-shifted-border/70'
              : isTranslation
              ? 'text-divergent-ink bg-divergent-bg/60 border-divergent-border/70'
              : 'text-ink-muted bg-page-muted/60 border-book-rule';

            return (
              <div key={lang} className="py-2.5 space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="typo-lang-code w-8 shrink-0 text-center">
                      {lang.toUpperCase()}
                    </span>
                    <span className="typo-headword-row text-ink-main">
                      {match.word}
                    </span>
                    {match.ipa && <Phonetic ipa={match.ipa} className="table-ipa" />}
                  </div>
                  <span className={`typo-badge ${categoryBg} border rounded px-2 py-0.5 shrink-0`}>
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
                    sem: {(match.semantic_sim * LEXICON_CONFIG.SIMILARITY_SCALE).toFixed(0)}%
                  </span>
                  <span>
                    phon: {(match.phonetic_sim * LEXICON_CONFIG.SIMILARITY_SCALE).toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
