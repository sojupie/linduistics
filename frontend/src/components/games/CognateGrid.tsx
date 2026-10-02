import React from 'react';
import { ErrorState } from '../common/ErrorState';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { GamePage, RoundPanel, RoundSummary } from './GameLayout';
import { AnswerFeedbackBadge } from './AnswerFeedbackBadge';
import { answerCardClass } from './answerCardClass';
import { usePairGame } from './usePairGame';
import { PairFilters } from './PairFilters';
import { getLanguageName } from '../../data/languages';

const GRID_SIZE = 16;

export const CognateGrid: React.FC = () => {
  const game = usePairGame(GRID_SIZE);
  if (game.isLoading) return <LoadingIndicator />;
  if (game.isError) return <ErrorState onRetry={game.retry} />;

  const filters = <PairFilters source={game.source} sourceLanguages={game.sourceLanguages} availableTargets={game.availableTargets} selectedTargets={game.selectedTargets} includedPos={game.includedPos} onSourceChange={game.changeSource} onToggleTarget={game.toggleTarget} onTogglePos={game.togglePos} />;
  if (!game.questionItems.length) return <GamePage title="Cognate Grid" description="">{filters}<p className="typo-body text-ink-muted py-8">No game pairs are available for these languages and parts of speech.</p></GamePage>;
  if (game.finished) return <GamePage title="Cognate Grid" description="Your results for this round."><RoundSummary score={game.gridTotal} total={GRID_SIZE * 2} onRestart={game.reset} /></GamePage>;

  return <GamePage title="Cognate Grid" description="A true cognate comes from the same older word and still has a similar meaning. A false friend looks or sounds similar but means something different. Find each group in turn.">
    {filters}
    <RoundPanel round={`Grid ${game.gridTarget === 'true' ? 1 : 2} of 2 · ${game.gridTarget === 'true' ? 'True Cognates' : 'False Friends'}`} score={game.gridTotal + (game.gridScore ?? 0)} total={GRID_SIZE * 2} progress={game.gridTarget === 'true' ? game.gridScore === null ? 0 : 50 : game.gridScore === null ? 50 : 100}>
      <p className="typo-sublabel mb-3">{game.gridTarget === 'true' ? 'Select every pair that comes from the same older word and has a similar meaning.' : 'Now select every pair that looks or sounds similar but has a different meaning.'}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{game.questionItems.map((item) => {
        const correct = game.gridTarget === 'true' ? ['true_cognate', 'full_cognate'].includes(item.category) : ['false_friend', 'cognate_false_friend', 'accidental_lookalike'].includes(item.category);
        const chosen = game.selected.includes(item.id);
        const selectedClass = 'border-ink-main bg-page-muted text-ink-main';
        return <button key={item.id} type="button" disabled={game.gridScore !== null} aria-pressed={chosen} onClick={() => game.setSelected((current) => chosen ? current.filter((id) => id !== item.id) : [...current, item.id])} className={`border p-3 text-left typo-body transition-colors ${answerCardClass(chosen, correct, game.gridScore !== null, selectedClass)}`}>
          <span><span className="typo-subscript block text-ink-muted">{getLanguageName(item.lang_a)}</span><span className="font-medium">{item.word_a}</span></span> <span className="text-ink-muted">→</span> <span><span className="typo-subscript block text-ink-muted">{getLanguageName(item.lang_b)}</span>{item.word_b}</span>
          {game.gridScore !== null && <div className="mt-2"><AnswerFeedbackBadge selected={chosen} correct={correct} /></div>}
        </button>;
      })}</div>
      <div className="mt-4 flex flex-wrap items-center gap-3">{game.gridScore === null ? <button type="button" onClick={() => game.setGridScore(game.questionItems.filter((item) => {
        const correct = game.gridTarget === 'true' ? ['true_cognate', 'full_cognate'].includes(item.category) : ['false_friend', 'cognate_false_friend', 'accidental_lookalike'].includes(item.category);
        return game.selected.includes(item.id) === correct;
      }).length)} className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">Check Grid</button> : <>
        {game.gridTarget === 'true' && <p className="basis-full typo-sublabel">True cognates checked. Next, find false friends: pairs that look or sound alike but mean different things.</p>}
        <button type="button" onClick={() => { game.setGridTotal((value) => value + game.gridScore!); if (game.gridTarget === 'true') { game.setGridTarget('false'); game.setSelected([]); game.setGridScore(null); } else game.setFinished(true); }} className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">{game.gridTarget === 'true' ? 'Start false friends grid' : 'See Results'} <MaterialSymbol icon="arrow_forward" size={18} /></button>
      </>}{game.gridScore !== null && <span className="typo-sublabel text-ink-muted">{game.gridScore} correct in this grid</span>}</div>
    </RoundPanel>
  </GamePage>;
};
