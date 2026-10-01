import React from 'react';
import { TAXONOMIC_BAR_CONFIG } from '../../constants/config';
import { TAXONOMY_DEFINITIONS } from '../../constants/taxonomy';

interface TaxonomyRatioBarProps {
  ratios: {
    trueCognates: number;
    partialCognates: number;
    falseFriends: number;
    translationPairs: number;
    other?: number;
  };
  compact?: boolean;
}

export const TaxonomyRatioBar: React.FC<TaxonomyRatioBarProps> = ({
  ratios,
  compact = false,
}) => {
  const { trueCognates, partialCognates, falseFriends, translationPairs, other = 0 } = ratios;

  const pctTrue = (trueCognates * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER).toFixed(
    TAXONOMIC_BAR_CONFIG.PRECISION_DECIMALS,
  );
  const pctPartial = (partialCognates * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER).toFixed(
    TAXONOMIC_BAR_CONFIG.PRECISION_DECIMALS,
  );
  const pctFf = (falseFriends * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER).toFixed(
    TAXONOMIC_BAR_CONFIG.PRECISION_DECIMALS,
  );
  const pctTrans = (translationPairs * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER).toFixed(
    TAXONOMIC_BAR_CONFIG.PRECISION_DECIMALS,
  );
  const pctOther = (other * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER).toFixed(
    TAXONOMIC_BAR_CONFIG.PRECISION_DECIMALS,
  );

  const tooltipText = [
    `True cognates: ${pctTrue}%`,
    `Semantic shifts: ${pctPartial}%`,
    `False friends: ${pctFf}%`,
    `Translation equivalents: ${pctTrans}%`,
    other > 0.001 ? `Unrelated lexicon: ${pctOther}%` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  return (
    <div className="w-full font-sans">
      {/* Segmented bar */}
      <div
        className={`flex w-full overflow-hidden rounded-xs border border-book-rule bg-page-muted ${
          compact
            ? TAXONOMIC_BAR_CONFIG.BAR_HEIGHT_COMPACT_PX
            : TAXONOMIC_BAR_CONFIG.BAR_HEIGHT_DEFAULT_PX
        }`}
        title={tooltipText}
      >
        <div
          style={{ width: `${trueCognates * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER}%` }}
          className="bg-cognate-ink"
        />
        <div
          style={{ width: `${partialCognates * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER}%` }}
          className="border-l border-book-rule bg-shifted-ink"
        />
        <div
          style={{ width: `${falseFriends * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER}%` }}
          className="border-l border-book-rule bg-falsefriend-ink"
        />
        <div
          style={{ width: `${translationPairs * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER}%` }}
          className="border-l border-book-rule bg-divergent-ink"
        />
        {other > 0.001 && (
          <div
            style={{ width: `${other * TAXONOMIC_BAR_CONFIG.PERCENT_MULTIPLIER}%` }}
            className="border-l border-book-rule bg-book-rule-strong"
          />
        )}
      </div>

      {/* Legend below bar if not compact */}
      {!compact && (
        <div className="mt-2 flex flex-wrap items-center justify-between typo-sublabel text-ink-muted gap-2 select-none">
          <span
            className="flex items-center gap-1.5 cursor-help hover:text-ink-main transition-colors"
            title={TAXONOMY_DEFINITIONS.true_cognate.tooltip}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-cognate-ink" />
            <span>{pctTrue}% true cognates</span>
          </span>
          <span
            className="flex items-center gap-1.5 cursor-help hover:text-ink-main transition-colors"
            title={TAXONOMY_DEFINITIONS.partial_cognate.tooltip}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-shifted-ink" />
            <span>{pctPartial}% semantic shifts</span>
          </span>
          <span
            className="flex items-center gap-1.5 cursor-help hover:text-ink-main transition-colors"
            title={TAXONOMY_DEFINITIONS.false_friend.tooltip}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-falsefriend-ink" />
            <span>{pctFf}% false friends</span>
          </span>
          <span
            className="flex items-center gap-1.5 cursor-help hover:text-ink-main transition-colors"
            title={TAXONOMY_DEFINITIONS.translation_pair.tooltip}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-divergent-ink" />
            <span>{pctTrans}% translation equivalents</span>
          </span>
          {other > 0.001 && (
            <span
              className="flex items-center gap-1.5 cursor-help hover:text-ink-main transition-colors"
              title={TAXONOMY_DEFINITIONS.independent_root.tooltip}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-xs bg-book-rule-strong" />
              <span>{pctOther}% unrelated lexicon</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

