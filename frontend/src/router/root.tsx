import { createRootRoute, Outlet } from '@tanstack/react-router';
import { HeaderFolio } from '../components/common/HeaderFolio';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export const RootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-page-bg text-ink-main flex flex-col font-serif">
      <HeaderFolio />
      <main className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer className="border-t border-book-rule bg-page-bg py-8 text-center text-sm text-ink-muted">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-serif">
            Linduistics — comparative lexicon
          </p>
          <p className="text-ink-light">
            Algorithmic lexicological register
          </p>
        </div>
      </footer>
    </div>
  ),
});
