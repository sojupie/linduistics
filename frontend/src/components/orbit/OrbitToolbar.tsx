import React from 'react';
import { useLanguagesQuery } from '../../services/queries';
import { getLanguageName } from '../../data/languages';

export type OrbitRegister = 'vernacular' | 'academic';
export type OrbitModality = 'phonetic' | 'spelling';

interface OrbitToolbarProps {
  register?: OrbitRegister;
  modality: OrbitModality;
  anchor: string;
  isPaused: boolean;
  onRegisterChange?: (reg: OrbitRegister) => void;
  onModalityChange: (mod: OrbitModality) => void;
  onAnchorChange: (code: string) => void;
  onTogglePause: () => void;
}

export const OrbitToolbar: React.FC<OrbitToolbarProps> = ({
  modality,
  anchor,
  isPaused,
  onModalityChange,
  onAnchorChange,
  onTogglePause,
}) => {
  const { data: languagesData } = useLanguagesQuery();
  const availableLanguages = languagesData?.languages ?? [anchor];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-book-rule bg-page-surface px-6 py-4 font-serif">
      {/* Reference language selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-ink-muted">
          Center language:
        </span>
        <select
          value={anchor}
          onChange={(e) => onAnchorChange(e.target.value)}
          className="rounded border border-book-rule bg-page-bg px-3 py-1.5 text-base text-ink-main focus:outline-none"
        >
          {availableLanguages.map((code) => (
            <option key={code} value={code}>
              {getLanguageName(code)}
            </option>
          ))}
        </select>
      </div>

      {/* Register and modality controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Modality: Sound vs Spelling */}
        <div className="flex items-center rounded border border-book-rule bg-page-bg p-1 text-sm">
          <button
            type="button"
            onClick={() => onModalityChange('phonetic')}
            className={`rounded px-3 py-1 transition-colors ${
              modality === 'phonetic'
                ? 'bg-page-surface font-bold text-cognate-ink shadow-2xs'
                : 'text-ink-muted hover:text-ink-main'
            }`}
          >
            Phonetic distance
          </button>
          <button
            type="button"
            onClick={() => onModalityChange('spelling')}
            className={`rounded px-3 py-1 transition-colors ${
              modality === 'spelling'
                ? 'bg-page-surface font-bold text-divergent-ink shadow-2xs'
                : 'text-ink-muted hover:text-ink-main'
            }`}
          >
            Orthographic distance
          </button>
        </div>

        {/* Pause animation */}
        <button
          type="button"
          onClick={onTogglePause}
          className={`rounded border px-3 py-1.5 text-sm transition-colors ${
            isPaused
              ? 'border-shifted-border bg-shifted-bg text-shifted-ink font-medium'
              : 'border-book-rule bg-page-surface text-ink-muted hover:text-ink-main'
          }`}
        >
          {isPaused ? 'Resume motion' : 'Pause motion'}
        </button>
      </div>
    </div>
  );
};
