import React, { useState } from 'react';
import { useFalseFriendsQuizQuery, useLanguagesQuery } from '../../services/queries';
import { getLanguageName } from '../../data/languages';
import { Phonetic } from '../common/Phonetic';
import { formatPos } from '../../utils/formatters';

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

  // Quiz State
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnsweredCount, setQuizAnsweredCount] = useState(0);

  const {
    data: quizData,
    isLoading: quizLoading,
    refetch: refetchQuiz,
  } = useFalseFriendsQuizQuery(sourceLang, targetLang, 10);

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
      <div className="pb-4 mb-6 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-ink-main font-header">
            False Friends Examination
          </h1>
          <p className="text-base sm:text-lg text-ink-muted mt-1.5 font-deck font-normal">
            Test and sharpen discernment against deceptively similar cognate pairs and semantic traps.
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
              setCurrentQuizIdx(0);
              setSelectedOption(null);
              setQuizScore(0);
              setQuizAnsweredCount(0);
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
              setCurrentQuizIdx(0);
              setSelectedOption(null);
              setQuizScore(0);
              setQuizAnsweredCount(0);
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

      {/* Quiz Card */}
      <div className="max-w-2xl mx-auto border border-book-rule p-8 space-y-6 bg-page-surface">
        <div className="flex items-center justify-between border-b border-book-rule pb-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-ink-muted font-normal block font-deck">
              Field Examination
            </span>
            <h3 className="text-xl font-normal text-ink-main font-deck">
              Deceptive Cognates & False Friends
            </h3>
          </div>
          <div className="text-right text-sm text-ink-muted">
            <span className="font-mono font-medium">Score: {quizScore} / {quizAnsweredCount}</span>
            <span className="text-xs text-ink-muted block uppercase tracking-wider mt-0.5 font-deck font-normal">
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
              <span className="text-xs uppercase tracking-wider text-ink-muted font-normal font-deck">
                What is the primary modern definition of:
              </span>
              <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
                <span className="text-2xl font-normal font-deck text-ink-main">
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
                Note counterpart in {getLanguageName(currentQuizItem.lang_b)}: <span className="font-normal font-deck text-ink-main">{currentQuizItem.word_b}</span>
              </p>
            </div>

            <div className="space-y-2.5">
              {currentQuizItem.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQuizItem.correct_option;
                let optStyle = 'border-book-rule text-ink-main hover:bg-page-muted/50';

                if (selectedOption !== null) {
                  if (isCorrect) {
                    optStyle = 'border-ink-main bg-page-muted font-medium text-ink-main';
                  } else if (isSelected) {
                    optStyle = 'border-falsefriend-border text-falsefriend-ink font-medium';
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
                      <span className="text-xs uppercase tracking-wider font-normal font-deck text-cognate-ink shrink-0">
                        [Correct]
                      </span>
                    )}
                    {selectedOption !== null && isSelected && !isCorrect && (
                      <span className="text-xs uppercase tracking-wider font-normal font-deck text-falsefriend-ink shrink-0">
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
                  className="border border-ink-main px-4 py-1.5 text-xs uppercase tracking-wider text-ink-main hover:bg-page-muted transition-colors font-deck font-normal"
                >
                  Next Specimen →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
