import { useMemo, useState } from 'react';
import { useClustersQuery, useLanguagesQuery } from '../../services/queries';
import type { CognateCluster, ClusterMember } from '../../types/linguistics';

export const CLUSTER_ROUND_COUNT = 10;
export type ClusterMode = 'odd' | 'family';
export type ClusterChoice = ClusterMember & { belongs: boolean };
export type ClusterQuestion = { family: CognateCluster; anchor: ClusterMember; choices: ClusterChoice[] };
const shuffled = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

function makeQuestion(clusters: CognateCluster[], includedPos: string[], source: string, targets: string[]): ClusterQuestion | null {
  const valid = clusters
    .map((cluster) => ({ ...cluster, members: cluster.members.filter((member) => includedPos.includes(member.pos) && (member.lang === source || targets.includes(member.lang))) }))
    .filter((cluster) => cluster.members.some((member) => member.lang === source) && cluster.members.filter((member) => targets.includes(member.lang)).length >= 3);
  if (valid.length < 2) return null;
  const family = shuffled(valid)[0];
  const distractor = shuffled(valid.filter((cluster) => cluster.id !== family.id))[0];
  if (!family || !distractor) return null;
  const familyMembers = shuffled(family.members);
  const anchorIndex = familyMembers.findIndex((member) => member.lang === source);
  const anchor = familyMembers.splice(anchorIndex, 1)[0];
  const members = shuffled(familyMembers.filter((member) => targets.includes(member.lang))).slice(0, 3).map((member) => ({ ...member, belongs: true }));
  const other = shuffled(distractor.members.filter((member) => targets.includes(member.lang)))[0];
  if (!anchor || !other) return null;
  return { family, anchor, choices: shuffled([...members, { ...other, belongs: false }]) };
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
  const [includedPos, setIncludedPos] = useState(['noun', 'verb', 'adj', 'adv', 'prep', 'pron', 'intj', 'num', 'conj', 'det']);
  const query = useClustersQuery({ min_langs: 2, lang: source || undefined, limit: 50 });
  const [round, setRound] = useState<ClusterQuestion | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [roundIndex, setRoundIndex] = useState(1);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [session, setSession] = useState(0);
  const freshRound = useMemo(() => {
    const clusters = query.data?.items ?? [];
    const offset = session % Math.max(clusters.length, 1);
    return makeQuestion([...clusters.slice(offset), ...clusters.slice(0, offset)], includedPos, source, selectedTargets);
  }, [includedPos, query.data, selectedTargets, session, source]);
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
    if (correct) setScore((value) => value + 1);
  };
  const nextRound = () => {
    if (roundIndex === CLUSTER_ROUND_COUNT) {
      setFinished(true);
      return;
    }
    setRound(makeQuestion(query.data?.items ?? [], includedPos, source, selectedTargets));
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
