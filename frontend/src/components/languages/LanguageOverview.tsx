import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useLanguagesQuery } from '../../services/queries';
import { getLanguageName, pairStatsToProfile } from '../../data/languages';
import type { LanguageProfile } from '../../types/linguistics';
import { TaxonomyRatioBar } from './TaxonomyRatioBar';
import { REGISTER_CONFIG } from '../../constants/config';
import { LanguageSelect } from '../common/LanguagePicker';

export type LanguageSort =
  | 'ease'
  | 'minefield'
  | 'phonetic'
  | 'cognates'
  | 'spelling'
  | 'pairs'
  | 'name';

export interface LanguageOverviewProps {
  sort?: LanguageSort;
  onSortChange?: (sort: LanguageSort) => void;
}

export const LanguageOverview: React.FC<LanguageOverviewProps> = ({
  sort = 'ease',
  onSortChange,
}) => {
  const [internalSort, setInternalSort] = useState<LanguageSort>(sort);
  const activeSort = onSortChange ? sort : internalSort;

  const handleSort = (s: LanguageSort) => {
    if (onSortChange) onSortChange(s);
    else setInternalSort(s);
  };

  const { data: languagesData, isLoading } = useLanguagesQuery();
  const [selectedAnchor, setSelectedAnchor] = useState<string | null>(null);

  const availableLanguages = languagesData?.languages ?? [];
  const defaultAnchor = availableLanguages[0] ?? 'sv';
  const anchorLang =
    selectedAnchor && availableLanguages.includes(selectedAnchor)
      ? selectedAnchor
      : defaultAnchor;

  const targetProfiles: LanguageProfile[] = useMemo(() => {
    if (!languagesData?.pairs) return [];
    return languagesData.pairs
      .filter((p) => p.source === anchorLang)
      .map(pairStatsToProfile);
  }, [languagesData, anchorLang]);

  const sortedLanguages = useMemo(() => {
    const list = [...targetProfiles];
    return list.sort((a, b) => {
      switch (activeSort) {
        case 'ease':
          return a.semanticDistance - b.semanticDistance;
        case 'minefield':
          return b.ratios.falseFriends - a.ratios.falseFriends;
        case 'phonetic':
          return a.phoneticDistance - b.phoneticDistance;
        case 'cognates':
          return (
            b.ratios.trueCognates +
            b.ratios.partialCognates -
            (a.ratios.trueCognates + a.ratios.partialCognates)
          );
        case 'spelling':
          return a.spellingDistance - b.spellingDistance;
        case 'pairs':
          return b.pairCount - a.pairCount;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [targetProfiles, activeSort]);

  const [selectedLangCode, setSelectedLangCode] = useState<string | null>(null);

  const selectedLang =
    sortedLanguages.find((l) => l.code === selectedLangCode) || sortedLanguages[0];

  const anchorName = getLanguageName(anchorLang);
  const selectableLanguages = availableLanguages.length > 0 ? availableLanguages : [anchorLang];

  const renderSortIndicator = (s: LanguageSort, alt?: LanguageSort) => {
    const isActive = activeSort === s || (alt && activeSort === alt);
    if (!isActive) return null;
    return <span className="ml-1 text-ink-main font-semibold">↓</span>;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-5 font-sans">
      {/* Overview header */}
      <div className="pb-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="typo-page-title">
            Language Overview
          </h1>
          <p className="typo-page-deck mt-1.5">
            Pairwise comparative statistics showing phonetic distance, spelling variation, and lexical composition derived from cataloged word pairs.
          </p>
        </div>

        {/* Reference selector matching ComparativeLexicon */}
        <LanguageSelect
          label="Reference:"
          value={anchorLang}
          languages={selectableLanguages}
          onChange={(code) => {
            setSelectedAnchor(code);
            setSelectedLangCode(null);
          }}
          plate
        />
      </div>

      {/* Sort filters matching table columns order */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="typo-sublabel mr-1">Sort by:</span>
        <button
          type="button"
          onClick={() => handleSort('name')}
          className={`px-2.5 py-1 border typo-sublabel transition-colors ${
            activeSort === 'name'
              ? 'border-ink-main bg-page-muted text-ink-main'
              : 'border-book-rule bg-page-surface text-ink-muted hover:text-ink-main'
          }`}
        >
          Target language
        </button>
        <button
          type="button"
          onClick={() => handleSort('pairs')}
          className={`px-2.5 py-1 border typo-sublabel transition-colors ${
            activeSort === 'pairs'
              ? 'border-ink-main bg-page-muted text-ink-main'
              : 'border-book-rule bg-page-surface text-ink-muted hover:text-ink-main'
          }`}
        >
          Word pairs
        </button>
        <button
          type="button"
          onClick={() => handleSort('phonetic')}
          className={`px-2.5 py-1 border typo-sublabel transition-colors ${
            activeSort === 'phonetic'
              ? 'border-cognate-ink bg-cognate-bg text-cognate-ink'
              : 'border-book-rule bg-page-surface text-ink-muted hover:text-cognate-ink'
          }`}
        >
          Pronunciation distance
        </button>
        <button
          type="button"
          onClick={() => handleSort('spelling')}
          className={`px-2.5 py-1 border typo-sublabel transition-colors ${
            activeSort === 'spelling'
              ? 'border-divergent-ink bg-divergent-bg text-divergent-ink'
              : 'border-book-rule bg-page-surface text-ink-muted hover:text-divergent-ink'
          }`}
        >
          Spelling distance
        </button>
        <button
          type="button"
          onClick={() => handleSort('ease')}
          className={`px-2.5 py-1 border typo-sublabel transition-colors ${
            activeSort === 'ease'
              ? 'border-ink-main bg-page-muted text-ink-main'
              : 'border-book-rule bg-page-surface text-ink-muted hover:text-ink-main'
          }`}
        >
          Semantic distance
        </button>
        <button
          type="button"
          onClick={() => handleSort('cognates')}
          className={`px-2.5 py-1 border typo-sublabel transition-colors ${
            activeSort === 'cognates'
              ? 'border-shifted-ink bg-shifted-bg text-shifted-ink'
              : 'border-book-rule bg-page-surface text-ink-muted hover:text-shifted-ink'
          }`}
        >
          Cognates %
        </button>
        <button
          type="button"
          onClick={() => handleSort('minefield')}
          className={`px-2.5 py-1 border typo-sublabel transition-colors ${
            activeSort === 'minefield'
              ? 'border-falsefriend-ink bg-falsefriend-bg text-falsefriend-ink'
              : 'border-book-rule bg-page-surface text-ink-muted hover:text-falsefriend-ink'
          }`}
        >
          False friends %
        </button>
      </div>

      {/* Main comparative table matching LexiconTable */}
      <div className="overflow-x-auto border border-book-rule bg-page-surface shadow-2xs">
        {isLoading && (
          <p className="py-12 text-center typo-gloss">
            Loading language comparisons...
          </p>
        )}

        {!isLoading && sortedLanguages.length === 0 && (
          <div className="py-16 text-center">
            <p className="typo-section-header font-medium">No comparisons found</p>
            <p className="mt-2 typo-body text-ink-muted max-w-md mx-auto">
              No target language comparisons are currently cataloged with {anchorName} as the source language.
            </p>
          </div>
        )}

        {!isLoading && sortedLanguages.length > 0 && (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-page-bg">
              <tr className="border-b-2 border-book-rule-strong typo-overline select-none">
                <th className="py-3.5 px-3 w-10 text-center">#</th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3.5 px-4 cursor-pointer hover:text-ink-main transition-colors"
                >
                  Target language{renderSortIndicator('name')}
                </th>
                <th
                  onClick={() => handleSort('pairs')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-ink-main transition-colors"
                >
                  Word pairs{renderSortIndicator('pairs')}
                </th>
                <th
                  onClick={() => handleSort('phonetic')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-ink-main transition-colors"
                >
                  Pronunciation dist.{renderSortIndicator('phonetic')}
                </th>
                <th
                  onClick={() => handleSort('spelling')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-ink-main transition-colors"
                >
                  Spelling dist.{renderSortIndicator('spelling')}
                </th>
                <th
                  onClick={() => handleSort('ease')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-ink-main transition-colors"
                >
                  Semantic dist.{renderSortIndicator('ease')}
                </th>
                <th
                  onClick={() => handleSort('cognates')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-ink-main transition-colors"
                >
                  Cognates %{renderSortIndicator('cognates')}
                </th>
                <th
                  onClick={() => handleSort('minefield')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-ink-main transition-colors"
                >
                  False friends %{renderSortIndicator('minefield')}
                </th>
                <th className="py-3.5 px-4 w-44">Vocabulary composition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-book-rule/50">
              {sortedLanguages.map((lang, idx) => {
                const isSelected = selectedLang?.code === lang.code;
                const cognatesPct = (
                  (lang.ratios.trueCognates + lang.ratios.partialCognates) *
                  REGISTER_CONFIG.PERCENT_SCALE
                ).toFixed(0);
                const falseFriendsPct = (
                  lang.ratios.falseFriends * REGISTER_CONFIG.PERCENT_SCALE
                ).toFixed(0);

                return (
                  <tr
                    key={lang.code}
                    onClick={() => setSelectedLangCode(lang.code)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-page-muted/90 border-l-2 border-l-ink-main font-medium'
                        : 'hover:bg-page-muted/40'
                    }`}
                  >
                    <td className="py-3 px-3 typo-metric-table text-ink-light text-center">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <span className="typo-headword-row text-ink-main">
                        {lang.name}
                      </span>
                      {isSelected && (
                        <span className="ml-2 typo-sublabel text-cognate-ink">●</span>
                      )}
                    </td>
                    <td className="py-3 px-3 typo-metric-table text-right text-ink-muted">
                      {lang.pairCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 typo-metric-table text-right text-cognate-ink">
                      {(lang.phoneticDistance * REGISTER_CONFIG.PERCENT_SCALE).toFixed(
                        REGISTER_CONFIG.PRECISION,
                      )}%
                    </td>
                    <td className="py-3 px-3 typo-metric-table text-right text-divergent-ink">
                      {(lang.spellingDistance * REGISTER_CONFIG.PERCENT_SCALE).toFixed(
                        REGISTER_CONFIG.PRECISION,
                      )}%
                    </td>
                    <td className="py-3 px-3 typo-metric-table text-right text-ink-main">
                      {(lang.semanticDistance * REGISTER_CONFIG.PERCENT_SCALE).toFixed(
                        REGISTER_CONFIG.PRECISION,
                      )}%
                    </td>
                    <td className="py-3 px-3 typo-metric-table text-right text-cognate-ink">
                      {cognatesPct}%
                    </td>
                    <td className="py-3 px-3 typo-metric-table text-right text-falsefriend-ink">
                      {falseFriendsPct}%
                    </td>
                    <td className="py-3 px-4">
                      <TaxonomyRatioBar ratios={lang.ratios} compact={true} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Selected language reading section matching WordPairDetails */}
      {!isLoading && selectedLang && (
        <div className="mt-8 rounded border border-book-rule bg-page-surface p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-book-rule pb-3 gap-2">
            <div>
              <div className="flex items-baseline gap-3">
                <h3 className="typo-headword-display text-ink-main">
                  {selectedLang.name}
                </h3>
                <span className="typo-lang-code">
                  {selectedLang.code.toUpperCase()}
                </span>
              </div>
              <p className="typo-note mt-1">
                {selectedLang.pairCount.toLocaleString()} evaluated word pairs with {anchorName}
              </p>
            </div>
            <Link
              to="/lexicon"
              search={{ source: anchorLang, target: selectedLang.code }}
              className="typo-sublabel text-cognate-ink underline decoration-1 hover:text-ink-main transition-colors"
            >
              Explore {anchorName}–{selectedLang.name} word pairs →
            </Link>
          </div>

          {/* Detailed ratio legend bar */}
          <div className="pt-1">
            <div className="typo-sublabel mb-2">
              Vocabulary composition for {selectedLang.name}:
            </div>
            <TaxonomyRatioBar ratios={selectedLang.ratios} compact={false} />
          </div>

          {/* Category breakdown explanations covering all taxonomy categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 typo-body text-ink-muted border-t border-book-rule pt-5">
            {/* True Cognates */}
            <div>
              <div className="typo-section-header font-medium border-b border-book-rule pb-1.5 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-xs bg-cognate-ink" />
                  <span>True cognates</span>
                </span>
                <span className="typo-metric-table text-cognate-ink font-semibold">
                  {(selectedLang.ratios.trueCognates * 100).toFixed(0)}%
                </span>
              </div>
              <p>
                In the cataloged dataset, approximately{' '}
                <strong className="text-ink-main font-medium">
                  {(selectedLang.ratios.trueCognates * 100).toFixed(0)}%
                </strong>{' '}
                of words share direct ancestral roots and unchanged definitions with {anchorName}. These represent intuitive cross-linguistic vocabulary anchors with minimal semantic friction.
              </p>
            </div>

            {/* Partial Cognates */}
            <div>
              <div className="typo-section-header font-medium border-b border-book-rule pb-1.5 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-xs bg-shifted-ink" />
                  <span>Partial cognates</span>
                </span>
                <span className="typo-metric-table text-shifted-ink font-semibold">
                  {(selectedLang.ratios.partialCognates * 100).toFixed(0)}%
                </span>
              </div>
              <p>
                About{' '}
                <strong className="text-ink-main font-medium">
                  {(selectedLang.ratios.partialCognates * 100).toFixed(0)}%
                </strong>{' '}
                of pairs stem from common etymological origins but have undergone semantic specialization, broadening, or sound shifts, leaving only partial definition overlap with {anchorName}.
              </p>
            </div>

            {/* False Friends */}
            <div>
              <div className="typo-section-header font-medium border-b border-book-rule pb-1.5 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-xs bg-falsefriend-ink" />
                  <span>False friends</span>
                </span>
                <span className="typo-metric-table text-falsefriend-ink font-semibold">
                  {(selectedLang.ratios.falseFriends * 100).toFixed(0)}%
                </span>
              </div>
              <p>
                Around{' '}
                <strong className="text-ink-main font-medium">
                  {(selectedLang.ratios.falseFriends * 100).toFixed(0)}%
                </strong>{' '}
                of similar-sounding or looking words between {anchorName} and {selectedLang.name} are deceptive lookalikes with divergent definitions, arising from semantic drift or surface collisions.
              </p>
            </div>

            {/* Translation Pairs */}
            <div>
              <div className="typo-section-header font-medium border-b border-book-rule pb-1.5 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-xs bg-divergent-ink" />
                  <span>Translation pairs</span>
                </span>
                <span className="typo-metric-table text-divergent-ink font-semibold">
                  {(selectedLang.ratios.translationPairs * 100).toFixed(0)}%
                </span>
              </div>
              <p>
                Roughly{' '}
                <strong className="text-ink-main font-medium">
                  {(selectedLang.ratios.translationPairs * 100).toFixed(0)}%
                </strong>{' '}
                of words serve as direct functional equivalents despite descending from completely distinct root words, reflecting standard cross-linguistic lexical divergence.
              </p>
            </div>

            {/* Other / Unclassified */}
            {selectedLang.ratios.other > 0.001 && (
              <div className="md:col-span-2">
                <div className="typo-section-header font-medium border-b border-book-rule pb-1.5 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-xs bg-book-rule-strong" />
                    <span>Other & unclassified</span>
                  </span>
                  <span className="typo-metric-table text-ink-muted font-semibold">
                    {(selectedLang.ratios.other * 100).toFixed(0)}%
                  </span>
                </div>
                <p>
                  The remaining{' '}
                  <strong className="text-ink-main font-medium">
                    {(selectedLang.ratios.other * 100).toFixed(0)}%
                  </strong>{' '}
                  of cataloged pairs encompass specialized compounds, loan translations, or items outside the four primary cognate categories.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


