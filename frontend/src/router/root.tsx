import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Header } from '../components/common/Header';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export const RootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-page-bg text-ink-main flex flex-col font-sans">
      <Header />
      <main className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer id="app-footer" className="border-t border-book-rule bg-page-bg py-8 text-center typo-sublabel text-ink-muted">
        <div className="mx-auto max-w-4xl px-6 flex flex-col items-center gap-3 text-center">
          <p className="font-sans font-medium text-ink-main">
            Linduistics — Comparative Lexicon
          </p>
          <p className="typo-subscript text-ink-muted leading-relaxed">
            <strong className="text-ink-main font-medium">Disclaimer:</strong> Metrics reflect algorithmic comparisons across cataloged lemma pairs in the reference lexicon sample. A given percentage (such as cognate pairs between Swedish and Norwegian) measures classified sample proportion rather than a hard limit on total vocabulary overlap or mutual intelligibility. Data is generated computationally and is not guaranteed to be correct or academically validated.
          </p>
        </div>
      </footer>
    </div>
  ),
});
