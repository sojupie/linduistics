import React from 'react';
import { getTaxonomyMeta } from '../../constants/taxonomy';

interface TaxonomyBadgeProps {
  category?: string;
  etymologicalRelation?: string;
  className?: string;
  showSubscript?: boolean;
}

export const TaxonomyBadge: React.FC<TaxonomyBadgeProps> = ({
  category,
  etymologicalRelation,
  className = '',
  showSubscript = false,
}) => {
  const meta = getTaxonomyMeta(category, etymologicalRelation);

  const badgeElement = (
    <span
      className={`typo-badge px-2 py-0.5 cursor-help whitespace-nowrap select-none transition-opacity hover:opacity-90 ${meta.style} ${className}`}
      title={meta.tooltip}
    >
      {meta.label}
    </span>
  );

  if (showSubscript && etymologicalRelation) {
    const subscriptLabel =
      etymologicalRelation === 'cognate'
        ? 'cognate'
        : etymologicalRelation === 'false_cognate'
          ? 'false cognate'
          : 'origin unknown';

    return (
      <div className="inline-flex flex-col items-center leading-tight">
        {badgeElement}
        <span
          className="typo-subscript text-ink-muted mt-0.5 whitespace-nowrap cursor-help"
          title={`Etymological origin: ${subscriptLabel}`}
        >
          {subscriptLabel}
        </span>
      </div>
    );
  }

  return badgeElement;
};
