import React, { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useHealthQuery, useHeadwordSearchQuery } from '../../services/queries';
import { Search, Compass, BookOpen, Layers, Microscope, Database, X } from 'lucide-react';
import { HEADER_CONFIG, QUERY_CONFIG } from '../../constants/config';

export const HeaderFolio: React.FC = () => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const { data: health, isSuccess, isError, isLoading } = useHealthQuery();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults, isFetching: searchFetching } = useHeadwordSearchQuery(searchQuery, 'sv');

  const navLinks = [
    { to: '/orbit', label: 'Celestial Orbit', icon: Compass, sub: 'Gravitational Map' },
    { to: '/register', label: 'Kinship Register', icon: BookOpen, sub: 'Taxonomic Matrix' },
    { to: '/specimens', label: 'Specimen Decks', icon: Layers, sub: 'Marginalia & Traps' },
    { to: '/inspector', label: 'Field Inspector', icon: Microscope, sub: 'Text Laboratory' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border-hairline bg-substrate-dark/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Brand Folio */}
        <div className="flex items-center gap-3">
          <Link to="/orbit" className="group flex items-center gap-2.5 text-decoration-none">
            {/* Linden Leaf Insignia (Tilia cordata) */}
            <div className="flex h-9 w-9 items-center justify-center rounded border border-border-hairline bg-substrate-panel group-hover:border-specimen-moss transition-colors">
              <svg
                width={HEADER_CONFIG.ICON_SIZE_LINDEN}
                height={HEADER_CONFIG.ICON_SIZE_LINDEN}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-specimen-moss transition-transform duration-300 group-hover:scale-105"
              >
                <path
                  d="M12 2C7 6 3 10 3 15C3 19 6.5 22 12 22C17.5 22 21 19 21 15C21 10 17 6 12 2Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 22V7M12 11L7 8M12 15L17 12M12 18L8 16"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-bold tracking-wider text-ink-carbon">
                  LINDUISTICS
                </span>
                <span className="rounded border border-border-hairline bg-substrate-panel px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-ink-muted">
                  v0.5.0
                </span>
              </div>
              <p className="font-serif text-[11px] italic text-ink-muted">
                Field Register of Germanic Lexicology
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 border-x border-border-hairline px-3">
          {navLinks.map((link) => {
            const isActive = currentPath === link.to || (link.to === '/orbit' && currentPath === '/');
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`group relative flex items-center gap-2 rounded px-3 py-1.5 transition-all ${
                  isActive
                    ? 'bg-substrate-panel text-ink-carbon shadow-sm'
                    : 'text-ink-muted hover:bg-substrate-panel/50 hover:text-ink-carbon'
                }`}
              >
                <Icon
                  size={HEADER_CONFIG.ICON_SIZE_NAV}
                  className={`transition-colors ${
                    isActive ? 'text-specimen-moss' : 'text-ink-faint group-hover:text-ink-muted'
                  }`}
                />
                <div className="flex flex-col text-left">
                  <span className="font-serif text-xs font-medium tracking-wide">
                    {link.label}
                  </span>
                  <span className="font-mono text-[9px] text-ink-faint">
                    {link.sub}
                  </span>
                </div>
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-specimen-moss" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Tools: Search Ledger & Database Health */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex items-center gap-1.5 rounded border border-border-hairline bg-substrate-panel px-2.5 py-1.5 font-mono text-xs text-ink-muted hover:border-ink-muted hover:text-ink-carbon transition-colors"
            title="Search specimen ledger"
          >
            <Search size={HEADER_CONFIG.ICON_SIZE_TOOL_SM} />
            <span className="hidden sm:inline">Search Ledger</span>
            <kbd className="hidden rounded bg-substrate-dark px-1.5 py-0.2 font-mono text-[10px] text-ink-faint sm:inline">
              /
            </kbd>
          </button>

          {/* Health Dot */}
          <div
            className="flex items-center gap-1.5 rounded border border-border-hairline bg-substrate-panel px-2.5 py-1.5 font-mono text-xs"
            title={
              isLoading
                ? 'Connecting to database...'
                : isSuccess
                ? `Repository Online: ${health?.database ?? 'PostGIS connected'}`
                : isError
                ? 'Repository Unreachable'
                : 'Connecting'
            }
          >
            <Database size={HEADER_CONFIG.ICON_SIZE_TOOL} className="text-ink-muted" />
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isSuccess
                  ? 'bg-specimen-moss shadow-[0_0_6px_var(--color-specimen-moss)]'
                  : isLoading
                  ? 'bg-specimen-ochre animate-pulse'
                  : 'bg-specimen-oxblood'
              }`}
            />
            <span className="hidden lg:inline text-[10px] text-ink-muted">
              {isSuccess ? 'Live Index' : isLoading ? 'Syncing...' : 'Local Cache'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Search Drawer */}
      {searchOpen && (
        <div className="border-t border-border-hairline bg-substrate-panel px-4 py-3 sm:px-6 shadow-xl">
          <div className="mx-auto flex max-w-2xl items-center gap-2">
            <Search size={HEADER_CONFIG.ICON_SIZE_SEARCH} className="text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Germanic headword specimen (e.g. katt, hund, kvinna, gift)..."
              autoFocus
              className="flex-1 bg-transparent font-serif text-sm text-ink-carbon placeholder-ink-faint focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-ink-muted hover:text-ink-carbon"
              >
                <X size={HEADER_CONFIG.ICON_SIZE_CLEAR} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="font-mono text-xs text-ink-muted hover:text-ink-carbon"
            >
              ESC
            </button>
          </div>

          {searchFetching && (
            <p className="mx-auto mt-2 max-w-2xl font-mono text-[11px] text-ink-muted">
              Querying GiST index...
            </p>
          )}

          {searchResults && searchResults.length > 0 && (
            <div className={`mx-auto mt-3 max-w-2xl divide-y divide-border-hairline rounded border border-border-hairline bg-substrate-dark ${HEADER_CONFIG.MAX_SEARCH_RESULTS_HEIGHT_PX} overflow-y-auto`}>
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 text-xs hover:bg-substrate-panel transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-ink-carbon">{item.word_a}</span>
                    {item.ipa_a && (
                      <span className="font-mono text-[10px] text-ink-muted">{item.ipa_a}</span>
                    )}
                    <span className="text-ink-faint">-&gt;</span>
                    <span className="font-serif text-specimen-moss">{item.word_b}</span>
                    <span className="rounded bg-border-hairline px-1 font-mono text-[9px] text-ink-muted uppercase">
                      {item.lang_b}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-ink-muted">
                      sem {(item.semantic_sim * 100).toFixed(0)}%
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase ${
                        item.category === 'cognate'
                          ? 'bg-specimen-moss/15 text-specimen-moss'
                          : item.category === 'false_friend'
                          ? 'bg-specimen-oxblood/15 text-specimen-oxblood'
                          : 'bg-specimen-ochre/15 text-specimen-ochre'
                      }`}
                    >
                      {item.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchResults && searchResults.length === 0 && searchQuery.trim().length >= QUERY_CONFIG.MIN_HEADWORD_SEARCH_CHARS && !searchFetching && (
            <p className="mx-auto mt-2 max-w-2xl font-serif text-xs italic text-ink-muted">
              No specimens found matching &ldquo;{searchQuery}&rdquo;.
            </p>
          )}
        </div>
      )}

      {/* Mobile Subnav */}
      <div className="flex md:hidden border-t border-border-hairline bg-substrate-dark px-2 py-1 overflow-x-auto">
        {navLinks.map((link) => {
          const isActive = currentPath === link.to || (link.to === '/orbit' && currentPath === '/');
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 px-2 font-serif text-xs whitespace-nowrap ${
                isActive ? 'text-specimen-moss font-bold' : 'text-ink-muted'
              }`}
            >
              <Icon size={HEADER_CONFIG.ICON_SIZE_TOOL} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
