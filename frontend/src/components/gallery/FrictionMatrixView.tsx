import React, { useState, useMemo } from 'react';
import {
  GALLERY_LANGUAGES,
  PAIRWISE_FRICTION_MATRIX,
  type PairwiseCell,
} from './galleryData';
import { useLanguagesQuery } from '../../services/queries';

type MatrixMetric = 'rift' | 'false_friends' | 'phonetic' | 'orthographic' | 'volume';
type MatrixDisplay = 'grid' | 'chord';

export const FrictionMatrixView: React.FC = () => {
  const [activeMetric, setActiveMetric] = useState<MatrixMetric>('rift');
  const [activeDisplay, setActiveDisplay] = useState<MatrixDisplay>('grid');
  const [selectedPair, setSelectedPair] = useState<PairwiseCell>(PAIRWISE_FRICTION_MATRIX[0]);
  const [hoveredCell, setHoveredCell] = useState<{ src: string; tgt: string } | null>(null);

  const { data: languagesData } = useLanguagesQuery();

  // Combine static matrix with live database pair stats
  const pairMatrixMap = useMemo(() => {
    const map = new Map<string, PairwiseCell>();

    PAIRWISE_FRICTION_MATRIX.forEach((cell) => {
      map.set(`${cell.source}-${cell.target}`, cell);
      // Ensure reverse is populated
      map.set(`${cell.target}-${cell.source}`, {
        ...cell,
        source: cell.target,
        target: cell.source,
      });
    });

    if (languagesData?.pairs) {
      languagesData.pairs.forEach((p) => {
        const key = `${p.source}-${p.target}`;
        const existing = map.get(key);
        map.set(key, {
          source: p.source,
          target: p.target,
          phoneticSim: p.avg_phonetic,
          orthographicSim: p.avg_orthographic,
          semanticSim: p.avg_semantic,
          pairCount: p.pair_count,
          falseFriendRatio: p.false_friends_ratio,
          trueCognateRatio: p.true_cognates_ratio,
          riftIndex: Math.abs(p.avg_orthographic - p.avg_phonetic),
          asymmetryNote: existing?.asymmetryNote,
        });
      });
    }

    return map;
  }, [languagesData]);

  // Metric value extractor
  const getCellValue = (src: string, tgt: string): { raw: number; display: string; intensity: number } => {
    if (src === tgt) {
      return { raw: 1.0, display: '—', intensity: 0 };
    }

    const cell = pairMatrixMap.get(`${src}-${tgt}`);
    if (!cell) {
      return { raw: 0, display: 'N/A', intensity: 0 };
    }

    switch (activeMetric) {
      case 'rift': {
        const val = cell.riftIndex;
        return {
          raw: val,
          display: `${Math.round(val * 100)}%`,
          intensity: Math.min(1, val * 3.5),
        };
      }
      case 'false_friends': {
        const val = cell.falseFriendRatio;
        return {
          raw: val,
          display: `${Math.round(val * 100)}%`,
          intensity: Math.min(1, val * 3.0),
        };
      }
      case 'phonetic': {
        const val = cell.phoneticSim;
        return {
          raw: val,
          display: `${Math.round(val * 100)}%`,
          intensity: val,
        };
      }
      case 'orthographic': {
        const val = cell.orthographicSim;
        return {
          raw: val,
          display: `${Math.round(val * 100)}%`,
          intensity: val,
        };
      }
      case 'volume': {
        const val = cell.pairCount;
        return {
          raw: val,
          display: val > 0 ? val.toLocaleString() : '—',
          intensity: Math.min(1, val / 3000),
        };
      }
    }
  };

  const getCellColor = (intensity: number) => {
    if (activeMetric === 'false_friends' || activeMetric === 'rift') {
      // Oxblood / Red scale for friction
      return `rgba(158, 42, 43, ${0.06 + intensity * 0.75})`;
    } else {
      // Moss green scale for similarity & volume
      return `rgba(37, 93, 54, ${0.06 + intensity * 0.75})`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Plate */}
      <div className="border border-book-rule bg-page-surface p-3 sm:p-4 rounded-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Metric Mode Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="typo-sublabel text-ink-muted">Matrix Metric:</span>
          <div className="inline-flex items-center border border-book-rule bg-page-muted/40 p-0.5 rounded-xs flex-wrap">
            <button
              type="button"
              onClick={() => setActiveMetric('rift')}
              className={`px-2.5 py-1 rounded-xs typo-sublabel font-medium transition-all cursor-pointer ${
                activeMetric === 'rift'
                  ? 'bg-page-surface border border-book-rule-strong text-ink-main shadow-2xs font-semibold'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
              title="Difference between written orthography and spoken phonetics"
            >
              Phonetic vs Orthographic Rift
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('false_friends')}
              className={`px-2.5 py-1 rounded-xs typo-sublabel font-medium transition-all cursor-pointer ${
                activeMetric === 'false_friends'
                  ? 'bg-page-surface border border-book-rule-strong text-ink-main shadow-2xs font-semibold'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
              title="Density of cognitive false friend traps"
            >
              False Friend Hazard %
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('phonetic')}
              className={`px-2.5 py-1 rounded-xs typo-sublabel font-medium transition-all cursor-pointer ${
                activeMetric === 'phonetic'
                  ? 'bg-page-surface border border-book-rule-strong text-ink-main shadow-2xs font-semibold'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
            >
              Spoken Transparency
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('orthographic')}
              className={`px-2.5 py-1 rounded-xs typo-sublabel font-medium transition-all cursor-pointer ${
                activeMetric === 'orthographic'
                  ? 'bg-page-surface border border-book-rule-strong text-ink-main shadow-2xs font-semibold'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
            >
              Written Transparency
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('volume')}
              className={`px-2.5 py-1 rounded-xs typo-sublabel font-medium transition-all cursor-pointer ${
                activeMetric === 'volume'
                  ? 'bg-page-surface border border-book-rule-strong text-ink-main shadow-2xs font-semibold'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
            >
              Shared Pairs Volume
            </button>
          </div>
        </div>

        {/* Display Toggle: Grid vs Chord Flow */}
        <div className="flex items-center gap-1.5">
          <span className="typo-sublabel text-ink-muted">Display:</span>
          <div className="inline-flex items-center border border-book-rule bg-page-muted/40 p-0.5 rounded-xs">
            <button
              type="button"
              onClick={() => setActiveDisplay('grid')}
              className={`px-2.5 py-1 rounded-xs typo-sublabel font-medium transition-all cursor-pointer ${
                activeDisplay === 'grid'
                  ? 'bg-page-surface border border-book-rule-strong text-ink-main shadow-2xs font-semibold'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
            >
              Symmetric Grid
            </button>
            <button
              type="button"
              onClick={() => setActiveDisplay('chord')}
              className={`px-2.5 py-1 rounded-xs typo-sublabel font-medium transition-all cursor-pointer ${
                activeDisplay === 'chord'
                  ? 'bg-page-surface border border-book-rule-strong text-ink-main shadow-2xs font-semibold'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
            >
              Chord Tension Flow
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Stage & Bilateral Inspection Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Heat Grid / Chord Diagram */}
        <div className="lg:col-span-8 border border-book-rule bg-page-surface p-4 sm:p-6 rounded-xs space-y-4 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between border-b border-book-rule pb-2">
            <div>
              <span className="typo-overline text-ink-muted block">
                Symmetric Bilateral Tensor Matrix
              </span>
              <p className="typo-gloss text-ink-main text-xs mt-0.5">
                {activeMetric === 'rift' && 'Highlights linguistic deception: written proximity vs acoustic opacity (Danish-Swedish rift).'}
                {activeMetric === 'false_friends' && 'Ranks cognitive hazard corridors across language pairs.'}
                {activeMetric === 'phonetic' && 'Acoustic intelligibility of spoken headwords.'}
                {activeMetric === 'orthographic' && 'Visual recognizability of written headwords.'}
                {activeMetric === 'volume' && 'Total overlapping word pair records in the Linduistics catalog.'}
              </p>
            </div>
            <span className="typo-subscript text-2xs font-mono text-ink-muted">
              DIMENSION: 7 × 7 TENSOR
            </span>
          </div>

          {activeDisplay === 'grid' ? (
            /* 7x7 High-Density Numerical Heat Grid */
            <div className="pt-2 min-w-[520px]">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr>
                    <th className="p-2 border border-book-rule bg-page-muted/40 typo-overline text-2xs text-ink-muted">
                      SRC ╲ TGT
                    </th>
                    {GALLERY_LANGUAGES.map((tgt) => (
                      <th
                        key={tgt.code}
                        className="p-2 border border-book-rule bg-page-muted/30 typo-lang-code font-bold text-xs text-ink-main"
                      >
                        {tgt.code.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {GALLERY_LANGUAGES.map((src) => (
                    <tr key={src.code}>
                      <th className="p-2 border border-book-rule bg-page-muted/30 typo-lang-code font-bold text-xs text-ink-main text-left">
                        <span className="mr-1">{src.code.toUpperCase()}</span>
                        <span className="typo-subscript text-2xs font-normal text-ink-muted hidden sm:inline">
                          ({src.name})
                        </span>
                      </th>
                      {GALLERY_LANGUAGES.map((tgt) => {
                        const cellData = getCellValue(src.code, tgt.code);
                        const isSelf = src.code === tgt.code;
                        const isSelected =
                          (selectedPair.source === src.code && selectedPair.target === tgt.code) ||
                          (selectedPair.source === tgt.code && selectedPair.target === src.code);
                        const isHovered =
                          hoveredCell?.src === src.code && hoveredCell?.tgt === tgt.code;

                        const cell = pairMatrixMap.get(`${src.code}-${tgt.code}`);

                        return (
                          <td
                            key={tgt.code}
                            onClick={() => {
                              if (cell) setSelectedPair(cell);
                            }}
                            onMouseEnter={() => setHoveredCell({ src: src.code, tgt: tgt.code })}
                            onMouseLeave={() => setHoveredCell(null)}
                            style={{
                              backgroundColor: isSelf ? '#FAF8F5' : getCellColor(cellData.intensity),
                            }}
                            className={`p-3 border border-book-rule transition-all cursor-pointer select-none ${
                              isSelected
                                ? 'ring-2 ring-inset ring-ink-main font-bold'
                                : isHovered
                                ? 'brightness-95'
                                : ''
                            } ${isSelf ? 'cursor-default text-ink-muted/30' : ''}`}
                          >
                            <span
                              className={`typo-metric text-xs block ${
                                cellData.intensity > 0.45 ? 'text-ink-main font-bold' : 'text-ink-muted'
                              }`}
                            >
                              {cellData.display}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Circular Chord Tension Diagram */
            <div className="py-6 flex flex-col items-center justify-center">
              <div className="relative w-80 h-80 flex items-center justify-center border border-book-rule rounded-full bg-page-muted/15 shadow-inner">
                {/* Center Core */}
                <div className="text-center p-3 max-w-[160px] z-10 bg-page-surface/90 border border-book-rule rounded-full backdrop-blur-xs">
                  <span className="typo-overline text-2xs text-ink-muted block">Focused Pair</span>
                  <strong className="typo-headword-row text-xs text-ink-main block mt-0.5">
                    {selectedPair.source.toUpperCase()} ↔ {selectedPair.target.toUpperCase()}
                  </strong>
                  <span className="typo-metric text-xs text-falsefriend-ink font-bold block mt-0.5">
                    {Math.round(selectedPair.riftIndex * 100)}% Rift
                  </span>
                </div>

                {/* Outer Language Anchors around Perimeter */}
                {GALLERY_LANGUAGES.map((lang, idx) => {
                  const angle = (idx / GALLERY_LANGUAGES.length) * Math.PI * 2 - Math.PI / 2;
                  const r = 135;
                  const x = 160 + r * Math.cos(angle);
                  const y = 160 + r * Math.sin(angle);
                  const isPairMember =
                    selectedPair.source === lang.code || selectedPair.target === lang.code;

                  return (
                    <button
                      key={lang.code}
                      type="button"
                      style={{ left: `${x}px`, top: `${y}px` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border flex items-center justify-center typo-lang-code text-xs font-bold transition-all cursor-pointer ${
                        isPairMember
                          ? 'border-ink-main bg-ink-main text-page-bg shadow-sm scale-110'
                          : 'border-book-rule-strong bg-page-surface text-ink-main hover:bg-page-muted'
                      }`}
                    >
                      {lang.code.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Bilateral Friction Dossier */}
        <div className="lg:col-span-4 border border-book-rule bg-page-surface p-4 sm:p-5 rounded-xs space-y-4 shadow-xs">
          <div className="border-b border-book-rule pb-3">
            <span className="typo-overline text-ink-muted block">
              Bilateral Tension Dossier
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="typo-section-header text-ink-main">
                {selectedPair.source.toUpperCase()} ↔ {selectedPair.target.toUpperCase()}
              </h3>
              <span className="typo-subscript text-ink-muted">
                {selectedPair.pairCount.toLocaleString()} pairs
              </span>
            </div>

            {selectedPair.asymmetryNote ? (
              <p className="typo-gloss text-xs text-ink-muted mt-2 leading-relaxed italic border-t border-book-rule/40 pt-2">
                &ldquo;{selectedPair.asymmetryNote}&rdquo;
              </p>
            ) : (
              <p className="typo-gloss text-xs text-ink-muted mt-2 leading-relaxed italic border-t border-book-rule/40 pt-2">
                Continuous Germanic genetic sisterhood with shared vocabulary overlap.
              </p>
            )}
          </div>

          {/* Metric gauges */}
          <div className="space-y-3">
            <span className="typo-sublabel block font-semibold text-ink-main">
              Comparative Friction Indices
            </span>

            {/* Phonetic vs Orthographic Gap */}
            <div className="p-2.5 bg-page-muted/30 border border-book-rule rounded-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="typo-sublabel text-ink-main font-medium">Divergence Gap (Rift)</span>
                <strong className="typo-metric font-bold text-falsefriend-ink">
                  {Math.round(selectedPair.riftIndex * 100)}%
                </strong>
              </div>
              <div className="w-full h-1.5 bg-book-rule/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-falsefriend-ink"
                  style={{ width: `${Math.min(100, selectedPair.riftIndex * 300)}%` }}
                />
              </div>
              <span className="typo-subscript text-2xs text-ink-muted block">
                Absolute gap between spoken intelligibility and written readability.
              </span>
            </div>

            {/* False Friend Hazard */}
            <div className="p-2.5 bg-page-muted/30 border border-book-rule rounded-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="typo-sublabel text-ink-main font-medium">False Friend Hazard</span>
                <strong className="typo-metric font-bold text-shifted-ink">
                  {Math.round(selectedPair.falseFriendRatio * 100)}%
                </strong>
              </div>
              <div className="w-full h-1.5 bg-book-rule/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-shifted-ink"
                  style={{ width: `${Math.min(100, selectedPair.falseFriendRatio * 300)}%` }}
                />
              </div>
              <span className="typo-subscript text-2xs text-ink-muted block">
                Proportion of deceptive lookalikes in shared vocabulary.
              </span>
            </div>

            {/* True Cognates Ratio */}
            <div className="p-2.5 bg-page-muted/30 border border-book-rule rounded-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="typo-sublabel text-ink-main font-medium">True Cognate Bedrock</span>
                <strong className="typo-metric font-bold text-cognate-ink">
                  {Math.round(selectedPair.trueCognateRatio * 100)}%
                </strong>
              </div>
              <div className="w-full h-1.5 bg-book-rule/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cognate-ink"
                  style={{ width: `${selectedPair.trueCognateRatio * 100}%` }}
                />
              </div>
              <span className="typo-subscript text-2xs text-ink-muted block">
                Pure unbroken cognates with preserved form and meaning.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
