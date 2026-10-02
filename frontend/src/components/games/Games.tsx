import React, { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { LanguagePairSelect, LanguageSelect } from '../common/LanguagePicker';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { ErrorState } from '../common/ErrorState';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { useClustersQuery, useLanguagesQuery, usePairsQuery } from '../../services/queries';
import { FalseFriendsQuiz } from '../quiz/FalseFriendsQuiz';
import type { CognateCluster } from '../../types/linguistics';
import { getLanguageName } from '../../data/languages';
import { getPosFullName, POS_FULL_NAMES } from '../../utils/formatters';

const POS_ORDER = ['noun', 'verb', 'adj', 'adv', 'name', 'prep', 'pron', 'num', 'conj', 'det', 'intj'];

type GameId = 'false-friends' | 'cognate-grid' | 'sort-pairs' | 'odd-word-out' | 'word-family';
const games: { id: GameId; title: string; description: string; icon: string }[] = [
  { id: 'false-friends', title: 'Guess the Real Meaning', description: '10 questions · Choose the real definition.', icon: 'quiz' },
  { id: 'cognate-grid', title: 'Cognate Grid', description: '2 grids · 16 pairs each · Find every pair that matches the prompt.', icon: 'grid_view' },
  { id: 'sort-pairs', title: 'Sort the Pairs', description: '10 pairs · Classify each word relationship.', icon: 'sort' },
  { id: 'odd-word-out', title: 'Find the Odd Word Out', description: '10 rounds · Pick the word with a different root.', icon: 'manage_search' },
  { id: 'word-family', title: 'Build a Word Family', description: '10 rounds · Find all words from the anchor’s family.', icon: 'hub' },
];
const shuffled = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);
const GRID_SIZE = 16;
const PAIR_ROUND_SIZE = 10;
const CLUSTER_ROUND_SIZE = 10;

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

const RoundPanel: React.FC<{ round: string; score?: number; total: number; progress: number; children: React.ReactNode }> = ({ round, score, total, progress, children }) => <div className="border border-book-rule bg-page-surface overflow-hidden">
  <div className="h-1 bg-book-rule/40"><div className="h-full bg-cognate-ink/60 transition-all" style={{ width: `${progress}%` }} /></div>
  <div className="p-4 sm:p-5"><div className="flex items-center justify-between gap-3 border-b border-book-rule pb-3 mb-4"><span className="typo-overline">{round}</span>{score !== undefined && <span className="typo-sublabel text-ink-muted">Score: <strong className="text-ink-main">{score}</strong> / {total}</span>}</div>{children}</div>
</div>;

const RoundSummary: React.FC<{ score: number; total: number; onRestart: () => void }> = ({ score, total, onRestart }) => <div className="border border-cognate-border bg-cognate-bg/40 p-5 sm:p-6">
  <div className="flex items-center gap-2 text-cognate-ink"><MaterialSymbol icon="task_alt" size={22} /><h2 className="typo-section-header">Round complete</h2></div>
  <p className="typo-metric-display mt-3">{score}<span className="typo-metric text-ink-muted"> / {total}</span></p>
  <button type="button" onClick={onRestart} className="mt-4 border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2 inline-flex items-center gap-2"><span>Play Again</span><MaterialSymbol icon="replay" size={18} /></button>
</div>;

const PairGame: React.FC<{ game: 'cognate-grid' | 'sort-pairs' }> = ({ game }) => {
  const { data: languages } = useLanguagesQuery();
  const pairs = languages?.pairs ?? [];
  const defaultPair = pairs.find((p) => p.source === 'sv' && p.target === 'da') ?? pairs[0];
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [pos, setPos] = useState('all');
  const source = pairs.some((p) => p.source === selectedSource) ? selectedSource : defaultPair?.source ?? 'sv';
  const targets = Array.from(new Set(pairs.filter((p) => p.source === source).map((p) => p.target)));
  const target = targets.includes(selectedTarget) ? selectedTarget : targets.includes('da') ? 'da' : targets[0] ?? 'da';
  const cognates = usePairsQuery({ source, target, category: 'true_cognate', pos: pos === 'all' ? undefined : pos, limit: 50 });
  const falseFriends = usePairsQuery({ source, target, category: 'false_friend', pos: pos === 'all' ? undefined : pos, limit: 50 });
  const [selected, setSelected] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [gridTarget, setGridTarget] = useState<'true' | 'false'>('true');
  const [gridTotal, setGridTotal] = useState(0);
  const [finished, setFinished] = useState(false);
  const [session, setSession] = useState(0);
  const items = useMemo(() => {
    const knownFalseFriends = (falseFriends.data?.items ?? []).filter((item) => ['false_friend', 'cognate_false_friend', 'accidental_lookalike'].includes(item.category) && item.etymological_relation !== 'unknown');
    const pool = [...(cognates.data?.items ?? []), ...knownFalseFriends];
    const offset = session % Math.max(pool.length, 1);
    return shuffled([...pool.slice(offset), ...pool.slice(0, offset)]).slice(0, game === 'cognate-grid' ? GRID_SIZE : PAIR_ROUND_SIZE);
  }, [cognates.data, falseFriends.data, game, session]);
  const reset = () => { setSelected([]); setAnswers({}); setScore(null); setGridTotal(0); setGridTarget('true'); setFinished(false); setSession((value) => value + 1); };
  if (cognates.isLoading || falseFriends.isLoading || !languages) return <LoadingIndicator />;
  if (cognates.isError || falseFriends.isError) return <ErrorState onRetry={() => { void cognates.refetch(); void falseFriends.refetch(); }} />;
  if (!items.length) return <p className="typo-body text-ink-muted py-8">No game pairs are available for this language pair.</p>;
  const active = items;
  const title = game === 'cognate-grid' ? 'Cognate Grid' : 'Sort the Pairs';
  const pairScore = active.filter((item) => {
    const answer = answers[item.id];
    const correct = ['true_cognate', 'full_cognate'].includes(item.category) ? 'true' : item.category === 'cognate_false_friend' || item.etymological_relation === 'cognate' ? 'related' : 'lookalike';
    return answer === correct;
  }).length;
  if (finished) return <GamePage title={title} description="Your results for this round."><RoundSummary score={game === 'cognate-grid' ? gridTotal : pairScore} total={game === 'cognate-grid' ? GRID_SIZE * 2 : active.length} onRestart={reset} />{game === 'sort-pairs' && <div className="mt-4 divide-y divide-book-rule border-y border-book-rule">{active.map((item) => { const correct = ['true_cognate', 'full_cognate'].includes(item.category) ? 'true' : item.category === 'cognate_false_friend' || item.etymological_relation === 'cognate' ? 'related' : 'lookalike'; const label = ({ true: 'True cognates', related: 'Related, changed meaning', lookalike: 'Lookalikes' } as Record<string, string>)[correct]; return <p key={item.id} className="typo-body py-3"><strong>{item.word_a}</strong> <span className="text-ink-muted">→</span> <span className="text-cognate-ink">{item.word_b}</span><span className="text-ink-muted"> · {label}</span></p>; })}</div>}</GamePage>;
  return <GamePage title={title} description={game === 'cognate-grid' ? `Select every ${gridTarget === 'true' ? 'true cognate' : 'false friend'} in the grid.` : 'Classify each pair by its recorded historical relationship.'}>
    <div className="mb-4 flex flex-wrap items-center gap-4"><LanguagePairSelect label="Pair:" sourceLang={source} targetLang={target} availableSources={Array.from(new Set(pairs.map((p) => p.source)))} availableTargets={targets} onSourceChange={(code) => { setSelectedSource(code); setSelectedTarget(''); reset(); }} onTargetChange={(code) => { setSelectedTarget(code); reset(); }} /><label className="flex items-center gap-2"><span className="typo-sublabel">Part of speech:</span><select value={pos} onChange={(event) => { setPos(event.target.value); reset(); }} className="border-b border-book-rule bg-transparent py-0.5 typo-sublabel font-serif text-ink-main focus:border-ink-main focus:outline-none cursor-pointer"><option value="all">All</option>{POS_ORDER.filter((value) => value in POS_FULL_NAMES).map((value) => <option key={value} value={value}>{getPosFullName(value)}</option>)}</select></label></div>
    {game === 'cognate-grid' ? <RoundPanel round={`Grid ${gridTarget === 'true' ? 1 : 2} of 2 · ${gridTarget === 'true' ? 'True Cognates' : 'False Friends'}`} score={gridTotal + (score ?? 0)} total={GRID_SIZE * 2} progress={gridTarget === 'true' ? score === null ? 0 : 50 : score === null ? 50 : 100}>
      <p className="typo-sublabel mb-3">Select all {gridTarget === 'true' ? 'true cognate' : 'false friend'} pairs.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{active.map((item) => {
        const correct = gridTarget === 'true' ? ['true_cognate', 'full_cognate'].includes(item.category) : ['false_friend', 'cognate_false_friend', 'accidental_lookalike'].includes(item.category);
        const chosen = selected.includes(item.id);
        const color = score === null ? chosen ? gridTarget === 'true' ? 'border-cognate-border bg-cognate-bg/60 text-cognate-ink' : 'border-falsefriend-border bg-falsefriend-bg/60 text-falsefriend-ink' : 'border-book-rule bg-page-surface hover:border-cognate-border hover:bg-cognate-bg/20' : chosen === correct ? correct ? 'border-cognate-border bg-cognate-bg/60 text-cognate-ink' : 'border-book-rule bg-page-surface' : chosen ? 'border-falsefriend-border bg-falsefriend-bg/60 text-falsefriend-ink' : correct ? 'border-cognate-border bg-cognate-bg/20' : 'border-book-rule bg-page-surface';
        return <button key={item.id} type="button" disabled={score !== null} aria-pressed={chosen} onClick={() => setSelected((current) => chosen ? current.filter((id) => id !== item.id) : [...current, item.id])} className={`border p-3 text-left typo-body transition-colors ${color}`}><span className="font-medium">{item.word_a}</span> <span className="text-ink-muted">→</span> <span>{item.word_b}</span>{score !== null && <MaterialSymbol icon={chosen === correct ? 'check' : 'close'} size={16} className={`ml-2 ${chosen === correct ? 'text-cognate-ink' : 'text-falsefriend-ink'}`} />}</button>;
      })}</div>
      <div className="mt-4 flex flex-wrap items-center gap-3">{score === null ? <button type="button" onClick={() => setScore(active.filter((item) => selected.includes(item.id) && (gridTarget === 'true' ? ['true_cognate', 'full_cognate'].includes(item.category) : ['false_friend', 'cognate_false_friend', 'accidental_lookalike'].includes(item.category))).length)} className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">Check Grid</button> : <button type="button" onClick={() => { setGridTotal((value) => value + (score ?? 0)); if (gridTarget === 'true') { setGridTarget('false'); setSelected([]); setScore(null); } else setFinished(true); }} className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">{gridTarget === 'true' ? 'Next: False Friends' : 'See Results'} <MaterialSymbol icon="arrow_forward" size={18} /></button>}{score !== null && <span className="typo-sublabel text-ink-muted">{score} correct in this grid</span>}</div>
    </RoundPanel> : <RoundPanel round={`${Object.keys(answers).length} of ${active.length} pairs answered`} total={active.length} progress={Object.keys(answers).length / active.length * 100}>
      <p className="typo-sublabel mb-3">Sort each pair into the group that best describes it.</p>
      <div className="divide-y divide-book-rule border-y border-book-rule">{active.map((item) => {
        const groups = [['true', 'True cognates', 'cognate'], ['related', 'Related, changed meaning', 'shifted'], ['lookalike', 'Lookalikes', 'falsefriend']];
        return <div key={item.id} className="grid gap-2 py-3"><p className="typo-body"><strong>{item.word_a}</strong> <span className="text-ink-muted">→</span> <span className="text-cognate-ink">{item.word_b}</span></p><div className="flex flex-wrap gap-1.5">{groups.map(([value, label, tone]) => { const chosen = answers[item.id] === value; const color = tone === 'cognate' ? 'border-transparent bg-cognate-ink text-page-bg' : tone === 'shifted' ? 'border-transparent bg-shifted-ink text-page-bg' : 'border-transparent bg-falsefriend-ink text-page-bg'; const idleColor = tone === 'cognate' ? 'border-cognate-border bg-cognate-bg/30 text-cognate-ink' : tone === 'shifted' ? 'border-shifted-border bg-shifted-bg/40 text-shifted-ink' : 'border-falsefriend-border bg-falsefriend-bg/30 text-falsefriend-ink'; const stateColor = chosen ? color : idleColor; return <button key={value} type="button" onClick={() => setAnswers((current) => ({ ...current, [item.id]: value }))} aria-pressed={chosen} className={`border px-2.5 py-1 typo-subscript ${stateColor}`}>{label}</button>; })}</div></div>;
      })}</div>{Object.keys(answers).length === active.length && <button type="button" onClick={() => setFinished(true)} className="mt-4 border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">See Results <MaterialSymbol icon="arrow_forward" size={18} /></button>}
    </RoundPanel>}  </GamePage>;
};

function makeClusterRound(clusters: CognateCluster[], pos: string, lang: string) {
  const valid = clusters.map((cluster) => ({ ...cluster, members: cluster.members.filter((member) => !pos || member.pos === pos) })).filter((cluster) => cluster.members.length >= 4 && cluster.members.some((member) => member.lang === lang));
  if (valid.length < 2) return null;
  const family = shuffled(valid)[0];
  const distractor = shuffled(valid.filter((cluster) => cluster.id !== family.id))[0];
  if (!family || !distractor) return null;
  const familyMembers = shuffled(family.members);
  const anchorIndex = familyMembers.findIndex((member) => member.lang === lang);
  const anchor = familyMembers.splice(anchorIndex, 1)[0];
  const members = familyMembers.slice(0, 3).map((member) => ({ ...member, belongs: true }));
  const other = shuffled(distractor.members)[0];
  return { family, anchor, choices: shuffled([...members, { ...other, belongs: false }]) };
}

const ClusterGame: React.FC<{ game: 'odd-word-out' | 'word-family' }> = ({ game }) => {
  const { data: languages } = useLanguagesQuery();
  const availableLanguages = languages?.languages ?? [];
  const [lang, setLang] = useState('');
  const [pos, setPos] = useState('noun');
  const selectedLang = availableLanguages.includes(lang) ? lang : availableLanguages.includes('sv') ? 'sv' : availableLanguages[0] ?? '';
  const query = useClustersQuery({ min_langs: 2, lang: selectedLang || undefined, limit: 50 });
  const [round, setRound] = useState<ReturnType<typeof makeClusterRound>>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [roundIndex, setRoundIndex] = useState(1);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [session, setSession] = useState(0);
  const freshRound = useMemo(() => {
    const clusters = query.data?.items ?? [];
    const offset = session % Math.max(clusters.length, 1);
    return makeClusterRound([...clusters.slice(offset), ...clusters.slice(0, offset)], pos, selectedLang);
  }, [query.data, session, pos, selectedLang]);
  const active = round ?? freshRound;
  const title = game === 'odd-word-out' ? 'Find the Odd Word Out' : 'Build a Word Family';
  const reset = () => { setRound(null); setPicked([]); setChecked(false); setRoundIndex(1); setScore(0); setFinished(false); setSession((value) => value + 1); };
  if (query.isLoading || !languages) return <GamePage title={title} description="Find words that share a recorded root."><LoadingIndicator /></GamePage>;
  if (query.isError) return <GamePage title={title} description=""><ErrorState onRetry={() => void query.refetch()} /></GamePage>;
  if (!active) return <GamePage title={title} description="Find words that share a recorded root."><div className="mb-4 flex flex-wrap items-center gap-4"><LanguageSelect label="Language:" value={selectedLang} languages={availableLanguages} onChange={(value) => { setLang(value); reset(); }} /><label className="flex items-center gap-2"><span className="typo-sublabel">Part of speech:</span><select value={pos} onChange={(event) => { setPos(event.target.value); reset(); }} className="border-b border-book-rule bg-transparent py-0.5 typo-sublabel font-serif text-ink-main focus:border-ink-main focus:outline-none cursor-pointer">{POS_ORDER.filter((value) => value in POS_FULL_NAMES).map((value) => <option key={value} value={value}>{getPosFullName(value)}</option>)}</select></label></div><p className="typo-body text-ink-muted py-8">No cognate clusters are available for this language and part of speech.</p></GamePage>;
  if (finished) return <GamePage title={title} description="Your results for this round."><RoundSummary score={score} total={CLUSTER_ROUND_SIZE} onRestart={() => { setRound(null); setPicked([]); setChecked(false); setRoundIndex(1); setScore(0); setFinished(false); setSession((value) => value + 1); }} /></GamePage>;
  const expected = active.choices.map((member, index) => member.belongs === (game === 'word-family') ? index : -1).filter((index) => index >= 0);
  const correct = picked.length === expected.length && expected.every((index) => picked.includes(index));
  return <GamePage title={title} description={game === 'odd-word-out' ? 'Three words share a recorded root. Select the word that does not belong.' : 'Select every word that shares the anchor’s recorded root.'}>
    <div className="mb-4 flex flex-wrap items-center gap-4"><LanguageSelect label="Language:" value={selectedLang} languages={availableLanguages} onChange={(value) => { setLang(value); reset(); }} /><label className="flex items-center gap-2"><span className="typo-sublabel">Part of speech:</span><select value={pos} onChange={(event) => { setPos(event.target.value); reset(); }} className="border-b border-book-rule bg-transparent py-0.5 typo-sublabel font-serif text-ink-main focus:border-ink-main focus:outline-none cursor-pointer">{POS_ORDER.filter((value) => value in POS_FULL_NAMES).map((value) => <option key={value} value={value}>{getPosFullName(value)}</option>)}</select></label></div>
    <RoundPanel round={`Round ${roundIndex} of ${CLUSTER_ROUND_SIZE}`} score={score} total={CLUSTER_ROUND_SIZE} progress={(roundIndex - (checked ? 0 : 1)) / CLUSTER_ROUND_SIZE * 100}>
    {game === 'word-family' ? <p className="typo-section-header mb-3">Starting word: {active.anchor.word} <span className="typo-subscript text-ink-muted">({getLanguageName(active.anchor.lang)})</span></p> : <p className="typo-section-header mb-3">Shared meaning: {active.family.sample_gloss ?? active.family.root}</p>}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{active.choices.map((member, index) => {
      const chosen = picked.includes(index);
      const belongsToAnswer = member.belongs === (game === 'word-family');
      const color = !checked ? chosen ? 'border-cognate-border bg-cognate-bg/60 text-cognate-ink' : 'border-book-rule bg-page-surface hover:border-cognate-border hover:bg-cognate-bg/20' : chosen === belongsToAnswer ? belongsToAnswer ? 'border-cognate-border bg-cognate-bg/60 text-cognate-ink' : 'border-book-rule bg-page-surface' : chosen ? 'border-falsefriend-border bg-falsefriend-bg/60 text-falsefriend-ink' : belongsToAnswer ? 'border-cognate-border bg-cognate-bg/20' : 'border-book-rule bg-page-surface';
      return <button key={`${member.lang}-${member.word}-${index}`} type="button" disabled={checked} aria-pressed={chosen} onClick={() => setPicked((old) => chosen ? old.filter((i) => i !== index) : [...old, index])} className={`border p-3 text-left transition-colors ${color}`}><span className="typo-body block">{member.word}</span><span className="typo-subscript text-ink-muted">{getLanguageName(member.lang)}</span>{checked && <span className={`typo-subscript block ${belongsToAnswer ? 'text-cognate-ink' : 'text-falsefriend-ink'}`}>{belongsToAnswer ? 'Belongs' : 'Does not belong'}</span>}</button>;
    })}</div>
    <div className="mt-4 flex flex-wrap items-center gap-3">{!checked ? <button type="button" onClick={() => { setChecked(true); if (correct) setScore((value) => value + 1); }} className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">Check Answer</button> : <><span className={`typo-sublabel ${correct ? 'text-cognate-ink' : 'text-falsefriend-ink'}`}>{correct ? 'Correct' : 'Not quite'}</span><button type="button" onClick={() => { if (roundIndex === CLUSTER_ROUND_SIZE) setFinished(true); else { setRound(makeClusterRound(query.data?.items ?? [], pos, selectedLang)); setPicked([]); setChecked(false); setRoundIndex((value) => value + 1); } }} className="border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2">{roundIndex === CLUSTER_ROUND_SIZE ? 'See Results' : 'Next Round'} <MaterialSymbol icon="arrow_forward" size={18} /></button></>}</div>
    </RoundPanel>
  </GamePage>;
};

export const GameRoute: React.FC<{ game: GameId }> = ({ game }) => {
  if (game === 'false-friends') return <FalseFriendsQuiz />;
  if (game === 'cognate-grid' || game === 'sort-pairs') return <PairGame game={game} />;
  return <ClusterGame game={game} />;
};
