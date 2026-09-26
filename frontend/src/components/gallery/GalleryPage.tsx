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
  linguisticMetaphor: string;
  dataDimensions: string;
}

const PROTOTYPES: PrototypeTab[] = [
  {
    id: 'constellation',
    label: '1. Dialect Constellation',
    badge: '2D / 3D Network',
    icon: 'hub',
    conceptHeading: 'The Dialect Constellation (2D/3D Proximity Mesh)',
    conceptDeck:
      'Solves the 1-to-N reductionism by placing all languages simultaneously into an intrinsic 2D or 3D linguistic space based on their mutual phonetic and orthographic distance matrix.',
    linguisticMetaphor:
      'Nautical & astronomical triangulation plate (naturalist cartography).',
    dataDimensions:
      'Symmetric N×N phonetic/orthographic distance matrix, catalogued vocabulary volume, cognate bridge strength, false friend tension faults.',
  },
  {
    id: 'starfield',
    label: '2. Proto-Root Starfield',
    badge: '2D / 3D Celestial',
    icon: 'flare',
    conceptHeading: 'The Proto-Root Celestial Field & Spectral Lens',
    conceptDeck:
      'Fulfills the original sky-chart aspiration by turning ancestral Proto-Germanic roots into celestial stars grouped by semantic constellations, using languages as comparative spectral filters.',
    linguisticMetaphor:
      '19th-century astronomical star chart with spectral refraction filters.',
    dataDimensions:
      'Proto-Germanic roots, semantic constellations, daughter words across all 7 living branches, conserved vs shifted spectral statuses.',
  },
  {
    id: 'stratigraphy',
    label: '3. Lexical Stratigraphy',
    badge: 'Geological Strata',
    icon: 'layers',
    conceptHeading: 'Lexical Stratigraphy (Geological Cross-Section)',
    conceptDeck:
      'Models language history as geological strata: unbroken archaic Proto-Germanic bedrock (500 BCE) at the base, sheared by phonological sound-shift faults, layered with Hanseatic trade silt, and capped by modern Latinate/Romance overburden.',
    linguisticMetaphor:
      'Charles Lyell geological cross-section and stratum shear analysis.',
    dataDimensions:
      'Historical chronological depth (500 BCE to 1900 CE), percentage volume share per language, unbroken vs sheared stratum fault lines.',
  },
  {
    id: 'wave',
    label: '4. Wave Topography',
    badge: 'Wellentheorie',
    icon: 'waves',
    conceptHeading: 'Johannes Schmidt Wellentheorie (Wave Model, 1872)',
    conceptDeck:
      'Replaces the rigid family tree with propagating sound-shift and morphological waves. Explains dialect continua by observing which languages are caught inside overlapping isogloss ripple envelopes.',
    linguisticMetaphor:
      'Topographical contour elevation map & wave interference rings.',
    dataDimensions:
      'Historical innovation epicenters, propagation reach, phonological sound-shift rules, participating vs unshifted languages.',
  },
  {
    id: 'matrix',
    label: '5. Friction Matrix',
    badge: 'Heat Grid & Chords',
    icon: 'grid_view',
    conceptHeading: 'Cross-Linguistic Intelligibility & Friction Matrix',
    conceptDeck:
      'A full symmetric 7×7 bilateral tensor matrix exposing cross-language friction: acoustic vs written divergence gaps (the Danish Rift), false friend hazard densities, and circular chord tension flows.',
    linguisticMetaphor:
      'William Playfair high-density engraved statistical plate & circular chord ribbons.',
    dataDimensions:
      'Full 7×7 symmetric pairwise tensor, divergence gap (|orthography - phonetics|), cognitive trap hazard ratios, shared vocabulary volume.',
  },
  {
    id: 'legacy',
    label: '6. Legacy Orbit (Baseline)',
    badge: 'Original Orbit',
    icon: 'history',
    conceptHeading: 'Legacy Language Orbit (Comparative Baseline)',
    conceptDeck:
      'The original prototype: languages orbit on concentric circular tracks around a single anchor. Provided here for direct visual and functional side-by-side comparison with the new relational models.',
    linguisticMetaphor:
      'Ego-centric Keplerian planetary solar system.',
    dataDimensions:
      '1-to-N radial distance from single anchor, arbitrary continuous angular velocity.',
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
            Comparative Linguistic Architecture Lab
          </span>
          <span className="px-1.5 py-0.2 bg-page-muted border border-book-rule rounded-xs typo-subscript text-2xs text-ink-muted">
            Experimental Studio
          </span>
        </div>
        <h1 className="typo-page-title tracking-tight">
          Visualization Lab & Paradigm Gallery
        </h1>
        <p className="typo-page-deck text-ink-muted max-w-3xl leading-relaxed">
          Exploring multi-dimensional alternatives to the legacy radial orbit model. Every prototype below incorporates genuine volume, mutual N×N language kinship, etymological bedrock, or historical sound-shift propagation.
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
      <div className="border border-book-rule bg-page-muted/20 p-4 sm:p-5 rounded-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-book-rule/60 pb-2">
          <h2 className="typo-section-header text-ink-main">
            {currentTab.conceptHeading}
          </h2>
          <span className="typo-subscript text-2xs font-mono text-ink-muted">
            {currentTab.linguisticMetaphor}
          </span>
        </div>

        <p className="typo-body text-xs text-ink-muted leading-relaxed max-w-4xl">
          {currentTab.conceptDeck}
        </p>

        <div className="flex items-center gap-2 text-2xs text-ink-muted pt-1">
          <strong className="text-ink-main font-semibold">Dimensions Captured:</strong>
          <span>{currentTab.dataDimensions}</span>
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
