import React from 'react';
import type { SpecimenPair } from '../../types/linguistics';
import { getLanguageName } from '../../data/languages';

interface SpecimenRegisterTableProps {
  pairs: SpecimenPair[];
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
  onSelectPair: (pair: SpecimenPair) => void;
  selectedPairId: number | null;
  isLoading: boolean;
}

export const SpecimenRegisterTable: React.FC<SpecimenRegisterTableProps> = ({
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

  const getTaxonomyLabel = (pair: SpecimenPair) => {
    switch (pair.category) {
      case 'cognate':
        return (
          <span className="text-xs uppercase tracking-wider font-semibold text-ink-main whitespace-nowrap">
            Cognate
          </span>
        );
      case 'minefield':
        return (
          <span className="text-xs uppercase tracking-wider font-bold text-falsefriend-ink whitespace-nowrap">
            {pair.falseFriendType === 'etymological_shift' ? 'False Friend [A]' : 'False Friend [B]'}
          </span>
        );
      case 'cousin':
        return (
          <span className="text-xs uppercase tracking-wider font-semibold text-shifted-ink whitespace-nowrap">
            Sound Shift
          </span>
        );
      case 'schism':
        return (
          <span className="text-xs uppercase tracking-wider font-semibold text-divergent-ink whitespace-nowrap">
            Translation
          </span>
        );
      default:
        return (
          <span className="text-xs uppercase tracking-wider text-ink-muted whitespace-nowrap">
            Unclassified
          </span>
        );
    }
  };

  const getMeaningDisplay = (pair: SpecimenPair) => {
    const isExactEcho =
      pair.defA.trim().toLowerCase() === pair.wordA.trim().toLowerCase() &&
      pair.defB.trim().toLowerCase() === pair.wordB.trim().toLowerCase();

    if (isExactEcho) {
      // Look for a richer gloss in active sense items
      const matchA = pair.sensesA?.find((s) => s.is_active_match && s.gloss.toLowerCase() !== pair.wordA.toLowerCase());
      const matchB = pair.sensesB?.find((s) => s.is_active_match && s.gloss.toLowerCase() !== pair.wordB.toLowerCase());
      if (matchA && matchB) {
        return `“${matchA.gloss}” ↔ “${matchB.gloss}”`;
      }
      if (matchA) return `“${matchA.gloss}”`;
      if (matchB) return `“${matchB.gloss}”`;
      return 'Shared lexical identity / direct loan';
    }

    if (pair.defA === pair.defB) {
      return `“${pair.defA}”`;
    }

    return `“${pair.defA}” ↔ “${pair.defB}”`;
  };

  return (
    <div className="font-serif space-y-4">
      {/* Filtering Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-book-rule pb-3.5 text-xs">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px] max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Filter ${sourceName} or ${targetName}...`}
            className="w-full border-b border-book-rule bg-transparent px-1 py-1 text-sm text-ink-main placeholder:text-ink-muted focus:border-ink-main focus:outline-none font-serif"
          />
        </div>

        {/* Category & Tier Filters */}
        <div className="flex items-center gap-4 font-serif">
          <div className="flex items-center gap-1.5">
            <span className="text-ink-muted uppercase tracking-wider text-xs font-semibold">Category:</span>
            <select
              value={selectedCategory ?? 'all'}
              onChange={(e) => onCategoryChange(e.target.value === 'all' ? undefined : e.target.value)}
              className="border-b border-book-rule bg-transparent py-0.5 text-xs text-ink-main focus:border-ink-main focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="cognate">True Cognates</option>
              <option value="false_friend">False Friends</option>
              <option value="partial_cognate">Sound Shifts</option>
              <option value="translation_pair">Translations</option>
            </select>
          </div>

          {selectedCategory === 'false_friend' && (
            <div className="flex items-center gap-1.5">
              <span className="text-ink-muted uppercase tracking-wider text-xs font-semibold">Tier:</span>
              <select
                value={selectedFfType ?? 'all'}
                onChange={(e) => onFfTypeChange(e.target.value === 'all' ? undefined : e.target.value)}
                className="border-b border-book-rule bg-transparent py-0.5 text-xs text-ink-main focus:border-ink-main focus:outline-none"
              >
                <option value="all">All Tiers</option>
                <option value="etymological_shift">Tier A: Drift</option>
                <option value="surface_collision">Tier B: Collision</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-ink-muted uppercase tracking-wider text-xs font-semibold">Rows:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="border-b border-book-rule bg-transparent py-0.5 text-xs text-ink-main focus:border-ink-main focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Edge-to-Edge Register Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-serif">
          <thead>
            <tr className="border-b border-book-rule text-xs uppercase tracking-wider text-ink-muted font-semibold">
              <th className="py-2.5 px-3 w-1/4">{sourceName} Headword</th>
              <th className="py-2.5 px-3 w-1/4">{targetName} Counterpart</th>
              <th className="py-2.5 px-2 text-center w-32">Taxonomy</th>
              <th className="py-2.5 px-2 text-center w-14" title="Orthographic Similarity">Δₒ</th>
              <th className="py-2.5 px-2 text-center w-14" title="Phonetic Similarity">Δₚ</th>
              <th className="py-2.5 px-2 text-center w-14" title="Semantic Similarity">Δₛ</th>
              <th className="py-2.5 px-3">Active Aligned Meaning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-book-rule/50 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-ink-muted italic">
                  Scanning cataloged register...
                </td>
              </tr>
            ) : pairs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-ink-muted italic">
                  No specimen pairs match the current filter or search criteria.
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
                    <td className="py-2.5 px-3 font-serif">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-bold text-base text-ink-main">
                          {pair.wordA}
                        </span>
                        {pair.ipaA && (
                          <span className="font-serif italic text-sm text-ink-muted">
                            /{pair.ipaA}/
                          </span>
                        )}
                        {pair.posA && (
                          <span className="text-xs text-ink-muted">
                            [{pair.posA}]
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Target Counterpart */}
                    <td className="py-2.5 px-3 font-serif">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`font-bold text-base ${
                          pair.category === 'minefield'
                            ? 'text-falsefriend-ink'
                            : pair.category === 'cognate'
                            ? 'text-cognate-ink'
                            : 'text-ink-main'
                        }`}>
                          {pair.wordB}
                        </span>
                        {pair.ipaB && (
                          <span className="font-serif italic text-sm text-ink-muted">
                            /{pair.ipaB}/
                          </span>
                        )}
                        {pair.posB && (
                          <span className="text-xs text-ink-muted">
                            [{pair.posB}]
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Taxonomy Label */}
                    <td className="py-2.5 px-2 text-center">
                      {getTaxonomyLabel(pair)}
                    </td>

                    {/* Orthographic Similarity */}
                    <td className="py-2.5 px-2 text-center font-mono text-sm text-ink-muted">
                      {pair.orthographicSim.toFixed(2)}
                    </td>

                    {/* Phonetic Similarity */}
                    <td className="py-2.5 px-2 text-center font-mono text-sm font-semibold text-ink-main">
                      {pair.phoneticSim.toFixed(2)}
                    </td>

                    {/* Semantic Similarity */}
                    <td className="py-2.5 px-2 text-center font-mono text-sm font-semibold text-ink-main">
                      {pair.semanticSim.toFixed(2)}
                    </td>

                    {/* Active Aligned Meaning */}
                    <td className="py-2.5 px-3 text-sm leading-snug text-ink-main">
                      <span className="line-clamp-1 italic text-ink-muted">
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
      <div className="flex items-center justify-between border-t border-book-rule pt-3.5 text-sm text-ink-muted">
        <div>
          Showing {startItem}–{endItem} of {total.toLocaleString()} cataloged specimens
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-wider text-ink-muted font-semibold">
            Leaf {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              disabled={offset === 0 || isLoading}
              className="px-2.5 py-1 border border-book-rule text-xs uppercase tracking-wider text-ink-main hover:bg-page-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-serif"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => onPageChange(offset + limit)}
              disabled={offset + limit >= total || isLoading}
              className="px-2.5 py-1 border border-book-rule text-xs uppercase tracking-wider text-ink-main hover:bg-page-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-serif"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
