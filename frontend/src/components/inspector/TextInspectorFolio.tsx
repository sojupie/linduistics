import React, { useState } from 'react';
import { useInspectMutation } from '../../services/queries';
import { GERMANIC_LANGUAGES } from '../../data/languages';
import type { TokenAnalysis, InspectResponse } from '../../types/linguistics';
import { SpecimenTokenPill } from './SpecimenTokenPill';
import { SpecimenDetailDrawer } from './SpecimenDetailDrawer';
import { Microscope, Play, Sparkles, Layers, Globe } from 'lucide-react';
import { TOOLBAR_CONFIG, INSPECTOR_CONFIG } from '../../constants/config';

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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 font-serif">
      {/* Folio Header */}
      <div className="border-b border-border-hairline pb-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-specimen-moss">
            Laboratorium Lexicale · In Vivo Field Scanner
          </span>
          <span className="rounded border border-border-hairline bg-substrate-panel px-2 py-0.5 font-mono text-[9px] uppercase text-ink-muted">
            311,744 Resolved Word Forms
          </span>
        </div>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-ink-carbon">
          Universal Field Text Inspector
        </h2>
        <p className="mt-1.5 text-sm italic text-ink-muted max-w-2xl">
          Deconstruct continuous Germanic vernacular sentences into individual inflected specimens. Resolves grammatical forms to canonical dictionary lemmas and computes cross-lingual intelligibility.
        </p>
      </div>

      {/* Input Folio & Language Setup */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input text & configuration (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded border border-border-hairline bg-substrate-panel p-5 shadow-xs">
            {/* Language Controls & Sample Excerpts */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-ink-faint">
                  <Globe size={11} className="text-specimen-moss" />
                  Source:
                </span>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="rounded border border-border-hairline bg-substrate-dark px-2 py-0.5 font-serif text-xs text-ink-carbon focus:border-specimen-moss focus:outline-none"
                >
                  {GERMANIC_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] uppercase text-ink-faint mr-1 flex items-center gap-1">
                  <Sparkles size={11} className="text-specimen-ochre" />
                  Excerpts:
                </span>
                {SAMPLE_SENTENCES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputText(sample)}
                    className="rounded border border-border-hairline/60 bg-substrate-dark px-2 py-0.5 text-xs text-ink-muted hover:border-ink-faint hover:text-ink-carbon transition-colors"
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Textarea */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={INSPECTOR_CONFIG.DEFAULT_TEXTAREA_ROWS}
              placeholder="Inscribe a Germanic sentence to analyze cross-lingual universality..."
              className="w-full rounded border border-border-hairline bg-substrate-dark p-3.5 text-base text-ink-carbon placeholder-ink-faint focus:border-specimen-moss focus:outline-none"
            />

            {/* Target Language Toggles & Run Button */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border-hairline/60 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase text-ink-faint">
                  Target Field Observers:
                </span>
                {GERMANIC_LANGUAGES.filter((l) => l.code !== sourceLang).map((l) => {
                  const isChecked = targetLangs.includes(l.code);
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => handleToggleTarget(l.code)}
                      className={`rounded px-2.5 py-1 font-mono text-[11px] transition-colors border ${
                        isChecked
                          ? 'border-specimen-moss/40 bg-specimen-moss/10 text-specimen-moss font-bold'
                          : 'border-border-hairline bg-substrate-dark text-ink-faint hover:text-ink-muted'
                      }`}
                    >
                      {l.code.toUpperCase()} · {l.name}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={inspectMutation.isPending || !inputText.trim()}
                onClick={handleInspect}
                className="flex items-center gap-2 rounded border border-specimen-moss bg-specimen-moss px-5 py-2 font-serif text-xs font-bold text-substrate-dark shadow-sm hover:bg-specimen-moss/90 transition-colors disabled:opacity-50"
              >
                <Play size={TOOLBAR_CONFIG.ICON_SIZE_SM} fill="currentColor" />
                <span>{inspectMutation.isPending ? 'Resolving Forms...' : 'Analyze Sentence'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Token Inspection Display */}
          {response && (
            <div className="rounded border border-border-hairline bg-substrate-panel p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border-hairline pb-3">
                <div className="flex items-center gap-2">
                  <Microscope size={14} className="text-specimen-moss" />
                  <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                    Token Stream Observation
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px]">
                  <span className="flex items-center gap-1 text-specimen-moss">
                    <span className="h-1.5 w-1.5 rounded-full bg-specimen-moss" />
                    Universal Germanic
                  </span>
                  <span className="flex items-center gap-1 text-specimen-ochre">
                    <span className="h-1.5 w-1.5 rounded-full bg-specimen-ochre" />
                    Branch-Specific
                  </span>
                  <span className="flex items-center gap-1 text-ink-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-border-hairline" />
                    Isolate
                  </span>
                </div>
              </div>

              {/* Tokens Ribbon */}
              <div className="mt-5 flex flex-wrap items-center gap-2 p-4 rounded border border-border-hairline/60 bg-substrate-dark">
                {response.tokens.map((tok, idx) => (
                  <SpecimenTokenPill
                    key={idx}
                    tokenAnalysis={tok}
                    isSelected={selectedToken?.token === tok.token}
                    onSelect={(t) => setSelectedToken(t)}
                  />
                ))}
              </div>

              <p className="mt-3 font-mono text-[10px] text-ink-faint italic">
                * Asterisk indicates inflected form successfully resolved to base dictionary lemma via 311k word form index. Click token for detailed correspondences.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Universality Gauge & Token Detail Drawer (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Universality Score Gauge Card */}
          {response && (
            <div className="rounded border border-border-hairline bg-substrate-panel p-5 shadow-xs text-center">
              <span className="font-mono text-[9px] uppercase tracking-widest text-specimen-moss">
                Calculated Intelligibility
              </span>
              <h4 className="mt-1 font-serif text-lg font-bold text-ink-carbon">
                Universality Quotient
              </h4>

              {/* Gauge Graphic */}
              <div className="relative mx-auto my-4 flex h-32 w-32 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-border-hairline fill-none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * response.universality_score) / 100}
                    strokeLinecap="round"
                    className="text-specimen-moss fill-none transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                  <span className="text-2xl font-bold text-ink-carbon">
                    {response.universality_score.toFixed(0)}%
                  </span>
                  <span className="text-[9px] text-ink-muted uppercase">Score</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-border-hairline/60 pt-3 font-mono text-[11px]">
                <div>
                  <span className="text-ink-faint block text-[9px] uppercase">Total Tokens</span>
                  <span className="text-ink-carbon">{response.total_tokens}</span>
                </div>
                <div>
                  <span className="text-ink-faint block text-[9px] uppercase">Unique Tokens</span>
                  <span className="text-ink-carbon">{response.unique_tokens}</span>
                </div>
              </div>
            </div>
          )}

          {/* Token Drawer */}
          {selectedToken && (
            <SpecimenDetailDrawer
              tokenAnalysis={selectedToken}
              onClose={() => setSelectedToken(null)}
            />
          )}

          {!selectedToken && response && (
            <div className="rounded border border-dashed border-border-hairline bg-substrate-panel/50 p-6 text-center font-serif text-xs text-ink-muted">
              <Layers size={18} className="mx-auto mb-2 text-ink-faint" />
              Click any examined word token on the left to reveal its morphological breakdown and target cognate matches.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
