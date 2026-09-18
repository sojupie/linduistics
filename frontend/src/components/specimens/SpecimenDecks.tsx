import React, { useState, useMemo } from 'react';
import { usePairsQuery, useFalseFriendsQuizQuery, useLanguagesQuery } from '../../services/queries';
import { getLanguageName } from '../../data/languages';
import type { SpecimenCategory, SpecimenPair } from '../../types/linguistics';
import { SpecimenCard } from './SpecimenCard';
import { CheckCircle2, XCircle } from 'lucide-react';

type DeckFilter = 'all' | SpecimenCategory;
type ViewMode = 'list' | 'quiz';

export const SpecimenDecks: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<DeckFilter>('all');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Load dynamically available languages and pairs from database
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

  const apiCategory = useMemo(() => {
    switch (activeFilter) {
      case 'cognate':
        return 'true_cognate';
      case 'minefield':
        return 'false_friend';
      case 'cousin':
        return 'partial_cognate';
      case 'schism':
        return 'translation_pair';
      default:
        return undefined;
    }
  }, [activeFilter]);

  // Query database for live pairs
  const { data: livePairsData, isLoading: pairsLoading } = usePairsQuery({
    source: sourceLang,
    target: targetLang,
    category: apiCategory,
    limit: 50,
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
    return livePairsData.items.map((dto) => ({
      id: dto.id,
      catalogId: dto.id.toString(),
      wordA: dto.word_a,
      ipaA: dto.ipa_a,
      defA: dto.def_a,
      posA: dto.pos_a,
      wordB: dto.word_b,
      ipaB: dto.ipa_b,
      defB: dto.def_b,
      posB: dto.pos_b,
      orthographicSim: dto.orthographic_sim,
      phoneticSim: dto.phonetic_sim,
      semanticSim: dto.semantic_sim,
      category:
        dto.category === 'true_cognate' || dto.category === 'cognate'
          ? 'cognate'
          : dto.category === 'false_friend'
          ? 'minefield'
          : dto.category === 'partial_cognate' || dto.category === 'cousin'
          ? 'cousin'
          : 'schism',
      marginalia:
        dto.category === 'false_friend'
          ? 'Similar spelling or pronunciation, but with divergent meaning.'
          : dto.category === 'true_cognate' || dto.category === 'cognate'
          ? 'Directly shared roots with preserved meaning across languages.'
          : 'Phonetically shifted word with shared ancestry.',
    }));
  }, [livePairsData]);

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

  const sourceLangName = getLanguageName(sourceLang);
  const targetLangName = getLanguageName(targetLang);

  const selectableLanguages = availableLanguages.length > 0 ? availableLanguages : [sourceLang, targetLang];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 font-serif">
      {/* Chapter header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-book-rule pb-8 gap-6">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-main">
            Word pairs
          </h2>
          <p className="mt-3 text-lg text-ink-muted leading-relaxed max-w-2xl">
            A dictionary list of cognates, sound shifts, and deceptive false friends across cataloged languages.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center rounded border border-book-rule bg-page-surface p-1">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded px-4 py-2 text-sm transition-colors ${
              viewMode === 'list'
                ? 'bg-page-muted font-bold text-ink-main'
                : 'text-ink-muted hover:text-ink-main'
            }`}
          >
            Dictionary list
          </button>
          <button
            type="button"
            onClick={() => setViewMode('quiz')}
            className={`rounded px-4 py-2 text-sm transition-colors ${
              viewMode === 'quiz'
                ? 'bg-falsefriend-bg font-bold text-falsefriend-ink'
                : 'text-ink-muted hover:text-falsefriend-ink'
            }`}
          >
            False friends quiz
          </button>
        </div>
      </div>

      {/* Language selector & filter bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded border border-book-rule bg-page-surface p-4">
        {/* Language selector */}
        <div className="flex flex-wrap items-center gap-3 text-base">
          <span className="text-sm text-ink-muted">Language pair:</span>
          <select
            value={sourceLang}
            onChange={(e) => {
              setSelectedSource(e.target.value);
              setSelectedTarget(null);
            }}
            className="rounded border border-book-rule bg-page-bg px-3 py-1.5 text-ink-main focus:outline-none"
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
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="rounded border border-book-rule bg-page-bg px-3 py-1.5 text-ink-main focus:outline-none"
          >
            {(availableTargets.length > 0 ? availableTargets : selectableLanguages.filter((c) => c !== sourceLang)).map((code) => (
              <option key={code} value={code}>
                {getLanguageName(code)}
              </option>
            ))}
          </select>
        </div>

        {/* Category filters */}
        {viewMode === 'list' && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`rounded px-3 py-1.5 transition-colors border ${
                activeFilter === 'all'
                  ? 'bg-page-muted text-ink-main font-bold border-ink-main'
                  : 'bg-page-surface text-ink-muted border-book-rule hover:text-ink-main'
              }`}
            >
              All words
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('cognate')}
              className={`rounded px-3 py-1.5 transition-colors border ${
                activeFilter === 'cognate'
                  ? 'bg-cognate-bg text-cognate-ink font-bold border-cognate-border'
                  : 'bg-page-surface text-ink-muted border-book-rule hover:text-cognate-ink'
              }`}
            >
              True cognates
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('minefield')}
              className={`rounded px-3 py-1.5 transition-colors border ${
                activeFilter === 'minefield'
                  ? 'bg-falsefriend-bg text-falsefriend-ink font-bold border-falsefriend-border'
                  : 'bg-page-surface text-ink-muted border-book-rule hover:text-falsefriend-ink'
              }`}
            >
              False friends
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('cousin')}
              className={`rounded px-3 py-1.5 transition-colors border ${
                activeFilter === 'cousin'
                  ? 'bg-shifted-bg text-shifted-ink font-bold border-shifted-border'
                  : 'bg-page-surface text-ink-muted border-book-rule hover:text-shifted-ink'
              }`}
            >
              Sound shifts
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('schism')}
              className={`rounded px-3 py-1.5 transition-colors border ${
                activeFilter === 'schism'
                  ? 'bg-divergent-bg text-divergent-ink font-bold border-divergent-border'
                  : 'bg-page-surface text-ink-muted border-book-rule hover:text-divergent-ink'
              }`}
            >
              Different words
            </button>
          </div>
        )}
      </div>

      {/* Dictionary list */}
      {viewMode === 'list' && (
        <div className="mt-8 space-y-6">
          {pairsLoading && (
            <p className="py-12 text-center text-base text-ink-muted italic">
              Loading word entries...
            </p>
          )}

          {!pairsLoading && livePairs.length === 0 && (
            <div className="py-16 text-center border-y border-book-rule bg-page-surface rounded">
              <p className="text-xl font-bold text-ink-main">No cataloged pairs found in register</p>
              <p className="mt-2 text-base text-ink-muted max-w-md mx-auto">
                No lexical comparisons matching this filter were found for {sourceLangName} → {targetLangName}.
              </p>
            </div>
          )}

          {!pairsLoading && livePairs.length > 0 && (
            <div className="space-y-6">
              {livePairs.map((specimen) => (
                <SpecimenCard key={specimen.id} specimen={specimen} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* False friends quiz mode (Workbook style) */}
      {viewMode === 'quiz' && (
        <div className="mx-auto mt-8 max-w-2xl rounded border border-book-rule bg-page-surface p-8 shadow-xs">
          {quizLoading && (
            <p className="py-12 text-center text-base text-ink-muted italic">
              Loading quiz questions...
            </p>
          )}

          {!quizLoading && (!quizData || quizData.length === 0) && (
            <div className="py-12 text-center">
              <p className="text-xl font-bold text-ink-main">No false friends recorded</p>
              <p className="mt-2 text-base text-ink-muted">
                There are no false friends cataloged for {sourceLangName} → {targetLangName}.
              </p>
            </div>
          )}

          {!quizLoading && currentQuizItem && (
            <div>
              {/* Question header */}
              <div className="flex items-center justify-between border-b border-book-rule pb-4">
                <span className="text-sm font-medium text-ink-muted">
                  Question {currentQuizIdx + 1} of {quizData.length}
                </span>
                <span className="text-sm font-bold text-cognate-ink">
                  Score: {quizScore} / {quizAnsweredCount}
                </span>
              </div>

              {/* Prompt box */}
              <div className="mt-6 rounded border border-book-rule bg-page-bg p-6 text-center">
                <span className="text-sm text-ink-muted block">{sourceLangName} word</span>
                <h3 className="text-3xl font-bold text-ink-main mt-1">
                  {currentQuizItem.word_a}
                </h3>
                {currentQuizItem.ipa_a && (
                  <p className="font-mono text-sm text-ink-muted mt-1">/{currentQuizItem.ipa_a}/</p>
                )}
                <p className="mt-3 text-base italic text-ink-muted">
                  Meaning in {sourceLangName}: &ldquo;{currentQuizItem.def_a}&rdquo;
                </p>

                <div className="mt-4 pt-3 border-t border-book-rule text-base text-falsefriend-ink font-medium">
                  Deceptive twin in {targetLangName}:{' '}
                  <strong className="text-xl underline decoration-2">{currentQuizItem.word_b}</strong>
                </div>
              </div>

              {/* Option choices */}
              <div className="mt-6 space-y-3">
                <p className="text-base font-bold text-ink-main">
                  What does &ldquo;{currentQuizItem.word_b}&rdquo; mean in {targetLangName}?
                </p>

                {currentQuizItem.options.map((option, idx) => {
                  const isChosen = selectedOption === idx;
                  const isCorrect = idx === currentQuizItem.correct_option;

                  let optionStyle = 'border-book-rule bg-page-surface hover:bg-page-muted text-ink-main';
                  if (selectedOption !== null) {
                    if (isCorrect) {
                      optionStyle = 'border-cognate-border bg-cognate-bg text-cognate-ink font-bold';
                    } else if (isChosen) {
                      optionStyle = 'border-falsefriend-border bg-falsefriend-bg text-falsefriend-ink font-bold';
                    } else {
                      optionStyle = 'border-book-rule bg-page-surface opacity-50 text-ink-muted';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={selectedOption !== null}
                      onClick={() => handleQuizAnswer(idx)}
                      className={`flex w-full items-center justify-between rounded border p-4 text-left text-base transition-all ${optionStyle}`}
                    >
                      <span>{option}</span>
                      {selectedOption !== null && isCorrect && (
                        <CheckCircle2 size={20} className="text-cognate-ink shrink-0 ml-3" />
                      )}
                      {selectedOption !== null && isChosen && !isCorrect && (
                        <XCircle size={20} className="text-falsefriend-ink shrink-0 ml-3" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Next button */}
              {selectedOption !== null && (
                <div className="mt-8 flex items-center justify-between border-t border-book-rule pt-5">
                  <span className="text-base italic">
                    {selectedOption === currentQuizItem.correct_option ? (
                      <span className="text-cognate-ink font-bold">Correct answer.</span>
                    ) : (
                      <span className="text-falsefriend-ink">Deceived by the false friend.</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextQuizItem}
                    className="rounded border border-ink-main bg-ink-main px-5 py-2 text-base font-medium text-page-surface hover:opacity-90 transition-opacity"
                  >
                    Next question →
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
