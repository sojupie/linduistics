import React from 'react';
import { LanguageSelect } from '../common/LanguagePicker';
import { getPosFullName, POS_FULL_NAMES } from '../../utils/formatters';

const POS_ORDER = ['noun', 'verb', 'adj', 'adv', 'name', 'prep', 'pron', 'num', 'conj', 'det', 'intj'];

export const ClusterFilters: React.FC<{ language: string; languages: string[]; pos: string; onLanguageChange: (value: string) => void; onPosChange: (value: string) => void }> = ({ language, languages, pos, onLanguageChange, onPosChange }) => <div className="mb-4 flex flex-wrap items-center gap-4">
  <LanguageSelect label="Language:" value={language} languages={languages} onChange={onLanguageChange} />
  <label className="flex items-center gap-2"><span className="typo-sublabel">Part of speech:</span><select value={pos} onChange={(event) => onPosChange(event.target.value)} className="border-b border-book-rule bg-transparent py-0.5 typo-sublabel font-serif text-ink-main focus:border-ink-main focus:outline-none cursor-pointer">{POS_ORDER.filter((value) => value in POS_FULL_NAMES).map((value) => <option key={value} value={value}>{getPosFullName(value)}</option>)}</select></label>
</div>;
