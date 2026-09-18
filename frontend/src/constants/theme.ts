/**
 * Archival Field Guide Design Tokens & Color Palette
 * Derived from 18th/19th century botanical and lexical indices.
 */

export const PALETTE = {
  // Substrates (Naturalist Rag Papers & Slate Ledgers)
  SUBSTRATE_DARK: '#161514',
  SUBSTRATE_PANEL: '#1E1D1B',
  SUBSTRATE_LIGHT: '#F5F2EB',
  SUBSTRATE_LIGHTPANEL: '#ECE7DD',

  // Borders & Linework
  BORDER_HAIRLINE: '#2C2A26',
  BORDER_LIGHTHAIRLINE: '#D8D1C3',
  BORDER_FAINT: 'rgba(234, 230, 223, 0.08)',
  BORDER_GRID_DEEP: '#1F1E1B',
  BORDER_GRID_FAINT: '#23211E',
  BORDER_GRID_RADAR: '#2A2824',
  BORDER_GRID_RADAR_OUTER: '#3A3732',

  // Canvas Alpha Suffixes
  TETHER_ALPHA_HEX: '33',
  ORBIT_PATH_ALPHA_HEX: '1A',

  // Inks & Typography
  INK_CARBON: '#EAE6DF',
  INK_MUTED: '#9C968A',
  INK_FAINT: '#6A655C',
  INK_SCALE_MARKER: '#5A564D',
  INK_AXIS_LABEL: '#4E4B43',
  INK_DARKCARBON: '#1C1B18',

  // Specimen Taxonomic Inks
  SPECIMEN_MOSS: '#5A8A64',
  SPECIMEN_MOSS_BG: 'rgba(90, 138, 100, 0.12)',
  SPECIMEN_MOSS_BG_DEEP: 'rgba(90, 138, 100, 0.25)',
  SPECIMEN_MOSS_ORBIT_AURA: 'rgba(90, 138, 100, 0.15)',
  SPECIMEN_MOSS_ANCHOR_AURA: 'rgba(90, 138, 100, 0.08)',

  SPECIMEN_OXBLOOD: '#B04358',
  SPECIMEN_OXBLOOD_BG: 'rgba(176, 67, 88, 0.12)',
  SPECIMEN_OXBLOOD_BORDER: 'rgba(176, 67, 88, 0.40)',

  SPECIMEN_OCHRE: '#C88A4E',
  SPECIMEN_OCHRE_BG: 'rgba(200, 138, 78, 0.12)',
  SPECIMEN_OCHRE_BG_DEEP: 'rgba(200, 138, 78, 0.25)',
  SPECIMEN_OCHRE_ORBIT_AURA: 'rgba(200, 138, 78, 0.15)',

  SPECIMEN_IRONGALL: '#4E7498',
  SPECIMEN_IRONGALL_BG: 'rgba(78, 116, 152, 0.12)',

  SPECIMEN_SLATE: '#7E7A71',
  SPECIMEN_SLATE_BG: 'rgba(126, 122, 113, 0.12)',
  SPECIMEN_COMPARISON_INK: '#6A655C',
  SPECIMEN_COMPARISON_FILL: 'rgba(106, 101, 92, 0.12)',
} as const;

export const TYPOGRAPHY = {
  FONT_SERIF: 'Cardo, Georgia, serif',
  FONT_MONO: 'JetBrains Mono, monospace',
} as const;
