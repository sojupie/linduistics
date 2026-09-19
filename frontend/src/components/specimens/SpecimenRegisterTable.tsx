import React from 'react';
import type { SpecimenPair } from '../../types/linguistics';
import { getLanguageName } from '../../data/languages';
import { SpecimenHeadword } from '../common/Phonetic';

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
            {pair.falseFriendType === 'etymological_shift' ? 'False Friend · Drift' : 'False Friend · Clash'}
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
      return '—';
    }

    if (pair.defB && pair.defB.trim().toLowerCase() !== pair.wordB.trim().toLowerCase()) {
      return `“${pair.defB}”`;
    }
    if (pair.defA && pair.defA.trim().toLowerCase() !== pair.wordA.trim().toLowerCase()) {
      return `“${pair.defA}”`;
    }
    return '—';
  };

  return (
    <div className="flex flex-col space-y-4 font-serif">
      {/* Search & Register Ledger Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-book-rule pb-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search specimen ledger by lemma..."
            className="w-full border-b border-book-rule bg-transparent py-1 text-sm text-ink-main placeholder:text-ink-muted/60 focus:border-ink-main focus:outline-none font-serif"
          />
        </div>

        {/* Category & Tier Filters */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-serif">
          <div className="flex items-center gap-1.5">
            <span className="text-ink-muted uppercase tracking-wider font-semibold">Taxonomy:</span>
            <select
              value={selectedCategory ?? 'all'}
              onChange={(e) => onCategoryChange(e.target.value === 'all' ? undefined : e.target.value)}
              className="border-b border-book-rule bg-transparent py-0.5 text-xs text-ink-main focus:border-ink-main focus:outline-none"
            >
              <option value="all">All Specimens</option>
              <option value="cognate">True Cognates</option>
              <option value="false_friend">False Friends</option>
              <option value="partial_cognate">Sound Shifts</option>
              <option value="translation_pair">Translations</option>
            </select>
          </div>

          {selectedCategory === 'false_friend' && (
            <div className="flex items-center gap-1.5">
              <span className="text-ink-muted uppercase tracking-wider font-semibold">Tier:</span>
              <select
                value={selectedFfType ?? 'all'}
                onChange={(e) => onFfTypeChange(e.target.value === 'all' ? undefined : e.target.value)}
                className="border-b border-book-rule bg-transparent py-0.5 text-xs text-ink-main focus:border-ink-main focus:outline-none"
              >
                <option value="all">All Tiers</option>
                <option value="etymological_shift">Tier A: Drift</option>
                <option value="surface_collision">Tier B: Clash</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-ink-muted uppercase tracking-wider font-semibold">Rows:</span>
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
              <th className="py-2.5 px-3.5 w-1/4">{sourceName} Headword</th>
              <th className="py-2.5 px-3.5 w-1/4">{targetName} Counterpart</th>
              <th className="py-2.5 px-2 text-center w-28">Taxonomy</th>
              <th className="py-2.5 px-2 text-center w-14" title="Orthographic Similarity">Δₒ</th>
              <th className="py-2.5 px-2 text-center w-14" title="Phonetic Similarity">Δₚ</th>
              <th className="py-2.5 px-2 text-center w-14" title="Semantic Similarity">Δₛ</th>
              <th className="py-2.5 px-3.5">Active Aligned Meaning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-book-rule/50">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-ink-muted italic table-gloss">
                  Scanning cataloged register...
                </td>
              </tr>
            ) : pairs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-ink-muted italic table-gloss">
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
                    <td className="py-3 px-3.5 font-serif">
                      <SpecimenHeadword
                        lemma={pair.wordA}
                        ipa={pair.ipaA}
                        pos={pair.posA}
                      />
                    </td>

                    {/* Target Counterpart */}
                    <td className="py-3 px-3.5 font-serif">
                      <SpecimenHeadword
                        lemma={pair.wordB}
                        ipa={pair.ipaB}
                        pos={pair.posB}
                        isFalseFriend={pair.category === 'minefield'}
                        isCognate={pair.category === 'cognate'}
                      />
                    </td>

                    {/* Taxonomy Label */}
                    <td className="py-3 px-2 text-center">
                      {getTaxonomyLabel(pair)}
                    </td>

                    {/* Orthographic Similarity */}
                    <td className="py-3 px-2 text-center font-mono text-sm tabular-nums text-ink-muted">
                      {pair.orthographicSim.toFixed(2)}
                    </td>

                    {/* Phonetic Similarity */}
                    <td className="py-3 px-2 text-center font-mono text-sm tabular-nums font-semibold text-ink-main">
                      {pair.phoneticSim.toFixed(2)}
                    </td>

                    {/* Semantic Similarity */}
                    <td className="py-3 px-2 text-center font-mono text-sm tabular-nums font-semibold text-ink-main">
                      {pair.semanticSim.toFixed(2)}
                    </td>

                    {/* Active Aligned Meaning */}
                    <td className="py-3 px-3.5 table-gloss text-ink-main">
                      <span className="line-clamp-2 italic text-ink-muted">
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
