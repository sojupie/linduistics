// tailwind.config.js
module.exports = {
  theme: {
    fontSize: {
      // Eliminate sub-13px rendering entirely
      '2xs': ['0.75rem', { lineHeight: '1.1rem' }],   // 12px (absolute floor for legal/footnotes only)
      'xs':  ['0.8125rem', { lineHeight: '1.25rem' }], // 13px (minimum for metadata/small-caps)
      'sm':  ['0.9375rem', { lineHeight: '1.4rem' }],  // 15px (table secondary text, IPA, glosses)
      'base': ['1.0625rem', { lineHeight: '1.6rem' }], // 17px (standard body reading size for Cardo)
      'lg':  ['1.25rem', { lineHeight: '1.75rem' }],   // 20px (subheadings)
      'xl':  ['1.5rem', { lineHeight: '2rem' }],       // 24px (dossier headwords)
      '2xl': ['2rem', { lineHeight: '2.25rem' }],      // 32px (page titles)
    }
  }
};
