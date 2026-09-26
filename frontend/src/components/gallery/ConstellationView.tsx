import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { MaterialSymbol } from '../common/MaterialSymbol';
import {
  GALLERY_LANGUAGES,
  PAIRWISE_FRICTION_MATRIX,
} from './galleryData';
import {
  project3D,
  renderCelestialGraticules,
  DEFAULT_CAMERA,
  type CameraState,
} from './Canvas3D';
import { useLanguagesQuery } from '../../services/queries';
import { getLanguageName } from '../../data/languages';

type ConstellationDimension = '2d' | '3d';
type DistanceMetric = 'phonetic' | 'orthographic' | 'semantic';

export const ConstellationView: React.FC = () => {
  const [dimension, setDimension] = useState<ConstellationDimension>('3d');
  const [activeMetric, setActiveMetric] = useState<DistanceMetric>('phonetic');
  const [showCognateBridges, setShowCognateBridges] = useState(true);
  const [showFalseFriendFaults, setShowFalseFriendFaults] = useState(true);
  const [selectedLang, setSelectedLang] = useState<string | null>('sv');
  const [hoveredLang, setHoveredLang] = useState<string | null>(null);

  // Live database stats query (falls back gracefully to static matrix)
  const { data: languagesData } = useLanguagesQuery();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [camera, setCamera] = useState<CameraState>({ ...DEFAULT_CAMERA, yaw: 0.6, pitch: 0.28, zoom: 1.05 });

  // Mouse interaction state for 3D camera
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Compute pairwise lookup map
  const pairMap = useMemo(() => {
    const map = new Map<
      string,
      { phon: number; ortho: number; sem: number; pairs: number; ffRatio: number; asymmetryNote?: string }
    >();

    // Seed from static high-fidelity matrix
    PAIRWISE_FRICTION_MATRIX.forEach((cell) => {
      const k1 = `${cell.source}-${cell.target}`;
      const k2 = `${cell.target}-${cell.source}`;
      const val = {
        phon: cell.phoneticSim,
        ortho: cell.orthographicSim,
        sem: cell.semanticSim,
        pairs: cell.pairCount,
        ffRatio: cell.falseFriendRatio,
        asymmetryNote: cell.asymmetryNote,
      };
      map.set(k1, val);
      map.set(k2, val);
    });

    // Enhance with live database stats if available
    if (languagesData?.pairs) {
      languagesData.pairs.forEach((p) => {
        const k1 = `${p.source}-${p.target}`;
        const k2 = `${p.target}-${p.source}`;
        const val = {
          phon: p.avg_phonetic,
          ortho: p.avg_orthographic,
          sem: p.avg_semantic,
          pairs: p.pair_count,
          ffRatio: p.false_friends_ratio,
        };
        map.set(k1, val);
        map.set(k2, val);
      });
    }

    return map;
  }, [languagesData]);

  // Dynamic 3D positions adjusted by active metric
  const nodePositions = useMemo(() => {
    return GALLERY_LANGUAGES.map((lang) => {
      let { x, y, z } = lang.linguisticPos;

      // Adjust positioning based on selected metric
      if (activeMetric === 'orthographic') {
        // In orthographic space, Danish shifts very close to Swedish/Norwegian
        if (lang.code === 'da') {
          x = 34;
          y = -35;
          z = 5;
        }
      } else if (activeMetric === 'semantic') {
        // In semantic space, German and Swedish pull closer due to Hanseatic loans
        if (lang.code === 'sv') x = 20;
        if (lang.code === 'de') x = -15;
      }

      // Sizing scales with lexicon volume
      const radius = 18 + (lang.approxLexiconSize / 170000) * 16;

      return {
        ...lang,
        pos3d: { x: x * 2.2, y: y * 2.0, z: z * 2.2 },
        pos2d: { x: x * 3.8, y: y * 3.4 },
        radius,
      };
    });
  }, [activeMetric]);

  // Selected language profile details
  const selectedLangData = useMemo(() => {
    if (!selectedLang) return null;
    return nodePositions.find((l) => l.code === selectedLang) ?? null;
  }, [selectedLang, nodePositions]);

  // Pairwise relations from selected language
  const selectedRelations = useMemo(() => {
    if (!selectedLang) return [];
    return nodePositions
      .filter((l) => l.code !== selectedLang)
      .map((target) => {
        const key = `${selectedLang}-${target.code}`;
        const data = pairMap.get(key) ?? {
          phon: 0.5,
          ortho: 0.5,
          sem: 0.6,
          pairs: 1000,
          ffRatio: 0.15,
        };
        return {
          target,
          ...data,
        };
      })
      .sort((a, b) => b.pairs - a.pairs);
  }, [selectedLang, nodePositions, pairMap]);

  // Canvas render loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background paper tint
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw subtle background coordinate grid
    ctx.save();
    ctx.strokeStyle = '#E8E2D8';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);

    const gridSize = 60;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Draw 3D Celestial / Spatial Graticules if in 3D mode
    if (dimension === '3d') {
      renderCelestialGraticules(ctx, width, height, camera, 240, 'rgba(216, 209, 198, 0.45)', 'rgba(37, 93, 54, 0.3)');
    }

    // 3. Project nodes to 2D screen coordinates
    const projectedNodes = nodePositions.map((node) => {
      if (dimension === '3d') {
        const proj = project3D(node.pos3d, width, height, camera);
        return {
          ...node,
          screenX: proj.x2d,
          screenY: proj.y2d,
          scale: proj.scale,
          depth: proj.depth,
          screenRadius: Math.max(12, node.radius * proj.scale),
          visible: proj.visible,
        };
      } else {
        // 2D centered coordinate plane
        return {
          ...node,
          screenX: width / 2 + node.pos2d.x,
          screenY: height / 2 + node.pos2d.y,
          scale: 1,
          depth: 0,
          screenRadius: node.radius,
          visible: true,
        };
      }
    });

    // 4. Draw Connecting Edges (Chords)
    // Draw all pairs
    for (let i = 0; i < projectedNodes.length; i++) {
      for (let j = i + 1; j < projectedNodes.length; j++) {
        const a = projectedNodes[i];
        const b = projectedNodes[j];
        if (!a.visible || !b.visible) continue;

        const key = `${a.code}-${b.code}`;
        const pair = pairMap.get(key);
        if (!pair) continue;

        const isRelatedToSelected = selectedLang && (a.code === selectedLang || b.code === selectedLang);
        const isSelectedPair = hoveredLang && ((a.code === hoveredLang && b.code === selectedLang) || (b.code === hoveredLang && a.code === selectedLang));

        // Cognate Bridge (Green)
        if (showCognateBridges) {
          ctx.save();
          const weight = Math.max(1, (pair.pairs / 3000) * 5);
          ctx.lineWidth = isSelectedPair ? weight + 3 : isRelatedToSelected ? weight + 1.5 : weight * 0.7;

          // Alpha modulation based on distance/depth
          let alpha = isSelectedPair ? 0.95 : isRelatedToSelected ? 0.75 : 0.22;
          if (selectedLang && !isRelatedToSelected) alpha *= 0.35; // Dim unrelated lines

          ctx.strokeStyle = `rgba(37, 93, 54, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.screenX, a.screenY);

          if (dimension === '2d') {
            // Subtle curve in 2D
            const midX = (a.screenX + b.screenX) / 2;
            const midY = (a.screenX + b.screenX) / 2 + (a.screenY - b.screenY) * 0.08;
            ctx.quadraticCurveTo(midX, midY, b.screenX, b.screenY);
          } else {
            ctx.lineTo(b.screenX, b.screenY);
          }
          ctx.stroke();
          ctx.restore();
        }

        // False Friend Tension Fault (Dashed Oxblood)
        if (showFalseFriendFaults && pair.ffRatio > 0.15) {
          ctx.save();
          const tensionWidth = Math.max(1, pair.ffRatio * 8);
          ctx.lineWidth = isSelectedPair ? tensionWidth + 2 : isRelatedToSelected ? tensionWidth + 1 : tensionWidth * 0.6;
          ctx.setLineDash([4, 6]);

          let alpha = isSelectedPair ? 0.95 : isRelatedToSelected ? 0.7 : 0.25;
          if (selectedLang && !isRelatedToSelected) alpha *= 0.3;

          ctx.strokeStyle = `rgba(158, 42, 43, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.screenX, a.screenY);
          ctx.lineTo(b.screenX, b.screenY);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // 5. Draw Language Nodes (Sorted by depth for 3D painter's algorithm)
    const sortedNodes = [...projectedNodes].sort((a, b) => b.depth - a.depth);

    sortedNodes.forEach((node) => {
      if (!node.visible) return;

      const isSelected = selectedLang === node.code;
      const isHovered = hoveredLang === node.code;
      const isNorthGermanic = node.branch === 'North Germanic';

      ctx.save();

      // Outer halo for selected or hovered node
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(node.screenX, node.screenY, node.screenRadius + 8, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(37, 93, 54, 0.18)' : 'rgba(87, 83, 78, 0.12)';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#255D36' : '#57534E';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
      }

      // Node Body Circle
      ctx.beginPath();
      ctx.arc(node.screenX, node.screenY, node.screenRadius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? '#255D36'
        : isNorthGermanic
        ? '#EDE7DE'
        : '#E8EFF5';
      ctx.fill();

      ctx.strokeStyle = isSelected
        ? '#1C1917'
        : isNorthGermanic
        ? '#8F581B'
        : '#2D516B';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.setLineDash([]);
      ctx.stroke();

      // Inner text: Language ISO Code
      ctx.font = `600 ${Math.max(10, Math.round(13 * node.scale))}px "Noto Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isSelected ? '#FAF8F5' : '#1C1917';
      ctx.fillText(node.code.toUpperCase(), node.screenX, node.screenY);

      // Label below: Full Language Name + Volume
      ctx.font = `500 ${Math.max(11, Math.round(12 * node.scale))}px "Noto Sans", sans-serif`;
      ctx.fillStyle = isSelected ? '#1C1917' : '#57534E';
      ctx.fillText(node.name, node.screenX, node.screenY + node.screenRadius + 14);

      // Subtitle: Branch indicator
      ctx.font = `italic 400 ${Math.max(9, Math.round(10 * node.scale))}px "Noto Sans", sans-serif`;
      ctx.fillStyle = '#78716C';
      ctx.fillText(node.subbranch, node.screenX, node.screenY + node.screenRadius + 27);

      ctx.restore();
    });
  }, [
    dimension,
    activeMetric,
    showCognateBridges,
    showFalseFriendFaults,
    selectedLang,
    hoveredLang,
    camera,
    nodePositions,
    pairMap,
  ]);

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

  // Mouse / Pointer handlers for interactive 3D rotation
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check hit testing for hover
    const hitNode = nodePositions.find((n) => {
      let x = n.pos2d.x + rect.width / 2;
      let y = n.pos2d.y + rect.height / 2;
      if (dimension === '3d') {
        const proj = project3D(n.pos3d, rect.width, rect.height, camera);
        x = proj.x2d;
        y = proj.y2d;
      }
      const dist = Math.hypot(mouseX - x, mouseY - y);
      return dist <= n.radius + 6;
    });

    if (hitNode) {
      setHoveredLang(hitNode.code);
    } else if (hoveredLang !== null) {
      setHoveredLang(null);
    }

    // Drag camera rotation in 3D mode
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

    const hitNode = nodePositions.find((n) => {
      let x = n.pos2d.x + rect.width / 2;
      let y = n.pos2d.y + rect.height / 2;
      if (dimension === '3d') {
        const proj = project3D(n.pos3d, rect.width, rect.height, camera);
        x = proj.x2d;
        y = proj.y2d;
      }
      const dist = Math.hypot(mouseX - x, mouseY - y);
      return dist <= n.radius + 6;
    });

    if (hitNode) {
      setSelectedLang(hitNode.code === selectedLang ? null : hitNode.code);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (dimension !== '3d') return;
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0012;
    setCamera((prev) => ({
      ...prev,
      zoom: Math.max(0.45, Math.min(2.5, prev.zoom + zoomDelta)),
    }));
  };

  return (
    <div className="space-y-4">
      {/* Control Plate */}
      <div className="border border-book-rule bg-page-surface p-3 sm:p-4 rounded-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Dimension & Metric Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* 2D vs 3D Selector */}
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
                2D Field Chart
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
                <MaterialSymbol icon="view_in_ar" size={14} />
                3D Spatial Mesh
              </button>
            </div>
          </div>

          {/* Metric Space Selector */}
          <div className="flex items-center gap-1.5">
            <span className="typo-sublabel text-ink-muted">Metric Space:</span>
            <div className="inline-flex items-center border border-book-rule bg-page-muted/40 p-0.5 rounded-xs">
              <button
                type="button"
                onClick={() => setActiveMetric('phonetic')}
                className={`px-2 py-1 rounded-xs typo-sublabel transition-all cursor-pointer ${
                  activeMetric === 'phonetic'
                    ? 'bg-page-surface border border-book-rule-strong text-ink-main font-semibold shadow-2xs'
                    : 'text-ink-muted hover:text-ink-main'
                }`}
                title="Positions nodes by acoustic phonetic distance"
              >
                Phonetic Space
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric('orthographic')}
                className={`px-2 py-1 rounded-xs typo-sublabel transition-all cursor-pointer ${
                  activeMetric === 'orthographic'
                    ? 'bg-page-surface border border-book-rule-strong text-ink-main font-semibold shadow-2xs'
                    : 'text-ink-muted hover:text-ink-main'
                }`}
                title="Positions nodes by written orthographic distance"
              >
                Orthographic Space
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric('semantic')}
                className={`px-2 py-1 rounded-xs typo-sublabel transition-all cursor-pointer ${
                  activeMetric === 'semantic'
                    ? 'bg-page-surface border border-book-rule-strong text-ink-main font-semibold shadow-2xs'
                    : 'text-ink-muted hover:text-ink-main'
                }`}
                title="Positions nodes by overall semantic vocabulary overlap"
              >
                Semantic Overlap
              </button>
            </div>
          </div>
        </div>

        {/* Edge Filter Toggles & 3D Reset */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 typo-sublabel text-ink-main cursor-pointer">
            <input
              type="checkbox"
              checked={showCognateBridges}
              onChange={(e) => setShowCognateBridges(e.target.checked)}
              className="accent-cognate-ink"
            />
            <span className="inline-block w-2.5 h-0.5 bg-cognate-ink rounded-full"></span>
            Cognate Bridges
          </label>

          <label className="flex items-center gap-1.5 typo-sublabel text-ink-main cursor-pointer">
            <input
              type="checkbox"
              checked={showFalseFriendFaults}
              onChange={(e) => setShowFalseFriendFaults(e.target.checked)}
              className="accent-falsefriend-ink"
            />
            <span className="inline-block w-2.5 h-0.5 border-b border-dashed border-falsefriend-ink"></span>
            False Friend Faults
          </label>

          {dimension === '3d' && (
            <button
              type="button"
              onClick={() => setCamera({ ...DEFAULT_CAMERA, yaw: 0.6, pitch: 0.28, zoom: 1.05 })}
              className="px-2 py-0.5 border border-book-rule bg-page-surface hover:bg-page-muted rounded-xs typo-subscript text-ink-muted transition-colors cursor-pointer"
            >
              Reset View
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Stage & Side Inspection Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Canvas Display Stage */}
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
            className={`w-full h-full ${dimension === '3d' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
          />

          {/* Canvas HUD Legend */}
          <div className="absolute top-3 left-3 bg-page-surface/90 border border-book-rule/80 px-2.5 py-1.5 rounded-xs backdrop-blur-xs text-ink-muted pointer-events-none space-y-0.5">
            <span className="typo-overline block text-ink-main">
              {dimension === '3d' ? '3D Spatial Constellation' : '2D Triangulation Map'}
            </span>
            <span className="typo-subscript block text-2xs">
              {dimension === '3d'
                ? 'Drag to rotate coordinate orbit · Wheel to zoom'
                : 'Static intrinsic linguistic plane'}
            </span>
          </div>

          {/* Quick Selection Prompt */}
          <div className="absolute bottom-3 left-3 bg-page-surface/90 border border-book-rule/80 px-3 py-1 rounded-xs backdrop-blur-xs text-ink-muted pointer-events-none">
            <span className="typo-subscript text-2xs">
              {selectedLang
                ? `Focusing on ${getLanguageName(selectedLang)} (click node again to deselect)`
                : 'Click any language node to illuminate mutual tension vectors'}
            </span>
          </div>
        </div>

        {/* Bilateral Specimen Inspection Card */}
        <div className="lg:col-span-4 border border-book-rule bg-page-surface p-4 sm:p-5 rounded-xs space-y-4 shadow-xs">
          {selectedLangData ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="border-b border-book-rule pb-3">
                <span className="typo-overline text-cognate-ink block">
                  Focused Specimen Node
                </span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <h3 className="typo-section-header text-ink-main">
                    {selectedLangData.name} ({selectedLangData.code.toUpperCase()})
                  </h3>
                  <span className="typo-subscript text-ink-muted">
                    {selectedLangData.branch}
                  </span>
                </div>
                <p className="typo-gloss text-ink-muted mt-1">
                  Catalogued overlap: ~{selectedLangData.approxLexiconSize.toLocaleString()} headwords across the Germanic continuum.
                </p>
              </div>

              {/* Bilateral Relations Tensor List */}
              <div className="space-y-2">
                <span className="typo-sublabel block font-semibold text-ink-main">
                  Mutual Relational Vectors
                </span>
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {selectedRelations.map((rel) => {
                    const isTrapHeavy = rel.ffRatio > 0.2;
                    return (
                      <div
                        key={rel.target.code}
                        onMouseEnter={() => setHoveredLang(rel.target.code)}
                        onMouseLeave={() => setHoveredLang(null)}
                        className={`border p-2.5 rounded-xs transition-all cursor-pointer ${
                          hoveredLang === rel.target.code
                            ? 'border-cognate-border bg-cognate-bg/30 shadow-2xs'
                            : 'border-book-rule/70 bg-page-muted/20 hover:border-book-rule-strong'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <strong className="typo-headword-row text-ink-main text-sm">
                            {selectedLangData.name} ↔ {rel.target.name}
                          </strong>
                          <span className="typo-lang-code text-2xs">
                            {rel.target.code.toUpperCase()}
                          </span>
                        </div>

                        {/* Comparative metrics */}
                        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-book-rule/40 text-center">
                          <div>
                            <span className="typo-subscript block text-2xs text-ink-muted">Phonetic</span>
                            <strong className="typo-metric text-xs text-ink-main">
                              {Math.round(rel.phon * 100)}%
                            </strong>
                          </div>
                          <div>
                            <span className="typo-subscript block text-2xs text-ink-muted">Orthographic</span>
                            <strong className="typo-metric text-xs text-ink-main">
                              {Math.round(rel.ortho * 100)}%
                            </strong>
                          </div>
                          <div>
                            <span className="typo-subscript block text-2xs text-ink-muted">Trap Hazard</span>
                            <strong
                              className={`typo-metric text-xs font-semibold ${
                                isTrapHeavy ? 'text-falsefriend-ink' : 'text-cognate-ink'
                              }`}
                            >
                              {Math.round(rel.ffRatio * 100)}%
                            </strong>
                          </div>
                        </div>

                        {/* Asymmetry Note if present */}
                        {rel.asymmetryNote && (
                          <p className="typo-note mt-2 pt-1.5 border-t border-book-rule/30 text-2xs leading-relaxed text-ink-muted italic">
                            {rel.asymmetryNote}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-ink-muted space-y-2">
              <MaterialSymbol icon="touch_app" size={32} className="text-ink-muted/50" />
              <p className="typo-body text-sm font-medium">No language selected</p>
              <p className="typo-gloss text-xs">
                Select any language node on the canvas to inspect its mutual distance vectors, phonetic rifts, and cognate bridges.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
