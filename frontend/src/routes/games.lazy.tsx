import React from 'react';
import { GamesMenu, GameRoute } from '../components/games/Games';

export const GamesRouteComponent: React.FC = () => <GamesMenu />;

export const GameRouteComponent: React.FC<{ game: 'false-friends' | 'cognate-grid' | 'sort-pairs' | 'odd-word-out' | 'word-family' }> = ({ game }) => <GameRoute game={game} />;
