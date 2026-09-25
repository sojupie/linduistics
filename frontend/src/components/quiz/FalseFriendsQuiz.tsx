import React, { useState, useEffect, useCallback } from 'react';
import { useFalseFriendsQuizQuery, useLanguagesQuery } from '../../services/queries';
import { getLanguageName } from '../../data/languages';
import { Phonetic } from '../common/Phonetic';
import { formatPos } from '../../utils/formatters';
import type { QuizItemDto } from '../../types/linguistics';
import { LanguagePairSelect } from '../common/LanguagePicker';

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
  } = useFalseFriendsQuizQuery(sourceLang, targetLang, 10);

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
      {/* Quiz Header */}
      <div className="pb-3 mb-4 border-b border-book-rule">
        <h1 className="typo-page-title">False Friends Decryption</h1>
        <p className="typo-page-deck mt-1">
          Test your lexical immunity against deceptive lookalikes across Germanic pairs.
        </p>
      </div>

      {/* Quiz Utility Controls: Pair & Viewing Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* Language Pair Selector */}
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

        {/* Viewing Mode Segmented Control */}
        <div className="flex items-center gap-2">
          <span className="typo-sublabel">View:</span>
          <div className="inline-flex border border-book-rule bg-page-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setViewingMode('blind')}
              className={`px-2.5 py-0.5 typo-sublabel transition-all cursor-pointer ${
                viewingMode === 'blind'
                  ? 'bg-page-surface text-ink-main font-medium shadow-2xs'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
              title="Both headwords shown, but source definition masked to prevent triangulation"
            >
              Blind Deck
            </button>
            <button
              type="button"
              onClick={() => setViewingMode('target_only')}
              className={`px-2.5 py-0.5 typo-sublabel transition-all cursor-pointer ${
                viewingMode === 'target_only'
                  ? 'bg-page-surface text-ink-main font-medium shadow-2xs'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
              title="Only target word displayed; counterpart reveals upon answering"
            >
              Target Only
            </button>
            <button
              type="button"
              onClick={() => setViewingMode('comparative')}
              className={`px-2.5 py-0.5 typo-sublabel transition-all cursor-pointer ${
                viewingMode === 'comparative'
                  ? 'bg-page-surface text-ink-main font-medium shadow-2xs'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
              title="Source definition visible upfront (assisted study)"
            >
              Assisted
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
          No false friend word pairs found for {getLanguageName(sourceLang)} → {getLanguageName(targetLang)}.
        </div>
      ) : isRoundFinished ? (
        /* Round Finished Summary Dossier */
        <div className="border border-book-rule p-5 sm:p-6 space-y-4 sm:space-y-5 bg-page-surface shadow-sm">
          {/* Header */}
          <div className="border-b border-book-rule pb-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="typo-overline text-ink-muted block">
                Batch Assessment · {getLanguageName(sourceLang)} → {getLanguageName(targetLang)}
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
                        <span className="text-ink-muted font-serif">→</span>
                        <span className="typo-headword-row text-falsefriend-ink truncate">
                          {rec.item.word_b}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {rec.isCorrect ? (
                          <span className="typo-badge text-cognate-ink border border-cognate-border/70 bg-cognate-bg/60 px-2 py-0.5 rounded">
                            ✓ Correct
                          </span>
                        ) : rec.isTrap ? (
                          <span className="typo-badge text-falsefriend-ink border border-falsefriend-border/70 bg-falsefriend-bg/50 px-2 py-0.5 rounded">
                            ⚠️ Trapped
                          </span>
                        ) : (
                          <span className="typo-badge text-ink-muted border border-book-rule bg-page-muted/50 px-2 py-0.5 rounded">
                            ✗ Missed
                          </span>
                        )}
                        <span className="text-ink-muted group-open:rotate-180 transition-transform typo-sublabel font-mono">
                          ▼
                        </span>
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
              className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 hover:border-stone-800 typo-overline px-5 py-2 transition-all active:translate-y-px cursor-pointer"
            >
              Play Another Batch →
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
              <div className="flex items-center gap-3">
                <span className="typo-overline text-ink-main">
                  Question {currentQuizIdx + 1} of {quizData?.length || 10}
                </span>
                {currentStreak > 1 && (
                  <span className="typo-metric-table text-cognate-ink text-xs font-medium">
                    🔥 {currentStreak} streak
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
                  <span className="text-falsefriend-ink font-medium">
                    ⚠️ {trapsTriggered} {trapsTriggered === 1 ? 'trap' : 'traps'}
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
                    <span className="typo-lang-code">
                      {currentQuizItem.lang_a}
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
                  <span className="typo-lang-code">
                    {currentQuizItem.lang_b}
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
                if (isCorrect) {
                  optClass = 'border-cognate-border bg-cognate-bg/50 text-ink-main font-medium shadow-sm';
                } else if (isSelected && isTrap) {
                  optClass = 'border-falsefriend-border bg-falsefriend-bg/50 text-falsefriend-ink font-medium shadow-sm';
                } else if (isSelected) {
                  optClass = 'border-falsefriend-border bg-falsefriend-bg/30 text-falsefriend-ink font-medium';
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
                      {isCorrect && (
                        <span className="typo-badge text-cognate-ink border border-cognate-border bg-cognate-bg px-2 py-0.5 rounded font-medium">
                          Target Reality ✓
                        </span>
                      )}
                      {isSelected && isTrap && (
                        <span className="typo-badge text-falsefriend-ink border border-falsefriend-border bg-falsefriend-bg px-2 py-0.5 rounded font-medium">
                          Cognitive Trap ⚠️
                        </span>
                      )}
                      {!isSelected && isTrap && (
                        <span className="typo-badge text-falsefriend-ink/90 border border-dashed border-falsefriend-border/70 bg-falsefriend-bg/30 px-2 py-0.5 rounded font-medium">
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
                  className="typo-sublabel text-ink-muted hover:text-ink-main flex items-center gap-1.5 cursor-pointer underline"
                >
                  {showAutopsy ? 'Hide Etymological Autopsy ▲' : 'Show Etymological Autopsy ▼'}
                </button>

                <button
                  type="button"
                  onClick={handleNextQuizItem}
                  className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 hover:border-stone-800 typo-overline px-4 py-1.5 transition-all active:translate-y-px cursor-pointer"
                >
                  Next Question → (Enter)
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
