import React, { useState, useEffect, useCallback } from 'react';
import { useFalseFriendsQuizQuery, useLanguagesQuery } from '../../services/queries';
import { getLanguageName } from '../../data/languages';
import { Phonetic } from '../common/Phonetic';
import { formatPos } from '../../utils/formatters';
import type { QuizItemDto } from '../../types/linguistics';
import { LanguagePairSelect } from '../common/LanguagePicker';
import { MaterialSymbol } from '../common/MaterialSymbol';

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
  const defaultSource = availableLanguages[0] ?? 'sv';
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

  const defaultTarget = availableTargets[0] ?? (sourceLang === 'sv' ? 'en' : 'sv');
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

  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [showSourceHint, setShowSourceHint] = useState(false);

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
    refetch: refetchQuiz,
  } = useFalseFriendsQuizQuery(sourceLang, targetLang, 10, selectedTier);

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
          if (!showSourceHint && viewingMode === 'blind') {
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
          <h1 className="typo-page-title">False Friends Decryption</h1>
          <p className="typo-page-deck mt-1.5">
            Test your lexical immunity against deceptive lookalikes across Germanic pairs.
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* Etymological Type Filter Segmented Control */}
        <div className="flex items-center gap-2">
          <span className="typo-sublabel text-ink-muted">Type:</span>
          <div className="inline-flex items-center border border-book-rule bg-page-muted/50 p-0.5 rounded-xs">
            <button
              type="button"
              onClick={() => {
                setSelectedTier('all');
                handleRestartQuiz();
              }}
              className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                selectedTier === 'all'
                  ? 'bg-page-surface border-ink-main text-ink-main font-semibold shadow-2xs'
                  : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/60'
              }`}
              title="Test all false friends (both historical cognates and accidental lookalikes)"
            >
              {selectedTier === 'all' && (
                <MaterialSymbol icon="check" size={14} className="text-cognate-ink shrink-0" />
              )}
              <span>All Pairs</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedTier('etymological_shift');
                handleRestartQuiz();
              }}
              className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                selectedTier === 'etymological_shift'
                  ? 'bg-page-surface border-ink-main text-ink-main font-semibold shadow-2xs'
                  : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/60'
              }`}
              title="Shared roots: words sharing an ancestral root whose meanings diverged over centuries (e.g. English 'gift' vs German 'Gift')"
            >
              {selectedTier === 'etymological_shift' && (
                <MaterialSymbol icon="check" size={14} className="text-cognate-ink shrink-0" />
              )}
              <span>Shared Roots</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedTier('surface_collision');
                handleRestartQuiz();
              }}
              className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                selectedTier === 'surface_collision'
                  ? 'bg-page-surface border-ink-main text-ink-main font-semibold shadow-2xs'
                  : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/60'
              }`}
              title="Accidental lookalikes: unrelated words that coincidentally look or sound alike (e.g. English 'bad' vs German 'Bad')"
            >
              {selectedTier === 'surface_collision' && (
                <MaterialSymbol icon="check" size={14} className="text-cognate-ink shrink-0" />
              )}
              <span>Accidental Lookalikes</span>
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
              className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                viewingMode === 'blind'
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
              className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                viewingMode === 'target_only'
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
              className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                viewingMode === 'comparative'
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

      {/* Main Specimen Card */}
      {quizLoading ? (
        <div className="border border-book-rule p-12 text-center typo-gloss bg-page-surface">
          Assembling deceptive false friend specimen...
        </div>
      ) : !currentQuizItem ? (
        <div className="border border-book-rule p-12 text-center typo-gloss bg-page-surface">
          No false friend word pairs found for {getLanguageName(sourceLang)}{' '}
          <MaterialSymbol icon="arrow_forward" size={14} className="inline-block text-ink-muted align-middle mx-0.5" />{' '}
          {getLanguageName(targetLang)}
          {selectedTier !== 'all'
            ? ` classified as ${selectedTier === 'etymological_shift' ? 'shared roots (divergent cognates)' : 'accidental lookalikes'}`
            : ''}.
        </div>
      ) : isRoundFinished ? (
        /* Round Finished Summary Dossier */
        <div className="border border-book-rule p-5 sm:p-6 space-y-4 sm:space-y-5 bg-page-surface shadow-sm">
          {/* Header */}
          <div className="border-b border-book-rule pb-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="typo-overline text-ink-muted block">
                Batch Assessment · {getLanguageName(sourceLang)}{' '}
                <MaterialSymbol icon="arrow_forward" size={12} className="inline-block text-ink-muted align-middle mx-0.5" />{' '}
                {getLanguageName(targetLang)}
              </span>
              <h2 className="typo-section-header mt-0.5">
                Decryption Assessment Complete
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
              ? 'High Lexical Immunity — You consistently distinguished true target definitions from deceptive cognate traps.'
              : Math.round((quizScore / (quizData?.length || 1)) * 100) >= 50
              ? 'Moderate Lexical Awareness — Some surface lookalikes misled your interpretation across the pair.'
              : 'Significant Trap Susceptibility — Cognate lookalikes frequently overrode true target meanings.'}
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
                  Tested Specimen Review ({roundHistory.length})
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
                        {rec.item.false_friend_type && (
                          <span
                            className="typo-subscript text-ink-muted text-2xs px-1.5 py-0.5 border border-book-rule/60 shrink-0"
                            title={
                              rec.item.false_friend_type === 'etymological_shift'
                                ? 'Shared historical root with divergent meaning'
                                : 'Accidental lookalike with no etymological relationship'
                            }
                          >
                            {rec.item.false_friend_type === 'etymological_shift'
                              ? 'Shared Root'
                              : 'Accidental Lookalike'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {rec.isCorrect ? (
                          <span className="typo-badge text-cognate-ink font-medium inline-flex items-center gap-1.5">
                            <MaterialSymbol icon="check_circle" size={18} className="text-cognate-ink" /> Correct
                          </span>
                        ) : rec.isTrap ? (
                          <span className="typo-badge text-falsefriend-ink font-medium inline-flex items-center gap-1.5">
                            <MaterialSymbol icon="warning" size={18} className="text-falsefriend-ink" /> Trapped
                          </span>
                        ) : (
                          <span className="typo-badge text-ink-muted font-medium inline-flex items-center gap-1.5">
                            <MaterialSymbol icon="cancel" size={18} className="text-ink-muted" /> Missed
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
              <span>Play Another Batch</span>
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
                {currentQuizItem?.false_friend_type && (
                  <span
                    className="typo-subscript px-1.5 py-0.5 border border-book-rule text-ink-muted bg-page-muted/20 font-serif"
                    title={
                      currentQuizItem.false_friend_type === 'etymological_shift'
                        ? 'Shared historical root: words share a common ancestor but diverged in meaning'
                        : 'Accidental lookalike: unrelated words that look or sound alike by coincidence'
                    }
                  >
                    {currentQuizItem.false_friend_type === 'etymological_shift'
                      ? 'Shared Root · Diverged'
                      : 'Accidental Lookalike'}
                  </span>
                )}
                {currentStreak > 1 && (
                  <span className="typo-metric-table text-shifted-ink text-xs font-medium inline-flex items-center gap-1.5">
                    <MaterialSymbol icon="local_fire_department" size={18} className="text-shifted-ink" /> {currentStreak} streak
                  </span>
                )}
              </div>

              {/* Unboxed Typographic Status Metrics */}
              <div className="flex items-center gap-3 sm:gap-4 typo-sublabel text-xs">
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
              {viewingMode === 'target_only' && selectedOption === null ? (
                <div className="flex flex-col justify-center items-center text-center p-3 sm:p-4 border border-dashed border-book-rule/70 bg-page-muted/15 space-y-1">
                  <span className="typo-overline text-ink-muted">
                    Source Counterpart ({getLanguageName(currentQuizItem.lang_a)})
                  </span>
                  <span className="typo-note text-ink-muted">
                    [Counterpart hidden to eliminate triangulation]
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
                      Source Counterpart ({getLanguageName(currentQuizItem.lang_a)})
                    </span>
                    <span
                      className="typo-lang-code cursor-help"
                      title={getLanguageName(currentQuizItem.lang_a)}
                    >
                      {currentQuizItem.lang_a.toUpperCase()}
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
                    Target Deceiver ({getLanguageName(currentQuizItem.lang_b)})
                  </span>
                  <span
                    className="typo-lang-code cursor-help"
                    title={getLanguageName(currentQuizItem.lang_b)}
                  >
                    {currentQuizItem.lang_b.toUpperCase()}
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
                  optClass = 'border border-cognate-border bg-cognate-bg/60 text-ink-main font-medium shadow-sm ring-1 ring-cognate-ink/30 cursor-default';
                } else if (isSelected) {
                  optClass = 'border border-falsefriend-ink bg-falsefriend-bg/70 text-falsefriend-ink font-medium shadow-sm ring-2 ring-falsefriend-ink/40 cursor-default';
                } else if (isCorrect) {
                  optClass = 'border border-cognate-ink/80 bg-cognate-bg/40 text-ink-main font-medium cursor-default';
                } else if (isTrap) {
                  optClass = 'border border-book-rule/60 text-ink-muted/60 opacity-40 bg-page-muted/10 cursor-default';
                } else {
                  optClass = 'border border-book-rule/40 text-ink-muted/40 opacity-30 cursor-default';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuizAnswer(idx)}
                  disabled={selectedOption !== null}
                  className={`w-full border px-3.5 py-2.5 sm:py-3 text-left transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 ${optClass}`}
                >
                  <div className="flex items-baseline gap-2.5 min-w-0">
                    <span
                      className={`typo-metric shrink-0 ${
                        selectedOption !== null
                          ? isSelected && !isCorrect
                            ? 'text-falsefriend-ink font-bold'
                            : isCorrect
                              ? 'text-cognate-ink font-bold'
                              : 'text-ink-muted/50 font-normal'
                          : 'text-ink-muted/80 font-normal'
                      }`}
                    >
                      [{idx + 1}]
                    </span>
                    <span className="typo-definition leading-snug">
                      {option}
                    </span>
                  </div>

                  {selectedOption !== null && (
                    <div className="shrink-0 self-end sm:self-start text-right">
                      {isSelected && isCorrect && (
                        <span className="px-2 py-0.5 typo-badge rounded-xs bg-cognate-ink text-page-bg font-semibold inline-flex items-center gap-1 shadow-2xs">
                          <MaterialSymbol icon="check" size={15} className="text-page-bg" />
                          Your pick · Correct
                        </span>
                      )}
                      {isSelected && !isCorrect && (
                        <span className="px-2 py-0.5 typo-badge rounded-xs bg-falsefriend-ink text-page-bg font-semibold inline-flex items-center gap-1 shadow-2xs">
                          <MaterialSymbol icon={isTrap ? 'warning' : 'close'} size={15} className="text-page-bg" />
                          Your pick · {isTrap ? 'Cognitive trap' : 'Incorrect'}
                        </span>
                      )}
                      {!isSelected && isCorrect && (
                        <span className="px-2 py-0.5 typo-badge rounded-xs border border-cognate-border bg-page-surface text-cognate-ink font-semibold inline-flex items-center gap-1 shadow-2xs">
                          <MaterialSymbol icon="check" size={15} className="text-cognate-ink" />
                          Correct answer
                        </span>
                      )}
                      {!isSelected && !isCorrect && isTrap && (
                        <span className="typo-subscript text-ink-muted/60 italic text-2xs">
                          (Source meaning trap)
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
                  <span>{showAutopsy ? 'Hide Etymological Autopsy' : 'Show Etymological Autopsy'}</span>
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
                      Etymological Comparison
                    </span>
                    {currentQuizItem.false_friend_type && (
                      <span className="typo-subscript text-ink-muted uppercase tracking-wider">
                        {currentQuizItem.false_friend_type === 'surface_collision'
                          ? 'Accidental resemblance (unrelated roots)'
                          : 'Semantic drift (shared root)'}
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
