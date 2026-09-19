import React from 'react';
import { TAXONOMIC_BAR_CONFIG } from '../../constants/config';

interface TaxonomicRatioBarProps {
  ratios: {
    identical: number;
    shifted: number;
    falseFriends: number;
    divergent: number;
  };
  compact?: boolean;
}

export const TaxonomicRatioBar: React.FC<TaxonomicRatioBarProps> = ({
  ratios,
  compact = false,
}) => {
  const { identical, shifted, falseFriends, divergent } = ratios;
  const pctId = (identical * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER).toFixed(
    TAXONOMIC_BAR_CONFIG.PRECISION_DECIMALS,
  );
  const pctSh = (shifted * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER).toFixed(
    TAXONOMIC_BAR_CONFIG.PRECISION_DECIMALS,
  );
  const pctFf = (falseFriends * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER).toFixed(
    TAXONOMIC_BAR_CONFIG.PRECISION_DECIMALS,
  );
  const pctDv = (divergent * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER).toFixed(
    TAXONOMIC_BAR_CONFIG.PRECISION_DECIMALS,
  );

  return (
    <div className="w-full font-serif">
      {/* Segmented bar */}
      <div
        className={`flex w-full overflow-hidden rounded-xs border border-book-rule bg-page-muted ${
          compact
            ? TAXONOMIC_BAR_CONFIG.BAR_HEIGHT_COMPACT_PX
            : TAXONOMIC_BAR_CONFIG.BAR_HEIGHT_DEFAULT_PX
        }`}
        title={`True cognates: ${pctId}% | Partial cognates: ${pctSh}% | False friends: ${pctFf}% | Translation pairs: ${pctDv}%`}
      >
        <div
          style={{ width: `${identical * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER}%` }}
          className="bg-cognate-ink"
        />
        <div
          style={{ width: `${shifted * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER}%` }}
          className="border-l border-book-rule bg-shifted-ink"
        />
        <div
          style={{ width: `${falseFriends * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER}%` }}
          className="border-l border-book-rule bg-falsefriend-ink"
        />
        <div
          style={{ width: `${divergent * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER}%` }}
          className="border-l border-book-rule bg-divergent-ink"
        />
      </div>

      {/* Legend below bar if not compact */}
      {!compact && (
        <div className="mt-2 flex flex-wrap items-center justify-between text-sm text-ink-muted gap-2">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-cognate-ink" />
            <span>{pctId}% true cognates</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-shifted-ink" />
            <span>{pctSh}% partial cognates</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-falsefriend-ink" />
            <span>{pctFf}% false friends</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-divergent-ink" />
            <span>{pctDv}% translation pairs</span>
          </span>
        </div>
      )}
    </div>
  );
};
