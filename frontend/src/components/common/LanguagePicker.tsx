import React from 'react';
import { getLanguageName } from '../../data/languages';
import { MaterialSymbol } from './MaterialSymbol';

export interface LanguageSelectProps {
  value: string;
  languages: string[];
  onChange: (code: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  plate?: boolean;
  id?: string;
  'aria-label'?: string;
}

export const LanguageSelect: React.FC<LanguageSelectProps> = ({
  value,
  languages,
  onChange,
  label,
  disabled = false,
  className = '',
  plate = false,
  id,
  'aria-label': ariaLabel,
}) => {
  const selectElement = (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel || label || 'Select language'}
      className={`bg-page-bg border border-book-rule px-2.5 py-1.5 sm:py-1 typo-sublabel font-medium text-ink-main hover:border-book-rule-strong focus:border-ink-main focus:outline-none cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto ${className}`.trim()}
    >
      {languages.map((code) => (
        <option key={code} value={code}>
          {getLanguageName(code)}
        </option>
      ))}
    </select>
  );

  if (!label && !plate) {
    return selectElement;
  }

  const content = (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
      {label && <span className="typo-sublabel shrink-0">{label}</span>}
      {selectElement}
    </div>
  );

  if (plate) {
    return (
      <div className="bg-page-surface border border-book-rule px-3.5 py-2.5 shadow-2xs w-full sm:w-auto self-stretch sm:self-start md:self-auto">
        {content}
      </div>
    );
  }

  return content;
};

export interface LanguagePairSelectProps {
  sourceLang: string;
  targetLang: string;
  availableSources: string[];
  availableTargets: string[];
  onSourceChange: (code: string) => void;
  onTargetChange: (code: string) => void;
  onSwap?: () => void;
  canSwap?: boolean;
  label?: string;
  plate?: boolean;
  className?: string;
}

export const LanguagePairSelect: React.FC<LanguagePairSelectProps> = ({
  sourceLang,
  targetLang,
  availableSources,
  availableTargets,
  onSourceChange,
  onTargetChange,
  onSwap,
  canSwap = false,
  label = 'Comparison:',
  plate = false,
  className = '',
}) => {
  const content = (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto ${className}`.trim()}>
      {label && <span className="typo-sublabel shrink-0">{label}</span>}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 w-full sm:w-auto">
        <select
          value={sourceLang}
          onChange={(e) => onSourceChange(e.target.value)}
          aria-label="Source language"
          className="w-full sm:w-auto bg-page-bg border border-book-rule px-2.5 py-1.5 sm:py-1 typo-sublabel font-medium text-ink-main hover:border-book-rule-strong focus:border-ink-main focus:outline-none cursor-pointer transition-colors"
        >
          {availableSources.map((lang) => (
            <option key={lang} value={lang}>
              {getLanguageName(lang)}
            </option>
          ))}
        </select>

        {onSwap ? (
          <button
            type="button"
            onClick={onSwap}
            disabled={!canSwap}
            title={`Swap languages (${getLanguageName(targetLang)} ⇄ ${getLanguageName(sourceLang)})`}
            aria-label={`Swap languages to ${getLanguageName(targetLang)} and ${getLanguageName(sourceLang)}`}
            className={`self-center sm:self-auto px-2.5 py-1 typo-sublabel border rounded-xs font-mono transition-colors flex items-center justify-center shrink-0 ${
              canSwap
                ? 'text-ink-muted hover:text-ink-main bg-page-bg hover:bg-page-muted border-book-rule hover:border-book-rule-strong cursor-pointer shadow-2xs'
                : 'text-ink-muted/40 border-book-rule/40 cursor-not-allowed bg-page-bg'
            }`}
          >
            <MaterialSymbol icon="swap_vert" size={16} className="sm:hidden" />
            <MaterialSymbol icon="swap_horiz" size={16} className="hidden sm:inline-flex" />
          </button>
        ) : (
          <div className="self-center sm:self-auto flex items-center justify-center">
            <MaterialSymbol icon="arrow_downward" size={16} className="text-ink-muted sm:hidden py-0.5" />
            <MaterialSymbol icon="arrow_forward" size={16} className="text-ink-muted hidden sm:inline-flex px-0.5" />
          </div>
        )}

        <select
          value={targetLang}
          onChange={(e) => onTargetChange(e.target.value)}
          aria-label="Target language"
          className="w-full sm:w-auto bg-page-bg border border-book-rule px-2.5 py-1.5 sm:py-1 typo-sublabel font-medium text-ink-main hover:border-book-rule-strong focus:border-ink-main focus:outline-none cursor-pointer transition-colors"
        >
          {availableTargets.map((lang) => (
            <option key={lang} value={lang}>
              {getLanguageName(lang)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  if (plate) {
    return (
      <div className="bg-page-surface border border-book-rule px-3.5 py-2.5 shadow-2xs w-full sm:w-auto self-stretch sm:self-start md:self-auto">
        {content}
      </div>
    );
  }

  return content;
};
