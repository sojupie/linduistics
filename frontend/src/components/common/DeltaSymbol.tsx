import React from 'react';

export interface DeltaSymbolProps {
  symbol: 'o' | 'p' | 's';
  className?: string;
  title?: string;
}

/**
 * Optically scaled Delta metric symbol (Δo, Δp, Δs) using Noto Sans Latin glyphs
 * scaled with CSS to avoid the compressed micro-glyph rendering of Unicode subscript blocks.
 */
export const DeltaSymbol: React.FC<DeltaSymbolProps> = ({ symbol, className = '', title }) => {
  return (
    <span className={`typo-delta ${className}`} title={title} aria-label={`Delta ${symbol}`}>
      Δ<sub>{symbol}</sub>
    </span>
  );
};
