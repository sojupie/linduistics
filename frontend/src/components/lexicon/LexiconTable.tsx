import React from 'react';
import type { WordPair } from '../../types/linguistics';
import { getLanguageName } from '../../data/languages';
import { WordHeadword } from '../common/Phonetic';

interface LexiconTableProps {
  pairs: WordPair[];
  total: number;
  limit: number;
  offset: number;
  sourceLang: string;
  targetLang: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string | undefined;
  onCategoryChange: (cat: string | undefined) => void;
  selectedFfType: string | undefined;
  onFfTypeChange: (tier: string | undefined) => void;
  onPageChange: (newOffset: number) => void;
  onLimitChange: (newLimit: number) => void;
  onSelectPair: (pair: WordPair) => void;
  selectedPairId: number | null;
  isLoading: boolean;
}

export const LexiconTable: React.FC<LexiconTableProps> = ({
  pairs,
  total,
  limit,
  offset,
  sourceLang,
  targetLang,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedFfType,
  onFfTypeChange,
  onPageChange,
  onLimitChange,
  onSelectPair,
  selectedPairId,
  isLoading,
}) => {
  const sourceName = getLanguageName(sourceLang);
  const targetName = getLanguageName(targetLang);

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit) || 1;
  const startItem = total === 0 ? 0 : offset + 1;
  const endItem = Math.min(offset + limit, total);

  const getTaxonomyLabel = (pair: WordPair) => {
    switch (pair.category) {
      case 'true_cognate':
        return (
          <span className="typo-badge px-2 py-0.5 rounded bg-cognate-bg text-cognate-ink whitespace-nowrap">
            True Cognate
          </span>
        );
      case 'false_friend':
        return (
          <div className="inline-flex flex-col items-center leading-tight">
            <span className="typo-badge px-2 py-0.5 rounded bg-falsefriend-bg text-falsefriend-ink whitespace-nowrap">
              False Friend
            </span>
            {pair.falseFriendType && (
              <span className="typo-subscript text-ink-muted text-2xs mt-0.5 whitespace-nowrap">
                {pair.falseFriendType === 'etymological_shift' ? 'shared root' : 'lookalike'}
              </span>
            )}
          </div>
        );
      case 'partial_cognate':
        return (
          <span className="typo-badge px-2 py-0.5 rounded bg-shifted-bg text-shifted-ink whitespace-nowrap">
            Partial Cognate
          </span>
        );
      case 'translation_pair':
        return (
          <span className="typo-badge px-2 py-0.5 rounded bg-divergent-bg text-divergent-ink whitespace-nowrap">
            Translation Pair
          </span>
        );
      default:
        return (
          <span className="typo-badge px-2 py-0.5 rounded bg-page-muted text-ink-muted whitespace-nowrap">
            Other
          </span>
        );
    }
  };

  const getMeaningDisplay = (pair: WordPair) => {
    // 1. Check for active aligned sense matches
    const matchA = pair.sensesA?.find((s) => s.is_active_match)?.gloss;
    const matchB = pair.sensesB?.find((s) => s.is_active_match)?.gloss;
    if (matchA && matchB && matchA.toLowerCase() !== matchB.toLowerCase()) {
      return `“${matchA}” ↔ “${matchB}”`;
    }
    if (matchB && matchB.toLowerCase() !== pair.wordB.toLowerCase()) {
      return `“${matchB}”`;
    }
    if (matchA && matchA.toLowerCase() !== pair.wordA.toLowerCase()) {
      return `“${matchA}”`;
    }

    // 2. Check definition strings
    if (pair.defB && pair.defB.trim()) {
      return `“${pair.defB.trim()}”`;
    }
    if (pair.defA && pair.defA.trim()) {
      return `“${pair.defA.trim()}”`;
    }

    // 3. Fallback to first sense gloss
    if (pair.sensesB?.[0]?.gloss) {
      return `“${pair.sensesB[0].gloss}”`;
    }
    if (pair.sensesA?.[0]?.gloss) {
      return `“${pair.sensesA[0].gloss}”`;
    }

    return pair.category === 'true_cognate'
      ? `“${pair.wordA}” (identical shared cognate)`
      : `“${pair.wordA}” ↔ “${pair.wordB}”`;
  };

  return (
    <div className="h-full flex flex-col min-h-0 font-serif">
      {/* Search & Lexicon Controls */}
      <div className="flex-none flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-book-rule pb-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search word pairs by headword or meaning..."
            className="w-full border-b border-book-rule bg-transparent py-1 typo-body text-ink-main placeholder:text-ink-muted/60 focus:border-ink-main focus:outline-none"
          />
        </div>

        {/* Category & Tier Filters */}
        <div className="flex flex-wrap items-center gap-4 font-serif">
          <div className="flex items-center gap-2">
            <span className="typo-sublabel">Taxonomy:</span>
            <select
              value={selectedCategory ?? 'all'}
              onChange={(e) => onCategoryChange(e.target.value === 'all' ? undefined : e.target.value)}
              className="border-b border-book-rule bg-transparent py-0.5 typo-sublabel font-serif text-ink-main focus:border-ink-main focus:outline-none cursor-pointer"
            >
              <option value="all">All Taxonomy</option>
              <option value="true_cognate">True Cognates</option>
              <option value="false_friend">False Friends</option>
              <option value="partial_cognate">Partial Cognates</option>
              <option value="translation_pair">Translation Pairs</option>
              <option value="other">Other</option>
            </select>
          </div>

          {selectedCategory === 'false_friend' && (
            <div className="flex items-center gap-2">
              <span className="typo-sublabel">Type:</span>
              <select
                value={selectedFfType ?? 'all'}
                onChange={(e) => onFfTypeChange(e.target.value === 'all' ? undefined : e.target.value)}
                className="border-b border-book-rule bg-transparent py-0.5 typo-sublabel font-serif text-ink-main focus:border-ink-main focus:outline-none cursor-pointer"
              >
                <option value="all">All False Friends</option>
                <option value="etymological_shift">Shared Roots</option>
                <option value="surface_collision">Accidental Lookalikes</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="typo-sublabel">Rows:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="border-b border-book-rule bg-transparent py-0.5 typo-sublabel font-serif text-ink-main focus:border-ink-main focus:outline-none cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Independently Scrollable Items Table Container */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto my-1">
        <table className="w-full text-left border-collapse font-serif">
          <thead className="sticky top-0 z-10 bg-page-bg">
            <tr className="border-b-2 border-book-rule-strong typo-overline">
              <th className="py-3.5 px-3.5 w-1/4 bg-page-bg border-b-2 border-book-rule-strong">{sourceName} Headword</th>
              <th className="py-3.5 px-3.5 w-1/4 bg-page-bg border-b-2 border-book-rule-strong">{targetName} Counterpart</th>
              <th className="py-3.5 px-2 text-center w-32 bg-page-bg border-b-2 border-book-rule-strong">Taxonomy</th>
              <th className="py-3.5 px-2 text-center w-16 bg-page-bg border-b-2 border-book-rule-strong" title="Orthographic Similarity">
                <span className="typo-pos">Δ<sub className="typo-subscript">o</sub></span>
              </th>
              <th className="py-3.5 px-2 text-center w-16 bg-page-bg border-b-2 border-book-rule-strong" title="Phonetic Similarity">
                <span className="typo-pos">Δ<sub className="typo-subscript">p</sub></span>
              </th>
              <th className="py-3.5 px-2 text-center w-16 bg-page-bg border-b-2 border-book-rule-strong" title="Semantic Similarity">
                <span className="typo-pos">Δ<sub className="typo-subscript">s</sub></span>
              </th>
              <th className="py-3.5 px-3.5 bg-page-bg border-b-2 border-book-rule-strong">Active Aligned Meaning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-book-rule/50">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center typo-gloss">
                  Scanning lexicon...
                </td>
              </tr>
            ) : pairs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center typo-gloss">
                  No word pairs match the current filter or search criteria.
                </td>
              </tr>
            ) : (
              pairs.map((pair) => {
                const isSelected = selectedPairId === pair.id;
                return (
                  <tr
                    key={pair.id}
                    onClick={() => onSelectPair(pair)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-page-muted/90 border-l-2 border-l-ink-main font-medium'
                        : 'hover:bg-page-muted/40'
                    }`}
                  >
                    {/* Source Headword */}
                    <td className="py-3 px-3.5 font-serif">
                      <WordHeadword
                        lemma={pair.wordA}
                        ipa={pair.ipaA}
                        pos={pair.posA}
                      />
                    </td>

                    {/* Target Counterpart */}
                    <td className="py-3 px-3.5 font-serif">
                      <WordHeadword
                        lemma={pair.wordB}
                        ipa={pair.ipaB}
                        pos={pair.posB}
                        isFalseFriend={pair.category === 'false_friend'}
                        isCognate={pair.category === 'true_cognate'}
                      />
                    </td>

                    {/* Taxonomy Label */}
                    <td className="py-3 px-2 text-center">
                      {getTaxonomyLabel(pair)}
                    </td>

                    {/* Orthographic Similarity */}
                    <td className="py-3 px-2 text-center typo-metric-table text-ink-muted">
                      {pair.orthographicSim.toFixed(2)}
                    </td>

                    {/* Phonetic Similarity */}
                    <td className="py-3 px-2 text-center typo-metric-table text-ink-main">
                      {pair.phoneticSim.toFixed(2)}
                    </td>

                    {/* Semantic Similarity */}
                    <td className="py-3 px-2 text-center typo-metric-table text-ink-main">
                      {pair.semanticSim.toFixed(2)}
                    </td>

                    {/* Active Aligned Meaning */}
                    <td className="py-3 px-3.5 max-w-xs md:max-w-md">
                      <span
                        className="truncate block typo-gloss"
                        title={getMeaningDisplay(pair)}
                      >
                        {getMeaningDisplay(pair)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex-none flex items-center justify-between border-t border-book-rule pt-3 typo-sublabel">
        <div>
          Showing {startItem}–{endItem} of {total.toLocaleString()} word pairs
        </div>

        <div className="flex items-center gap-4">
          <span className="typo-sublabel">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              disabled={offset === 0 || isLoading}
              className="px-2.5 py-1 border border-book-rule typo-sublabel text-ink-main hover:bg-page-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => onPageChange(offset + limit)}
              disabled={offset + limit >= total || isLoading}
              className="px-2.5 py-1 border border-book-rule typo-sublabel text-ink-main hover:bg-page-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export type SpecimenRegisterTableProps = LexiconTableProps;
export const SpecimenRegisterTable = LexiconTable;
