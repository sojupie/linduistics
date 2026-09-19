import React, { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useHeadwordSearchQuery } from '../../services/queries';
import { Search, X } from 'lucide-react';
import { HEADER_CONFIG, QUERY_CONFIG } from '../../constants/config';
import { Phonetic } from './Phonetic';

export const Header: React.FC = () => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults, isFetching: searchFetching } = useHeadwordSearchQuery(
    searchQuery,
    'sv',
  );

  const navLinks = [
    { to: '/orbit', label: 'Language Orbit' },
    { to: '/languages', label: 'Language Overview' },
    { to: '/lexicon', label: 'Comparative Lexicon' },
    { to: '/quiz', label: 'False Friends Quiz' },
    { to: '/inspector', label: 'Text Inspector' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-book-rule bg-page-bg/95 backdrop-blur-xs w-full">
      <div className="w-full flex items-center justify-between px-6 sm:px-8 lg:px-12 py-4">
        {/* Application title */}
        <div className="flex-none">
          <Link to="/orbit" className="text-decoration-none">
            <h1 className="font-header text-2xl font-normal tracking-tight text-ink-main hover:opacity-80 transition-opacity">
              Linduistics
            </h1>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center justify-center gap-8 flex-1 px-4">
          {navLinks.map((link) => {
            const isActive =
              currentPath === link.to ||
              (link.to === '/orbit' && currentPath === '/');

            return (
              <Link
                key={link.to}
                to={link.to}
                className={`font-deck text-base transition-colors ${
                  isActive
                    ? 'text-ink-main font-medium underline decoration-2 underline-offset-8 decoration-cognate-ink'
                    : 'text-ink-muted hover:text-ink-main'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Quick Search */}
        <div className="flex-none flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex items-center gap-2 rounded border border-book-rule bg-page-surface px-3 py-1.5 font-serif text-sm text-ink-muted hover:border-book-rule-strong hover:text-ink-main transition-colors shadow-2xs"
            title="Search dictionary"
          >
            <Search size={HEADER_CONFIG.ICON_SIZE_TOOL_SM} />
            <span>Search dictionary</span>
          </button>
        </div>
      </div>

      {/* Search drawer */}
      {searchOpen && (
        <div className="border-t border-book-rule bg-page-surface px-6 py-4 shadow-sm">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <Search size={HEADER_CONFIG.ICON_SIZE_SEARCH} className="text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dictionary (e.g. katt, hund, kvinna, gift)..."
              autoFocus
              className="flex-1 bg-transparent font-serif text-base text-ink-main placeholder-ink-light focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-ink-muted hover:text-ink-main"
              >
                <X size={HEADER_CONFIG.ICON_SIZE_CLEAR} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="font-serif text-sm text-ink-muted hover:text-ink-main"
            >
              Close
            </button>
          </div>

          {searchFetching && (
            <p className="mx-auto mt-2 max-w-2xl font-serif text-sm text-ink-muted italic">
              Searching dictionary...
            </p>
          )}

          {searchResults && searchResults.length > 0 && (
            <div className={`mx-auto mt-4 max-w-2xl divide-y divide-book-rule rounded border border-book-rule bg-page-surface ${HEADER_CONFIG.MAX_SEARCH_RESULTS_HEIGHT_PX} overflow-y-auto`}>
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 text-sm hover:bg-page-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink-main text-base">{item.word_a}</span>
                    {item.ipa_a && <Phonetic ipa={item.ipa_a} />}
                    <span className="text-ink-light">→</span>
                    <span className="font-bold text-cognate-ink text-base">{item.word_b}</span>
                    <span className="text-ink-muted text-sm">({item.lang_b})</span>
                  </div>
                  <div className="text-ink-muted text-sm">
                    {item.category === 'true_cognate' || item.category === 'cognate'
                      ? 'True Cognate'
                      : item.category === 'false_friend'
                      ? 'False Friend'
                      : item.category === 'partial_cognate' || item.category === 'cousin' || item.category === 'sound_shift'
                      ? 'Partial Cognate'
                      : item.category === 'translation_pair' || item.category === 'schism'
                      ? 'Translation Pair'
                      : 'Other'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchResults && searchResults.length === 0 && searchQuery.trim().length >= QUERY_CONFIG.MIN_HEADWORD_SEARCH_CHARS && !searchFetching && (
            <p className="mx-auto mt-3 max-w-2xl font-serif text-sm italic text-ink-muted">
              No words found matching &ldquo;{searchQuery}&rdquo;.
            </p>
          )}
        </div>
      )}

      {/* Mobile nav */}
      <div className="flex md:hidden border-t border-book-rule bg-page-bg px-4 py-2 overflow-x-auto gap-4">
        {navLinks.map((link) => {
          const isActive =
            currentPath === link.to ||
            (link.to === '/orbit' && currentPath === '/');

          return (
            <Link
              key={link.to}
              to={link.to}
              className={`font-deck text-sm whitespace-nowrap ${
                isActive ? 'text-ink-main font-medium underline' : 'text-ink-muted'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
};

