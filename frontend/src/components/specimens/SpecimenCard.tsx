import React from 'react';
import type { SpecimenPair } from '../../types/linguistics';
import { SPECIMEN_CONFIG } from '../../constants/config';
import { Phonetic } from '../common/Phonetic';
import { formatPos } from '../../utils/formatters';

interface SpecimenCardProps {
  specimen: SpecimenPair;
}

export const SpecimenCard: React.FC<SpecimenCardProps> = ({ specimen }) => {
  const getBadgeStyle = () => {
    switch (specimen.category) {
      case 'cognate':
        return 'text-cognate-ink bg-cognate-bg border-cognate-border';
      case 'minefield':
        return 'text-falsefriend-ink bg-falsefriend-bg border-falsefriend-border';
      case 'cousin':
        return 'text-shifted-ink bg-shifted-bg border-shifted-border';
      case 'schism':
        return 'text-divergent-ink bg-divergent-bg border-divergent-border';
      default:
        return 'text-ink-muted bg-page-muted border-book-rule';
    }
  };

  const getCategoryLabel = () => {
    switch (specimen.category) {
      case 'cognate':
        return 'Cognate';
      case 'minefield':
        return 'False friend';
      case 'cousin':
        return 'Sound shift';
      case 'schism':
        return 'Different word';
      default:
        return 'Word pair';
    }
  };

  return (
    <article className="rounded border border-book-rule bg-page-surface p-6 font-serif shadow-2xs">
      {/* Top entry header */}
      <div className="flex flex-wrap items-baseline justify-between border-b border-book-rule pb-3 gap-2">
        <div className="flex flex-wrap items-baseline gap-3">
          {/* Word A (Swedish) */}
          <span className="text-2xl font-bold text-ink-main">{specimen.wordA}{formatPos(specimen.posA) ? ',' : ''}</span>
          {formatPos(specimen.posA) && (
            <span className="table-pos text-base italic text-ink-muted">{formatPos(specimen.posA)}</span>
          )}
          {specimen.ipaA && <Phonetic ipa={specimen.ipaA} className="table-ipa" />}

          <span className="text-ink-light mx-1">→</span>

          {/* Word B (Target) */}
          <span
            className={`text-2xl font-bold ${
              specimen.category === 'minefield'
                ? 'text-falsefriend-ink'
                : specimen.category === 'cognate'
                ? 'text-cognate-ink'
                : 'text-ink-main'
            }`}
          >
            {specimen.wordB}{formatPos(specimen.posB) ? ',' : ''}
          </span>
          {formatPos(specimen.posB) && (
            <span className="table-pos text-base italic text-ink-muted">{formatPos(specimen.posB)}</span>
          )}
          {specimen.ipaB && <Phonetic ipa={specimen.ipaB} className="table-ipa" />}
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
          <span className="text-sm text-ink-muted block mb-1 font-sans">Swedish:</span>
          <p className="text-ink-main leading-relaxed">{specimen.defA}</p>
        </div>

        <div className="bg-page-bg/70 p-4 rounded border border-book-rule">
          <span className="text-sm text-ink-muted block mb-1 font-sans">Target language:</span>
          <p className="text-ink-main leading-relaxed">{specimen.defB}</p>
        </div>
      </div>

      {/* Etymological historical note */}
      {specimen.marginalia && (
        <p className="mt-4 border-l-2 border-book-rule-strong pl-4 text-base italic text-ink-muted leading-relaxed">
          {specimen.marginalia}
        </p>
      )}

      {/* Similarity percentages */}
      <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-book-rule pt-3 text-sm text-ink-muted font-serif">
        <span>
          Spelling similarity:{' '}
          <strong className="font-mono text-ink-main font-normal">
            {(specimen.orthographicSim * SPECIMEN_CONFIG.SIMILARITY_SCALE).toFixed(
              SPECIMEN_CONFIG.SIMILARITY_PRECISION,
            )}
            %
          </strong>
        </span>
        <span>
          Pronunciation similarity:{' '}
          <strong className="font-mono text-cognate-ink font-normal">
            {(specimen.phoneticSim * SPECIMEN_CONFIG.SIMILARITY_SCALE).toFixed(
              SPECIMEN_CONFIG.SIMILARITY_PRECISION,
            )}
            %
          </strong>
        </span>
        <span>
          Meaning similarity:{' '}
          <strong
            className={`font-mono font-normal ${
              specimen.semanticSim > 0.7
                ? 'text-cognate-ink'
                : specimen.semanticSim < 0.3
                ? 'text-falsefriend-ink'
                : 'text-shifted-ink'
            }`}
          >
            {(specimen.semanticSim * SPECIMEN_CONFIG.SIMILARITY_SCALE).toFixed(
              SPECIMEN_CONFIG.SIMILARITY_PRECISION,
            )}
            %
          </strong>
        </span>
      </div>
    </article>
  );
};
