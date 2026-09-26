import React, { useState, useMemo } from 'react';
import {
  GALLERY_LANGUAGES,
  PAIRWISE_FRICTION_MATRIX,
  PROTO_ROOT_STARS,
  type LanguageMeta,
  type PairwiseCell,
} from './galleryData';
import { MaterialSymbol } from '../common/MaterialSymbol';

export type TopologyChartMode = 'sunburst_rose' | 'chord_matrix' | 'euler_crucible';

export const TopologyOverlapView: React.FC = () => {
  const [chartMode, setChartMode] = useState<TopologyChartMode>('sunburst_rose');
  const [focalLang, setFocalLang] = useState<string>('sv'); // Default Swedish
  const [selectedCrucibleLangs, setSelectedCrucibleLangs] = useState<string[]>(['sv', 'de', 'en']);
  const [selectedLanguageHover, setSelectedLanguageHover] = useState<string | null>(null);
  const [selectedChordPair, setSelectedChordPair] = useState<{ src: string; tgt: string } | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<{
    type: 'core' | 'branch' | 'petal' | 'crucible_core' | 'crucible_pair';
    targetLang?: string;
    branch?: string;
    label: string;
  }>({
    type: 'core',
    label: 'Universal Pan-Germanic Core',
  });

  const focalMeta = useMemo(
    () => GALLERY_LANGUAGES.find((l) => l.code === focalLang) ?? GALLERY_LANGUAGES[0],
    [focalLang],
  );

  // Comparison languages (all except focal)
  const comparisonLanguages = useMemo(
    () => GALLERY_LANGUAGES.filter((l) => l.code !== focalLang),
    [focalLang],
  );

  // Pairwise map for quick lookup
  const pairMap = useMemo(() => {
    const map = new Map<string, PairwiseCell>();
    PAIRWISE_FRICTION_MATRIX.forEach((c) => {
      map.set(`${c.source}-${c.target}`, c);
      map.set(`${c.target}-${c.source}`, { ...c, source: c.target, target: c.source });
    });
    return map;
  }, []);

  // Filter specimen roots based on selected segment
  const activeSpecimens = useMemo(() => {
    if (selectedSegment.type === 'core') {
      // Return universal roots present in all living branches
      return PROTO_ROOT_STARS.slice(0, 6);
    }
    if (selectedSegment.type === 'branch') {
      const branchName = selectedSegment.branch;
      return PROTO_ROOT_STARS.filter((r) => {
        if (branchName === 'North Germanic') return r.daughters.sv && r.daughters.da;
        return r.daughters.de && r.daughters.en;
      }).slice(0, 6);
    }
    if (selectedSegment.type === 'petal' && selectedSegment.targetLang) {
      const tgt = selectedSegment.targetLang;
      return PROTO_ROOT_STARS.filter((r) => r.daughters[focalLang] && r.daughters[tgt]).slice(0, 6);
    }
    return PROTO_ROOT_STARS.slice(0, 5);
  }, [selectedSegment, focalLang]);

  return (
    <div className="space-y-6">
      {/* 1. Prototype Chart Selector Bar */}
      <div className="bg-page-surface border border-book-rule p-4 space-y-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-book-rule/60 pb-3">
          <div className="flex items-center gap-1 bg-page-muted p-1 rounded-sm border border-book-rule/80">
            <button
              onClick={() => setChartMode('sunburst_rose')}
              className={`px-3 py-1.5 typo-overline text-xs rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                chartMode === 'sunburst_rose'
                  ? 'bg-page-surface text-ink-main shadow-xs font-semibold'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
            >
              <MaterialSymbol icon="donut_large" className="text-base text-cognate-ink" />
              1. Radial Sunburst / Rose
            </button>

            <button
              onClick={() => setChartMode('chord_matrix')}
              className={`px-3 py-1.5 typo-overline text-xs rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                chartMode === 'chord_matrix'
                  ? 'bg-page-surface text-ink-main shadow-xs font-semibold'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
            >
              <MaterialSymbol icon="hub" className="text-base text-divergent-ink" />
              2. Chord Lexical Flow (7-Way)
            </button>

            <button
              onClick={() => setChartMode('euler_crucible')}
              className={`px-3 py-1.5 typo-overline text-xs rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                chartMode === 'euler_crucible'
                  ? 'bg-page-surface text-ink-main shadow-xs font-semibold'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
            >
              <MaterialSymbol icon="bubble_chart" className="text-base text-shifted-ink" />
              3. Interactive Euler Crucible
            </button>
          </div>

          {/* Quick Statistics Badge */}
          <div className="flex items-center gap-2 typo-subscript text-2xs text-ink-muted">
            <span>Lexicon volume scaling</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cognate-ink" />
            <span className="font-mono text-ink-main font-semibold">
              {GALLERY_LANGUAGES.reduce((acc, l) => acc + l.approxLexiconSize, 0).toLocaleString()} words total
            </span>
          </div>
        </div>

        {/* Dynamic Context Controls Based on Mode */}
        {chartMode === 'sunburst_rose' && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="typo-overline text-xs text-ink-muted">Focal Hub Language:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {GALLERY_LANGUAGES.map((lang) => {
                  const isSelected = lang.code === focalLang;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => setFocalLang(lang.code)}
                      className={`px-2.5 py-1 rounded-xs text-xs font-medium transition-all cursor-pointer border ${
                        isSelected
                          ? 'border-ink-main bg-ink-main text-page-bg font-semibold shadow-xs'
                          : 'border-book-rule bg-page-bg text-ink-main hover:bg-page-muted'
                      }`}
                    >
                      {lang.name} ({lang.code.toUpperCase()})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="typo-subscript text-2xs text-ink-muted font-mono">
              Hub Radius ∝ {focalMeta.approxLexiconSize.toLocaleString()} words ({focalMeta.branch})
            </div>
          </div>
        )}

        {chartMode === 'chord_matrix' && (
          <div className="flex items-center justify-between">
            <p className="typo-body text-xs text-ink-muted">
              Connects all 7 Germanic languages. Perimeter arcs scale to vocabulary volume; ribbon thickness represents mutual pair volume; color gradients indicate True Cognate ratio vs False Friend friction.
            </p>
            <div className="flex items-center gap-3 typo-subscript text-2xs">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cognate-ink" /> Cognate Dominant
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-falsefriend-ink" /> High Friction / False Friends
              </span>
            </div>
          </div>
        )}

        {chartMode === 'euler_crucible' && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="typo-overline text-xs text-ink-muted">Select Languages for Crucible (2–4):</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {GALLERY_LANGUAGES.map((lang) => {
                  const isSelected = selectedCrucibleLangs.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      onClick={() => {
                        if (isSelected) {
                          if (selectedCrucibleLangs.length > 2) {
                            setSelectedCrucibleLangs(selectedCrucibleLangs.filter((c) => c !== lang.code));
                          }
                        } else {
                          if (selectedCrucibleLangs.length < 4) {
                            setSelectedCrucibleLangs([...selectedCrucibleLangs, lang.code]);
                          }
                        }
                      }}
                      className={`px-2.5 py-1 rounded-xs text-xs font-medium transition-all cursor-pointer border ${
                        isSelected
                          ? 'border-cognate-ink bg-cognate-bg text-cognate-ink font-semibold'
                          : 'border-book-rule bg-page-bg text-ink-muted hover:text-ink-main'
                      }`}
                    >
                      {lang.name} ({lang.code.toUpperCase()})
                    </button>
                  );
                })}
              </div>
            </div>

            <span className="typo-subscript text-2xs text-ink-muted font-mono">
              {selectedCrucibleLangs.length} languages active in Euler space
            </span>
          </div>
        )}
      </div>

      {/* 2. Primary Canvas Stage */}
      <div className="bg-page-surface border border-book-rule p-4 shadow-2xs relative">
        <div className="flex items-center justify-between mb-3 border-b border-book-rule/60 pb-2">
          <div>
            <h3 className="typo-section-header text-sm font-semibold">
              {chartMode === 'sunburst_rose' && `Radial Sunburst & Nightingale Rose (Anchored on ${focalMeta.name})`}
              {chartMode === 'chord_matrix' && '7-Way Chord Lexical Flow Matrix'}
              {chartMode === 'euler_crucible' && 'Multi-Language Proportional Euler Crucible'}
            </h3>
            <p className="typo-sublabel text-xs">
              {chartMode === 'sunburst_rose' && 'Concentric rings show Pan-Germanic core and branches; outer petals show individual languages scaled by dictionary size and similarity.'}
              {chartMode === 'chord_matrix' && 'Hover over any perimeter arc to isolate that language’s lexical bandwidth ribbons.'}
              {chartMode === 'euler_crucible' && 'Area-proportional intersecting spheres with dynamic multi-set overlap calculations.'}
            </p>
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-3 typo-subscript text-2xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cognate-ink" /> True Cognates
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-falsefriend-ink" /> False Friends
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-shifted-ink" /> Semantic Shifts
            </span>
          </div>
        </div>

        {/* View Renderers */}
        <div className="w-full flex justify-center py-2">
          {chartMode === 'sunburst_rose' && (
            <SunburstRoseRenderer
              focalMeta={focalMeta}
              comparisonLanguages={comparisonLanguages}
              pairMap={pairMap}
              selectedSegment={selectedSegment}
              onSelectSegment={setSelectedSegment}
            />
          )}

          {chartMode === 'chord_matrix' && (
            <ChordMatrixRenderer
              languages={GALLERY_LANGUAGES}
              pairMap={pairMap}
              hoveredLang={selectedLanguageHover}
              selectedPair={selectedChordPair}
              onHoverLang={setSelectedLanguageHover}
              onSelectPair={setSelectedChordPair}
            />
          )}

          {chartMode === 'euler_crucible' && (
            <EulerCrucibleRenderer
              selectedCodes={selectedCrucibleLangs}
              selectedSegment={selectedSegment}
              onSelectSegment={setSelectedSegment}
            />
          )}
        </div>
      </div>

      {/* 3. Authentic Specimen & Intelligibility Dossier */}
      <div className="bg-page-surface border border-book-rule p-5 space-y-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-book-rule pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="typo-overline text-xs text-cognate-ink font-semibold">
                Specimen Dossier
              </span>
              <span className="typo-badge px-2 py-0.5 bg-page-muted border border-book-rule rounded text-ink-main font-mono text-xs">
                {selectedSegment.label}
              </span>
            </div>
            <h4 className="typo-section-header text-base font-semibold mt-1">
              Conserved Roots & Divergence Patterns
            </h4>
          </div>

          <div className="flex items-center gap-3 typo-sublabel text-xs">
            <span>Showing authentic Proto-Germanic roots across living branches</span>
          </div>
        </div>

        {/* Root Specimen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeSpecimens.map((rootStar) => {
            const focalDaughter = rootStar.daughters[focalLang];

            return (
              <div
                key={rootStar.id}
                className="bg-page-bg border border-book-rule p-3.5 space-y-2.5 rounded-xs hover:border-ink-main/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 border-b border-book-rule/60 pb-1.5">
                  <div>
                    <span className="font-mono text-xs font-bold text-ink-main">
                      {rootStar.root}
                    </span>
                    <span className="text-2xs text-ink-muted italic block">
                      "{rootStar.reconstructedMeaning}"
                    </span>
                  </div>
                  <span className="typo-badge px-1.5 py-0.5 rounded text-2xs uppercase text-cognate-ink bg-cognate-bg border border-cognate-border">
                    {rootStar.constellation}
                  </span>
                </div>

                {/* Multilingual Daughter Forms */}
                <div className="space-y-1.5 text-xs">
                  {/* Focal Anchor */}
                  {focalDaughter && (
                    <div className="flex items-baseline justify-between bg-page-muted/60 p-1 rounded-xs">
                      <span className="text-ink-muted font-mono font-semibold w-8">
                        {focalMeta.code.toUpperCase()}:
                      </span>
                      <span className="font-bold text-ink-main flex-1">
                        {focalDaughter.word}
                      </span>
                      <span className="text-ink-muted font-mono text-2xs">
                        {focalDaughter.ipa}
                      </span>
                    </div>
                  )}

                  {/* Other Languages */}
                  {Object.entries(rootStar.daughters)
                    .filter(([c]) => c !== focalLang)
                    .slice(0, 3)
                    .map(([code, d]) => (
                      <div key={code} className="flex items-baseline justify-between pt-0.5 px-1">
                        <span className="text-ink-muted font-mono w-8">{code.toUpperCase()}:</span>
                        <span className="font-medium text-ink-main flex-1">{d.word}</span>
                        <span className="text-ink-muted font-mono text-2xs">{d.ipa}</span>
                      </div>
                    ))}
                </div>

                <p className="typo-note text-2xs text-ink-muted leading-relaxed pt-1.5 border-t border-book-rule/40">
                  {rootStar.etymologicalNote}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Renderer 1: The Radial Sunburst & Nightingale Rose (Target-Anchored)
// ============================================================================
interface SunburstProps {
  focalMeta: LanguageMeta;
  comparisonLanguages: LanguageMeta[];
  pairMap: Map<string, PairwiseCell>;
  selectedSegment: { type: string; targetLang?: string; branch?: string; label: string };
  onSelectSegment: (seg: { type: 'core' | 'branch' | 'petal'; targetLang?: string; branch?: string; label: string }) => void;
}

const SunburstRoseRenderer: React.FC<SunburstProps> = ({
  focalMeta,
  comparisonLanguages,
  pairMap,
  selectedSegment,
  onSelectSegment,
}) => {
  const cx = 350;
  const cy = 260;

  // Geometry
  const rHub = 55;
  const rCore = 85;
  const rBranch = 115;
  const rMaxPetal = 225;

  // Compute angles for the 6 comparison languages based on their lexicon size
  const totalVolume = comparisonLanguages.reduce((acc, l) => acc + l.approxLexiconSize, 0);
  let currentAngle = -Math.PI / 2; // Start at 12 o'clock

  const petals = comparisonLanguages.map((lang) => {
    const angleSpan = (lang.approxLexiconSize / totalVolume) * (Math.PI * 2);
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSpan;
    const midAngle = startAngle + angleSpan / 2;
    currentAngle = endAngle;

    const cell = pairMap.get(`${focalMeta.code}-${lang.code}`);
    const sim = cell ? cell.semanticSim : 0.7;
    const cognateRatio = cell ? cell.trueCognateRatio : 0.45;
    const falseFriendRatio = cell ? cell.falseFriendRatio : 0.2;
    const shiftRatio = Math.max(0.1, 1 - cognateRatio - falseFriendRatio);

    // Radial extension proportional to similarity
    const outerR = rBranch + (rMaxPetal - rBranch) * sim;

    return {
      lang,
      startAngle,
      endAngle,
      midAngle,
      outerR,
      sim,
      cognateRatio,
      falseFriendRatio,
      shiftRatio,
      cell,
    };
  });

  return (
    <svg viewBox="0 0 700 520" className="w-full max-w-2xl h-auto select-none font-serif">
      <defs>
        <radialGradient id="sunburstHub" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-page-muted)" />
          <stop offset="100%" stopColor="var(--color-page-accent)" />
        </radialGradient>
      </defs>

      {/* Orbit Range Guidelines */}
      <circle cx={cx} cy={cy} r={rCore} fill="none" stroke="var(--color-book-rule)" strokeDasharray="3 3" />
      <circle cx={cx} cy={cy} r={rBranch} fill="none" stroke="var(--color-book-rule)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={rMaxPetal} fill="none" stroke="var(--color-book-rule)" strokeDasharray="2 4" strokeOpacity="0.6" />

      {/* Ring 3: Outer Petals (6 Comparison Languages, Segmented by Category) */}
      {petals.map((p) => {
        const { lang, startAngle, endAngle, midAngle, outerR, cognateRatio, shiftRatio } = p;
        const gap = 0.03; // Angular gap between petals
        const a0 = startAngle + gap / 2;
        const a1 = endAngle - gap / 2;

        // Radii for category tiers within petal
        const rCog = rBranch + (outerR - rBranch) * cognateRatio;
        const rShift = rCog + (outerR - rBranch) * shiftRatio;
        const rFF = outerR;

        const isSelected = selectedSegment.type === 'petal' && selectedSegment.targetLang === lang.code;

        // SVG arc helper
        const makeArc = (rIn: number, rOut: number) => {
          const x0In = cx + rIn * Math.cos(a0);
          const y0In = cy + rIn * Math.sin(a0);
          const x1In = cx + rIn * Math.cos(a1);
          const y1In = cy + rIn * Math.sin(a1);

          const x0Out = cx + rOut * Math.cos(a0);
          const y0Out = cy + rOut * Math.sin(a0);
          const x1Out = cx + rOut * Math.cos(a1);
          const y1Out = cy + rOut * Math.sin(a1);

          return `M ${x0In} ${y0In} L ${x0Out} ${y0Out} A ${rOut} ${rOut} 0 0 1 ${x1Out} ${y1Out} L ${x1In} ${y1In} A ${rIn} ${rIn} 0 0 0 ${x0In} ${y0In} Z`;
        };

        const labelX = cx + (rFF + 18) * Math.cos(midAngle);
        const labelY = cy + (rFF + 18) * Math.sin(midAngle);

        return (
          <g
            key={lang.code}
            className="cursor-pointer transition-opacity group"
            onClick={() =>
              onSelectSegment({
                type: 'petal',
                targetLang: lang.code,
                label: `${focalMeta.name} ↔ ${lang.name} Lexical Overlap`,
              })
            }
            opacity={isSelected ? 1 : 0.85}
          >
            {/* Layer 1: True Cognates (Green) */}
            <path
              d={makeArc(rBranch, rCog)}
              fill="var(--color-cognate-ink)"
              fillOpacity={isSelected ? 0.9 : 0.75}
              stroke="var(--color-page-bg)"
              strokeWidth="1"
            />

            {/* Layer 2: Semantic Shifts (Amber) */}
            <path
              d={makeArc(rCog, rShift)}
              fill="var(--color-shifted-ink)"
              fillOpacity={isSelected ? 0.85 : 0.65}
              stroke="var(--color-page-bg)"
              strokeWidth="1"
            />

            {/* Layer 3: False Friends / Friction (Red) */}
            <path
              d={makeArc(rShift, rFF)}
              fill="var(--color-falsefriend-ink)"
              fillOpacity={isSelected ? 0.85 : 0.65}
              stroke="var(--color-page-bg)"
              strokeWidth="1"
            />

            {/* Petal Outer Label */}
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="typo-overline text-2xs font-bold transition-transform group-hover:scale-110"
              fill="var(--color-ink-main)"
            >
              {lang.code.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* Ring 2: Branch Partitions (North Germanic vs West Germanic) */}
      {/* North Germanic Arc (Approx 12 o'clock to 6 o'clock) */}
      <g
        className="cursor-pointer"
        onClick={() =>
          onSelectSegment({
            type: 'branch',
            branch: 'North Germanic',
            label: 'North Germanic Branch Pool (Scandinavian)',
          })
        }
      >
        <path
          d={`M ${cx} ${cy - rBranch} A ${rBranch} ${rBranch} 0 0 1 ${cx} ${cy + rBranch} L ${cx} ${cy + rCore} A ${rCore} ${rCore} 0 0 0 ${cx} ${cy - rCore} Z`}
          fill="var(--color-divergent-bg)"
          stroke="var(--color-divergent-border)"
          strokeWidth="1"
          opacity={selectedSegment.branch === 'North Germanic' ? 1 : 0.7}
        />
        <text
          x={cx + (rCore + rBranch) / 2}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          className="typo-overline text-3xs font-bold uppercase tracking-wider"
          fill="var(--color-divergent-ink)"
          transform={`rotate(90, ${cx + (rCore + rBranch) / 2}, ${cy})`}
        >
          North Germanic
        </text>
      </g>

      {/* West Germanic Arc */}
      <g
        className="cursor-pointer"
        onClick={() =>
          onSelectSegment({
            type: 'branch',
            branch: 'West Germanic',
            label: 'West Germanic Branch Pool (Continental & Anglo)',
          })
        }
      >
        <path
          d={`M ${cx} ${cy + rBranch} A ${rBranch} ${rBranch} 0 0 1 ${cx} ${cy - rBranch} L ${cx} ${cy - rCore} A ${rCore} ${rCore} 0 0 0 ${cx} ${cy + rCore} Z`}
          fill="var(--color-page-muted)"
          stroke="var(--color-book-rule)"
          strokeWidth="1"
          opacity={selectedSegment.branch === 'West Germanic' ? 1 : 0.7}
        />
        <text
          x={cx - (rCore + rBranch) / 2}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          className="typo-overline text-3xs font-bold uppercase tracking-wider"
          fill="var(--color-ink-muted)"
          transform={`rotate(-90, ${cx - (rCore + rBranch) / 2}, ${cy})`}
        >
          West Germanic
        </text>
      </g>

      {/* Ring 1: Universal Pan-Germanic Core */}
      <g
        className="cursor-pointer"
        onClick={() =>
          onSelectSegment({
            type: 'core',
            label: 'Universal Pan-Germanic Core (All Languages)',
          })
        }
      >
        <circle
          cx={cx}
          cy={cy}
          r={rCore}
          fill="var(--color-cognate-bg)"
          stroke="var(--color-cognate-border)"
          strokeWidth="1.5"
          opacity={selectedSegment.type === 'core' ? 1 : 0.85}
        />
        <text x={cx} y={cy - rHub - 8} textAnchor="middle" className="typo-overline text-3xs font-bold" fill="var(--color-cognate-ink)">
          Universal Core
        </text>
      </g>

      {/* Hub (Center): Anchor Language X */}
      <circle
        cx={cx}
        cy={cy}
        r={rHub}
        fill="url(#sunburstHub)"
        stroke="var(--color-ink-main)"
        strokeWidth="2.5"
        className="shadow-sm cursor-pointer"
        onClick={() =>
          onSelectSegment({
            type: 'core',
            label: `${focalMeta.name} Core Lexicon`,
          })
        }
      />
      <text x={cx} y={cy - 10} textAnchor="middle" className="typo-overline text-sm font-bold" fill="var(--color-ink-main)">
        {focalMeta.name}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" className="font-mono text-xs font-bold" fill="var(--color-cognate-ink)">
        {focalMeta.code.toUpperCase()}
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle" className="typo-subscript text-2xs" fill="var(--color-ink-muted)">
        {focalMeta.approxLexiconSize.toLocaleString()} w
      </text>
    </svg>
  );
};

// ============================================================================
// Renderer 2: 7-Way Chord Lexical Flow Matrix (N-to-N System Overview)
// ============================================================================
interface ChordProps {
  languages: LanguageMeta[];
  pairMap: Map<string, PairwiseCell>;
  hoveredLang: string | null;
  selectedPair: { src: string; tgt: string } | null;
  onHoverLang: (code: string | null) => void;
  onSelectPair: (pair: { src: string; tgt: string } | null) => void;
}

const ChordMatrixRenderer: React.FC<ChordProps> = ({
  languages,
  pairMap,
  hoveredLang,
  selectedPair,
  onHoverLang,
  onSelectPair,
}) => {
  const cx = 350;
  const cy = 260;
  const r = 200;
  const ringWidth = 14;

  const totalVol = languages.reduce((acc, l) => acc + l.approxLexiconSize, 0);
  const gap = 0.05; // Gap between arcs
  const usableAngle = Math.PI * 2 - gap * languages.length;

  // Compute node coordinates around perimeter
  let curAngle = -Math.PI / 2;
  const nodes = languages.map((lang) => {
    const span = (lang.approxLexiconSize / totalVol) * usableAngle;
    const a0 = curAngle;
    const a1 = curAngle + span;
    const mid = a0 + span / 2;
    curAngle = a1 + gap;

    return {
      lang,
      a0,
      a1,
      mid,
      x: cx + r * Math.cos(mid),
      y: cy + r * Math.sin(mid),
    };
  });

  // Generate pairwise chords (all 21 combinations)
  const chords: Array<{
    src: string;
    tgt: string;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    cell?: PairwiseCell;
    isHighlighted: boolean;
  }> = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const n0 = nodes[i];
      const n1 = nodes[j];
      const cell = pairMap.get(`${n0.lang.code}-${n1.lang.code}`);

      const isHighlighted =
        hoveredLang === null || hoveredLang === n0.lang.code || hoveredLang === n1.lang.code;

      chords.push({
        src: n0.lang.code,
        tgt: n1.lang.code,
        x0: n0.x,
        y0: n0.y,
        x1: n1.x,
        y1: n1.y,
        cell,
        isHighlighted,
      });
    }
  }

  return (
    <svg viewBox="0 0 700 520" className="w-full max-w-2xl h-auto select-none font-serif">
      {/* Background Outer Circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-book-rule)" strokeDasharray="3 3" />

      {/* Internal Chords */}
      <g>
        {chords.map((chord) => {
          const { src, tgt, x0, y0, x1, y1, cell, isHighlighted } = chord;
          const strokeW = cell ? Math.max(1.5, Math.min(6, (cell.pairCount / 3000) * 6)) : 2;
          const ffRatio = cell ? cell.falseFriendRatio : 0.2;
          const isSelected =
            selectedPair &&
            ((selectedPair.src === src && selectedPair.tgt === tgt) ||
              (selectedPair.src === tgt && selectedPair.tgt === src));

          // Color: Cognate Green vs False Friend Red
          const strokeColor =
            ffRatio > 0.22 ? 'var(--color-falsefriend-ink)' : 'var(--color-cognate-ink)';

          return (
            <path
              key={`${src}-${tgt}`}
              d={`M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth={isSelected ? strokeW + 3 : strokeW}
              strokeOpacity={isSelected ? 1 : isHighlighted ? 0.45 : 0.1}
              className="cursor-pointer transition-all hover:stroke-opacity-100"
              onClick={() => onSelectPair({ src, tgt })}
            />
          );
        })}
      </g>

      {/* Perimeter Arcs for Each Language */}
      {nodes.map((node) => {
        const { lang, a0, a1, mid } = node;
        const x0 = cx + r * Math.cos(a0);
        const y0 = cy + r * Math.sin(a0);
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);

        const x0In = cx + (r - ringWidth) * Math.cos(a0);
        const y0In = cy + (r - ringWidth) * Math.sin(a0);
        const x1In = cx + (r - ringWidth) * Math.cos(a1);
        const y1In = cy + (r - ringWidth) * Math.sin(a1);

        const isHovered = hoveredLang === lang.code;
        const branchColor =
          lang.branch === 'North Germanic' ? 'var(--color-divergent-ink)' : 'var(--color-shifted-ink)';

        const arcPath = `M ${x0In} ${y0In} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} L ${x1In} ${y1In} A ${r - ringWidth} ${r - ringWidth} 0 0 0 ${x0In} ${y0In} Z`;

        const labelX = cx + (r + 20) * Math.cos(mid);
        const labelY = cy + (r + 20) * Math.sin(mid);

        return (
          <g
            key={lang.code}
            className="cursor-pointer"
            onMouseEnter={() => onHoverLang(lang.code)}
            onMouseLeave={() => onHoverLang(null)}
          >
            <path
              d={arcPath}
              fill={branchColor}
              fillOpacity={isHovered ? 1 : 0.8}
              stroke="var(--color-page-bg)"
              strokeWidth="1.5"
            />
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="typo-overline text-xs font-bold"
              fill="var(--color-ink-main)"
            >
              {lang.name}
            </text>
          </g>
        );
      })}

      {/* Center Informational Badge */}
      <circle cx={cx} cy={cy} r={36} fill="var(--color-page-surface)" stroke="var(--color-book-rule)" strokeWidth="1.5" />
      <text x={cx} y={cy - 6} textAnchor="middle" className="typo-overline text-2xs font-bold" fill="var(--color-ink-main)">
        FLOW
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="font-mono text-3xs font-semibold text-ink-muted">
        21 Pairs
      </text>
    </svg>
  );
};

// ============================================================================
// Renderer 3: Interactive Multi-Language Euler Crucible
// ============================================================================
interface CrucibleProps {
  selectedCodes: string[];
  selectedSegment: { type: string; label: string };
  onSelectSegment: (seg: { type: 'core' | 'branch' | 'petal'; label: string }) => void;
}

const EulerCrucibleRenderer: React.FC<CrucibleProps> = ({
  selectedCodes,
  onSelectSegment,
}) => {
  const cx = 350;
  const cy = 250;

  const activeMetas = useMemo(
    () => GALLERY_LANGUAGES.filter((l) => selectedCodes.includes(l.code)),
    [selectedCodes],
  );

  // Position bubbles symmetrically
  const count = activeMetas.length;
  const rOrbit = count === 2 ? 80 : count === 3 ? 95 : 110;

  const bubblePositions = activeMetas.map((meta, idx) => {
    const angle = (idx / count) * Math.PI * 2 - Math.PI / 2;
    const rBubble = Math.round(55 + Math.sqrt(meta.approxLexiconSize) * 0.16);

    return {
      meta,
      x: cx + rOrbit * Math.cos(angle),
      y: cy + rOrbit * Math.sin(angle),
      r: rBubble,
    };
  });

  return (
    <svg viewBox="0 0 700 500" className="w-full max-w-2xl h-auto select-none font-serif">
      {/* Crucible Fluid Overlap Bubbles */}
      {bubblePositions.map(({ meta, x, y, r }) => (
        <g key={meta.code} className="cursor-pointer">
          <circle
            cx={x}
            cy={y}
            r={r}
            fill="var(--color-cognate-bg)"
            fillOpacity="0.38"
            stroke="var(--color-cognate-ink)"
            strokeWidth="1.75"
            className="hover:fill-opacity-50 transition-all"
            onClick={() =>
              onSelectSegment({
                type: 'petal',
                label: `${meta.name} Lexicon Pool (${meta.approxLexiconSize.toLocaleString()} words)`,
              })
            }
          />
          <text x={x} y={y - 12} textAnchor="middle" className="typo-overline text-xs font-bold" fill="var(--color-ink-main)">
            {meta.name}
          </text>
          <text x={x} y={y + 6} textAnchor="middle" className="font-mono text-2xs font-semibold" fill="var(--color-cognate-ink)">
            {meta.code.toUpperCase()}
          </text>
          <text x={x} y={y + 20} textAnchor="middle" className="typo-subscript text-3xs" fill="var(--color-ink-muted)">
            {meta.approxLexiconSize.toLocaleString()} w
          </text>
        </g>
      ))}

      {/* Central Intersection Crucible Core */}
      <circle
        cx={cx}
        cy={cy}
        r={32}
        fill="var(--color-cognate-ink)"
        fillOpacity="0.9"
        stroke="var(--color-page-bg)"
        strokeWidth="2.5"
        className="cursor-pointer hover:scale-105 transition-transform"
        onClick={() =>
          onSelectSegment({
            type: 'core',
            label: `Crucible Core (${selectedCodes.map((c) => c.toUpperCase()).join(' ∩ ')})`,
          })
        }
      />
      <text x={cx} y={cy - 2} textAnchor="middle" className="typo-overline text-2xs font-bold" fill="#FAF8F5">
        CORE
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="font-mono text-3xs font-semibold" fill="#FAF8F5">
        {selectedCodes.length}-Way
      </text>
    </svg>
  );
};
