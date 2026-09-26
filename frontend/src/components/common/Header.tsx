import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useRouterState } from '@tanstack/react-router';
import { useHeadwordSearchQuery } from '../../services/queries';
import { MaterialSymbol } from './MaterialSymbol';
import { HEADER_CONFIG, QUERY_CONFIG } from '../../constants/config';
import { Phonetic } from './Phonetic';
import { getLanguageName } from '../../data/languages';
import logoUrl from '../../assets/logo.png';

export const Header: React.FC = () => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults, isFetching: searchFetching } = useHeadwordSearchQuery(
    searchQuery,
    'all',
  );

  useEffect(() => {
    setMobileNavOpen(false);
  }, [currentPath]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };
    if (mobileNavOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  const navLinks = [
    { to: '/orbit', label: 'Language Orbit', icon: 'hub' },
    { to: '/languages', label: 'Language Overview', icon: 'public' },
    { to: '/lexicon', label: 'Comparative Lexicon', icon: 'menu_book' },
    { to: '/quiz', label: 'False Friends Quiz', icon: 'quiz' },
    { to: '/inspector', label: 'Text Inspector', icon: 'text_snippet' },
    { to: '/gallery', label: 'Concepts', icon: 'science' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-book-rule bg-page-bg/95 backdrop-blur-xs w-full">
      <div className="w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        {/* Application title & mobile burger toggle */}
        <div className="flex-none flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            className="lg:hidden flex items-center justify-center p-1.5 -ml-1 rounded text-ink-muted hover:text-ink-main hover:bg-page-muted transition-colors cursor-pointer"
            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileNavOpen}
          >
            <MaterialSymbol icon="menu" size={24} />
          </button>

          <Link to="/orbit" className="text-decoration-none flex items-center gap-2.5 group">
            <img
              src={logoUrl}
              alt="Linduistics Logo"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover group-hover:opacity-80 transition-opacity"
            />
            <h1 className="typo-page-title tracking-tight text-ink-main group-hover:opacity-80 transition-opacity">
              Linduistics
            </h1>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="hidden lg:flex items-center flex-wrap justify-center gap-8 flex-1 px-4">
          {navLinks.map((link) => {
            const isActive =
              currentPath === link.to ||
              (link.to === '/orbit' && currentPath === '/');

            return (
              <Link
                key={link.to}
                to={link.to}
                className={`typo-nav whitespace-nowrap transition-colors ${isActive
                  ? 'text-ink-main underline decoration-2 underline-offset-8 decoration-cognate-ink'
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
            className="flex items-center gap-2 rounded border border-book-rule bg-page-surface px-2.5 sm:px-3 py-1.5 typo-nav text-ink-muted hover:border-book-rule-strong hover:text-ink-main transition-colors shadow-2xs cursor-pointer"
            title="Search dictionary"
          >
            <MaterialSymbol icon="search" size={18} />
            <span className="hidden sm:inline">Search dictionary</span>
          </button>
        </div>
      </div>

      {/* Search drawer */}
      {searchOpen && (
        <div className="border-t border-book-rule bg-page-surface px-6 py-4 shadow-sm">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <MaterialSymbol icon="search" size={20} className="text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across Germanic vocabulary (e.g. hound, dog, kvinna, gift, meer)..."
              autoFocus
              className="flex-1 bg-transparent typo-body text-ink-main placeholder-ink-light focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-ink-muted hover:text-ink-main"
              >
                <MaterialSymbol icon="close" size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="typo-close text-ink-muted hover:text-ink-main cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>

          {searchFetching && (
            <p className="mx-auto mt-2 max-w-2xl typo-gloss">
              Searching dictionary...
            </p>
          )}

          {searchResults && searchResults.length > 0 && (
            <div className={`mx-auto mt-4 max-w-2xl divide-y divide-book-rule rounded border border-book-rule bg-page-surface ${HEADER_CONFIG.MAX_SEARCH_RESULTS_HEIGHT_PX} overflow-y-auto`}>
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 typo-sublabel hover:bg-page-muted transition-colors gap-3"
                >
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span
                      className="font-mono text-xs uppercase px-1.5 py-0.5 rounded border border-book-rule bg-page-muted text-ink-muted cursor-help shrink-0"
                      title={getLanguageName(item.lang_a)}
                    >
                      {item.lang_a.toUpperCase()}
                    </span>
                    <span className="typo-headword-row text-ink-main">{item.word_a}</span>
                    {item.ipa_a && <Phonetic ipa={item.ipa_a} />}
                    <MaterialSymbol icon="arrow_forward" size={14} className="text-ink-light" />
                    <span
                      className="font-mono text-xs uppercase px-1.5 py-0.5 rounded border border-book-rule bg-page-muted text-ink-muted cursor-help shrink-0"
                      title={getLanguageName(item.lang_b)}
                    >
                      {item.lang_b.toUpperCase()}
                    </span>
                    <span className="typo-headword-row text-cognate-ink">{item.word_b}</span>
                    {item.ipa_b && <Phonetic ipa={item.ipa_b} />}
                  </div>
                  <div className="typo-badge text-ink-muted shrink-0">
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
            <p className="mx-auto mt-3 max-w-2xl typo-gloss">
              No words found matching &ldquo;{searchQuery}&rdquo;.
            </p>
          )}
        </div>
      )}

      {/* Mobile drawer rendered into document.body to escape header backdrop-filter containing block */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 lg:hidden ${mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
            aria-hidden={!mobileNavOpen}
          >
            {/* Backdrop */}
            <div
              className={`fixed inset-0 bg-ink-main/40 backdrop-blur-xs transition-opacity duration-300 ${mobileNavOpen ? 'opacity-100' : 'opacity-0'
                }`}
              onClick={() => setMobileNavOpen(false)}
            />

            {/* Panel */}
            <aside
              className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] h-full h-dvh bg-page-surface border-r border-book-rule shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
              role="dialog"
              aria-modal={mobileNavOpen}
              aria-label="Mobile navigation"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-book-rule bg-page-bg shrink-0">
                <Link
                  to="/orbit"
                  onClick={() => setMobileNavOpen(false)}
                  className="text-decoration-none flex items-center gap-2.5 group"
                >
                  <img
                    src={logoUrl}
                    alt="Linduistics Logo"
                    className="w-10 h-10 rounded-full object-cover group-hover:opacity-80 transition-opacity"
                  />
                  <span className="typo-page-title tracking-tight text-ink-main group-hover:opacity-80 transition-opacity">
                    Linduistics
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1 rounded text-ink-muted hover:text-ink-main hover:bg-page-muted transition-colors cursor-pointer"
                  aria-label="Close navigation menu"
                >
                  <MaterialSymbol icon="close" size={20} />
                </button>
              </div>

              {/* Drawer navigation links */}
              <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {navLinks.map((link) => {
                  const isActive =
                    currentPath === link.to ||
                    (link.to === '/orbit' && currentPath === '/');

                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileNavOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded transition-colors typo-nav ${isActive
                        ? 'bg-page-muted text-ink-main font-semibold border-l-2 border-cognate-ink pl-2.5'
                        : 'text-ink-muted hover:text-ink-main hover:bg-page-muted/60'
                        }`}
                    >
                      <MaterialSymbol
                        icon={link.icon}
                        size={20}
                        className={isActive ? 'text-cognate-ink' : 'text-ink-light'}
                      />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Drawer footer */}
              <div className="p-4 border-t border-book-rule bg-page-bg/50 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    setSearchOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded border border-book-rule bg-page-surface px-3 py-2 typo-nav text-ink-muted hover:border-book-rule-strong hover:text-ink-main transition-colors shadow-2xs cursor-pointer"
                >
                  <MaterialSymbol icon="search" size={18} />
                  <span>Search dictionary</span>
                </button>
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </header>
  );
};

