import React from 'react';
import type { TokenAnalysis } from '../../types/linguistics';

interface TokenPillProps {
  tokenAnalysis: TokenAnalysis;
  isSelected: boolean;
  onSelect: (token: TokenAnalysis) => void;
}

export const TokenPill: React.FC<TokenPillProps> = ({
  tokenAnalysis,
  isSelected,
  onSelect,
}) => {
  const getStatusStyle = () => {
    switch (tokenAnalysis.status) {
      case 'universal':
        return 'border-b-2 border-cognate-ink text-ink-main hover:bg-cognate-bg';
      case 'branch_specific':
        return 'border-b-2 border-shifted-ink text-ink-main hover:bg-shifted-bg';
      case 'isolate':
      default:
        return 'border-b border-dashed border-book-rule-strong text-ink-muted hover:bg-page-muted';
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(tokenAnalysis)}
      className={`inline-block cursor-pointer px-2 py-1 font-serif text-lg font-medium transition-all ${
        isSelected ? 'bg-page-muted ring-1 ring-ink-main rounded-xs' : ''
      } ${getStatusStyle()}`}
      title={`Token: ${tokenAnalysis.token} | Coverage: ${(tokenAnalysis.coverage_ratio * 100).toFixed(0)}%`}
    >
      <span>{tokenAnalysis.token}</span>
      {tokenAnalysis.lemma && tokenAnalysis.lemma !== tokenAnalysis.token.toLowerCase() && (
        <span className="ml-1 text-sm text-ink-light">
          *
        </span>
      )}
    </button>
  );
};

