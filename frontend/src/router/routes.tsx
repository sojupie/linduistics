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
const OrbitLazy = React.lazy(() =>
  import('../routes/orbit.lazy').then((m) => ({ default: m.OrbitRouteComponent })),
);
const LanguagesLazy = React.lazy(() =>
  import('../routes/languages.lazy').then((m) => ({ default: m.LanguagesRouteComponent })),
);
const LexiconLazy = React.lazy(() =>
  import('../routes/lexicon.lazy').then((m) => ({ default: m.LexiconRouteComponent })),
);
const InspectorLazy = React.lazy(() =>
  import('../routes/inspector.lazy').then((m) => ({ default: m.InspectorRouteComponent })),
);
const QuizLazy = React.lazy(() =>
  import('../routes/quiz.lazy').then((m) => ({ default: m.QuizRouteComponent })),
);

// Zod search param validation schemas
const orbitSearchSchema = z.object({
  register: z.enum(['vernacular', 'academic']).optional(),
  modality: z.enum(['phonetic', 'spelling']).optional(),
  anchor: z.string().optional(),
});

export const languagesSearchSchema = z.object({
  sort: z.enum(['ease', 'minefield', 'phonetic', 'ancient', 'cognates', 'spelling', 'pairs', 'name']).optional(),
});

export const lexiconSearchSchema = z.object({
  category: z.string().optional(),
  source: z.string().optional(),
  target: z.string().optional(),
});

// Route definitions
export const indexRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/orbit' });
  },
});

export const orbitRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/orbit',
  validateSearch: orbitSearchSchema,
  component: () => (
    <Suspense fallback={<LoadingIndicator />}>
      <OrbitLazy />
    </Suspense>
  ),
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
  component: () => (
    <Suspense fallback={<LoadingIndicator />}>
      <QuizLazy />
    </Suspense>
  ),
});

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
  orbitRoute,
  languagesRoute,
  lexiconRoute,
  quizRoute,
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
