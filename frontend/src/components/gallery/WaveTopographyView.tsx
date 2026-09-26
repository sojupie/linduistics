import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MaterialSymbol } from '../common/MaterialSymbol';
import {
  ISOGLOSS_WAVES,
  GALLERY_LANGUAGES,
} from './galleryData';

export const WaveTopographyView: React.FC = () => {
  const [selectedWaveId, setSelectedWaveId] = useState<string>('wave-high-german');
  const [activeWaveIds, setActiveWaveIds] = useState<string[]>([
    'wave-high-german',
    'wave-ingvaeonic',
    'wave-syncope',
  ]);
  const [timelineEra, setTimelineEra] = useState<number>(1000); // Year CE (400 to 1600)
  const [animatedPulse, setAnimatedPulse] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedWave =
    ISOGLOSS_WAVES.find((w) => w.id === selectedWaveId) ?? ISOGLOSS_WAVES[0];

  const waveColors: Record<string, string> = {
    'wave-high-german': '#9E2A2B',    // Oxblood
    'wave-ingvaeonic': '#2D516B',     // Iron gall blue
    'wave-syncope': '#255D36',        // Moss green
    'wave-clitic-article': '#8F581B', // Amber
    'wave-hanseatic-trade': '#57534E',// Stone charcoal
  };

  // Continuous subtle pulse animation for isogloss waves
  useEffect(() => {
    let animId: number;
    let t = 0;
    const loop = () => {
      t += 0.025;
      setAnimatedPulse(t);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const toggleWave = (id: string) => {
    setActiveWaveIds((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id],
    );
  };

  // Render Topographical Wave Map
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Warm parchment ground
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw topographic elevation contour rings across the entire map
    ctx.save();
    ctx.strokeStyle = '#EDE7DE';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);

    const center = { x: width / 2, y: height / 2 };
    [100, 200, 300, 400, 500].forEach((r) => {
      ctx.beginPath();
      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();

    // 2. Plot Language Positions (Mapped onto geographic/dialect space)
    const langScreenCoords = new Map<string, { x: number; y: number; name: string }>();

    GALLERY_LANGUAGES.forEach((lang) => {
      // Map linguisticPos onto canvas coordinates
      const sx = width / 2 + lang.linguisticPos.x * 4.2;
      const sy = height / 2 + lang.linguisticPos.y * 3.6;
      langScreenCoords.set(lang.code, { x: sx, y: sy, name: lang.name });
    });

    // 3. Draw Active Isogloss Waves (Rippling interference envelopes)
    ISOGLOSS_WAVES.forEach((wave) => {
      if (!activeWaveIds.includes(wave.id)) return;

      const isSelected = wave.id === selectedWaveId;
      const color = waveColors[wave.id] || '#57534E';

      // Wave origin in screen coordinates
      const ox = width / 2 + wave.epicenterCoord.x * 4.2;
      const oy = height / 2 + wave.epicenterCoord.y * 3.6;

      const baseRadius = wave.radius * 3.4;

      ctx.save();

      // Render 4 concentric ripple rings per active wave
      const rings = [0.35, 0.65, 0.85, 1.0];
      rings.forEach((factor, rIdx) => {
        const pulseOffset = Math.sin(animatedPulse + rIdx * 1.5) * 4;
        const currentR = baseRadius * factor + (isSelected ? pulseOffset : 0);

        ctx.beginPath();
        ctx.arc(ox, oy, Math.max(10, currentR), 0, Math.PI * 2);

        if (factor === 1.0) {
          // Outermost isogloss boundary
          ctx.strokeStyle = color;
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.setLineDash(isSelected ? [] : [4, 4]);
          ctx.stroke();

          // Subtle gradient fill for active interference zone
          ctx.fillStyle = `${color}14`; // 8% opacity fill
          ctx.fill();
        } else {
          // Inner ripples
          ctx.strokeStyle = `${color}40`; // 25% opacity
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 5]);
          ctx.stroke();
        }
      });

      // Wave Epicenter Indicator (Star / Compass rose)
      ctx.beginPath();
      ctx.arc(ox, oy, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#FAF8F5';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Epicenter Label
      ctx.font = '600 10px "Noto Sans", sans-serif';
      ctx.fillStyle = color;
      ctx.fillText(wave.name.split(' (')[0], ox + 7, oy - 6);

      ctx.restore();
    });

    // 4. Render Language Nodes (Illuminated if inside active waves)
    langScreenCoords.forEach((coord, code) => {
      // Check which active waves encompass this language
      const participatingWaves = ISOGLOSS_WAVES.filter(
        (w) => activeWaveIds.includes(w.id) && w.affectedLanguages.includes(code),
      );
      const isEncompassed = participatingWaves.length > 0;
      const isSelectedWaveTarget = selectedWave.affectedLanguages.includes(code);

      ctx.save();

      // Glow halo if participating in selected wave
      if (isSelectedWaveTarget) {
        ctx.beginPath();
        ctx.arc(coord.x, coord.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = `${waveColors[selectedWaveId]}20`;
        ctx.fill();
        ctx.strokeStyle = waveColors[selectedWaveId];
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
      }

      // Main Node Disc
      ctx.beginPath();
      ctx.arc(coord.x, coord.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = isSelectedWaveTarget
        ? '#FAF8F5'
        : isEncompassed
        ? '#EDE7DE'
        : '#F3EFEA';
      ctx.fill();

      ctx.strokeStyle = isSelectedWaveTarget
        ? waveColors[selectedWaveId]
        : '#57534E';
      ctx.lineWidth = isSelectedWaveTarget ? 2.5 : 1.5;
      ctx.setLineDash([]);
      ctx.stroke();

      // Language Code
      ctx.font = 'bold 11px "Noto Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isSelectedWaveTarget
        ? waveColors[selectedWaveId]
        : '#1C1917';
      ctx.fillText(code.toUpperCase(), coord.x, coord.y);

      // Language Name Label
      ctx.font = '500 11px "Noto Sans", sans-serif';
      ctx.fillStyle = isSelectedWaveTarget ? '#1C1917' : '#78716C';
      ctx.fillText(coord.name, coord.x, coord.y + 22);

      // Active wave count subscript badge
      if (participatingWaves.length > 0) {
        ctx.font = 'bold 9px "Noto Sans", sans-serif';
        ctx.fillStyle = '#255D36';
        ctx.fillText(`+${participatingWaves.length} waves`, coord.x, coord.y + 34);
      }

      ctx.restore();
    });
  }, [
    activeWaveIds,
    selectedWaveId,
    animatedPulse,
    selectedWave,
    waveColors,
  ]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      renderCanvas();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  return (
    <div className="space-y-4">
      {/* Control Plate: Wave Toggles & Historical Slider */}
      <div className="border border-book-rule bg-page-surface p-3 sm:p-4 rounded-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Timeline Slider */}
        <div className="flex items-center gap-3">
          <span className="typo-sublabel text-ink-muted">Historical Era:</span>
          <div className="flex items-center gap-2">
            <span className="typo-subscript text-2xs font-mono text-ink-muted">400 CE</span>
            <input
              type="range"
              min={400}
              max={1600}
              step={100}
              value={timelineEra}
              onChange={(e) => setTimelineEra(Number(e.target.value))}
              className="w-32 sm:w-44 accent-ink-main cursor-pointer"
            />
            <span className="typo-subscript text-2xs font-mono text-ink-main font-semibold">
              c. {timelineEra} CE
            </span>
          </div>
        </div>

        {/* Isogloss Wave Multi-Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="typo-sublabel text-ink-muted">Active Shifts:</span>
          {ISOGLOSS_WAVES.map((wave) => {
            const isActive = activeWaveIds.includes(wave.id);
            const isSelected = selectedWaveId === wave.id;
            const color = waveColors[wave.id];

            return (
              <button
                key={wave.id}
                type="button"
                onClick={() => {
                  toggleWave(wave.id);
                  setSelectedWaveId(wave.id);
                }}
                className={`px-2 py-0.5 rounded-xs typo-subscript font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                  isSelected
                    ? 'border-ink-main bg-page-surface text-ink-main font-bold shadow-2xs'
                    : isActive
                    ? 'border-book-rule bg-page-muted/40 text-ink-main font-semibold'
                    : 'border-book-rule/60 text-ink-muted/60 opacity-60 hover:opacity-100'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: color }}
                />
                {wave.name.split(' (')[0].replace('Consonant ', '')}
                {isActive && (
                  <MaterialSymbol icon="check" size={12} className="text-cognate-ink" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Canvas & Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Isogloss Canvas */}
        <div
          ref={containerRef}
          className="lg:col-span-8 relative h-[560px] border border-book-rule bg-page-surface overflow-hidden shadow-xs select-none"
        >
          <canvas ref={canvasRef} className="w-full h-full cursor-default" />

          {/* Legend */}
          <div className="absolute top-3 left-3 bg-page-surface/90 border border-book-rule/80 px-2.5 py-1.5 rounded-xs backdrop-blur-xs text-ink-muted pointer-events-none space-y-0.5">
            <span className="typo-overline block text-ink-main">
              Sound Shift Waves
            </span>
            <span className="typo-subscript block text-2xs">
              Rings show how sound shifts spread from an origin to neighboring dialects
            </span>
          </div>

          {/* Quick HUD Hint */}
          <div className="absolute bottom-3 left-3 bg-page-surface/90 border border-book-rule/80 px-3 py-1 rounded-xs backdrop-blur-xs text-ink-muted pointer-events-none">
            <span className="typo-subscript text-2xs">
              Highlighted languages adopted this shift: {selectedWave.name}
            </span>
          </div>
        </div>

        {/* Selected Wave Drawer */}
        <div className="lg:col-span-4 border border-book-rule bg-page-surface p-4 sm:p-5 rounded-xs space-y-4 shadow-xs">
          <div className="border-b border-book-rule pb-3">
            <div className="flex items-center justify-between">
              <span className="typo-overline text-ink-muted">
                Sound Shift Details
              </span>
              <span className="typo-subscript font-mono text-ink-muted text-2xs">
                {selectedWave.historicalPeriod}
              </span>
            </div>

            <h3 className="typo-section-header text-ink-main mt-1">
              {selectedWave.name}
            </h3>
            <span className="typo-subscript text-ink-muted block mt-0.5">
              Origin: <strong className="text-ink-main font-semibold">{selectedWave.epicenter}</strong>
            </span>

            {/* Sound Change Rule */}
            <div className="mt-2.5 p-2.5 bg-page-muted/50 border border-book-rule rounded-xs">
              <span className="typo-overline text-2xs text-ink-main block">Sound Change Rule</span>
              <code className="typo-metric text-xs text-falsefriend-ink font-bold block mt-0.5">
                {selectedWave.phonologicalRule}
              </code>
            </div>

            <p className="typo-body text-xs text-ink-muted mt-2 leading-relaxed">
              {selectedWave.description}
            </p>
          </div>

          {/* Example Words */}
          <div className="space-y-2">
            <span className="typo-sublabel block font-semibold text-ink-main">
              Example Words
            </span>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {selectedWave.specimenPairs.map((pair, idx) => (
                <div
                  key={idx}
                  className="border border-book-rule bg-page-muted/15 p-2.5 rounded-xs space-y-1.5"
                >
                  <strong className="typo-headword-row text-xs text-ink-main block">
                    {pair.word}
                  </strong>
                  <div className="space-y-1 text-2xs">
                    <div className="flex items-baseline gap-1.5">
                      <span className="typo-subscript font-bold text-falsefriend-ink shrink-0">
                        Shifted:
                      </span>
                      <span className="typo-definition text-ink-main font-semibold truncate">
                        {pair.shifted}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="typo-subscript font-bold text-cognate-ink shrink-0">
                        Unchanged:
                      </span>
                      <span className="typo-definition text-ink-muted truncate">
                        {pair.unshifted}
                      </span>
                    </div>
                  </div>
                  <p className="typo-note text-2xs text-ink-muted/80 italic border-t border-book-rule/30 pt-1">
                    {pair.note}
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
