import React from 'react';
import { Link } from '@tanstack/react-router';
import { MaterialSymbol } from '../common/MaterialSymbol';

export const GamePage: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => <section className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
  <Link to="/games" className="typo-sublabel text-ink-muted hover:text-ink-main inline-flex items-center gap-1"><MaterialSymbol icon="arrow_back" size={18} /> Games</Link>
  <div className="pb-4 mb-4 mt-3 border-b border-book-rule"><h1 className="typo-page-title">{title}</h1><p className="typo-page-deck mt-1.5">{description}</p></div>
  {children}
</section>;

export const RoundPanel: React.FC<{ round: string; score?: number; total: number; progress: number; children: React.ReactNode }> = ({ round, score, total, progress, children }) => <div className="border border-book-rule bg-page-surface overflow-hidden">
  <div className="h-1 bg-book-rule"><div className="h-full bg-cognate-ink transition-all" style={{ width: `${progress}%` }} /></div>
  <div className="p-4 sm:p-5"><div className="flex items-center justify-between gap-3 border-b border-book-rule pb-3 mb-4"><span className="typo-overline">{round}</span>{score !== undefined && <span className="typo-sublabel text-ink-muted">Score: <strong className="text-ink-main">{score}</strong> / {total}</span>}</div>{children}</div>
</div>;

export const RoundSummary: React.FC<{ score: number; total: number; onRestart: () => void }> = ({ score, total, onRestart }) => <div className="border border-cognate-border bg-cognate-bg p-5 sm:p-6">
  <div className="flex items-center gap-2 text-cognate-ink"><MaterialSymbol icon="task_alt" size={22} /><h2 className="typo-section-header">Round complete</h2></div>
  <p className="typo-metric-display mt-3">{score}<span className="typo-metric text-ink-muted"> / {total}</span></p>
  <button type="button" onClick={onRestart} className="mt-4 border border-ink-main bg-ink-main text-page-bg hover:bg-stone-800 typo-overline px-4 py-2 inline-flex items-center gap-2"><span>Play Again</span><MaterialSymbol icon="replay" size={18} /></button>
</div>;
