import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { GERMANIC_LANGUAGES } from '../../data/languages';
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

  const sortedLanguages = useMemo(() => {
    const list = [...GERMANIC_LANGUAGES];
    return list.sort((a, b) => {
      switch (activeSort) {
        case 'ease':
          return a.everydayDistance - b.everydayDistance;
        case 'minefield':
          return b.ratios.falseFriends - a.ratios.falseFriends;
        case 'phonetic':
          return a.phoneticDistance - b.phoneticDistance;
        case 'ancient':
          return b.radarProfile.heritageSurvival - a.radarProfile.heritageSurvival;
        default:
          return 0;
      }
    });
  }, [activeSort]);

  const [selectedLang, setSelectedLang] = useState<LanguageProfile>(
    sortedLanguages[1] || sortedLanguages[0],
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 font-serif">
      {/* Chapter header */}
      <div className="border-b border-book-rule pb-8">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-main">
          Language overview
        </h2>
        <p className="mt-3 text-lg text-ink-muted leading-relaxed max-w-3xl">
          A comparative reference showing how closely related each Germanic language is to Swedish in everyday speech, pronunciation, and vocabulary.
        </p>

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
            Everyday similarity
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
            Old Germanic heritage
          </button>
        </div>
      </div>

      {/* Main comparative table */}
      <div className="mt-8 overflow-x-auto rounded border border-book-rule bg-page-surface shadow-2xs">
        <table className="w-full text-left text-base border-collapse">
          <thead>
            <tr className="border-b border-book-rule bg-page-muted text-sm text-ink-muted">
              <th className="py-3.5 px-4 font-normal">Language</th>
              <th className="py-3.5 px-4 font-normal">Branch</th>
              <th className="py-3.5 px-4 font-normal text-right">Everyday distance</th>
              <th className="py-3.5 px-4 font-normal text-right">Sound distance</th>
              <th className="py-3.5 px-4 font-normal text-right">Spelling distance</th>
              <th className="py-3.5 px-5 font-normal w-52">Vocabulary composition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-book-rule">
            {sortedLanguages.map((lang) => {
              const isSelected = selectedLang.code === lang.code;
              return (
                <tr
                  key={lang.code}
                  onClick={() => setSelectedLang(lang)}
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
                  <td className="py-4 px-4 text-sm text-ink-muted">
                    {lang.branch}
                  </td>
                  <td className="py-4 px-4 font-mono text-base text-right text-ink-main">
                    {(lang.everydayDistance * REGISTER_CONFIG.PERCENT_SCALE).toFixed(
                      REGISTER_CONFIG.PRECISION,
                    )}%
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
      </div>

      {/* Selected language reading section (Book entry) */}
      <div className="mt-10 rounded border border-book-rule bg-page-surface p-8 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-book-rule pb-4 gap-2">
          <div>
            <h3 className="text-2xl font-bold text-ink-main">{selectedLang.name}</h3>
            <p className="text-sm text-ink-muted mt-1">{selectedLang.branch} branch</p>
          </div>
          <Link
            to="/specimens"
            search={{ target: selectedLang.code }}
            className="text-base text-cognate-ink underline decoration-1 hover:text-ink-main transition-colors"
          >
            Explore Swedish–{selectedLang.name} word pairs →
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-base text-ink-muted leading-relaxed">
          <div>
            <h4 className="font-bold text-ink-main mb-2">Lexical overlap</h4>
            <p>
              In our comparison dataset, <strong className="text-ink-main">{selectedLang.name}</strong> shares approximately{' '}
              <span className="font-mono text-cognate-ink font-bold">
                {(selectedLang.ratios.identical * 100).toFixed(0)}%
              </span>{' '}
              of its everyday root words directly with Swedish without significant semantic change. Another{' '}
              <span className="font-mono text-shifted-ink font-bold">
                {(selectedLang.ratios.shifted * 100).toFixed(0)}%
              </span>{' '}
              of words are recognizable through regular consonant and vowel shifts.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-ink-main mb-2">False friends and sound shifts</h4>
            <p>
              Around{' '}
              <span className="font-mono text-falsefriend-ink font-bold">
                {(selectedLang.ratios.falseFriends * 100).toFixed(0)}%
              </span>{' '}
              of similar-sounding words between Swedish and {selectedLang.name} are deceptive false friends that carry different meanings in common usage.
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
    </div>
  );
};
