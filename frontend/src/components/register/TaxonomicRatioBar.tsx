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
    <div className="w-full">
      {/* Segmented bar */}
      <div
        className={`flex w-full overflow-hidden rounded border border-border-hairline bg-substrate-dark ${
          compact
            ? TAXONOMIC_BAR_CONFIG.BAR_HEIGHT_COMPACT_PX
            : TAXONOMIC_BAR_CONFIG.BAR_HEIGHT_DEFAULT_PX
        }`}
        title={`Identical: ${pctId}% | Shifted: ${pctSh}% | False Friends: ${pctFf}% | Divergent: ${pctDv}%`}
      >
        <div
          style={{ width: `${identical * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER}%` }}
          className="bg-specimen-moss transition-all duration-300"
        />
        <div
          style={{ width: `${shifted * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER}%` }}
          className="border-l border-border-hairline bg-specimen-ochre transition-all duration-300"
        />
        <div
          style={{ width: `${falseFriends * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER}%` }}
          className="border-l border-border-hairline bg-specimen-oxblood transition-all duration-300"
        />
        <div
          style={{ width: `${divergent * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER}%` }}
          className="border-l border-border-hairline bg-specimen-irongall transition-all duration-300"
        />
      </div>

      {/* Legend below bar if not compact */}
      {!compact && (
        <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-ink-muted">
          <span className="text-specimen-moss">{pctId}% Cognate</span>
          <span className="text-specimen-ochre">{pctSh}% Shift</span>
          <span className="text-specimen-oxblood">{pctFf}% Trap</span>
          <span className="text-specimen-irongall">{pctDv}% Div</span>
        </div>
      )}
    </div>
  );
};
