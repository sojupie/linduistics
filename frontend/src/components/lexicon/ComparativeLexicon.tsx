import React, { useState, useMemo, useEffect } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { usePairsQuery, useLanguagesQuery } from '../../services/queries';
import type { WordPair, SpecimenCategory } from '../../types/linguistics';
import { LexiconTable } from './LexiconTable';
import { WordPairDetails } from './WordPairDetails';
import { LanguagePairSelect } from '../common/LanguagePicker';
import { MaterialSymbol } from '../common/MaterialSymbol';

export const ComparativeLexicon: React.FC = () => {
  const search = useSearch({ strict: false }) as {
    source?: string;
    target?: string;
    category?: string;
    id?: number;
    q?: string;
  };
  const navigate = useNavigate();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState(search.q ?? '');
  const [selectedFfRelation, setSelectedFfRelation] = useState<string | undefined>(undefined);
  const [selectedPos, setSelectedPos] = useState<string | undefined>(undefined);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Active Selected Pair State
  const [selectedPairId, setSelectedPairId] = useState<number | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useEffect(() => {
    setSelectedPairId(null);
    setMobileDetailOpen(Boolean(search.id));
  }, [search.id]);

  useEffect(() => {
    setSearchQuery(search.q ?? '');
    setOffset(0);
  }, [search.q]);

  // Load dynamically available languages from database
  const { data: languagesData } = useLanguagesQuery();

  const availableLanguages = languagesData?.languages ?? [];
  const defaultSource = availableLanguages.includes('sv') ? 'sv' : availableLanguages[0] ?? 'sv';
  const sourceLang =
    search?.source && availableLanguages.includes(search.source)
      ? search.source
      : defaultSource;

  const selectableLanguages = availableLanguages.length > 0 ? availableLanguages : [sourceLang, 'en'];

  const availableTargets = useMemo(() => {
    const targets = languagesData?.pairs?.length
      ? Array.from(new Set(
          languagesData.pairs
            .filter((p) => p.source === sourceLang)
            .map((p) => p.target),
        ))
      : selectableLanguages.filter((l) => l !== sourceLang);
    if (
      search.id && search.source === sourceLang && search.target &&
      search.target !== sourceLang && !targets.includes(search.target) &&
      (!languagesData || selectableLanguages.includes(search.target))
    ) {
      targets.push(search.target);
    }
    return targets.length > 0 ? targets : selectableLanguages.filter((l) => l !== sourceLang);
  }, [languagesData, sourceLang, selectableLanguages, search.id, search.source, search.target]);

  const defaultTarget = availableTargets.includes('da')
    ? 'da'
    : availableTargets[0] ?? (sourceLang === 'sv' ? 'en' : 'sv');
  const targetLang =
    search?.target && availableTargets.includes(search.target)
      ? search.target
      : defaultTarget;

  const selectedCategory = search?.category;

  // Query database for live pairs
  const {
    data: livePairsData,
    isLoading: pairsLoading,
    isError: pairsError,
    error: pairsErrorObj,
    refetch: refetchPairs,
  } = usePairsQuery({
    source: sourceLang,
    target: targetLang,
    id: search.id,
    category: selectedCategory,
    etymological_relation: selectedFfRelation,
    q: searchQuery.trim() || undefined,
    pos: selectedPos,
    limit,
    offset,
  });

  // Convert live comparison DTOs into WordPair objects
  const livePairs: WordPair[] = useMemo(() => {
    if (!livePairsData?.items || livePairsData.items.length === 0) {
      return [];
    }
    const validCategories = new Set([
      'true_cognate',
      'full_cognate',
      'false_friend',
      'cognate_false_friend',
      'accidental_lookalike',
      'partial_cognate',
      'semantic_narrowing',
      'semantic_broadening',
      'archaic_cognate',
      'sister_loanword',
      'translation_pair',
      'unrelated_equivalent',
      'independent_root',
      'other',
    ]);

    return livePairsData.items.map((dto) => {
      const cat: SpecimenCategory = validCategories.has(dto.category)
        ? (dto.category as SpecimenCategory)
        : 'other';

      return {
        id: dto.id,
        catalogId: dto.id.toString(),
        langA: dto.lang_a,
        wordA: dto.word_a,
        ipaA: dto.ipa_a,
        defA: dto.def_a,
        posA: dto.pos_a,
        langB: dto.lang_b,
        wordB: dto.word_b,
        ipaB: dto.ipa_b,
        defB: dto.def_b,
        posB: dto.pos_b,
        orthographicSim: dto.orthographic_sim,
        phoneticSim: dto.phonetic_sim,
        semanticSim: dto.semantic_sim,
        category: cat,
        rawCategory: dto.category,
        etymologicalRelation: dto.etymological_relation,
        sensesA: dto.senses_a || [],
        sensesB: dto.senses_b || [],
        etymRootA: dto.etym_root_a,
        etymRootB: dto.etym_root_b,
        sharedEtymRoot: dto.shared_etym_root,
        etymTextA: dto.etym_text_a,
        etymTextB: dto.etym_text_b,
      };
    });
  }, [livePairsData]);

  // Master-Detail active word pair: defaults to first item if none clicked
  const activePairId = selectedPairId ?? search.id ?? (livePairs.length > 0 ? livePairs[0].id : null);

  const selectedPair = useMemo(() => {
    if (activePairId === null) return null;
    return livePairs.find((p) => p.id === activePairId) || (livePairs.length > 0 ? livePairs[0] : null);
  }, [livePairs, activePairId]);

  // Update URL search parameters
  const updateUrl = (src: string, tgt: string, cat?: string) => {
    navigate({
      to: '/lexicon',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        source: src,
        target: tgt,
        category: cat !== undefined ? cat : selectedCategory,
      }),
      replace: true,
    });
  };

  // Change source language with smart target preservation and swapping
  const handleSourceChange = (newSource: string) => {
    if (newSource === sourceLang) return;

    // Get available targets for the newly selected source
    const targetsForNewSource = languagesData?.pairs
      ? Array.from(
          new Set(
            languagesData.pairs
              .filter((p) => p.source === newSource)
              .map((p) => p.target),
          ),
        )
      : [];

    let nextTarget: string;

    if (newSource === targetLang && search.id) {
      nextTarget = sourceLang;
    } else if (newSource === targetLang) {
      // Swapping: user picked the current target as the new source.
      // Swap the second option to the previous source if valid, otherwise first available target.
      if (targetsForNewSource.includes(sourceLang)) {
        nextTarget = sourceLang;
      } else {
        nextTarget = targetsForNewSource[0] ?? (newSource === 'sv' ? 'en' : 'sv');
      }
    } else if (targetsForNewSource.includes(targetLang)) {
      // Keep current target if still valid for new source
      nextTarget = targetLang;
    } else if (targetsForNewSource.includes(sourceLang)) {
      // Fallback to previous source if valid
      nextTarget = sourceLang;
    } else {
      // Otherwise fall back to first available target
      nextTarget = targetsForNewSource[0] ?? (newSource === 'sv' ? 'en' : 'sv');
    }

    setOffset(0);
    setSelectedPairId(null);
    updateUrl(newSource, nextTarget);
  };

  // Change target language
  const handleTargetChange = (newTarget: string) => {
    if (newTarget === targetLang) return;

    if (newTarget === sourceLang) {
      handleSourceChange(newTarget);
      return;
    }

    setOffset(0);
    setSelectedPairId(null);
    updateUrl(sourceLang, newTarget);
  };

  // Swap source and target
  const handleSwap = () => {
    handleSourceChange(targetLang);
  };

  const canSwap = useMemo(() => {
    if (search.id) return true;
    if (!languagesData?.pairs) return true;
    return languagesData.pairs.some(
      (p) => p.source === targetLang && p.target === sourceLang,
    );
  }, [languagesData, sourceLang, targetLang]);

  // Reset pagination offset on filter changes
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setOffset(0);
  };

  const handleCategoryChange = (cat: string | undefined) => {
    setOffset(0);
    navigate({
      to: '/lexicon',
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        if (cat) {
          next.category = cat;
        } else {
          delete next.category;
        }
        return next;
      },
      replace: true,
    });
  };

  const handleFfRelationChange = (relation: string | undefined) => {
    setSelectedFfRelation(relation);
    setOffset(0);
  };

  const handlePosChange = (pos: string | undefined) => {
    setSelectedPos(pos);
    setOffset(0);
  };


  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-5 font-serif">
      {/* Top Bar */}
      <div className="pb-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="typo-page-title">
            Comparative Lexicon
          </h1>
          <p className="typo-page-deck mt-1.5">
            Bilingual lexical comparisons across Germanic languages, tracking cognates, sound shifts, and false friends.
          </p>
        </div>

        {/* Language Comparison Selector */}
        <LanguagePairSelect
          label="Comparison:"
          sourceLang={sourceLang}
          targetLang={targetLang}
          availableSources={selectableLanguages}
          availableTargets={availableTargets}
          onSourceChange={handleSourceChange}
          onTargetChange={handleTargetChange}
          onSwap={handleSwap}
          canSwap={canSwap}
          plate
        />
      </div>

      {/* Master-Detail Layout with Independent Vertical Scrolling */}
      <div className="flex flex-col lg:flex-row border border-book-rule bg-page-bg divide-y lg:divide-y-0 lg:divide-x divide-book-rule lg:h-[calc(100vh-13rem)] overflow-visible lg:overflow-hidden">
        {/* Left: Lexicon Table Pane with Independent Item Scroll */}
        <div className={`${mobileDetailOpen ? 'hidden' : 'flex'} lg:flex flex-1 min-w-0 p-4 sm:p-5 h-[560px] lg:h-full w-full flex-col min-h-0`}>
          <LexiconTable
            pairs={livePairs}
            total={livePairsData?.total ?? 0}
            limit={limit}
            offset={offset}
            sourceLang={sourceLang}
            targetLang={targetLang}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            selectedFfRelation={selectedFfRelation}
            onFfRelationChange={handleFfRelationChange}
            selectedPos={selectedPos}
            onPosChange={handlePosChange}
            onPageChange={setOffset}
            onLimitChange={(l) => {
              setLimit(l);
              setOffset(0);
            }}
            onSelectPair={(p) => {
              setSelectedPairId(p.id);
              setMobileDetailOpen(true);
            }}
            selectedPairId={activePairId}
            isLoading={pairsLoading}
            isError={pairsError}
            errorMessage={pairsErrorObj instanceof Error ? pairsErrorObj.message : undefined}
            onRetry={() => refetchPairs()}
          />
        </div>

        {/* Right: Independently Scrollable Word Pair Details */}
        <div className={`${mobileDetailOpen ? 'block' : 'hidden'} lg:block w-full lg:w-[480px] xl:w-[520px] lg:shrink-0 p-5 sm:p-6 overflow-visible lg:overflow-y-auto lg:h-full bg-page-surface`}>
          <button type="button" onClick={() => setMobileDetailOpen(false)} className="lg:hidden mb-5 inline-flex items-center gap-2 typo-sublabel text-ink-muted hover:text-ink-main">
            <MaterialSymbol icon="arrow_back" size={18} />
            Back to results
          </button>
          {search.id && pairsLoading && !selectedPair ? (
            <div className="flex min-h-72 items-center justify-center gap-3 typo-note text-ink-muted" role="status" aria-live="polite">
              <span className="h-5 w-5 rounded-full border-2 border-cognate-ink border-t-transparent animate-spin" aria-hidden="true" />
              Loading word pair…
            </div>
          ) : (
            <WordPairDetails
              pair={selectedPair}
              sourceLang={sourceLang}
              targetLang={targetLang}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const SpecimenDecks = ComparativeLexicon;
