import React from 'react';
import { LanguagePairSelect } from '../common/LanguagePicker';
import { getPosFullName, POS_FULL_NAMES } from '../../utils/formatters';

const POS_ORDER = ['noun', 'verb', 'adj', 'adv', 'name', 'prep', 'pron', 'num', 'conj', 'det', 'intj'];
type PairFiltersProps = {
  pairs: { source: string; target: string }[];
  source: string;
  target: string;
  targets: string[];
  pos: string;
  setPos: (value: string) => void;
  setSelectedSource: (value: string) => void;
  setSelectedTarget: (value: string) => void;
  reset: () => void;
};

export const PairFilters: React.FC<PairFiltersProps> = ({ pairs, source, target, targets, pos, setPos, setSelectedSource, setSelectedTarget, reset }) => <div className="mb-4 flex flex-wrap items-center gap-4">
  <LanguagePairSelect label="Pair:" sourceLang={source} targetLang={target} availableSources={Array.from(new Set(pairs.map((pair) => pair.source)))} availableTargets={targets} onSourceChange={(code) => { setSelectedSource(code); setSelectedTarget(''); reset(); }} onTargetChange={(code) => { setSelectedTarget(code); reset(); }} />
  <label className="flex items-center gap-2"><span className="typo-sublabel">Part of speech:</span><select value={pos} onChange={(event) => { setPos(event.target.value); reset(); }} className="border-b border-book-rule bg-transparent py-0.5 typo-sublabel font-serif text-ink-main focus:border-ink-main focus:outline-none cursor-pointer"><option value="all">All</option>{POS_ORDER.filter((value) => value in POS_FULL_NAMES).map((value) => <option key={value} value={value}>{getPosFullName(value)}</option>)}</select></label>
</div>;
