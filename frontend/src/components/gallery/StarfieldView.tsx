import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { MaterialSymbol } from '../common/MaterialSymbol';
import {
  PROTO_ROOT_STARS,
  GALLERY_LANGUAGES,
  type ProtoRootStar,
  type RootConstellation,
} from './galleryData';
import {
  celestialToCartesian,
  project3D,
  renderCelestialGraticules,
  DEFAULT_CAMERA,
  type CameraState,
} from './Canvas3D';
import { Phonetic } from '../common/Phonetic';

type StarfieldDimension = '2d' | '3d';

const CONSTELLATION_COLORS: Record<RootConstellation, string> = {
  'Cosmos & Elements': '#2D516B',
  'Kinship & Person': '#8F581B',
  'Living World & Body': '#255D36',
  'Vital Action': '#9E2A2B',
  'Material & Craft': '#57534E',
};

export const StarfieldView: React.FC = () => {
  const [dimension, setDimension] = useState<StarfieldDimension>('3d');
  const [activeConstellation, setActiveConstellation] = useState<string>('all');
  const [lensSource, setLensSource] = useState<string>('sv');
  const [lensTarget, setLensTarget] = useState<string>('en');
  const [selectedStarId, setSelectedStarId] = useState<string>('root-giftiz');
  const [hoveredStarId, setHoveredStarId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [camera, setCamera] = useState<CameraState>({ ...DEFAULT_CAMERA, yaw: 0.85, pitch: 0.22, zoom: 1.1 });

  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Filter stars by constellation
  const filteredStars = useMemo(() => {
    if (activeConstellation === 'all') return PROTO_ROOT_STARS;
    return PROTO_ROOT_STARS.filter((s) => s.constellation === activeConstellation);
  }, [activeConstellation]);

  // Selected star details
  const selectedStar = useMemo(() => {
    return PROTO_ROOT_STARS.find((s) => s.id === selectedStarId) ?? PROTO_ROOT_STARS[0];
  }, [selectedStarId]);

  // Determine spectral status for a star under current lens
  const getStarSpectralStatus = useCallback(
    (star: ProtoRootStar): { status: 'cognate' | 'shifted' | 'archaic_loss'; color: string; label: string } => {
      const srcDaughter = star.daughters[lensSource];
      const tgtDaughter = star.daughters[lensTarget];

      if (!srcDaughter || !tgtDaughter) {
        return { status: 'archaic_loss', color: '#A8A29E', label: 'Unrecorded' };
      }

      if (srcDaughter.status === 'archaic_loss' || tgtDaughter.status === 'archaic_loss') {
        return { status: 'archaic_loss', color: '#78716C', label: 'Lexical Loss / Replaced' };
      }

      if (srcDaughter.status === 'shifted' || tgtDaughter.status === 'shifted') {
        return { status: 'shifted', color: '#9E2A2B', label: 'Semantic Drift / False Friend' };
      }

      return { status: 'cognate', color: '#255D36', label: 'Conserved True Cognate' };
    },
    [lensSource, lensTarget],
  );

  // Render Starfield Canvas
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

    // 1. Draw subtle background celestial coordinate rings
    if (dimension === '3d') {
      renderCelestialGraticules(ctx, width, height, camera, 220, 'rgba(216, 209, 198, 0.45)', 'rgba(143, 88, 27, 0.35)');
    } else {
      // 2D celestial field chart rings
      ctx.save();
      ctx.strokeStyle = '#E8E2D8';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);

      const center = { x: width / 2, y: height / 2 };
      [80, 160, 240, 320].forEach((r) => {
        ctx.beginPath();
        ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(center.x - 340, center.y);
      ctx.lineTo(center.x + 340, center.y);
      ctx.moveTo(center.x, center.y - 340);
      ctx.lineTo(center.x, center.y + 340);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Project stars
    const sphereRadius = 220;
    const projectedStars = filteredStars.map((star) => {
      if (dimension === '3d') {
        const cartesian = celestialToCartesian(star.celestial.ra, star.celestial.dec, sphereRadius);
        const proj = project3D(cartesian, width, height, camera);
        return {
          ...star,
          screenX: proj.x2d,
          screenY: proj.y2d,
          scale: proj.scale,
          depth: proj.depth,
          visible: proj.visible,
        };
      } else {
        // 2D polar projection from celestial coordinates
        const raRad = (star.celestial.ra * Math.PI) / 180;
        const decDist = (90 - star.celestial.dec) * 2.4;
        return {
          ...star,
          screenX: width / 2 + decDist * Math.cos(raRad),
          screenY: height / 2 + decDist * Math.sin(raRad),
          scale: 1,
          depth: 0,
          visible: true,
        };
      }
    });

    // 3. Draw Constellation Arteries (Lines connecting stars of same constellation)
    const starsByConstellation = new Map<RootConstellation, typeof projectedStars>();
    projectedStars.forEach((s) => {
      const list = starsByConstellation.get(s.constellation) || [];
      list.push(s);
      starsByConstellation.set(s.constellation, list);
    });

    starsByConstellation.forEach((stars, constellationName) => {
      if (stars.length < 2) return;
      ctx.save();
      ctx.strokeStyle = CONSTELLATION_COLORS[constellationName] || 'rgba(120, 113, 108, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.globalAlpha = 0.35;

      ctx.beginPath();
      for (let i = 0; i < stars.length - 1; i++) {
        const a = stars[i];
        const b = stars[i + 1];
        if (a.visible && b.visible) {
          ctx.moveTo(a.screenX, a.screenY);
          ctx.lineTo(b.screenX, b.screenY);
        }
      }
      ctx.stroke();
      ctx.restore();
    });

    // 4. Draw Stars (Sorted by depth)
    const sortedStars = [...projectedStars].sort((a, b) => b.depth - a.depth);

    sortedStars.forEach((star) => {
      if (!star.visible) return;

      const spectral = getStarSpectralStatus(star);
      const isSelected = selectedStarId === star.id;
      const isHovered = hoveredStarId === star.id;

      const baseStarRadius = (4.5 / star.celestial.magnitude) * (dimension === '3d' ? star.scale : 1);
      const starRadius = Math.max(3, Math.min(14, baseStarRadius));

      ctx.save();

      // Atmospheric Halo for Selected or Shifted star
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(star.screenX, star.screenY, starRadius + 7, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(37, 93, 54, 0.2)' : 'rgba(87, 83, 78, 0.12)';
        ctx.fill();
        ctx.strokeStyle = spectral.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
      }

      // Star Core
      ctx.beginPath();
      ctx.arc(star.screenX, star.screenY, starRadius, 0, Math.PI * 2);
      ctx.fillStyle = spectral.color;
      ctx.fill();
      ctx.strokeStyle = '#FAF8F5';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Star Cross / Flare (Naturalist star symbol for high-magnitude roots)
      if (star.celestial.magnitude <= 1.1) {
        ctx.strokeStyle = spectral.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(star.screenX - starRadius - 4, star.screenY);
        ctx.lineTo(star.screenX + starRadius + 4, star.screenY);
        ctx.moveTo(star.screenX, star.screenY - starRadius - 4);
        ctx.lineTo(star.screenX, star.screenY + starRadius + 4);
        ctx.stroke();
      }

      // Root Headword Label
      ctx.font = `600 ${Math.max(9, Math.round(11 * (dimension === '3d' ? star.scale : 1)))}px "Noto Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isSelected ? '#1C1917' : '#57534E';
      ctx.fillText(star.root, star.screenX, star.screenY + starRadius + 4);

      ctx.restore();
    });
  }, [
    dimension,
    filteredStars,
    selectedStarId,
    hoveredStarId,
    camera,
    getStarSpectralStatus,
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

  // Mouse & Touch Orbit Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const hitStar = filteredStars.find((star) => {
      let x = 0;
      let y = 0;
      if (dimension === '3d') {
        const cartesian = celestialToCartesian(star.celestial.ra, star.celestial.dec, 220);
        const proj = project3D(cartesian, rect.width, rect.height, camera);
        x = proj.x2d;
        y = proj.y2d;
      } else {
        const raRad = (star.celestial.ra * Math.PI) / 180;
        const decDist = (90 - star.celestial.dec) * 2.4;
        x = rect.width / 2 + decDist * Math.cos(raRad);
        y = rect.height / 2 + decDist * Math.sin(raRad);
      }
      return Math.hypot(mouseX - x, mouseY - y) <= 12;
    });

    if (hitStar) {
      setHoveredStarId(hitStar.id);
    } else if (hoveredStarId !== null) {
      setHoveredStarId(null);
    }

    if (isDraggingRef.current && dimension === '3d') {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      setCamera((prev) => ({
        ...prev,
        yaw: prev.yaw + dx * 0.007,
        pitch: Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, prev.pitch + dy * 0.007)),
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const hitStar = filteredStars.find((star) => {
      let x = 0;
      let y = 0;
      if (dimension === '3d') {
        const cartesian = celestialToCartesian(star.celestial.ra, star.celestial.dec, 220);
        const proj = project3D(cartesian, rect.width, rect.height, camera);
        x = proj.x2d;
        y = proj.y2d;
      } else {
        const raRad = (star.celestial.ra * Math.PI) / 180;
        const decDist = (90 - star.celestial.dec) * 2.4;
        x = rect.width / 2 + decDist * Math.cos(raRad);
        y = rect.height / 2 + decDist * Math.sin(raRad);
      }
      return Math.hypot(mouseX - x, mouseY - y) <= 12;
    });

    if (hitStar) {
      setSelectedStarId(hitStar.id);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (dimension !== '3d') return;
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0012;
    setCamera((prev) => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(2.4, prev.zoom + zoomDelta)),
    }));
  };

  const selectedSpectral = getStarSpectralStatus(selectedStar);

  return (
    <div className="space-y-4">
      {/* Control Plate: Constellations & Spectral Lens */}
      <div className="border border-book-rule bg-page-surface p-3 sm:p-4 rounded-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Projection & Constellation Filter */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Projection Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="typo-sublabel text-ink-muted">Projection:</span>
            <div className="inline-flex items-center border border-book-rule bg-page-muted/40 p-0.5 rounded-xs">
              <button
                type="button"
                onClick={() => setDimension('2d')}
                className={`px-2.5 py-1 rounded-xs typo-sublabel font-medium transition-all cursor-pointer ${
                  dimension === '2d'
                    ? 'bg-page-surface border border-book-rule-strong text-ink-main shadow-2xs font-semibold'
                    : 'text-ink-muted hover:text-ink-main'
                }`}
              >
                2D Star Chart
              </button>
              <button
                type="button"
                onClick={() => setDimension('3d')}
                className={`px-2.5 py-1 rounded-xs typo-sublabel font-medium transition-all cursor-pointer inline-flex items-center gap-1 ${
                  dimension === '3d'
                    ? 'bg-page-surface border border-book-rule-strong text-ink-main shadow-2xs font-semibold'
                    : 'text-ink-muted hover:text-ink-main'
                }`}
              >
                <MaterialSymbol icon="public" size={14} />
                3D Celestial Globe
              </button>
            </div>
          </div>

          {/* Semantic Domain Filter */}
          <div className="flex items-center gap-1.5">
            <span className="typo-sublabel text-ink-muted">Constellation:</span>
            <select
              value={activeConstellation}
              onChange={(e) => setActiveConstellation(e.target.value)}
              className="border-b border-book-rule bg-transparent py-0.5 typo-sublabel text-ink-main focus:border-ink-main focus:outline-none cursor-pointer"
            >
              <option value="all">All Domains (Entire Sky)</option>
              <option value="Cosmos & Elements">Cosmos & Elements</option>
              <option value="Kinship & Person">Kinship & Person</option>
              <option value="Living World & Body">Living World & Body</option>
              <option value="Vital Action">Vital Action</option>
              <option value="Material & Craft">Material & Craft</option>
            </select>
          </div>
        </div>

        {/* Right: Comparative Spectral Filter Lens */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="typo-sublabel text-ink-muted inline-flex items-center gap-1">
            <MaterialSymbol icon="filter_vintage" size={14} className="text-shifted-ink" />
            Spectral Lens:
          </span>
          <div className="inline-flex items-center gap-1.5 bg-page-muted/40 border border-book-rule px-2 py-0.5 rounded-xs">
            <select
              value={lensSource}
              onChange={(e) => setLensSource(e.target.value)}
              className="bg-transparent typo-sublabel text-ink-main font-semibold focus:outline-none cursor-pointer"
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
              className="bg-transparent typo-sublabel text-ink-main font-semibold focus:outline-none cursor-pointer"
            >
              {GALLERY_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {dimension === '3d' && (
            <button
              type="button"
              onClick={() => setCamera({ ...DEFAULT_CAMERA, yaw: 0.85, pitch: 0.22, zoom: 1.1 })}
              className="px-2 py-0.5 border border-book-rule bg-page-surface hover:bg-page-muted rounded-xs typo-subscript text-ink-muted transition-colors cursor-pointer"
            >
              Reset Globe
            </button>
          )}
        </div>
      </div>

      {/* Main Celestial Stage & Specimen Dossier Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Celestial Starfield Canvas */}
        <div
          ref={containerRef}
          className="lg:col-span-8 relative h-[560px] border border-book-rule bg-page-surface overflow-hidden shadow-xs select-none"
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={handleClick}
            onWheel={handleWheel}
            className={`w-full h-full touch-none ${dimension === '3d' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
          />

          {/* Canvas Spectral Key */}
          <div className="absolute top-3 left-3 bg-page-surface/90 border border-book-rule/80 px-2.5 py-1.5 rounded-xs backdrop-blur-xs text-ink-muted pointer-events-none space-y-1">
            <span className="typo-overline block text-ink-main">
              Proto-Germanic Root Celestial Field
            </span>
            <div className="flex items-center gap-3 text-2xs pt-0.5">
              <span className="inline-flex items-center gap-1 text-cognate-ink font-medium">
                <span className="w-2 h-2 rounded-full bg-cognate-ink inline-block"></span>
                Conserved Cognate
              </span>
              <span className="inline-flex items-center gap-1 text-falsefriend-ink font-medium">
                <span className="w-2 h-2 rounded-full bg-falsefriend-ink inline-block"></span>
                Semantic Drift / False Friend
              </span>
              <span className="inline-flex items-center gap-1 text-ink-muted">
                <span className="w-2 h-2 rounded-full bg-stone-400 inline-block"></span>
                Replaced / Lost
              </span>
            </div>
          </div>

          {/* Quick HUD Tip */}
          <div className="absolute bottom-3 left-3 bg-page-surface/90 border border-book-rule/80 px-3 py-1 rounded-xs backdrop-blur-xs text-ink-muted pointer-events-none">
            <span className="typo-subscript text-2xs">
              Click any root star to inspect its daughter forms across all 7 living Germanic languages
            </span>
          </div>
        </div>

        {/* Etymological Root Specimen Plate */}
        <div className="lg:col-span-4 border border-book-rule bg-page-surface p-4 sm:p-5 rounded-xs space-y-4 shadow-xs">
          {/* Header */}
          <div className="border-b border-book-rule pb-3">
            <div className="flex items-center justify-between">
              <span className="typo-overline text-shifted-ink block">
                Etymological Star Dossier
              </span>
              <span
                className={`px-1.5 py-0.5 typo-badge rounded-xs font-semibold text-2xs ${
                  selectedSpectral.status === 'cognate'
                    ? 'bg-cognate-bg text-cognate-ink border border-cognate-border'
                    : selectedSpectral.status === 'shifted'
                    ? 'bg-falsefriend-bg text-falsefriend-ink border border-falsefriend-border'
                    : 'bg-page-muted text-ink-muted border border-book-rule'
                }`}
              >
                {selectedSpectral.label}
              </span>
            </div>

            <div className="mt-1">
              <h2 className="typo-page-title text-ink-main">
                {selectedStar.root}
              </h2>
              <p className="typo-gloss text-ink-main mt-0.5">
                &ldquo;{selectedStar.reconstructedMeaning}&rdquo;
              </p>
              <span className="typo-subscript block text-ink-muted mt-1">
                Domain: <strong className="text-ink-main font-semibold">{selectedStar.constellation}</strong>
              </span>
            </div>

            {/* Commentary */}
            <p className="typo-note text-ink-muted leading-relaxed mt-2.5 pt-2 border-t border-book-rule/40 italic">
              {selectedStar.etymologicalNote}
            </p>
          </div>

          {/* Daughter Forms Across the Germanic Tree */}
          <div className="space-y-2">
            <span className="typo-sublabel block font-semibold text-ink-main">
              Surviving Modern Daughter Forms
            </span>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {Object.entries(selectedStar.daughters).map(([langCode, d]) => {
                const isSource = langCode === lensSource;
                const isTarget = langCode === lensTarget;
                const isHighlighted = isSource || isTarget;

                return (
                  <div
                    key={langCode}
                    className={`border px-2.5 py-2 rounded-xs transition-colors flex items-start justify-between gap-2 ${
                      isHighlighted
                        ? 'border-cognate-border/90 bg-cognate-bg/25 shadow-2xs'
                        : 'border-book-rule/60 bg-page-muted/15'
                    }`}
                  >
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="typo-lang-code font-bold text-2xs">
                          {langCode.toUpperCase()}
                        </span>
                        <strong className="typo-headword-row text-ink-main text-sm">
                          {d.word}
                        </strong>
                        <Phonetic ipa={d.ipa} className="typo-ipa text-2xs" />
                      </div>
                      <span className="typo-gloss text-ink-muted text-xs block mt-0.5">
                        &ldquo;{d.gloss}&rdquo;
                      </span>
                      {d.shiftNote && (
                        <p className="typo-note text-2xs text-falsefriend-ink mt-0.5 italic">
                          {d.shiftNote}
                        </p>
                      )}
                    </div>

                    <span
                      className={`typo-subscript text-2xs px-1 py-0.5 rounded-xs shrink-0 ${
                        d.status === 'cognate'
                          ? 'text-cognate-ink font-medium'
                          : d.status === 'shifted'
                          ? 'text-falsefriend-ink font-medium'
                          : 'text-ink-muted'
                      }`}
                    >
                      {d.status === 'cognate' ? 'Cognate' : d.status === 'shifted' ? 'Shifted' : 'Loss'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
