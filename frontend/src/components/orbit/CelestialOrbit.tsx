import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GERMANIC_LANGUAGES } from '../../data/languages';
import type { LanguageProfile } from '../../types/linguistics';
import type { OrbitRegister, OrbitModality } from './OrbitToolbar';
import { PALETTE, TYPOGRAPHY } from '../../constants/theme';
import { ORBIT_CONFIG } from '../../constants/config';

interface CelestialOrbitProps {
  register: OrbitRegister;
  modality: OrbitModality;
  anchorCode: string;
  isPaused: boolean;
  onSelectLanguage?: (code: string) => void;
}

interface OrbitingBody {
  profile: LanguageProfile;
  angle: number;
  speed: number;
  currentRadius: number;
  targetRadius: number;
  size: number;
  color: string;
  bgColor: string;
}

export const CelestialOrbit: React.FC<CelestialOrbitProps> = ({
  register,
  modality,
  anchorCode,
  isPaused,
  onSelectLanguage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [hoveredBody, setHoveredBody] = useState<OrbitingBody | null>(null);
  const [activeDetails, setActiveDetails] = useState<LanguageProfile | null>(null);

  const anchor = GERMANIC_LANGUAGES.find((l) => l.code === anchorCode) ?? GERMANIC_LANGUAGES[0];

  // Calculate target radius for a language based on register & modality
  const computeDistanceRadius = useCallback(
    (lang: LanguageProfile, maxCanvasRadius: number) => {
      let normDist = 0.5;
      if (register === 'vernacular') {
        normDist = modality === 'phonetic' ? lang.phoneticDistance : lang.spellingDistance;
      } else {
        normDist = lang.academicDistance;
      }

      const minR = ORBIT_CONFIG.MIN_ORBIT_RADIUS_PX;
      const maxR = Math.max(
        minR + ORBIT_CONFIG.RADIUS_SAFETY_PADDING_PX,
        maxCanvasRadius * ORBIT_CONFIG.MAX_RADIUS_CANVAS_RATIO,
      );
      return minR + normDist * (maxR - minR);
    },
    [register, modality],
  );

  // Initialize orbiting bodies
  const bodiesRef = useRef<OrbitingBody[]>([]);

  useEffect(() => {
    const others = GERMANIC_LANGUAGES.filter((l) => l.code !== anchor.code);
    const count = others.length;

    bodiesRef.current = others.map((lang, i) => {
      const isNorth = lang.branch === 'North Germanic';
      const color = isNorth ? PALETTE.SPECIMEN_MOSS : PALETTE.SPECIMEN_OCHRE;
      const bgColor = isNorth ? PALETTE.SPECIMEN_MOSS_ORBIT_AURA : PALETTE.SPECIMEN_OCHRE_ORBIT_AURA;

      const initialRadius =
        ORBIT_CONFIG.INITIAL_RADIUS_BASE_PX + i * ORBIT_CONFIG.INITIAL_RADIUS_STEP_PX;
      const baseAngle = (i / count) * Math.PI * 2;
      const speed =
        (ORBIT_CONFIG.BASE_SPEED_MULTIPLIER + (i % 3) * ORBIT_CONFIG.SPEED_VARIANCE_INCREMENT) *
        (i % 2 === 0 ? 1 : -1);

      return {
        profile: lang,
        angle: baseAngle,
        speed,
        currentRadius: initialRadius,
        targetRadius: initialRadius,
        size:
          ORBIT_CONFIG.SATELLITE_BASE_RADIUS_PX +
          (1 - lang.everydayDistance) * ORBIT_CONFIG.SATELLITE_SIZE_SCALE_FACTOR,
        color,
        bgColor,
      };
    });
  }, [anchor.code]);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = 0;
    let height = 0;

    const updateDimensions = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = Math.max(ORBIT_CONFIG.MIN_CANVAS_HEIGHT_PX, rect.height);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    const render = () => {
      if (!canvas || !ctx) return;

      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(centerX, centerY);

      // Substrate base fill
      ctx.fillStyle = PALETTE.SUBSTRATE_DARK;
      ctx.fillRect(0, 0, width, height);

      // Coordinate crosshairs
      ctx.strokeStyle = PALETTE.BORDER_GRID_FAINT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, ORBIT_CONFIG.CROSSHAIR_EDGE_MARGIN_PX);
      ctx.lineTo(centerX, height - ORBIT_CONFIG.CROSSHAIR_EDGE_MARGIN_PX);
      ctx.moveTo(ORBIT_CONFIG.CROSSHAIR_EDGE_MARGIN_PX, centerY);
      ctx.lineTo(width - ORBIT_CONFIG.CROSSHAIR_EDGE_MARGIN_PX, centerY);
      ctx.stroke();

      // Concentric distance rings
      ORBIT_CONFIG.DISTANCE_RINGS.forEach((step, idx) => {
        const minR = ORBIT_CONFIG.MIN_ORBIT_RADIUS_PX;
        const maxR = maxRadius * ORBIT_CONFIG.MAX_RADIUS_CANVAS_RATIO;
        const r = minR + step * (maxR - minR);

        ctx.beginPath();
        ctx.strokeStyle = idx === 1 ? PALETTE.BORDER_HAIRLINE : PALETTE.BORDER_GRID_DEEP;
        ctx.setLineDash(
          idx % 2 === 0
            ? [...ORBIT_CONFIG.DASH_EVEN_PATTERN]
            : [...ORBIT_CONFIG.DASH_ODD_PATTERN],
        );
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label on horizontal axis
        ctx.font = `${ORBIT_CONFIG.FONT_SIZE_RING_LABEL_PX}px ${TYPOGRAPHY.FONT_MONO}`;
        ctx.fillStyle = PALETTE.INK_AXIS_LABEL;
        ctx.textAlign = 'center';
        ctx.fillText(`δ ${(step * 1.0).toFixed(2)}`, centerX + r, centerY - 6);
      });

      // Update and draw bodies
      bodiesRef.current.forEach((body) => {
        body.targetRadius = computeDistanceRadius(body.profile, maxRadius);
        body.currentRadius +=
          (body.targetRadius - body.currentRadius) * ORBIT_CONFIG.SPRING_LERP_FACTOR;

        if (!isPaused) {
          body.angle += body.speed;
        }

        const x = centerX + Math.cos(body.angle) * body.currentRadius;
        const y = centerY + Math.sin(body.angle) * body.currentRadius;

        // Gravity tether to central anchor
        ctx.beginPath();
        ctx.setLineDash([...ORBIT_CONFIG.TETHER_DASH_PATTERN]);
        ctx.strokeStyle = body.color + PALETTE.TETHER_ALPHA_HEX;
        ctx.lineWidth = ORBIT_CONFIG.TETHER_LINE_WIDTH_PX;
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Orbit path ring for this satellite
        ctx.beginPath();
        ctx.strokeStyle = body.color + PALETTE.ORBIT_PATH_ALPHA_HEX;
        ctx.lineWidth = ORBIT_CONFIG.SATELLITE_ORBIT_RING_WIDTH_PX;
        ctx.arc(centerX, centerY, body.currentRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Satellite body shadow/glow
        ctx.beginPath();
        ctx.arc(x, y, body.size + ORBIT_CONFIG.SATELLITE_AURA_PADDING_PX, 0, Math.PI * 2);
        ctx.fillStyle = body.bgColor;
        ctx.fill();

        // Main body disc
        ctx.beginPath();
        ctx.arc(x, y, body.size, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE.SUBSTRATE_PANEL;
        ctx.strokeStyle = body.color;
        ctx.lineWidth = ORBIT_CONFIG.SATELLITE_BORDER_WIDTH_PX;
        ctx.fill();
        ctx.stroke();

        // Satellite code
        ctx.font = `bold ${ORBIT_CONFIG.FONT_SIZE_SATELLITE_CODE_PX}px ${TYPOGRAPHY.FONT_SERIF}`;
        ctx.fillStyle = PALETTE.INK_CARBON;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(body.profile.code.toUpperCase(), x, y - 2);

        // Satellite vernacular name below
        ctx.font = `${ORBIT_CONFIG.FONT_SIZE_SATELLITE_NAME_PX}px ${TYPOGRAPHY.FONT_SERIF}`;
        ctx.fillStyle = PALETTE.INK_MUTED;
        ctx.fillText(body.profile.name, x, y + body.size + ORBIT_CONFIG.SATELLITE_LABEL_OFFSET_Y_PX);

        // Distance coefficient
        const distValue =
          register === 'vernacular'
            ? modality === 'phonetic'
              ? body.profile.phoneticDistance
              : body.profile.spellingDistance
            : body.profile.academicDistance;

        ctx.font = `${ORBIT_CONFIG.FONT_SIZE_METRIC_PX}px ${TYPOGRAPHY.FONT_MONO}`;
        ctx.fillStyle = body.color;
        ctx.fillText(
          `δ ${distValue.toFixed(2)}`,
          x,
          y + body.size + ORBIT_CONFIG.SATELLITE_DISTANCE_OFFSET_Y_PX,
        );
      });

      // Draw Central Polar Anchor
      const anchorRadius = ORBIT_CONFIG.ANCHOR_RADIUS_PX;
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        anchorRadius + ORBIT_CONFIG.ANCHOR_AURA_OFFSET_PX,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = PALETTE.SPECIMEN_MOSS_ANCHOR_AURA;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, anchorRadius, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.SUBSTRATE_PANEL;
      ctx.strokeStyle = PALETTE.SPECIMEN_MOSS;
      ctx.lineWidth = ORBIT_CONFIG.ANCHOR_BORDER_WIDTH_PX;
      ctx.fill();
      ctx.stroke();

      // Cardinal inner ring on central anchor
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        anchorRadius - ORBIT_CONFIG.ANCHOR_INNER_RING_OFFSET_PX,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = PALETTE.BORDER_HAIRLINE;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Central text
      ctx.font = `bold ${ORBIT_CONFIG.FONT_SIZE_ANCHOR_CODE_PX}px ${TYPOGRAPHY.FONT_SERIF}`;
      ctx.fillStyle = PALETTE.INK_CARBON;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(anchor.code.toUpperCase(), centerX, centerY - 6);

      ctx.font = `italic ${ORBIT_CONFIG.FONT_SIZE_ANCHOR_SUB_PX}px ${TYPOGRAPHY.FONT_SERIF}`;
      ctx.fillStyle = PALETTE.SPECIMEN_MOSS;
      ctx.fillText(
        anchor.taxonomicName.split(' ')[1] || anchor.name,
        centerX,
        centerY + 10,
      );

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [anchor, register, modality, isPaused, computeDistanceRadius]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    let found: OrbitingBody | null = null;
    bodiesRef.current.forEach((body) => {
      const bx = centerX + Math.cos(body.angle) * body.currentRadius;
      const by = centerY + Math.sin(body.angle) * body.currentRadius;
      const dist = Math.hypot(mx - bx, my - by);
      if (dist <= body.size + ORBIT_CONFIG.SATELLITE_HOVER_HITBOX_PADDING_PX) {
        found = body;
      }
    });

    setHoveredBody(found);
    if (canvas) {
      canvas.style.cursor = found ? 'pointer' : 'default';
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    bodiesRef.current.forEach((body) => {
      const bx = centerX + Math.cos(body.angle) * body.currentRadius;
      const by = centerY + Math.sin(body.angle) * body.currentRadius;
      const dist = Math.hypot(mx - bx, my - by);
      if (dist <= body.size + ORBIT_CONFIG.SATELLITE_HOVER_HITBOX_PADDING_PX) {
        setActiveDetails(body.profile);
        if (onSelectLanguage) {
          onSelectLanguage(body.profile.code);
        }
      }
    });
  };

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden bg-substrate-dark">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="block w-full h-[620px] sm:h-[700px]"
      />

      {/* Naturalist Astrolabe Legend */}
      <div className="pointer-events-none absolute bottom-4 left-4 rounded border border-border-hairline bg-substrate-panel/90 p-3 backdrop-blur-xs max-w-xs text-xs font-serif shadow-md">
        <div className="flex items-center gap-2 border-b border-border-hairline pb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          <span>Taxonomic Celestial Field</span>
          <span className="text-specimen-moss">60 FPS Canvas</span>
        </div>
        <div className="mt-2 space-y-1.5 text-[11px] text-ink-muted">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-specimen-moss" />
            <span>North Germanic branch (Scandinavian core)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-specimen-ochre" />
            <span>West Germanic branch (High German / Anglo-Frisian)</span>
          </div>
          <p className="pt-1 font-mono text-[9px] text-ink-faint">
            Click any orbiting body to inspect specimen cognate distributions.
          </p>
        </div>
      </div>

      {/* Hover Info Tooltip */}
      {hoveredBody && (
        <div className="pointer-events-none absolute top-4 right-4 rounded border border-specimen-moss/40 bg-substrate-panel/95 p-3.5 shadow-xl max-w-sm backdrop-blur-xs">
          <div className="flex items-center justify-between gap-3 border-b border-border-hairline pb-2">
            <div>
              <h4 className="font-serif text-sm font-bold text-ink-carbon">
                {hoveredBody.profile.name}
              </h4>
              <p className="font-serif text-xs italic text-specimen-moss">
                {hoveredBody.profile.taxonomicName}
              </p>
            </div>
            <span className="rounded border border-border-hairline bg-substrate-dark px-2 py-0.5 font-mono text-[10px] uppercase text-ink-muted">
              {hoveredBody.profile.branch}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono text-xs text-ink-muted">
            <div>
              <span className="text-[10px] block text-ink-faint">Everyday Distance:</span>
              <span className="text-ink-carbon">
                δ {(hoveredBody.profile.everydayDistance * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-[10px] block text-ink-faint">Academic Distance:</span>
              <span className="text-ink-carbon">
                δ {(hoveredBody.profile.academicDistance * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-[10px] block text-ink-faint">Acoustic / IPA:</span>
              <span className="text-specimen-moss">
                {(hoveredBody.profile.phoneticDistance * 100).toFixed(0)}% dist
              </span>
            </div>
            <div>
              <span className="text-[10px] block text-ink-faint">Spelling / Text:</span>
              <span className="text-specimen-irongall">
                {(hoveredBody.profile.spellingDistance * 100).toFixed(0)}% dist
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Selected Specimen Modal / Drawer */}
      {activeDetails && (
        <div className="absolute inset-x-4 bottom-4 z-20 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96 rounded border border-border-hairline bg-substrate-panel p-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-border-hairline pb-2">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-specimen-moss">
                Specimen Dossier
              </span>
              <h3 className="font-serif text-lg font-bold text-ink-carbon">
                {activeDetails.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveDetails(null)}
              className="rounded p-1 text-ink-muted hover:bg-substrate-dark hover:text-ink-carbon"
            >
              ✕
            </button>
          </div>

          <p className="mt-2 font-serif text-xs italic text-ink-muted">
            {activeDetails.taxonomicName} — {activeDetails.branch}
          </p>

          <div className="mt-3 space-y-2 font-serif text-xs">
            <div className="flex justify-between border-b border-border-hairline/50 pb-1">
              <span className="text-ink-muted">Identical Core Cognates:</span>
              <span className="font-mono text-specimen-moss">
                {(activeDetails.ratios.identical * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between border-b border-border-hairline/50 pb-1">
              <span className="text-ink-muted">Sound-Shifted Cousins:</span>
              <span className="font-mono text-specimen-ochre">
                {(activeDetails.ratios.shifted * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between border-b border-border-hairline/50 pb-1">
              <span className="text-ink-muted">False Friend Traps:</span>
              <span className="font-mono text-specimen-oxblood">
                {(activeDetails.ratios.falseFriends * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-ink-muted">Semantic Divergence:</span>
              <span className="font-mono text-specimen-irongall">
                {(activeDetails.ratios.divergent * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
