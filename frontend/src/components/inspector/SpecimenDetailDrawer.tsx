import React from 'react';
import type { TokenAnalysis } from '../../types/linguistics';
import { X } from 'lucide-react';
import { HEADER_CONFIG, SPECIMEN_CONFIG } from '../../constants/config';

interface SpecimenDetailDrawerProps {
  tokenAnalysis: TokenAnalysis | null;
  onClose: () => void;
}

export const SpecimenDetailDrawer: React.FC<SpecimenDetailDrawerProps> = ({
  tokenAnalysis,
  onClose,
}) => {
  if (!tokenAnalysis) return null;

  const matches = Object.entries(tokenAnalysis.matches);

  const getStatusLabel = () => {
    switch (tokenAnalysis.status) {
      case 'universal':
        return 'Shared across Germanic languages';
      case 'branch_specific':
        return 'Branch specific';
      default:
        return 'Isolated word';
    }
  };

  return (
    <div className="rounded border border-book-rule bg-page-surface p-6 font-serif shadow-xs">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-book-rule pb-4">
        <div>
          <span className="text-sm text-ink-muted block">{getStatusLabel()}</span>
          <h3 className="mt-1 text-2xl font-bold text-ink-main">
            {tokenAnalysis.token}
          </h3>
          {tokenAnalysis.lemma && (
            <p className="mt-1 text-base text-shifted-ink">
              Base dictionary lemma: <strong className="text-ink-main">{tokenAnalysis.lemma}</strong>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-ink-muted hover:text-ink-main"
        >
          <X size={HEADER_CONFIG.ICON_SIZE_CLEAR} />
        </button>
      </div>

      {/* Target language matches */}
      <div className="mt-6">
        <h4 className="text-base font-bold text-ink-main">
          Corresponding words ({matches.length})
        </h4>

        {matches.length === 0 && (
          <p className="mt-3 text-base italic text-ink-muted">
            No direct cognates cataloged for this word in the selected languages.
          </p>
        )}

        <div className="mt-4 space-y-4">
          {matches.map(([lang, match]) => (
            <div
              key={lang}
              className="rounded border border-book-rule bg-page-bg p-4 text-base"
            >
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-ink-muted uppercase">
                    {lang}:
                  </span>
                  <span className="font-bold text-ink-main text-lg">{match.word}</span>
                  {match.ipa && (
                    <span className="font-mono text-sm text-ink-muted">/{match.ipa}/</span>
                  )}
                </div>
                <span className="text-sm text-ink-muted">
                  {match.category === 'cognate' || match.category === 'true_cognate'
                    ? 'Cognate'
                    : match.category === 'false_friend'
                    ? 'False friend'
                    : 'Related'}
                </span>
              </div>

              {match.def && (
                <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                  {match.def}
                </p>
              )}

              <div className="mt-3 flex items-center gap-6 text-sm text-ink-muted border-t border-book-rule pt-2">
                <span>
                  Meaning similarity:{' '}
                  <strong className="font-mono text-ink-main">
                    {(match.semantic_sim * SPECIMEN_CONFIG.SIMILARITY_SCALE).toFixed(
                      SPECIMEN_CONFIG.SIMILARITY_PRECISION,
                    )}%
                  </strong>
                </span>
                <span>
                  Sound similarity:{' '}
                  <strong className="font-mono text-cognate-ink">
                    {(match.phonetic_sim * SPECIMEN_CONFIG.SIMILARITY_SCALE).toFixed(
                      SPECIMEN_CONFIG.SIMILARITY_PRECISION,
                    )}%
                  </strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
