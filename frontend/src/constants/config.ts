/**
 * Application-wide configuration and numeric parameters.
 * Eliminates all magic numbers across query hooks, UI layouts, and canvas simulations.
 */

export const QUERY_CONFIG = {
  HEALTH_POLL_INTERVAL_MS: 30000,
  HEALTH_RETRY_COUNT: 1,

  PAIRS_STALE_TIME_MS: 5 * 60 * 1000, // 5 minutes
  QUIZ_STALE_TIME_MS: 2 * 60 * 1000,  // 2 minutes
  SEARCH_STALE_TIME_MS: 2 * 60 * 1000, // 2 minutes

  MIN_HEADWORD_SEARCH_CHARS: 2,
  DEFAULT_SEARCH_LIMIT: 20,
  DEFAULT_QUIZ_LIMIT: 10,
  DEFAULT_PAIRS_LIMIT: 50,
} as const;

export const HEADER_CONFIG = {
  ICON_SIZE_NAV: 18,
  ICON_SIZE_TOOL: 16,
  ICON_SIZE_TOOL_SM: 16,
  ICON_SIZE_SEARCH: 18,
  ICON_SIZE_CLEAR: 16,
  MAX_SEARCH_RESULTS_HEIGHT_PX: 'max-h-72',
} as const;

export const TOOLBAR_CONFIG = {
  ICON_SIZE_SM: 16,
  ICON_SIZE_MD: 18,
} as const;

export const REGISTER_CONFIG = {
  PERCENT_SCALE: 100,
  PRECISION: 0,
} as const;

export const LEXICON_CONFIG = {
  SIMILARITY_SCALE: 100,
  SIMILARITY_PRECISION: 0,
  SIMILARITY_METRIC_PRECISION: 2,
  QUIZ_MAX_OPTIONS: 4,
} as const;

export const ORBIT_CONFIG = {
  // Canvas Layout & Sizing
  MIN_CANVAS_HEIGHT_PX: 580,
  MOBILE_CANVAS_HEIGHT_PX: 640,
  DESKTOP_CANVAS_HEIGHT_PX: 720,

  // Orbital Physics & Mechanics
  SPRING_LERP_FACTOR: 0.05,
  BASE_SPEED_MULTIPLIER: 0.0012,
  SPEED_VARIANCE_INCREMENT: 0.0006,

  // Radii & Distances
  MIN_ORBIT_RADIUS_PX: 100,
  MAX_RADIUS_CANVAS_RATIO: 0.82,
  RADIUS_SAFETY_PADDING_PX: 40,
  INITIAL_RADIUS_BASE_PX: 150,
  INITIAL_RADIUS_STEP_PX: 26,

  // Anchor Disc
  ANCHOR_RADIUS_PX: 46,
  ANCHOR_AURA_OFFSET_PX: 6,
  ANCHOR_INNER_RING_OFFSET_PX: 5,
  ANCHOR_BORDER_WIDTH_PX: 2,

  // Satellite Discs
  SATELLITE_BASE_RADIUS_PX: 30,
  SATELLITE_SIZE_SCALE_FACTOR: 10,
  SATELLITE_AURA_PADDING_PX: 4,
  SATELLITE_BORDER_WIDTH_PX: 1.5,
  SATELLITE_HOVER_HITBOX_PADDING_PX: 10,
  SATELLITE_ORBIT_RING_WIDTH_PX: 1,
  SATELLITE_LABEL_OFFSET_Y_PX: 18,
  SATELLITE_DISTANCE_OFFSET_Y_PX: 32,

  // Grid and Axes
  CROSSHAIR_EDGE_MARGIN_PX: 20,
  DISTANCE_RINGS: [0.25, 0.5, 0.75, 1.0] as const,
  DASH_EVEN_PATTERN: [3, 4] as const,
  DASH_ODD_PATTERN: [4, 4] as const,
  TETHER_DASH_PATTERN: [2, 4] as const,
  TETHER_LINE_WIDTH_PX: 1,

  // Typography Scale in Canvas (Large, legible book lettering)
  FONT_SIZE_ANCHOR_CODE_PX: 18,
  FONT_SIZE_ANCHOR_SUB_PX: 14,
  FONT_SIZE_SATELLITE_CODE_PX: 15,
  FONT_SIZE_SATELLITE_NAME_PX: 14,
  FONT_SIZE_METRIC_PX: 13,
  FONT_SIZE_RING_LABEL_PX: 13,
} as const;

export const INSPECTOR_CONFIG = {
  DEFAULT_TEXTAREA_ROWS: 4,
  MIN_TOKEN_LENGTH: 1,
  SCORE_GAUGE_SIZE_PX: 120,
  SCORE_GAUGE_STROKE_WIDTH_PX: 8,
  MAX_PERCENTAGE: 100,
} as const;

export const TAXONOMIC_BAR_CONFIG = {
  BAR_HEIGHT_DEFAULT_PX: 'h-3.5',
  BAR_HEIGHT_COMPACT_PX: 'h-2.5',
  PERCENT_MULTIPLIER: 100,
  PRECISION_DECIMALS: 0,
} as const;

export const TOKEN_STATUS_CONFIG = {
  universal: {
    status: 'universal',
    label: 'Universal',
    symbol: '●',
    colorClass: 'text-cognate-ink',
    badgeClass: 'text-cognate-ink bg-cognate-bg',
    threshold: '≥ 55%',
    tooltip: 'Universal: Cognates span ≥ 55% of selected target languages (pan-Germanic distribution)',
  },
  branch_specific: {
    status: 'branch_specific',
    label: 'Branch-specific',
    symbol: '●',
    colorClass: 'text-shifted-ink',
    badgeClass: 'text-shifted-ink bg-shifted-bg',
    threshold: '20%–54%',
    tooltip: 'Branch-specific: Cognates restricted to a sub-branch (e.g. North Germanic) or reduced by semantic shift (20%–54% coverage)',
  },
  isolate: {
    status: 'isolate',
    label: 'Isolate',
    symbol: '○',
    colorClass: 'text-ink-light',
    badgeClass: 'text-ink-muted bg-page-muted',
    threshold: '< 20%',
    tooltip: 'Isolate: No cognates found in selected target languages (< 20% coverage)',
  },
} as const;
