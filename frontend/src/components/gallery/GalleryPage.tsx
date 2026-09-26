import React, { useState } from 'react';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { ConstellationView } from './ConstellationView';
import { StarfieldView } from './StarfieldView';
import { StratigraphyView } from './StratigraphyView';
import { WaveTopographyView } from './WaveTopographyView';
import { FrictionMatrixView } from './FrictionMatrixView';
import { LegacyOrbitView } from './LegacyOrbitView';
import { TopologyOverlapView } from './TopologyOverlapView';

export type GalleryPrototypeId =
  | 'constellation'
  | 'starfield'
  | 'stratigraphy'
  | 'wave'
  | 'matrix'
  | 'topology'
  | 'legacy';

interface PrototypeTab {
  id: GalleryPrototypeId;
  label: string;
  badge: string;
  icon: string;
  conceptHeading: string;
  conceptDeck: string;
  whatItShows: string;
}

const PROTOTYPES: PrototypeTab[] = [
  {
    id: 'constellation',
    label: '1. Relative Distance Map',
    badge: '2D (MDS) / 3D',
    icon: 'hub',
    conceptHeading: 'Pairwise Language Distances (MDS)',
    conceptDeck:
      'Projects live mutual distances between all languages onto mathematically justified axes using Classical Multidimensional Scaling (MDS). Axis 1 separates North vs West Germanic; Axis 2 separates Insular vs Continental languages. Languages with closer phonetic, orthographic, and lexical alignment cluster together with concentric distance rings.',
    whatItShows:
      'Mathematically justified relative distances (MDS), scale rings, vocabulary count, shared cognates, and false friends.',
  },
  {
    id: 'starfield',
    label: '2. Ancestral Root Explorer',
    badge: 'Multi-Family Roots',
    icon: 'account_tree',
    conceptHeading: 'Ancestral Roots & Cognate Trees',
    conceptDeck:
      'Replaces the single-family celestial globe with a multi-family ancestral root explorer (Proto-Indo-European, Proto-Germanic, Latin/Italic, Proto-Uralic). Scales across language families without breaking (e.g. Finnish to Proto-Uralic *wete, Spanish/French to Latin tempus, Germanic to Proto-Germanic roots).',
    whatItShows:
      'Proto-language roots by family, surviving modern words, semantic shifts, false friends, and cross-family cognates.',
  },
  {
    id: 'stratigraphy',
    label: '3. Historical Layers',
    badge: 'Etymological Strata',
    icon: 'layers',
    conceptHeading: 'Vocabulary by Historical Era',
    conceptDeck:
      'Visualizes modern vocabulary as chronological strata (ancient roots, medieval trade borrowings, Renaissance Latin/Greek, modern international loans). Functions as language-level etymological benchmarks across any language family.',
    whatItShows:
      'Vocabulary composition by era (500 BCE to 1900 CE), native inheritance vs borrowed layers, and percentage share.',
  },
  {
    id: 'wave',
    label: '4. Sound Shift Waves',
    badge: 'Timeline Waves',
    icon: 'waves',
    conceptHeading: 'Historical Sound Shift Timeline',
    conceptDeck:
      'Animates how sound shifts spread across language areas over time (400–1600 CE). Features an interactive timeline scrubber and play/pause controls, zoom and pan navigation without edge clipping, and an advisory on dialect data availability.',
    whatItShows:
      'Timeline of major sound shifts, geographical spread, affected vs preserved forms, and interactive era playback.',
  },
  {
    id: 'matrix',
    label: '5. Pair Comparison Matrix',
    badge: '100% Live Data',
    icon: 'grid_view',
    conceptHeading: 'Direct Pairwise Comparison',
    conceptDeck:
      'Direct side-by-side comparison of every language pair. Completely resolves the single-anchor limitation of Orbit view with 100% live database support and zero extra backend endpoints required.',
    whatItShows:
      '7×7 mutual distance matrix, spelling vs sound gap, false friend percentages, and direct pair drilldown.',
  },
  {
    id: 'topology',
    label: '6. Lexical Overlap Topology',
    badge: 'Radial / Euler / UpSet',
    icon: 'pie_chart',
    conceptHeading: 'Multi-Language Lexical Overlap Topology',
    conceptDeck:
      'Visualizes vocabulary overlap beyond 1:1 pairs. Features Segmented Radial Hub, Proportional Euler, UpSet Matrix, and Chord Flow models scaled by dictionary volume. Analyzes multi-language cores (X ∩ Y ∩ Z), exclusive shared pools, and category composition (cognates vs false friends).',
    whatItShows:
      'Triple-language core overlap, exclusive shared sets, dictionary volume scaling, category distribution, and live specimen inspection.',
  },
  {
    id: 'legacy',
    label: '7. Original Orbit (Baseline)',
    badge: 'Baseline',
    icon: 'history',
    conceptHeading: 'Original Orbit Page',
    conceptDeck:
      'The original single-language orbital view, kept here for baseline comparison.',
    whatItShows:
      'Distance from one selected language, fixed orbital rings.',
  },
];

export const GalleryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<GalleryPrototypeId>('constellation');

  const currentTab = PROTOTYPES.find((p) => p.id === activeTab) ?? PROTOTYPES[0];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-5 font-serif max-w-7xl mx-auto space-y-6">
      {/* Page Title & Mission Statement */}
      <div className="border-b border-book-rule pb-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="typo-overline text-cognate-ink">
            Exploration
          </span>
          <span className="px-1.5 py-0.2 bg-page-muted border border-book-rule rounded-xs typo-subscript text-2xs text-ink-muted">
            Prototypes
          </span>
        </div>
        <h1 className="typo-page-title tracking-tight">
          Visualization Concepts
        </h1>
        <p className="typo-page-deck text-ink-muted max-w-3xl leading-relaxed">
          Prototypes exploring alternatives to the circular orbit view. Instead of orbiting around a single language, these concepts show mutual distances, shared roots, historical layers, and sound shifts.
        </p>
      </div>

      {/* Prototype Selection Segmented Nav Tabs */}
      <div className="border border-book-rule bg-page-surface p-1.5 rounded-xs flex items-center gap-1.5 overflow-x-auto shadow-2xs scrollbar-none">
        {PROTOTYPES.map((proto) => {
          const isActive = proto.id === activeTab;
          return (
            <button
              key={proto.id}
              type="button"
              onClick={() => setActiveTab(proto.id)}
              className={`px-3 py-2 rounded-xs typo-sublabel font-medium transition-all cursor-pointer shrink-0 text-left flex items-center gap-2 border ${
                isActive
                  ? 'border-ink-main bg-page-surface text-ink-main shadow-xs font-semibold'
                  : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/50'
              }`}
            >
              <MaterialSymbol
                icon={proto.icon}
                size={18}
                className={isActive ? 'text-cognate-ink' : 'text-ink-muted'}
              />
              <div>
                <span className="block text-xs font-medium leading-tight">
                  {proto.label}
                </span>
                <span className="typo-subscript text-2xs text-ink-muted/80 block leading-tight">
                  {proto.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Concept Dossier Card */}
      <div className="border border-book-rule bg-page-muted/20 p-4 sm:p-5 rounded-xs space-y-2.5">
        <h2 className="typo-section-header text-ink-main">
          {currentTab.conceptHeading}
        </h2>

        <p className="typo-body text-xs text-ink-muted leading-relaxed max-w-4xl">
          {currentTab.conceptDeck}
        </p>

        <div className="flex items-center gap-2 text-2xs text-ink-muted pt-0.5">
          <strong className="text-ink-main font-semibold">Shows:</strong>
          <span>{currentTab.whatItShows}</span>
        </div>
      </div>

      {/* Interactive Active Prototype Stage */}
      <div className="pt-2">
        {activeTab === 'constellation' && <ConstellationView />}
        {activeTab === 'starfield' && <StarfieldView />}
        {activeTab === 'stratigraphy' && <StratigraphyView />}
        {activeTab === 'wave' && <WaveTopographyView />}
        {activeTab === 'matrix' && <FrictionMatrixView />}
        {activeTab === 'topology' && <TopologyOverlapView />}
        {activeTab === 'legacy' && <LegacyOrbitView />}
      </div>
    </div>
  );
};
