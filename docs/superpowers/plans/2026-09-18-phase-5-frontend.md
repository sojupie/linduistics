# Phase 5: Frontend Web Application Implementation Plan
## The Digital Naturalist's Field Guide — Optimized Archival SPA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an optimized, fully type-safe Single-Page Application using React 19, Vite, Tailwind CSS v4 (`@tailwindcss/vite`), TanStack Router (code-split, lazy-loaded, validated search params), TanStack Query (zero data-fetching `useEffect` footguns), and `pnpm`, rendered in the archival aesthetic of an 18th/19th-century naturalist's field guide (Audubon/Linnaeus) with Cardo typography and native HTML5 Canvas charts.

**Architecture:**
- **Package Manager:** Exclusively `pnpm`.
- **CSS Engine:** Tailwind CSS v4 via `@tailwindcss/vite` with native `@theme` CSS variables (zero PostCSS / `tailwind.config.js` boilerplate).
- **Routing:** `@tanstack/react-router` with lazy-loaded route chunks, URL search param validation schemas via Zod, and 100% type safety.
- **Server State:** `@tanstack/react-query` with centralized typed client (`apiClient.ts`), query caching, and zero `useEffect` fetching slop.
- **Linting & Code Quality:** ESLint 9 flat config enforcing `@typescript-eslint/no-explicit-any: "error"`, `@tanstack/query/exhaustive-deps: "error"`, and `react-hooks/exhaustive-deps: "error"`.
- **Visualizations:** Native HTML5 Canvas for the Celestial Expedition Orbit and 5-axis Radar chart (zero third-party chart libraries, 60 FPS hardware acceleration).
- **Aesthetic:** Digital Naturalist's Field Guide with Cardo typography (native IPA & combining diacritic support), unbleached rag paper / slate ledger materiality, and hairline tabular rules.
- **Type Safety:** 100% strict TypeScript (`strict: true`, `noImplicitAny: true`, ZERO `any` keywords).

**Tech Stack:** React 19, TypeScript, Vite, pnpm, Tailwind CSS v4 (`@tailwindcss/vite`), `@tanstack/react-router`, `@tanstack/react-query`, `@tanstack/eslint-plugin-query`, `zod`, Lucide React, HTML5 Canvas.

---

### Task 1: Vite + React 19 + TypeScript + Tailwind v4 Setup & Naturalist Design System

**Files:**
- Create: `frontend/` (via `pnpm create vite`)
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/eslint.config.js`
- Create: `frontend/src/index.css`
- Modify: `frontend/index.html`

- [ ] **Step 1: Initialize Vite React-TS project with pnpm and install dependencies**

Run from project root:
```bash
pnpm create vite frontend --template react-ts
cd frontend
pnpm install
pnpm add @tanstack/react-router @tanstack/react-query zod lucide-react clsx tailwind-merge
pnpm add -D @tailwindcss/vite tailwindcss @tanstack/eslint-plugin-query
```

- [ ] **Step 2: Configure TypeScript with strict flags (prohibit 'any')**

Write `frontend/tsconfig.json` & `frontend/tsconfig.app.json`:
Set `"strict": true`, `"noImplicitAny": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`.

- [ ] **Step 3: Configure ESLint 9 flat config with zero-any and TanStack Query rules**

Write `frontend/eslint.config.js`:
```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import pluginQuery from '@tanstack/eslint-plugin-query'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      '@tanstack/query': pluginQuery,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@tanstack/query/exhaustive-deps': 'error',
      '@tanstack/query/no-rest-destructuring': 'warn',
      '@tanstack/query/stable-query-client': 'error',
    },
  },
)
```

- [ ] **Step 4: Configure Vite with Tailwind v4 plugin and backend proxy**

Write `frontend/vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 5: Configure Tailwind v4 @theme design tokens and Cardo Google Font**

Write `frontend/src/index.css`:
```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Cardo:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

@theme {
  --color-substrate-dark: #161514;
  --color-substrate-panel: #1E1D1B;
  --color-substrate-light: #F5F2EB;
  --color-substrate-lightpanel: #ECE7DD;

  --color-border-hairline: #2C2A26;
  --color-border-lighthairline: #D8D1C3;
  --color-border-faint: rgba(234, 230, 223, 0.08);

  --color-ink-carbon: #EAE6DF;
  --color-ink-muted: #9C968A;
  --color-ink-faint: #6A655C;
  --color-ink-darkcarbon: #1C1B18;

  --color-specimen-moss: #5A8A64;
  --color-specimen-mossbg: rgba(90, 138, 100, 0.12);
  --color-specimen-oxblood: #B04358;
  --color-specimen-oxbloodbg: rgba(176, 67, 88, 0.12);
  --color-specimen-ochre: #C88A4E;
  --color-specimen-ochrebg: rgba(200, 138, 78, 0.12);
  --color-specimen-irongall: #4E7498;
  --color-specimen-irongallbg: rgba(78, 116, 152, 0.12);
  --color-specimen-slate: #7E7A71;
  --color-specimen-slatebg: rgba(126, 122, 113, 0.12);

  --font-serif: 'Cardo', Georgia, serif;
  --font-mono: 'JetBrains Mono', monospace;
}

:root {
  color-scheme: dark;
}

body {
  margin: 0;
  background-color: var(--color-substrate-dark);
  color: var(--color-ink-carbon);
  font-family: var(--font-serif);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.small-caps {
  font-variant: small-caps;
  letter-spacing: 0.06em;
}

.border-hairline {
  border: 1px solid var(--color-border-hairline);
}

::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
::-webkit-scrollbar-track {
  background: var(--color-substrate-dark);
}
::-webkit-scrollbar-thumb {
  background: var(--color-border-hairline);
  border-radius: 2px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3E3B35;
}
```

Update `frontend/index.html` title to `Linduistics — Field Register of Germanic Lexicology`.

- [ ] **Step 6: Build & lint verification**

Run:
```bash
cd frontend
pnpm run lint
pnpm run build
```
Expected: PASS without errors or warnings.

- [ ] **Step 7: Commit Task 1**

```bash
git add frontend/
git commit -m "feat(frontend): initialize Vite SPA with Tailwind v4, Cardo typography, and strict ESLint"
```

---

### Task 2: Centralized API Client & TanStack Query Hooks

**Files:**
- Create: `frontend/src/types/linguistics.ts`
- Create: `frontend/src/services/apiClient.ts`
- Create: `frontend/src/services/queries.ts`

- [ ] **Step 1: Write strict domain interfaces with zero 'any' keywords**

Write `frontend/src/types/linguistics.ts`:
Strict types for `SpecimenCategory`, `SpecimenPair`, `LanguageProfile`, `TokenAnalysis`, `InspectResponse`, `PairsQueryParams`, `PairsResult`.

- [ ] **Step 2: Implement centralized apiClient with error boundaries**

Write `frontend/src/services/apiClient.ts`:
Generic typed fetch wrapper:
```ts
export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
    throw new ApiError(res.status, errorBody.error || 'Network request failed');
  }
  return res.json() as Promise<T>;
}
```

- [ ] **Step 3: Implement TanStack Query hooks (no useEffect data fetching)**

Write `frontend/src/services/queries.ts`:
- `useHealthQuery()`: polls `/api/health` every 30s.
- `usePairsQuery(params: PairsQueryParams)`: queries `/api/pairs` with 5 min `staleTime`.
- `useInspectMutation()`: mutation for `POST /api/inspect`.
- `useFalseFriendsQuizQuery(limit: number)`: queries `/api/false-friends?mode=quiz`.
- `useHeadwordSearchQuery(query: string)`: debounced prefix search with minimum 2 characters.

- [ ] **Step 4: Commit Task 2**

```bash
git add frontend/src/types/ frontend/src/services/
git commit -m "feat(frontend): implement typed apiClient and TanStack Query hooks"
```

---

### Task 3: TanStack Router Setup with Type-Safe Search Params & Code Splitting

**Files:**
- Create: `frontend/src/router/routes.tsx`
- Create: `frontend/src/router/root.tsx`
- Create: `frontend/src/routes/orbit.lazy.tsx`
- Create: `frontend/src/routes/register.lazy.tsx`
- Create: `frontend/src/routes/specimens.lazy.tsx`
- Create: `frontend/src/routes/inspector.lazy.tsx`

- [ ] **Step 1: Define Root route with layout and QueryClientProvider**

Write `frontend/src/router/root.tsx`:
Mounts `HeaderFolio`, `QueryClientProvider`, `Outlet`, and global `ErrorBoundary`.

- [ ] **Step 2: Implement code-split routes with Zod search param schemas**

Write `frontend/src/router/routes.tsx`:
- `/orbit`: search params validated with `z.object({ register: z.enum(['vernacular', 'academic']).default('vernacular'), modality: z.enum(['spelling', 'phonetic']).default('phonetic') })`
- `/register`: search params `z.object({ sort: z.enum(['ease', 'minefield', 'phonetic', 'ancient']).default('ease') })`
- `/specimens`: search params `z.object({ category: z.enum(['all', 'freebie', 'minefield', 'cousin', 'schism']).default('all'), q: z.string().optional() })`
- `/inspector`: search params `z.object({ text: z.string().optional() })`
All route components are lazily imported via dynamic imports.

- [ ] **Step 3: Commit Task 3**

```bash
git add frontend/src/router/ frontend/src/routes/
git commit -m "feat(frontend): implement TanStack Router with type-safe search params and lazy loading"
```

---

### Task 4: The Celestial Linguistic Orbit on Native HTML5 Canvas

**Files:**
- Create: `frontend/src/components/orbit/CelestialOrbit.tsx`
- Create: `frontend/src/components/orbit/OrbitToolbar.tsx`

- [ ] **Step 1: Implement OrbitToolbar with URL search param bindings**

Write `frontend/src/components/orbit/OrbitToolbar.tsx`:
Directly reads and sets search params using `useSearch` and `useNavigate` from TanStack Router. Zero `useEffect` syncing.

- [ ] **Step 2: Implement 60 FPS CelestialOrbit Canvas simulation**

Write `frontend/src/components/orbit/CelestialOrbit.tsx`:
- Native `<canvas>` context using `requestAnimationFrame`.
- Central polar anchor *Svecana* (`SV`).
- Orbiting satellites with inertia / smooth spring interpolation (`lerp`).
- Concentric astronomical coordinate rings with degree hashes (`0°`, `90°`, `180°`, `270°`).
- High-DPI support (`window.devicePixelRatio`).
- Proper teardown with `cancelAnimationFrame` on unmount.
- Clicking a satellite navigates to `/specimens?target=...` or opens detail modal.

- [ ] **Step 3: Commit Task 4**

```bash
git add frontend/src/components/orbit/
git commit -m "feat(frontend): implement celestial linguistic orbit on native HTML5 canvas"
```

---

### Task 5: Germanic Kinship Register & 5-Axis Canvas Radar

**Files:**
- Create: `frontend/src/components/register/KinshipRegister.tsx`
- Create: `frontend/src/components/register/TaxonomicRatioBar.tsx`
- Create: `frontend/src/components/radar/ExpeditionRadarChart.tsx`

- [ ] **Step 1: Implement TaxonomicRatioBar component**

Write `frontend/src/components/register/TaxonomicRatioBar.tsx`:
Segmented specimen bar (Moss, Ochre, Oxblood, Slate) with hairline dividers.

- [ ] **Step 2: Implement KinshipRegister tabular ledger**

Write `frontend/src/components/register/KinshipRegister.tsx`:
Archival table format with Roman numerals (`I`, `II`, `III`), small-caps language classes, and sorting bound to TanStack Router URL search params.

- [ ] **Step 3: Implement ExpeditionRadarChart on HTML5 Canvas**

Write `frontend/src/components/radar/ExpeditionRadarChart.tsx`:
Native canvas 5-axis spider chart (Orthography, Phonetics, Heritage, Academic Loans, Deception Factor) drawn with hairline parchment guidelines and muted ink fills.

- [ ] **Step 4: Commit Task 5**

```bash
git add frontend/src/components/register/ frontend/src/components/radar/
git commit -m "feat(frontend): implement kinship register ledger and canvas radar profile"
```

---

### Task 6: Taxonomic Specimen Decks with Etymological Marginalia

**Files:**
- Create: `frontend/src/components/specimens/SpecimenDecks.tsx`
- Create: `frontend/src/components/specimens/SpecimenCard.tsx`
- Create: `frontend/src/components/specimens/SpecimenToolbar.tsx`

- [ ] **Step 1: Implement SpecimenCard with Audubon-style marginalia**

Write `frontend/src/components/specimens/SpecimenCard.tsx`:
Displays specimen number (`TABULA NO. 14`), Cardo bold headword, IPA transcription, small-caps POS, JetBrains Mono distance coefficients, and naturalist etymology notes.

- [ ] **Step 2: Implement SpecimenDecks wired to usePairsQuery**

Write `frontend/src/components/specimens/SpecimenDecks.tsx`:
Connects directly to TanStack Query `usePairsQuery`. Filters for:
1. **The Freebies:** *hand*, *vinter*, *storm*, *kaffe*.
2. **The Minefield:** *gift*, *semester*, *fart*, *rolig*.
3. **The Hidden Cousins:** *kyrka* -> *church*, *dag* -> *Tag*.
4. **The Great Schism:** *himmel* vs *sky*, *frihet* vs *liberty*.

- [ ] **Step 3: Commit Task 6**

```bash
git add frontend/src/components/specimens/
git commit -m "feat(frontend): implement specimen decks with TanStack Query integration"
```

---

### Task 7: Field Text Universality Inspector with Lemma Resolution

**Files:**
- Create: `frontend/src/components/inspector/TextInspectorFolio.tsx`
- Create: `frontend/src/components/inspector/SpecimenTokenPill.tsx`
- Create: `frontend/src/components/inspector/SpecimenDetailDrawer.tsx`

- [ ] **Step 1: Implement SpecimenTokenPill and SpecimenDetailDrawer**

Write `frontend/src/components/inspector/SpecimenTokenPill.tsx` and `frontend/src/components/inspector/SpecimenDetailDrawer.tsx`:
Typographic word tokens with quiet specimen underline rules (moss, ochre, slate) and drawer showing resolved canonical lemma (*katten* -> *katt*).

- [ ] **Step 2: Implement TextInspectorFolio wired to useInspectMutation**

Write `frontend/src/components/inspector/TextInspectorFolio.tsx`:
Textarea with sample buttons, concentric score gauge, and execution via TanStack Query mutation.

- [ ] **Step 3: Commit Task 7**

```bash
git add frontend/src/components/inspector/
git commit -m "feat(frontend): implement text inspector folio with TanStack Query mutation"
```

---

### Task 8: Navigation Folio, Search Ledger, Type Check & Build Audit

**Files:**
- Create: `frontend/src/components/common/HeaderFolio.tsx`
- Create: `frontend/src/components/common/SearchLedger.tsx`
- Create: `frontend/src/components/common/ErrorBoundary.tsx`
- Modify: `frontend/src/main.tsx`

- [x] **Step 1: Implement HeaderFolio and SearchLedger with live query hooks**

Write `frontend/src/components/common/HeaderFolio.tsx` and `frontend/src/components/common/SearchLedger.tsx`:
- Linden insignia (*Tilia cordata*).
- Live backend connection dot using `useHealthQuery`.
- Search autocomplete using `useHeadwordSearchQuery`.
- TanStack Router `<Link>` tabs with active indicator.

- [x] **Step 2: Assemble main.tsx with RouterProvider**

Write `frontend/src/main.tsx`:
Mounts `QueryClientProvider` and `RouterProvider`.

- [x] **Step 3: Full TypeScript strict type check & bundle build audit**

Run:
```bash
cd frontend
pnpm run lint
pnpm run build
```
Expected: 0 errors, 0 warnings, zero `any` keywords, production bundle split cleanly across lazy chunks in `dist/`.

- [x] **Step 4: Commit Task 8 and Push to main**

```bash
git add frontend/
git commit -m "feat(frontend): complete optimized SPA with TanStack Router, Query, and full type safety"
git push origin main
```
