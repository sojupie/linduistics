import type { LanguagePairStats, LanguageProfile } from '../../types/linguistics';

export type LanguageSort =
  | 'ease'
  | 'minefield'
  | 'phonetic'
  | 'cognates'
  | 'semantic_shifts'
  | 'spelling'
  | 'pairs'
  | 'name';

export type LanguageMeasure = 'phonetic' | 'orthographic' | 'semantic' | 'cognates' | 'semantic_shifts' | 'false_friends';
export type LanguagePair = { source: string; target: string };

export const LANGUAGE_MEASURES: Record<LanguageMeasure, {
  label: string;
  value: (pair: LanguagePairStats) => number;
  category?: string;
  color: string;
}> = {
  phonetic: { label: 'Phonetic similarity', value: (pair) => pair.avg_phonetic, color: 'var(--color-cognate-ink)' },
  orthographic: { label: 'Spelling similarity', value: (pair) => pair.avg_orthographic, color: 'var(--color-divergent-ink)' },
  semantic: { label: 'Semantic similarity', value: (pair) => pair.avg_semantic, color: 'var(--color-ink-muted)' },
  cognates: { label: 'True cognates', value: (pair) => pair.true_cognates_ratio, category: 'true_cognate', color: 'var(--color-cognate-ink)' },
  semantic_shifts: { label: 'Semantic shifts', value: (pair) => pair.partial_cognates_ratio, category: 'semantic_shift', color: 'var(--color-shifted-ink)' },
  false_friends: { label: 'False friends', value: (pair) => pair.false_friends_ratio, category: 'false_friend', color: 'var(--color-falsefriend-ink)' },
};

export const LANGUAGE_MAP = {
  defaultReference: 'sv',
  minViewportForExpandedControls: 1024,
  plot: { width: 720, height: 420, centerX: 360, centerY: 210, radius: 160, marginX: 40, scaleX: 1.8, scaleY: 1.25, perspective: 520, perspectiveScaleX: 1.35, perspectiveScaleY: 1.05, edgeTop: 30, edgeBottom: 390, axisInsetX: 30, axisRings: [40, 80, 120, 160] },
  controls: { defaultYaw: 0.45, defaultPitch: 0.24, defaultZoom: 1, zoomMin: 0.6, zoomMax: 2.4, zoomFactor: 0.001, dragFactor: 0.008, keyYawStep: 0.14, keyPitchStep: 0.12, pitchLimit: 1.1 },
  labels: { neighborDistance: 48, offset: 38, edgeInsetX: 20, edgeInsetY: 22, minSize: 22, maxSize: 42, size: 30, minFontSize: 9, maxFontSize: 14, fontSize: 11, haloOffset: 7, baseRadius: 3.5, minPointRadius: 2, maxPointRadius: 7, leaderThreshold: 1, leaderOpacity: 0.6, leaderWidth: 1, leaderDash: '1 3' },
  depth: { edgeSegments: 24, axisSegments: 32, lineWidth: 2.5, axisWidth: 1.2, minOpacity: 0.15, opacityRange: 0.85, fallbackOpacity: 0.6, nodeBorderWidth: 2 },
  graticule: { latitudeDegrees: [-45, 0, 45], longitudeDegrees: [0, 90], circleSegments: 48, meridianSegments: 64, dash: '4 5', baseOpacity: 0.72, equatorOpacity: 0.95, baseWidth: 1.1, equatorWidth: 1.5 },
  interaction: { collisionAttempts: [0.5, 0.38, 0.62], labelOffsets: [0, 16, -16, 28, -28, 40, -40], scoreLabelWidth: 42, scoreLabelHeight: 20, scoreLabelHalfWidth: 21, scoreLabelHalfHeight: 10, scoreLabelGapX: 46, scoreLabelGapY: 24, scoreLabelEdgeInsetX: 24, scoreLabelEdgeInsetY: 24, scoreLabelCollisionX: 22, scoreLabelCollisionY: 13, minSegmentLength: 1 },
  legend: { width: 24, height: 8, inset: 1 },
  axes: { width: 1, dash: '3 5' },
  scoreLabel: { cornerRadius: 3, textBaseline: 4, fontSize: 11, fontWeight: 600 },
  zIndexBase: 500,
} as const;

export const LANGUAGE_OVERVIEW_CONFIG = { otherRatioDisplayThreshold: 0.001, minimumTableWidthPx: 760 } as const;
export const LANGUAGE_MATRIX_CONFIG = { minimumWidthPx: 640, sourceColumnWidthPx: 130, lightTextThreshold: 0.5 } as const;

export const LANGUAGE_MAP_DESKTOP_QUERY = `(min-width: ${LANGUAGE_MAP.minViewportForExpandedControls}px)`;

export function pairKey(source: string, target: string) {
  return `${source}:${target}`;
}

export function samePair(pair: LanguagePair | null | undefined, source: string, target: string) {
  return !!pair && ((pair.source === source && pair.target === target) || (pair.source === target && pair.target === source));
}

export function lexiconSearch(source: string, target: string, measure: LanguageMeasure) {
  return { source, target, category: LANGUAGE_MEASURES[measure].category };
}

export function sortLanguageProfiles(profiles: LanguageProfile[], sort: LanguageSort) {
  return [...profiles].sort((a, b) => {
    switch (sort) {
      case 'ease': return b.semanticSimilarity - a.semanticSimilarity;
      case 'minefield': return b.ratios.falseFriends - a.ratios.falseFriends;
      case 'phonetic': return b.phoneticSimilarity - a.phoneticSimilarity;
      case 'cognates': return b.ratios.trueCognates - a.ratios.trueCognates;
      case 'semantic_shifts': return b.ratios.partialCognates - a.ratios.partialCognates;
      case 'spelling': return b.spellingSimilarity - a.spellingSimilarity;
      case 'pairs': return b.pairCount - a.pairCount;
      case 'name': return a.name.localeCompare(b.name);
    }
  });
}
