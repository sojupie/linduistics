import React, { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { LanguagePairSelect } from '../common/LanguagePicker';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { ErrorState } from '../common/ErrorState';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { useClustersQuery, useLanguagesQuery, usePairsQuery } from '../../services/queries';
import { FalseFriendsQuiz } from '../quiz/FalseFriendsQuiz';
import type { CognateCluster } from '../../types/linguistics';
import { getLanguageName } from '../../data/languages';

type GameId = 'false-friends' | 'cognate-grid' | 'sort-pairs' | 'odd-word-out' | 'word-family';
const games: { id: GameId; title: string; description: string; icon: string }[] = [
  { id: 'false-friends', title: 'Guess the Real Meaning', description: 'Choose the real definition of a target word.', icon: 'quiz' },
  { id: 'cognate-grid', title: 'Cognate Grid', description: 'Find every true cognate in the grid.', icon: 'grid_view' },
  { id: 'sort-pairs', title: 'Sort the Pairs', description: 'Sort word pairs by their recorded relationship.', icon: 'sort' },
  { id: 'odd-word-out', title: 'Find the Odd Word Out', description: 'Find the word that does not share the others’ root.', icon: 'manage_search' },
  { id: 'word-family', title: 'Build a Word Family', description: 'Choose all the words that share the anchor’s root.', icon: 'hub' },
];
const shuffled = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

export const GamesMenu: React.FC = () => <section className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
  <h1 className="typo-page-title">Games</h1>
  <p className="typo-page-deck mt-1.5">Play with words across Germanic languages.</p>
  <div className="mt-5 divide-y divide-book-rule border-y border-book-rule">
    {games.map((game) => <Link key={game.id} to={`/games/${game.id}`} className="flex items-start gap-3 py-4 text-ink-main hover:bg-page-muted/40">
      <MaterialSymbol icon={game.icon} size={22} className="mt-0.5 text-cognate-ink" />
      <span className="min-w-0"><span className="typo-section-header block">{game.title}</span><span className="typo-body text-ink-muted">{game.description}</span></span>
      <MaterialSymbol icon="arrow_forward" size={18} className="ml-auto mt-1 text-ink-muted" />
    </Link>)}
  </div>
</section>;

const GamePage: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => <section className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
  <Link to="/games" className="typo-sublabel text-ink-muted hover:text-ink-main inline-flex items-center gap-1"><MaterialSymbol icon="arrow_back" size={18} /> Games</Link>
  <div className="pb-4 mb-4 mt-3 border-b border-book-rule"><h1 className="typo-page-title">{title}</h1><p className="typo-page-deck mt-1.5">{description}</p></div>
  {children}
</section>;

const PairGame: React.FC<{ game: 'cognate-grid' | 'sort-pairs' }> = ({ game }) => {
  const { data: languages } = useLanguagesQuery();
  const pairs = languages?.pairs ?? [];
  const defaultPair = pairs.find((p) => p.source === 'sv' && p.target === 'da') ?? pairs[0];
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const source = pairs.some((p) => p.source === selectedSource) ? selectedSource : defaultPair?.source ?? 'sv';
  const targets = Array.from(new Set(pairs.filter((p) => p.source === source).map((p) => p.target)));
  const target = targets.includes(selectedTarget) ? selectedTarget : targets.includes('da') ? 'da' : targets[0] ?? 'da';
  const cognates = usePairsQuery({ source, target, category: 'true_cognate', limit: 50 });
  const falseFriends = usePairsQuery({ source, target, category: 'false_friend', limit: 50 });
  const [selected, setSelected] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [gridTarget, setGridTarget] = useState<'true' | 'false'>('true');
  const items = useMemo(() => {
    const knownFalseFriends = (falseFriends.data?.items ?? []).filter((item) => ['false_friend', 'cognate_false_friend', 'accidental_lookalike'].includes(item.category) && item.etymological_relation !== 'unknown');
    return shuffled([...(cognates.data?.items ?? []), ...knownFalseFriends]).slice(0, game === 'cognate-grid' ? 16 : 9);
  }, [cognates.data, falseFriends.data, game]);
  const reset = () => { setSelected([]); setAnswers({}); setScore(null); };
  if (cognates.isLoading || falseFriends.isLoading || !languages) return <LoadingIndicator />;
  if (cognates.isError || falseFriends.isError) return <ErrorState onRetry={() => { void cognates.refetch(); void falseFriends.refetch(); }} />;
  if (!items.length) return <p className="typo-body text-ink-muted py-8">No game pairs are available for this language pair.</p>;
  const active = items;
  const title = game === 'cognate-grid' ? 'Cognate Grid' : 'Sort the Pairs';
  return <GamePage title={title} description={game === 'cognate-grid' ? 'Select every true cognate in the grid.' : 'Classify each pair by its recorded historical relationship.'}>
    <div className="mb-4"><LanguagePairSelect label="Pair:" sourceLang={source} targetLang={target} availableSources={Array.from(new Set(pairs.map((p) => p.source)))} availableTargets={targets} onSourceChange={(code) => { setSelectedSource(code); setSelectedTarget(''); reset(); }} onTargetChange={(code) => { setSelectedTarget(code); reset(); }} /></div>
    {game === 'cognate-grid' ? <>
      <p className="typo-sublabel mb-3">Select all {gridTarget === 'true' ? 'true cognate' : 'false friend'} pairs.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{active.map((item) => <button key={item.id} type="button" aria-pressed={selected.includes(item.id)} onClick={() => setSelected((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} className={`border border-book-rule p-3 text-left typo-body hover:bg-page-muted ${selected.includes(item.id) ? 'bg-cognate-bg/50 border-cognate-border' : 'bg-page-surface'}`}><span className="font-medium">{item.word_a}</span> <span className="text-ink-muted">→</span> <span className="text-cognate-ink">{item.word_b}</span></button>)}</div>
      <div className="mt-4 flex items-center gap-3"><button type="button" onClick={() => setScore(active.filter((item) => selected.includes(item.id) === (gridTarget === 'true' ? ['true_cognate', 'full_cognate'].includes(item.category) : ['false_friend', 'cognate_false_friend', 'accidental_lookalike'].includes(item.category))).length)} className="border border-ink-main bg-ink-main text-page-bg typo-sublabel px-3 py-1.5">Check answers</button><button type="button" onClick={() => { reset(); setGridTarget((old) => old === 'true' ? 'false' : 'true'); }} className="typo-sublabel underline">Next grid</button>{score !== null && <span className="typo-sublabel">{score} of {active.length} correct.</span>}</div>
    </> : <>
      <p className="typo-sublabel mb-3">Sort each pair into true cognates, related words with changed meanings, or lookalikes with no shared origin.</p>
      <div className="divide-y divide-book-rule border-y border-book-rule">{active.map((item) => {
        const correct = ['true_cognate', 'full_cognate'].includes(item.category) ? 'true' : item.category === 'cognate_false_friend' || item.etymological_relation === 'cognate' ? 'related' : 'lookalike';
        return <div key={item.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center"><p className="typo-body"><strong>{item.word_a}</strong> <span className="text-ink-muted">→</span> <span className="text-cognate-ink">{item.word_b}</span></p><div className="flex flex-wrap gap-1.5">{[['true', 'True cognates'], ['related', 'Related, changed meaning'], ['lookalike', 'Lookalikes']].map(([value, label]) => <button key={value} type="button" onClick={() => setAnswers((old) => ({ ...old, [item.id]: value }))} aria-pressed={answers[item.id] === value} className={`border border-book-rule px-2 py-1 typo-subscript ${answers[item.id] === value ? 'bg-page-muted text-ink-main' : 'text-ink-muted hover:text-ink-main'}`}>{label}</button>)}</div>{answers[item.id] && <span className="typo-subscript text-ink-muted sm:col-span-2">{answers[item.id] === correct ? 'Correct' : `Answer: ${correct}`}</span>}</div>;
      })}</div><button type="button" onClick={reset} className="mt-4 typo-sublabel underline">Reset answers</button>
    </>}
  </GamePage>;
};

function makeClusterRound(clusters: CognateCluster[]) {
  const valid = clusters.filter((cluster) => cluster.members.length >= 4);
  if (valid.length < 2) return null;
  const family = shuffled(valid)[0];
  const distractor = shuffled(valid.filter((cluster) => cluster.id !== family.id))[0];
  if (!family || !distractor) return null;
  const familyMembers = shuffled(family.members);
  const anchor = familyMembers[0];
  const members = familyMembers.slice(1, 4).map((member) => ({ ...member, belongs: true }));
  const other = shuffled(distractor.members)[0];
  return { family, anchor, choices: shuffled([...members, { ...other, belongs: false }]) };
}

const ClusterGame: React.FC<{ game: 'odd-word-out' | 'word-family' }> = ({ game }) => {
  const query = useClustersQuery({ min_langs: 2, limit: 50 });
  const [round, setRound] = useState<ReturnType<typeof makeClusterRound>>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const freshRound = useMemo(() => makeClusterRound(query.data?.items ?? []), [query.data]);
  const active = round ?? freshRound;
  const title = game === 'odd-word-out' ? 'Find the Odd Word Out' : 'Build a Word Family';
  if (query.isLoading) return <GamePage title={title} description="Find words that share a recorded root."><LoadingIndicator /></GamePage>;
  if (query.isError) return <GamePage title={title} description=""><ErrorState onRetry={() => void query.refetch()} /></GamePage>;
  if (!active) return <GamePage title={title} description="Find words that share a recorded root."><p className="typo-body text-ink-muted py-8">Not enough cognate clusters are available.</p></GamePage>;
  const expected = active.choices.map((member, index) => member.belongs === (game === 'word-family') ? index : -1).filter((index) => index >= 0);
  return <GamePage title={title} description={game === 'odd-word-out' ? 'Three words share a recorded root. Select the word that does not belong.' : 'Select every word that shares the anchor’s recorded root.'}>
    {game === 'word-family' ? <p className="typo-section-header mb-3">Starting word: {active.anchor.word} <span className="typo-subscript text-ink-muted">({getLanguageName(active.anchor.lang)})</span></p> : <p className="typo-section-header mb-3">Shared meaning: {active.family.sample_gloss ?? active.family.root}</p>}
    <div className="grid grid-cols-2 gap-2">{active.choices.map((member, index) => <button key={`${member.lang}-${member.word}-${index}`} type="button" aria-pressed={picked.includes(index)} onClick={() => setPicked((old) => old.includes(index) ? old.filter((i) => i !== index) : [...old, index])} className={`border border-book-rule p-3 text-left bg-page-surface hover:bg-page-muted ${picked.includes(index) ? 'bg-cognate-bg/50 border-cognate-border' : ''}`}><span className="typo-body block">{member.word}</span><span className="typo-subscript text-ink-muted">{getLanguageName(member.lang)}</span>{checked && <span className="typo-subscript block text-cognate-ink">{member.belongs ? 'Belongs' : 'Does not belong'}</span>}</button>)}</div>
    <div className="mt-4 flex gap-3 items-center"><button type="button" onClick={() => setChecked(true)} className="border border-ink-main bg-ink-main text-page-bg typo-sublabel px-3 py-1.5">Check answer</button><button type="button" onClick={() => { setRound(makeClusterRound(query.data?.items ?? [])); setPicked([]); setChecked(false); }} className="typo-sublabel underline">Next</button>{checked && <span className="typo-sublabel">{picked.length === expected.length && expected.every((i) => picked.includes(i)) ? 'Correct' : 'Try another round.'}</span>}</div>
  </GamePage>;
};

export const GameRoute: React.FC<{ game: GameId }> = ({ game }) => {
  if (game === 'false-friends') return <FalseFriendsQuiz />;
  if (game === 'cognate-grid' || game === 'sort-pairs') return <PairGame game={game} />;
  return <ClusterGame game={game} />;
};
