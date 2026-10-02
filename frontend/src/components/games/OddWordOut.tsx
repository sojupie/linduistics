import React from 'react';
import { ErrorState } from '../common/ErrorState';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { getLanguageName } from '../../data/languages';
import { GamePage, RoundPanel, RoundSummary } from './GameLayout';
import { AnswerFeedbackBadge } from './AnswerFeedbackBadge';
import { answerCardClass } from './answerCardClass';
import { CLUSTER_ROUND_COUNT, useClusterRound } from './useClusterRound';
import { ClusterFilters } from './ClusterFilters';

export const OddWordOut: React.FC = () => {
  const game = useClusterRound('odd');
  if (game.isLoading) return <GamePage title="Find the Odd Word Out" description="A root is the older word that a group of words comes from. Pick the word that comes from a different root."><LoadingIndicator /></GamePage>;
  if (game.isError) return <GamePage title="Find the Odd Word Out" description=""><ErrorState onRetry={game.retry} /></GamePage>;
  const filters = <ClusterFilters source={game.source} sources={game.sources} availableTargets={game.availableTargets} selectedTargets={game.selectedTargets} includedPos={game.includedPos} onSourceChange={game.changeSource} onToggleTarget={game.toggleTarget} onTogglePos={game.togglePos} />;
  if (!game.active) return <GamePage title="Find the Odd Word Out" description="A root is the older word that a group of words comes from. Pick the word that comes from a different root.">{filters}<p className="typo-body text-ink-muted py-8">No cognate clusters are available for these languages and parts of speech.</p></GamePage>;
  if (game.finished) return <GamePage title="Find the Odd Word Out" description="Your results for this round."><RoundSummary score={game.score} total={CLUSTER_ROUND_COUNT} onRestart={game.reset} /></GamePage>;

  return <GamePage title="Find the Odd Word Out" description="A root is the older word that a group of words comes from. Three words share a root; select the one that comes from a different root.">
    {filters}
    <RoundPanel round={`Round ${game.roundIndex} of ${CLUSTER_ROUND_COUNT}`} score={game.score} total={CLUSTER_ROUND_COUNT} progress={(game.roundIndex - (game.checked ? 0 : 1)) / CLUSTER_ROUND_COUNT * 100}>
      <p className="typo-section-header mb-3">Shared meaning: {game.active.family.sample_gloss ?? game.active.family.root}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{game.active.choices.map((member, index) => {
        const chosen = game.picked.includes(index);
        const correct = !member.belongs;
        return <button key={`${member.lang}-${member.word}-${index}`} type="button" disabled={game.checked} aria-pressed={chosen} onClick={() => game.setPicked(chosen ? [] : [index])} className={`border p-3 text-left transition-colors ${answerCardClass(chosen, correct, game.checked, 'border-ink-main bg-page-muted text-ink-main')}`}>
          <span className="typo-body block">{member.word}</span><span className="typo-subscript text-ink-muted">{getLanguageName(member.lang)}</span>
          {game.checked && <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="typo-subscript">{member.belongs ? 'Shares the root' : 'Does not belong'}</span><AnswerFeedbackBadge selected={chosen} correct={correct} /></div>}
        </button>;
      })}</div>
      <div className="mt-4 flex flex-wrap items-center gap-3">{!game.checked ? <button type="button" onClick={game.checkAnswer} className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">Check Answer</button> : <><span className={`typo-sublabel ${game.correct ? 'text-cognate-ink' : 'text-falsefriend-ink'}`}>{game.correct ? 'Correct' : 'Not quite'}</span><button type="button" onClick={game.nextRound} className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">{game.roundIndex === CLUSTER_ROUND_COUNT ? 'See Results' : 'Next Round'} <MaterialSymbol icon="arrow_forward" size={18} /></button></>}</div>
    </RoundPanel>
  </GamePage>;
}
