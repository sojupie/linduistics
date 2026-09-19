import React, { Suspense } from 'react';
import {
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';
import { z } from 'zod';
import { RootRoute } from './root';
import { LoadingFolio } from '../components/common/LoadingFolio';

// Lazy component imports for clean code splitting
const OrbitLazy = React.lazy(() =>
  import('../routes/orbit.lazy').then((m) => ({ default: m.OrbitRouteComponent })),
);
const RegisterLazy = React.lazy(() =>
  import('../routes/register.lazy').then((m) => ({ default: m.RegisterRouteComponent })),
);
const SpecimensLazy = React.lazy(() =>
  import('../routes/specimens.lazy').then((m) => ({ default: m.SpecimensRouteComponent })),
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

const registerSearchSchema = z.object({
  sort: z.enum(['ease', 'minefield', 'phonetic', 'ancient']).optional(),
});

const specimensSearchSchema = z.object({
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
    <Suspense fallback={<LoadingFolio />}>
      <OrbitLazy />
    </Suspense>
  ),
});

export const registerRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/register',
  validateSearch: registerSearchSchema,
  component: () => (
    <Suspense fallback={<LoadingFolio />}>
      <RegisterLazy />
    </Suspense>
  ),
});

export const specimensRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/specimens',
  validateSearch: specimensSearchSchema,
  component: () => (
    <Suspense fallback={<LoadingFolio />}>
      <SpecimensLazy />
    </Suspense>
  ),
});

export const quizRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/quiz',
  component: () => (
    <Suspense fallback={<LoadingFolio />}>
      <QuizLazy />
    </Suspense>
  ),
});

export const inspectorRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/inspector',
  component: () => (
    <Suspense fallback={<LoadingFolio />}>
      <InspectorLazy />
    </Suspense>
  ),
});

const routeTree = RootRoute.addChildren([
  indexRoute,
  orbitRoute,
  registerRoute,
  specimensRoute,
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
