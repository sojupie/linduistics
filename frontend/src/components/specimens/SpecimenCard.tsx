import React from 'react';
import type { SpecimenPair } from '../../types/linguistics';
import { SPECIMEN_CONFIG } from '../../constants/config';
import { BookOpen } from 'lucide-react';

interface SpecimenCardProps {
  specimen: SpecimenPair;
}

export const SpecimenCard: React.FC<SpecimenCardProps> = ({ specimen }) => {
  const getBadgeStyle = () => {
    switch (specimen.category) {
      case 'cognate':
        return 'border-specimen-moss/30 bg-specimen-moss/10 text-specimen-moss';
      case 'minefield':
        return 'border-specimen-oxblood/30 bg-specimen-oxblood/10 text-specimen-oxblood';
      case 'cousin':
        return 'border-specimen-ochre/30 bg-specimen-ochre/10 text-specimen-ochre';
      case 'schism':
        return 'border-specimen-irongall/30 bg-specimen-irongall/10 text-specimen-irongall';
      default:
        return 'border-border-hairline bg-substrate-dark text-ink-muted';
    }
  };

  return (
    <div className="flex flex-col justify-between rounded border border-border-hairline bg-substrate-panel p-5 font-serif transition-all hover:border-ink-faint hover:shadow-md">
      {/* Top Header: Catalog Tabula & Category Badge */}
      <div>
        <div className="flex items-center justify-between border-b border-border-hairline/60 pb-2.5">
          <span className="font-mono text-[10px] tracking-widest uppercase text-ink-faint">
            {specimen.catalogId}
          </span>
          <span
            className={`rounded px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider border ${getBadgeStyle()}`}
          >
            {specimen.category}
          </span>
        </div>

        {/* Headword Pair Observation */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Source Specimen (A) */}
          <div className="rounded border border-border-hairline/40 bg-substrate-dark/60 p-3">
            <div className="flex items-baseline justify-between">
              <h4 className="text-lg font-bold text-ink-carbon">{specimen.wordA}</h4>
              {specimen.posA && (
                <span className="font-mono text-[9px] uppercase text-ink-faint">
                  {specimen.posA}
                </span>
              )}
            </div>
            {specimen.ipaA && (
              <p className="font-mono text-[11px] text-ink-muted">{specimen.ipaA}</p>
            )}
            <p className="mt-2 text-xs text-ink-muted leading-relaxed line-clamp-2">
              {specimen.defA}
            </p>
          </div>

          {/* Target Specimen (B) */}
          <div className="rounded border border-border-hairline/40 bg-substrate-dark/60 p-3">
            <div className="flex items-baseline justify-between">
              <h4 className="text-lg font-bold text-ink-carbon">{specimen.wordB}</h4>
              {specimen.posB && (
                <span className="font-mono text-[9px] uppercase text-ink-faint">
                  {specimen.posB}
                </span>
              )}
            </div>
            {specimen.ipaB && (
              <p className="font-mono text-[11px] text-ink-muted">{specimen.ipaB}</p>
            )}
            <p className="mt-2 text-xs text-ink-muted leading-relaxed line-clamp-2">
              {specimen.defB}
            </p>
          </div>
        </div>
      </div>

      {/* Mathematical Alignment Coefficients */}
      <div className="mt-4 border-t border-border-hairline/50 pt-3">
        <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-center">
          <div className="rounded bg-substrate-dark/80 p-1.5 border border-border-hairline/30">
            <span className="block text-[8px] text-ink-faint uppercase">Spelling</span>
            <span className="text-ink-carbon">
              {(specimen.orthographicSim * SPECIMEN_CONFIG.SIMILARITY_SCALE).toFixed(
                SPECIMEN_CONFIG.SIMILARITY_PRECISION,
              )}
              %
            </span>
          </div>
          <div className="rounded bg-substrate-dark/80 p-1.5 border border-border-hairline/30">
            <span className="block text-[8px] text-ink-faint uppercase">Acoustic</span>
            <span className="text-specimen-moss">
              {(specimen.phoneticSim * SPECIMEN_CONFIG.SIMILARITY_SCALE).toFixed(
                SPECIMEN_CONFIG.SIMILARITY_PRECISION,
              )}
              %
            </span>
          </div>
          <div className="rounded bg-substrate-dark/80 p-1.5 border border-border-hairline/30">
            <span className="block text-[8px] text-ink-faint uppercase">Semantic</span>
            <span
              className={
                specimen.semanticSim > 0.7
                  ? 'text-specimen-moss'
                  : specimen.semanticSim < 0.3
                  ? 'text-specimen-oxblood'
                  : 'text-specimen-ochre'
              }
            >
              {(specimen.semanticSim * SPECIMEN_CONFIG.SIMILARITY_SCALE).toFixed(
                SPECIMEN_CONFIG.SIMILARITY_PRECISION,
              )}
              %
            </span>
          </div>
        </div>

        {/* Marginalia Annotation */}
        {specimen.marginalia && (
          <div className="mt-3 flex items-start gap-2 rounded bg-substrate-dark/40 p-2.5 text-[11px] italic text-ink-muted">
            <BookOpen size={12} className="shrink-0 text-specimen-moss mt-0.5" />
            <span className="leading-snug">{specimen.marginalia}</span>
          </div>
        )}
      </div>
    </div>
  );
};
