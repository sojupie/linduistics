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

export const WordFamily: React.FC = () => {
  const game = useClusterRound('family');
  if (game.isLoading) return <GamePage title="Build a Word Family" description="A word family is a group of words that come from the same older word. Score +1 for each correct pick and −1 for each wrong pick or missed family word."><LoadingIndicator /></GamePage>;
  if (game.isError) return <GamePage title="Build a Word Family" description=""><ErrorState onRetry={game.retry} /></GamePage>;
  const filters = <ClusterFilters source={game.source} sources={game.sources} availableTargets={game.availableTargets} selectedTargets={game.selectedTargets} includedPos={game.includedPos} onSourceChange={game.changeSource} onToggleTarget={game.toggleTarget} onTogglePos={game.togglePos} />;
  if (!game.active) return <GamePage title="Build a Word Family" description="A word family is a group of words that come from the same older word. Score +1 for each correct pick and −1 for each wrong pick or missed family word.">{filters}<p className="typo-body text-ink-muted py-8">No cognate clusters are available for these languages and parts of speech.</p></GamePage>;
  if (game.finished) return <GamePage title="Build a Word Family" description="Your results for this round."><RoundSummary score={game.score} total={CLUSTER_ROUND_COUNT * 3} onRestart={game.reset} /></GamePage>;

  return <GamePage title="Build a Word Family" description="A word family is a group of words that come from the same older word. Select each one you think belongs: +1 for a correct pick, −1 for a wrong pick or a missed family word.">
    {filters}
    <RoundPanel round={`Round ${game.roundIndex} of ${CLUSTER_ROUND_COUNT}`} score={game.score} total={CLUSTER_ROUND_COUNT * 3} progress={(game.roundIndex - (game.checked ? 0 : 1)) / CLUSTER_ROUND_COUNT * 100}>
      <p className="typo-section-header mb-3">Starting word: {game.active.anchor.word} <span className="typo-subscript text-ink-muted">({getLanguageName(game.active.anchor.lang)})</span></p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{game.active.choices.map((member, index) => {
        const chosen = game.picked.includes(index);
        return <button key={`${member.lang}-${member.word}-${index}`} type="button" disabled={game.checked} aria-pressed={chosen} onClick={() => game.setPicked((current) => chosen ? current.filter((value) => value !== index) : [...current, index])} className={`border p-3 text-left transition-colors ${answerCardClass(chosen, member.belongs, game.checked, 'border-ink-main bg-page-muted text-ink-main')}`}>
          <span className="typo-body block">{member.word}</span><span className="typo-subscript text-ink-muted">{getLanguageName(member.lang)}</span>
          {game.checked && <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="typo-subscript">{member.belongs ? 'Belongs' : 'Does not belong'}</span><AnswerFeedbackBadge selected={chosen} correct={member.belongs} /></div>}
        </button>;
      })}</div>
      <div className="mt-4 flex flex-wrap items-center gap-3">{!game.checked ? <button type="button" onClick={game.checkAnswer} className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">Check Answer</button> : <><span className={`typo-sublabel ${game.correct ? 'text-cognate-ink' : 'text-falsefriend-ink'}`}>{game.correct ? 'Correct' : 'Not quite'}</span><button type="button" onClick={game.nextRound} className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">{game.roundIndex === CLUSTER_ROUND_COUNT ? 'See Results' : 'Next Round'} <MaterialSymbol icon="arrow_forward" size={18} /></button></>}</div>
    </RoundPanel>
  </GamePage>;
}
