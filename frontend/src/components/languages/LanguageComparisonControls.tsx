import React, { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { LanguagePairSelect } from '../common/LanguagePicker';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { getLanguageName } from '../../data/languages';
import { LANGUAGE_MEASURES, lexiconSearch, type LanguageMeasure, type LanguagePair } from './languageComparison';

interface LanguageComparisonControlsProps {
  languages: string[];
  availableTargets: string[];
  reference: string;
  target: string;
  explorePair: LanguagePair | null;
  measure: LanguageMeasure;
  canSwap: boolean;
  onSourceChange: (source: string) => void;
  onTargetChange: (target: string) => void;
  onSwap: () => void;
  onMeasureChange: (measure: LanguageMeasure) => void;
}

export const LanguageComparisonControls: React.FC<LanguageComparisonControlsProps> = ({
  languages, availableTargets, reference, target, explorePair, measure, canSwap,
  onSourceChange, onTargetChange, onSwap, onMeasureChange,
}) => {
  const [bottomOffset, setBottomOffset] = useState<number>(12);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const updateOffset = () => {
      const footer = document.getElementById('app-footer');
      if (!footer) {
        setBottomOffset(12);
        return;
      }
      const rect = footer.getBoundingClientRect();
      const visibleFooterHeight = window.innerHeight - rect.top;
      setBottomOffset(visibleFooterHeight > 0 ? visibleFooterHeight + 12 : 12);
    };

    updateOffset();
    window.addEventListener('scroll', updateOffset, { passive: true });
    window.addEventListener('resize', updateOffset, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    const footer = document.getElementById('app-footer');
    if (footer && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateOffset);
      resizeObserver.observe(footer);
    }

    return () => {
      window.removeEventListener('scroll', updateOffset);
      window.removeEventListener('resize', updateOffset);
      resizeObserver?.disconnect();
    };
  }, []);

  const controls = <>
        <LanguagePairSelect label="Pair:" sourceLang={reference} targetLang={target}
          availableSources={languages.filter((code) => code !== target)}
          availableTargets={availableTargets.filter((code) => code !== reference)}
          onSourceChange={onSourceChange} onTargetChange={onTargetChange} onSwap={onSwap} canSwap={canSwap} />
        <label className="flex shrink-0 items-center gap-2 whitespace-nowrap typo-sublabel text-ink-muted">Compare
          <select aria-label="Compare languages by" value={measure} onChange={(event) => onMeasureChange(event.target.value as LanguageMeasure)} className="bg-page-bg border border-book-rule px-2.5 py-1.5 sm:py-1 typo-sublabel font-medium text-ink-main hover:border-book-rule-strong focus:border-ink-main focus:outline-none cursor-pointer transition-colors">
            {Object.entries(LANGUAGE_MEASURES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
          </select>
        </label>
        {explorePair && (
          <Link
            to="/lexicon"
            search={lexiconSearch(explorePair.source, explorePair.target, measure)}
            className="inline-flex shrink-0 items-center gap-1 border-b border-current pb-0.5 typo-sublabel text-cognate-ink hover:text-ink-main transition-colors"
          >
            Explore {getLanguageName(explorePair.source)}–{getLanguageName(explorePair.target)} word pairs
            <MaterialSymbol icon="arrow_forward" size={14} />
          </Link>
        )}
  </>;

  return (
    <div className="language-controls-layer" style={{ bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom))` }}>
      <div className="language-controls-panel hidden sm:flex flex-wrap items-center gap-x-5 gap-y-2 border border-book-rule-strong bg-page-surface px-4 py-3 shadow-lg">
        {controls}
      </div>
      <div className="flex w-full flex-col items-end gap-2 sm:hidden">
        {mobileOpen && (
          <div className="language-controls-panel flex flex-wrap items-center gap-x-5 gap-y-2 border border-book-rule-strong bg-page-surface px-4 py-3 shadow-lg">
            {controls}
          </div>
        )}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close language controls' : 'Open language controls'}
          className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-ink-main text-page-surface shadow-lg hover:bg-ink-muted transition-colors"
        >
          <MaterialSymbol icon={mobileOpen ? 'close' : 'tune'} size={22} />
        </button>
      </div>
    </div>
  );
};
