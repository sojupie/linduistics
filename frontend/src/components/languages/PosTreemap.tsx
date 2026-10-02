import React, { useMemo, useState } from 'react';
import type { PosCount } from '../../types/linguistics';
import { formatPos, getPosFullName } from '../../utils/formatters';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { InclusionPill } from '../common/InclusionPill';

export type TaxonomyCategoryKey = 'cognate' | 'false_friend' | 'semantic_shift' | 'translation_pair' | 'other';

export interface PosTreemapProps {
  posCounts: PosCount[];
  sourceCode?: string;
  targetCode?: string;
  sourceName: string;
  targetName: string;
}

export type BreakdownViewMode = 'taxonomy' | 'flat';

interface CategoryMeta {
  key: TaxonomyCategoryKey;
  label: string;
  shortLabel: string;
  inkVar: string;
  badgeStyle: string;
  description: string;
}

const TAXONOMY_CONFIGS: Record<TaxonomyCategoryKey, CategoryMeta> = {
  cognate: {
    key: 'cognate',
    label: 'True Cognates',
    shortLabel: 'Cognates',
    inkVar: 'var(--color-cognate-ink)',
    badgeStyle: 'bg-cognate-ink text-page-surface',
    description: 'Shared etymology and overlapping semantic core',
  },
  false_friend: {
    key: 'false_friend',
    label: 'False Friends',
    shortLabel: 'False Friends',
    inkVar: 'var(--color-falsefriend-ink)',
    badgeStyle: 'bg-falsefriend-ink text-page-surface',
    description: 'Deceptive lexical overlap with divergent meanings',
  },
  semantic_shift: {
    key: 'semantic_shift',
    label: 'Semantic Shifts',
    shortLabel: 'Semantic Shifts',
    inkVar: 'var(--color-shifted-ink)',
    badgeStyle: 'bg-shifted-ink text-page-surface',
    description: 'Cognate roots that evolved distinct connotations',
  },
  translation_pair: {
    key: 'translation_pair',
    label: 'Translation Pairs',
    shortLabel: 'Translations',
    inkVar: 'var(--color-divergent-ink)',
    badgeStyle: 'bg-divergent-ink text-page-surface',
    description: 'Semantic equivalents without direct etymological link',
  },
  other: {
    key: 'other',
    label: 'Other Pairs',
    shortLabel: 'Other',
    inkVar: 'var(--color-ink-muted)',
    badgeStyle: 'bg-ink-muted text-page-surface',
    description: 'Unclassified, compound, or peripheral word pairs',
  },
};

const ORDERED_CATEGORIES: TaxonomyCategoryKey[] = [
  'cognate',
  'false_friend',
  'semantic_shift',
  'translation_pair',
  'other',
];

const POS_ABBR_MAP: Record<string, string> = {
  noun: 'n.',
  verb: 'v.',
  adj: 'adj.',
  adjective: 'adj.',
  adv: 'adv.',
  adverb: 'adv.',
  name: 'prop.n.',
  proper_noun: 'prop.n.',
  pron: 'pron.',
  prep: 'prep.',
  conj: 'conj.',
  intj: 'intj.',
  num: 'num.',
  det: 'det.',
  article: 'art.',
  particle: 'part.',
  contraction: 'contr.',
  phrase: 'phr.',
  postp: 'postp.',
  prep_phrase: 'prep.phr.',
  __other__: 'oth.',
};

function getPosAbbr(pos: string): string {
  if (pos === '__other__') return 'oth.';
  return POS_ABBR_MAP[pos.toLowerCase()] || formatPos(pos) || `${pos.slice(0, 3)}.`;
}

function getPosDisplayName(pos: string): string {
  if (pos === '__other__') return 'Other parts of speech';
  return getPosFullName(pos);
}

function getTileToneClass(category: TaxonomyCategoryKey, rank: number): string {
  if (category === 'cognate') {
    if (rank === 0) return 'bg-cognate-ink text-page-surface';
    if (rank <= 2) return 'bg-cognate-border text-cognate-ink';
    return 'bg-cognate-bg text-cognate-ink';
  }
  if (category === 'false_friend') {
    if (rank === 0) return 'bg-falsefriend-ink text-page-surface';
    if (rank <= 2) return 'bg-falsefriend-border text-falsefriend-ink';
    return 'bg-falsefriend-bg text-falsefriend-ink';
  }
  if (category === 'semantic_shift') {
    if (rank === 0) return 'bg-shifted-ink text-page-surface';
    if (rank <= 2) return 'bg-shifted-border text-shifted-ink';
    return 'bg-shifted-bg text-shifted-ink';
  }
  if (category === 'translation_pair') {
    if (rank === 0) return 'bg-divergent-ink text-page-surface';
    if (rank <= 2) return 'bg-divergent-border text-divergent-ink';
    return 'bg-divergent-bg text-divergent-ink';
  }
  // other
  if (rank === 0) return 'bg-ink-muted text-page-surface';
  if (rank <= 2) return 'bg-book-rule-strong text-ink-main';
  return 'bg-page-muted text-ink-main';
}

interface TreemapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TreemapItemInput {
  id: string;
  weight: number;
}

/**
 * Squarified Treemap layout algorithm (Bruls, Huizing, van Wijk).
 * Recursively packs weighted items into a 2D bounding rectangle minimizing aspect ratio.
 */
function computeSquarifiedLayout<T extends TreemapItemInput>(
  items: T[],
  x: number,
  y: number,
  w: number,
  h: number
): (T & { rect: TreemapRect })[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ ...items[0], rect: { x, y, w, h } }];
  }

  const results: (T & { rect: TreemapRect })[] = [];
  let curX = x;
  let curY = y;
  let curW = w;
  let curH = h;
  let remaining = [...items];

  while (remaining.length > 0) {
    const isHorizontal = curW >= curH;
    const side = isHorizontal ? curH : curW;
    const totalRemainingWeight = remaining.reduce((sum, item) => sum + item.weight, 0);

    if (totalRemainingWeight <= 0) break;

    let row = [remaining[0]];
    let rowWeight = remaining[0].weight;

    const worstAspectRatio = (testRow: T[], testRowWeight: number) => {
      const rowLength = (testRowWeight / totalRemainingWeight) * (isHorizontal ? curW : curH);
      if (rowLength <= 0) return Infinity;
      let maxRatio = 0;
      for (const it of testRow) {
        const itemWidth = (it.weight / testRowWeight) * side;
        if (itemWidth <= 0) continue;
        const ratio = Math.max(rowLength / itemWidth, itemWidth / rowLength);
        if (ratio > maxRatio) maxRatio = ratio;
      }
      return maxRatio;
    };

    let bestRatio = worstAspectRatio(row, rowWeight);

    for (let i = 1; i < remaining.length; i++) {
      const nextItem = remaining[i];
      const nextRow = [...row, nextItem];
      const nextRowWeight = rowWeight + nextItem.weight;
      const nextRatio = worstAspectRatio(nextRow, nextRowWeight);

      if (nextRatio <= bestRatio) {
        row = nextRow;
        rowWeight = nextRowWeight;
        bestRatio = nextRatio;
      } else {
        break;
      }
    }

    const rowThickness = (rowWeight / totalRemainingWeight) * (isHorizontal ? curW : curH);
    let itemOffset = 0;

    for (const item of row) {
      const itemSpan = side > 0 ? (item.weight / rowWeight) * side : 0;
      if (isHorizontal) {
        results.push({
          ...item,
          rect: {
            x: curX,
            y: curY + itemOffset,
            w: rowThickness,
            h: itemSpan,
          },
        });
      } else {
        results.push({
          ...item,
          rect: {
            x: curX + itemOffset,
            y: curY,
            w: itemSpan,
            h: rowThickness,
          },
        });
      }
      itemOffset += itemSpan;
    }

    if (isHorizontal) {
      curX += rowThickness;
      curW = Math.max(0, curW - rowThickness);
    } else {
      curY += rowThickness;
      curH = Math.max(0, curH - rowThickness);
    }

    remaining = remaining.slice(row.length);
  }

  return results;
}

export interface PosTile {
  id: string;
  category: TaxonomyCategoryKey;
  pos: string;
  label: string;
  abbr: string;
  count: number;
  categoryShare: number;
  globalShare: number;
  toneClass: string;
  rect: TreemapRect;
  globalW: number;
  globalH: number;
}

export interface CategoryCluster {
  meta: CategoryMeta;
  totalCount: number;
  globalShare: number;
  rect: TreemapRect;
  tiles: PosTile[];
}

export const PosTreemap: React.FC<PosTreemapProps> = ({
  posCounts,
  sourceName,
  targetName,
}) => {
  const [hoveredTileId, setHoveredTileId] = useState<string | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [breakdownView, setBreakdownView] = useState<BreakdownViewMode>('taxonomy');

  const handleTileSelect = (tileId: string) => {
    setSelectedTileId((prev) => (prev === tileId ? null : tileId));
  };

  const availableCategories = useMemo(() => {
    const set = new Set<TaxonomyCategoryKey>();
    posCounts.forEach((p) => {
      const cat = (p.category as TaxonomyCategoryKey) || 'other';
      if (p.count > 0) set.add(cat);
    });
    return ORDERED_CATEGORIES.filter((k) => set.has(k));
  }, [posCounts]);

  const [includedCategories, setIncludedCategories] = useState<Set<TaxonomyCategoryKey>>(() => {
    return new Set<TaxonomyCategoryKey>(ORDERED_CATEGORIES);
  });

  const toggleCategory = (catKey: TaxonomyCategoryKey) => {
    setIncludedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catKey)) {
        if (next.size > 1) {
          next.delete(catKey);
        }
      } else {
        next.add(catKey);
      }
      return next;
    });
  };

  const selectAllCategories = () => {
    setIncludedCategories(new Set(availableCategories));
  };

  const hasSideData = useMemo(() => {
    return posCounts.some((p) => p.side === 'source' || p.side === 'target');
  }, [posCounts]);

  // Hierarchical Squarified Treemap Construction
  // Level 1: Taxonomy categories make up the entire treemap (pure geometric square clusters without headers)
  // Level 2: Parts of speech make up each taxonomy category (filling 100% of the category square)
  const { clusters, allRankedTiles, totalTreemapPairs, grandTotalAllCategories } = useMemo(() => {
    if (!posCounts || posCounts.length === 0) {
      return { clusters: [], allRankedTiles: [], totalTreemapPairs: 0, grandTotalAllCategories: 0 };
    }

    const sideFiltered = posCounts.filter((p) => {
      if (!hasSideData) return true;
      return p.side === 'source';
    });

    const grandTotal = sideFiltered.reduce((s, p) => s + p.count, 0);

    const activeRows = sideFiltered.filter((p) => {
      const catKey = (p.category as TaxonomyCategoryKey) || 'other';
      return includedCategories.has(catKey);
    });

    const treemapTotal = activeRows.reduce((s, p) => s + p.count, 0);
    if (treemapTotal <= 0) {
      return { clusters: [], allRankedTiles: [], totalTreemapPairs: 0, grandTotalAllCategories: grandTotal };
    }

    const catMap = new Map<TaxonomyCategoryKey, { pos: string; count: number }[]>();
    for (const p of activeRows) {
      const catKey = (p.category as TaxonomyCategoryKey) || 'other';
      if (!catMap.has(catKey)) {
        catMap.set(catKey, []);
      }
      catMap.get(catKey)!.push({ pos: p.pos, count: p.count });
    }

    // Outer level: squarify taxonomy classes
    const outerInputs: { id: TaxonomyCategoryKey; weight: number; key: TaxonomyCategoryKey }[] = [];
    for (const catKey of ORDERED_CATEGORIES) {
      const rows = catMap.get(catKey) || [];
      const catSum = rows.reduce((s, x) => s + x.count, 0);
      if (catSum > 0) {
        outerInputs.push({ id: catKey, weight: catSum, key: catKey });
      }
    }
    outerInputs.sort((a, b) => b.weight - a.weight);

    const outerLayout = computeSquarifiedLayout(outerInputs, 0, 0, 100, 100);

    // Inner level: squarify parts of speech within each taxonomy class
    const computedClusters: CategoryCluster[] = [];
    const flatTilesList: PosTile[] = [];

    for (const outerCat of outerLayout) {
      const catKey = outerCat.key;
      const meta = TAXONOMY_CONFIGS[catKey] ?? TAXONOMY_CONFIGS.other;
      const catTotal = outerCat.weight;
      const catGlobalShare = treemapTotal > 0 ? catTotal / treemapTotal : 0;
      const rawRows = catMap.get(catKey) || [];

      const posMap = new Map<string, number>();
      for (const r of rawRows) {
        posMap.set(r.pos, (posMap.get(r.pos) || 0) + r.count);
      }

      const sorted = Array.from(posMap.entries())
        .map(([pos, count]) => ({ pos, count }))
        .sort((a, b) => b.count - a.count);

      const prominent: typeof sorted = [];
      let otherCount = 0;
      for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];
        if (i < 7 && item.count / catTotal >= 0.012) {
          prominent.push(item);
        } else {
          otherCount += item.count;
        }
      }
      if (otherCount > 0) {
        prominent.push({ pos: '__other__', count: otherCount });
      }
      prominent.sort((a, b) => b.count - a.count);

      const innerInputs = prominent.map((it) => ({
        id: `${catKey}-${it.pos}`,
        weight: it.count,
        pos: it.pos,
        count: it.count,
      }));

      const innerLayout = computeSquarifiedLayout(innerInputs, 0, 0, 100, 100);

      const tiles: PosTile[] = innerLayout.map((tileItem, idx) => {
        const catShare = catTotal > 0 ? tileItem.count / catTotal : 0;
        const gShare = treemapTotal > 0 ? tileItem.count / treemapTotal : 0;

        const globalW = (tileItem.rect.w / 100) * outerCat.rect.w;
        const globalH = (tileItem.rect.h / 100) * outerCat.rect.h;

        const toneClass = getTileToneClass(catKey, idx);

        const tile: PosTile = {
          id: tileItem.id,
          category: catKey,
          pos: tileItem.pos,
          label: getPosDisplayName(tileItem.pos),
          abbr: getPosAbbr(tileItem.pos),
          count: tileItem.count,
          categoryShare: catShare,
          globalShare: gShare,
          toneClass,
          rect: tileItem.rect,
          globalW,
          globalH,
        };

        flatTilesList.push(tile);
        return tile;
      });

      computedClusters.push({
        meta,
        totalCount: catTotal,
        globalShare: catGlobalShare,
        rect: outerCat.rect,
        tiles,
      });
    }

    computedClusters.sort((a, b) => b.totalCount - a.totalCount);
    flatTilesList.sort((a, b) => b.count - a.count);

    return {
      clusters: computedClusters,
      allRankedTiles: flatTilesList,
      totalTreemapPairs: treemapTotal,
      grandTotalAllCategories: grandTotal,
    };
  }, [posCounts, includedCategories, hasSideData]);

  const activeTile = useMemo(() => {
    const targetId = hoveredTileId ?? selectedTileId;
    if (!targetId) return null;
    return allRankedTiles.find((t) => t.id === targetId) || null;
  }, [hoveredTileId, selectedTileId, allRankedTiles]);

  if (!posCounts || posCounts.length === 0 || totalTreemapPairs === 0) {
    return null;
  }

  const isSubset = includedCategories.size < availableCategories.length;

  return (
    <section
      className="w-full border border-book-rule bg-page-surface space-y-0"
      aria-label="Comparative part-of-speech treemap"
    >
      {/* Top Header: Title and Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 border-b border-book-rule">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="typo-section-header">Part-of-speech treemap by taxonomy</h2>
            <span className="typo-badge px-2 py-0.5 bg-ink-muted text-page-surface">
              {totalTreemapPairs.toLocaleString()} pairs
            </span>
          </div>
          <p className="typo-sublabel text-ink-muted">
            Parts of speech make up the whole of each taxonomy class, which together make up the comparative vocabulary between {sourceName} and {targetName}.
          </p>
        </div>
      </div>

      {/* Category Inclusion Selector */}
      <div className="px-4 sm:px-5 py-2.5 border-b border-book-rule bg-page-bg flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="typo-sublabel text-ink-muted mr-1">Include in treemap:</span>
          {availableCategories.map((catKey) => {
            const meta = TAXONOMY_CONFIGS[catKey];
            const isIncluded = includedCategories.has(catKey);

            return (
              <InclusionPill
                key={catKey}
                active={isIncluded}
                onClick={() => toggleCategory(catKey)}
                activeClassName={meta.badgeStyle}
                activeIconClassName="text-page-surface"
                title={isIncluded ? `Click to exclude ${meta.label}` : `Click to include ${meta.label}`}
              >
                {meta.label}
              </InclusionPill>
            );
          })}
        </div>

        {/* Reset Selection Button */}
        {isSubset && (
          <button
            type="button"
            onClick={selectAllCategories}
            className="typo-sublabel text-ink-muted hover:text-ink-main underline font-medium cursor-pointer shrink-0"
          >
            Reset (include all classes)
          </button>
        )}
      </div>

      {/* Main Row Content: Pure Square Treemap (60%) and Breakdown List (40%) ordered by size */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(480px,3fr)_minmax(320px,2fr)] gap-6 p-4 sm:p-6 lg:p-7 items-stretch">
        {/* Left Column: Pure Square Treemap Canvas (No headers above squares) */}
        <div className="w-full flex flex-col items-center gap-3">
          <div
            className="w-full aspect-square relative bg-page-bg border border-book-rule overflow-hidden select-none"
            role="region"
            aria-label="Parts of speech square treemap without headers"
          >
            {clusters.map((cluster) => {
              const isClusterActive = activeTile?.category === cluster.meta.key;

              return (
                <div
                  key={cluster.meta.key}
                  className={`absolute overflow-hidden ${isClusterActive ? 'outline outline-1 outline-ink-main z-10' : ''}`}
                  style={{
                    left: `${cluster.rect.x}%`,
                    top: `${cluster.rect.y}%`,
                    width: `${cluster.rect.w}%`,
                    height: `${cluster.rect.h}%`,
                  }}
                >
                  {/* Constituent POS Tiles filling 100% of this taxonomy square without any header above */}
                  {cluster.tiles.map((tile) => {
                    const isHovered = hoveredTileId === tile.id;
                    const isSelected = selectedTileId === tile.id;
                    const catPctLabel = `${Math.round(tile.categoryShare * 100)}%`;
                    const countLabel = tile.count >= 1000
                      ? `${(tile.count / 1000).toFixed(tile.count >= 10000 ? 0 : 1)}k`
                      : tile.count.toString();

                    const isSpacious = tile.globalW >= 8 && tile.globalH >= 6;
                    const isMedium = tile.globalW >= 4.5 && tile.globalH >= 3.5;
                    const isCompact = tile.globalW >= 2.5 && tile.globalH >= 2.0;

                    return (
                      <div
                        key={tile.id}
                        onClick={() => handleTileSelect(tile.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleTileSelect(tile.id);
                          }
                        }}
                        onMouseEnter={() => setHoveredTileId(tile.id)}
                        onMouseLeave={() => setHoveredTileId(null)}
                        tabIndex={0}
                        role="button"
                        aria-pressed={isSelected}
                        aria-label={`${cluster.meta.label} - ${tile.label}: ${tile.count.toLocaleString()} (${catPctLabel})`}
                        title={`${cluster.meta.label} › ${tile.label}: ${tile.count.toLocaleString()} pairs (${catPctLabel} of ${cluster.meta.shortLabel}, ${(tile.globalShare * 100).toFixed(1)}% of treemap)`}
                        className={`absolute overflow-hidden p-1 flex flex-col justify-between select-none cursor-pointer border border-page-bg ${tile.toneClass} ${
                          isSelected
                            ? 'z-30 ring-2 ring-inset ring-ink-main border-ink-main'
                            : isHovered
                              ? 'z-20 border-ink-main'
                              : ''
                        }`}
                        style={{
                          left: `${tile.rect.x}%`,
                          top: `${tile.rect.y}%`,
                          width: `${tile.rect.w}%`,
                          height: `${tile.rect.h}%`,
                        }}
                      >
                        {isSpacious ? (
                          <>
                            <span className="typo-sublabel font-medium !text-inherit truncate block leading-tight">
                              {tile.label}
                            </span>
                            <div className="flex items-baseline justify-between gap-1 leading-none mt-auto">
                              <span className="typo-metric-compact !text-inherit opacity-90 truncate">
                                {countLabel}
                              </span>
                              <span className="typo-metric-compact !text-inherit opacity-90">
                                {catPctLabel}
                              </span>
                            </div>
                          </>
                        ) : isMedium ? (
                          <>
                            <span className="typo-sublabel font-medium !text-inherit truncate block leading-tight">
                              {tile.label}
                            </span>
                            <span className="typo-metric-compact !text-inherit opacity-90 mt-auto block leading-none">
                              {catPctLabel}
                            </span>
                          </>
                        ) : isCompact ? (
                          <div className="flex items-center justify-center h-full text-center leading-none">
                            <span className="typo-metric-subscript !text-inherit opacity-90 truncate block">
                              {catPctLabel}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {/* Map status stays with the map so mobile reads map, status, then breakdown. */}
          <div className="w-full px-4 sm:px-5 py-3 border border-book-rule bg-page-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-h-[2.75rem]">
            {activeTile ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className={`typo-badge px-2 py-0.5 ${TAXONOMY_CONFIGS[activeTile.category].badgeStyle}`}>
                  {TAXONOMY_CONFIGS[activeTile.category].label}
                </span>
                <span className="typo-sublabel font-semibold text-ink-main">
                  {activeTile.label}
                </span>
                <span className="text-ink-main font-bold">·</span>
                <span className="typo-sublabel text-ink-main">
                  <span className="typo-metric-table font-semibold">{activeTile.count.toLocaleString()}</span> pairs
                </span>
                <span className="text-ink-main font-bold">·</span>
                <span className="typo-sublabel text-ink-muted">
                  <span className="typo-metric-table text-ink-main font-semibold">{(activeTile.categoryShare * 100).toFixed(1)}%</span> of {TAXONOMY_CONFIGS[activeTile.category].shortLabel}
                </span>
                <span className="text-ink-main font-bold">·</span>
                <span className="typo-sublabel text-ink-muted">
                  <span className="typo-metric-table text-ink-main font-semibold">{(activeTile.globalShare * 100).toFixed(1)}%</span> of treemap
                </span>
                {selectedTileId && (
                  <button
                    type="button"
                    onClick={() => setSelectedTileId(null)}
                    className="ml-2 typo-sublabel text-ink-muted hover:text-ink-main underline cursor-pointer"
                    title="Deselect item"
                  >
                    Clear
                  </button>
                )}
              </div>
            ) : (
              <div className="typo-sublabel text-ink-muted italic">
                Active treemap: {totalTreemapPairs.toLocaleString()} pairs across {clusters.length} taxonomy classes. Select or hover any square or list entry to inspect.
              </div>
            )}

            {isSubset ? (
              <div className="typo-sublabel text-ink-muted shrink-0">
                {totalTreemapPairs.toLocaleString()} of {grandTotalAllCategories.toLocaleString()} pairs included
              </div>
            ) : (
              <div className="typo-sublabel text-ink-muted shrink-0">
                {totalTreemapPairs.toLocaleString()} total pairs
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Breakdown List ordered by size (height matches treemap without stretching parent) */}
        <div className="w-full h-full relative min-h-0">
          <div className="w-full flex flex-col border border-book-rule bg-page-surface overflow-hidden max-lg:max-h-[500px] lg:absolute lg:inset-0">
            {/* Breakdown Header & View Mode Switcher */}
            <div className="px-4 py-3 border-b border-book-rule bg-page-surface flex items-center justify-between gap-2 shrink-0">
            <div>
              <h3 className="typo-section-header text-ink-main">
                Breakdown ordered by size
              </h3>
              <p className="typo-sublabel text-ink-muted mt-0.5">
                Constituent categories and parts of speech (PoS) ranked descending
              </p>
            </div>

            <div className="inline-flex items-center border border-book-rule bg-page-muted/50 p-0.5 rounded-xs" role="group" aria-label="Breakdown view">
              <button
                type="button"
                onClick={() => setBreakdownView('taxonomy')}
                aria-pressed={breakdownView === 'taxonomy'}
                className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${breakdownView === 'taxonomy'
                  ? 'bg-page-surface border-ink-main text-ink-main font-semibold shadow-2xs'
                  : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/60'
                  }`}
              >
                {breakdownView === 'taxonomy' && <MaterialSymbol icon="check" size={14} className="text-cognate-ink shrink-0" />}
                By taxonomy
              </button>
              <button
                type="button"
                onClick={() => setBreakdownView('flat')}
                aria-pressed={breakdownView === 'flat'}
                className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${breakdownView === 'flat'
                  ? 'bg-page-surface border-ink-main text-ink-main font-semibold shadow-2xs'
                  : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/60'
                  }`}
              >
                {breakdownView === 'flat' && <MaterialSymbol icon="check" size={14} className="text-cognate-ink shrink-0" />}
                All PoS ranked
              </button>
            </div>
          </div>

          {/* Column Header Row */}
          <div className="px-4 py-1.5 bg-page-muted/50 border-b border-book-rule flex items-center justify-between typo-overline text-ink-muted shrink-0 select-none">
            <span className="pl-1">
              {breakdownView === 'taxonomy' ? 'Taxonomy / Part of Speech' : 'Rank / Part of Speech'}
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="w-14 sm:w-16 text-right hidden sm:block">Share</span>
              <span className="w-14 text-right">Pairs</span>
              <span className="w-14 text-right">Treemap</span>
            </div>
          </div>

          {/* Breakdown List Body */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-book-rule">
            {breakdownView === 'taxonomy' ? (
              /* Mode 1: Grouped by Taxonomy Class, ordered by category size descending */
              clusters.map((cluster, catIdx) => {
                const isClusterActive = activeTile?.category === cluster.meta.key;
                const catPctOfTreemap = (cluster.globalShare * 100).toFixed(1);

                return (
                  <div
                    key={cluster.meta.key}
                    className={`transition-colors ${
                      isClusterActive ? 'section-hovered' : ''
                    }`}
                  >
                    {/* Taxonomy Category Header (Ranked by size) */}
                    <div className="px-4 py-2 bg-page-muted flex items-center justify-between gap-2 sticky top-0 z-10 border-b border-book-rule">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="typo-metric-table text-ink-muted w-5 shrink-0 text-right font-medium">
                          {catIdx + 1}.
                        </span>
                        <span className={`typo-badge px-1.5 py-0.5 ${cluster.meta.badgeStyle}`}>
                          {cluster.meta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-14 sm:w-16 shrink-0 hidden sm:block" />
                        <span className="typo-metric-table text-ink-main w-14 text-right font-semibold">
                          {cluster.totalCount.toLocaleString()}
                        </span>
                        <span className="typo-metric-table text-ink-main w-14 text-right font-semibold">
                          ({catPctOfTreemap}%)
                        </span>
                      </div>
                    </div>

                    {/* Constituent POS Rows within this taxonomy class, ordered by size */}
                    <div className="divide-y divide-book-rule">
                      {cluster.tiles.map((tile, tileIdx) => {
                        const isHovered = hoveredTileId === tile.id;
                        const isSelected = selectedTileId === tile.id;
                        const posGlobPct = (tile.globalShare * 100).toFixed(1);

                        return (
                          <div
                            key={tile.id}
                            onClick={() => handleTileSelect(tile.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleTileSelect(tile.id);
                              }
                            }}
                            onMouseEnter={() => setHoveredTileId(tile.id)}
                            onMouseLeave={() => setHoveredTileId(null)}
                            tabIndex={0}
                            role="button"
                            aria-pressed={isSelected}
                            className={`px-4 py-1.5 pl-8 flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? 'row-selected font-medium border-l-2 border-l-ink-main'
                                : isHovered
                                  ? 'item-hovered font-medium'
                                  : 'item-hover'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="typo-metric-table text-ink-muted w-5 shrink-0 text-right">
                                {tileIdx + 1}.
                              </span>
                              <span className={`w-2.5 h-2.5 shrink-0 ${tile.toneClass}`} />
                              <span className="typo-sublabel text-ink-main truncate">
                                {tile.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {/* Relative proportion bar within this taxonomy class */}
                              <div className="w-14 sm:w-16 h-1.5 bg-page-muted overflow-hidden shrink-0 border border-book-rule hidden sm:block">
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${Math.round(tile.categoryShare * 100)}%`,
                                    backgroundColor: cluster.meta.inkVar,
                                  }}
                                />
                              </div>
                              <span className="typo-metric-table text-ink-main w-14 text-right">
                                {tile.count.toLocaleString()}
                              </span>
                              <span className="typo-metric-table text-ink-muted w-14 text-right">
                                ({posGlobPct}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Mode 2: Flat List of all parts of speech across the treemap, ordered by size descending */
              allRankedTiles.map((tile, idx) => {
                const isHovered = hoveredTileId === tile.id;
                const isSelected = selectedTileId === tile.id;
                const catMeta = TAXONOMY_CONFIGS[tile.category];
                const posGlobPct = (tile.globalShare * 100).toFixed(1);

                return (
                  <div
                    key={tile.id}
                    onClick={() => handleTileSelect(tile.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTileSelect(tile.id);
                      }
                    }}
                    onMouseEnter={() => setHoveredTileId(tile.id)}
                    onMouseLeave={() => setHoveredTileId(null)}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    className={`px-4 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'row-selected font-medium border-l-2 border-l-ink-main'
                        : isHovered
                          ? 'item-hovered font-medium'
                          : 'item-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="typo-metric-table text-ink-muted w-5 shrink-0 text-right">
                        {idx + 1}.
                      </span>
                      <span className={`w-2.5 h-2.5 shrink-0 ${tile.toneClass}`} />
                      <span className={`typo-badge px-1.5 py-0.5 ${catMeta.badgeStyle}`}>
                        {catMeta.shortLabel}
                      </span>
                      <span className="typo-sublabel text-ink-main truncate ml-1">
                        {tile.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-16 sm:w-20 h-1.5 bg-page-muted overflow-hidden shrink-0 border border-book-rule hidden sm:block">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.round(tile.globalShare * 100)}%`,
                            backgroundColor: catMeta.inkVar,
                          }}
                        />
                      </div>
                      <span className="typo-metric-table text-ink-main w-14 text-right">
                        {tile.count.toLocaleString()}
                      </span>
                      <span className="typo-metric-table text-ink-main w-14 text-right">
                        {posGlobPct}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>

    </section>
  );
};
