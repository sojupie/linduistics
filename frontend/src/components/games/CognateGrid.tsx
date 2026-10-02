import React from 'react';
import { ErrorState } from '../common/ErrorState';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { GamePage, RoundPanel, RoundSummary } from './GameLayout';
import { usePairGame } from './usePairGame';
import { PairFilters } from './PairFilters';

const GRID_SIZE = 16;

export const CognateGrid: React.FC = () => {
  const game = usePairGame(GRID_SIZE);
  if (game.isLoading) return <LoadingIndicator />;
  if (game.isError) return <ErrorState onRetry={game.retry} />;

  const filters = <PairFilters {...game} />;
  if (!game.items.length) return <GamePage title="Cognate Grid" description="">{filters}<p className="typo-body text-ink-muted py-8">No game pairs are available for this language pair.</p></GamePage>;
  if (game.finished) return <GamePage title="Cognate Grid" description="Your results for this round."><RoundSummary score={game.gridTotal} total={GRID_SIZE * 2} onRestart={game.reset} /></GamePage>;

  return <GamePage title="Cognate Grid" description={`Select every ${game.gridTarget === 'true' ? 'true cognate' : 'false friend'} in the grid.`}>
    {filters}
    <RoundPanel round={`Grid ${game.gridTarget === 'true' ? 1 : 2} of 2 · ${game.gridTarget === 'true' ? 'True Cognates' : 'False Friends'}`} score={game.gridTotal + (game.gridScore ?? 0)} total={GRID_SIZE * 2} progress={game.gridTarget === 'true' ? game.gridScore === null ? 0 : 50 : game.gridScore === null ? 50 : 100}>
      <p className="typo-sublabel mb-3">Select all {game.gridTarget === 'true' ? 'true cognate' : 'false friend'} pairs.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{game.items.map((item) => {
        const correct = game.gridTarget === 'true' ? ['true_cognate', 'full_cognate'].includes(item.category) : ['false_friend', 'cognate_false_friend', 'accidental_lookalike'].includes(item.category);
        const chosen = game.selected.includes(item.id);
        const color = game.gridScore === null
          ? chosen ? game.gridTarget === 'true' ? 'border-cognate-border bg-cognate-bg/60 text-cognate-ink' : 'border-falsefriend-border bg-falsefriend-bg/60 text-falsefriend-ink' : 'border-book-rule bg-page-surface hover:border-cognate-border hover:bg-cognate-bg/20'
          : chosen === correct ? correct ? 'border-cognate-border bg-cognate-bg/60 text-cognate-ink' : 'border-book-rule bg-page-surface' : chosen ? 'border-falsefriend-border bg-falsefriend-bg/60 text-falsefriend-ink' : correct ? 'border-cognate-border bg-cognate-bg/20' : 'border-book-rule bg-page-surface';
        return <button key={item.id} type="button" disabled={game.gridScore !== null} aria-pressed={chosen} onClick={() => game.setSelected((current) => chosen ? current.filter((id) => id !== item.id) : [...current, item.id])} className={`border p-3 text-left typo-body transition-colors ${color}`}><span className="font-medium">{item.word_a}</span> <span className="text-ink-muted">→</span> <span>{item.word_b}</span>{game.gridScore !== null && <MaterialSymbol icon={chosen === correct ? 'check' : 'close'} size={16} className={`ml-2 ${chosen === correct ? 'text-cognate-ink' : 'text-falsefriend-ink'}`} />}</button>;
      })}</div>
      <div className="mt-4 flex flex-wrap items-center gap-3">{game.gridScore === null ? <button type="button" onClick={() => game.setGridScore(game.items.filter((item) => game.selected.includes(item.id) && (game.gridTarget === 'true' ? ['true_cognate', 'full_cognate'].includes(item.category) : ['false_friend', 'cognate_false_friend', 'accidental_lookalike'].includes(item.category))).length)} className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">Check Grid</button> : <button type="button" onClick={() => { game.setGridTotal((value) => value + game.gridScore!); if (game.gridTarget === 'true') { game.setGridTarget('false'); game.setSelected([]); game.setGridScore(null); } else game.setFinished(true); }} className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">{game.gridTarget === 'true' ? 'Next: False Friends' : 'See Results'} <MaterialSymbol icon="arrow_forward" size={18} /></button>}{game.gridScore !== null && <span className="typo-sublabel text-ink-muted">{game.gridScore} correct in this grid</span>}</div>
    </RoundPanel>
  </GamePage>;
};
