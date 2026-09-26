import React, { useState } from 'react';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { ConstellationView } from './ConstellationView';
import { StarfieldView } from './StarfieldView';
import { StratigraphyView } from './StratigraphyView';
import { WaveTopographyView } from './WaveTopographyView';
import { FrictionMatrixView } from './FrictionMatrixView';
import { LegacyOrbitView } from './LegacyOrbitView';

export type GalleryPrototypeId =
  | 'constellation'
  | 'starfield'
  | 'stratigraphy'
  | 'wave'
  | 'matrix'
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
    label: '1. Language Map',
    badge: '2D / 3D Network',
    icon: 'hub',
    conceptHeading: 'Relative Language Distances',
    conceptDeck:
      'Places all 7 languages together in 2D or 3D space. Languages with similar pronunciation, spelling, or vocabulary sit closer together, and circle size shows catalogued vocabulary volume.',
    whatItShows:
      'Mutual distances between all 7 languages, vocabulary count, shared cognates, and false friend pairs.',
  },
  {
    id: 'starfield',
    label: '2. Proto-Germanic Roots',
    badge: '2D / 3D Roots',
    icon: 'flare',
    conceptHeading: 'Ancestral Roots & Surviving Words',
    conceptDeck:
      'Maps Proto-Germanic root words grouped by topic (nature, body, society, motion). Pick any language to see which roots survived intact, shifted in meaning, or were replaced by other words.',
    whatItShows:
      'Proto-Germanic roots, semantic groups, modern forms across all 7 languages, and cognate vs false friend status.',
  },
  {
    id: 'stratigraphy',
    label: '3. Historical Layers',
    badge: 'Chronology',
    icon: 'layers',
    conceptHeading: 'Vocabulary by Historical Era',
    conceptDeck:
      'Shows where words in each language come from across time: ancient Germanic roots (500 BCE), sound shift divergence, Low German trade borrowings, and later Latin/French loanwords.',
    whatItShows:
      'Vocabulary composition from 500 BCE to 1900 CE, unbroken roots vs borrowings, and percentage share per language.',
  },
  {
    id: 'wave',
    label: '4. Sound Shift Waves',
    badge: 'Regional Shifts',
    icon: 'waves',
    conceptHeading: 'How Sound Shifts Spread',
    conceptDeck:
      'Shows historical sound shifts spreading across regions like ripples. Languages inside the circle adopted the shift, while languages outside kept older sounds.',
    whatItShows:
      'Historical spread of sound changes, timeline from 400 to 1600 CE, and affected vs unaffected languages.',
  },
  {
    id: 'matrix',
    label: '5. Pair Comparison Matrix',
    badge: 'Table & Chords',
    icon: 'grid_view',
    conceptHeading: 'Language Pair Comparison',
    conceptDeck:
      'A direct side-by-side comparison of all 7 languages. Compare pronunciation, spelling, the gap between spelling and speech (e.g. Danish vs Swedish), and false friend rates.',
    whatItShows:
      '7×7 pair comparisons, sound vs spelling gap, false friend percentages, and shared word counts.',
  },
  {
    id: 'legacy',
    label: '6. Original Orbit (Baseline)',
    badge: 'Original Orbit',
    icon: 'history',
    conceptHeading: 'Original Orbit Page',
    conceptDeck:
      'The original design where other languages orbit a single selected center on concentric circles. Kept here for direct side-by-side comparison.',
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
        {activeTab === 'legacy' && <LegacyOrbitView />}
      </div>
    </div>
  );
};
