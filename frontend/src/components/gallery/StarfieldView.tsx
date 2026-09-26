import React, { useState, useMemo } from 'react';
import { MaterialSymbol } from '../common/MaterialSymbol';
import {
  PROTO_ROOT_STARS,
  GALLERY_LANGUAGES,
  type ProtoRootStar,
} from './galleryData';
import { Phonetic } from '../common/Phonetic';
import { getLanguageName } from '../../data/languages';

type ProtoLanguageFilter = 'all' | 'proto-germanic' | 'proto-indo-european' | 'latin-italic' | 'proto-uralic';

interface ExternalDaughter {
  langName: string;
  word: string;
  ipa: string;
  gloss: string;
  note?: string;
}

interface ExtendedRootSpecimen extends ProtoRootStar {
  protoLanguage: string;
  family: 'Indo-European' | 'Uralic';
  externalDaughters?: Record<string, ExternalDaughter>;
}

const EXTERNAL_ROOT_BRANCHES: Record<string, Record<string, ExternalDaughter>> = {
  'root-bhrater': {
    la: { langName: 'Latin', word: 'frāter', ipa: '/ˈfraː.ter/', gloss: 'brother' },
    fr: { langName: 'French', word: 'frère', ipa: '/fʁɛʁ/', gloss: 'brother' },
    es: { langName: 'Spanish', word: 'hermano (repl.) / fraternal', ipa: '/eɾˈmano/', gloss: 'brother' },
    ru: { langName: 'Russian', word: 'брат (brat)', ipa: '/brat/', gloss: 'brother' },
  },
  'root-watan': {
    ru: { langName: 'Russian', word: 'вода (voda)', ipa: '/vɐˈda/', gloss: 'water' },
    la: { langName: 'Latin', word: 'aqua (counter-root)', ipa: '/ˈa.kʷa/', gloss: 'water' },
    fr: { langName: 'French', word: 'eau', ipa: '/o/', gloss: 'water' },
  },
};

// Extended roots demonstrating cross-family scalability (Indo-European, Romance, Uralic)
const EXTENDED_ROOT_SPECIMENS: ExtendedRootSpecimen[] = [
  ...PROTO_ROOT_STARS.map((star) => ({
    ...star,
    protoLanguage: star.id === 'root-bhrater' || star.id === 'root-watan' ? 'Proto-Indo-European' : 'Proto-Germanic',
    family: 'Indo-European' as const,
    externalDaughters: EXTERNAL_ROOT_BRANCHES[star.id],
  })),
  {
    id: 'root-uralic-water',
    root: '*wete',
    protoLanguage: 'Proto-Uralic',
    family: 'Uralic',
    reconstructedMeaning: 'water (Uralic core liquid)',
    constellation: 'Cosmos & Elements',
    celestial: { ra: 180, dec: 60, magnitude: 1.0 },
    daughters: {
      sv: { word: 'vatten (IE loan in Fin)', ipa: '/ˈvatːɛn/', gloss: 'water', status: 'archaic_loss' },
    },
    externalDaughters: {
      fi: { langName: 'Finnish', word: 'vesi / vettä', ipa: '/ˈʋesi/', gloss: 'water' },
      et: { langName: 'Estonian', word: 'vesi / vett', ipa: '/ˈvesi/', gloss: 'water' },
      hu: { langName: 'Hungarian', word: 'víz', ipa: '/viːz/', gloss: 'water' },
    },
    etymologicalNote:
      'Universal semantic concept "WATER" in Uralic. Demonstrates how non-Indo-European languages scale alongside Germanic using parallel proto-language roots.',
  },
  {
    id: 'root-italic-tempus',
    root: 'tempus (*tempos-)',
    protoLanguage: 'Latin / Proto-Italic',
    family: 'Indo-European',
    reconstructedMeaning: 'time, period, season (stretch of time)',
    constellation: 'Cosmos & Elements',
    celestial: { ra: 210, dec: 10, magnitude: 1.2 },
    daughters: {
      en: { word: 'tempo / tense', ipa: '/ˈtɛm.poʊ/', gloss: 'pace / grammatical time', status: 'shifted', shiftNote: 'Latin loanword via Norman French' },
      de: { word: 'Tempo', ipa: '/ˈtɛmpo/', gloss: 'speed', status: 'shifted' },
      sv: { word: 'tempo', ipa: '/ˈtɛmːpʊ/', gloss: 'tempo, pace', status: 'shifted' },
    },
    externalDaughters: {
      la: { langName: 'Latin', word: 'tempus', ipa: '/ˈtem.pus/', gloss: 'time' },
      fr: { langName: 'French', word: 'temps', ipa: '/tɑ̃/', gloss: 'time, weather' },
      es: { langName: 'Spanish', word: 'tiempo', ipa: '/ˈtjem.po/', gloss: 'time, weather' },
      it: { langName: 'Italian', word: 'tempo', ipa: '/ˈtɛm.po/', gloss: 'time' },
    },
    etymologicalNote:
      'Demonstrates Romance root expansion. Germanic languages borrowed this root specifically for tempo/pace, creating widespread cross-family false friends with French/Spanish.',
  },
];

export const StarfieldView: React.FC = () => {
  const [protoFilter, setProtoFilter] = useState<ProtoLanguageFilter>('all');
  const [activeConstellation, setActiveConstellation] = useState<string>('all');
  const [lensSource, setLensSource] = useState<string>('sv');
  const [lensTarget, setLensTarget] = useState<string>('en');
  const [selectedRootId, setSelectedRootId] = useState<string>('root-giftiz');

  // Filter roots by proto-language and semantic domain
  const filteredRoots = useMemo(() => {
    return EXTENDED_ROOT_SPECIMENS.filter((r) => {
      const matchProto =
        protoFilter === 'all'
          ? true
          : protoFilter === 'proto-germanic'
          ? r.protoLanguage === 'Proto-Germanic'
          : protoFilter === 'proto-indo-european'
          ? r.protoLanguage === 'Proto-Indo-European'
          : protoFilter === 'latin-italic'
          ? r.protoLanguage.includes('Latin') || r.protoLanguage.includes('Italic')
          : r.protoLanguage.includes('Uralic');

      const matchConstellation =
        activeConstellation === 'all' ? true : r.constellation === activeConstellation;

      return matchProto && matchConstellation;
    });
  }, [protoFilter, activeConstellation]);

  const selectedRoot = useMemo(() => {
    return filteredRoots.find((r) => r.id === selectedRootId) ?? filteredRoots[0] ?? EXTENDED_ROOT_SPECIMENS[0];
  }, [filteredRoots, selectedRootId]);

  // Determine relationship between selected lens languages for this root
  const getLensStatus = (root: ExtendedRootSpecimen) => {
    const src = root.daughters[lensSource];
    const tgt = root.daughters[lensTarget];

    if (!src || !tgt) {
      return { status: 'unattested', label: 'Unattested / Diverged', color: 'text-ink-muted bg-page-muted border-book-rule' };
    }
    if (src.status === 'shifted' || tgt.status === 'shifted' || (src.gloss && tgt.gloss && src.gloss !== tgt.gloss)) {
      return { status: 'shifted', label: 'Semantic Shift · False Friend', color: 'text-falsefriend-ink bg-falsefriend-bg border-falsefriend-border' };
    }
    if (src.status === 'cognate' && tgt.status === 'cognate') {
      return { status: 'cognate', label: 'True Cognate · Identical', color: 'text-cognate-ink bg-cognate-bg border-cognate-border' };
    }
    return { status: 'replaced', label: 'Lexical Replacement', color: 'text-ink-muted bg-page-muted border-book-rule' };
  };

  const currentLensInfo = selectedRoot ? getLensStatus(selectedRoot) : null;

  return (
    <div className="space-y-4 font-serif">
      {/* Scalability & Methodology Advisory Banner */}
      <div className="border border-book-rule bg-page-muted/30 p-3 sm:p-3.5 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <MaterialSymbol icon="account_tree" size={20} className="text-cognate-ink shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-ink-main">Hierarchical Ancestral Root Architecture</span>
              <span className="px-1.5 py-0.2 bg-page-surface border border-book-rule rounded-xs typo-subscript text-2xs text-cognate-ink font-medium">
                Multi-Family Scalable
              </span>
            </div>
            <p className="text-ink-muted leading-relaxed">
              Replaces the celestial sphere with structured genealogical trees. Indo-European branches unite under PIE roots; non-Indo-European languages (like Finnish) plug in via Proto-Uralic under universal semantic concepts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 bg-page-surface px-2.5 py-1 border border-book-rule rounded-xs text-2xs text-ink-muted font-mono">
          <span>PIE</span>
          <span>→</span>
          <span>Proto-Germanic</span>
          <span>→</span>
          <span>Modern Germanic</span>
        </div>
      </div>

      {/* Control Plate: Proto-Language Tier, Semantic Domain, and Comparative Lens */}
      <div className="border border-book-rule bg-page-surface p-3.5 sm:p-4 rounded-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Proto-Language Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="typo-sublabel text-ink-muted">Ancestor Level:</span>
            <div className="inline-flex items-center border border-book-rule bg-page-muted/40 p-0.5 rounded-xs flex-wrap">
              <button
                type="button"
                onClick={() => setProtoFilter('all')}
                className={`px-2 py-1 rounded-xs typo-sublabel transition-all cursor-pointer ${
                  protoFilter === 'all'
                    ? 'bg-page-surface border border-book-rule-strong text-ink-main font-semibold shadow-2xs'
                    : 'text-ink-muted hover:text-ink-main'
                }`}
              >
                All Ancestors
              </button>
              <button
                type="button"
                onClick={() => setProtoFilter('proto-indo-european')}
                className={`px-2 py-1 rounded-xs typo-sublabel transition-all cursor-pointer ${
                  protoFilter === 'proto-indo-european'
                    ? 'bg-page-surface border border-book-rule-strong text-ink-main font-semibold shadow-2xs'
                    : 'text-ink-muted hover:text-ink-main'
                }`}
                title="Macro roots uniting Germanic, Romance, and Slavic"
              >
                Proto-Indo-European (Macro)
              </button>
              <button
                type="button"
                onClick={() => setProtoFilter('proto-germanic')}
                className={`px-2 py-1 rounded-xs typo-sublabel transition-all cursor-pointer ${
                  protoFilter === 'proto-germanic'
                    ? 'bg-page-surface border border-book-rule-strong text-ink-main font-semibold shadow-2xs'
                    : 'text-ink-muted hover:text-ink-main'
                }`}
                title="Direct ancestor of English, German, Swedish, Dutch, etc."
              >
                Proto-Germanic
              </button>
              <button
                type="button"
                onClick={() => setProtoFilter('latin-italic')}
                className={`px-2 py-1 rounded-xs typo-sublabel transition-all cursor-pointer ${
                  protoFilter === 'latin-italic'
                    ? 'bg-page-surface border border-book-rule-strong text-ink-main font-semibold shadow-2xs'
                    : 'text-ink-muted hover:text-ink-main'
                }`}
                title="Romance family roots (French, Spanish, Latin)"
              >
                Latin / Italic
              </button>
              <button
                type="button"
                onClick={() => setProtoFilter('proto-uralic')}
                className={`px-2 py-1 rounded-xs typo-sublabel transition-all cursor-pointer ${
                  protoFilter === 'proto-uralic'
                    ? 'bg-page-surface border border-book-rule-strong text-ink-main font-semibold shadow-2xs'
                    : 'text-ink-muted hover:text-ink-main'
                }`}
                title="Non-Indo-European family roots (Finnish, Estonian, Hungarian)"
              >
                Proto-Uralic (Finnish)
              </button>
            </div>
          </div>

          {/* Comparative Lens Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="typo-sublabel text-ink-muted">Compare:</span>
            <select
              value={lensSource}
              onChange={(e) => setLensSource(e.target.value)}
              className="border border-book-rule bg-page-bg px-2 py-1 typo-sublabel text-ink-main rounded-xs focus:outline-none cursor-pointer"
            >
              {GALLERY_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
            <span className="text-ink-muted">↔</span>
            <select
              value={lensTarget}
              onChange={(e) => setLensTarget(e.target.value)}
              className="border border-book-rule bg-page-bg px-2 py-1 typo-sublabel text-ink-main rounded-xs focus:outline-none cursor-pointer"
            >
              {GALLERY_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Semantic Concept Filter */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-book-rule/60 text-xs">
          <span className="typo-sublabel text-ink-muted">Domain:</span>
          {(['all', 'Cosmos & Elements', 'Kinship & Person', 'Living World & Body', 'Vital Action'] as const).map(
            (domain) => {
              const isActive = activeConstellation === domain;
              return (
                <button
                  key={domain}
                  type="button"
                  onClick={() => setActiveConstellation(domain)}
                  className={`px-2 py-0.5 rounded-xs typo-subscript font-medium transition-all cursor-pointer border ${
                    isActive
                      ? 'border-ink-main bg-page-surface text-ink-main font-semibold shadow-2xs'
                      : 'border-book-rule/60 bg-page-bg text-ink-muted hover:text-ink-main hover:bg-page-muted'
                  }`}
                >
                  {domain === 'all' ? 'All Domains' : domain}
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* Main Two-Column Root Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Root Cards List */}
        <div className="lg:col-span-5 border border-book-rule bg-page-surface p-3.5 sm:p-4 rounded-xs space-y-2.5 max-h-[640px] overflow-y-auto">
          <div className="flex items-center justify-between pb-1.5 border-b border-book-rule">
            <span className="typo-overline text-ink-main">
              Attested Roots ({filteredRoots.length})
            </span>
            <span className="typo-subscript text-ink-muted">
              Select to inspect descendants
            </span>
          </div>

          <div className="space-y-2">
            {filteredRoots.map((root) => {
              const isSelected = root.id === selectedRoot?.id;
              const lens = getLensStatus(root);

              return (
                <button
                  key={root.id}
                  type="button"
                  onClick={() => setSelectedRootId(root.id)}
                  className={`w-full text-left p-3 rounded-xs border transition-all cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'border-ink-main bg-page-muted/80 shadow-xs'
                      : 'border-book-rule/70 bg-page-bg hover:border-book-rule-strong hover:bg-page-muted/30'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="typo-headword-row font-deck text-ink-main text-base font-bold italic">
                      {root.root}
                    </span>
                    <span className="typo-subscript px-1.5 py-0.2 rounded-xs border border-book-rule bg-page-surface text-ink-muted">
                      {root.protoLanguage}
                    </span>
                  </div>

                  <p className="typo-gloss text-xs text-ink-muted line-clamp-1">
                    &ldquo;{root.reconstructedMeaning}&rdquo;
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-book-rule/40 text-2xs">
                    <span className="text-ink-muted font-sans">{root.constellation}</span>
                    <span className={`px-1.5 py-0.2 rounded-xs border font-medium ${lens.color}`}>
                      {lens.status === 'cognate' ? 'True Cognate' : lens.status === 'shifted' ? 'False Friend' : 'Replaced'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Genealogical Tree & Daughter Words */}
        <div className="lg:col-span-7 border border-book-rule bg-page-surface p-5 rounded-xs space-y-5">
          {selectedRoot ? (
            <div className="space-y-5">
              {/* Root Plate Header */}
              <div className="border-b border-book-rule pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="typo-overline text-cognate-ink">
                    Reconstructed Ancestral Form
                  </span>
                  <span className="px-2 py-0.5 rounded-xs bg-page-muted border border-book-rule text-ink-muted typo-subscript font-mono">
                    {selectedRoot.protoLanguage}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 flex-wrap">
                  <h3 className="typo-headword-display text-ink-main text-2xl sm:text-3xl font-bold italic">
                    {selectedRoot.root}
                  </h3>
                </div>

                <p className="typo-gloss text-ink-muted text-sm">
                  Reconstructed meaning: &ldquo;{selectedRoot.reconstructedMeaning}&rdquo;
                </p>

                {/* Comparative lens banner for this root */}
                {currentLensInfo && (
                  <div className={`mt-2 p-2.5 rounded-xs border flex items-center justify-between text-xs ${currentLensInfo.color}`}>
                    <span className="font-semibold">
                      {getLanguageName(lensSource)} ↔ {getLanguageName(lensTarget)} relation:
                    </span>
                    <span>{currentLensInfo.label}</span>
                  </div>
                )}
              </div>

              {/* Daughter Words Grid (Germanic Core) */}
              <div className="space-y-2.5">
                <span className="typo-overline text-ink-main block">
                  Catalogued Modern Descendants
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(selectedRoot.daughters).map(([code, daughter]) => {
                    const isSrc = code === lensSource;
                    const isTgt = code === lensTarget;
                    const isShifted = daughter.status === 'shifted';

                    return (
                      <div
                        key={code}
                        className={`p-3 rounded-xs border transition-colors space-y-1 ${
                          isSrc || isTgt
                            ? 'border-ink-main bg-page-muted/40 shadow-2xs'
                            : 'border-book-rule bg-page-bg'
                        }`}
                      >
                        <div className="flex items-baseline justify-between">
                          <span className="typo-sublabel text-xs font-semibold text-ink-muted">
                            {getLanguageName(code)}
                          </span>
                          <span className="typo-lang-code text-2xs uppercase">
                            {code}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2 pt-0.5">
                          <strong className={`typo-headword-row text-base ${isShifted ? 'text-falsefriend-ink' : 'text-ink-main'}`}>
                            {daughter.word}
                          </strong>
                          {daughter.ipa && <Phonetic ipa={daughter.ipa} className="text-xs text-ink-muted" />}
                        </div>

                        <p className="typo-gloss text-xs text-ink-muted">
                          &ldquo;{daughter.gloss}&rdquo;
                        </p>

                        {daughter.shiftNote && (
                          <p className="typo-note text-2xs text-falsefriend-ink pt-0.5">
                            {daughter.shiftNote}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cross-Family Branches (Demonstrating Scalability to Romance / Slavic / Uralic) */}
              {selectedRoot.externalDaughters && (
                <div className="space-y-2.5 pt-3 border-t border-book-rule">
                  <div className="flex items-center justify-between">
                    <span className="typo-overline text-ink-main block">
                      Cross-Family Cognates & Equivalent Roots
                    </span>
                    <span className="typo-subscript text-2xs text-ink-muted">
                      Shows multi-family scalability
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {Object.entries(selectedRoot.externalDaughters).map(([code, ext]) => (
                      <div key={code} className="p-3 rounded-xs border border-dashed border-book-rule bg-page-muted/20 space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="typo-sublabel text-xs font-semibold text-ink-muted">
                            {ext.langName}
                          </span>
                          <span className="typo-lang-code text-2xs uppercase">
                            {code}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 pt-0.5">
                          <strong className="typo-headword-row text-base text-ink-main">
                            {ext.word}
                          </strong>
                          {ext.ipa && <Phonetic ipa={ext.ipa} className="text-xs text-ink-muted" />}
                        </div>
                        <p className="typo-gloss text-xs text-ink-muted">
                          &ldquo;{ext.gloss}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Etymology & Historical Drift Note */}
              <div className="p-3.5 bg-page-muted/40 border border-book-rule rounded-xs space-y-1">
                <span className="typo-overline text-2xs text-ink-muted block">
                  Etymological Note
                </span>
                <p className="typo-body text-xs text-ink-main leading-relaxed">
                  {selectedRoot.etymologicalNote}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-ink-muted space-y-2">
              <MaterialSymbol icon="search" size={32} className="text-ink-muted/50" />
              <p className="typo-body text-sm font-medium">No root matches current filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
