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
  // SVG Tension Chords for circular diagram
  const chords = useMemo(() => {
    const result: Array<{
      src: string;
      tgt: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      intensity: number;
      isSelected: boolean;
    }> = [];

    for (let i = 0; i < GALLERY_LANGUAGES.length; i++) {
      const l1 = GALLERY_LANGUAGES[i];
      const angle1 = (i / GALLERY_LANGUAGES.length) * Math.PI * 2 - Math.PI / 2;
      const x1 = 160 + 135 * Math.cos(angle1);
      const y1 = 160 + 135 * Math.sin(angle1);

      for (let j = i + 1; j < GALLERY_LANGUAGES.length; j++) {
        const l2 = GALLERY_LANGUAGES[j];
        const angle2 = (j / GALLERY_LANGUAGES.length) * Math.PI * 2 - Math.PI / 2;
        const x2 = 160 + 135 * Math.cos(angle2);
        const y2 = 160 + 135 * Math.sin(angle2);

        const val = getCellValue(l1.code, l2.code);
        const isSelected =
          (selectedPair.source === l1.code && selectedPair.target === l2.code) ||
          (selectedPair.source === l2.code && selectedPair.target === l1.code);

        result.push({
          src: l1.code,
          tgt: l2.code,
          x1,
          y1,
          x2,
          y2,
          intensity: val.intensity,
          isSelected,
        });
      }
    }
    return result;
  }, [selectedPair, activeMetric, pairMatrixMap]);

  return (
    <div className="space-y-4">
      {/* Control Plate */}
      <div className="border border-book-rule bg-page-surface p-3 sm:p-4 rounded-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Metric Mode Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="typo-sublabel text-ink-muted">Metric:</span>
          <div className="inline-flex items-center border border-book-rule bg-page-muted/40 p-0.5 rounded-xs flex-wrap">
            <button
              type="button"
              onClick={() => setActiveMetric('rift')}
              className={`px-2.5 py-1 rounded-xs typo-sublabel font-medium transition-all cursor-pointer ${
                activeMetric === 'rift'
                  ? 'bg-page-surface border border-book-rule-strong text-ink-main shadow-2xs font-semibold'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
              title="Difference between written spelling and spoken pronunciation"
            >
              Spelling vs Speech Gap
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('false_friends')}
              className={`px-2.5 py-1 rounded-xs typo-sublabel font-medium transition-all cursor-pointer ${
                activeMetric === 'false_friends'
                  ? 'bg-page-surface border border-book-rule-strong text-ink-main shadow-2xs font-semibold'
                  : 'text-ink-muted hover:text-ink-main'
              }`}
              title="Percentage of false friends"
            >
              False Friends %
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
              Pronunciation Match
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
              Spelling Match
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
              Total Word Pairs
            </button>
          </div>
        </div>

        {/* Display Toggle: Grid vs Chord Flow */}
        <div className="flex items-center gap-1.5">
          <span className="typo-sublabel text-ink-muted">View:</span>
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
              Table View
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
              Chord View
            </button>
          </div>
        </div>
      </div>

      {/* Main Stage & Details Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Heat Grid / Chord Diagram */}
        <div className="lg:col-span-8 border border-book-rule bg-page-surface p-4 sm:p-6 rounded-xs space-y-4 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between border-b border-book-rule pb-2">
            <div>
              <span className="typo-overline text-ink-muted block">
                Language Pair Comparison
              </span>
              <p className="typo-gloss text-ink-main text-xs mt-0.5">
                {activeMetric === 'rift' && 'Difference between written spelling and spoken pronunciation (e.g. Danish vs Swedish).'}
                {activeMetric === 'false_friends' && 'Percentage of deceptive false friends among shared words.'}
                {activeMetric === 'phonetic' && 'How similar the spoken words sound.'}
                {activeMetric === 'orthographic' && 'How similar the written words look.'}
                {activeMetric === 'volume' && 'Total shared word pairs in the catalog.'}
              </p>
            </div>
            <span className="typo-subscript text-2xs font-mono text-ink-muted">
              7 LANGUAGES
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
                {/* SVG Chords Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 320">
                  {chords.map((chord) => {
                    const strokeColor =
                      activeMetric === 'false_friends' || activeMetric === 'rift'
                        ? chord.isSelected
                          ? '#9E2A2B'
                          : `rgba(158, 42, 43, ${0.12 + chord.intensity * 0.55})`
                        : chord.isSelected
                        ? '#255D36'
                        : `rgba(37, 93, 54, ${0.12 + chord.intensity * 0.55})`;

                    return (
                      <path
                        key={`${chord.src}-${chord.tgt}`}
                        d={`M ${chord.x1} ${chord.y1} Q 160 160 ${chord.x2} ${chord.y2}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={chord.isSelected ? 3.5 : Math.max(1, chord.intensity * 3.5)}
                        strokeDasharray={
                          activeMetric === 'false_friends' && chord.intensity > 0.35 ? '3,3' : undefined
                        }
                      />
                    );
                  })}
                </svg>

                {/* Center Core */}
                <div className="text-center p-3 max-w-[160px] z-10 bg-page-surface/90 border border-book-rule rounded-full backdrop-blur-xs shadow-xs">
                  <span className="typo-overline text-2xs text-ink-muted block">Selected Pair</span>
                  <strong className="typo-headword-row text-xs text-ink-main block mt-0.5">
                    {selectedPair.source.toUpperCase()} ↔ {selectedPair.target.toUpperCase()}
                  </strong>
                  <span className="typo-metric text-xs text-falsefriend-ink font-bold block mt-0.5">
                    {Math.round(selectedPair.riftIndex * 100)}% Gap
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
                      onClick={() => {
                        if (selectedPair.source === lang.code) return;
                        const cell =
                          pairMatrixMap.get(`${selectedPair.source}-${lang.code}`) ||
                          pairMatrixMap.get(`${lang.code}-${selectedPair.source}`) ||
                          PAIRWISE_FRICTION_MATRIX.find(
                            (p) => p.source === lang.code || p.target === lang.code,
                          );
                        if (cell) setSelectedPair(cell);
                      }}
                      title={`Click to focus pairs with ${lang.name}`}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border flex items-center justify-center typo-lang-code text-xs font-bold transition-all cursor-pointer z-20 ${
                        isPairMember
                          ? 'border-ink-main bg-ink-main text-page-bg shadow-sm scale-110'
                          : 'border-book-rule-strong bg-page-surface text-ink-main hover:bg-page-muted hover:scale-105'
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

        {/* Detailed Pair Drawer */}
        <div className="lg:col-span-4 border border-book-rule bg-page-surface p-4 sm:p-5 rounded-xs space-y-4 shadow-xs">
          <div className="border-b border-book-rule pb-3">
            <span className="typo-overline text-ink-muted block">
              Pair Details
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
                Shared vocabulary across the Germanic language family.
              </p>
            )}
          </div>

          {/* Metric scores */}
          <div className="space-y-3">
            <span className="typo-sublabel block font-semibold text-ink-main">
              Comparison Scores
            </span>

            {/* Spelling vs Speech Gap */}
            <div className="p-2.5 bg-page-muted/30 border border-book-rule rounded-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="typo-sublabel text-ink-main font-medium">Spelling vs Speech Gap</span>
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
                How much words look recognizable in writing while sounding different when spoken.
              </span>
            </div>

            {/* False Friends */}
            <div className="p-2.5 bg-page-muted/30 border border-book-rule rounded-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="typo-sublabel text-ink-main font-medium">False Friends</span>
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
                Share of similar-looking or similar-sounding words with different meanings.
              </span>
            </div>

            {/* Shared Cognates */}
            <div className="p-2.5 bg-page-muted/30 border border-book-rule rounded-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="typo-sublabel text-ink-main font-medium">Shared Cognates</span>
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
                Words sharing the same ancestral root and meaning.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
