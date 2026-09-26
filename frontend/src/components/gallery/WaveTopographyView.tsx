import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MaterialSymbol } from '../common/MaterialSymbol';
import {
  ISOGLOSS_WAVES,
  GALLERY_LANGUAGES,
} from './galleryData';

// Historical start years for each wave to connect to the timeline slider
const WAVE_CHRONOLOGY: Record<string, { startYear: number; peakYear: number }> = {
  'wave-ingvaeonic': { startYear: 450, peakYear: 600 },
  'wave-high-german': { startYear: 550, peakYear: 750 },
  'wave-syncope': { startYear: 650, peakYear: 850 },
  'wave-clitic-article': { startYear: 850, peakYear: 1050 },
  'wave-hanseatic-trade': { startYear: 1200, peakYear: 1400 },
};

export const WaveTopographyView: React.FC = () => {
  const [selectedWaveId, setSelectedWaveId] = useState<string>('wave-high-german');
  const [timelineEra, setTimelineEra] = useState<number>(950); // Year CE (400 to 1600)
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [zoom, setZoom] = useState(0.85); // Scaled so all languages including Icelandic fit without clipping
  const [pan, setPan] = useState({ x: 0, y: 15 });
  const [animatedPulse, setAnimatedPulse] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const selectedWave =
    ISOGLOSS_WAVES.find((w) => w.id === selectedWaveId) ?? ISOGLOSS_WAVES[0];

  const waveColors: Record<string, string> = {
    'wave-high-german': '#9E2A2B',    // Oxblood
    'wave-ingvaeonic': '#2D516B',     // Iron gall blue
    'wave-syncope': '#255D36',        // Moss green
    'wave-clitic-article': '#8F581B', // Amber
    'wave-hanseatic-trade': '#57534E',// Stone charcoal
  };

  // Determine which waves are active at current timelineEra
  const activeWaves = ISOGLOSS_WAVES.filter((wave) => {
    const chrono = WAVE_CHRONOLOGY[wave.id] ?? { startYear: 400, peakYear: 800 };
    return timelineEra >= chrono.startYear;
  });

  // Continuous subtle pulse animation
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

  // Timeline auto-play
  useEffect(() => {
    if (!isPlayingTimeline) return;
    const interval = setInterval(() => {
      setTimelineEra((prev) => {
        if (prev >= 1550) {
          setIsPlayingTimeline(false);
          return 400;
        }
        return prev + 25;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isPlayingTimeline]);

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

    ctx.save();
    // Apply pan and zoom
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
    ctx.scale(zoom, zoom);

    // 1. Draw topographic elevation contour rings
    ctx.strokeStyle = '#EDE7DE';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);

    [80, 160, 240, 320, 400].forEach((r) => {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // 2. Plot Language Positions using comfortable scaled spacing (scaled down so Icelandic doesn't clip)
    const langScreenCoords = new Map<string, { x: number; y: number; name: string }>();

    GALLERY_LANGUAGES.forEach((lang) => {
      // Scaled multiplier (2.4 instead of 4.2) guarantees all languages fit comfortably
      const sx = lang.linguisticPos.x * 2.5;
      const sy = lang.linguisticPos.y * 2.3;
      langScreenCoords.set(lang.code, { x: sx, y: sy, name: lang.name });
    });

    // 3. Draw Active Isogloss Waves at current timelineEra
    activeWaves.forEach((wave) => {
      const isSelected = wave.id === selectedWaveId;
      const color = waveColors[wave.id] || '#57534E';
      const chrono = WAVE_CHRONOLOGY[wave.id] ?? { startYear: 400, peakYear: 800 };

      // Calculate wave expansion progress based on current year
      const yearsSinceStart = Math.max(0, timelineEra - chrono.startYear);
      const expansionFactor = Math.min(1.0, Math.max(0.15, yearsSinceStart / 250));

      const ox = wave.epicenterCoord.x * 2.5;
      const oy = wave.epicenterCoord.y * 2.3;
      const currentMaxRadius = wave.radius * 2.6 * expansionFactor;

      ctx.save();

      // Render concentric ripple rings
      const rings = [0.35, 0.65, 0.85, 1.0];
      rings.forEach((factor, rIdx) => {
        const pulseOffset = Math.sin(animatedPulse + rIdx * 1.5) * 3;
        const currentR = currentMaxRadius * factor + (isSelected ? pulseOffset : 0);

        ctx.beginPath();
        ctx.arc(ox, oy, Math.max(8, currentR), 0, Math.PI * 2);

        if (factor === 1.0) {
          ctx.strokeStyle = color;
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.setLineDash(isSelected ? [] : [4, 4]);
          ctx.stroke();

          ctx.fillStyle = `${color}14`;
          ctx.fill();
        } else {
          ctx.strokeStyle = `${color}40`;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 5]);
          ctx.stroke();
        }
      });

      // Wave Epicenter Indicator
      ctx.beginPath();
      ctx.arc(ox, oy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#FAF8F5';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Epicenter Label
      ctx.font = '600 10px "Noto Sans", sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(wave.name.split(' (')[0], ox + 7, oy - 6);

      ctx.restore();
    });

    // 4. Render Language Nodes
    langScreenCoords.forEach((coord, code) => {
      const participatingWaves = activeWaves.filter((w) => w.affectedLanguages.includes(code));
      const isEncompassed = participatingWaves.length > 0;
      const isSelectedWaveTarget = selectedWave.affectedLanguages.includes(code);

      ctx.save();

      // Halo if affected by selected wave
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
      ctx.arc(coord.x, coord.y, 15, 0, Math.PI * 2);
      ctx.fillStyle = isSelectedWaveTarget ? '#FAF8F5' : isEncompassed ? '#EDE7DE' : '#F3EFEA';
      ctx.fill();

      ctx.strokeStyle = isSelectedWaveTarget ? waveColors[selectedWaveId] : '#57534E';
      ctx.lineWidth = isSelectedWaveTarget ? 2.5 : 1.5;
      ctx.stroke();

      // Language Code
      ctx.font = 'bold 11px "Noto Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isSelectedWaveTarget ? waveColors[selectedWaveId] : '#1C1917';
      ctx.fillText(code.toUpperCase(), coord.x, coord.y);

      // Language Name Label
      ctx.font = '500 11px "Noto Sans", sans-serif';
      ctx.fillStyle = '#1C1917';
      ctx.fillText(coord.name, coord.x, coord.y + 24);

      ctx.restore();
    });

    ctx.restore(); // Restore pan and zoom transform
  }, [selectedWaveId, timelineEra, zoom, pan, animatedPulse, activeWaves, selectedWave]);

  // Handle Resize and Canvas DPI
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

  // Pointer drag for panning
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.001;
    setZoom((prev) => Math.max(0.5, Math.min(2.0, prev + zoomDelta)));
  };

  return (
    <div className="space-y-4 font-serif">
      {/* Feasibility Advisory Callout */}
      <div className="border border-book-rule bg-page-muted/30 p-3 sm:p-3.5 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <MaterialSymbol icon="warning_amber" size={20} className="text-shifted-ink shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink-main">Exploratory Prototype · Feasibility Note</span>
              <span className="px-1.5 py-0.2 bg-page-surface border border-book-rule rounded-xs typo-subscript text-2xs text-shifted-ink font-medium">
                High Data Friction
              </span>
            </div>
            <p className="text-ink-muted leading-relaxed">
              Wave models require geographical dialect boundaries that do not exist in standard dictionary databases. They are branch-specific and do not easily generalize across unrelated language families.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 bg-page-surface px-2.5 py-1 border border-book-rule rounded-xs text-2xs text-ink-muted">
          <span>Clipping Fixed</span>
          <span className="text-book-rule">•</span>
          <span>Timeline Connected</span>
        </div>
      </div>

      {/* Control Plate: Interactive Time Slider and Wave Picker */}
      <div className="border border-book-rule bg-page-surface p-3.5 sm:p-4 rounded-xs space-y-3">
        {/* Working Timeline Slider */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
              className="px-2.5 py-1 rounded-xs border border-ink-main bg-page-surface hover:bg-page-muted typo-sublabel font-medium text-ink-main inline-flex items-center gap-1 cursor-pointer"
            >
              <MaterialSymbol icon={isPlayingTimeline ? 'pause' : 'play_arrow'} size={16} />
              <span>{isPlayingTimeline ? 'Pause' : 'Play'}</span>
            </button>

            <span className="typo-sublabel text-ink-muted">
              Historical Timeline:
            </span>
            <strong className="typo-metric font-bold text-ink-main text-sm">
              c. {timelineEra} CE
            </strong>
            <span className="typo-subscript text-2xs text-ink-muted">
              ({activeWaves.length} of {ISOGLOSS_WAVES.length} shifts occurred)
            </span>
          </div>

          {/* Zoom and Pan Reset Controls */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="typo-sublabel text-ink-muted mr-1">Zoom:</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
              className="w-7 h-7 flex items-center justify-center border border-book-rule bg-page-bg hover:bg-page-muted rounded-xs cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
              className="w-7 h-7 flex items-center justify-center border border-book-rule bg-page-bg hover:bg-page-muted rounded-xs cursor-pointer"
              title="Zoom Out"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(0.85);
                setPan({ x: 0, y: 15 });
              }}
              className="px-2 py-1 border border-book-rule bg-page-bg hover:bg-page-muted rounded-xs typo-subscript text-ink-muted cursor-pointer"
            >
              Reset View
            </button>
          </div>
        </div>

        {/* Range Slider */}
        <div className="flex items-center gap-3 pt-1">
          <span className="typo-subscript font-mono text-2xs text-ink-muted">400 CE</span>
          <input
            type="range"
            min={400}
            max={1600}
            step={25}
            value={timelineEra}
            onChange={(e) => setTimelineEra(Number(e.target.value))}
            className="w-full h-1.5 bg-book-rule rounded-lg appearance-none cursor-pointer accent-ink-main"
          />
          <span className="typo-subscript font-mono text-2xs text-ink-muted">1600 CE</span>
        </div>

        {/* Active Waves Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-book-rule/60 text-xs">
          <span className="typo-sublabel text-ink-muted">Sound Shifts:</span>
          {ISOGLOSS_WAVES.map((wave) => {
            const chrono = WAVE_CHRONOLOGY[wave.id] ?? { startYear: 400 };
            const isOccurred = timelineEra >= chrono.startYear;
            const isSelected = selectedWaveId === wave.id;

            return (
              <button
                key={wave.id}
                type="button"
                onClick={() => {
                  setSelectedWaveId(wave.id);
                  if (!isOccurred) {
                    setTimelineEra(chrono.startYear + 50);
                  }
                }}
                className={`px-2.5 py-1 rounded-xs typo-subscript font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
                  isSelected
                    ? 'border-ink-main bg-ink-main text-page-bg font-semibold shadow-2xs'
                    : isOccurred
                    ? 'border-book-rule bg-page-surface text-ink-main hover:bg-page-muted'
                    : 'border-dashed border-book-rule text-ink-muted opacity-60 hover:opacity-100'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: waveColors[wave.id] || '#57534E' }}
                />
                <span>{wave.name.split(' (')[0]}</span>
                <span className="text-2xs opacity-75 font-mono">c. {chrono.startYear}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Canvas Stage */}
        <div
          ref={containerRef}
          className="lg:col-span-8 relative h-[560px] border border-book-rule bg-page-surface overflow-hidden shadow-xs select-none"
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          />

          {/* Pan / Zoom Instructions Overlay */}
          <div className="absolute bottom-3 left-3 bg-page-surface/90 border border-book-rule/80 px-2.5 py-1 rounded-xs backdrop-blur-xs text-ink-muted text-2xs pointer-events-none">
            Drag to pan map · Scroll or use + / - to zoom
          </div>

          <div className="absolute top-3 left-3 bg-page-surface/90 border border-book-rule/80 px-2.5 py-1 rounded-xs backdrop-blur-xs text-ink-muted text-2xs pointer-events-none">
            <strong className="text-ink-main">{selectedWave.name}</strong> · Reach at c. {timelineEra} CE
          </div>
        </div>

        {/* Selected Wave Dossier */}
        <div className="lg:col-span-4 border border-book-rule bg-page-surface p-4 sm:p-5 rounded-xs space-y-4 shadow-xs">
          <div className="border-b border-book-rule pb-3 space-y-1">
            <span className="typo-overline block" style={{ color: waveColors[selectedWaveId] }}>
              Historical Sound Shift
            </span>
            <h3 className="typo-section-header text-ink-main">
              {selectedWave.name}
            </h3>
            <p className="typo-gloss text-xs text-ink-muted">
              {selectedWave.historicalPeriod} · Origin: {selectedWave.epicenter}
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <span className="typo-sublabel block font-semibold text-ink-main">
              Phonological Rule
            </span>
            <div className="p-2.5 bg-page-muted/40 border border-book-rule rounded-xs font-mono text-xs text-ink-main">
              {selectedWave.phonologicalRule}
            </div>
            <p className="typo-body text-xs text-ink-muted leading-relaxed">
              {selectedWave.description}
            </p>
          </div>

          {/* Affected vs Unaffected Languages */}
          <div className="space-y-2 text-xs pt-2 border-t border-book-rule">
            <span className="typo-sublabel block font-semibold text-ink-main">
              Language Exposure
            </span>
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2 p-2 bg-page-muted/20 border border-book-rule rounded-xs">
                <span className="text-ink-main font-medium">Adopted Shift:</span>
                <span className="font-semibold" style={{ color: waveColors[selectedWaveId] }}>
                  {selectedWave.affectedLanguages.map((c) => c.toUpperCase()).join(', ')}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 p-2 bg-page-bg border border-book-rule rounded-xs">
                <span className="text-ink-muted">Kept Older Sound:</span>
                <span className="text-ink-muted font-medium">
                  {GALLERY_LANGUAGES.filter((l) => !selectedWave.affectedLanguages.includes(l.code))
                    .map((l) => l.code.toUpperCase())
                    .join(', ')}
                </span>
              </div>
            </div>
          </div>

          {/* Specimen Pairs */}
          <div className="space-y-2 text-xs pt-2 border-t border-book-rule">
            <span className="typo-sublabel block font-semibold text-ink-main">
              Attested Sound Shift Examples
            </span>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {selectedWave.specimenPairs.map((pair, idx) => (
                <div key={idx} className="p-2 border border-book-rule/60 bg-page-muted/10 rounded-xs space-y-0.5">
                  <strong className="typo-headword-row text-xs text-ink-main block">
                    {pair.word}
                  </strong>
                  <div className="text-2xs text-ink-muted leading-snug">
                    <span className="font-medium text-ink-main">Shifted:</span> {pair.shifted}
                  </div>
                  <div className="text-2xs text-ink-muted leading-snug">
                    <span className="font-medium text-ink-main">Unshifted:</span> {pair.unshifted}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
