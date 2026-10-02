import React, { Suspense } from 'react';
import {
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';
import { z } from 'zod';
import { RootRoute } from './root';
import { LoadingIndicator } from '../components/common/LoadingIndicator';

// Lazy component imports for clean code splitting
const LanguagesLazy = React.lazy(() =>
  import('../routes/languages.lazy').then((m) => ({ default: m.LanguagesRouteComponent })),
);
const LexiconLazy = React.lazy(() =>
  import('../routes/lexicon.lazy').then((m) => ({ default: m.LexiconRouteComponent })),
);
const InspectorLazy = React.lazy(() =>
  import('../routes/inspector.lazy').then((m) => ({ default: m.InspectorRouteComponent })),
);
const GamesLazy = React.lazy(() =>
  import('../routes/games.lazy').then((m) => ({ default: m.GamesRouteComponent })),
);
const GameLazy = React.lazy(() =>
  import('../routes/games.lazy').then((m) => ({ default: m.GameRouteComponent })),
);
export const languagesSearchSchema = z.object({
  sort: z.enum(['ease', 'minefield', 'phonetic', 'cognates', 'semantic_shifts', 'spelling', 'pairs', 'name']).optional(),
});

export const lexiconSearchSchema = z.object({
  category: z.string().optional(),
  source: z.string().optional(),
  target: z.string().optional(),
  id: z.coerce.number().int().positive().optional(),
  q: z.string().optional(),
});

// Route definitions
export const indexRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/languages' });
  },
});

export const languagesRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/languages',
  validateSearch: languagesSearchSchema,
  component: () => (
    <Suspense fallback={<LoadingIndicator />}>
      <LanguagesLazy />
    </Suspense>
  ),
});

export const languagesPreviewRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/languages-preview',
  beforeLoad: () => {
    throw redirect({ to: '/languages' });
  },
});

export const lexiconRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/lexicon',
  validateSearch: lexiconSearchSchema,
  component: () => (
    <Suspense fallback={<LoadingIndicator />}>
      <LexiconLazy />
    </Suspense>
  ),
});

export const quizRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/quiz',
  beforeLoad: () => { throw redirect({ to: '/games/false-friends' }); },
});

export const gamesRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/games',
  component: () => (
    <Suspense fallback={<LoadingIndicator />}>
      <GamesLazy />
    </Suspense>
  ),
});

const gameRoutes = [
  ['false-friends', '/games/false-friends'],
  ['cognate-grid', '/games/cognate-grid'],
  ['sort-pairs', '/games/sort-pairs'],
  ['odd-word-out', '/games/odd-word-out'],
  ['word-family', '/games/word-family'],
] as const;
export const gameRoutesList = gameRoutes.map(([game, path]) => createRoute({
  getParentRoute: () => RootRoute,
  path,
  component: () => <Suspense fallback={<LoadingIndicator />}><GameLazy game={game} /></Suspense>,
}));

export const inspectorRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/inspector',
  component: () => (
    <Suspense fallback={<LoadingIndicator />}>
      <InspectorLazy />
    </Suspense>
  ),
});

const routeTree = RootRoute.addChildren([
  indexRoute,
  languagesRoute,
  languagesPreviewRoute,
  lexiconRoute,
  quizRoute,
  gamesRoute,
  ...gameRoutesList,
  inspectorRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
