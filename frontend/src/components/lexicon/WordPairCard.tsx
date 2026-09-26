import React from 'react';
import type { WordPair } from '../../types/linguistics';
import { LEXICON_CONFIG } from '../../constants/config';
import { Phonetic } from '../common/Phonetic';
import { formatPos } from '../../utils/formatters';
import { MaterialSymbol } from '../common/MaterialSymbol';

interface WordPairCardProps {
  pair: WordPair;
}

export const WordPairCard: React.FC<WordPairCardProps> = ({ pair }) => {
  const getBadgeStyle = () => {
    switch (pair.category) {
      case 'true_cognate':
        return 'text-cognate-ink bg-cognate-bg';
      case 'false_friend':
        return 'text-falsefriend-ink bg-falsefriend-bg';
      case 'partial_cognate':
        return 'text-shifted-ink bg-shifted-bg';
      case 'translation_pair':
        return 'text-divergent-ink bg-divergent-bg';
      default:
        return 'text-ink-muted bg-page-muted';
    }
  };

  const getCategoryLabel = () => {
    switch (pair.category) {
      case 'true_cognate':
        return 'True Cognate';
      case 'false_friend':
        return pair.falseFriendType === 'etymological_shift'
          ? 'False Friend · Shared Root'
          : pair.falseFriendType === 'surface_collision'
          ? 'False Friend · Accidental Lookalike'
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
          <span className="typo-headword-display text-ink-main">{pair.wordA}{formatPos(pair.posA) ? ',' : ''}</span>
          {formatPos(pair.posA) && (
            <span className="table-pos text-ink-muted">{formatPos(pair.posA)}</span>
          )}
          {pair.ipaA && <Phonetic ipa={pair.ipaA} className="table-ipa" />}

          <MaterialSymbol icon="arrow_forward" size={16} className="text-ink-light mx-1" />

          {/* Word B (Target) */}
          <span
            className={`typo-headword-display ${
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
            <span className="table-pos text-ink-muted">{formatPos(pair.posB)}</span>
          )}
          {pair.ipaB && <Phonetic ipa={pair.ipaB} className="table-ipa" />}
        </div>

        {/* Category tag */}
        <span
          className={`rounded px-2.5 py-0.5 typo-badge ${getBadgeStyle()}`}
        >
          {getCategoryLabel()}
        </span>
      </div>

      {/* Definitions layout */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-page-bg/70 p-4 rounded border border-book-rule">
          <span className="typo-sublabel block mb-1">Source definition:</span>
          <p className="typo-definition">{pair.defA}</p>
        </div>

        <div className="bg-page-bg/70 p-4 rounded border border-book-rule">
          <span className="typo-sublabel block mb-1">Target definition:</span>
          <p className="typo-definition">{pair.defB}</p>
        </div>
      </div>

      {/* Etymological historical note */}
      {pair.marginalia && (
        <p className="mt-4 border-l-2 border-book-rule-strong pl-4 typo-note">
          {pair.marginalia}
        </p>
      )}

      {/* Similarity percentages */}
      <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-book-rule pt-3 typo-sublabel font-serif">
        <span>
          Spelling similarity:{' '}
          <strong className="typo-metric font-normal">
            {(pair.orthographicSim * LEXICON_CONFIG.SIMILARITY_SCALE).toFixed(
              LEXICON_CONFIG.SIMILARITY_PRECISION,
            )}
            %
          </strong>
        </span>
        <span>
          Phonetic similarity:{' '}
          <strong className="typo-metric text-cognate-ink font-normal">
            {(pair.phoneticSim * LEXICON_CONFIG.SIMILARITY_SCALE).toFixed(
              LEXICON_CONFIG.SIMILARITY_PRECISION,
            )}
            %
          </strong>
        </span>
        <span>
          Meaning similarity:{' '}
          <strong
            className={`typo-metric font-normal ${
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
