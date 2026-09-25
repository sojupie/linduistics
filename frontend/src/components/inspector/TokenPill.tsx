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
  if (tokenAnalysis.is_punct) {
    return (
      <span className="font-serif text-lg text-ink-muted select-none self-baseline">
        {tokenAnalysis.token}
      </span>
    );
  }

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

  const isInflected = Boolean(
    tokenAnalysis.lemma &&
    tokenAnalysis.lemma.toLowerCase() !== tokenAnalysis.token.toLowerCase()
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(tokenAnalysis)}
      className={`inline-block cursor-pointer px-2 py-1 font-serif text-lg font-medium transition-all ${
        isSelected ? 'bg-page-muted ring-1 ring-ink-main rounded-xs' : ''
      } ${getStatusStyle()}`}
      title={`Token: ${tokenAnalysis.token}${isInflected ? ` (lemma: ${tokenAnalysis.lemma})` : ''} | Coverage: ${(tokenAnalysis.coverage_ratio * 100).toFixed(0)}%`}
    >
      <span>{tokenAnalysis.token}</span>
      {isInflected && (
        <span className="ml-1 text-sm text-ink-light font-sans" title={`Inflected from "${tokenAnalysis.lemma}"`}>
          *
        </span>
      )}
    </button>
  );
};
