import React, { useState, useMemo } from 'react';
import { usePairsQuery, useFalseFriendsQuizQuery, useLanguagesQuery } from '../../services/queries';
import { getLanguageName } from '../../data/languages';
import type { SpecimenPair, SpecimenCategory } from '../../types/linguistics';
import { SpecimenRegisterTable } from './SpecimenRegisterTable';
import { SpecimenDossier } from './SpecimenDossier';
import { Phonetic } from '../common/Phonetic';
import { formatPos } from '../../utils/formatters';

type ViewMode = 'register' | 'quiz';

export const SpecimenDecks: React.FC = () => {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('register');

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

  // Query database for quiz items
  const {
    data: quizData,
    isLoading: quizLoading,
    refetch: refetchQuiz,
  } = useFalseFriendsQuizQuery(sourceLang, targetLang, 10, {
    enabled: viewMode === 'quiz',
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

  // Quiz State
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnsweredCount, setQuizAnsweredCount] = useState(0);

  const currentQuizItem = quizData?.[currentQuizIdx];

  const handleQuizAnswer = (optionIdx: number) => {
    if (selectedOption !== null || !currentQuizItem) return;
    setSelectedOption(optionIdx);
    setQuizAnsweredCount((prev) => prev + 1);
    if (optionIdx === currentQuizItem.correct_option) {
      setQuizScore((prev) => prev + 1);
    }
  };

  const handleNextQuizItem = () => {
    setSelectedOption(null);
    if (quizData && currentQuizIdx < quizData.length - 1) {
      setCurrentQuizIdx((prev) => prev + 1);
    } else {
      refetchQuiz();
      setCurrentQuizIdx(0);
    }
  };

  const selectableLanguages = availableLanguages.length > 0 ? availableLanguages : [sourceLang, targetLang];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 font-serif">
      {/* Chapter Top Bar */}
      <div className="border-b border-book-rule pb-4 mb-6 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-ink-main font-header">
            Specimen Register
          </h1>
          <p className="text-base sm:text-lg text-ink-muted mt-1.5 font-deck font-normal">
            Comparative ledger of Germanic lexical roots, sound shifts, and deceptive false friends.
          </p>
        </div>

        {/* Language Comparison Selector & View Mode */}
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-1 border border-book-rule p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('register')}
              className={`px-3 py-1 text-xs uppercase tracking-wider transition-colors ${
                viewMode === 'register'
                  ? 'bg-page-muted text-ink-main font-bold'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
            >
              Register Ledger
            </button>
            <button
              type="button"
              onClick={() => setViewMode('quiz')}
              className={`px-3 py-1 text-xs uppercase tracking-wider transition-colors ${
                viewMode === 'quiz'
                  ? 'bg-page-muted text-falsefriend-ink font-bold'
                  : 'text-ink-muted hover:text-falsefriend-ink'
              }`}
            >
              False Friends Quiz
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'register' ? (
        /* Disciplined Master-Detail Layout with Pinned Fixed-Width Editorial Dossier */
        <div className="flex flex-col lg:flex-row border border-book-rule bg-page-bg divide-y lg:divide-y-0 lg:divide-x divide-book-rule items-start">
          {/* Left: Scrollable Register Table */}
          <div className="flex-1 min-w-0 p-4 sm:p-5 overflow-hidden w-full">
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

          {/* Right: Pinned Specimen Dossier (Capped at 520px width) */}
          <div className="w-full lg:w-[480px] xl:w-[520px] lg:shrink-0 p-5 sm:p-6 lg:sticky lg:top-4 max-h-[calc(100vh-5rem)] overflow-y-auto bg-page-surface">
            <SpecimenDossier
              specimen={selectedSpecimen}
              sourceLang={sourceLang}
              targetLang={targetLang}
            />
          </div>
        </div>
      ) : (
        /* Quiz Mode: Scholarly Assessment Foliage */
        <div className="max-w-2xl mx-auto border border-book-rule p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-book-rule pb-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-ink-muted font-semibold block font-serif">
                Field Examination
              </span>
              <h3 className="text-xl font-bold text-ink-main font-serif">
                Deceptive Cognates & False Friends
              </h3>
            </div>
            <div className="text-right text-sm text-ink-muted">
              <span>Score: {quizScore} / {quizAnsweredCount}</span>
              <span className="text-xs text-ink-muted block uppercase tracking-wider mt-0.5">
                Question {currentQuizIdx + 1} of {quizData?.length || 10}
              </span>
            </div>
          </div>

          {quizLoading ? (
            <div className="py-12 text-center text-ink-muted italic text-sm">
              Extracting quiz items from lexical catalog...
            </div>
          ) : !currentQuizItem ? (
            <div className="py-12 text-center text-ink-muted italic text-sm">
              No false friend quiz specimens cataloged for {getLanguageName(sourceLang)} → {getLanguageName(targetLang)}.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border-b border-book-rule/60 pb-4">
                <span className="text-xs uppercase tracking-wider text-ink-muted font-semibold">
                  What is the primary modern definition of:
                </span>
                <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
                  <span className="text-2xl font-bold text-ink-main">
                    {currentQuizItem.word_a}{formatPos(currentQuizItem.pos_a) ? ',' : ''}
                  </span>
                  {formatPos(currentQuizItem.pos_a) && (
                    <span className="table-pos text-sm italic font-serif text-ink-muted">
                      {formatPos(currentQuizItem.pos_a)}
                    </span>
                  )}
                  {currentQuizItem.ipa_a && <Phonetic ipa={currentQuizItem.ipa_a} className="table-ipa" />}
                </div>
                <p className="mt-2 text-sm text-ink-muted italic">
                  Note counterpart in {getLanguageName(currentQuizItem.lang_b)}: <span className="font-bold text-ink-main">{currentQuizItem.word_b}</span>
                </p>
              </div>

              <div className="space-y-2.5">
                {currentQuizItem.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === currentQuizItem.correct_option;
                  let optStyle = 'border-book-rule text-ink-main hover:bg-page-muted/50';

                  if (selectedOption !== null) {
                    if (isCorrect) {
                      optStyle = 'border-ink-main bg-page-muted font-bold text-ink-main';
                    } else if (isSelected) {
                      optStyle = 'border-falsefriend-border text-falsefriend-ink font-semibold';
                    } else {
                      optStyle = 'border-book-rule text-ink-muted opacity-40';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuizAnswer(idx)}
                      disabled={selectedOption !== null}
                      className={`w-full border p-3.5 text-left text-sm transition-all flex items-center justify-between ${optStyle}`}
                    >
                      <span>{option}</span>
                      {selectedOption !== null && isCorrect && (
                        <span className="text-xs uppercase tracking-wider font-bold text-cognate-ink shrink-0">
                          [Correct]
                        </span>
                      )}
                      {selectedOption !== null && isSelected && !isCorrect && (
                        <span className="text-xs uppercase tracking-wider font-bold text-falsefriend-ink shrink-0">
                          [Deceived]
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className="pt-4 border-t border-book-rule flex justify-end">
                  <button
                    type="button"
                    onClick={handleNextQuizItem}
                    className="border border-ink-main px-4 py-1.5 text-xs uppercase tracking-wider text-ink-main hover:bg-page-muted transition-colors font-serif font-semibold"
                  >
                    Next Specimen →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
