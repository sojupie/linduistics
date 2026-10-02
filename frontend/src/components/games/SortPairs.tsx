import React from 'react';
import { ErrorState } from '../common/ErrorState';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { GamePage, RoundPanel, RoundSummary } from './GameLayout';
import { pairAnswer, usePairGame } from './usePairGame';
import { PairFilters } from './PairFilters';

const PAIR_COUNT = 10;
const labels: Record<string, string> = { true: 'True cognates', related: 'Related, changed meaning', lookalike: 'Lookalikes' };

export const SortPairs: React.FC = () => {
  const game = usePairGame(PAIR_COUNT);
  if (game.isLoading) return <LoadingIndicator />;
  if (game.isError) return <ErrorState onRetry={game.retry} />;

  const filters = <PairFilters source={game.source} sourceLanguages={game.sourceLanguages} availableTargets={game.availableTargets} selectedTargets={game.selectedTargets} includedPos={game.includedPos} onSourceChange={game.changeSource} onToggleTarget={game.toggleTarget} onTogglePos={game.togglePos} />;
  if (!game.questionItems.length) return <GamePage title="Sort the Pairs" description="">{filters}<p className="typo-body text-ink-muted py-8">No game pairs are available for these languages and parts of speech.</p></GamePage>;
  if (game.finished) return <GamePage title="Sort the Pairs" description="Your results for this round.">
    <RoundSummary score={game.score} total={game.questionItems.length} onRestart={game.reset} />
    <div className="mt-4 divide-y divide-book-rule border-y border-book-rule">{game.questionItems.map((item) => <p key={item.id} className="typo-body py-3"><strong>{item.word_a}</strong> <span className="text-ink-muted">→</span> <span className="text-cognate-ink">{item.word_b}</span><span className="text-ink-muted"> · {labels[pairAnswer(item)]}</span></p>)}</div>
  </GamePage>;

  return <GamePage title="Sort the Pairs" description="A true cognate comes from the same older word and has a similar meaning. Related words share an older word but their meanings changed. Lookalikes only look or sound alike; they do not share an older word.">
    {filters}
      <RoundPanel round={`${Object.keys(game.answers).length} of ${game.questionItems.length} pairs answered`} total={game.questionItems.length} progress={Object.keys(game.answers).length / game.questionItems.length * 100}>
      <p className="typo-sublabel mb-3">Choose one group for each pair. You can change your choices until you see the results.</p>
      <div className="divide-y divide-book-rule border-y border-book-rule">{game.questionItems.map((item) => <SortPairRow key={item.id} item={item} answer={game.answers[item.id]} onAnswer={(value) => game.setAnswers((current) => ({ ...current, [item.id]: value }))} />)}</div>
      {Object.keys(game.answers).length === game.questionItems.length && <button type="button" onClick={() => game.setFinished(true)} className="mt-4 border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">See Results <MaterialSymbol icon="arrow_forward" size={18} /></button>}
    </RoundPanel>
  </GamePage>;
};

const SortPairRow: React.FC<{ item: { id: number; word_a: string; word_b: string }; answer?: string; onAnswer: (value: string) => void }> = ({ item, answer, onAnswer }) => {
  const groups = [['true', 'True cognates', 'cognate'], ['related', 'Related, changed meaning', 'shifted'], ['lookalike', 'Lookalikes', 'falsefriend']];
  return <div className="grid gap-2 py-3">
    <p className="typo-body"><strong>{item.word_a}</strong> <span className="text-ink-muted">→</span> <span className="text-cognate-ink">{item.word_b}</span></p>
    <div className="flex flex-wrap gap-1.5">{groups.map(([value, label, tone]) => {
      const chosen = answer === value;
      const idle = tone === 'cognate' ? 'border-cognate-border bg-cognate-bg text-cognate-ink' : tone === 'shifted' ? 'border-shifted-border bg-shifted-bg text-shifted-ink' : 'border-falsefriend-border bg-falsefriend-bg text-falsefriend-ink';
      const selected = 'border-transparent bg-ink-main text-page-bg';
      return <button key={value} type="button" onClick={() => onAnswer(value)} aria-pressed={chosen} className={`border px-2.5 py-1 typo-subscript ${chosen ? selected : idle}`}>{label}</button>;
    })}</div>
  </div>;
};
