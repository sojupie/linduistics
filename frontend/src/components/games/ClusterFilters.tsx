import React from 'react';
import { InclusionPill } from '../common/InclusionPill';
import { LanguageSelect } from '../common/LanguagePicker';
import { getLanguageName } from '../../data/languages';
import { getPosFullName } from '../../utils/formatters';

const POSITIONS = ['noun', 'verb', 'adj', 'adv', 'prep', 'pron', 'intj', 'num', 'conj', 'det', 'name'];

type ClusterFiltersProps = {
  source: string;
  sources: string[];
  availableTargets: string[];
  selectedTargets: string[];
  includedPos: string[];
  onSourceChange: (language: string) => void;
  onToggleTarget: (language: string) => void;
  onTogglePos: (pos: string) => void;
};

export const ClusterFilters: React.FC<ClusterFiltersProps> = ({ source, sources, availableTargets, selectedTargets, includedPos, onSourceChange, onToggleTarget, onTogglePos }) => <div className="mb-4 grid gap-2">
  <LanguageSelect label="Source language:" value={source} languages={sources} onChange={onSourceChange} />
  <PillRow label="Compare with:" values={availableTargets} selected={selectedTargets} onToggle={onToggleTarget} languageNames />
  <PillRow label="Parts of speech:" values={POSITIONS} selected={includedPos} onToggle={onTogglePos} />
</div>;

const PillRow: React.FC<{ label: string; values: string[]; selected: string[]; onToggle: (value: string) => void; languageNames?: boolean; exclusive?: boolean }> = ({ label, values, selected, onToggle, languageNames = false, exclusive = false }) => <div className="flex flex-wrap items-start gap-2">
  <span className="typo-sublabel text-ink-muted pt-1 shrink-0">{label}</span>
  <div className="flex flex-wrap gap-1">{values.map((value) => <InclusionPill key={value} active={selected.includes(value)} size="md" onClick={() => onToggle(value)} title={`${exclusive ? 'Select' : selected.includes(value) ? 'Exclude' : 'Include'} ${languageNames ? getLanguageName(value) : getPosFullName(value)}`}>
    {languageNames ? value.toUpperCase() : getPosFullName(value)}
  </InclusionPill>)}</div>
</div>;
