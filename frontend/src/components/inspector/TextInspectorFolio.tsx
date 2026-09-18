import React, { useState } from 'react';
import { useInspectMutation } from '../../services/queries';
import { GERMANIC_LANGUAGES } from '../../data/languages';
import type { TokenAnalysis, InspectResponse } from '../../types/linguistics';
import { SpecimenTokenPill } from './SpecimenTokenPill';
import { SpecimenDetailDrawer } from './SpecimenDetailDrawer';
import { INSPECTOR_CONFIG } from '../../constants/config';

const SAMPLE_SENTENCES = [
  'Katten dricker vatten och sover i huset.',
  'Vinterstormen förde med sig snö och kyla.',
  'Barnen leker i trädgården med hunden.',
  'Ett skepp kom lastat med äpplen och bröd.',
];

export const TextInspectorFolio: React.FC = () => {
  const [inputText, setInputText] = useState(SAMPLE_SENTENCES[0]);
  const [sourceLang, setSourceLang] = useState('sv');
  const [targetLangs, setTargetLangs] = useState<string[]>(['da', 'de', 'nl', 'en']);
  const [selectedToken, setSelectedToken] = useState<TokenAnalysis | null>(null);

  const inspectMutation = useInspectMutation();

  const handleInspect = () => {
    if (!inputText.trim()) return;
    setSelectedToken(null);
    inspectMutation.mutate({
      text: inputText,
      source_lang: sourceLang,
      target_langs: targetLangs,
    });
  };

  const handleToggleTarget = (code: string) => {
    if (targetLangs.includes(code)) {
      if (targetLangs.length > 1) {
        setTargetLangs(targetLangs.filter((c) => c !== code));
      }
    } else {
      setTargetLangs([...targetLangs, code]);
    }
  };

  const response: InspectResponse | undefined = inspectMutation.data;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 font-serif">
      {/* Chapter header */}
      <div className="border-b border-book-rule pb-8">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-main">
          Text inspector
        </h2>
        <p className="mt-3 text-lg text-ink-muted leading-relaxed max-w-3xl">
          Enter any Swedish sentence to analyze its individual words, resolve grammatical inflections to base lemmas, and measure mutual intelligibility across Germanic languages.
        </p>
      </div>

      {/* Main input & configuration */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Input and results (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded border border-book-rule bg-page-surface p-6 shadow-xs">
            {/* Source selector & sample excerpts */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-muted">Source language:</span>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="rounded border border-book-rule bg-page-bg px-3 py-1.5 text-base text-ink-main focus:outline-none"
                >
                  {GERMANIC_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-muted">Examples:</span>
                {SAMPLE_SENTENCES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputText(sample)}
                    className="rounded border border-book-rule bg-page-bg px-2.5 py-1 text-sm text-ink-muted hover:border-book-rule-strong hover:text-ink-main transition-colors"
                  >
                    Sentence {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={INSPECTOR_CONFIG.DEFAULT_TEXTAREA_ROWS}
              placeholder="Enter a Swedish sentence to analyze..."
              className="w-full rounded border border-book-rule bg-page-bg p-4 text-lg text-ink-main placeholder-ink-light focus:outline-none leading-relaxed"
            />

            {/* Target language toggles & run button */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-book-rule pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-muted mr-1">Compare against:</span>
                {GERMANIC_LANGUAGES.filter((l) => l.code !== sourceLang).map((l) => {
                  const isChecked = targetLangs.includes(l.code);
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => handleToggleTarget(l.code)}
                      className={`rounded px-3 py-1 text-sm transition-colors border ${
                        isChecked
                          ? 'border-cognate-border bg-cognate-bg text-cognate-ink font-bold'
                          : 'border-book-rule bg-page-bg text-ink-muted hover:text-ink-main'
                      }`}
                    >
                      {l.name}
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
                {inspectMutation.isPending ? 'Resolving words...' : 'Analyze sentence'}
              </button>
            </div>
          </div>

          {/* Token analysis result passage */}
          {response && (
            <div className="rounded border border-book-rule bg-page-surface p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-book-rule pb-3">
                <h3 className="text-lg font-bold text-ink-main">
                  Analyzed sentence
                </h3>
                <div className="flex items-center gap-4 text-sm text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-cognate-ink" />
                    Common Germanic
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
                * Words with an asterisk have been resolved to their base dictionary lemma from their inflected form. Click any word to inspect its cognates.
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
                Mutual intelligibility
              </h3>
              <p className="text-sm text-ink-muted mt-1">
                Estimated proportion of vocabulary recognizable across target languages.
              </p>

              <div className="my-6 text-center">
                <span className="font-mono text-5xl font-bold text-cognate-ink">
                  {response.universality_score.toFixed(0)}%
                </span>
                <span className="text-sm text-ink-muted block mt-1">
                  Vocabulary overlap score
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
