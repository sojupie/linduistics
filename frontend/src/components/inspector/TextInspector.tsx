import React, { useState, useMemo } from 'react';
import { useInspectMutation, useLanguagesQuery } from '../../services/queries';
import { getLanguageName } from '../../data/languages';
import type { TokenAnalysis, InspectResponse } from '../../types/linguistics';
import { TokenPill } from './TokenPill';
import { TokenDetailDrawer } from './TokenDetailDrawer';
import { LanguageSelect } from '../common/LanguagePicker';
import { INSPECTOR_CONFIG } from '../../constants/config';
import { MaterialSymbol } from '../common/MaterialSymbol';

const escapeRegExp = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function replaceTokenInSentence(
  text: string,
  tokens: TokenAnalysis[] | undefined,
  targetToken: TokenAnalysis,
  newForm: string,
): string {
  if (tokens && tokens.length > 0 && typeof targetToken.id === 'number') {
    let searchStart = 0;
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      const escaped = escapeRegExp(tok.token);
      const regex = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu');
      const substring = text.slice(searchStart);
      const match = regex.exec(substring);
      if (!match) continue;

      const matchIndex = searchStart + match.index;
      const matchLength = match[0].length;

      if (tok.id === targetToken.id || i === targetToken.id) {
        return text.slice(0, matchIndex) + newForm + text.slice(matchIndex + matchLength);
      }

      searchStart = matchIndex + matchLength;
    }
  }

  // Fallback: Unicode-aware single replace using lookaround
  const escaped = escapeRegExp(targetToken.token);
  const regex = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu');
  return text.replace(regex, newForm);
}

export const TextInspector: React.FC = () => {
  const [inputText, setInputText] = useState('skeppet seglar över det vida havet');
  const [selectedSource, setSelectedSource] = useState<string | null>('sv');
  const [customTargetLangs, setCustomTargetLangs] = useState<string[] | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenAnalysis | null>(null);
  const [copiedLang, setCopiedLang] = useState<string | null>(null);
  const [persistedResponse, setPersistedResponse] = useState<InspectResponse | null>(null);

  const { data: languagesData } = useLanguagesQuery();

  const availableLanguages = useMemo(() => languagesData?.languages ?? [], [languagesData?.languages]);
  const defaultSource = availableLanguages.includes('sv') ? 'sv' : (availableLanguages[0] ?? 'sv');
  const sourceLang =
    selectedSource && (availableLanguages.includes(selectedSource) || selectedSource === 'pan')
      ? selectedSource
      : defaultSource;

  const selectableLanguages = useMemo(() => {
    const list = [...availableLanguages];
    if (!list.includes('pan')) {
      list.push('pan');
    }
    return list;
  }, [availableLanguages]);

  const availableTargets = useMemo(() => {
    if (sourceLang === 'pan') {
      return availableLanguages.length > 0 ? availableLanguages : ['da', 'de', 'en', 'nb', 'sv'];
    }
    if (!languagesData?.pairs) return [];
    return Array.from(
      new Set(
        languagesData.pairs
          .filter((p) => p.source === sourceLang)
          .map((p) => p.target),
      ),
    );
  }, [languagesData, sourceLang, availableLanguages]);

  const targetLangs = customTargetLangs !== null ? customTargetLangs : availableTargets;

  const inspectMutation = useInspectMutation();

  const handleInspect = (overrideText?: string) => {
    const textToAnalyze = (overrideText !== undefined ? overrideText : inputText).trim();
    if (!textToAnalyze) return;
    inspectMutation.mutate(
      {
        text: textToAnalyze,
        source_lang: sourceLang,
        target_langs: targetLangs.length > 0 ? targetLangs : availableTargets,
      },
      {
        onSuccess: (data) => {
          setPersistedResponse(data);
          const firstSelectable = data.tokens?.find((t) => !t.is_punct) ?? data.tokens?.[0] ?? null;
          setSelectedToken(firstSelectable);
        },
      },
    );
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

  const handleSubstitute = (tokenToReplace: TokenAnalysis, newForm: string) => {
    const currentTokens = (inspectMutation.data ?? persistedResponse)?.tokens;
    const updated = replaceTokenInSentence(inputText, currentTokens, tokenToReplace, newForm);
    setInputText(updated);
    setSelectedToken(null);
    handleInspect(updated);
  };

  const handleCopyTranslation = (lang: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLang(lang);
    setTimeout(() => setCopiedLang(null), 2000);
  };

  const response: InspectResponse | undefined =
    inspectMutation.data ?? persistedResponse ?? undefined;
  const sourceLangName = getLanguageName(sourceLang);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-5 font-serif">
      {/* Top Bar matching ComparativeLexicon */}
      <div className="pb-3 mb-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-3 sm:gap-4">
          <h1 className="typo-page-title">
            Sentence Analysis
          </h1>
          {response && (
            <div className="flex items-baseline gap-2 text-ink-muted">
              <span className="typo-metric text-cognate-ink font-medium">
                {Math.round(response.universality_score)}%
              </span>
              <span className="typo-sublabel">
                universality
              </span>
              <span className="text-book-rule">•</span>
              <span className="typo-metric text-ink-main font-normal">
                {response.total_tokens}
              </span>
              <span className="typo-sublabel">
                {response.total_tokens === 1 ? 'token' : 'tokens'}
              </span>
            </div>
          )}
        </div>

        {/* Unified Controls Strip: Source selector, target language toggles, and parse action */}
        <div className="flex flex-wrap items-center gap-3 bg-page-surface border border-book-rule px-3.5 py-2 shadow-2xs self-start md:self-auto">
          <LanguageSelect
            label="Source:"
            value={sourceLang}
            languages={selectableLanguages}
            onChange={(code) => {
              setSelectedSource(code);
              setCustomTargetLangs(null);
              setSelectedToken(null);
              setPersistedResponse(null);
            }}
          />

          <span className="text-book-rule hidden sm:inline">|</span>

          <span className="typo-sublabel">Targets:</span>
          <div className="flex items-center gap-1.5">
            {availableTargets.map((code) => {
              const isChecked = targetLangs.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleToggleTarget(code)}
                  className={`px-2 py-0.5 border typo-lang-code font-medium transition-colors cursor-pointer ${
                    isChecked
                      ? 'border-ink-main bg-page-muted text-ink-main font-semibold'
                      : 'border-book-rule bg-page-bg text-ink-muted hover:text-ink-main'
                  }`}
                  title={getLanguageName(code)}
                >
                  {code.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fallback mode indicator if NLP service is unreachable */}
      {response?.service_mode === 'db_fallback' && (
        <div className="mb-4 px-3.5 py-2 border border-book-rule bg-page-surface text-ink-muted typo-note flex items-center justify-between">
          <span>Static dictionary fallback active. Syntactic dependency parsing and calques are offline.</span>
          <span className="typo-lang-code text-ink-light">db_fallback</span>
        </div>
      )}

      {/* Master-Detail Layout */}
      <div className="flex flex-col lg:flex-row border border-book-rule bg-page-bg divide-y lg:divide-y-0 lg:divide-x divide-book-rule min-h-[580px]">
        {/* Left: Input, Interlinear Gloss, and Lexical Calques */}
        <div className="flex-1 min-w-0 p-5 sm:p-6 space-y-6">
          {/* 1. Input Sentence */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="typo-overline">
                Input Sentence
              </span>
              <span className="typo-sublabel">
                {sourceLangName}
              </span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleInspect();
                }
              }}
              rows={INSPECTOR_CONFIG.DEFAULT_TEXTAREA_ROWS}
              placeholder={`Enter text in ${sourceLangName}...`}
              className="w-full border border-book-rule bg-page-surface p-3.5 typo-body text-ink-main placeholder-ink-light hover:border-book-rule-strong focus:border-ink-main focus:outline-none leading-relaxed resize-y transition-colors"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="typo-note text-ink-muted select-none">
                Ctrl + Enter to parse
              </span>
              <button
                type="button"
                disabled={inspectMutation.isPending || !inputText.trim()}
                onClick={() => handleInspect()}
                className="px-4 py-1.5 border border-cognate-ink bg-cognate-ink text-page-surface typo-overline hover:bg-[#1d4c2b] hover:border-[#1d4c2b] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {inspectMutation.isPending ? 'Parsing...' : 'Parse'}
              </button>
            </div>
          </div>

          {/* 2. Interlinear Analysis Reading Passage */}
          {response && (
            <div className="space-y-3 pt-4 border-t border-book-rule">
              <div className="flex items-center justify-between pb-1">
                <span className="typo-overline">
                  Interlinear Analysis
                </span>
                <div className="flex items-center gap-4 typo-sublabel text-ink-muted select-none">
                  <span className="flex items-center gap-1.5">
                    <span className="text-cognate-ink font-semibold">●</span>
                    Cognate
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-shifted-ink font-semibold">●</span>
                    Partial
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-ink-light font-semibold">○</span>
                    Isolate
                  </span>
                </div>
              </div>

              <div className="py-2 flex flex-wrap items-baseline gap-x-5 gap-y-6">
                {response.tokens.map((tok, idx) => (
                  <TokenPill
                    key={tok.id ?? idx}
                    tokenAnalysis={tok}
                    isSelected={
                      selectedToken !== null &&
                      (selectedToken.id !== undefined && tok.id !== undefined
                        ? selectedToken.id === tok.id
                        : selectedToken === tok || selectedToken.token === tok.token)
                    }
                    onSelect={(t) => setSelectedToken(t)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 3. Lexical Calques */}
          {(() => {
            const translations = response?.approximate_translations ?? response?.pan_germanic_translations;
            if (!translations || Object.keys(translations).length === 0) return null;

            return (
              <div className="space-y-3 pt-4 border-t border-book-rule">
                <div className="flex items-center justify-between pb-1">
                  <span className="typo-overline">
                    Lexical Calques
                  </span>
                  <span className="typo-note text-ink-muted">
                    Cognate substitution without syntactic reordering
                  </span>
                </div>
                <div className="divide-y divide-book-rule/60 border-t border-b border-book-rule">
                  {Object.entries(translations).map(([lang, transText]) => (
                    <div
                      key={lang}
                      className="py-3 flex items-start justify-between gap-4 hover:bg-page-surface/40 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <span
                          className="typo-lang-code inline-block mb-0.5 cursor-help"
                          title={getLanguageName(lang)}
                        >
                          {lang.toUpperCase()}
                        </span>
                        <p className="typo-body">
                          “{transText}”
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyTranslation(lang, transText)}
                        className="px-2 py-1 typo-subscript border font-mono transition-colors flex items-center justify-center text-ink-muted hover:text-ink-main bg-page-surface hover:bg-page-muted border-book-rule hover:border-book-rule-strong cursor-pointer shrink-0 mt-0.5"
                        title="Copy calque"
                      >
                        {copiedLang === lang ? (
                          <MaterialSymbol icon="check" size={14} className="text-cognate-ink" />
                        ) : (
                          <MaterialSymbol icon="content_copy" size={14} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right: Token Specimen Details */}
        <div className="w-full lg:w-[720px] xl:w-[780px] lg:shrink-0 p-5 sm:p-6 bg-page-surface">
          {selectedToken ? (
            <TokenDetailDrawer
              tokenAnalysis={selectedToken}
              onClose={() => setSelectedToken(null)}
              onSubstitute={handleSubstitute}
            />
          ) : response ? (
            <div className="py-24 text-center text-ink-muted font-serif">
              <p className="typo-note">Select a token from the analysis to inspect grammatical properties and correspondences.</p>
            </div>
          ) : (
            <div className="py-24 text-center text-ink-muted font-serif">
              <p className="typo-note">Enter a sentence and parse to inspect syntax and lexical correspondences.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
