import React from 'react';
import type { TokenAnalysis } from '../../types/linguistics';
import { X, BookMarked } from 'lucide-react';
import { TOOLBAR_CONFIG, SPECIMEN_CONFIG } from '../../constants/config';

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

  return (
    <div className="rounded border border-border-hairline bg-substrate-panel p-5 font-serif shadow-xl">
      {/* Header with Token & Resolved Lemma */}
      <div className="flex items-center justify-between border-b border-border-hairline pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-specimen-moss">
              Specimen Token Analysis
            </span>
            <span className="rounded border border-border-hairline bg-substrate-dark px-1.5 py-0.2 font-mono text-[9px] uppercase text-ink-muted">
              {tokenAnalysis.status}
            </span>
          </div>
          <h3 className="mt-1 font-serif text-2xl font-bold text-ink-carbon">
            {tokenAnalysis.token}
          </h3>
          {tokenAnalysis.lemma && (
            <p className="mt-0.5 font-mono text-xs text-specimen-ochre">
              Lemma Resolved: <strong className="text-ink-carbon">{tokenAnalysis.lemma}</strong>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-ink-muted hover:bg-substrate-dark hover:text-ink-carbon"
        >
          <X size={TOOLBAR_CONFIG.ICON_SIZE_MD} />
        </button>
      </div>

      {/* Cross-Lingual Cognate Matches */}
      <div className="mt-4">
        <h4 className="font-mono text-[10px] uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
          <BookMarked size={TOOLBAR_CONFIG.ICON_SIZE_SM} className="text-specimen-moss" />
          Target Germanic Correlates ({matches.length})
        </h4>

        {matches.length === 0 && (
          <p className="mt-3 font-serif text-xs italic text-ink-muted">
            No cognate correspondences cataloged for this token across selected targets.
          </p>
        )}

        <div className="mt-3 space-y-2.5">
          {matches.map(([lang, match]) => (
            <div
              key={lang}
              className="rounded border border-border-hairline/60 bg-substrate-dark/80 p-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-border-hairline px-1.5 py-0.5 font-mono text-[9px] uppercase text-ink-muted">
                    {lang}
                  </span>
                  <span className="font-bold text-ink-carbon text-sm">{match.word}</span>
                  {match.ipa && (
                    <span className="font-mono text-[10px] text-ink-muted">{match.ipa}</span>
                  )}
                </div>
                <span
                  className={`rounded px-1.5 py-0.2 font-mono text-[9px] uppercase ${
                    match.category === 'cognate'
                      ? 'bg-specimen-moss/15 text-specimen-moss'
                      : match.category === 'false_friend'
                      ? 'bg-specimen-oxblood/15 text-specimen-oxblood'
                      : 'bg-specimen-ochre/15 text-specimen-ochre'
                  }`}
                >
                  {match.category}
                </span>
              </div>

              {match.def && (
                <p className="mt-1.5 font-serif text-xs text-ink-muted line-clamp-2">
                  {match.def}
                </p>
              )}

              <div className="mt-2 flex items-center gap-4 font-mono text-[10px] text-ink-faint">
                <span>
                  Semantic:{' '}
                  <strong className="text-ink-carbon">
                    {(match.semantic_sim * SPECIMEN_CONFIG.SIMILARITY_SCALE).toFixed(
                      SPECIMEN_CONFIG.SIMILARITY_PRECISION,
                    )}
                    %
                  </strong>
                </span>
                <span>
                  Acoustic:{' '}
                  <strong className="text-specimen-moss">
                    {(match.phonetic_sim * SPECIMEN_CONFIG.SIMILARITY_SCALE).toFixed(
                      SPECIMEN_CONFIG.SIMILARITY_PRECISION,
                    )}
                    %
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
