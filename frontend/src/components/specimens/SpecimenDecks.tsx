import React, { useState, useMemo } from 'react';
import { usePairsQuery, useLanguagesQuery } from '../../services/queries';
import { getLanguageName } from '../../data/languages';
import type { SpecimenPair, SpecimenCategory } from '../../types/linguistics';
import { SpecimenRegisterTable } from './SpecimenRegisterTable';
import { SpecimenDossier } from './SpecimenDossier';

export const SpecimenDecks: React.FC = () => {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
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

  const defaultTarget = availableTargets[0] ?? (sourceLang === 'sv' ? 'en' : 'sv');
  const targetLang =
    selectedTarget && availableTargets.includes(selectedTarget)
      ? selectedTarget
      : defaultTarget;

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

  // Convert live comparison DTOs into SpecimenPair objects
  const livePairs: SpecimenPair[] = useMemo(() => {
    if (!livePairsData?.items || livePairsData.items.length === 0) {
      return [];
    }
    return livePairsData.items.map((dto) => {
      let cat: SpecimenCategory = 'alien';
      if (dto.category === 'true_cognate' || dto.category === 'cognate') cat = 'cognate';
      else if (dto.category === 'false_friend') cat = 'minefield';
      else if (dto.category === 'partial_cognate' || dto.category === 'cousin') cat = 'cousin';
      else if (dto.category === 'translation_pair' || dto.category === 'schism') cat = 'schism';

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

  // Master-Detail active specimen: defaults to first item if none clicked
  const activePairId = selectedPairId ?? (livePairs.length > 0 ? livePairs[0].id : null);

  const selectedSpecimen = useMemo(() => {
    if (activePairId === null) return null;
    return livePairs.find((p) => p.id === activePairId) || (livePairs.length > 0 ? livePairs[0] : null);
  }, [livePairs, activePairId]);

  // Reset pagination offset on filter changes
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setOffset(0);
  };

  const handleCategoryChange = (cat: string | undefined) => {
    setSelectedCategory(cat);
    setOffset(0);
  };

  const handleFfTypeChange = (tier: string | undefined) => {
    setSelectedFfType(tier);
    setOffset(0);
  };

  const selectableLanguages = availableLanguages.length > 0 ? availableLanguages : [sourceLang, targetLang];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-5 font-serif">
      {/* Chapter Top Bar (No hairline divider) */}
      <div className="pb-3 mb-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-ink-main font-header">
            Specimen Register
          </h1>
          <p className="text-base sm:text-lg text-ink-muted mt-1.5 font-deck font-normal">
            Comparative ledger of Germanic lexical roots, sound shifts, and deceptive false friends.
          </p>
        </div>

        {/* Language Comparison Selector */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink-muted uppercase tracking-wider text-xs font-semibold">Comparison:</span>
          <select
            value={sourceLang}
            onChange={(e) => {
              setSelectedSource(e.target.value);
              setSelectedTarget(null);
              setOffset(0);
              setSelectedPairId(null);
            }}
            className="border-b border-book-rule bg-transparent py-0.5 text-sm text-ink-main focus:border-ink-main focus:outline-none"
          >
            {selectableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {getLanguageName(lang)}
              </option>
            ))}
          </select>
          <span className="text-ink-muted font-serif">→</span>
          <select
            value={targetLang}
            onChange={(e) => {
              setSelectedTarget(e.target.value);
              setOffset(0);
              setSelectedPairId(null);
            }}
            className="border-b border-book-rule bg-transparent py-0.5 text-sm text-ink-main focus:border-ink-main focus:outline-none"
          >
            {availableTargets.map((lang) => (
              <option key={lang} value={lang}>
                {getLanguageName(lang)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Disciplined Master-Detail Layout with Independent Vertical Scrolling */}
      <div className="flex flex-col lg:flex-row border border-book-rule bg-page-bg divide-y lg:divide-y-0 lg:divide-x divide-book-rule lg:h-[calc(100vh-13rem)] overflow-hidden">
        {/* Left: Register Table Pane with Pinned Affordances and Independent Item Scroll */}
        <div className="flex-1 min-w-0 p-4 sm:p-5 h-[560px] lg:h-full w-full flex flex-col min-h-0">
          <SpecimenRegisterTable
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

        {/* Right: Independently Scrollable Specimen Dossier (Capped at 520px width) */}
        <div className="w-full lg:w-[480px] xl:w-[520px] lg:shrink-0 p-5 sm:p-6 overflow-y-auto h-full bg-page-surface">
          <SpecimenDossier
            specimen={selectedSpecimen}
            sourceLang={sourceLang}
            targetLang={targetLang}
          />
        </div>
      </div>
    </div>
  );
};
