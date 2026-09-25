import React, { useState, useMemo } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { usePairsQuery, useLanguagesQuery } from '../../services/queries';
import type { WordPair, SpecimenCategory } from '../../types/linguistics';
import { LexiconTable } from './LexiconTable';
import { WordPairDetails } from './WordPairDetails';
import { LanguagePairSelect } from '../common/LanguagePicker';

export const ComparativeLexicon: React.FC = () => {
  const search = useSearch({ strict: false }) as {
    source?: string;
    target?: string;
    category?: string;
  };
  const navigate = useNavigate();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFfType, setSelectedFfType] = useState<string | undefined>(undefined);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Active Selected Pair State
  const [selectedPairId, setSelectedPairId] = useState<number | null>(null);

  // Load dynamically available languages from database
  const { data: languagesData } = useLanguagesQuery();

  const availableLanguages = languagesData?.languages ?? [];
  const defaultSource = availableLanguages[0] ?? 'sv';
  const sourceLang =
    search?.source && availableLanguages.includes(search.source)
      ? search.source
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

  const defaultTarget = availableTargets[0] ?? (sourceLang === 'sv' ? 'en' : 'sv');
  const targetLang =
    search?.target && availableTargets.includes(search.target)
      ? search.target
      : defaultTarget;

  const selectedCategory = search?.category;

  // Query database for live pairs
  const { data: livePairsData, isLoading: pairsLoading } = usePairsQuery({
    source: sourceLang,
    target: targetLang,
    category: selectedCategory,
    false_friend_type: selectedFfType,
    q: searchQuery.trim() || undefined,
    limit,
    offset,
  });

  // Convert live comparison DTOs into WordPair objects
  const livePairs: WordPair[] = useMemo(() => {
    if (!livePairsData?.items || livePairsData.items.length === 0) {
      return [];
    }
    return livePairsData.items.map((dto) => {
      let cat: SpecimenCategory = 'other';
      if (dto.category === 'true_cognate' || dto.category === 'cognate') cat = 'true_cognate';
      else if (dto.category === 'false_friend') cat = 'false_friend';
      else if (dto.category === 'partial_cognate' || dto.category === 'cousin' || dto.category === 'sound_shift') cat = 'partial_cognate';
      else if (dto.category === 'translation_pair' || dto.category === 'schism') cat = 'translation_pair';
      else cat = 'other';

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
        falseFriendType: dto.false_friend_type,
        sensesA: dto.senses_a || [],
        sensesB: dto.senses_b || [],
        etymRoot: dto.etym_root,
        etymTextA: dto.etym_text_a,
        etymTextB: dto.etym_text_b,
      };
    });
  }, [livePairsData]);

  // Master-Detail active word pair: defaults to first item if none clicked
  const activePairId = selectedPairId ?? (livePairs.length > 0 ? livePairs[0].id : null);

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

    if (newSource === targetLang) {
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

  const handleFfTypeChange = (tier: string | undefined) => {
    setSelectedFfType(tier);
    setOffset(0);
  };

  const selectableLanguages = availableLanguages.length > 0 ? availableLanguages : [sourceLang, targetLang];

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
      <div className="flex flex-col lg:flex-row border border-book-rule bg-page-bg divide-y lg:divide-y-0 lg:divide-x divide-book-rule lg:h-[calc(100vh-13rem)] overflow-hidden">
        {/* Left: Lexicon Table Pane with Independent Item Scroll */}
        <div className="flex-1 min-w-0 p-4 sm:p-5 h-[560px] lg:h-full w-full flex flex-col min-h-0">
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
            selectedFfType={selectedFfType}
            onFfTypeChange={handleFfTypeChange}
            onPageChange={setOffset}
            onLimitChange={(l) => {
              setLimit(l);
              setOffset(0);
            }}
            onSelectPair={(p) => setSelectedPairId(p.id)}
            selectedPairId={activePairId}
            isLoading={pairsLoading}
          />
        </div>

        {/* Right: Independently Scrollable Word Pair Details */}
        <div className="w-full lg:w-[480px] xl:w-[520px] lg:shrink-0 p-5 sm:p-6 overflow-y-auto h-full bg-page-surface">
          <WordPairDetails
            pair={selectedPair}
            sourceLang={sourceLang}
            targetLang={targetLang}
          />
        </div>
      </div>
    </div>
  );
};

export const SpecimenDecks = ComparativeLexicon;
