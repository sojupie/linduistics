import React from 'react';
import type { TokenAnalysis } from '../../types/linguistics';

interface TokenPillProps {
  tokenAnalysis: TokenAnalysis;
  isSelected: boolean;
  onSelect: (token: TokenAnalysis) => void;
}

const getDepLabel = (dep?: string): string | null => {
  if (!dep) return null;
  switch (dep.toLowerCase()) {
    case 'root':
      return 'predicate';
    case 'nsubj':
    case 'nsubj:pass':
      return 'subject';
    case 'obj':
      return 'object';
    case 'iobj':
      return 'ind. obj';
    case 'obl':
      return 'adverbial';
    case 'case':
      return 'prep';
    case 'amod':
      return 'adj mod';
    case 'advmod':
      return 'adv mod';
    case 'det':
      return 'det';
    case 'conj':
      return 'conjunct';
    case 'cc':
      return 'conj';
    case 'cop':
      return 'copula';
    case 'aux':
    case 'aux:pass':
      return 'aux';
    default:
      return dep.length <= 6 ? dep.toLowerCase() : null;
  }
};

export const TokenPill: React.FC<TokenPillProps> = ({
  tokenAnalysis,
  isSelected,
  onSelect,
}) => {
  if (tokenAnalysis.is_punct) {
    return (
      <div className="inline-flex flex-col items-center select-none self-start px-0.5 pt-1">
        <span className="typo-headword-row text-ink-muted leading-normal">
          {tokenAnalysis.token}
        </span>
        <span className="typo-sublabel opacity-0 select-none leading-tight">
          —
        </span>
        <span className="typo-pos opacity-0 select-none leading-tight mt-0.5">
          —
        </span>
      </div>
    );
  }

  const depLabel = getDepLabel(tokenAnalysis.dep_rel);
  const fallbackLabel = tokenAnalysis.pos
    ? tokenAnalysis.pos.toLowerCase()
    : tokenAnalysis.coverage_ratio > 0
    ? `${Math.round(tokenAnalysis.coverage_ratio * 100)}%`
    : null;
  const glossLabel = depLabel ?? fallbackLabel;

  const isInflected = Boolean(
    tokenAnalysis.lemma &&
    tokenAnalysis.lemma.toLowerCase() !== tokenAnalysis.token.toLowerCase()
  );

  const betterAltCount =
    tokenAnalysis.alternatives?.filter((a) => a.universality_delta > 0).length ?? 0;

  const getStatusColor = () => {
    switch (tokenAnalysis.status) {
      case 'universal':
        return 'text-cognate-ink';
      case 'branch_specific':
        return 'text-shifted-ink';
      default:
        return 'text-ink-main';
    }
  };

  const tooltipTitle = [
    tokenAnalysis.token,
    isInflected ? `lemma: ${tokenAnalysis.lemma}` : null,
    glossLabel || null,
    betterAltCount > 0
      ? `${betterAltCount} higher-cognacy alternate${betterAltCount === 1 ? '' : 's'}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      onClick={() => onSelect(tokenAnalysis)}
      className={`group inline-flex flex-col items-center cursor-pointer px-3 py-2 rounded-lg border transition-all text-center gap-1 shadow-2xs ${
        isSelected
          ? 'border-cognate-ink bg-cognate-bg/40 ring-1 ring-cognate-ink/20 shadow-xs'
          : 'border-book-rule/80 bg-page-surface hover:border-book-rule-strong hover:bg-page-muted/40 hover:shadow-xs'
      }`}
      title={tooltipTitle}
    >
      {/* Tier 1: Surface Token */}
      <span className={`typo-headword-row tracking-tight ${getStatusColor()}`}>
        {tokenAnalysis.token}
      </span>

      {/* Tier 2: Base Lemma (italic serif if inflected, em-dash if base form) */}
      <span
        className={`typo-note leading-tight text-xs ${
          isInflected ? 'italic text-ink-muted' : 'text-book-rule/60 select-none'
        }`}
      >
        {isInflected ? tokenAnalysis.lemma : '—'}
      </span>

      {/* Tier 3: Syntactic Role / POS and alternate availability */}
      {glossLabel ? (
        <span className="typo-pos text-xs leading-tight inline-flex items-center px-1.5 py-0.5 rounded bg-page-muted/80 text-ink-muted whitespace-nowrap">
          {glossLabel}
          {betterAltCount > 0 && (
            <span className="text-cognate-ink font-sans font-medium ml-1">
              · {betterAltCount}
            </span>
          )}
        </span>
      ) : (
        <span className="typo-pos text-xs leading-tight text-book-rule/60 select-none">
          —
        </span>
      )}
    </button>
  );
};
