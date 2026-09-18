import React from 'react';
import { Compass, Sliders, Volume2, Type, Globe } from 'lucide-react';
import { GERMANIC_LANGUAGES } from '../../data/languages';
import { TOOLBAR_CONFIG } from '../../constants/config';

export type OrbitRegister = 'vernacular' | 'academic';
export type OrbitModality = 'phonetic' | 'spelling';

interface OrbitToolbarProps {
  register: OrbitRegister;
  modality: OrbitModality;
  anchor: string;
  isPaused: boolean;
  onRegisterChange: (reg: OrbitRegister) => void;
  onModalityChange: (mod: OrbitModality) => void;
  onAnchorChange: (code: string) => void;
  onTogglePause: () => void;
}

export const OrbitToolbar: React.FC<OrbitToolbarProps> = ({
  register,
  modality,
  anchor,
  isPaused,
  onRegisterChange,
  onModalityChange,
  onAnchorChange,
  onTogglePause,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-hairline bg-substrate-panel/80 px-4 py-3 sm:px-6 backdrop-blur-xs">
      {/* Left: Anchor Selector */}
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-ink-muted">
          <Globe size={TOOLBAR_CONFIG.ICON_SIZE_MD} className="text-specimen-moss" />
          Central Anchor:
        </span>
        <select
          value={anchor}
          onChange={(e) => onAnchorChange(e.target.value)}
          className="rounded border border-border-hairline bg-substrate-dark px-2.5 py-1 font-serif text-xs text-ink-carbon focus:border-specimen-moss focus:outline-none"
        >
          {GERMANIC_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name} ({lang.taxonomicName})
            </option>
          ))}
        </select>
      </div>

      {/* Center / Right: Register & Modality Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {/* Register: Vernacular vs Academic */}
        <div className="flex items-center rounded border border-border-hairline bg-substrate-dark p-0.5">
          <button
            type="button"
            onClick={() => onRegisterChange('vernacular')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-serif text-xs transition-colors ${
              register === 'vernacular'
                ? 'bg-substrate-panel font-semibold text-ink-carbon shadow-xs'
                : 'text-ink-muted hover:text-ink-carbon'
            }`}
          >
            <Sliders
              size={TOOLBAR_CONFIG.ICON_SIZE_SM}
              className={register === 'vernacular' ? 'text-specimen-moss' : ''}
            />
            Vernacular
          </button>
          <button
            type="button"
            onClick={() => onRegisterChange('academic')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-serif text-xs transition-colors ${
              register === 'academic'
                ? 'bg-substrate-panel font-semibold text-ink-carbon shadow-xs'
                : 'text-ink-muted hover:text-ink-carbon'
            }`}
          >
            <Sliders
              size={TOOLBAR_CONFIG.ICON_SIZE_SM}
              className={register === 'academic' ? 'text-specimen-ochre' : ''}
            />
            Academic
          </button>
        </div>

        {/* Modality: Phonetic vs Spelling */}
        <div className="flex items-center rounded border border-border-hairline bg-substrate-dark p-0.5">
          <button
            type="button"
            onClick={() => onModalityChange('phonetic')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-serif text-xs transition-colors ${
              modality === 'phonetic'
                ? 'bg-substrate-panel font-semibold text-ink-carbon shadow-xs'
                : 'text-ink-muted hover:text-ink-carbon'
            }`}
          >
            <Volume2
              size={TOOLBAR_CONFIG.ICON_SIZE_SM}
              className={modality === 'phonetic' ? 'text-specimen-moss' : ''}
            />
            Acoustic / IPA
          </button>
          <button
            type="button"
            onClick={() => onModalityChange('spelling')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-serif text-xs transition-colors ${
              modality === 'spelling'
                ? 'bg-substrate-panel font-semibold text-ink-carbon shadow-xs'
                : 'text-ink-muted hover:text-ink-carbon'
            }`}
          >
            <Type
              size={TOOLBAR_CONFIG.ICON_SIZE_SM}
              className={modality === 'spelling' ? 'text-specimen-irongall' : ''}
            />
            Orthography
          </button>
        </div>

        {/* Pause Toggle */}
        <button
          type="button"
          onClick={onTogglePause}
          className={`flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-xs transition-colors ${
            isPaused
              ? 'border-specimen-ochre bg-specimen-ochre/10 text-specimen-ochre'
              : 'border-border-hairline bg-substrate-dark text-ink-muted hover:text-ink-carbon'
          }`}
          title="Toggle celestial motion"
        >
          <Compass size={TOOLBAR_CONFIG.ICON_SIZE_SM} />
          <span>{isPaused ? 'Orbit Paused' : 'Dynamic Drift'}</span>
        </button>
      </div>
    </div>
  );
};
