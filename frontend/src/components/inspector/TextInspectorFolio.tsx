import React, { useState, useMemo } from 'react';
import { useInspectMutation, useLanguagesQuery } from '../../services/queries';
import { getLanguageName } from '../../data/languages';
import type { TokenAnalysis, InspectResponse } from '../../types/linguistics';
import { SpecimenTokenPill } from './SpecimenTokenPill';
import { SpecimenDetailDrawer } from './SpecimenDetailDrawer';
import { INSPECTOR_CONFIG } from '../../constants/config';

export const TextInspectorFolio: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [customTargetLangs, setCustomTargetLangs] = useState<string[] | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenAnalysis | null>(null);

  const { data: languagesData } = useLanguagesQuery();

  const availableLanguages = languagesData?.languages ?? [];
  const defaultSource = availableLanguages[0] ?? 'sv';
  const sourceLang =
    selectedSource && availableLanguages.includes(selectedSource)
      ? selectedSource
      : defaultSource;

  const availableTargets = useMemo(() => {
    if (!languagesData?.pairs) return [];
    return Array.from(
      new Set(
        languagesData.pairs
          .filter((p) => p.source === sourceLang)
          .map((p) => p.target),
      ),
    );
  }, [languagesData, sourceLang]);

  const targetLangs = customTargetLangs !== null ? customTargetLangs : availableTargets;

  const inspectMutation = useInspectMutation();

  const handleInspect = () => {
    if (!inputText.trim()) return;
    setSelectedToken(null);
    inspectMutation.mutate({
      text: inputText,
      source_lang: sourceLang,
      target_langs: targetLangs.length > 0 ? targetLangs : availableTargets,
    });
  };

  const handleToggleTarget = (code: string) => {
    if (targetLangs.includes(code)) {
      if (targetLangs.length > 1) {
        setCustomTargetLangs(targetLangs.filter((c) => c !== code));
      }
    } else {
      setCustomTargetLangs([...targetLangs, code]);
    }
  };

  const response: InspectResponse | undefined = inspectMutation.data;
  const sourceLangName = getLanguageName(sourceLang);
  const selectableLanguages = availableLanguages.length > 0 ? availableLanguages : [sourceLang];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 font-serif">
      {/* Chapter header */}
      <div className="border-b border-book-rule pb-8">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-main">
          Text inspector
        </h2>
        <p className="mt-3 text-lg text-ink-muted leading-relaxed max-w-3xl">
          Enter text to analyze individual words, resolve grammatical inflections to base lemmas, and measure cross-lingual lexical relationships.
        </p>
      </div>

      {/* Main input & configuration */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Input and results (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded border border-book-rule bg-page-surface p-6 shadow-xs">
            {/* Source selector */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-muted">Source language:</span>
                <select
                  value={sourceLang}
                  onChange={(e) => {
                    setSelectedSource(e.target.value);
                    setCustomTargetLangs(null);
                  }}
                  className="rounded border border-book-rule bg-page-bg px-3 py-1.5 text-base text-ink-main focus:outline-none"
                >
                  {selectableLanguages.map((code) => (
                    <option key={code} value={code}>
                      {getLanguageName(code)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={INSPECTOR_CONFIG.DEFAULT_TEXTAREA_ROWS}
              placeholder={`Enter text in ${sourceLangName} to analyze individual words and grammatical forms...`}
              className="w-full rounded border border-book-rule bg-page-bg p-4 text-lg text-ink-main placeholder-ink-light focus:outline-none leading-relaxed"
            />

            {/* Target language toggles & run button */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-book-rule pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-muted mr-1">Compare against:</span>
                {availableTargets.map((code) => {
                  const isChecked = targetLangs.includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleToggleTarget(code)}
                      className={`rounded px-3 py-1 text-sm transition-colors border ${
                        isChecked
                          ? 'border-cognate-border bg-cognate-bg text-cognate-ink font-bold'
                          : 'border-book-rule bg-page-bg text-ink-muted hover:text-ink-main'
                      }`}
                    >
                      {getLanguageName(code)}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={inspectMutation.isPending || !inputText.trim()}
                onClick={handleInspect}
                className="rounded border border-ink-main bg-ink-main px-6 py-2.5 text-base font-medium text-page-surface hover:opacity-90 transition-opacity disabled:opacity-50 shadow-2xs"
              >
                {inspectMutation.isPending ? 'Resolving words...' : 'Analyze text'}
              </button>
            </div>
          </div>

          {/* Token analysis result passage */}
          {response && (
            <div className="rounded border border-book-rule bg-page-surface p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-book-rule pb-3">
                <h3 className="text-lg font-bold text-ink-main">
                  Analyzed text
                </h3>
                <div className="flex items-center gap-4 text-sm text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-cognate-ink" />
                    Universal cognate
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-shifted-ink" />
                    Sound shifted
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-book-rule-strong" />
                    Isolated word
                  </span>
                </div>
              </div>

              {/* Text passage with clickable word tokens */}
              <div className="mt-6 flex flex-wrap items-center gap-2.5 p-6 rounded border border-book-rule bg-page-bg leading-loose">
                {response.tokens.map((tok, idx) => (
                  <SpecimenTokenPill
                    key={idx}
                    tokenAnalysis={tok}
                    isSelected={selectedToken?.token === tok.token}
                    onSelect={(t) => setSelectedToken(t)}
                  />
                ))}
              </div>

              <p className="mt-4 text-sm text-ink-muted italic">
                * Words marked with an asterisk have been lemmatized from inflected forms. Click any word to inspect matches.
              </p>
            </div>
          )}
        </div>

        {/* Right column: Results summary & word drawer (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Summary card */}
          {response && (
            <div className="rounded border border-book-rule bg-page-surface p-6 shadow-xs">
              <h3 className="text-xl font-bold text-ink-main">
                Lexical intelligibility
              </h3>
              <p className="text-sm text-ink-muted mt-1">
                Proportion of vocabulary recognizable across selected target languages.
              </p>

              <div className="my-6 text-center">
                <span className="font-mono text-5xl font-bold text-cognate-ink">
                  {response.universality_score.toFixed(0)}%
                </span>
                <span className="text-sm text-ink-muted block mt-1">
                  Cross-lingual recognition score
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-book-rule pt-4 text-base text-ink-muted">
                <div>
                  <span className="text-sm block">Total words:</span>
                  <strong className="text-ink-main font-mono text-lg">{response.total_tokens}</strong>
                </div>
                <div>
                  <span className="text-sm block">Unique words:</span>
                  <strong className="text-ink-main font-mono text-lg">{response.unique_tokens}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Selected word drawer */}
          {selectedToken && (
            <SpecimenDetailDrawer
              tokenAnalysis={selectedToken}
              onClose={() => setSelectedToken(null)}
            />
          )}

          {!selectedToken && response && (
            <div className="rounded border border-dashed border-book-rule bg-page-surface p-6 text-center text-base text-ink-muted">
              Click any underlined word on the left to view its base lemma and corresponding words in other languages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
