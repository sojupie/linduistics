/**
 * Printed Book & Lexical Reference Design Tokens
 * Light-mode unbleached paper substrates and archival carbon inks.
 */

export const PALETTE = {
  // Paper Substrates
  PAGE_BG: '#FAF8F5',
  PAGE_SURFACE: '#FFFFFF',
  PAGE_MUTED: '#F3EFEA',
  PAGE_ACCENT: '#EDE7DE',

  // Book Linework & Dividers
  BOOK_RULE: '#E5E0D8',
  BOOK_RULE_MUTED: '#EDE9E2',
  BOOK_RULE_STRONG: '#D0C9BE',

  // Reading Inks (Never stark #000000)
  INK_MAIN: '#1F1E1D',
  INK_MUTED: '#5E5B56',
  INK_LIGHT: '#8A8680',

  // Word Classification Inks (Legible on warm paper)
  COGNATE_INK: '#255D36',        // Deep forest green
  COGNATE_BG: '#EBF3ED',
  COGNATE_BORDER: '#B8DAC0',

  FALSE_FRIEND_INK: '#9E2A2B',   // Deep crimson / rust
  FALSE_FRIEND_BG: '#F9ECEC',
  FALSE_FRIEND_BORDER: '#E8B6B6',

  SHIFTED_INK: '#8F581B',        // Warm sienna / ochre
  SHIFTED_BG: '#FBF3EB',
  SHIFTED_BORDER: '#ECCFA9',

  DIVERGENT_INK: '#2D516B',      // Slate blue
  DIVERGENT_BG: '#EBF1F6',
  DIVERGENT_BORDER: '#BCD0E0',

  // Canvas Grid & Orbit Linework for Light Book Substrate
  CANVAS_BG: '#FAF8F5',
  CANVAS_RING: '#E0DAD0',
  CANVAS_RING_ACCENT: '#CCC4B6',
  CANVAS_CROSSHAIR: '#EAE4DA',
  CANVAS_TETHER: '#BFB7A8',
  CANVAS_TEXT: '#1F1E1D',
  CANVAS_TEXT_MUTED: '#5E5B56',
  CANVAS_ANCHOR_FILL: '#FFFFFF',
  CANVAS_ANCHOR_STROKE: '#255D36',
  CANVAS_SATELLITE_FILL: '#FFFFFF',
} as const;

export const TYPOGRAPHY = {
  FONT_SANS: "'Noto Sans', sans-serif",
  FONT_SERIF: "'Noto Sans', sans-serif",
  FONT_DISPLAY: "'Noto Sans', sans-serif",
  FONT_IPA: "'Noto Sans', sans-serif",
  FONT_MONO: "'Noto Sans Mono', monospace",
} as const;
