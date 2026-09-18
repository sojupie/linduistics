import React, { useState, useMemo } from 'react';
import { GERMANIC_LANGUAGES } from '../../data/languages';
import type { LanguageProfile } from '../../types/linguistics';
import { TaxonomicRatioBar } from './TaxonomicRatioBar';
import { ExpeditionRadarChart } from '../radar/ExpeditionRadarChart';
import { REGISTER_CONFIG, TOOLBAR_CONFIG } from '../../constants/config';
import { ArrowUpDown, ShieldAlert, Sparkles, Volume2, Bookmark } from 'lucide-react';

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

  const anchor = GERMANIC_LANGUAGES[0]; // Swedish as canonical baseline

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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header Ledger Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border-hairline pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-specimen-moss">
              Series Linnaea · Tabula Generalis
            </span>
            <span className="rounded border border-border-hairline bg-substrate-panel px-2 py-0.5 font-mono text-[9px] uppercase text-ink-muted">
              8 Germanic Taxa
            </span>
          </div>
          <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight text-ink-carbon">
            Comparative Kinship Register
          </h2>
          <p className="mt-1.5 font-serif text-sm italic text-ink-muted max-w-2xl">
            A taxonomic survey of Germanic lexical proximity, sound-shift coefficients, and false-friend frequency, indexed against canonical Svecana.
          </p>
        </div>

        {/* Sorting Ledger Controls */}
        <div className="flex flex-wrap items-center gap-1.5 rounded border border-border-hairline bg-substrate-panel p-1">
          <button
            type="button"
            onClick={() => handleSort('ease')}
            className={`flex items-center gap-1.5 rounded px-3 py-1 font-serif text-xs transition-colors ${
              activeSort === 'ease'
                ? 'bg-substrate-dark font-bold text-ink-carbon shadow-xs'
                : 'text-ink-muted hover:text-ink-carbon'
            }`}
          >
            <ArrowUpDown size={TOOLBAR_CONFIG.ICON_SIZE_SM} />
            Everyday Intelligibility
          </button>
          <button
            type="button"
            onClick={() => handleSort('minefield')}
            className={`flex items-center gap-1.5 rounded px-3 py-1 font-serif text-xs transition-colors ${
              activeSort === 'minefield'
                ? 'bg-substrate-dark font-bold text-specimen-oxblood shadow-xs'
                : 'text-ink-muted hover:text-ink-carbon'
            }`}
          >
            <ShieldAlert size={TOOLBAR_CONFIG.ICON_SIZE_SM} className="text-specimen-oxblood" />
            Deception Traps
          </button>
          <button
            type="button"
            onClick={() => handleSort('phonetic')}
            className={`flex items-center gap-1.5 rounded px-3 py-1 font-serif text-xs transition-colors ${
              activeSort === 'phonetic'
                ? 'bg-substrate-dark font-bold text-specimen-moss shadow-xs'
                : 'text-ink-muted hover:text-ink-carbon'
            }`}
          >
            <Volume2 size={TOOLBAR_CONFIG.ICON_SIZE_SM} className="text-specimen-moss" />
            Acoustic / IPA
          </button>
          <button
            type="button"
            onClick={() => handleSort('ancient')}
            className={`flex items-center gap-1.5 rounded px-3 py-1 font-serif text-xs transition-colors ${
              activeSort === 'ancient'
                ? 'bg-substrate-dark font-bold text-specimen-ochre shadow-xs'
                : 'text-ink-muted hover:text-ink-carbon'
            }`}
          >
            <Sparkles size={TOOLBAR_CONFIG.ICON_SIZE_SM} className="text-specimen-ochre" />
            Archaic Retention
          </button>
        </div>
      </div>

      {/* Main Grid: Ledger Table + Radar Dossier */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Tabular Register (Left 8 Cols) */}
        <div className="lg:col-span-8 overflow-x-auto rounded border border-border-hairline bg-substrate-panel shadow-sm">
          <table className="w-full text-left font-serif text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-hairline bg-substrate-dark/80 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                <th className="py-3 px-3 w-10 text-center">Class</th>
                <th className="py-3 px-4">Taxon & Lineage</th>
                <th className="py-3 px-3 text-right">Distance (δ)</th>
                <th className="py-3 px-3 text-right">Acoustic</th>
                <th className="py-3 px-3 text-right">Spelling</th>
                <th className="py-3 px-4 w-44">Cognate Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline">
              {sortedLanguages.map((lang, index) => {
                const isSelected = selectedLang.code === lang.code;
                const romanNumeral =
                  REGISTER_CONFIG.ROMAN_NUMERALS[index] ?? `NO. ${index + 1}`;
                const isNorth = lang.branch === 'North Germanic';

                return (
                  <tr
                    key={lang.code}
                    onClick={() => setSelectedLang(lang)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-substrate-dark'
                        : 'hover:bg-substrate-dark/50'
                    }`}
                  >
                    {/* Roman Numeral Class */}
                    <td className="py-3 px-3 font-mono text-center text-ink-faint">
                      {romanNumeral}
                    </td>

                    {/* Taxon & Latin Nomenclature */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink-carbon text-sm">
                          {lang.name}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.2 font-mono text-[9px] uppercase ${
                            isNorth
                              ? 'bg-specimen-moss/15 text-specimen-moss'
                              : 'bg-specimen-ochre/15 text-specimen-ochre'
                          }`}
                        >
                          {lang.branch}
                        </span>
                      </div>
                      <p className="font-serif text-[11px] italic text-ink-muted">
                        {lang.taxonomicName}
                      </p>
                    </td>

                    {/* Everyday Distance */}
                    <td className="py-3 px-3 font-mono text-right text-ink-carbon">
                      δ {(lang.everydayDistance * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%
                    </td>

                    {/* Phonetic Distance */}
                    <td className="py-3 px-3 font-mono text-right text-specimen-moss">
                      {(lang.phoneticDistance * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%
                    </td>

                    {/* Spelling Distance */}
                    <td className="py-3 px-3 font-mono text-right text-specimen-irongall">
                      {(lang.spellingDistance * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%
                    </td>

                    {/* Taxonomic Ratio Bar */}
                    <td className="py-3 px-4">
                      <TaxonomicRatioBar ratios={lang.ratios} compact={true} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Selected Specimen Radar & Dossier (Right 4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <ExpeditionRadarChart
            primary={selectedLang}
            comparison={selectedLang.code !== anchor.code ? anchor : undefined}
          />

          {/* Morphological Analysis Marginalia */}
          <div className="rounded border border-border-hairline bg-substrate-panel p-5 font-serif text-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-border-hairline pb-2 font-mono text-[10px] uppercase tracking-wider text-specimen-moss">
              <Bookmark size={TOOLBAR_CONFIG.ICON_SIZE_SM} />
              <span>Taxonomic Dossier: {selectedLang.name}</span>
            </div>

            <p className="text-ink-muted leading-relaxed">
              Observed from Stockholm reference collection: <strong className="text-ink-carbon">{selectedLang.name}</strong> displays{' '}
              <span className="font-mono text-specimen-moss">
                {(selectedLang.ratios.identical * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%
              </span>{' '}
              unbroken core cognates with Swedish, alongside a{' '}
              <span className="font-mono text-specimen-oxblood">
                {(selectedLang.ratios.falseFriends * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%
              </span>{' '}
              incidence of deceptive homophonic shifts.
            </p>

            <div className="pt-2 border-t border-border-hairline/60 grid grid-cols-2 gap-3 font-mono text-[11px]">
              <div>
                <span className="text-ink-faint block text-[9px] uppercase">
                  Heritage Retention
                </span>
                <span className="text-specimen-ochre">
                  {(selectedLang.radarProfile.heritageSurvival * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}% PGmc
                </span>
              </div>
              <div>
                <span className="text-ink-faint block text-[9px] uppercase">
                  Classical Borrowing
                </span>
                <span className="text-specimen-irongall">
                  {(selectedLang.radarProfile.classicalLoanwords * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}% Latin
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
