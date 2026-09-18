import React from 'react';
import type { TokenAnalysis } from '../../types/linguistics';

interface SpecimenTokenPillProps {
  tokenAnalysis: TokenAnalysis;
  isSelected: boolean;
  onSelect: (token: TokenAnalysis) => void;
}

export const SpecimenTokenPill: React.FC<SpecimenTokenPillProps> = ({
  tokenAnalysis,
  isSelected,
  onSelect,
}) => {
  const getStatusStyle = () => {
    switch (tokenAnalysis.status) {
      case 'universal':
        return 'border-b-2 border-specimen-moss text-ink-carbon hover:bg-specimen-moss/10';
      case 'branch_specific':
        return 'border-b-2 border-specimen-ochre text-ink-carbon hover:bg-specimen-ochre/10';
      case 'isolate':
      default:
        return 'border-b border-dashed border-border-hairline text-ink-muted hover:bg-substrate-panel';
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(tokenAnalysis)}
      className={`relative inline-block cursor-pointer px-1.5 py-0.5 font-serif text-base font-medium transition-all ${
        isSelected ? 'bg-substrate-dark ring-1 ring-specimen-moss' : ''
      } ${getStatusStyle()}`}
      title={`Token: ${tokenAnalysis.token} | Status: ${tokenAnalysis.status} | Coverage: ${(tokenAnalysis.coverage_ratio * 100).toFixed(0)}%`}
    >
      <span>{tokenAnalysis.token}</span>
      {tokenAnalysis.lemma && tokenAnalysis.lemma !== tokenAnalysis.token.toLowerCase() && (
        <span className="ml-1 font-mono text-[9px] text-ink-faint">
          *
        </span>
      )}
    </button>
  );
};
