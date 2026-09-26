import React, { useState } from 'react';
import { LanguageOrbit } from '../orbit/LanguageOrbit';
import { GALLERY_LANGUAGES } from './galleryData';
import type { OrbitRegister, OrbitModality } from '../orbit/OrbitToolbar';

export const LegacyOrbitView: React.FC = () => {
  const [anchorCode, setAnchorCode] = useState<string>('sv');
  const [modality, setModality] = useState<OrbitModality>('phonetic');
  const register: OrbitRegister = 'vernacular';
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="space-y-4">
      {/* Critique Banner */}
      <div className="border border-book-rule bg-page-muted/30 p-3 sm:p-4 rounded-xs text-xs space-y-1">
        <span className="typo-overline text-ink-muted block">
          Baseline Reference · Original Concentric Orbit Model
        </span>
        <p className="typo-body text-xs text-ink-muted leading-relaxed">
          This was the initial exploration: languages orbit as equal-sized satellites along concentric Keplerian tracks around a single anchor.
          Notice the core limitations: mutual distance between satellites is arbitrary, non-anchor relationships are unexpressed, and continuous orbital rotation interferes with comparative measurement.
        </p>
      </div>

      {/* Orbit Toolbar Controls */}
      <div className="border border-book-rule bg-page-surface p-3 rounded-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="typo-sublabel text-ink-muted">Anchor Language:</span>
          <select
            value={anchorCode}
            onChange={(e) => setAnchorCode(e.target.value)}
            className="border-b border-book-rule bg-transparent py-0.5 typo-sublabel font-semibold text-ink-main focus:outline-none cursor-pointer"
          >
            {GALLERY_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name} ({l.code.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModality(modality === 'phonetic' ? 'spelling' : 'phonetic')}
            className="px-2.5 py-1 border border-book-rule bg-page-surface rounded-xs typo-sublabel font-medium hover:bg-page-muted cursor-pointer"
          >
            Modality: <strong className="text-ink-main capitalize">{modality}</strong>
          </button>

          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="px-2.5 py-1 border border-book-rule bg-page-surface rounded-xs typo-sublabel font-medium hover:bg-page-muted cursor-pointer"
          >
            {isPaused ? 'Resume Rotation' : 'Pause Rotation'}
          </button>
        </div>
      </div>

      {/* Embedded Language Orbit Component */}
      <div className="border border-book-rule bg-page-surface rounded-xs overflow-hidden shadow-xs">
        <LanguageOrbit
          anchorCode={anchorCode}
          modality={modality}
          register={register}
          isPaused={isPaused}
        />
      </div>
    </div>
  );
};
