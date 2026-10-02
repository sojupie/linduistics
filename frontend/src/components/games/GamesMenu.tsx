import React from 'react';
import { Link } from '@tanstack/react-router';
import { MaterialSymbol } from '../common/MaterialSymbol';

const games = [
  { id: 'false-friends', title: 'Guess the Real Meaning', description: '10 questions · Choose the real definition.', icon: 'quiz' },
  { id: 'cognate-grid', title: 'Cognate Grid', description: '2 grids · 16 pairs each · Find every pair that matches the prompt.', icon: 'grid_view' },
  { id: 'sort-pairs', title: 'Sort the Pairs', description: '10 pairs · Classify each word relationship.', icon: 'sort' },
  { id: 'odd-word-out', title: 'Find the Odd Word Out', description: '10 rounds · Pick the word with a different root.', icon: 'manage_search' },
  { id: 'word-family', title: 'Build a Word Family', description: '10 rounds · Find all words from the anchor’s family.', icon: 'hub' },
] as const;
const gameRoutes = {
  'false-friends': '/games/false-friends',
  'cognate-grid': '/games/cognate-grid',
  'sort-pairs': '/games/sort-pairs',
  'odd-word-out': '/games/odd-word-out',
  'word-family': '/games/word-family',
} as const;

export const GamesMenu: React.FC = () => <section className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
  <h1 className="typo-page-title">Games</h1>
  <p className="typo-page-deck mt-1.5">Play with words across Germanic languages.</p>
  <div className="mt-5 divide-y divide-book-rule border-y border-book-rule">
    {games.map((game) => <Link key={game.id} to={gameRoutes[game.id]} className="flex items-start gap-3 py-4 text-ink-main hover:bg-page-muted">
      <MaterialSymbol icon={game.icon} size={22} className="mt-0.5 text-cognate-ink" />
      <span className="min-w-0"><span className="typo-section-header block">{game.title}</span><span className="typo-body text-ink-muted">{game.description}</span></span>
      <MaterialSymbol icon="arrow_forward" size={18} className="ml-auto mt-1 text-ink-muted" />
    </Link>)}
  </div>
</section>;
