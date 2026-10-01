import React, { useMemo, useState } from 'react';
import { getLanguageName, pairStatsToProfile } from '../../data/languages';
import { useLanguagesQuery } from '../../services/queries';
import type { LanguageProfile } from '../../types/linguistics';
import { LanguageComparisonControls } from './LanguageComparisonControls';
import { LanguageOverviewTable } from './LanguageOverviewTable';
import { LanguagePairBreakdown } from './LanguagePairBreakdown';
import { LanguagePairMatrix } from './LanguagePairMatrix';
import { LanguageRelationshipMap } from './LanguageRelationshipMap';
import { ErrorState } from '../common/ErrorState';
import {
  LANGUAGE_MAP,
  pairKey,
  samePair,
  sortLanguageProfiles,
  type LanguageMeasure,
  type LanguagePair,
  type LanguageSort,
} from './languageComparison';

export type { LanguageSort } from './languageComparison';

export interface LanguageOverviewProps {
  sort?: LanguageSort;
  onSortChange?: (sort: LanguageSort) => void;
}

export const LanguageOverview: React.FC<LanguageOverviewProps> = ({ sort = 'ease', onSortChange }) => {
  const { data, isPending, isError, error, refetch } = useLanguagesQuery();
  const [internalSort, setInternalSort] = useState<LanguageSort>(sort);
  const [chosenReference, setReference] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState<LanguagePair | null | undefined>(undefined);
  const [lastBreakdownPair, setLastBreakdownPair] = useState<LanguagePair | null>(null);
  const [measure, setMeasure] = useState<LanguageMeasure>('phonetic');

  const languages = data?.languages ?? [];
  const reference = chosenReference && languages.includes(chosenReference)
    ? chosenReference
    : languages[0] ?? LANGUAGE_MAP.defaultReference;
  const pairs = useMemo(() => new Map((data?.pairs ?? []).map((pair) => [pairKey(pair.source, pair.target), pair])), [data?.pairs]);
  const targetProfiles = useMemo<LanguageProfile[]>(() => (data?.pairs ?? [])
    .filter((pair) => pair.source === reference)
    .map(pairStatsToProfile), [data?.pairs, reference]);
  const activeSort = onSortChange ? sort : internalSort;
  const sortedTargets = useMemo(() => sortLanguageProfiles(targetProfiles, activeSort), [targetProfiles, activeSort]);
  const defaultPair = targetProfiles[0] ? { source: reference, target: targetProfiles[0].code } : null;
  const activePair = selectedPair === undefined ? defaultPair : selectedPair;
  const selectorPair = activePair ?? lastBreakdownPair ?? defaultPair;
  const selectorTarget = selectorPair?.source === reference ? selectorPair.target
    : selectorPair?.target === reference ? selectorPair.source
      : defaultPair?.target ?? '';
  const canSwap = !!selectorTarget && pairs.has(pairKey(selectorTarget, reference));
  const activePairData = activePair ? pairs.get(pairKey(activePair.source, activePair.target)) : undefined;
  const breakdownPair = activePair ?? lastBreakdownPair;
  const breakdownPairData = breakdownPair ? pairs.get(pairKey(breakdownPair.source, breakdownPair.target)) : undefined;
  const selectedProfile = breakdownPairData ? pairStatsToProfile(breakdownPairData) : undefined;
  const breakdownIsActive = !!activePair && !!activePairData;
  const selectedReferenceTarget = activePair
    ? activePair.source === reference ? activePair.target
      : activePair.target === reference ? activePair.source
        : null
    : null;

  const changeSort = (nextSort: LanguageSort) => {
    if (onSortChange) onSortChange(nextSort);
    else setInternalSort(nextSort);
  };

  const choosePair = (source: string, target: string) => {
    if (activePair?.source === source && activePair.target === target) {
      setLastBreakdownPair(activePair);
      setSelectedPair(null);
      return;
    }
    const pair = { source, target };
    setReference(source);
    setLastBreakdownPair(pair);
    setSelectedPair(pair);
  };

  const chooseReferenceTarget = (target: string) => {
    if (target === reference) return;
    if (samePair(activePair, reference, target)) {
      if (activePair) setLastBreakdownPair(activePair);
      setSelectedPair(null);
      return;
    }
    const pair = { source: reference, target };
    setLastBreakdownPair(pair);
    setSelectedPair(pair);
  };

  const choosePairSource = (source: string) => {
    const targets = (data?.pairs ?? []).filter((pair) => pair.source === source).map((pair) => pair.target);
    const target = targets.includes(selectorTarget) ? selectorTarget
      : targets.includes(reference) ? reference
        : targets[0];
    if (!target) return;
    const pair = { source, target };
    setReference(source);
    setLastBreakdownPair(pair);
    setSelectedPair(pair);
  };

  const choosePairTarget = (target: string) => {
    const pair = { source: reference, target };
    setLastBreakdownPair(pair);
    setSelectedPair(pair);
  };

  const swapPair = () => {
    if (!canSwap) return;
    const pair = { source: selectorTarget, target: reference };
    setReference(pair.source);
    setLastBreakdownPair(pair);
    setSelectedPair(pair);
  };

  if (isPending) {
    return (
      <main className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex items-center justify-center text-center typo-gloss text-ink-muted">
        Loading language comparisons…
      </main>
    );
  }
  if (isError || !languages.length) {
    return (
      <main className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-36 font-sans">
        <ErrorState
          title="Unable to load language comparisons"
          errorMessage={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      </main>
    );
  }

  return (
    <main className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-36 font-sans space-y-5">
      <header className="border-b border-book-rule pb-4 space-y-2">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="typo-page-title">Language Overview</h1>
            <p className="typo-page-deck mt-1.5">Pairwise comparisons showing phonetic similarity, spelling overlap, and lexical composition across cataloged word pairs.</p>
          </div>
        </div>
        <p className="typo-note text-ink-muted border-l-2 border-book-rule pl-3 py-0.5">
          <strong className="text-ink-main font-medium">Dataset scope:</strong> Metrics reflect algorithmic comparisons across cataloged lemma pairs in the reference lexicon sample. A given percentage (such as cognate pairs between Swedish and Norwegian) measures classified sample proportion rather than a hard limit on total vocabulary overlap or conversational mutual intelligibility.
        </p>
      </header>

      <LanguageComparisonControls
        languages={languages}
        availableTargets={languages}
        reference={reference}
        target={selectorTarget}
        measure={measure}
        canSwap={canSwap}
        onSourceChange={choosePairSource}
        onTargetChange={choosePairTarget}
        onSwap={swapPair}
        onMeasureChange={setMeasure}
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:gap-6">
        <div className="min-w-0 space-y-5">
          <LanguageOverviewTable
            referenceName={getLanguageName(reference)}
            rows={sortedTargets}
            selectedTarget={selectedReferenceTarget}
            sort={activeSort}
            measure={measure}
            onSortChange={changeSort}
            onMeasureChange={setMeasure}
            onSelectTarget={chooseReferenceTarget}
          />
          {selectedProfile && breakdownPair && (
            <LanguagePairBreakdown
              pair={breakdownPair}
              profile={selectedProfile}
              sourceName={getLanguageName(breakdownPair.source)}
              active={breakdownIsActive}
              measure={measure}
            />
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <LanguageRelationshipMap languages={languages} pairs={pairs} reference={reference} activePair={activePair ?? null} measure={measure} onChooseLanguage={chooseReferenceTarget} />
          <LanguagePairMatrix
            languages={languages}
            pairs={pairs}
            reference={reference}
            selectedTarget={selectedReferenceTarget}
            activePair={activePair ?? null}
            measure={measure}
            languageName={getLanguageName}
            onChooseLanguage={chooseReferenceTarget}
            onChoosePair={choosePair}
          />
        </div>
      </div>
    </main>
  );
};
