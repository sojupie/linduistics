import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRandomClusters } from '../../services/apiClient';
import { useLanguagesQuery } from '../../services/queries';
import { QUERY_CONFIG } from '../../constants/config';
import { shuffle } from '../../utils/shuffle';
import type { CognateCluster, ClusterMember } from '../../types/linguistics';

export const CLUSTER_ROUND_COUNT = 10;
export type ClusterMode = 'odd' | 'family';
export type ClusterChoice = ClusterMember & { belongs: boolean };
export type ClusterQuestion = { family: CognateCluster; anchor: ClusterMember; choices: ClusterChoice[]; clusterIds: number[] };
function makeQuestion(clusters: CognateCluster[], includedPos: string[], source: string, targets: string[], excludedIds = new Set<number>()): ClusterQuestion | null {
  const valid = clusters
    .map((cluster) => ({ ...cluster, members: cluster.members.filter((member) => includedPos.includes(member.pos) && (member.lang === source || targets.includes(member.lang))) }))
    .filter((cluster) => cluster.members.some((member) => member.lang === source) && cluster.members.filter((member) => targets.includes(member.lang)).length >= 3);
  const available = valid.filter((cluster) => !excludedIds.has(cluster.id));
  if (available.length < 2) return null;
  const family = shuffle(available)[0];
  const distractor = shuffle(available.filter((cluster) => cluster.id !== family.id))[0];
  if (!family || !distractor) return null;
  const familyMembers = shuffle(family.members);
  const anchorIndex = familyMembers.findIndex((member) => member.lang === source);
  const anchor = familyMembers.splice(anchorIndex, 1)[0];
  const members = shuffle(familyMembers.filter((member) => targets.includes(member.lang))).slice(0, 3).map((member) => ({ ...member, belongs: true }));
  const other = shuffle(distractor.members.filter((member) => targets.includes(member.lang)))[0];
  if (!anchor || !other) return null;
  return { family, anchor, choices: shuffle([...members, { ...other, belongs: false }]), clusterIds: [family.id, distractor.id] };
}

export function useClusterRound(mode: ClusterMode) {
  const languagesQuery = useLanguagesQuery();
  const languageData = languagesQuery.data;
  const sources = Array.from(new Set(languageData?.pairs.map((pair) => pair.source) ?? []));
  const [chosenSource, setChosenSource] = useState('');
  const source = sources.includes(chosenSource) ? chosenSource : sources.includes('sv') ? 'sv' : sources[0] ?? '';
  const availableTargets = Array.from(new Set(languageData?.pairs.filter((pair) => pair.source === source).map((pair) => pair.target) ?? []));
  const [chosenTargets, setChosenTargets] = useState<string[] | null>(null);
  const selectedTargets = chosenTargets ?? availableTargets;
  const selectedTargetKey = selectedTargets.join(',');
  const [includedPos, setIncludedPos] = useState(['noun', 'verb', 'adj', 'adv', 'prep', 'pron', 'intj', 'num', 'conj', 'det']);
  const [session, setSession] = useState(0);
  const [sampleSeed, setSampleSeed] = useState(() => Math.random());
  const query = useQuery({
    queryKey: ['game-clusters', source, sampleSeed],
    queryFn: () => fetchRandomClusters({ min_langs: 2, lang: source || undefined }),
    staleTime: QUERY_CONFIG.PAIRS_STALE_TIME_MS,
  });
  const [round, setRound] = useState<ClusterQuestion | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [roundIndex, setRoundIndex] = useState(1);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const usedClusterIds = useRef(new Set<number>());
  const freshRound = useMemo(() => {
    const clusters = query.data?.items ?? [];
    const offset = session % Math.max(clusters.length, 1);
    return makeQuestion([...clusters.slice(offset), ...clusters.slice(0, offset)], includedPos, source, selectedTargetKey ? selectedTargetKey.split(',') : []);
  }, [includedPos, query.data, selectedTargetKey, session, source]);
  const active = round ?? freshRound;
  const expected = active?.choices.map((member, index) => member.belongs === (mode === 'family') ? index : -1).filter((index) => index >= 0) ?? [];
  const correct = picked.length === expected.length && expected.every((index) => picked.includes(index));

  const reset = () => {
    setRound(null);
    setPicked([]);
    setChecked(false);
    setRoundIndex(1);
    setScore(0);
    setFinished(false);
    usedClusterIds.current.clear();
    setSampleSeed(Math.random());
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
  const checkAnswer = () => {
    setChecked(true);
    if (mode === 'family') {
      const points = active?.choices.reduce((total, member, index) => {
        const chosen = picked.includes(index);
        return total + (chosen === member.belongs ? chosen ? 1 : 0 : -1);
      }, 0) ?? 0;
      setScore((value) => value + points);
    } else if (correct) setScore((value) => value + 1);
  };
  const nextRound = () => {
    if (roundIndex === CLUSTER_ROUND_COUNT) {
      setFinished(true);
      return;
    }
    active?.clusterIds.forEach((id) => usedClusterIds.current.add(id));
    let next = makeQuestion(query.data?.items ?? [], includedPos, source, selectedTargets, usedClusterIds.current);
    if (!next) {
      usedClusterIds.current.clear();
      next = makeQuestion(query.data?.items ?? [], includedPos, source, selectedTargets);
    }
    next?.clusterIds.forEach((id) => usedClusterIds.current.add(id));
    setRound(next);
    setPicked([]);
    setChecked(false);
    setRoundIndex((value) => value + 1);
  };

  return {
    sources,
    source,
    availableTargets,
    selectedTargets,
    includedPos,
    changeSource,
    toggleTarget,
    togglePos,
    active,
    picked,
    setPicked,
    checked,
    roundIndex,
    score,
    correct,
    finished,
    reset,
    checkAnswer,
    nextRound,
    isLoading: languagesQuery.isLoading || query.isLoading,
    isError: languagesQuery.isError || query.isError,
    retry: () => { void languagesQuery.refetch(); void query.refetch(); },
  };
}
