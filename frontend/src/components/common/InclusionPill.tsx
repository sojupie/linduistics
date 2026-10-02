import type { ReactNode } from 'react';
import { MaterialSymbol } from './MaterialSymbol';

interface InclusionPillProps {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  size?: 'sm' | 'md';
  activeClassName?: string;
  activeIconClassName?: string;
  title?: string;
}

export function InclusionPill({
  active,
  children,
  onClick,
  size = 'sm',
  activeClassName = 'bg-page-surface border border-ink-main text-ink-main font-semibold shadow-2xs',
  activeIconClassName = 'text-cognate-ink',
  title,
}: InclusionPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`typo-badge inline-flex items-center gap-1.5 cursor-pointer transition-colors ${size === 'md' ? 'px-2.5 py-1 text-[0.8125rem] leading-5' : 'px-2 py-0.5'} ${active ? activeClassName : 'bg-page-muted text-ink-light line-through'}`}
    >
      <span>{children}</span>
      {active && <MaterialSymbol icon="check" size={size === 'md' ? 16 : 14} className={activeIconClassName} />}
    </button>
  );
}
