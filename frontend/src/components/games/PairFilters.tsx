import React from 'react';
import { InclusionPill } from '../common/InclusionPill';
import { getLanguageName } from '../../data/languages';
import { getPosFullName } from '../../utils/formatters';

const POSITIONS = ['noun', 'verb', 'adj', 'adv', 'prep', 'pron', 'intj', 'num', 'conj', 'det', 'name'];

type PairFiltersProps = {
  source: string;
  sourceLanguages: string[];
  availableTargets: string[];
  selectedTargets: string[];
  includedPos: string[];
  onSourceChange: (language: string) => void;
  onToggleTarget: (language: string) => void;
  onTogglePos: (pos: string) => void;
};

export const PairFilters: React.FC<PairFiltersProps> = ({ source, sourceLanguages, availableTargets, selectedTargets, includedPos, onSourceChange, onToggleTarget, onTogglePos }) => <div className="mb-4 grid gap-2">
  <FilterPills label="Source language:" values={sourceLanguages} selected={[source]} onToggle={onSourceChange} languageNames exclusive />
  <FilterPills label="Compare with:" values={availableTargets} selected={selectedTargets} onToggle={onToggleTarget} languageNames />
  <FilterPills label="Parts of speech (source):" values={POSITIONS} selected={includedPos} onToggle={onTogglePos} />
</div>;

const FilterPills: React.FC<{ label: string; values: string[]; selected: string[]; onToggle: (value: string) => void; languageNames?: boolean; exclusive?: boolean }> = ({ label, values, selected, onToggle, languageNames = false, exclusive = false }) => <div className="flex flex-wrap items-start gap-2">
  <span className="typo-sublabel text-ink-muted pt-1 shrink-0">{label}</span>
  <div className="flex flex-wrap gap-1">{values.map((value) => <InclusionPill key={value} active={selected.includes(value)} size="md" onClick={() => onToggle(value)} title={`${exclusive ? 'Select' : selected.includes(value) ? 'Exclude' : 'Include'} ${languageNames ? getLanguageName(value) : getPosFullName(value)}`}>
    {languageNames ? value.toUpperCase() : getPosFullName(value)}
  </InclusionPill>)}</div>
</div>;
