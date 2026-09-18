import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useLanguagesQuery } from '../../services/queries';
import { getLanguageName, pairStatsToProfile } from '../../data/languages';
import type { LanguageProfile } from '../../types/linguistics';
import { TaxonomicRatioBar } from './TaxonomicRatioBar';
import { REGISTER_CONFIG } from '../../constants/config';

export type RegisterSort = 'ease' | 'minefield' | 'phonetic' | 'ancient';

interface KinshipRegisterProps {
  sort?: RegisterSort;
  onSortChange?: (sort: RegisterSort) => void;
}

export const KinshipRegister: React.FC<KinshipRegisterProps> = ({
  sort = 'ease',
  onSortChange,
}) => {
  const [internalSort, setInternalSort] = useState<RegisterSort>(sort);
  const activeSort = onSortChange ? sort : internalSort;

  const handleSort = (s: RegisterSort) => {
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
        case 'ancient':
          return b.ratios.identical - a.ratios.identical;
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

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 font-serif">
      {/* Chapter header */}
      <div className="border-b border-book-rule pb-8">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-main">
              Language register
            </h2>
            <p className="mt-3 text-lg text-ink-muted leading-relaxed max-w-3xl">
              A comparative reference showing calculated phonetic distance, spelling variation, and lexical composition derived from cataloged word pairs.
            </p>
          </div>

          {/* Anchor selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-sm text-ink-muted">Reference:</span>
            <select
              value={anchorLang}
              onChange={(e) => {
                setSelectedAnchor(e.target.value);
                setSelectedLangCode(null);
              }}
              className="rounded border border-book-rule bg-page-surface px-3 py-1.5 text-base font-bold text-ink-main focus:outline-none"
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
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-muted mr-1">Sort by:</span>
          <button
            type="button"
            onClick={() => handleSort('ease')}
            className={`rounded border px-3 py-1.5 text-sm transition-colors ${
              activeSort === 'ease'
                ? 'border-ink-main bg-page-muted font-bold text-ink-main'
                : 'border-book-rule bg-page-surface text-ink-muted hover:text-ink-main'
            }`}
          >
            Semantic closeness
          </button>
          <button
            type="button"
            onClick={() => handleSort('minefield')}
            className={`rounded border px-3 py-1.5 text-sm transition-colors ${
              activeSort === 'minefield'
                ? 'border-falsefriend-ink bg-falsefriend-bg font-bold text-falsefriend-ink'
                : 'border-book-rule bg-page-surface text-ink-muted hover:text-falsefriend-ink'
            }`}
          >
            False friends risk
          </button>
          <button
            type="button"
            onClick={() => handleSort('phonetic')}
            className={`rounded border px-3 py-1.5 text-sm transition-colors ${
              activeSort === 'phonetic'
                ? 'border-cognate-ink bg-cognate-bg font-bold text-cognate-ink'
                : 'border-book-rule bg-page-surface text-ink-muted hover:text-cognate-ink'
            }`}
          >
            Pronunciation similarity
          </button>
          <button
            type="button"
            onClick={() => handleSort('ancient')}
            className={`rounded border px-3 py-1.5 text-sm transition-colors ${
              activeSort === 'ancient'
                ? 'border-shifted-ink bg-shifted-bg font-bold text-shifted-ink'
                : 'border-book-rule bg-page-surface text-ink-muted hover:text-shifted-ink'
            }`}
          >
            Lexical overlap
          </button>
        </div>
      </div>

      {/* Main comparative table */}
      <div className="mt-8 overflow-x-auto rounded border border-book-rule bg-page-surface shadow-2xs">
        {isLoading && (
          <p className="py-12 text-center text-base text-ink-muted italic">
            Loading language register...
          </p>
        )}

        {!isLoading && sortedLanguages.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-xl font-bold text-ink-main">No comparison pairs in register</p>
            <p className="mt-2 text-base text-ink-muted max-w-md mx-auto">
              No target language comparisons are currently cataloged with {anchorName} as the source language.
            </p>
          </div>
        )}

        {!isLoading && sortedLanguages.length > 0 && (
          <table className="w-full text-left text-base border-collapse">
            <thead>
              <tr className="border-b border-book-rule bg-page-muted text-sm text-ink-muted">
                <th className="py-3.5 px-4 font-normal">Target language</th>
                <th className="py-3.5 px-4 font-normal text-right">Cataloged pairs</th>
                <th className="py-3.5 px-4 font-normal text-right">Pronunciation shift</th>
                <th className="py-3.5 px-4 font-normal text-right">Spelling distance</th>
                <th className="py-3.5 px-5 font-normal w-52">Vocabulary composition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-book-rule">
              {sortedLanguages.map((lang) => {
                const isSelected = selectedLang?.code === lang.code;
                return (
                  <tr
                    key={lang.code}
                    onClick={() => setSelectedLangCode(lang.code)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-page-muted' : 'hover:bg-page-bg/80'
                    }`}
                  >
                    <td className="py-4 px-4">
                      <span className="font-bold text-ink-main text-lg">{lang.name}</span>
                      {isSelected && (
                        <span className="ml-2 text-sm text-cognate-ink font-sans">●</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono text-base text-right text-ink-muted">
                      {lang.pairCount.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 font-mono text-base text-right text-cognate-ink">
                      {(lang.phoneticDistance * REGISTER_CONFIG.PERCENT_SCALE).toFixed(
                        REGISTER_CONFIG.PRECISION,
                      )}%
                    </td>
                    <td className="py-4 px-4 font-mono text-base text-right text-divergent-ink">
                      {(lang.spellingDistance * REGISTER_CONFIG.PERCENT_SCALE).toFixed(
                        REGISTER_CONFIG.PRECISION,
                      )}%
                    </td>
                    <td className="py-4 px-5">
                      <TaxonomicRatioBar ratios={lang.ratios} compact={true} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Selected language reading section */}
      {!isLoading && selectedLang && (
        <div className="mt-10 rounded border border-book-rule bg-page-surface p-8 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-book-rule pb-4 gap-2">
            <div>
              <h3 className="text-2xl font-bold text-ink-main">{selectedLang.name}</h3>
              <p className="text-sm text-ink-muted mt-0.5">
                {selectedLang.pairCount.toLocaleString()} cataloged word comparisons with {anchorName}
              </p>
            </div>
            <Link
              to="/specimens"
              search={{ source: anchorLang, target: selectedLang.code }}
              className="text-base text-cognate-ink underline decoration-1 hover:text-ink-main transition-colors"
            >
              Explore {anchorName}–{selectedLang.name} word pairs →
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-base text-ink-muted leading-relaxed">
            <div>
              <h4 className="font-bold text-ink-main mb-2">Lexical overlap</h4>
              <p>
                In the comparison dataset, <strong className="text-ink-main">{selectedLang.name}</strong> shares approximately{' '}
                <span className="font-mono text-cognate-ink font-bold">
                  {(selectedLang.ratios.identical * 100).toFixed(0)}%
                </span>{' '}
                of its cataloged root words directly with {anchorName} without significant semantic change. Another{' '}
                <span className="font-mono text-shifted-ink font-bold">
                  {(selectedLang.ratios.shifted * 100).toFixed(0)}%
                </span>{' '}
                of words show recognizable sound shifts.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-ink-main mb-2">False friends</h4>
              <p>
                Around{' '}
                <span className="font-mono text-falsefriend-ink font-bold">
                  {(selectedLang.ratios.falseFriends * 100).toFixed(0)}%
                </span>{' '}
                of similar-looking or sounding words between {anchorName} and {selectedLang.name} are deceptive false friends with divergent definitions.
              </p>
            </div>
          </div>

          {/* Detailed ratio legend bar */}
          <div className="mt-8 border-t border-book-rule pt-6">
            <h4 className="text-sm font-normal text-ink-muted mb-2">
              Vocabulary breakdown for {selectedLang.name}:
            </h4>
            <TaxonomicRatioBar ratios={selectedLang.ratios} compact={false} />
          </div>
        </div>
      )}
    </div>
  );
};
