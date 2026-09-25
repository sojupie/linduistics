import React from 'react';
import { useLanguagesQuery } from '../../services/queries';
import { LanguageSelect } from '../common/LanguagePicker';
import { MaterialSymbol } from '../common/MaterialSymbol';

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
      <LanguageSelect
        label="Center language:"
        value={anchor}
        languages={availableLanguages}
        onChange={onAnchorChange}
      />

      {/* Register and modality controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Modality: Sound vs Spelling */}
        <div className="flex items-center rounded-xs border border-book-rule bg-page-muted/50 p-0.5 typo-sublabel">
          <button
            type="button"
            onClick={() => onModalityChange('phonetic')}
            className={`rounded-xs px-2.5 py-1 transition-colors cursor-pointer inline-flex items-center gap-1.5 border ${
              modality === 'phonetic'
                ? 'bg-page-surface border-ink-main text-ink-main font-semibold shadow-2xs'
                : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/60'
            }`}
          >
            {modality === 'phonetic' && (
              <MaterialSymbol icon="check" size={14} className="text-cognate-ink shrink-0" />
            )}
            <span>Phonetic distance</span>
          </button>
          <button
            type="button"
            onClick={() => onModalityChange('spelling')}
            className={`rounded-xs px-2.5 py-1 transition-colors cursor-pointer inline-flex items-center gap-1.5 border ${
              modality === 'spelling'
                ? 'bg-page-surface border-ink-main text-ink-main font-semibold shadow-2xs'
                : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/60'
            }`}
          >
            {modality === 'spelling' && (
              <MaterialSymbol icon="check" size={14} className="text-cognate-ink shrink-0" />
            )}
            <span>Orthographic distance</span>
          </button>
        </div>

        {/* Pause animation */}
        <button
          type="button"
          onClick={onTogglePause}
          className={`rounded border px-3 py-1.5 typo-sublabel transition-colors ${
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
