import React from 'react';
import { formatPos } from '../../utils/formatters';

interface PhoneticProps {
  ipa?: string | null;
  className?: string;
}

export const Phonetic: React.FC<PhoneticProps> = ({ ipa, className = '' }) => {
  if (!ipa) return null;
  const clean = ipa.replace(/^\/+|\/+$/g, '');
  return (
    <span className={`ipa ${className}`.trim()} lang="und-fonipa">
      /{clean}/
    </span>
  );
};


export interface WordHeadwordProps {
  lemma: string;
  ipa?: string | null;
  pos?: string | null;
  isFalseFriend?: boolean;
  isCognate?: boolean;
  className?: string;
}

export const WordHeadword: React.FC<WordHeadwordProps> = ({
  lemma,
  ipa,
  pos,
  isFalseFriend,
  isCognate,
  className = '',
}) => {
  const lemmaColor = isFalseFriend
    ? 'text-falsefriend-ink'
    : isCognate
    ? 'text-cognate-ink'
    : 'text-ink-main';

  const posAbbr = formatPos(pos);

  return (
    <span className={`inline-flex items-baseline gap-1.5 flex-wrap ${className}`.trim()}>
      <span className={`table-lemma font-deck font-medium tracking-tight ${lemmaColor}`}>
        {lemma}{posAbbr ? ',' : ''}
      </span>
      {posAbbr && (
        <span className="table-pos text-ink-muted">
          {posAbbr}
        </span>
      )}
      {ipa && <Phonetic ipa={ipa} className="table-ipa" />}
    </span>
  );
};

export type SpecimenHeadwordProps = WordHeadwordProps;
export const SpecimenHeadword = WordHeadword;
