import React, { useState } from 'react';
import {
  STRATIGRAPHY_LAYERS,
  GALLERY_LANGUAGES,
} from './galleryData';

type StratigraphyMode = 'cross-section' | 'volume-bars';

export const StratigraphyView: React.FC = () => {
  const [selectedStratumId, setSelectedStratumId] = useState<string>('stratum-bedrock');
  const [activeMode, setActiveMode] = useState<StratigraphyMode>('cross-section');
  const [hoveredLanguage, setHoveredLanguage] = useState<string | null>(null);

  const selectedStratum =
    STRATIGRAPHY_LAYERS.find((s) => s.id === selectedStratumId) ?? STRATIGRAPHY_LAYERS[0];

  // Colors for each layer from bedrock to surface
  const layerColors: Record<string, { bg: string; border: string; text: string; headerBg: string }> = {
    'stratum-bedrock': {
      bg: 'rgba(37, 93, 54, 0.16)',
      border: '#255D36',
      text: '#255D36',
      headerBg: '#EBF3ED',
    },
    'stratum-faults': {
      bg: 'rgba(143, 88, 27, 0.16)',
      border: '#8F581B',
      text: '#8F581B',
      headerBg: '#FBF3EB',
    },
    'stratum-hanseatic': {
      bg: 'rgba(45, 81, 107, 0.16)',
      border: '#2D516B',
      text: '#2D516B',
      headerBg: '#EBF1F6',
    },
    'stratum-drift': {
      bg: 'rgba(158, 42, 43, 0.16)',
      border: '#9E2A2B',
      text: '#9E2A2B',
      headerBg: '#F9ECEC',
    },
    'stratum-romance': {
      bg: 'rgba(87, 83, 78, 0.16)',
      border: '#57534E',
      text: '#1C1917',
      headerBg: '#F3EFEA',
    },
  };

  return (
    <div className="space-y-4">
      {/* Control Plate */}
      <div className="border border-book-rule bg-page-surface p-3 sm:p-4 rounded-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="typo-sublabel text-ink-muted">View:</span>
          <div className="inline-flex items-center border border-book-rule bg-page-muted/40 p-0.5 rounded-xs">
            <button
              type="button"
              onClick={() => setActiveMode('cross-section')}
              className={`px-2.5 py-1 rounded-xs typo-sublabel font-medium transition-all cursor-pointer ${
                activeMode === 'cross-section'
                  ? 'bg-page-surface border border-book-rule-strong text-ink-main shadow-2xs font-semibold'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
            >
              Timeline View
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('volume-bars')}
              className={`px-2.5 py-1 rounded-xs typo-sublabel font-medium transition-all cursor-pointer ${
                activeMode === 'volume-bars'
                  ? 'bg-page-surface border border-book-rule-strong text-ink-main shadow-2xs font-semibold'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
            >
              Percentage Breakdown
            </button>
          </div>
        </div>

        {/* Layer Selector Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="typo-sublabel text-ink-muted">Period:</span>
          {STRATIGRAPHY_LAYERS.map((layer) => {
            const isSelected = layer.id === selectedStratumId;
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => setSelectedStratumId(layer.id)}
                className={`px-2 py-0.5 rounded-xs typo-subscript font-medium transition-all cursor-pointer border ${
                  isSelected
                    ? 'border-ink-main bg-ink-main text-page-bg font-semibold shadow-2xs'
                    : 'border-book-rule bg-page-surface text-ink-muted hover:text-ink-main hover:bg-page-muted'
                }`}
              >
                {layer.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Stratigraphic Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Visual Columns */}
        <div className="lg:col-span-8 border border-book-rule bg-page-surface p-4 sm:p-6 rounded-xs space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-book-rule pb-2">
            <div>
              <span className="typo-overline text-ink-muted block">
                Vocabulary by Era
              </span>
              <p className="typo-gloss text-ink-main text-xs mt-0.5">
                How each language's vocabulary breaks down across time, from ancient roots to later borrowings.
              </p>
            </div>
            <span className="typo-subscript font-mono text-ink-muted text-2xs">
              500 BCE – 1900 CE
            </span>
          </div>

          {activeMode === 'cross-section' ? (
            /* Geological Cross-Section Visualizer */
            <div className="space-y-4 pt-2">
              {/* Language Columns Grid */}
              <div className="grid grid-cols-7 gap-2 sm:gap-3 text-center">
                {GALLERY_LANGUAGES.map((lang) => {
                  const isHovered = hoveredLanguage === lang.code;
                  return (
                    <div
                      key={lang.code}
                      onMouseEnter={() => setHoveredLanguage(lang.code)}
                      onMouseLeave={() => setHoveredLanguage(null)}
                      className="space-y-1.5 cursor-pointer"
                    >
                      <div
                        className={`p-1.5 border rounded-xs transition-colors ${
                          isHovered
                            ? 'border-ink-main bg-page-muted font-bold'
                            : 'border-book-rule bg-page-surface'
                        }`}
                      >
                        <span className="typo-lang-code font-bold block text-xs">
                          {lang.code.toUpperCase()}
                        </span>
                        <span className="typo-subscript text-2xs block truncate text-ink-muted">
                          {lang.name}
                        </span>
                      </div>

                      {/* Stratigraphic Vertical Column: 5 Layers stacked from surface (top) to bedrock (bottom) */}
                      <div className="h-[360px] border border-book-rule rounded-xs flex flex-col justify-end overflow-hidden shadow-inner bg-page-muted/20">
                        {/* Render layers in reverse: top layer 5 down to layer 1 */}
                        {[...STRATIGRAPHY_LAYERS].reverse().map((layer) => {
                          const isLayerSelected = layer.id === selectedStratumId;
                          const vol = layer.volumes[lang.code] || 0;
                          const heightPct = Math.max(8, vol); // Ensure min visible sliver
                          const colors = layerColors[layer.id];

                          return (
                            <div
                              key={layer.id}
                              onClick={() => setSelectedStratumId(layer.id)}
                              style={{ height: `${heightPct}%` }}
                              title={`${layer.name} in ${lang.name}: ${vol}% of vocabulary`}
                              className={`w-full transition-all border-b border-dashed border-book-rule-strong/50 flex flex-col items-center justify-center p-0.5 cursor-pointer relative group ${
                                isLayerSelected
                                  ? 'ring-2 ring-inset ring-ink-main font-bold'
                                  : 'hover:brightness-95 opacity-90'
                              }`}
                            >
                              <div
                                className="absolute inset-0"
                                style={{ backgroundColor: colors.bg }}
                              />
                              <span className="relative z-10 typo-metric text-2xs font-semibold text-ink-main">
                                {vol > 0 ? `${vol}%` : '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <span className="typo-subscript text-2xs text-ink-muted/80 block">
                        {lang.branch === 'North Germanic' ? 'North' : 'West'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Stratigraphic Layer Legend & Depth Indicator */}
              <div className="pt-3 border-t border-book-rule space-y-1.5">
                <span className="typo-overline text-ink-muted block">
                  Stratigraphic Succession (Bottom = Deepest / Ancient Bedrock)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {STRATIGRAPHY_LAYERS.map((layer) => {
                    const isSelected = layer.id === selectedStratumId;
                    const colors = layerColors[layer.id];
                    return (
                      <button
                        key={layer.id}
                        type="button"
                        onClick={() => setSelectedStratumId(layer.id)}
                        className={`text-left p-2 rounded-xs border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-ink-main bg-page-surface shadow-2xs'
                            : 'border-book-rule/70 bg-page-muted/20 hover:border-book-rule'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3 h-3 rounded-2xs border shrink-0"
                            style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                          />
                          <strong className="typo-sublabel text-xs truncate block text-ink-main">
                            L{layer.depthRank}: {layer.name.split(' ')[0]}
                          </strong>
                        </div>
                        <span className="typo-subscript text-2xs block text-ink-muted mt-1 truncate">
                          {layer.era}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Volume Percentage Breakdown Bars */
            <div className="space-y-4 pt-2">
              <div className="space-y-3">
                {GALLERY_LANGUAGES.map((lang) => (
                  <div key={lang.code} className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="typo-sublabel font-semibold text-ink-main">
                        {lang.name} ({lang.code.toUpperCase()})
                      </span>
                      <span className="typo-subscript text-ink-muted">
                        Bedrock Core: {lang.code === 'is' ? '68%' : lang.code === 'en' ? '26%' : '44%'}
                      </span>
                    </div>

                    {/* Stacked Horizon Bar */}
                    <div className="w-full h-6 rounded-xs overflow-hidden flex border border-book-rule">
                      {STRATIGRAPHY_LAYERS.map((layer) => {
                        const vol = layer.volumes[lang.code] || 0;
                        const colors = layerColors[layer.id];
                        if (vol <= 0) return null;
                        return (
                          <div
                            key={layer.id}
                            style={{
                              width: `${vol}%`,
                              backgroundColor: colors.bg,
                              borderColor: colors.border,
                            }}
                            onClick={() => setSelectedStratumId(layer.id)}
                            title={`${layer.name}: ${vol}%`}
                            className="h-full border-r border-book-rule-strong/40 flex items-center justify-center cursor-pointer transition-all hover:brightness-90 relative"
                          >
                            <span className="typo-metric text-2xs text-ink-main font-medium truncate px-0.5">
                              {vol >= 10 ? `${vol}%` : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Period Detailed Drawer */}
        <div className="lg:col-span-4 border border-book-rule bg-page-surface p-4 sm:p-5 rounded-xs space-y-4 shadow-xs">
          <div className="border-b border-book-rule pb-3">
            <div className="flex items-center justify-between">
              <span className="typo-overline text-ink-muted">
                Historical Period Details
              </span>
              <span className="typo-subscript font-mono text-ink-muted text-2xs">
                {selectedStratum.era}
              </span>
            </div>

            <h3 className="typo-section-header text-ink-main mt-1">
              {selectedStratum.name}
            </h3>
            <p className="typo-body text-xs text-ink-muted mt-1 leading-relaxed">
              {selectedStratum.description}
            </p>
            <div className="mt-2.5 p-2 bg-page-muted/40 border border-book-rule rounded-xs">
              <span className="typo-overline text-2xs text-ink-main block">Key Effect</span>
              <p className="typo-gloss text-2xs text-ink-muted mt-0.5 leading-normal">
                {selectedStratum.linguisticSignificance}
              </p>
            </div>
          </div>

          {/* Example Words */}
          <div className="space-y-2.5">
            <span className="typo-sublabel block font-semibold text-ink-main">
              Example Words
            </span>
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {selectedStratum.specimens.map((spec, idx) => (
                <div
                  key={idx}
                  className="border border-book-rule bg-page-muted/15 p-3 rounded-xs space-y-2"
                >
                  <div className="flex items-baseline justify-between border-b border-book-rule/40 pb-1">
                    <strong className="typo-headword-row text-xs text-ink-main font-semibold">
                      {spec.protoOrOrigin}
                    </strong>
                    <span className="typo-subscript text-2xs text-ink-muted">
                      Example {idx + 1}
                    </span>
                  </div>

                  {/* Daughter occurrences */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-2xs">
                    {Object.entries(spec.examples).map(([langKey, ex]) => (
                      <div key={langKey} className="flex items-baseline gap-1">
                        <span className="typo-lang-code font-bold text-ink-muted">
                          {langKey.toUpperCase()}:
                        </span>
                        <span className="typo-definition text-ink-main font-medium truncate">
                          {ex}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="typo-note text-2xs text-ink-muted leading-relaxed italic border-t border-book-rule/30 pt-1">
                    {spec.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
