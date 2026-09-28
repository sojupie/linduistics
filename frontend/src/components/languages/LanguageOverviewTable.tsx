import React from 'react';
import { REGISTER_CONFIG } from '../../constants/config';
import type { LanguageProfile } from '../../types/linguistics';
import { TaxonomyRatioBar } from './TaxonomyRatioBar';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { LANGUAGE_OVERVIEW_CONFIG, type LanguageMeasure, type LanguageSort } from './languageComparison';

interface LanguageOverviewTableProps {
  referenceName: string;
  rows: LanguageProfile[];
  selectedTarget: string | null;
  sort: LanguageSort;
  measure: LanguageMeasure;
  onSortChange: (sort: LanguageSort) => void;
  onMeasureChange: (measure: LanguageMeasure) => void;
  onSelectTarget: (target: string) => void;
}

export const LanguageOverviewTable: React.FC<LanguageOverviewTableProps> = ({
  referenceName, rows, selectedTarget, sort, measure, onSortChange, onMeasureChange, onSelectTarget,
}) => {
  const sortIndicator = (value: LanguageSort) => sort === value
    ? <MaterialSymbol icon="arrow_downward" size={14} className="ml-1 inline-block align-middle text-ink-main" />
    : null;

  return (
    <section className="border border-book-rule bg-page-surface shadow-2xs" aria-label={`${referenceName} comparison table`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-book-rule">
        <h2 className="typo-section-header">From {referenceName}</h2>
        <span className="text-xs text-ink-muted">Select a heading to sort</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left tabular-nums" style={{ minWidth: LANGUAGE_OVERVIEW_CONFIG.minimumTableWidthPx }}>
          <caption className="sr-only">Pair counts, comparison scores and vocabulary composition from {referenceName}.</caption>
          <thead className="sticky top-0 z-10 bg-page-bg">
            <tr className="border-b-2 border-book-rule-strong typo-overline text-ink-muted">
              <th scope="col" className="w-8 px-2 py-3 text-center">#</th>
              <th scope="col" aria-sort={sort === 'name' ? 'ascending' : 'none'} className="px-2 py-3"><button type="button" onClick={() => onSortChange('name')} className="hover:text-ink-main">Target language{sortIndicator('name')}</button></th>
              <th scope="col" aria-sort={sort === 'pairs' ? 'descending' : 'none'} className="px-2 py-3 text-right"><button type="button" onClick={() => onSortChange('pairs')} className="hover:text-ink-main">Word pairs{sortIndicator('pairs')}</button></th>
              <th scope="col" aria-sort={sort === 'phonetic' ? 'descending' : 'none'} title="Average phonetic similarity based on articulatory feature alignment" className={`px-2 py-3 text-right ${measure === 'phonetic' ? 'text-cognate-ink' : ''}`}><button type="button" onClick={() => { onMeasureChange('phonetic'); onSortChange('phonetic'); }} className="hover:text-ink-main">Phonetic sim.{sortIndicator('phonetic')}</button></th>
              <th scope="col" aria-sort={sort === 'spelling' ? 'descending' : 'none'} title="Average orthographic similarity across headword spellings" className={`px-2 py-3 text-right ${measure === 'orthographic' ? 'text-divergent-ink' : ''}`}><button type="button" onClick={() => { onMeasureChange('orthographic'); onSortChange('spelling'); }} className="hover:text-ink-main">Spelling sim.{sortIndicator('spelling')}</button></th>
              <th scope="col" aria-sort={sort === 'ease' ? 'descending' : 'none'} title="Average definition overlap based on sentence embeddings" className={`px-2 py-3 text-right ${measure === 'semantic' ? 'text-ink-main' : ''}`}><button type="button" onClick={() => { onMeasureChange('semantic'); onSortChange('ease'); }} className="hover:text-ink-main">Semantic sim.{sortIndicator('ease')}</button></th>
              <th scope="col" aria-sort={sort === 'cognates' ? 'descending' : 'none'} className={`px-2 py-3 text-right ${measure === 'cognates' ? 'text-cognate-ink' : ''}`}><button type="button" onClick={() => { onMeasureChange('cognates'); onSortChange('cognates'); }} className="hover:text-ink-main">Cognates %{sortIndicator('cognates')}</button></th>
              <th scope="col" aria-sort={sort === 'minefield' ? 'descending' : 'none'} className={`px-2 py-3 text-right ${measure === 'false_friends' ? 'text-falsefriend-ink' : ''}`}><button type="button" onClick={() => { onMeasureChange('false_friends'); onSortChange('minefield'); }} className="hover:text-ink-main">False friends %{sortIndicator('minefield')}</button></th>
              <th scope="col" className="w-32 px-2 py-3">Vocabulary composition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-book-rule/50">
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-ink-muted">No comparisons are cataloged from {referenceName}.</td></tr>
            ) : rows.map((target, index) => (
              <tr key={target.code} aria-selected={selectedTarget === target.code} className={`hover:bg-page-muted/40 ${selectedTarget === target.code ? 'bg-page-muted/60' : ''}`}>
                <td className="px-2 py-3 text-center typo-metric-table text-ink-light">{index + 1}</td>
                <th scope="row" className="px-2 py-3 text-left font-medium text-ink-main"><button type="button" onClick={() => onSelectTarget(target.code)} className="text-left hover:underline focus:underline">{target.name}</button></th>
                <td className="px-2 py-3 text-right typo-metric-table text-ink-muted">{target.pairCount.toLocaleString()}</td>
                <td className={`px-2 py-3 text-right typo-metric-table ${measure === 'phonetic' ? 'bg-page-muted/60 text-cognate-ink' : 'text-cognate-ink'}`}>{(target.phoneticSimilarity * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</td>
                <td className={`px-2 py-3 text-right typo-metric-table ${measure === 'orthographic' ? 'bg-page-muted/60 text-divergent-ink' : 'text-divergent-ink'}`}>{(target.spellingSimilarity * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</td>
                <td className={`px-2 py-3 text-right typo-metric-table ${measure === 'semantic' ? 'bg-page-muted/60 text-ink-main' : 'text-ink-main'}`}>{(target.semanticSimilarity * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</td>
                <td className={`px-2 py-3 text-right typo-metric-table ${measure === 'cognates' ? 'bg-page-muted/60 text-cognate-ink' : 'text-cognate-ink'}`}>{((target.ratios.trueCognates + target.ratios.partialCognates) * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</td>
                <td className={`px-2 py-3 text-right typo-metric-table ${measure === 'false_friends' ? 'bg-page-muted/60 text-falsefriend-ink' : 'text-falsefriend-ink'}`}>{(target.ratios.falseFriends * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</td>
                <td className="px-2 py-3"><TaxonomyRatioBar ratios={target.ratios} compact /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
