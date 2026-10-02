import { useMemo, useState } from 'react';
import { useClustersQuery, useLanguagesQuery } from '../../services/queries';
import type { CognateCluster, ClusterMember } from '../../types/linguistics';

export const CLUSTER_ROUND_COUNT = 10;
export type ClusterMode = 'odd' | 'family';
export type ClusterChoice = ClusterMember & { belongs: boolean };
export type ClusterQuestion = { family: CognateCluster; anchor: ClusterMember; choices: ClusterChoice[] };
const shuffled = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

function makeQuestion(clusters: CognateCluster[], pos: string, lang: string): ClusterQuestion | null {
  const valid = clusters
    .map((cluster) => ({ ...cluster, members: cluster.members.filter((member) => member.pos === pos) }))
    .filter((cluster) => cluster.members.length >= 4 && cluster.members.some((member) => member.lang === lang));
  if (valid.length < 2) return null;
  const family = shuffled(valid)[0];
  const distractor = shuffled(valid.filter((cluster) => cluster.id !== family.id))[0];
  if (!family || !distractor) return null;
  const familyMembers = shuffled(family.members);
  const anchorIndex = familyMembers.findIndex((member) => member.lang === lang);
  const anchor = familyMembers.splice(anchorIndex, 1)[0];
  const members = familyMembers.slice(0, 3).map((member) => ({ ...member, belongs: true }));
  const other = shuffled(distractor.members)[0];
  if (!anchor || !other) return null;
  return { family, anchor, choices: shuffled([...members, { ...other, belongs: false }]) };
}

export function useClusterRound(mode: ClusterMode) {
  const languagesQuery = useLanguagesQuery();
  const availableLanguages = languagesQuery.data?.languages ?? [];
  const [language, setLanguage] = useState('');
  const [pos, setPos] = useState('noun');
  const selectedLanguage = availableLanguages.includes(language) ? language : availableLanguages.includes('sv') ? 'sv' : availableLanguages[0] ?? '';
  const query = useClustersQuery({ min_langs: 2, lang: selectedLanguage || undefined, limit: 50 });
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
    return makeQuestion([...clusters.slice(offset), ...clusters.slice(0, offset)], pos, selectedLanguage);
  }, [pos, query.data, selectedLanguage, session]);
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
  const checkAnswer = () => {
    setChecked(true);
    if (correct) setScore((value) => value + 1);
  };
  const nextRound = () => {
    if (roundIndex === CLUSTER_ROUND_COUNT) {
      setFinished(true);
      return;
    }
    setRound(makeQuestion(query.data?.items ?? [], pos, selectedLanguage));
    setPicked([]);
    setChecked(false);
    setRoundIndex((value) => value + 1);
  };

  return {
    availableLanguages,
    selectedLanguage,
    setLanguage,
    pos,
    setPos,
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
