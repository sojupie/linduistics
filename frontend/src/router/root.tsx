import { createRootRoute, Outlet } from '@tanstack/react-router';
import { HeaderFolio } from '../components/common/HeaderFolio';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export const RootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-substrate-dark text-ink-carbon flex flex-col font-serif">
      <HeaderFolio />
      <main className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer className="border-t border-border-hairline bg-substrate-dark py-6 text-center text-xs text-ink-muted">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="italic">
            Linduistics — Field Register of Germanic Lexicology
          </p>
          <p className="font-mono text-[10px] text-ink-faint">
            Based on 311k inflected forms & 144k spatial GiST pairwise alignments
          </p>
        </div>
      </footer>
    </div>
  ),
});
