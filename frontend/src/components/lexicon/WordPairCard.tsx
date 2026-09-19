import React from 'react';
import type { WordPair } from '../../types/linguistics';
import { LEXICON_CONFIG } from '../../constants/config';
import { Phonetic } from '../common/Phonetic';
import { formatPos } from '../../utils/formatters';

interface WordPairCardProps {
  pair: WordPair;
}

export const WordPairCard: React.FC<WordPairCardProps> = ({ pair }) => {
  const getBadgeStyle = () => {
    switch (pair.category) {
      case 'true_cognate':
        return 'text-cognate-ink bg-cognate-bg border-cognate-border';
      case 'false_friend':
        return 'text-falsefriend-ink bg-falsefriend-bg border-falsefriend-border';
      case 'partial_cognate':
        return 'text-shifted-ink bg-shifted-bg border-shifted-border';
      case 'translation_pair':
        return 'text-divergent-ink bg-divergent-bg border-divergent-border';
      default:
        return 'text-ink-muted bg-page-muted border-book-rule';
    }
  };

  const getCategoryLabel = () => {
    switch (pair.category) {
      case 'true_cognate':
        return 'True Cognate';
      case 'false_friend':
        return pair.falseFriendType === 'etymological_shift'
          ? 'False Friend · Drift'
          : pair.falseFriendType === 'surface_collision'
          ? 'False Friend · Clash'
          : 'False Friend';
      case 'partial_cognate':
        return 'Partial Cognate';
      case 'translation_pair':
        return 'Translation Pair';
      default:
        return 'Other';
    }
  };

  return (
    <article className="rounded border border-book-rule bg-page-surface p-6 font-serif shadow-2xs">
      {/* Top entry header */}
      <div className="flex flex-wrap items-baseline justify-between border-b border-book-rule pb-3 gap-2">
        <div className="flex flex-wrap items-baseline gap-3">
          {/* Word A (Source) */}
          <span className="text-2xl font-bold text-ink-main">{pair.wordA}{formatPos(pair.posA) ? ',' : ''}</span>
          {formatPos(pair.posA) && (
            <span className="table-pos text-base italic text-ink-muted">{formatPos(pair.posA)}</span>
          )}
          {pair.ipaA && <Phonetic ipa={pair.ipaA} className="table-ipa" />}

          <span className="text-ink-light mx-1">→</span>

          {/* Word B (Target) */}
          <span
            className={`text-2xl font-bold ${
              pair.category === 'false_friend'
                ? 'text-falsefriend-ink'
                : pair.category === 'true_cognate'
                ? 'text-cognate-ink'
                : 'text-ink-main'
            }`}
          >
            {pair.wordB}{formatPos(pair.posB) ? ',' : ''}
          </span>
          {formatPos(pair.posB) && (
            <span className="table-pos text-base italic text-ink-muted">{formatPos(pair.posB)}</span>
          )}
          {pair.ipaB && <Phonetic ipa={pair.ipaB} className="table-ipa" />}
        </div>

        {/* Category tag */}
        <span
          className={`rounded border px-2.5 py-0.5 text-sm font-medium ${getBadgeStyle()}`}
        >
          {getCategoryLabel()}
        </span>
      </div>

      {/* Definitions layout */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-base">
        <div className="bg-page-bg/70 p-4 rounded border border-book-rule">
          <span className="text-sm text-ink-muted block mb-1 font-sans">Source definition:</span>
          <p className="text-ink-main leading-relaxed">{pair.defA}</p>
        </div>

        <div className="bg-page-bg/70 p-4 rounded border border-book-rule">
          <span className="text-sm text-ink-muted block mb-1 font-sans">Target definition:</span>
          <p className="text-ink-main leading-relaxed">{pair.defB}</p>
        </div>
      </div>

      {/* Etymological historical note */}
      {pair.marginalia && (
        <p className="mt-4 border-l-2 border-book-rule-strong pl-4 text-base italic text-ink-muted leading-relaxed">
          {pair.marginalia}
        </p>
      )}

      {/* Similarity percentages */}
      <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-book-rule pt-3 text-sm text-ink-muted font-serif">
        <span>
          Spelling similarity:{' '}
          <strong className="font-mono text-ink-main font-normal">
            {(pair.orthographicSim * LEXICON_CONFIG.SIMILARITY_SCALE).toFixed(
              LEXICON_CONFIG.SIMILARITY_PRECISION,
            )}
            %
          </strong>
        </span>
        <span>
          Pronunciation similarity:{' '}
          <strong className="font-mono text-cognate-ink font-normal">
            {(pair.phoneticSim * LEXICON_CONFIG.SIMILARITY_SCALE).toFixed(
              LEXICON_CONFIG.SIMILARITY_PRECISION,
            )}
            %
          </strong>
        </span>
        <span>
          Meaning similarity:{' '}
          <strong
            className={`font-mono font-normal ${
              pair.semanticSim > 0.7
                ? 'text-cognate-ink'
                : pair.semanticSim < 0.3
                ? 'text-falsefriend-ink'
                : 'text-shifted-ink'
            }`}
          >
            {(pair.semanticSim * LEXICON_CONFIG.SIMILARITY_SCALE).toFixed(
              LEXICON_CONFIG.SIMILARITY_PRECISION,
            )}
            %
          </strong>
        </span>
      </div>
    </article>
  );
};

export type SpecimenCardProps = { specimen: WordPair };
export const SpecimenCard: React.FC<SpecimenCardProps> = ({ specimen }) => <WordPairCard pair={specimen} />;
