import React from 'react';
import { ErrorState } from '../common/ErrorState';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { getLanguageName } from '../../data/languages';
import { GamePage, RoundPanel, RoundSummary } from './GameLayout';
import { CLUSTER_ROUND_COUNT, useClusterRound } from './useClusterRound';
import { ClusterFilters } from './ClusterFilters';

export const OddWordOut: React.FC = () => {
  const game = useClusterRound('odd');
  if (game.isLoading) return <GamePage title="Find the Odd Word Out" description="Find words that share a recorded root."><LoadingIndicator /></GamePage>;
  if (game.isError) return <GamePage title="Find the Odd Word Out" description=""><ErrorState onRetry={game.retry} /></GamePage>;
  if (!game.active) return <GamePage title="Find the Odd Word Out" description="Find words that share a recorded root."><ClusterFilters language={game.selectedLanguage} languages={game.availableLanguages} pos={game.pos} onLanguageChange={(value) => { game.setLanguage(value); game.reset(); }} onPosChange={(value) => { game.setPos(value); game.reset(); }} /><p className="typo-body text-ink-muted py-8">No cognate clusters are available for this language and part of speech.</p></GamePage>;
  if (game.finished) return <GamePage title="Find the Odd Word Out" description="Your results for this round."><RoundSummary score={game.score} total={CLUSTER_ROUND_COUNT} onRestart={game.reset} /></GamePage>;

  return <GamePage title="Find the Odd Word Out" description="Three words share a recorded root. Select the word that does not belong.">
    <ClusterFilters language={game.selectedLanguage} languages={game.availableLanguages} pos={game.pos} onLanguageChange={(value) => { game.setLanguage(value); game.reset(); }} onPosChange={(value) => { game.setPos(value); game.reset(); }} />
    <RoundPanel round={`Round ${game.roundIndex} of ${CLUSTER_ROUND_COUNT}`} score={game.score} total={CLUSTER_ROUND_COUNT} progress={(game.roundIndex - (game.checked ? 0 : 1)) / CLUSTER_ROUND_COUNT * 100}>
      <p className="typo-section-header mb-3">Shared meaning: {game.active.family.sample_gloss ?? game.active.family.root}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{game.active.choices.map((member, index) => {
        const chosen = game.picked.includes(index);
        const belongs = !member.belongs;
        return <button key={`${member.lang}-${member.word}-${index}`} type="button" disabled={game.checked} aria-pressed={chosen} onClick={() => game.setPicked((current) => chosen ? current.filter((value) => value !== index) : [...current, index])} className={`border p-3 text-left transition-colors ${choiceColor(chosen, belongs, game.checked)}`}>
          <span className="typo-body block">{member.word}</span><span className="typo-subscript text-ink-muted">{getLanguageName(member.lang)}</span>
          {game.checked && <span className={`typo-subscript block ${belongs ? 'text-cognate-ink' : 'text-falsefriend-ink'}`}>{belongs ? 'Does not belong' : 'Shares the root'}</span>}
        </button>;
      })}</div>
      <div className="mt-4 flex flex-wrap items-center gap-3">{!game.checked ? <button type="button" onClick={game.checkAnswer} className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">Check Answer</button> : <><span className={`typo-sublabel ${game.correct ? 'text-cognate-ink' : 'text-falsefriend-ink'}`}>{game.correct ? 'Correct' : 'Not quite'}</span><button type="button" onClick={game.nextRound} className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">{game.roundIndex === CLUSTER_ROUND_COUNT ? 'See Results' : 'Next Round'} <MaterialSymbol icon="arrow_forward" size={18} /></button></>}</div>
    </RoundPanel>
  </GamePage>;
};

function choiceColor(chosen: boolean, belongs: boolean, checked: boolean) {
  if (!checked) return chosen ? 'border-cognate-border bg-cognate-bg/60 text-cognate-ink' : 'border-book-rule bg-page-surface hover:border-cognate-border hover:bg-cognate-bg/20';
  if (chosen === belongs) return belongs ? 'border-cognate-border bg-cognate-bg/60 text-cognate-ink' : 'border-book-rule bg-page-surface';
  return chosen ? 'border-falsefriend-border bg-falsefriend-bg/60 text-falsefriend-ink' : belongs ? 'border-cognate-border bg-cognate-bg/20' : 'border-book-rule bg-page-surface';
}
