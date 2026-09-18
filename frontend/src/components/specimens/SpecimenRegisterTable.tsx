import React from 'react';
import { Search, ChevronLeft, ChevronRight, Sparkles, Filter, ArrowUpRight } from 'lucide-react';
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

  const getCategoryBadge = (pair: SpecimenPair) => {
    switch (pair.category) {
      case 'cognate':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-cognate-border bg-cognate-bg px-2 py-0.5 text-xs font-medium text-cognate-ink whitespace-nowrap">
            Cognate
          </span>
        );
      case 'minefield':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-falsefriend-border bg-falsefriend-bg px-2 py-0.5 text-xs font-semibold text-falsefriend-ink whitespace-nowrap">
            {pair.falseFriendType === 'etymological_shift' ? 'False Friend [A]' : 'False Friend [B]'}
          </span>
        );
      case 'cousin':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-shifted-border bg-shifted-bg px-2 py-0.5 text-xs font-medium text-shifted-ink whitespace-nowrap">
            Sound Shift
          </span>
        );
      case 'schism':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-divergent-border bg-divergent-bg px-2 py-0.5 text-xs font-medium text-divergent-ink whitespace-nowrap">
            Translation
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded border border-book-rule bg-page-muted px-2 py-0.5 text-xs font-medium text-ink-muted whitespace-nowrap">
            Other
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-serif">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-book-rule bg-page-surface p-3.5 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-light" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search ${sourceName} or ${targetName} headwords...`}
            className="w-full rounded-md border border-book-rule bg-page-bg pl-9 pr-3 py-1.5 text-sm text-ink-main placeholder:text-ink-light focus:border-book-rule-strong focus:outline-none"
          />
        </div>

        {/* Taxonomy Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-ink-light" />
            <span className="font-sans text-ink-muted">Category:</span>
          </div>

          <select
            value={selectedCategory || 'all'}
            onChange={(e) => {
              const val = e.target.value === 'all' ? undefined : e.target.value;
              onCategoryChange(val);
              if (val !== 'false_friend') {
                onFfTypeChange(undefined);
              }
            }}
            className="rounded border border-book-rule bg-page-bg px-2.5 py-1 text-ink-main font-sans text-xs focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="true_cognate">True Cognates</option>
            <option value="false_friend">False Friends</option>
            <option value="partial_cognate">Sound Shifts (Partial)</option>
            <option value="translation_pair">Translation Pairs</option>
          </select>

          {/* False Friend Sub-Tier Filter */}
          {selectedCategory === 'false_friend' && (
            <select
              value={selectedFfType || 'all'}
              onChange={(e) => onFfTypeChange(e.target.value === 'all' ? undefined : e.target.value)}
              className="rounded border border-falsefriend-border bg-falsefriend-bg/50 px-2.5 py-1 text-falsefriend-ink font-sans text-xs font-semibold focus:outline-none"
            >
              <option value="all">All False Friend Tiers</option>
              <option value="etymological_shift">Tier A: Etymological Shift</option>
              <option value="surface_collision">Tier B: Surface Collision</option>
            </select>
          )}

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="font-sans text-ink-muted">Rows:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="rounded border border-book-rule bg-page-bg px-2 py-1 text-ink-main font-sans text-xs focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dense Botanical Register Table */}
      <div className="rounded-lg border border-book-rule bg-page-surface shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-book-rule bg-page-muted/60 text-xs font-sans text-ink-muted uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold w-1/5">{sourceName} Headword</th>
                <th className="py-3 px-4 font-semibold w-1/5">{targetName} Counterpart</th>
                <th className="py-3 px-3 font-semibold text-center w-36">Category</th>
                <th className="py-3 px-2 font-semibold text-center w-16" title="Orthographic Similarity">Orth.</th>
                <th className="py-3 px-2 font-semibold text-center w-16" title="Phonetic (Articulatory) Similarity">Phon.</th>
                <th className="py-3 px-2 font-semibold text-center w-16" title="Semantic Sense Similarity">Sem.</th>
                <th className="py-3 px-4 font-semibold">Active Aligned Meaning</th>
                <th className="py-3 px-3 text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-book-rule/70 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-muted">
                    <div className="inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4 animate-spin text-ink-light" />
                      <span>Reading cataloged register...</span>
                    </div>
                  </td>
                </tr>
              ) : pairs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-muted">
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
                      className={`group cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-cognate-bg/25 border-l-4 border-l-cognate-ink'
                          : 'hover:bg-page-muted/45'
                      }`}
                    >
                      {/* Source Word */}
                      <td className="py-3 px-4 font-serif">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="font-bold text-base text-ink-main group-hover:text-cognate-ink transition-colors">
                            {pair.wordA}
                          </span>
                          {pair.ipaA && (
                            <span className="font-mono text-xs text-ink-muted">/{pair.ipaA}/</span>
                          )}
                          {pair.posA && (
                            <span className="text-xs italic text-ink-light">({pair.posA})</span>
                          )}
                        </div>
                      </td>

                      {/* Target Word */}
                      <td className="py-3 px-4 font-serif">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
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
                            <span className="font-mono text-xs text-ink-muted">/{pair.ipaB}/</span>
                          )}
                          {pair.posB && (
                            <span className="text-xs italic text-ink-light">({pair.posB})</span>
                          )}
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-3 text-center">
                        {getCategoryBadge(pair)}
                      </td>

                      {/* Orthographic Similarity */}
                      <td className="py-3 px-2 text-center font-mono text-xs text-ink-muted">
                        {Math.round(pair.orthographicSim * 100)}%
                      </td>

                      {/* Phonetic Similarity */}
                      <td className="py-3 px-2 text-center font-mono text-xs font-semibold text-ink-main">
                        {Math.round(pair.phoneticSim * 100)}%
                      </td>

                      {/* Semantic Similarity */}
                      <td className="py-3 px-2 text-center font-mono text-xs font-semibold text-ink-main">
                        {Math.round(pair.semanticSim * 100)}%
                      </td>

                      {/* Active Aligned Meaning */}
                      <td className="py-3 px-4 text-xs leading-relaxed text-ink-muted">
                        <div className="line-clamp-2" title={`${pair.defA} ↔ ${pair.defB}`}>
                          <span className="font-medium text-ink-main">{pair.defA}</span>
                          <span className="mx-1 text-ink-light">↔</span>
                          <span>{pair.defB}</span>
                        </div>
                      </td>

                      {/* Detail Indicator */}
                      <td className="py-3 px-3 text-right">
                        <ArrowUpRight className="w-4 h-4 text-ink-light group-hover:text-ink-main transition-colors opacity-0 group-hover:opacity-100" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-book-rule bg-page-muted/40 px-4 py-3 text-xs font-sans text-ink-muted">
          <div>
            Showing <span className="font-semibold text-ink-main">{startItem.toLocaleString()}</span> to{' '}
            <span className="font-semibold text-ink-main">{endItem.toLocaleString()}</span> of{' '}
            <span className="font-semibold text-ink-main">{total.toLocaleString()}</span> cataloged pairs
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={offset === 0 || isLoading}
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              className="inline-flex items-center gap-1 rounded border border-book-rule bg-page-surface px-3 py-1 text-xs font-medium text-ink-main hover:bg-page-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            <span className="px-2 font-mono">
              Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
            </span>

            <button
              type="button"
              disabled={offset + limit >= total || isLoading}
              onClick={() => onPageChange(offset + limit)}
              className="inline-flex items-center gap-1 rounded border border-book-rule bg-page-surface px-3 py-1 text-xs font-medium text-ink-main hover:bg-page-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
