import React from 'react';

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

interface SpecimenHeadwordProps {
  lemma: string;
  ipa?: string | null;
  pos?: string | null;
  isFalseFriend?: boolean;
  isCognate?: boolean;
  className?: string;
}

export const SpecimenHeadword: React.FC<SpecimenHeadwordProps> = ({
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

  return (
    <span className={`inline-flex items-baseline gap-2 text-base ${className}`.trim()}>
      <span className={`font-bold tracking-tight ${lemmaColor}`}>{lemma}</span>
      {ipa && <Phonetic ipa={ipa} />}
      {pos && (
        <span className="text-xs tracking-wider uppercase text-ink-muted">
          [{pos}]
        </span>
      )}
    </span>
  );
};
