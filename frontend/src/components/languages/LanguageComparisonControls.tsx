import React, { useEffect, useState } from 'react';
import { LanguagePairSelect } from '../common/LanguagePicker';
import { LANGUAGE_MEASURES, type LanguageMeasure } from './languageComparison';

interface LanguageComparisonControlsProps {
  languages: string[];
  availableTargets: string[];
  reference: string;
  target: string;
  measure: LanguageMeasure;
  canSwap: boolean;
  onSourceChange: (source: string) => void;
  onTargetChange: (target: string) => void;
  onSwap: () => void;
  onMeasureChange: (measure: LanguageMeasure) => void;
}

export const LanguageComparisonControls: React.FC<LanguageComparisonControlsProps> = ({
  languages, availableTargets, reference, target, measure, canSwap,
  onSourceChange, onTargetChange, onSwap, onMeasureChange,
}) => {
  const [bottomOffset, setBottomOffset] = useState<number>(12);

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

  return (
    <div className="language-controls-layer" style={{ bottom: `${bottomOffset}px` }}>
      <div className="language-controls-panel flex flex-wrap items-center gap-x-5 gap-y-2 border border-book-rule-strong bg-page-surface px-4 py-3 shadow-lg">
        <LanguagePairSelect label="Pair:" sourceLang={reference} targetLang={target}
          availableSources={languages.filter((code) => code !== target)}
          availableTargets={availableTargets.filter((code) => code !== reference)}
          onSourceChange={onSourceChange} onTargetChange={onTargetChange} onSwap={onSwap} canSwap={canSwap} />
        <label className="flex shrink-0 items-center gap-2 whitespace-nowrap typo-sublabel text-ink-muted">Compare
          <select aria-label="Compare languages by" value={measure} onChange={(event) => onMeasureChange(event.target.value as LanguageMeasure)} className="bg-page-bg border border-book-rule px-2.5 py-1.5 sm:py-1 typo-sublabel font-medium text-ink-main hover:border-book-rule-strong focus:border-ink-main focus:outline-none cursor-pointer transition-colors">
            {Object.entries(LANGUAGE_MEASURES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
};
