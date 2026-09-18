import React, { useState, useMemo } from 'react';
import { usePairsQuery, useFalseFriendsQuizQuery } from '../../services/queries';
import { CURATED_SPECIMEN_COLLECTION, GERMANIC_LANGUAGES } from '../../data/languages';
import type { SpecimenCategory, SpecimenPair } from '../../types/linguistics';
import { SpecimenCard } from './SpecimenCard';
import { Layers, ShieldAlert, Sparkles, Filter, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { TOOLBAR_CONFIG } from '../../constants/config';

type DeckFilter = 'all' | SpecimenCategory;
type ViewMode = 'atlas' | 'quiz';

export const SpecimenDecks: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<DeckFilter>('all');
  const [sourceLang, setSourceLang] = useState('sv');
  const [targetLang, setTargetLang] = useState('en');
  const [viewMode, setViewMode] = useState<ViewMode>('atlas');

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
  const {
    data: livePairsData,
    isLoading: pairsLoading,
  } = usePairsQuery({
    source: sourceLang,
    target: targetLang,
    category: apiCategory,
    limit: 30,
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
      catalogId: `SP-${dto.category.toUpperCase().slice(0, 3)}-${dto.id.toString().padStart(4, '0')}`,
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
          ? 'Deceptive orthographic homograph with divergent semantic drift.'
          : dto.category === 'cognate'
          ? 'Unbroken inherited Proto-Germanic root.'
          : 'Phonetically shifted cognate pair.',
    }));
  }, [livePairsData]);

  // Fallback to curated specimens if query returned empty or during initial boot
  const displayedSpecimens = useMemo(() => {
    if (livePairs.length > 0) {
      return livePairs;
    }
    if (activeFilter === 'all') {
      return CURATED_SPECIMEN_COLLECTION;
    }
    return CURATED_SPECIMEN_COLLECTION.filter((s) => s.category === activeFilter);
  }, [livePairs, activeFilter]);

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header Deck Folio */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border-hairline pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-specimen-moss">
              Tabulae Speciminum · Lexical Herbarium
            </span>
            <span className="rounded border border-border-hairline bg-substrate-panel px-2 py-0.5 font-mono text-[9px] uppercase text-ink-muted">
              {displayedSpecimens.length} Specimen Cards
            </span>
          </div>
          <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight text-ink-carbon">
            Taxonomic Specimen Decks
          </h2>
          <p className="mt-1.5 font-serif text-sm italic text-ink-muted max-w-2xl">
            Individual lexical specimens examined under phonological, orthographic, and semantic cross-illumination.
          </p>
        </div>

        {/* View Mode Toggle: Atlas vs Field Quiz */}
        <div className="flex items-center rounded border border-border-hairline bg-substrate-panel p-1">
          <button
            type="button"
            onClick={() => setViewMode('atlas')}
            className={`flex items-center gap-1.5 rounded px-3 py-1 font-serif text-xs transition-colors ${
              viewMode === 'atlas'
                ? 'bg-substrate-dark font-bold text-ink-carbon shadow-xs'
                : 'text-ink-muted hover:text-ink-carbon'
            }`}
          >
            <Layers size={TOOLBAR_CONFIG.ICON_SIZE_SM} />
            Specimen Atlas
          </button>
          <button
            type="button"
            onClick={() => setViewMode('quiz')}
            className={`flex items-center gap-1.5 rounded px-3 py-1 font-serif text-xs transition-colors ${
              viewMode === 'quiz'
                ? 'bg-substrate-dark font-bold text-specimen-oxblood shadow-xs'
                : 'text-ink-muted hover:text-ink-carbon'
            }`}
          >
            <ShieldAlert size={TOOLBAR_CONFIG.ICON_SIZE_SM} className="text-specimen-oxblood" />
            Field Trap Quiz
          </button>
        </div>
      </div>

      {/* Language Pair Selectors & Filter Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded border border-border-hairline bg-substrate-panel p-3">
        {/* Source & Target Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-serif">
          <span className="font-mono text-[10px] uppercase text-ink-faint">Pair:</span>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="rounded border border-border-hairline bg-substrate-dark px-2.5 py-1 text-ink-carbon focus:border-specimen-moss focus:outline-none"
          >
            {GERMANIC_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
          <span className="text-ink-faint">-&gt;</span>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="rounded border border-border-hairline bg-substrate-dark px-2.5 py-1 text-ink-carbon focus:border-specimen-moss focus:outline-none"
          >
            {GERMANIC_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filters (Only in Atlas Mode) */}
        {viewMode === 'atlas' && (
          <div className="flex flex-wrap items-center gap-1.5 font-serif text-xs">
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-ink-faint mr-1">
              <Filter size={11} /> Filter:
            </span>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`rounded px-2.5 py-1 transition-colors ${
                activeFilter === 'all'
                  ? 'bg-substrate-dark text-ink-carbon font-bold border border-border-hairline'
                  : 'text-ink-muted hover:text-ink-carbon'
              }`}
            >
              All Taxa
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('cognate')}
              className={`rounded px-2.5 py-1 transition-colors ${
                activeFilter === 'cognate'
                  ? 'bg-specimen-moss/20 text-specimen-moss font-bold border border-specimen-moss/40'
                  : 'text-ink-muted hover:text-specimen-moss'
              }`}
            >
              True Cognates
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('minefield')}
              className={`rounded px-2.5 py-1 transition-colors ${
                activeFilter === 'minefield'
                  ? 'bg-specimen-oxblood/20 text-specimen-oxblood font-bold border border-specimen-oxblood/40'
                  : 'text-ink-muted hover:text-specimen-oxblood'
              }`}
            >
              Minefields / Traps
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('cousin')}
              className={`rounded px-2.5 py-1 transition-colors ${
                activeFilter === 'cousin'
                  ? 'bg-specimen-ochre/20 text-specimen-ochre font-bold border border-specimen-ochre/40'
                  : 'text-ink-muted hover:text-specimen-ochre'
              }`}
            >
              Sound Shifts
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('schism')}
              className={`rounded px-2.5 py-1 transition-colors ${
                activeFilter === 'schism'
                  ? 'bg-specimen-irongall/20 text-specimen-irongall font-bold border border-specimen-irongall/40'
                  : 'text-ink-muted hover:text-specimen-irongall'
              }`}
            >
              Divergence
            </button>
          </div>
        )}
      </div>

      {/* Mode View: Atlas Grid */}
      {viewMode === 'atlas' && (
        <div className="mt-8">
          {pairsLoading && (
            <div className="flex items-center justify-center py-12 text-ink-muted font-mono text-xs">
              <RefreshCw size={14} className="animate-spin mr-2" />
              Ingesting comparative specimens from PostGIS...
            </div>
          )}

          {!pairsLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedSpecimens.map((specimen) => (
                <SpecimenCard key={specimen.id} specimen={specimen} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mode View: Field Trap Quiz */}
      {viewMode === 'quiz' && (
        <div className="mx-auto mt-8 max-w-2xl rounded border border-border-hairline bg-substrate-panel p-6 shadow-sm">
          {quizLoading && (
            <div className="flex items-center justify-center py-12 text-ink-muted font-mono text-xs">
              <RefreshCw size={14} className="animate-spin mr-2" />
              Synthesizing false-friend distractors...
            </div>
          )}

          {!quizLoading && currentQuizItem && (
            <div>
              {/* Quiz Header */}
              <div className="flex items-center justify-between border-b border-border-hairline pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-specimen-oxblood" />
                  <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                    Trap Identification Lab · Specimen {currentQuizIdx + 1} of {quizData.length}
                  </span>
                </div>
                <span className="font-mono text-xs text-specimen-moss">
                  Score: {quizScore} / {quizAnsweredCount}
                </span>
              </div>

              {/* The Headword Prompt */}
              <div className="mt-6 rounded border border-border-hairline bg-substrate-dark p-4 text-center">
                <span className="font-mono text-[10px] uppercase text-ink-faint">
                  Source Observation ({currentQuizItem.lang_a.toUpperCase()})
                </span>
                <h3 className="mt-1 font-serif text-2xl font-bold text-ink-carbon">
                  {currentQuizItem.word_a}
                </h3>
                {currentQuizItem.ipa_a && (
                  <p className="font-mono text-xs text-ink-muted">{currentQuizItem.ipa_a}</p>
                )}
                <p className="mt-2 font-serif text-xs italic text-ink-muted">
                  &ldquo;{currentQuizItem.def_a}&rdquo;
                </p>
                <div className="mt-3 flex items-center justify-center gap-2 text-xs font-serif text-specimen-oxblood">
                  <span>Deceptive Twin in {currentQuizItem.lang_b.toUpperCase()}:</span>
                  <strong className="text-sm font-bold underline decoration-dotted">
                    {currentQuizItem.word_b}
                  </strong>
                </div>
              </div>

              {/* Distractor Choices */}
              <div className="mt-6 space-y-3">
                <p className="font-serif text-xs font-semibold text-ink-muted">
                  Select the actual meaning of <span className="text-ink-carbon">{currentQuizItem.word_b}</span> in {currentQuizItem.lang_b.toUpperCase()}:
                </p>

                {currentQuizItem.options.map((option, idx) => {
                  const isChosen = selectedOption === idx;
                  const isCorrect = idx === currentQuizItem.correct_option;

                  let btnStyle = 'border-border-hairline bg-substrate-dark hover:border-ink-faint';
                  if (selectedOption !== null) {
                    if (isCorrect) {
                      btnStyle = 'border-specimen-moss bg-specimen-moss/15 text-ink-carbon';
                    } else if (isChosen) {
                      btnStyle = 'border-specimen-oxblood bg-specimen-oxblood/15 text-ink-carbon';
                    } else {
                      btnStyle = 'border-border-hairline bg-substrate-dark opacity-50';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={selectedOption !== null}
                      onClick={() => handleQuizAnswer(idx)}
                      className={`flex w-full items-center justify-between rounded border p-3.5 text-left font-serif text-xs transition-all ${btnStyle}`}
                    >
                      <span>{option}</span>
                      {selectedOption !== null && isCorrect && (
                        <CheckCircle2 size={16} className="text-specimen-moss shrink-0 ml-2" />
                      )}
                      {selectedOption !== null && isChosen && !isCorrect && (
                        <XCircle size={16} className="text-specimen-oxblood shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Next Step / Explanation */}
              {selectedOption !== null && (
                <div className="mt-6 flex items-center justify-between border-t border-border-hairline pt-4">
                  <div className="font-serif text-xs italic text-ink-muted">
                    {selectedOption === currentQuizItem.correct_option ? (
                      <span className="text-specimen-moss">Cognitive trap successfully navigated.</span>
                    ) : (
                      <span className="text-specimen-oxblood">Encountered semantic false-friend minefield.</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleNextQuizItem}
                    className="flex items-center gap-1.5 rounded border border-border-hairline bg-substrate-dark px-4 py-1.5 font-serif text-xs text-ink-carbon hover:border-specimen-moss transition-colors"
                  >
                    <span>Next Specimen</span>
                    <Sparkles size={12} className="text-specimen-moss" />
                  </button>
                </div>
              )}
            </div>
          )}

          {!quizLoading && !currentQuizItem && (
            <div className="py-8 text-center font-serif text-xs text-ink-muted">
              No false-friend pairs cataloged for this specific pair yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
