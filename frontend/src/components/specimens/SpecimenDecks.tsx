import React, { useState, useMemo } from 'react';
import { usePairsQuery, useFalseFriendsQuizQuery, useLanguagesQuery } from '../../services/queries';
import { getLanguageName } from '../../data/languages';
import type { SpecimenPair, SpecimenCategory } from '../../types/linguistics';
import { SpecimenRegisterTable } from './SpecimenRegisterTable';
import { SpecimenDetailDrawer } from './SpecimenDetailDrawer';
import { CheckCircle2, XCircle } from 'lucide-react';

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

  // Detail Drawer State
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

  const selectedSpecimen = useMemo(() => {
    if (selectedPairId === null) return null;
    return livePairs.find((p) => p.id === selectedPairId) || null;
  }, [livePairs, selectedPairId]);

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
    <div className="mx-auto max-w-6xl px-6 py-10 font-serif">
      {/* Chapter Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-book-rule pb-8 gap-6">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-main">
            Specimen Register
          </h2>
          <p className="mt-3 text-base text-ink-muted leading-relaxed max-w-2xl">
            A dense botanical register of Germanic cognates, articulatory sound shifts, and deceptive false friends across cataloged language pairs.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-md border border-book-rule bg-page-surface p-1 shadow-2xs font-sans">
          <button
            type="button"
            onClick={() => setViewMode('register')}
            className={`rounded px-4 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === 'register'
                ? 'bg-page-muted text-ink-main'
                : 'text-ink-muted hover:text-ink-main'
            }`}
          >
            Register View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('quiz')}
            className={`rounded px-4 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === 'quiz'
                ? 'bg-falsefriend-bg text-falsefriend-ink'
                : 'text-ink-muted hover:text-falsefriend-ink'
            }`}
          >
            False Friends Quiz
          </button>
        </div>
      </div>

      {/* Language Selection Header */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-book-rule bg-page-surface p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-sans text-xs text-ink-muted uppercase tracking-wider">Language Comparison:</span>
          <select
            value={sourceLang}
            onChange={(e) => {
              setSelectedSource(e.target.value);
              setSelectedTarget(null);
              setOffset(0);
            }}
            className="rounded border border-book-rule bg-page-bg px-3 py-1.5 text-ink-main font-semibold focus:outline-none"
          >
            {selectableLanguages.map((code) => (
              <option key={code} value={code}>
                {getLanguageName(code)}
              </option>
            ))}
          </select>
          <span className="text-ink-light">→</span>
          <select
            value={targetLang}
            onChange={(e) => {
              setSelectedTarget(e.target.value);
              setOffset(0);
            }}
            className="rounded border border-book-rule bg-page-bg px-3 py-1.5 text-ink-main font-semibold focus:outline-none"
          >
            {(availableTargets.length > 0 ? availableTargets : selectableLanguages.filter((c) => c !== sourceLang)).map((code) => (
              <option key={code} value={code}>
                {getLanguageName(code)}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-sans text-ink-light">
          Database: <span className="font-semibold text-ink-main">{livePairsData?.total?.toLocaleString() || 0}</span> cataloged pairs
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-6">
        {viewMode === 'register' ? (
          <SpecimenRegisterTable
            pairs={livePairs}
            total={livePairsData?.total || 0}
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
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setOffset(0);
            }}
            onSelectPair={(p) => setSelectedPairId(p.id)}
            selectedPairId={selectedPairId}
            isLoading={pairsLoading}
          />
        ) : (
          /* False Friends Quiz View */
          <div className="rounded-lg border border-book-rule bg-page-surface p-8 shadow-2xs max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-book-rule pb-4">
              <div>
                <span className="rounded border border-falsefriend-border bg-falsefriend-bg px-2 py-0.5 text-xs font-semibold text-falsefriend-ink font-sans">
                  False Friends Diagnostic
                </span>
                <h3 className="text-xl font-bold text-ink-main mt-2">
                  Semantic Divergence Test
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-ink-muted font-sans block">Score</span>
                <span className="text-2xl font-bold font-mono text-ink-main">
                  {quizScore} / {quizAnsweredCount}
                </span>
              </div>
            </div>

            {quizLoading ? (
              <div className="py-12 text-center text-ink-muted">Generating diagnostic items...</div>
            ) : !currentQuizItem ? (
              <div className="py-12 text-center text-ink-muted">No false friends available for this language pair.</div>
            ) : (
              <div className="space-y-6">
                <div className="bg-page-muted/50 p-6 rounded-md border border-book-rule text-center">
                  <span className="text-xs text-ink-light font-sans uppercase tracking-wider block mb-1">
                    What is the true meaning of the {getLanguageName(currentQuizItem.lang_a)} headword?
                  </span>
                  <div className="flex items-baseline justify-center gap-3">
                    <span className="text-3xl font-bold text-ink-main">{currentQuizItem.word_a}</span>
                    {currentQuizItem.ipa_a && (
                      <span className="font-mono text-base text-ink-muted">/{currentQuizItem.ipa_a}/</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-ink-muted italic">
                    (Deceptive counterpart in {getLanguageName(currentQuizItem.lang_b)}: <span className="font-bold">{currentQuizItem.word_b}</span>)
                  </p>
                </div>

                <div className="space-y-2.5">
                  {currentQuizItem.options.map((option, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === currentQuizItem.correct_option;
                    let btnStyle = 'border-book-rule bg-page-surface hover:bg-page-muted/50 text-ink-main';

                    if (selectedOption !== null) {
                      if (isCorrect) {
                        btnStyle = 'border-cognate-border bg-cognate-bg text-cognate-ink font-bold';
                      } else if (isSelected) {
                        btnStyle = 'border-falsefriend-border bg-falsefriend-bg text-falsefriend-ink font-bold';
                      } else {
                        btnStyle = 'border-book-rule bg-page-surface text-ink-light opacity-50';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuizAnswer(idx)}
                        disabled={selectedOption !== null}
                        className={`w-full rounded-md border p-4 text-left text-sm transition-all flex items-center justify-between ${btnStyle}`}
                      >
                        <span>{option}</span>
                        {selectedOption !== null && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-cognate-ink shrink-0" />
                        )}
                        {selectedOption !== null && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-falsefriend-ink shrink-0" />
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
                      className="rounded-md bg-ink-main px-6 py-2 text-sm font-semibold text-page-surface hover:bg-ink-muted transition-colors"
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

      {/* Slide-out Specimen Detail Drawer */}
      <SpecimenDetailDrawer
        specimen={selectedSpecimen}
        onClose={() => setSelectedPairId(null)}
      />
    </div>
  );
};
