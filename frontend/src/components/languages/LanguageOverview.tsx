import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useLanguagesQuery } from '../../services/queries';
import { getLanguageName, pairStatsToProfile } from '../../data/languages';
import type { LanguageProfile } from '../../types/linguistics';
import { TaxonomyRatioBar } from './TaxonomyRatioBar';
import { REGISTER_CONFIG } from '../../constants/config';

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
          <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-ink-main font-header">
            Language Overview
          </h1>
          <p className="text-base sm:text-lg text-ink-muted mt-1.5 font-deck font-normal">
            Pairwise comparative statistics showing phonetic distance, spelling variation, and lexical composition derived from cataloged word pairs.
          </p>
        </div>

        {/* Reference selector matching ComparativeLexicon */}
        <div className="flex items-center gap-3 bg-page-surface border border-book-rule px-3.5 py-2 shadow-2xs self-start md:self-auto">
          <span className="text-ink-muted font-deck text-sm font-medium">Reference:</span>
          <select
            value={anchorLang}
            onChange={(e) => {
              setSelectedAnchor(e.target.value);
              setSelectedLangCode(null);
            }}
            className="bg-page-bg border border-book-rule px-2.5 py-1 text-sm sm:text-base font-deck font-medium text-ink-main hover:border-book-rule-strong focus:border-ink-main focus:outline-none cursor-pointer"
          >
            {selectableLanguages.map((code) => (
              <option key={code} value={code}>
                {getLanguageName(code)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sort filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-ink-muted font-deck text-sm font-medium mr-1">Sort by:</span>
        <button
          type="button"
          onClick={() => handleSort('ease')}
          className={`px-2.5 py-1 border text-sm font-deck font-medium transition-colors ${
            activeSort === 'ease'
              ? 'border-ink-main bg-page-muted text-ink-main'
              : 'border-book-rule bg-page-surface text-ink-muted hover:text-ink-main'
          }`}
        >
          Semantic distance
        </button>
        <button
          type="button"
          onClick={() => handleSort('phonetic')}
          className={`px-2.5 py-1 border text-sm font-deck font-medium transition-colors ${
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
          className={`px-2.5 py-1 border text-sm font-deck font-medium transition-colors ${
            activeSort === 'spelling'
              ? 'border-divergent-ink bg-divergent-bg text-divergent-ink'
              : 'border-book-rule bg-page-surface text-ink-muted hover:text-divergent-ink'
          }`}
        >
          Spelling distance
        </button>
        <button
          type="button"
          onClick={() => handleSort('cognates')}
          className={`px-2.5 py-1 border text-sm font-deck font-medium transition-colors ${
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
          className={`px-2.5 py-1 border text-sm font-deck font-medium transition-colors ${
            activeSort === 'minefield'
              ? 'border-falsefriend-ink bg-falsefriend-bg text-falsefriend-ink'
              : 'border-book-rule bg-page-surface text-ink-muted hover:text-falsefriend-ink'
          }`}
        >
          False friends %
        </button>
        <button
          type="button"
          onClick={() => handleSort('pairs')}
          className={`px-2.5 py-1 border text-sm font-deck font-medium transition-colors ${
            activeSort === 'pairs'
              ? 'border-ink-main bg-page-muted text-ink-main'
              : 'border-book-rule bg-page-surface text-ink-muted hover:text-ink-main'
          }`}
        >
          Word pairs
        </button>
      </div>

      {/* Main comparative table matching LexiconTable */}
      <div className="overflow-x-auto border border-book-rule bg-page-surface shadow-2xs">
        {isLoading && (
          <p className="py-12 text-center text-ink-muted italic table-gloss">
            Loading language comparisons...
          </p>
        )}

        {!isLoading && sortedLanguages.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-xl font-medium text-ink-main font-deck">No comparisons found</p>
            <p className="mt-2 text-base text-ink-muted max-w-md mx-auto">
              No target language comparisons are currently cataloged with {anchorName} as the source language.
            </p>
          </div>
        )}

        {!isLoading && sortedLanguages.length > 0 && (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-page-bg">
              <tr className="border-b-2 border-book-rule-strong text-xs uppercase tracking-wider text-ink-muted font-deck font-medium select-none">
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
                    <td className="py-3 px-3 text-xs font-mono text-ink-light text-center tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <span className="table-lemma font-deck font-medium text-ink-main">
                        {lang.name}
                      </span>
                      {isSelected && (
                        <span className="ml-2 text-xs text-cognate-ink">●</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-sm tabular-nums text-right text-ink-muted">
                      {lang.pairCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-sm tabular-nums font-medium text-right text-cognate-ink">
                      {(lang.phoneticDistance * REGISTER_CONFIG.PERCENT_SCALE).toFixed(
                        REGISTER_CONFIG.PRECISION,
                      )}%
                    </td>
                    <td className="py-3 px-3 text-sm tabular-nums font-medium text-right text-divergent-ink">
                      {(lang.spellingDistance * REGISTER_CONFIG.PERCENT_SCALE).toFixed(
                        REGISTER_CONFIG.PRECISION,
                      )}%
                    </td>
                    <td className="py-3 px-3 text-sm tabular-nums font-medium text-right text-ink-main">
                      {(lang.semanticDistance * REGISTER_CONFIG.PERCENT_SCALE).toFixed(
                        REGISTER_CONFIG.PRECISION,
                      )}%
                    </td>
                    <td className="py-3 px-3 text-sm tabular-nums font-medium text-right text-cognate-ink">
                      {cognatesPct}%
                    </td>
                    <td className="py-3 px-3 text-sm tabular-nums font-medium text-right text-falsefriend-ink">
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
                <h3 className="font-deck text-2xl font-medium text-ink-main tracking-tight leading-tight">
                  {selectedLang.name}
                </h3>
                <span className="text-xs font-mono font-medium text-ink-muted uppercase bg-page-muted px-2 py-0.5 border border-book-rule">
                  {selectedLang.code.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-1 font-deck">
                {selectedLang.pairCount.toLocaleString()} evaluated word pairs with {anchorName}
              </p>
            </div>
            <Link
              to="/lexicon"
              search={{ source: anchorLang, target: selectedLang.code }}
              className="text-sm font-deck font-medium text-cognate-ink underline decoration-1 hover:text-ink-main transition-colors"
            >
              Explore {anchorName}–{selectedLang.name} word pairs →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-ink-muted leading-relaxed">
            <div>
              <div className="font-deck text-base text-ink-main font-normal border-b border-book-rule pb-1.5 mb-2">
                Lexical overlap & cognates
              </div>
              <p>
                In the comparison dataset, <strong className="font-medium text-ink-main">{selectedLang.name}</strong> shares approximately{' '}
                <span className="tabular-nums text-cognate-ink font-medium">
                  {(selectedLang.ratios.trueCognates * 100).toFixed(0)}%
                </span>{' '}
                of its cataloged root words directly with {anchorName} as true cognates without significant semantic change. Another{' '}
                <span className="tabular-nums text-shifted-ink font-medium">
                  {(selectedLang.ratios.partialCognates * 100).toFixed(0)}%
                </span>{' '}
                of words show partial cognates and sound shifts.
              </p>
            </div>

            <div>
              <div className="font-deck text-base text-ink-main font-normal border-b border-book-rule pb-1.5 mb-2">
                False friends
              </div>
              <p>
                Around{' '}
                <span className="tabular-nums text-falsefriend-ink font-medium">
                  {(selectedLang.ratios.falseFriends * 100).toFixed(0)}%
                </span>{' '}
                of similar-looking or sounding words between {anchorName} and {selectedLang.name} are deceptive false friends with divergent definitions.
              </p>
            </div>
          </div>

          {/* Detailed ratio legend bar */}
          <div className="border-t border-book-rule pt-4">
            <div className="text-xs font-deck font-medium text-ink-muted mb-2">
              Vocabulary breakdown for {selectedLang.name}:
            </div>
            <TaxonomyRatioBar ratios={selectedLang.ratios} compact={false} />
          </div>
        </div>
      )}
    </div>
  );
};


