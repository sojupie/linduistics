import React, { useRef, useEffect } from 'react';
import type { LanguageProfile } from '../../types/linguistics';
import { PALETTE, TYPOGRAPHY } from '../../constants/theme';
import { RADAR_CONFIG } from '../../constants/config';

interface ExpeditionRadarChartProps {
  primary: LanguageProfile;
  comparison?: LanguageProfile;
  width?: number;
  height?: number;
}

const AXES = [
  { key: 'orthography', label: 'Orthography (Spelling)' },
  { key: 'phonetics', label: 'Phonetics (Acoustic)' },
  { key: 'heritageSurvival', label: 'Heritage Retention' },
  { key: 'classicalLoanwords', label: 'Scholarly Loanwords' },
  { key: 'deceptionFactor', label: 'Deception Trap Rate' },
] as const;

export const ExpeditionRadarChart: React.FC<ExpeditionRadarChartProps> = ({
  primary,
  comparison,
  width = RADAR_CONFIG.DEFAULT_WIDTH_PX,
  height = RADAR_CONFIG.DEFAULT_HEIGHT_PX,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    const centerX = width / 2;
    const centerY = height / 2 + RADAR_CONFIG.CENTER_Y_OFFSET_PX;
    const radius = Math.min(centerX, centerY) - RADAR_CONFIG.OUTER_MARGIN_PX;
    const totalAxes = AXES.length;
    const angleSlice = (Math.PI * 2) / totalAxes;

    // Substrate panel background
    ctx.fillStyle = PALETTE.SUBSTRATE_PANEL;
    ctx.fillRect(0, 0, width, height);

    // Draw concentric polygonal grid levels
    RADAR_CONFIG.POLYGON_LEVELS.forEach((level, idx) => {
      ctx.beginPath();
      for (let i = 0; i < totalAxes; i++) {
        const angle = i * angleSlice - Math.PI / 2;
        const x = centerX + Math.cos(angle) * (radius * level);
        const y = centerY + Math.sin(angle) * (radius * level);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle =
        idx === RADAR_CONFIG.POLYGON_LEVELS.length - 1
          ? PALETTE.BORDER_GRID_RADAR_OUTER
          : PALETTE.BORDER_GRID_RADAR;
      ctx.lineWidth = RADAR_CONFIG.GRID_LINE_WIDTH_PX;
      ctx.stroke();

      // Draw level scale marker on top vertical axis
      ctx.font = `${RADAR_CONFIG.SCALE_MARKER_FONT_SIZE_PX}px ${TYPOGRAPHY.FONT_MONO}`;
      ctx.fillStyle = PALETTE.INK_SCALE_MARKER;
      ctx.textAlign = 'right';
      ctx.fillText(
        `${(level * 100).toFixed(0)}%`,
        centerX - 4,
        centerY - radius * level + 3,
      );
    });

    // Draw axis rays & labels
    AXES.forEach((axis, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Spoke line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = PALETTE.BORDER_GRID_RADAR;
      ctx.lineWidth = RADAR_CONFIG.GRID_LINE_WIDTH_PX;
      ctx.stroke();

      // Axis label
      const labelDist = radius + RADAR_CONFIG.LABEL_DISTANCE_OFFSET_PX;
      const lx = centerX + Math.cos(angle) * labelDist;
      const ly = centerY + Math.sin(angle) * labelDist;

      ctx.font = `${RADAR_CONFIG.AXIS_LABEL_FONT_SIZE_PX}px ${TYPOGRAPHY.FONT_SERIF}`;
      ctx.fillStyle = PALETTE.INK_MUTED;
      ctx.textBaseline = 'middle';

      if (Math.abs(Math.cos(angle)) < 0.1) {
        ctx.textAlign = 'center';
      } else if (Math.cos(angle) > 0) {
        ctx.textAlign = 'left';
      } else {
        ctx.textAlign = 'right';
      }

      ctx.fillText(axis.label, lx, ly);
    });

    // Draw profile polygon
    const drawPolygon = (
      profile: LanguageProfile,
      strokeColor: string,
      fillColor: string,
      isDashed = false,
    ) => {
      ctx.beginPath();
      AXES.forEach((axis, i) => {
        const val = profile.radarProfile[axis.key];
        const angle = i * angleSlice - Math.PI / 2;
        const x = centerX + Math.cos(angle) * (radius * val);
        const y = centerY + Math.sin(angle) * (radius * val);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();

      ctx.fillStyle = fillColor;
      ctx.fill();

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = RADAR_CONFIG.PRIMARY_LINE_WIDTH_PX;
      if (isDashed) {
        ctx.setLineDash([...RADAR_CONFIG.DASH_COMPARISON_PATTERN]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw node points
      AXES.forEach((axis, i) => {
        const val = profile.radarProfile[axis.key];
        const angle = i * angleSlice - Math.PI / 2;
        const x = centerX + Math.cos(angle) * (radius * val);
        const y = centerY + Math.sin(angle) * (radius * val);

        ctx.beginPath();
        ctx.arc(x, y, RADAR_CONFIG.NODE_RADIUS_PX, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();
      });
    };

    // Draw baseline comparison if present
    if (comparison) {
      drawPolygon(
        comparison,
        PALETTE.SPECIMEN_COMPARISON_INK,
        PALETTE.SPECIMEN_COMPARISON_FILL,
        true,
      );
    }

    // Draw primary profile
    const isNorth = primary.branch === 'North Germanic';
    const primaryColor = isNorth ? PALETTE.SPECIMEN_MOSS : PALETTE.SPECIMEN_OCHRE;
    const primaryFill = isNorth
      ? PALETTE.SPECIMEN_MOSS_BG_DEEP
      : PALETTE.SPECIMEN_OCHRE_BG_DEEP;

    drawPolygon(primary, primaryColor, primaryFill, false);
  }, [primary, comparison, width, height]);

  return (
    <div className="flex flex-col items-center rounded border border-border-hairline bg-substrate-panel p-4 shadow-xs">
      <div className="flex w-full items-center justify-between border-b border-border-hairline pb-2 text-xs">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">
            Expedition Radar
          </span>
          <h4 className="font-serif font-bold text-ink-carbon">{primary.name}</h4>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span className="flex items-center gap-1 text-specimen-moss">
            <span className="inline-block h-2 w-2 rounded-full bg-specimen-moss" />
            {primary.name}
          </span>
          {comparison && (
            <span className="flex items-center gap-1 text-ink-faint">
              <span className="inline-block h-2 w-2 rounded-full bg-ink-faint" />
              {comparison.name} (Anchor)
            </span>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} className="mt-2 block" />
    </div>
  );
};
