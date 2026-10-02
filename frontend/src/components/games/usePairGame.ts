import { useMemo, useState } from 'react';
import { useLanguagesQuery, usePairsQuery } from '../../services/queries';

const shuffled = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const isTrueCognate = (category: string) => ['true_cognate', 'full_cognate'].includes(category);
const isFalseFriend = (category: string) => ['false_friend', 'cognate_false_friend', 'accidental_lookalike'].includes(category);

export function pairAnswer(item: { category: string; etymological_relation: string }) {
  return isTrueCognate(item.category) ? 'true' : item.category === 'cognate_false_friend' || item.etymological_relation === 'cognate' ? 'related' : 'lookalike';
}

export function usePairGame(limit: number) {
  const languagesQuery = useLanguagesQuery();
  const pairs = languagesQuery.data?.pairs ?? [];
  const defaultPair = pairs.find((pair) => pair.source === 'sv' && pair.target === 'da') ?? pairs[0];
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [pos, setPos] = useState('all');
  const source = pairs.some((pair) => pair.source === selectedSource) ? selectedSource : defaultPair?.source ?? 'sv';
  const targets = Array.from(new Set(pairs.filter((pair) => pair.source === source).map((pair) => pair.target)));
  const target = targets.includes(selectedTarget) ? selectedTarget : targets.includes('da') ? 'da' : targets[0] ?? 'da';
  const cognates = usePairsQuery({ source, target, category: 'true_cognate', pos: pos === 'all' ? undefined : pos, limit: 50 });
  const falseFriends = usePairsQuery({ source, target, category: 'false_friend', pos: pos === 'all' ? undefined : pos, limit: 50 });
  const [selected, setSelected] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [gridScore, setGridScore] = useState<number | null>(null);
  const [gridTarget, setGridTarget] = useState<'true' | 'false'>('true');
  const [gridTotal, setGridTotal] = useState(0);
  const [finished, setFinished] = useState(false);
  const [session, setSession] = useState(0);
  const items = useMemo(() => {
    const falseItems = (falseFriends.data?.items ?? []).filter((item) => isFalseFriend(item.category) && item.etymological_relation !== 'unknown');
    const pool = [...(cognates.data?.items ?? []), ...falseItems];
    const offset = session % Math.max(pool.length, 1);
    return shuffled([...pool.slice(offset), ...pool.slice(0, offset)]).slice(0, limit);
  }, [cognates.data, falseFriends.data, limit, session]);
  const reset = () => {
    setSelected([]);
    setAnswers({});
    setGridScore(null);
    setGridTotal(0);
    setGridTarget('true');
    setFinished(false);
    setSession((value) => value + 1);
  };
  const score = items.filter((item) => answers[item.id] === pairAnswer(item)).length;

  return {
    languages: languagesQuery.data,
    pairs,
    source,
    target,
    targets,
    pos,
    setPos,
    setSelectedSource,
    setSelectedTarget,
    items,
    selected,
    setSelected,
    answers,
    setAnswers,
    gridScore,
    setGridScore,
    gridTarget,
    setGridTarget,
    gridTotal,
    setGridTotal,
    finished,
    setFinished,
    score,
    reset,
    isLoading: languagesQuery.isLoading || cognates.isLoading || falseFriends.isLoading,
    isError: languagesQuery.isError || cognates.isError || falseFriends.isError,
    retry: () => { void languagesQuery.refetch(); void cognates.refetch(); void falseFriends.refetch(); },
  };
}
