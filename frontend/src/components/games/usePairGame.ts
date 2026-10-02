import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { fetchPairs } from '../../services/apiClient';
import { useLanguagesQuery } from '../../services/queries';
import { QUERY_CONFIG } from '../../constants/config';
import { createRandomSeed, shuffle } from '../../utils/shuffle';

const POSITIONS = ['noun', 'verb', 'adj', 'adv', 'prep', 'pron', 'intj', 'num', 'conj', 'det', 'name'];
const isTrueCognate = (category: string) => ['true_cognate', 'full_cognate'].includes(category);
const isFalseFriend = (category: string) => ['false_friend', 'cognate_false_friend', 'accidental_lookalike'].includes(category);

export function pairAnswer(item: { category: string; etymological_relation: string }) {
  return isTrueCognate(item.category) ? 'true' : item.category === 'cognate_false_friend' || item.etymological_relation === 'cognate' ? 'related' : 'lookalike';
}

export function usePairGame(limit: number) {
  const languagesQuery = useLanguagesQuery();
  const languages = languagesQuery.data;
  const pairs = languages?.pairs ?? [];
  const sources = Array.from(new Set(pairs.map((pair) => pair.source)));
  const [chosenSource, setChosenSource] = useState('');
  const source = sources.includes(chosenSource) ? chosenSource : sources.includes('sv') ? 'sv' : sources[0] ?? 'sv';
  const availableTargets = Array.from(new Set(pairs.filter((pair) => pair.source === source).map((pair) => pair.target)));
  const [chosenTargets, setChosenTargets] = useState<string[] | null>(null);
  const selectedTargets = (chosenTargets ?? [availableTargets.includes('da') ? 'da' : availableTargets[0]]).filter((target): target is string => Boolean(target && availableTargets.includes(target)));
  const selectedTargetKey = selectedTargets.join(',');
  const [includedPos, setIncludedPos] = useState<string[]>(POSITIONS.filter((pos) => pos !== 'name'));
  const [sampleSeed, setSampleSeed] = useState(createRandomSeed);
  const pairsQuery = useQuery({
    queryKey: ['game-pairs', source, selectedTargets, sampleSeed],
    queryFn: async () => (await Promise.all(selectedTargets.flatMap((target) => ['true_cognate', 'false_friend'].map((category) => fetchPairs({ source, target, category, limit: 200, seed: sampleSeed }))))).flatMap((result) => result.items),
    enabled: selectedTargets.length > 0,
    staleTime: QUERY_CONFIG.PAIRS_STALE_TIME_MS,
  });
  const items = useMemo(() => {
    const pool = (pairsQuery.data ?? []).filter((item) => includedPos.includes(item.pos_a?.toLowerCase() ?? '') && (!isFalseFriend(item.category) || item.etymological_relation !== 'unknown'));
    const offset = (source.length + selectedTargetKey.length) % Math.max(pool.length, 1);
    return shuffle([...pool.slice(offset), ...pool.slice(0, offset)]);
  }, [includedPos, pairsQuery.data, selectedTargetKey, source]);
  const [selected, setSelected] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [gridScore, setGridScore] = useState<number | null>(null);
  const [gridTarget, setGridTarget] = useState<'true' | 'false'>('true');
  const [gridTotal, setGridTotal] = useState(0);
  const [finished, setFinished] = useState(false);
  const [session, setSession] = useState(0);
  const questionItems = useMemo(() => {
    if (!items.length) return [];
    const categories = ['true', 'related', 'lookalike'] as const;
    const quotas = { true: Math.ceil(limit * 0.4), related: Math.floor(limit * 0.3), lookalike: Math.floor(limit * 0.3) };
    const roundItems = new Map<number, typeof items[number]>();
    for (const category of categories) {
      const group = items.filter((item) => pairAnswer(item) === category);
      const count = Math.min(quotas[category], group.length);
      const offset = (session * quotas[category]) % Math.max(group.length, 1);
      for (let index = 0; index < count; index++) {
        const item = group[(offset + index) % group.length];
        if (item) roundItems.set(item.id, item);
      }
    }
    const offset = (session * limit) % items.length;
    for (let index = 0; roundItems.size < Math.min(limit, items.length) && index < items.length; index++) {
      const item = items[(offset + index) % items.length];
      if (item) roundItems.set(item.id, item);
    }
    return shuffle(Array.from(roundItems.values()));
  }, [items, limit, session]);
  const reset = () => {
    setSelected([]);
    setAnswers({});
    setGridScore(null);
    setGridTotal(0);
    setGridTarget('true');
    setFinished(false);
    setSampleSeed(createRandomSeed());
    setSession((value) => value + 1);
  };
  const changeSource = (value: string) => {
    setChosenSource(value);
    setChosenTargets(null);
    reset();
  };
  const toggleTarget = (value: string) => {
    setChosenTargets((current) => {
      const targets = current ?? selectedTargets;
      return targets.includes(value) ? targets.filter((target) => target !== value) : [...targets, value];
    });
    reset();
  };
  const togglePos = (value: string) => {
    setIncludedPos((current) => current.includes(value) ? current.filter((pos) => pos !== value) : [...current, value]);
    reset();
  };
  const score = questionItems.filter((item) => answers[item.id] === pairAnswer(item)).length;

  return {
    languages,
    source,
    sourceLanguages: sources,
    availableTargets,
    selectedTargets,
    includedPos,
    changeSource,
    toggleTarget,
    togglePos,
    questionItems,
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
    isLoading: languagesQuery.isLoading || pairsQuery.isLoading,
    isError: languagesQuery.isError || pairsQuery.isError,
    retry: () => { void languagesQuery.refetch(); void pairsQuery.refetch(); },
  };
}
