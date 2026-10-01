import React, { useEffect, useMemo, useRef, useState } from 'react';
import { REGISTER_CONFIG } from '../../constants/config';
import type { LanguagePairStats } from '../../types/linguistics';
import { getLanguageName } from '../../data/languages';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { LANGUAGE_MAP, LANGUAGE_MEASURES, pairKey, samePair, type LanguageMeasure, type LanguagePair } from './languageComparison';
import { calculateMapPoints, createGraticules, layoutLabels, layoutPoints, screenPoint, type MapView, type PositionedPoint } from './languageMapGeometry';

interface LanguageRelationshipMapProps {
  languages: string[];
  pairs: ReadonlyMap<string, LanguagePairStats>;
  reference: string;
  activePair: LanguagePair | null;
  measure: LanguageMeasure;
  onChooseLanguage: (code: string) => void;
}

interface GraphEdge {
  key: string;
  a: PositionedPoint;
  b: PositionedPoint;
  value: number;
  similarity: number;
  touchesReference: boolean;
}

export const LanguageRelationshipMap: React.FC<LanguageRelationshipMapProps> = ({
  languages, pairs, reference, activePair, measure, onChooseLanguage,
}) => {
  const [view, setView] = useState<MapView>('2d');
  const [yaw, setYaw] = useState<number>(LANGUAGE_MAP.controls.defaultYaw);
  const [pitch, setPitch] = useState<number>(LANGUAGE_MAP.controls.defaultPitch);
  const [zoom, setZoom] = useState<number>(LANGUAGE_MAP.controls.defaultZoom);
  const [plotWidth, setPlotWidth] = useState<number>(LANGUAGE_MAP.plot.width);
  const [hoveredLanguage, setHoveredLanguage] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const mapLanguages = useMemo(() => languages.filter((source) => languages.every((target) =>
    source === target || (pairs.has(pairKey(source, target)) && pairs.has(pairKey(target, source))))), [languages, pairs]);
  const mapPoints = useMemo(() => {
    return calculateMapPoints(mapLanguages, (source, target) => {
      const forward = pairs.get(pairKey(source, target));
      const reverse = pairs.get(pairKey(target, source));
      if (!forward || !reverse) return 0;
      return (forward.true_cognates_ratio + reverse.true_cognates_ratio) / 2;
    });
  }, [mapLanguages, pairs]);
  const placed = useMemo(() => layoutPoints(mapPoints, view, yaw, pitch, zoom, plotWidth), [mapPoints, view, yaw, pitch, zoom, plotWidth]);
  const labels = useMemo(() => layoutLabels(placed, plotWidth), [placed, plotWidth]);
  const labelsByCode = useMemo(() => new Map(labels.map((label) => [label.code, label])), [labels]);
  const graticules = useMemo(() => view === '3d' ? createGraticules(yaw, pitch, zoom, plotWidth) : [], [view, yaw, pitch, zoom, plotWidth]);
  const graphEdges = useMemo<GraphEdge[]>(() => {
    const pointByCode = new Map(placed.map((point) => [point.code, point]));
    return mapLanguages.flatMap((source, index) => mapLanguages.slice(index + 1).flatMap((target) => {
      const forward = pairs.get(pairKey(source, target));
      const reverse = pairs.get(pairKey(target, source));
      const a = pointByCode.get(source);
      const b = pointByCode.get(target);
      if (!forward || !reverse || !a || !b) return [];
      const value = (LANGUAGE_MEASURES[measure].value(forward) + LANGUAGE_MEASURES[measure].value(reverse)) / 2;
      return [{
        key: pairKey(source, target), a, b, value,
        similarity: measure === 'false_friends' ? 1 - value : value,
        touchesReference: source === reference || target === reference,
      }];
    }));
  }, [mapLanguages, pairs, placed, reference, measure]);
  const similarityValues = graphEdges.map((edge) => edge.similarity);
  const minSimilarity = Math.min(...similarityValues);
  const similarityRange = Math.max(...similarityValues) - minSimilarity;
  const mapIsAvailable = mapPoints.length >= 2;

  useEffect(() => {
    if (!mapIsAvailable || !plotRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setPlotWidth(entry.contentRect.width);
    });
    observer.observe(plotRef.current);
    return () => observer.disconnect();
  }, [mapIsAvailable]);

  useEffect(() => {
    const plot = plotRef.current;
    if (!plot || view !== '3d') return;
    const zoomMap = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((current) => Math.max(
        LANGUAGE_MAP.controls.zoomMin,
        Math.min(LANGUAGE_MAP.controls.zoomMax, current - event.deltaY * LANGUAGE_MAP.controls.zoomFactor),
      ));
    };
    plot.addEventListener('wheel', zoomMap, { passive: false });
    return () => plot.removeEventListener('wheel', zoomMap);
  }, [view, mapIsAvailable]);

  const depthElements = useMemo(() => {
    if (view !== '3d') return [];
    const items: Array<{ depth: number; key: string; element: React.ReactNode }> = [];
    const projectAxis = (point: number[]) => screenPoint(point[0], point[1], point[2], yaw, pitch, zoom, plotWidth);
    const addLine = (
      key: string,
      a: { x: number; y: number; depth: number },
      b: { x: number; y: number; depth: number },
      stroke: string,
      width: number,
      opacity = 1,
      segments = 1,
      dash?: string,
    ) => {
      for (let index = 0; index < segments; index++) {
        const startRatio = index / segments;
        const endRatio = (index + 1) / segments;
        const start = {
          x: a.x + (b.x - a.x) * startRatio,
          y: a.y + (b.y - a.y) * startRatio,
          depth: a.depth + (b.depth - a.depth) * startRatio,
        };
        const end = {
          x: a.x + (b.x - a.x) * endRatio,
          y: a.y + (b.y - a.y) * endRatio,
          depth: a.depth + (b.depth - a.depth) * endRatio,
        };
        items.push({ depth: (start.depth + end.depth) / 2, key: `${key}-${index}`, element: <line key={`${key}-${index}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={stroke} strokeWidth={width} strokeOpacity={opacity} strokeDasharray={dash} /> });
      }
    };

    graticules.forEach((grid) => grid.points.slice(1).forEach((point, index) => {
      const style = LANGUAGE_MAP.graticule;
      addLine(`${grid.key}-${index}`, grid.points[index], point, 'var(--color-book-rule-strong)', grid.equator ? style.equatorWidth : style.baseWidth,
        grid.equator ? style.equatorOpacity : style.baseOpacity, 1, style.dash);
    }));
    for (const axis of [0, 1, 2] as const) {
      const start = [0, 0, 0], end = [0, 0, 0];
      start[axis] = -LANGUAGE_MAP.plot.radius;
      end[axis] = LANGUAGE_MAP.plot.radius;
      addLine(`axis-${axis}`, projectAxis(start), projectAxis(end), 'var(--color-book-rule-strong)', LANGUAGE_MAP.depth.axisWidth, 1, LANGUAGE_MAP.depth.axisSegments);
    }
    [...graphEdges].sort((a, b) => a.similarity - b.similarity).forEach((edge) => addLine(
      `edge-${edge.key}`, edge.a, edge.b, 'var(--color-cognate-ink)', LANGUAGE_MAP.depth.lineWidth,
      similarityRange
        ? LANGUAGE_MAP.depth.minOpacity + LANGUAGE_MAP.depth.opacityRange * (edge.similarity - minSimilarity) / similarityRange
        : LANGUAGE_MAP.depth.fallbackOpacity,
      LANGUAGE_MAP.depth.edgeSegments,
    ));
    placed.forEach((point) => {
      const label = labelsByCode.get(point.code);
      if (!label) return;
      const selected = !!activePair && (activePair.source === point.code || activePair.target === point.code);
      const hovered = hoveredLanguage === point.code;
      const isReference = point.code === reference;
      const highlighted = isReference || selected || hovered;
      const highlightColor = isReference ? 'var(--color-ink-muted)' : 'var(--color-ink-light)';
      const radius = Math.max(LANGUAGE_MAP.labels.minSize, Math.min(LANGUAGE_MAP.labels.maxSize, LANGUAGE_MAP.labels.size * point.scale)) / 2;
      if (highlighted) items.push({ depth: point.depth, key: `halo-${point.code}`, element: <circle key={`halo-${point.code}`} cx={label.x} cy={label.y} r={radius + LANGUAGE_MAP.labels.haloOffset} fill="none" stroke={highlightColor} strokeWidth={LANGUAGE_MAP.depth.nodeBorderWidth} strokeDasharray={LANGUAGE_MAP.graticule.dash} /> });
      items.push({
        depth: point.depth, key: `node-${point.code}`, element: <circle key={`node-${point.code}`} cx={label.x} cy={label.y} r={radius}
          fill={isReference ? 'var(--color-ink-muted)' : selected || hovered ? 'var(--color-ink-light)' : 'var(--color-page-muted)'}
          stroke={highlighted ? highlightColor : 'var(--color-book-rule-strong)'} strokeWidth={highlighted ? LANGUAGE_MAP.depth.nodeBorderWidth : 1} />
      });
    });
    return items.sort((a, b) => b.depth - a.depth);
  }, [view, yaw, pitch, zoom, plotWidth, graticules, graphEdges, similarityRange, minSimilarity, placed, labelsByCode, activePair, reference, hoveredLanguage]);

  const scoreLabels = useMemo(() => {
    const edges = new Map<string, GraphEdge>();
    if (activePair) {
      const selected = graphEdges.find((edge) => samePair(activePair, edge.a.code, edge.b.code));
      if (selected) edges.set(selected.key, selected);
    } else {
      graphEdges.filter((edge) => edge.touchesReference).forEach((edge) => edges.set(edge.key, edge));
    }
    if (hoveredLanguage && hoveredLanguage !== reference) {
      const hovered = graphEdges.find((edge) => samePair({ source: reference, target: hoveredLanguage }, edge.a.code, edge.b.code));
      if (hovered) edges.set(hovered.key, hovered);
    }

    const occupied = placed.flatMap((point) => {
      const label = labelsByCode.get(point.code);
      return label ? [{ x: label.x, y: label.y, width: Math.max(LANGUAGE_MAP.labels.minSize, Math.min(LANGUAGE_MAP.labels.maxSize, LANGUAGE_MAP.labels.size * point.scale)) }] : [];
    });
    const placedLabels: Array<{ key: string; x: number; y: number; value: number }> = [];
    for (const edge of edges.values()) {
      const dx = edge.b.x - edge.a.x, dy = edge.b.y - edge.a.y;
      const length = Math.max(LANGUAGE_MAP.interaction.minSegmentLength, Math.hypot(dx, dy));
      const normal = { x: -dy / length, y: dx / length };
      const candidates = LANGUAGE_MAP.interaction.collisionAttempts.flatMap((position) => LANGUAGE_MAP.interaction.labelOffsets.map((offset) => ({
        x: edge.a.x + dx * position + normal.x * offset,
        y: edge.a.y + dy * position + normal.y * offset,
      })));
      const point = candidates.find((candidate) =>
        candidate.x > LANGUAGE_MAP.interaction.scoreLabelEdgeInsetX && candidate.x < plotWidth - LANGUAGE_MAP.interaction.scoreLabelEdgeInsetX &&
        candidate.y > LANGUAGE_MAP.interaction.scoreLabelEdgeInsetY && candidate.y < LANGUAGE_MAP.plot.height - LANGUAGE_MAP.interaction.scoreLabelEdgeInsetY &&
        occupied.every((box) => Math.abs(candidate.x - box.x) > box.width / 2 + LANGUAGE_MAP.interaction.scoreLabelCollisionX || Math.abs(candidate.y - box.y) > box.width / 2 + LANGUAGE_MAP.interaction.scoreLabelCollisionY) &&
        placedLabels.every((label) => Math.abs(candidate.x - label.x) > LANGUAGE_MAP.interaction.scoreLabelGapX || Math.abs(candidate.y - label.y) > LANGUAGE_MAP.interaction.scoreLabelGapY)) ?? candidates[0];
      if (point) placedLabels.push({ key: edge.key, ...point, value: edge.value });
    }
    return placedLabels;
  }, [activePair, graphEdges, hoveredLanguage, reference, placed, labelsByCode, plotWidth]);

  const resetView = () => {
    setYaw(LANGUAGE_MAP.controls.defaultYaw);
    setPitch(LANGUAGE_MAP.controls.defaultPitch);
    setZoom(LANGUAGE_MAP.controls.defaultZoom);
  };

  return (
    <section className="min-w-0 border border-book-rule bg-page-surface shadow-2xs" aria-label="Language relationship map">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-book-rule px-4 py-3">
        <h2 className="typo-section-header">Language map</h2>
        <div className="flex items-center gap-3 typo-sublabel text-ink-muted" aria-label="Line darkness shows relative similarity on the selected comparison">
          <span className="flex items-center gap-1"><svg width={LANGUAGE_MAP.legend.width} height={LANGUAGE_MAP.legend.height} aria-hidden="true"><line x1={LANGUAGE_MAP.legend.inset} y1={LANGUAGE_MAP.legend.height / 2} x2={LANGUAGE_MAP.legend.width - LANGUAGE_MAP.legend.inset} y2={LANGUAGE_MAP.legend.height / 2} stroke="var(--color-cognate-ink)" strokeOpacity={LANGUAGE_MAP.depth.minOpacity} strokeWidth={LANGUAGE_MAP.depth.lineWidth} /></svg>Lower similarity</span>
          <span className="flex items-center gap-1"><svg width={LANGUAGE_MAP.legend.width} height={LANGUAGE_MAP.legend.height} aria-hidden="true"><line x1={LANGUAGE_MAP.legend.inset} y1={LANGUAGE_MAP.legend.height / 2} x2={LANGUAGE_MAP.legend.width - LANGUAGE_MAP.legend.inset} y2={LANGUAGE_MAP.legend.height / 2} stroke="var(--color-cognate-ink)" strokeOpacity="1" strokeWidth={LANGUAGE_MAP.depth.lineWidth} /></svg>Higher similarity</span>
        </div>
        <div className="inline-flex items-center border border-book-rule bg-page-muted/50 p-0.5 rounded-xs" role="group" aria-label="Map view">
          {(['2d', '3d'] as MapView[]).map((option) => <button key={option} type="button" onClick={() => setView(option)} aria-pressed={view === option}
            className={`px-2.5 py-1 typo-sublabel rounded-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border ${view === option ? 'bg-page-surface border-ink-main text-ink-main font-semibold shadow-2xs' : 'border-transparent text-ink-muted hover:text-ink-main hover:bg-page-muted/60'}`}>
            {view === option && <MaterialSymbol icon="check" size={14} className="text-cognate-ink shrink-0" />}
            {option.toUpperCase()}
          </button>)}
        </div>
      </div>

      <p className="px-4 pt-3 typo-sublabel text-ink-muted">Languages are positioned by genealogical lexical affinity (true cognate roots). Line strength and score badges reflect the selected comparison ({LANGUAGE_MEASURES[measure].label.toLowerCase()}).</p>
      {!mapIsAvailable ? <p className="p-8 text-ink-muted">A map needs scores for every pair of plotted languages.</p> : <>
        <div ref={plotRef} className={`relative isolate w-full overflow-hidden select-none ${view === '3d' ? 'touch-none cursor-grab active:cursor-grabbing' : ''}`}
          style={{ height: LANGUAGE_MAP.plot.height }}
          role={view === '3d' ? 'group' : undefined} aria-label={view === '3d' ? 'Rotate and zoom the 3D language map with arrow keys, dragging, or scrolling' : undefined}
          tabIndex={view === '3d' ? 0 : undefined}
          onKeyDown={(event) => {
            if (view !== '3d') return;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { setYaw((value) => value + (event.key === 'ArrowLeft' ? -LANGUAGE_MAP.controls.keyYawStep : LANGUAGE_MAP.controls.keyYawStep)); event.preventDefault(); }
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { setPitch((value) => Math.max(-LANGUAGE_MAP.controls.pitchLimit, Math.min(LANGUAGE_MAP.controls.pitchLimit, value + (event.key === 'ArrowUp' ? -LANGUAGE_MAP.controls.keyPitchStep : LANGUAGE_MAP.controls.keyPitchStep)))); event.preventDefault(); }
          }}
          onPointerDown={(event) => {
            if (view !== '3d') return;
            drag.current = { x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const previous = drag.current;
            if (view !== '3d' || !previous) return;
            const dx = event.clientX - previous.x;
            const dy = event.clientY - previous.y;
            drag.current = { x: event.clientX, y: event.clientY };
            setYaw((value) => value + dx * LANGUAGE_MAP.controls.dragFactor);
            setPitch((value) => Math.max(-LANGUAGE_MAP.controls.pitchLimit, Math.min(LANGUAGE_MAP.controls.pitchLimit, value + dy * LANGUAGE_MAP.controls.dragFactor)));
          }}
          onPointerUp={() => { drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}
          onLostPointerCapture={() => { drag.current = null; }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${plotWidth} ${LANGUAGE_MAP.plot.height}`} aria-hidden="true">
            {view === '2d' && <g fill="none" stroke="var(--color-book-rule)" strokeWidth={LANGUAGE_MAP.axes.width}>
              {LANGUAGE_MAP.plot.axisRings.map((radius) => <ellipse key={radius} cx={plotWidth / 2} cy={LANGUAGE_MAP.plot.centerY} rx={radius * LANGUAGE_MAP.plot.scaleX * Math.min(1, (plotWidth - LANGUAGE_MAP.plot.marginX * 2) / (LANGUAGE_MAP.plot.centerX * 2 - LANGUAGE_MAP.plot.marginX * 2))} ry={radius * LANGUAGE_MAP.plot.scaleY} strokeDasharray={LANGUAGE_MAP.axes.dash} />)}
              <path d={`M${plotWidth / 2} ${LANGUAGE_MAP.plot.edgeTop} V${LANGUAGE_MAP.plot.edgeBottom} M${LANGUAGE_MAP.plot.axisInsetX} ${LANGUAGE_MAP.plot.centerY} H${plotWidth - LANGUAGE_MAP.plot.axisInsetX}`} />
            </g>}
            {view === '2d' && [...graphEdges].sort((a, b) => a.similarity - b.similarity).map((edge) => <line key={edge.key} x1={edge.a.x} y1={edge.a.y} x2={edge.b.x} y2={edge.b.y} stroke="var(--color-cognate-ink)" strokeOpacity={lineOpacity(edge.similarity)} strokeWidth={LANGUAGE_MAP.depth.lineWidth} />)}
            {depthElements.map((item) => item.element)}
            {placed.map((point) => {
              const label = labelsByCode.get(point.code);
              if (!label || Math.hypot(point.x - label.x, point.y - label.y) <= LANGUAGE_MAP.labels.leaderThreshold) return null;
              return <line key={`label-${point.code}`} x1={point.x} y1={point.y} x2={label.x} y2={label.y} stroke="var(--color-ink-muted)" strokeOpacity={LANGUAGE_MAP.labels.leaderOpacity} strokeWidth={LANGUAGE_MAP.labels.leaderWidth} strokeDasharray={LANGUAGE_MAP.labels.leaderDash} />;
            })}
            {view === '2d' && placed.map((point) => <circle key={`point-${point.code}`} cx={point.x} cy={point.y}
              r={Math.max(LANGUAGE_MAP.labels.minPointRadius, Math.min(LANGUAGE_MAP.labels.maxPointRadius, LANGUAGE_MAP.labels.baseRadius * point.scale))}
              fill={point.code === reference ? 'var(--color-ink-muted)' : activePair && (activePair.source === point.code || activePair.target === point.code) || hoveredLanguage === point.code ? 'var(--color-ink-light)' : 'var(--color-ink-main)'} />)}
            {scoreLabels.map((label) => <g key={`score-${label.key}`}>
              <title>{Math.round(label.value * REGISTER_CONFIG.PERCENT_SCALE)}% {LANGUAGE_MEASURES[measure].label}</title>
              <rect x={label.x - LANGUAGE_MAP.interaction.scoreLabelHalfWidth} y={label.y - LANGUAGE_MAP.interaction.scoreLabelHalfHeight} width={LANGUAGE_MAP.interaction.scoreLabelWidth} height={LANGUAGE_MAP.interaction.scoreLabelHeight} rx={LANGUAGE_MAP.scoreLabel.cornerRadius} fill="var(--color-page-surface)" stroke="var(--color-book-rule-strong)" />
              <text x={label.x} y={label.y + LANGUAGE_MAP.scoreLabel.textBaseline} textAnchor="middle" fill="var(--color-ink-main)" fontSize={LANGUAGE_MAP.scoreLabel.fontSize} fontWeight={LANGUAGE_MAP.scoreLabel.fontWeight}>{Math.round(label.value * REGISTER_CONFIG.PERCENT_SCALE)}%</text>
            </g>)}
          </svg>
          {placed.map((point) => {
            const label = labelsByCode.get(point.code);
            if (!label) return null;
            const size = Math.max(LANGUAGE_MAP.labels.minSize, Math.min(LANGUAGE_MAP.labels.maxSize, LANGUAGE_MAP.labels.size * point.scale));
            const isReference = point.code === reference;
            const isSelected = !!activePair && (activePair.source === point.code || activePair.target === point.code);
            const isHovered = hoveredLanguage === point.code;
            const hasHalo = isReference || isSelected || isHovered;
            const forward = pairs.get(pairKey(reference, point.code));
            const reverse = pairs.get(pairKey(point.code, reference));
            const percentage = forward && reverse
              ? Math.round((LANGUAGE_MEASURES[measure].value(forward) + LANGUAGE_MEASURES[measure].value(reverse)) * REGISTER_CONFIG.PERCENT_SCALE / 2)
              : null;
            const position = {
              left: label.x, top: label.y, width: size, height: size,
              fontSize: Math.max(LANGUAGE_MAP.labels.minFontSize, Math.min(LANGUAGE_MAP.labels.maxFontSize, LANGUAGE_MAP.labels.fontSize * point.scale)),
              zIndex: Math.round(LANGUAGE_MAP.zIndexBase - point.depth),
            };
            const appearance = view === '3d'
              ? `border-0 bg-transparent ${isReference || isSelected || isHovered ? 'text-page-bg' : 'text-ink-main'}`
              : `border-2 ${isReference ? 'border-ink-muted bg-ink-muted text-page-bg' : isSelected || isHovered ? 'border-ink-light bg-ink-light text-page-bg' : 'border-book-rule-strong bg-page-muted text-ink-main'}`;
            return <button key={point.code} type="button" disabled={isReference} onClick={() => onChooseLanguage(point.code)}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerEnter={() => setHoveredLanguage(point.code)} onPointerLeave={() => setHoveredLanguage(null)}
              onFocus={() => setHoveredLanguage(point.code)} onBlur={() => setHoveredLanguage(null)}
              title={isReference ? `${getLanguageName(point.code)}, reference language` : `${getLanguageName(point.code)}: ${percentage ?? '—'}% ${LANGUAGE_MEASURES[measure].label.toLowerCase()}`}
              aria-pressed={isSelected} aria-label={isReference ? `${getLanguageName(point.code)}, current reference language` : `Compare ${getLanguageName(reference)} with ${getLanguageName(point.code)}: ${percentage ?? '—'}% ${LANGUAGE_MEASURES[measure].label.toLowerCase()}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full font-semibold ${view === '3d' ? 'shadow-none' : 'shadow-2xs'} transition-[width,height,font-size] ${appearance} ${isReference ? 'cursor-default' : 'cursor-pointer'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-main`}
              style={position}>
              {view === '2d' && hasHalo && <span aria-hidden="true" className={`pointer-events-none absolute rounded-full border-2 border-dashed ${isReference ? 'border-ink-muted' : 'border-ink-light'}`} style={{ inset: -LANGUAGE_MAP.labels.haloOffset }} />}
              <span className="relative">{point.code.toUpperCase()}</span>
            </button>;
          })}
        </div>
        {view === '3d' && <div className="flex items-center justify-end gap-3 border-t border-book-rule px-4 py-2 typo-note"><span className="mr-auto">Drag or use the arrow keys to rotate; scroll to zoom.</span><button type="button" onClick={resetView} className="underline hover:text-ink-main">Reset view</button></div>}
      </>}
    </section>
  );

  function lineOpacity(similarity: number) {
    return similarityRange
      ? LANGUAGE_MAP.depth.minOpacity + LANGUAGE_MAP.depth.opacityRange * (similarity - minSimilarity) / similarityRange
      : LANGUAGE_MAP.depth.fallbackOpacity;
  }

};
