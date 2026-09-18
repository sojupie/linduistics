import React, { useEffect } from 'react';
import { X, ArrowRight, BookOpen, GitFork, Sparkles, Scale, Info, Layers } from 'lucide-react';
import type { SpecimenPair, SenseItem } from '../../types/linguistics';
import { getLanguageName } from '../../data/languages';
import { useClusterByRootQuery } from '../../services/queries';

interface SpecimenDetailDrawerProps {
  specimen: SpecimenPair | null;
  onClose: () => void;
}

export const SpecimenDetailDrawer: React.FC<SpecimenDetailDrawerProps> = ({
  specimen,
  onClose,
}) => {
  const { data: cognateCluster } = useClusterByRootQuery(
    specimen?.etymRoot
  );

  // Listen for ESC key to dismiss drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!specimen) return null;

  const sourceName = getLanguageName(specimen.langA);
  const targetName = getLanguageName(specimen.langB);

  const getBadgeStyle = () => {
    switch (specimen.category) {
      case 'cognate':
        return 'text-cognate-ink bg-cognate-bg border-cognate-border';
      case 'minefield':
        return 'text-falsefriend-ink bg-falsefriend-bg border-falsefriend-border';
      case 'cousin':
        return 'text-shifted-ink bg-shifted-bg border-shifted-border';
      case 'schism':
        return 'text-divergent-ink bg-divergent-bg border-divergent-border';
      default:
        return 'text-ink-muted bg-page-muted border-book-rule';
    }
  };

  const getCategoryLabel = () => {
    switch (specimen.category) {
      case 'cognate':
        return 'True Cognate';
      case 'minefield':
        return specimen.falseFriendType === 'etymological_shift'
          ? 'False Friend [Tier A: Etymological]'
          : 'False Friend [Tier B: Surface Collision]';
      case 'cousin':
        return 'Sound Shift (Partial Cognate)';
      case 'schism':
        return 'Translation Pair';
      default:
        return 'Word Pair';
    }
  };

  const getTierExplanation = () => {
    if (specimen.category === 'minefield') {
      if (specimen.falseFriendType === 'etymological_shift') {
        return 'Academic False Friend: Headwords share a verified common ancestral etymon (Proto-Germanic or Latin), but their semantic trajectories diverged over historical centuries.';
      }
      return 'Casual False Friend: Accidental orthographic or phonetic convergence between unrelated roots or independent foreign borrowings.';
    }
    if (specimen.category === 'cognate') {
      return 'Shared historical ancestry with conserved conceptual meaning across both Germanic branches.';
    }
    if (specimen.category === 'cousin') {
      return 'Phonetically or semantically drifted cognate retaining partial conceptual overlap.';
    }
    if (specimen.category === 'schism') {
      return 'Semantic translation pair lacking direct phonetic or orthographic cognacy.';
    }
    return '';
  };

  const renderSenseCard = (sense: SenseItem, langLabel: string) => {
    const isAligned = sense.is_active_match;
    const isHistorical = !sense.is_active;

    return (
      <div
        key={sense.sense_id}
        className={`relative rounded-md border p-3.5 transition-all text-sm leading-relaxed ${
          isAligned
            ? 'border-cognate-border bg-cognate-bg/35 shadow-2xs'
            : isHistorical
            ? 'border-book-rule-muted bg-page-muted/50 opacity-75'
            : 'border-book-rule bg-page-surface'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold text-ink-light">
              #{sense.sense_id}
            </span>
            {sense.pos && (
              <span className="text-xs italic text-ink-muted">({sense.pos})</span>
            )}
            {isHistorical && (
              <span className="rounded bg-amber-100 text-amber-900 px-1.5 py-0.2 text-[11px] font-medium">
                historical / archaic
              </span>
            )}
          </div>

          {isAligned && (
            <span className="inline-flex items-center gap-1 rounded border border-cognate-border bg-cognate-bg px-2 py-0.5 text-xs font-semibold text-cognate-ink">
              <Sparkles className="w-3 h-3" /> Active Match
            </span>
          )}
        </div>

        <p className={`font-serif ${isAligned ? 'font-medium text-ink-main' : 'text-ink-muted'}`}>
          {sense.gloss}
        </p>

        {sense.similarity_to_counterpart !== undefined && (
          <div className="mt-2 flex items-center justify-between pt-2 border-t border-book-rule/60 text-xs text-ink-light">
            <span>Affinity to {langLabel} aligned sense:</span>
            <span className="font-mono font-medium text-ink-main">
              {Math.round(sense.similarity_to_counterpart * 100)}%
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-ink-main/25 backdrop-blur-2xs transition-opacity"
      />

      {/* Slide-out Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-screen max-w-2xl bg-page-bg border-l border-book-rule shadow-2xl flex flex-col font-serif">
          {/* Top Bar Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-book-rule bg-page-surface">
            <div className="flex items-center gap-2 text-xs text-ink-muted uppercase tracking-wider font-sans">
              <BookOpen className="w-3.5 h-3.5 text-ink-light" />
              <span>Specimen Register Entry #{specimen.catalogId}</span>
              <span>·</span>
              <span>{sourceName} ↔ {targetName}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-ink-muted hover:text-ink-main hover:bg-page-muted transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Primary Headwords Card */}
            <div className="rounded-lg border border-book-rule bg-page-surface p-5 shadow-2xs">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-book-rule pb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-xs font-sans text-ink-light uppercase tracking-wider block">
                      {sourceName}
                    </span>
                    <span className="text-2xl font-bold text-ink-main">{specimen.wordA}</span>
                    {specimen.ipaA && (
                      <span className="ml-2 font-mono text-sm text-ink-muted">/{specimen.ipaA}/</span>
                    )}
                    {specimen.posA && (
                      <span className="ml-1 text-xs italic text-ink-light">({specimen.posA})</span>
                    )}
                  </div>

                  <ArrowRight className="w-5 h-5 text-ink-light mx-2" />

                  <div>
                    <span className="text-xs font-sans text-ink-light uppercase tracking-wider block">
                      {targetName}
                    </span>
                    <span className="text-2xl font-bold text-ink-main">{specimen.wordB}</span>
                    {specimen.ipaB && (
                      <span className="ml-2 font-mono text-sm text-ink-muted">/{specimen.ipaB}/</span>
                    )}
                    {specimen.posB && (
                      <span className="ml-1 text-xs italic text-ink-light">({specimen.posB})</span>
                    )}
                  </div>
                </div>

                <span className={`rounded border px-2.5 py-1 text-xs font-semibold ${getBadgeStyle()}`}>
                  {getCategoryLabel()}
                </span>
              </div>

              {/* Classification Rationale */}
              <div className="mt-3 text-sm text-ink-muted leading-relaxed flex items-start gap-2 bg-page-muted/60 p-3 rounded border border-book-rule/60">
                <Info className="w-4 h-4 text-ink-light shrink-0 mt-0.5" />
                <span>{getTierExplanation()}</span>
              </div>
            </div>

            {/* Continuous Metric Gauges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-book-rule bg-page-surface p-3 text-center">
                <span className="text-xs font-sans text-ink-light uppercase tracking-wider block mb-1">
                  Orthography
                </span>
                <span className="text-lg font-bold font-mono text-ink-main">
                  {Math.round(specimen.orthographicSim * 100)}%
                </span>
                <div className="mt-2 h-1.5 w-full bg-page-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ink-muted rounded-full"
                    style={{ width: `${Math.round(specimen.orthographicSim * 100)}%` }}
                  />
                </div>
              </div>

              <div className="rounded-md border border-book-rule bg-page-surface p-3 text-center">
                <span className="text-xs font-sans text-ink-light uppercase tracking-wider block mb-1">
                  Phonetics (Articulatory)
                </span>
                <span className="text-lg font-bold font-mono text-ink-main">
                  {Math.round(specimen.phoneticSim * 100)}%
                </span>
                <div className="mt-2 h-1.5 w-full bg-page-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ink-muted rounded-full"
                    style={{ width: `${Math.round(specimen.phoneticSim * 100)}%` }}
                  />
                </div>
              </div>

              <div className="rounded-md border border-book-rule bg-page-surface p-3 text-center">
                <span className="text-xs font-sans text-ink-light uppercase tracking-wider block mb-1">
                  Semantics (Aligned)
                </span>
                <span className="text-lg font-bold font-mono text-ink-main">
                  {Math.round(specimen.semanticSim * 100)}%
                </span>
                <div className="mt-2 h-1.5 w-full bg-page-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ink-muted rounded-full"
                    style={{ width: `${Math.round(specimen.semanticSim * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Etymological Lineage & Ancestry */}
            {(specimen.etymRoot || specimen.etymTextA || specimen.etymTextB) && (
              <div className="rounded-lg border border-book-rule bg-page-surface p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-book-rule pb-2">
                  <GitFork className="w-4 h-4 text-ink-light" />
                  <h4 className="text-sm font-bold uppercase tracking-wider font-sans text-ink-main">
                    Etymological Lineage & Ancestral Root
                  </h4>
                </div>

                {specimen.etymRoot && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-sans text-ink-light">Ancestral Etymon:</span>
                    <span className="font-mono font-bold text-cognate-ink bg-cognate-bg px-2 py-0.5 rounded border border-cognate-border">
                      {specimen.etymRoot}
                    </span>
                  </div>
                )}

                {specimen.etymTextA && (
                  <div className="text-xs text-ink-muted leading-relaxed border-l-2 border-book-rule pl-3">
                    <span className="font-sans font-semibold text-ink-main block mb-0.5">{sourceName} Lineage:</span>
                    <p>{specimen.etymTextA}</p>
                  </div>
                )}

                {specimen.etymTextB && (
                  <div className="text-xs text-ink-muted leading-relaxed border-l-2 border-book-rule pl-3">
                    <span className="font-sans font-semibold text-ink-main block mb-0.5">{targetName} Lineage:</span>
                    <p>{specimen.etymTextB}</p>
                  </div>
                )}

                {/* Pan-Germanic Sister Cognates (Multi-Language Clique) */}
                {cognateCluster && cognateCluster.members && cognateCluster.members.length > 0 && (
                  <div className="pt-3 border-t border-book-rule/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-ink-main flex items-center gap-1.5 font-sans">
                        <Layers className="w-3.5 h-3.5 text-cognate-ink" />
                        Pan-Germanic Sister Cognates ({cognateCluster.language_count} Languages)
                      </span>
                      <span className="text-[11px] font-mono text-ink-light bg-page-muted px-2 py-0.5 rounded border border-book-rule">
                        {cognateCluster.proto_language}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cognateCluster.members.map((m, idx) => (
                        <div
                          key={idx}
                          className="rounded border border-book-rule/70 bg-page-muted/30 p-2 text-xs flex items-start justify-between gap-2 hover:bg-page-muted/50 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-ink-main/10 text-ink-main uppercase shrink-0">
                                {m.lang}
                              </span>
                              <span className="font-serif font-bold text-sm text-ink-main truncate">
                                {m.word}
                              </span>
                              {m.ipa && (
                                <span className="font-mono text-[11px] text-ink-light shrink-0">
                                  /{m.ipa}/
                                </span>
                              )}
                            </div>
                            {m.gloss && (
                              <p className="text-[11px] text-ink-muted italic line-clamp-1">
                                "{m.gloss}"
                              </p>
                            )}
                          </div>
                          {m.pos && (
                            <span className="text-[10px] text-ink-light uppercase shrink-0">
                              {m.pos}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* The Polysemous Contrast Matrix */}
            <div className="space-y-4">
              <div className="border-b border-book-rule pb-2">
                <h4 className="text-base font-bold text-ink-main flex items-center gap-2">
                  <Scale className="w-4 h-4 text-ink-light" />
                  Polysemous Contrast Matrix
                </h4>
                <p className="text-xs text-ink-muted mt-1 font-sans">
                  Comprehensive comparison of all recorded dictionary senses. The highlighted green pair generated the primary semantic alignment.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Word A Senses */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-sans font-semibold text-ink-main uppercase tracking-wider">
                      {sourceName} ({specimen.sensesA?.length || 1})
                    </span>
                    <span className="text-xs font-mono text-ink-light">
                      {specimen.wordA}
                    </span>
                  </div>

                  {specimen.sensesA && specimen.sensesA.length > 0 ? (
                    specimen.sensesA.map((s) => renderSenseCard(s, targetName))
                  ) : (
                    <div className="rounded border border-book-rule bg-page-surface p-3 text-sm text-ink-muted">
                      {specimen.defA}
                    </div>
                  )}
                </div>

                {/* Word B Senses */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-sans font-semibold text-ink-main uppercase tracking-wider">
                      {targetName} ({specimen.sensesB?.length || 1})
                    </span>
                    <span className="text-xs font-mono text-ink-light">
                      {specimen.wordB}
                    </span>
                  </div>

                  {specimen.sensesB && specimen.sensesB.length > 0 ? (
                    specimen.sensesB.map((s) => renderSenseCard(s, sourceName))
                  ) : (
                    <div className="rounded border border-book-rule bg-page-surface p-3 text-sm text-ink-muted">
                      {specimen.defB}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
