import React from 'react';
import { REGISTER_CONFIG } from '../../constants/config';
import type { LanguagePairStats } from '../../types/linguistics';
import { LANGUAGE_MATRIX_CONFIG, LANGUAGE_MEASURES, pairKey, type LanguageMeasure, type LanguagePair } from './languageComparison';

interface LanguagePairMatrixProps {
  languages: string[];
  pairs: ReadonlyMap<string, LanguagePairStats>;
  reference: string;
  selectedTarget: string | null;
  activePair: LanguagePair | null;
  measure: LanguageMeasure;
  languageName: (code: string) => string;
  onChooseLanguage: (code: string) => void;
  onChoosePair: (source: string, target: string) => void;
}

export const LanguagePairMatrix: React.FC<LanguagePairMatrixProps> = ({
  languages, pairs, reference, selectedTarget, activePair, measure, languageName, onChooseLanguage, onChoosePair,
}) => (
  <section className="min-w-0 border border-book-rule bg-page-surface shadow-2xs" aria-label="Pair comparison matrix">
    <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 border-b border-book-rule">
      <h2 className="typo-section-header">Pair matrix</h2>
      <span className="typo-sublabel text-ink-muted">{LANGUAGE_MEASURES[measure].label}</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse typo-metric-table" style={{ tableLayout: 'fixed', minWidth: LANGUAGE_MATRIX_CONFIG.minimumWidthPx }}>
        <caption className="sr-only">Rows show source languages and columns show target languages. Select a cell to compare a pair.</caption>
        <thead>
          <tr>
            <th scope="col" rowSpan={2} className="p-3 border-b border-r border-book-rule text-left typo-sublabel font-semibold bg-page-surface" style={{ width: LANGUAGE_MATRIX_CONFIG.sourceColumnWidthPx, position: 'sticky', left: 0, zIndex: 2 }}>Source language ↓</th>
            <th scope="colgroup" colSpan={languages.length} className="border-b border-book-rule px-3 py-2 text-center typo-overline text-ink-muted bg-page-surface">Target language →</th>
          </tr>
          <tr>{languages.map((code) => {
            const isSelected = selectedTarget === code;
            const stateClass = isSelected ? 'bg-ink-light text-page-bg' : 'bg-page-surface text-ink-muted';
            return <th key={code} scope="col" className={`p-3 border-b border-book-rule text-center font-semibold ${stateClass}`}>
              <button type="button" onClick={() => onChooseLanguage(code)} aria-pressed={isSelected} className={`w-full typo-sublabel font-semibold focus:outline focus:outline-2 focus:outline-ink-main cursor-pointer ${isSelected ? '!text-page-bg' : 'text-ink-muted hover:text-ink-main'}`}>
                {languageName(code)}
              </button>
            </th>;
          })}</tr>
        </thead>
        <tbody>{languages.map((source) => <tr key={source}>
          <th scope="row" className={`p-3 border-r border-b border-book-rule text-left typo-sublabel font-semibold ${source === reference ? 'bg-ink-muted text-page-bg' : 'bg-page-surface text-ink-muted'}`} style={{ position: 'sticky', left: 0, zIndex: 1 }}>
            <button type="button" disabled={source === reference} onClick={() => onChooseLanguage(source)} aria-pressed={source === reference} className={`w-full text-left typo-sublabel font-semibold focus:outline focus:outline-2 focus:outline-ink-main disabled:cursor-default ${source === reference ? '!text-page-bg' : 'text-ink-muted hover:text-ink-main hover:underline'}`}>{languageName(source)}</button>
          </th>
          {languages.map((target) => {
            const pair = pairs.get(pairKey(source, target));
            const value = pair ? LANGUAGE_MEASURES[measure].value(pair) : null;
            const pairIsActive = activePair?.source === source && activePair.target === target;
            return <td key={target} className={`p-1 border-b border-book-rule text-center ${source === reference || target === selectedTarget ? 'bg-page-muted/35' : ''}`}>
              {source === target ? <span className="block p-3 text-ink-light" aria-label="Same language">—</span>
                : pair && value !== null ? <button type="button" onClick={() => onChoosePair(source, target)} aria-pressed={pairIsActive}
                  aria-label={`${languageName(source)} to ${languageName(target)}: ${Math.round(value * REGISTER_CONFIG.PERCENT_SCALE)}% ${LANGUAGE_MEASURES[measure].label.toLowerCase()}; select this pair`}
                  className={`block w-full p-3 font-semibold ${value >= LANGUAGE_MATRIX_CONFIG.lightTextThreshold ? 'text-page-bg' : 'text-ink-main'} hover:outline hover:outline-1 hover:outline-ink-main focus:outline focus:outline-2 focus:outline-ink-main ${pairIsActive ? 'ring-2 ring-inset ring-ink-main' : ''}`}
                  style={{ backgroundColor: `color-mix(in srgb, ${LANGUAGE_MEASURES[measure].color} ${Math.round(value * REGISTER_CONFIG.PERCENT_SCALE)}%, transparent)` }}>
                  {Math.round(value * REGISTER_CONFIG.PERCENT_SCALE)}%
                </button> : <span className="block p-3 text-ink-light" aria-label="No recorded comparison">—</span>}
            </td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
  </section>
);
