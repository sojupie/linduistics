import React, { useState, useEffect, useCallback } from 'react';
import { useFalseFriendsQuizQuery, useLanguagesQuery } from '../../services/queries';
import { getLanguageName } from '../../data/languages';
import { Phonetic } from '../common/Phonetic';
import { formatPos, getPosFullName } from '../../utils/formatters';
import type { QuizItemDto } from '../../types/linguistics';
import { LanguagePairSelect } from '../common/LanguagePicker';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { InclusionPill } from '../common/InclusionPill';
import { ErrorState } from '../common/ErrorState';

type ViewingMode = 'blind' | 'target_only' | 'comparative';

interface QuizAnswerRecord {
  item: QuizItemDto;
  selectedOption: number;
  isCorrect: boolean;
  isTrap: boolean;
}

export const FalseFriendsQuiz: React.FC = () => {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  // Load dynamically available languages from database
  const { data: languagesData } = useLanguagesQuery();
  const availableLanguages = languagesData?.languages ?? [];
  const defaultSource = availableLanguages.includes('sv') ? 'sv' : availableLanguages[0] ?? 'sv';
  const sourceLang =
    selectedSource && availableLanguages.includes(selectedSource)
      ? selectedSource
      : defaultSource;

  const availableTargets = React.useMemo(() => {
    if (!languagesData?.pairs) return [];
    return Array.from(
      new Set(
        languagesData.pairs
          .filter((p) => p.source === sourceLang)
          .map((p) => p.target),
      ),
    );
  }, [languagesData, sourceLang]);

  const defaultTarget = availableTargets.includes('da')
    ? 'da'
    : availableTargets[0] ?? (sourceLang === 'sv' ? 'en' : 'sv');
  const targetLang =
    selectedTarget && availableTargets.includes(selectedTarget)
      ? selectedTarget
      : defaultTarget;

  const canSwap = React.useMemo(() => {
    if (!languagesData?.pairs) return false;
    return languagesData.pairs.some(
      (p) => p.source === targetLang && p.target === sourceLang,
    );
  }, [languagesData, sourceLang, targetLang]);

  // Viewing Mode State
  const [viewingMode, setViewingMode] = useState<ViewingMode>(() => {
    const saved = localStorage.getItem('linduistics_quiz_view_mode');
    return (saved as ViewingMode) || 'blind';
  });

  const [selectedRelation, setSelectedRelation] = useState<string>('all');
  const [showSourceHint, setShowSourceHint] = useState(false);

  // POS include set: all known POS except 'name' are included by default.
  // Using a Set<string> where absence means excluded.
  const ALL_QUIZ_POS = ['noun', 'verb', 'adj', 'adv', 'prep', 'pron', 'intj', 'num', 'conj', 'det', 'name'] as const;
  const [includedPos, setIncludedPos] = useState<Set<string>>(
    () => new Set(ALL_QUIZ_POS.filter((p) => p !== 'name')),
  );
  // Compute the pos_include param: only send when not all POS are included
  const posInclude = includedPos.size === ALL_QUIZ_POS.length
    ? undefined
    : Array.from(includedPos).join(',') || undefined;

  useEffect(() => {
    localStorage.setItem('linduistics_quiz_view_mode', viewingMode);
  }, [viewingMode]);

  // Quiz State
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [trapsAvoided, setTrapsAvoided] = useState(0);
  const [trapsTriggered, setTrapsTriggered] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isRoundFinished, setIsRoundFinished] = useState(false);
  const [showAutopsy, setShowAutopsy] = useState(true);
  const [roundHistory, setRoundHistory] = useState<QuizAnswerRecord[]>([]);

  const {
    data: quizData,
    isLoading: quizLoading,
    isError: quizError,
    error: quizErrorObj,
    refetch: refetchQuiz,
  } = useFalseFriendsQuizQuery(sourceLang, targetLang, 10, selectedRelation, posInclude);

  const currentQuizItem = quizData?.[currentQuizIdx];

  const handleQuizAnswer = useCallback(
    (optionIdx: number) => {
      if (selectedOption !== null || !currentQuizItem) return;
      setSelectedOption(optionIdx);

      const isCorrect = optionIdx === currentQuizItem.correct_option;
      const isTrap = typeof currentQuizItem.trap_option === 'number' && optionIdx === currentQuizItem.trap_option;

      setRoundHistory((prev) => [
        ...prev,
        {
          item: currentQuizItem,
          selectedOption: optionIdx,
          isCorrect,
          isTrap,
        },
      ]);

      if (isCorrect) {
        setQuizScore((prev) => prev + 1);
        setCurrentStreak((prev) => {
          const next = prev + 1;
          setMaxStreak((m) => Math.max(m, next));
          return next;
        });
        if (typeof currentQuizItem.trap_option === 'number') {
          setTrapsAvoided((prev) => prev + 1);
        }
      } else {
        setCurrentStreak(0);
        if (isTrap) {
          setTrapsTriggered((prev) => prev + 1);
        }
      }
    },
    [selectedOption, currentQuizItem],
  );

  const handleNextQuizItem = useCallback(() => {
    setSelectedOption(null);
    setShowSourceHint(false);
    if (quizData && currentQuizIdx < quizData.length - 1) {
      setCurrentQuizIdx((prev) => prev + 1);
    } else {
      setIsRoundFinished(true);
    }
  }, [quizData, currentQuizIdx]);

  const handleRestartQuiz = () => {
    setIsRoundFinished(false);
    setCurrentQuizIdx(0);
    setSelectedOption(null);
    setShowSourceHint(false);
    setQuizScore(0);
    setCurrentStreak(0);
    setMaxStreak(0);
    setTrapsAvoided(0);
    setTrapsTriggered(0);
    setHintsUsed(0);
    setRoundHistory([]);
    refetchQuiz();
  };

  const handleSwap = () => {
    if (!canSwap) return;
    const oldSource = sourceLang;
    const oldTarget = targetLang;
    setSelectedSource(oldTarget);
    setSelectedTarget(oldSource);
    handleRestartQuiz();
  };

  const handleRevealHint = () => {
    setShowSourceHint(true);
    setHintsUsed((prev) => prev + 1);
  };

  // Keyboard navigation: 1-4 for options, Space/Enter for Next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isRoundFinished || quizLoading || !currentQuizItem) return;

      if (selectedOption === null) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          if (idx < currentQuizItem.options.length) {
            e.preventDefault();
            handleQuizAnswer(idx);
          }
        } else if (e.key === 'h' || e.key === 'H') {
          if (!showSourceHint && (viewingMode === 'blind' || viewingMode === 'target_only')) {
            e.preventDefault();
            handleRevealHint();
          }
        }
      } else {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextQuizItem();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOption, isRoundFinished, quizLoading, currentQuizItem, handleQuizAnswer, handleNextQuizItem, showSourceHint, viewingMode]);

  const selectableLanguages = availableLanguages.length > 0 ? availableLanguages : [sourceLang, targetLang];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-5 font-serif max-w-4xl mx-auto">
      {/* Quiz Header & Language Pair Selection (same section, under the text) */}
      <div className="pb-4 mb-4 border-b border-book-rule space-y-3">
        <div>
          <h1 className="typo-page-title">False Friends Quiz</h1>
          <p className="typo-page-deck mt-1.5">
            Identify true definitions and distinguish false friends across Germanic language pairs.
          </p>
        </div>

        {/* Language Pair Selector */}
        <div>
          <LanguagePairSelect
            label="Pair:"
            sourceLang={sourceLang}
            targetLang={targetLang}
            availableSources={selectableLanguages}
            availableTargets={availableTargets}
            onSourceChange={(code) => {
              setSelectedSource(code);
              setSelectedTarget(null);
              handleRestartQuiz();
            }}
            onTargetChange={(code) => {
              setSelectedTarget(code);
              handleRestartQuiz();
            }}
            onSwap={handleSwap}
            canSwap={canSwap}
            plate={false}
          />
        </div>
      </div>

      {/* Isolated Deck Controls: Etymological Type & Viewing Mode */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Row 1: Origin & View */}
        <div className="flex flex-col justify-between gap-3">
          {/* Etymological Type Filter Segmented Control */}
          <div className="flex items-center gap-2">
            <span className="typo-sublabel text-ink-muted">Origin:</span>
            <div className="inline-flex items-center border border-book-rule bg-page-muted/50 p-0.5 rounded-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedRelation('all');
                  handleRestartQuiz();
                }}
                className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${selectedRelation === 'all'
                  ? 'bg-page-surface border-ink-main text-ink-main font-semibold shadow-2xs'
                  : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/60'
                  }`}
                title="Test all false friends, including pairs with unknown etymological origin"
              >
                {selectedRelation === 'all' && (
                  <MaterialSymbol icon="check" size={14} className="text-cognate-ink shrink-0" />
                )}
                <span>All Pairs</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRelation('cognate');
                  handleRestartQuiz();
                }}
                className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${selectedRelation === 'cognate'
                  ? 'bg-page-surface border-ink-main text-ink-main font-semibold shadow-2xs'
                  : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/60'
                  }`}
                title="Historically related words whose modern meanings have diverged enough to mislead."
              >
                {selectedRelation === 'cognate' && (
                  <MaterialSymbol icon="check" size={14} className="text-cognate-ink shrink-0" />
                )}
                <span>Cognate false friends</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRelation('false_cognate');
                  handleRestartQuiz();
                }}
                className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${selectedRelation === 'false_cognate'
                  ? 'bg-page-surface border-ink-main text-ink-main font-semibold shadow-2xs'
                  : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/60'
                  }`}
                title="Similar-looking words with distinct recorded roots."
              >
                {selectedRelation === 'false_cognate' && (
                  <MaterialSymbol icon="check" size={14} className="text-cognate-ink shrink-0" />
                )}
                <span>False cognates</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRelation('unknown');
                  handleRestartQuiz();
                }}
                className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${selectedRelation === 'unknown'
                  ? 'bg-page-surface border-ink-main text-ink-main font-semibold shadow-2xs'
                  : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/60'
                  }`}
                title="Similar-looking words whose historical relationship remains unverified in the available records."
              >
                {selectedRelation === 'unknown' && (
                  <MaterialSymbol icon="check" size={14} className="text-cognate-ink shrink-0" />
                )}
                <span>Origin unknown</span>
              </button>
            </div>
          </div>

          {/* Viewing Mode Segmented Control */}
          <div className="flex items-center gap-2">
            <span className="typo-sublabel text-ink-muted">View:</span>
            <div className="inline-flex items-center border border-book-rule bg-page-muted/50 p-0.5 rounded-xs">
              <button
                type="button"
                onClick={() => setViewingMode('blind')}
                className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${viewingMode === 'blind'
                  ? 'bg-page-surface border-ink-main text-ink-main font-semibold shadow-2xs'
                  : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/60'
                  }`}
                title="Both headwords shown, but source definition masked to prevent triangulation"
              >
                {viewingMode === 'blind' && (
                  <MaterialSymbol icon="check" size={14} className="text-cognate-ink shrink-0" />
                )}
                <span>Blind Deck</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingMode('target_only')}
                className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${viewingMode === 'target_only'
                  ? 'bg-page-surface border-ink-main text-ink-main font-semibold shadow-2xs'
                  : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/60'
                  }`}
                title="Only target word displayed; counterpart reveals upon answering"
              >
                {viewingMode === 'target_only' && (
                  <MaterialSymbol icon="check" size={14} className="text-cognate-ink shrink-0" />
                )}
                <span>Target Only</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingMode('comparative')}
                className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${viewingMode === 'comparative'
                  ? 'bg-page-surface border-ink-main text-ink-main font-semibold shadow-2xs'
                  : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/60'
                  }`}
                title="Source definition visible upfront (assisted study)"
              >
                {viewingMode === 'comparative' && (
                  <MaterialSymbol icon="check" size={14} className="text-cognate-ink shrink-0" />
                )}
                <span>Assisted</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Part of Speech Include Filter */}
        <div className="flex items-start gap-2">
          <span className="typo-sublabel text-ink-muted pt-1 shrink-0">Parts of speech (source):</span>
          <div className="flex flex-wrap gap-1">
            {(ALL_QUIZ_POS as readonly string[]).map((pos) => {
              const isOn = includedPos.has(pos);
              return (
                <InclusionPill
                  key={pos}
                  active={isOn}
                  size="md"
                  onClick={() => {
                    setIncludedPos((prev) => {
                      const next = new Set(prev);
                      if (next.has(pos)) { next.delete(pos); } else { next.add(pos); }
                      return next;
                    });
                    handleRestartQuiz();
                  }}
                  title={isOn ? `Exclude ${getPosFullName(pos)}` : `Include ${getPosFullName(pos)}`}
                >
                  {getPosFullName(pos)}
                </InclusionPill>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Specimen Card */}
      {quizLoading ? (
        <div className="border border-book-rule p-12 text-center typo-gloss bg-page-surface">
          Loading quiz items...
        </div>
      ) : quizError ? (
        <div className="border border-book-rule bg-page-surface">
          <ErrorState
            title="Unable to load quiz items"
            errorMessage={quizErrorObj instanceof Error ? quizErrorObj.message : undefined}
            onRetry={() => refetchQuiz()}
          />
        </div>
      ) : !currentQuizItem ? (
        <div className="border border-book-rule p-12 text-center typo-gloss bg-page-surface">
          No {selectedRelation === 'cognate'
            ? 'cognate false friends'
            : selectedRelation === 'false_cognate'
              ? 'false cognates'
              : selectedRelation === 'unknown'
                ? 'false friends with unknown origin'
                : 'false friend word pairs'} found for {getLanguageName(sourceLang)}{' '}
          <MaterialSymbol icon="arrow_forward" size={14} className="inline-block text-ink-muted align-middle mx-0.5" />{' '}
          {getLanguageName(targetLang)}.
        </div>
      ) : isRoundFinished ? (
        /* Round Finished Summary Dossier */
        <div className="border border-book-rule p-5 sm:p-6 space-y-4 sm:space-y-5 bg-page-surface shadow-sm">
          {/* Header */}
          <div className="border-b border-book-rule pb-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <h2 className="typo-section-header mt-0.5">
                Round Summary
              </h2>
            </div>
            {hintsUsed > 0 && (
              <span className="typo-metric-table text-ink-muted shrink-0">
                {hintsUsed} {hintsUsed === 1 ? 'hint' : 'hints'} consulted
              </span>
            )}
          </div>

          {/* Assessment Verdict */}
          <p className="typo-page-deck leading-relaxed text-ink-muted">
            {Math.round((quizScore / (quizData?.length || 1)) * 100) >= 80
              ? 'High accuracy — You consistently distinguished true target definitions from false friend traps.'
              : Math.round((quizScore / (quizData?.length || 1)) * 100) >= 50
                ? 'Moderate accuracy — Some lookalikes misled your interpretation across the pair.'
                : 'Low accuracy — False friend lookalikes frequently caught you out.'}
          </p>

          {/* Responsive Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 py-0.5">
            <div className="border border-book-rule p-3.5 bg-page-muted/30 flex flex-col justify-between min-h-[76px]">
              <span className="typo-overline text-ink-muted block">
                Total Score
              </span>
              <div className="mt-1.5 typo-metric-display whitespace-nowrap">
                {quizScore}{' '}
                <span className="typo-metric text-ink-muted">
                  / {quizData?.length || 10}
                </span>
              </div>
            </div>

            <div className="border border-book-rule p-3.5 bg-page-muted/30 flex flex-col justify-between min-h-[76px]">
              <span className="typo-overline text-ink-muted block">
                Accuracy
              </span>
              <div className="mt-1.5 typo-metric-display text-cognate-ink whitespace-nowrap">
                {Math.round((quizScore / (quizData?.length || 1)) * 100)}%
              </div>
            </div>

            <div className="border border-book-rule p-3.5 bg-page-muted/30 flex flex-col justify-between min-h-[76px]">
              <span className="typo-overline text-ink-muted block">
                Traps Evaded
              </span>
              <div className="mt-1.5 typo-metric-display text-shifted-ink whitespace-nowrap">
                {trapsAvoided}{' '}
                <span className="typo-metric text-ink-muted">
                  / {roundHistory.length || (quizData?.length || 10)}
                </span>
              </div>
            </div>

            <div className="border border-book-rule p-3.5 bg-page-muted/30 flex flex-col justify-between min-h-[76px]">
              <span className="typo-overline text-ink-muted block">
                Best Streak
              </span>
              <div className="mt-1.5 typo-metric-display whitespace-nowrap">
                {maxStreak}
              </div>
            </div>
          </div>

          {/* Itemized Batch Review List */}
          {roundHistory.length > 0 && (
            <div className="border-t border-book-rule pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="typo-overline text-ink-main font-medium">
                  Item Review ({roundHistory.length})
                </span>
                <span className="typo-note hidden sm:inline">
                  Click entry to inspect etymology
                </span>
              </div>

              <div className="divide-y divide-book-rule/70 border border-book-rule bg-page-muted/10">
                {roundHistory.map((rec, idx) => (
                  <details
                    key={idx}
                    className="group p-3 hover:bg-page-muted/20 transition-colors cursor-pointer"
                  >
                    <summary className="flex items-center justify-between gap-3 list-none">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="typo-lang-code shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="typo-headword-row text-ink-main truncate">
                          {rec.item.word_a}
                        </span>
                        <MaterialSymbol icon="arrow_forward" size={14} className="text-ink-muted shrink-0" />
                        <span className="typo-headword-row text-falsefriend-ink truncate">
                          {rec.item.word_b}
                        </span>
                        {rec.item.etymological_relation && (
                          <span
                            className="typo-subscript text-ink-muted px-1.5 py-0.5 border border-book-rule/60 shrink-0"
                            title={
                              rec.item.etymological_relation === 'cognate'
                                ? 'Historically related words whose modern meanings have diverged enough to mislead.'
                                : rec.item.etymological_relation === 'false_cognate'
                                  ? 'Similar-looking words with distinct recorded roots.'
                                  : 'Similar-looking words whose historical relationship remains unverified in the available records.'
                            }
                          >
                            {rec.item.etymological_relation === 'cognate'
                              ? 'Cognate'
                              : rec.item.etymological_relation === 'false_cognate'
                                ? 'False Cognate'
                                : 'Origin Unknown'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {rec.isCorrect ? (
                          <span className="typo-badge bg-cognate-ink text-page-surface font-medium inline-flex items-center gap-1.5 px-2 py-0.5">
                            <MaterialSymbol icon="check_circle" size={16} className="text-page-surface" /> Correct
                          </span>
                        ) : rec.isTrap ? (
                          <span className="typo-badge bg-falsefriend-ink text-page-surface font-medium inline-flex items-center gap-1.5 px-2 py-0.5">
                            <MaterialSymbol icon="warning" size={16} className="text-page-surface" /> Trapped
                          </span>
                        ) : (
                          <span className="typo-badge bg-ink-muted text-page-surface font-medium inline-flex items-center gap-1.5 px-2 py-0.5">
                            <MaterialSymbol icon="cancel" size={16} className="text-page-surface" /> Missed
                          </span>
                        )}
                        <MaterialSymbol
                          icon="arrow_drop_down"
                          size={22}
                          className="text-ink-muted group-open:rotate-180 transition-transform"
                        />
                      </div>
                    </summary>

                    <div className="mt-3 pt-3 border-t border-book-rule/60 space-y-2 typo-body pl-6 text-ink-muted">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <strong className="typo-headword-row block">
                            {rec.item.word_a} ({getLanguageName(rec.item.lang_a)}):
                          </strong>
                          <p className="typo-gloss">&ldquo;{rec.item.def_a}&rdquo;</p>
                          {rec.item.etym_text_a && (
                            <p className="typo-note mt-1 leading-relaxed">
                              {rec.item.etym_text_a}
                            </p>
                          )}
                        </div>
                        <div>
                          <strong className="typo-headword-row text-falsefriend-ink block">
                            {rec.item.word_b} ({getLanguageName(rec.item.lang_b)}):
                          </strong>
                          <p className="typo-gloss">&ldquo;{rec.item.def_b}&rdquo;</p>
                          {rec.item.etym_text_b && (
                            <p className="typo-note mt-1 leading-relaxed">
                              {rec.item.etym_text_b}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Actions Bar */}
          <div className="pt-3 flex items-center justify-start border-t border-book-rule">
            <button
              type="button"
              onClick={handleRestartQuiz}
              className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 hover:border-stone-800 typo-overline px-5 py-2 transition-all active:translate-y-px cursor-pointer inline-flex items-center gap-2"
            >
              <span>Start New Round</span>
              <MaterialSymbol icon="arrow_forward" size={18} />
            </button>
          </div>
        </div>
      ) : (
        /* Active Question Specimen */
        <div className="border border-book-rule bg-page-surface shadow-xs overflow-hidden">
          {/* Deck Progress Bar flush at card top */}
          <div className="w-full h-0.5 bg-book-rule/40">
            <div
              className="h-full bg-ink-main/50 transition-all duration-300"
              style={{
                width: `${((currentQuizIdx + (selectedOption !== null ? 1 : 0)) / (quizData?.length || 10)) * 100}%`,
              }}
            />
          </div>

          <div className="p-5 sm:p-6 space-y-4 sm:space-y-5">
            {/* Status Tracker Bar (single clean divider line) */}
            <div className="flex items-center justify-between border-b border-book-rule pb-3">
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                <span className="typo-overline text-ink-main">
                  Question {currentQuizIdx + 1} of {quizData?.length || 10}
                </span>
                {currentQuizItem?.etymological_relation && (
                  <span
                    className="typo-subscript px-1.5 py-0.5 border border-book-rule text-ink-muted bg-page-muted/20 font-serif"
                    title={
                      currentQuizItem.etymological_relation === 'cognate'
                        ? 'Historically related words whose modern meanings have diverged enough to mislead.'
                        : currentQuizItem.etymological_relation === 'false_cognate'
                          ? 'Similar-looking words with distinct recorded roots.'
                          : 'Similar-looking words whose historical relationship remains unverified in the available records.'
                    }
                  >
                    {currentQuizItem.etymological_relation === 'cognate'
                      ? 'Cognate false friend'
                      : currentQuizItem.etymological_relation === 'false_cognate'
                        ? 'False cognate'
                        : 'Origin unknown'}
                  </span>
                )}
                {currentStreak > 1 && (
                  <span className="typo-metric-table text-shifted-ink font-medium inline-flex items-center gap-1.5">
                    <MaterialSymbol icon="local_fire_department" size={18} className="text-shifted-ink" /> {currentStreak} streak
                  </span>
                )}
              </div>

              {/* Unboxed Typographic Status Metrics */}
              <div className="flex items-center gap-3 sm:gap-4 typo-sublabel">
                <span className="text-ink-muted">
                  Score: <strong className="font-semibold text-ink-main">{quizScore}</strong>
                  <span className="text-ink-light"> / </span>
                  {quizData?.length || 10}
                </span>

                {trapsTriggered > 0 && (
                  <span className="text-falsefriend-ink font-medium inline-flex items-center gap-1.5">
                    <MaterialSymbol icon="warning" size={18} className="text-falsefriend-ink" /> {trapsTriggered} {trapsTriggered === 1 ? 'trap' : 'traps'}
                  </span>
                )}

                {hintsUsed > 0 && (
                  <span className="text-ink-muted">
                    Hints: {hintsUsed}
                  </span>
                )}
              </div>
            </div>

            {/* Dual Specimen Presentation - Clean Unboxed 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 pt-1">
              {/* Source Counterpart Panel */}
              {viewingMode === 'target_only' && selectedOption === null && !showSourceHint ? (
                <div className="flex flex-col justify-center items-center text-center p-3 sm:p-4 border border-dashed border-book-rule/70 bg-page-muted/15 space-y-1">
                  <span className="typo-overline text-ink-muted">
                    Source Word ({getLanguageName(currentQuizItem.lang_a)})
                  </span>
                  <span className="typo-note text-ink-muted">
                    [Source counterpart hidden in target-only mode]
                  </span>
                  <button
                    type="button"
                    onClick={handleRevealHint}
                    className="typo-subscript font-mono text-ink-muted underline hover:text-ink-main mt-0.5 cursor-pointer"
                  >
                    Peek counterpart
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="typo-overline text-ink-muted">
                      Source Word ({getLanguageName(currentQuizItem.lang_a)})
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="typo-headword-display text-ink-main">
                      {currentQuizItem.word_a}
                    </span>
                    {formatPos(currentQuizItem.pos_a) && (
                      <span className="typo-pos">{formatPos(currentQuizItem.pos_a)}</span>
                    )}
                    {currentQuizItem.ipa_a && (
                      <Phonetic ipa={currentQuizItem.ipa_a} className="typo-ipa" />
                    )}
                  </div>

                  {/* Source Definition Handling Based on Viewing Mode */}
                  {viewingMode === 'comparative' || selectedOption !== null || showSourceHint ? (
                    <p className="typo-gloss pt-0.5 line-clamp-2">
                      &ldquo;{currentQuizItem.def_a}&rdquo;
                    </p>
                  ) : (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleRevealHint}
                        className="typo-subscript font-mono text-ink-muted/80 hover:text-ink-main bg-page-surface px-2 py-0.5 border border-dashed border-book-rule transition-colors cursor-pointer"
                        title="Definition masked to prevent English triangulation (press H or click to reveal hint)"
                      >
                        [Definition masked · click to reveal hint]
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Target Specimen Panel */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="typo-overline text-falsefriend-ink font-medium">
                    Target Word ({getLanguageName(currentQuizItem.lang_b)})
                  </span>
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="typo-headword-display text-falsefriend-ink">
                    {currentQuizItem.word_b}
                  </span>
                  {formatPos(currentQuizItem.pos_b) && (
                    <span className="typo-pos">{formatPos(currentQuizItem.pos_b)}</span>
                  )}
                  {currentQuizItem.ipa_b && (
                    <Phonetic ipa={currentQuizItem.ipa_b} className="typo-ipa" />
                  )}
                </div>
              </div>
            </div>

            {/* Prompt Header */}
            <div className="pt-0.5">
              <span className="typo-sublabel block text-ink-muted">
                Choose the true modern definition of{' '}
                <strong className="text-ink-main font-deck">
                  {currentQuizItem.word_b}
                </strong>{' '}
                in {getLanguageName(currentQuizItem.lang_b)}:
              </span>
            </div>

            {/* Options Grid */}
            <div className="space-y-2">
              {currentQuizItem.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQuizItem.correct_option;
                const isTrap = typeof currentQuizItem.trap_option === 'number' && idx === currentQuizItem.trap_option;

                let optClass = 'border-book-rule text-ink-main hover:bg-page-muted/50 cursor-pointer';

                if (selectedOption !== null) {
                  if (isSelected && isCorrect) {
                    optClass = 'border-cognate-border bg-cognate-bg/50 text-ink-main font-medium shadow-sm';
                  } else if (isCorrect) {
                    optClass = 'border-dashed border-cognate-border/70 text-ink-muted bg-cognate-bg/10';
                  } else if (isSelected && isTrap) {
                    optClass = 'border-falsefriend-border bg-falsefriend-bg/50 text-falsefriend-ink font-medium shadow-sm';
                  } else if (isSelected) {
                    optClass = 'border-falsefriend-border bg-falsefriend-bg/50 text-falsefriend-ink font-medium shadow-sm';
                  } else if (isTrap) {
                    optClass = 'border-dashed border-falsefriend-border/70 text-ink-muted bg-falsefriend-bg/10';
                  } else {
                    optClass = 'border-book-rule/60 text-ink-muted opacity-40';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuizAnswer(idx)}
                    disabled={selectedOption !== null}
                    className={`w-full border px-3.5 py-2.5 sm:py-3 text-left transition-all flex items-start justify-between gap-3 ${optClass}`}
                  >
                    <div className="flex items-baseline gap-2.5 min-w-0">
                      <span className="typo-metric text-ink-muted/80 shrink-0 font-normal">
                        [{idx + 1}]
                      </span>
                      <span className="typo-definition leading-snug">
                        {option}
                      </span>
                    </div>

                    {selectedOption !== null && (
                      <div className="shrink-0 text-right">
                        {isSelected && isCorrect && (
                          <span className="px-2 py-0.5 typo-badge bg-cognate-ink text-page-surface font-medium inline-flex items-center gap-1.5">
                            Target Reality
                            <MaterialSymbol icon="check" size={16} className="text-page-surface" />
                          </span>
                        )}
                        {!isSelected && isCorrect && (
                          <span className="px-2 py-0.5 typo-badge bg-cognate-ink text-page-surface font-medium inline-flex items-center gap-1.5">
                            Target Reality
                          </span>
                        )}
                        {isSelected && isTrap && (
                          <span className="px-2 py-0.5 typo-badge bg-falsefriend-ink text-page-surface font-medium inline-flex items-center gap-1.5">
                            Cognitive Trap
                            <MaterialSymbol icon="warning" size={16} className="text-page-surface" />
                          </span>
                        )}
                        {!isSelected && isTrap && (
                          <span className="px-2 py-0.5 typo-badge bg-falsefriend-ink text-page-surface font-medium inline-flex items-center gap-1.5">
                            Source Meaning Trap
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Post-Answer Etymological Autopsy */}
            {selectedOption !== null && (
              <div className="border-t border-book-rule pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowAutopsy(!showAutopsy)}
                    className="typo-sublabel text-ink-muted hover:text-ink-main flex items-center gap-1 cursor-pointer underline"
                  >
                    <span>{showAutopsy ? 'Hide Etymological Analysis' : 'Show Etymological Analysis'}</span>
                    <MaterialSymbol icon={showAutopsy ? 'arrow_drop_up' : 'arrow_drop_down'} size={22} />
                  </button>

                  <button
                    type="button"
                    onClick={handleNextQuizItem}
                    className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 hover:border-stone-800 typo-overline px-4 py-1.5 transition-all active:translate-y-px cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Next Question (Enter)</span>
                    <MaterialSymbol icon="arrow_forward" size={18} />
                  </button>
                </div>

                {showAutopsy && (
                  <div className="pt-2 space-y-2.5 typo-body animate-in fade-in duration-200">
                    <div className="flex items-baseline justify-between border-b border-book-rule/60 pb-1.5">
                      <span className="typo-overline text-ink-main font-medium">
                        Etymology
                      </span>
                      {currentQuizItem.etymological_relation && (
                        <span className="typo-subscript text-ink-muted uppercase tracking-wider">
                          {currentQuizItem.etymological_relation === 'false_cognate'
                            ? 'False cognate'
                            : currentQuizItem.etymological_relation === 'cognate'
                              ? 'Cognate origin'
                              : 'Origin unknown'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                      {/* Source lineage */}
                      <div className="space-y-1">
                        <span className="typo-section-header block">
                          {currentQuizItem.word_a} ({getLanguageName(currentQuizItem.lang_a)}):
                        </span>
                        <p className="typo-note leading-relaxed">
                          {currentQuizItem.etym_text_a || 'Etymological lineage not recorded for source lemma.'}
                        </p>
                      </div>

                      {/* Target lineage */}
                      <div className="space-y-1">
                        <span className="typo-section-header block">
                          {currentQuizItem.word_b} ({getLanguageName(currentQuizItem.lang_b)}):
                        </span>
                        <p className="typo-note leading-relaxed">
                          {currentQuizItem.etym_text_b || 'Etymological lineage not recorded for target lemma.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
