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
      const color = isNorth ? PALETTE.COGNATE_INK : PALETTE.SHIFTED_INK;
      const bgColor = isNorth ? PALETTE.COGNATE_BG : PALETTE.SHIFTED_BG;

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

      // Light warm paper substrate
      ctx.fillStyle = PALETTE.CANVAS_BG;
      ctx.fillRect(0, 0, width, height);

      // Faint coordinate crosshairs
      ctx.strokeStyle = PALETTE.CANVAS_CROSSHAIR;
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
        ctx.strokeStyle = idx === 1 ? PALETTE.CANVAS_RING_ACCENT : PALETTE.CANVAS_RING;
        ctx.setLineDash(
          idx % 2 === 0
            ? [...ORBIT_CONFIG.DASH_EVEN_PATTERN]
            : [...ORBIT_CONFIG.DASH_ODD_PATTERN],
        );
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Legible ring label
        ctx.font = `${ORBIT_CONFIG.FONT_SIZE_RING_LABEL_PX}px ${TYPOGRAPHY.FONT_MONO}`;
        ctx.fillStyle = PALETTE.CANVAS_TEXT_MUTED;
        ctx.textAlign = 'center';
        ctx.fillText(`${(step * 100).toFixed(0)}% distance`, centerX + r, centerY - 8);
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

        // Gravity tether line
        ctx.beginPath();
        ctx.setLineDash([...ORBIT_CONFIG.TETHER_DASH_PATTERN]);
        ctx.strokeStyle = PALETTE.CANVAS_TETHER;
        ctx.lineWidth = ORBIT_CONFIG.TETHER_LINE_WIDTH_PX;
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Orbit path ring for this satellite
        ctx.beginPath();
        ctx.strokeStyle = PALETTE.CANVAS_RING;
        ctx.lineWidth = ORBIT_CONFIG.SATELLITE_ORBIT_RING_WIDTH_PX;
        ctx.arc(centerX, centerY, body.currentRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Satellite disc shadow/halo
        ctx.beginPath();
        ctx.arc(x, y, body.size + ORBIT_CONFIG.SATELLITE_AURA_PADDING_PX, 0, Math.PI * 2);
        ctx.fillStyle = body.bgColor;
        ctx.fill();

        // Main body disc (White paper with crisp ink border)
        ctx.beginPath();
        ctx.arc(x, y, body.size, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE.CANVAS_SATELLITE_FILL;
        ctx.strokeStyle = body.color;
        ctx.lineWidth = ORBIT_CONFIG.SATELLITE_BORDER_WIDTH_PX;
        ctx.fill();
        ctx.stroke();

        // Satellite code
        ctx.font = `bold ${ORBIT_CONFIG.FONT_SIZE_SATELLITE_CODE_PX}px ${TYPOGRAPHY.FONT_SERIF}`;
        ctx.fillStyle = PALETTE.CANVAS_TEXT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(body.profile.code.toUpperCase(), x, y);

        // Satellite language name below (Clear, legible size)
        ctx.font = `${ORBIT_CONFIG.FONT_SIZE_SATELLITE_NAME_PX}px ${TYPOGRAPHY.FONT_SERIF}`;
        ctx.fillStyle = PALETTE.CANVAS_TEXT;
        ctx.fillText(body.profile.name, x, y + body.size + ORBIT_CONFIG.SATELLITE_LABEL_OFFSET_Y_PX);

        // Distance value
        const distValue =
          register === 'vernacular'
            ? modality === 'phonetic'
              ? body.profile.phoneticDistance
              : body.profile.spellingDistance
            : body.profile.academicDistance;

        ctx.font = `${ORBIT_CONFIG.FONT_SIZE_METRIC_PX}px ${TYPOGRAPHY.FONT_MONO}`;
        ctx.fillStyle = body.color;
        ctx.fillText(
          `${(distValue * 100).toFixed(0)}%`,
          x,
          y + body.size + ORBIT_CONFIG.SATELLITE_DISTANCE_OFFSET_Y_PX,
        );
      });

      // Draw Center Anchor Disc
      const anchorRadius = ORBIT_CONFIG.ANCHOR_RADIUS_PX;
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        anchorRadius + ORBIT_CONFIG.ANCHOR_AURA_OFFSET_PX,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = PALETTE.COGNATE_BG;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, anchorRadius, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.CANVAS_ANCHOR_FILL;
      ctx.strokeStyle = PALETTE.CANVAS_ANCHOR_STROKE;
      ctx.lineWidth = ORBIT_CONFIG.ANCHOR_BORDER_WIDTH_PX;
      ctx.fill();
      ctx.stroke();

      // Inner ring
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        anchorRadius - ORBIT_CONFIG.ANCHOR_INNER_RING_OFFSET_PX,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = PALETTE.CANVAS_RING_ACCENT;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Center text
      ctx.font = `bold ${ORBIT_CONFIG.FONT_SIZE_ANCHOR_CODE_PX}px ${TYPOGRAPHY.FONT_SERIF}`;
      ctx.fillStyle = PALETTE.CANVAS_TEXT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(anchor.name, centerX, centerY - 6);

      ctx.font = `${ORBIT_CONFIG.FONT_SIZE_ANCHOR_SUB_PX}px ${TYPOGRAPHY.FONT_SERIF}`;
      ctx.fillStyle = PALETTE.COGNATE_INK;
      ctx.fillText('center', centerX, centerY + 14);

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
    <div ref={containerRef} className="relative w-full overflow-hidden bg-page-bg font-serif">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="block w-full h-[620px] sm:h-[700px]"
      />

      {/* Book legend */}
      <div className="pointer-events-none absolute bottom-6 left-6 rounded border border-book-rule bg-page-surface p-4 max-w-sm text-sm shadow-xs">
        <div className="border-b border-book-rule pb-2 font-bold text-ink-main">
          Linguistic distance orbit
        </div>
        <div className="mt-2.5 space-y-2 text-ink-muted text-sm">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cognate-ink" />
            <span>North Germanic branch (Scandinavian)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-shifted-ink" />
            <span>West Germanic branch (German, Dutch, English)</span>
          </div>
          <p className="pt-1 text-ink-light">
            Click any language to see its vocabulary breakdown.
          </p>
        </div>
      </div>

      {/* Hover info tooltip */}
      {hoveredBody && (
        <div className="pointer-events-none absolute top-6 right-6 rounded border border-book-rule bg-page-surface p-5 shadow-md max-w-sm">
          <div className="flex items-center justify-between border-b border-book-rule pb-2 gap-4">
            <h4 className="text-lg font-bold text-ink-main">
              {hoveredBody.profile.name}
            </h4>
            <span className="text-sm text-ink-muted">
              {hoveredBody.profile.branch}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-ink-muted">
            <div>
              <span className="block text-ink-light">Everyday distance:</span>
              <span className="font-mono text-ink-main font-bold">
                {(hoveredBody.profile.everydayDistance * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="block text-ink-light">Academic distance:</span>
              <span className="font-mono text-ink-main font-bold">
                {(hoveredBody.profile.academicDistance * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="block text-ink-light">Sound distance:</span>
              <span className="font-mono text-cognate-ink font-bold">
                {(hoveredBody.profile.phoneticDistance * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="block text-ink-light">Spelling distance:</span>
              <span className="font-mono text-divergent-ink font-bold">
                {(hoveredBody.profile.spellingDistance * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Selected language detail box */}
      {activeDetails && (
        <div className="absolute inset-x-6 bottom-6 z-20 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96 rounded border border-book-rule bg-page-surface p-6 shadow-lg">
          <div className="flex items-start justify-between border-b border-book-rule pb-3">
            <div>
              <h3 className="text-2xl font-bold text-ink-main">
                {activeDetails.name}
              </h3>
              <p className="text-sm text-ink-muted mt-0.5">{activeDetails.branch} branch</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveDetails(null)}
              className="rounded p-1 text-ink-muted hover:text-ink-main text-lg"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 space-y-3 text-base">
            <div className="flex justify-between border-b border-book-rule pb-2">
              <span className="text-ink-muted">Identical root words:</span>
              <span className="font-mono font-bold text-cognate-ink">
                {(activeDetails.ratios.identical * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between border-b border-book-rule pb-2">
              <span className="text-ink-muted">Sound shifted words:</span>
              <span className="font-mono font-bold text-shifted-ink">
                {(activeDetails.ratios.shifted * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between border-b border-book-rule pb-2">
              <span className="text-ink-muted">False friends:</span>
              <span className="font-mono font-bold text-falsefriend-ink">
                {(activeDetails.ratios.falseFriends * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-ink-muted">Different vocabulary:</span>
              <span className="font-mono font-bold text-divergent-ink">
                {(activeDetails.ratios.divergent * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
