/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MathFunction,
  GraphBounds,
  CriticalPoint,
  TracePoint,
  AngleMode,
} from '../types/calculator';
import { MathEngine, ASTNode } from '../lib/mathEngine';
import { getLineStyleConfig } from '../lib/lineStyles';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Camera,
  Layers,
  Compass,
  Crosshair,
  Activity,
} from 'lucide-react';

interface GraphCanvasProps {
  functions: MathFunction[];
  angleMode: AngleMode;
  showCriticalPoints: boolean;
  showGrid: boolean;
  onSelectFunction?: (id: string) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  functions,
  angleMode,
  showCriticalPoints,
  showGrid,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Coordinate plane bounds
  const [bounds, setBounds] = useState<GraphBounds>({
    xMin: -10,
    xMax: 10,
    yMin: -6,
    yMax: 6,
  });

  // State for panning
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; bounds: GraphBounds }>({
    x: 0,
    y: 0,
    bounds: { ...bounds },
  });

  // Mouse hover & tracing
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [tracePoint, setTracePoint] = useState<TracePoint | null>(null);
  const [isTracing, setIsTracing] = useState(true);

  // Critical points found in current bounds
  const [criticalPoints, setCriticalPoints] = useState<CriticalPoint[]>([]);

  // FPS & render performance stats
  const [renderTimeMs, setRenderTimeMs] = useState(0.8);
  const [pointsDrawn, setPointsDrawn] = useState(0);

  // Compiled functions cache
  const compiledFnsRef = useRef<
    Map<
      string,
      {
        fn: (x: number) => number;
        dfn: (x: number) => number;
        ast: ASTNode;
        diffAst: ASTNode;
      }
    >
  >(new Map());

  // Compile ASTs when functions change
  useEffect(() => {
    const map = new Map();
    for (const f of functions) {
      if (!f.visible || !f.expression.trim()) continue;
      try {
        const ast = MathEngine.parse(f.expression);
        const diffAst = MathEngine.differentiate(ast);
        const fn = MathEngine.compile(ast, angleMode);
        const dfn = MathEngine.compile(diffAst, angleMode);
        map.set(f.id, { fn, dfn, ast, diffAst });
      } catch {
        // syntax error handled in notebook row
      }
    }
    compiledFnsRef.current = map;
  }, [functions, angleMode]);

  // Find critical points (roots, extrema, y-intercepts) in visible bounds
  useEffect(() => {
    if (!showCriticalPoints) {
      setCriticalPoints([]);
      return;
    }

    const points: CriticalPoint[] = [];

    compiledFnsRef.current.forEach((compiled, id) => {
      const funcMeta = functions.find((f) => f.id === id);
      if (!funcMeta || !funcMeta.visible) return;

      const { fn, dfn } = compiled;

      // 1. Roots (x-intercepts)
      const roots = MathEngine.findRoots(fn, bounds.xMin, bounds.xMax, 250);
      for (const r of roots) {
        points.push({
          x: r,
          y: 0,
          type: 'root',
          label: `Root (${r.toFixed(3)}, 0)`,
          functionId: id,
          color: funcMeta.color,
        });
      }

      // 2. Y-intercept (at x = 0 if within bounds)
      if (bounds.xMin <= 0 && bounds.xMax >= 0) {
        const y0 = fn(0);
        if (isFinite(y0) && y0 >= bounds.yMin && y0 <= bounds.yMax) {
          points.push({
            x: 0,
            y: parseFloat(y0.toFixed(3)),
            type: 'y_intercept',
            label: `y-int (0, ${y0.toFixed(3)})`,
            functionId: id,
            color: funcMeta.color,
          });
        }
      }

      // 3. Local Extrema (peaks and troughs)
      const extrema = MathEngine.findExtrema(fn, dfn, bounds.xMin, bounds.xMax);
      for (const e of extrema) {
        if (e.y >= bounds.yMin && e.y <= bounds.yMax) {
          points.push({
            x: e.x,
            y: e.y,
            type: e.type,
            label: `${e.type === 'local_max' ? 'Max' : 'Min'} (${e.x.toFixed(3)}, ${e.y.toFixed(3)})`,
            functionId: id,
            color: funcMeta.color,
          });
        }
      }
    });

    setCriticalPoints(points);
  }, [bounds, functions, showCriticalPoints, angleMode]);

  // Convert canvas pixel to math coordinate
  const toMathCoords = useCallback(
    (px: number, py: number, width: number, height: number) => {
      const x = bounds.xMin + (px / width) * (bounds.xMax - bounds.xMin);
      const y = bounds.yMax - (py / height) * (bounds.yMax - bounds.yMin);
      return { x, y };
    },
    [bounds]
  );

  // Convert math coordinate to canvas pixel
  const toPixelCoords = useCallback(
    (mx: number, my: number, width: number, height: number) => {
      const px = ((mx - bounds.xMin) / (bounds.xMax - bounds.xMin)) * width;
      const py = ((bounds.yMax - my) / (bounds.yMax - bounds.yMin)) * height;
      return { px, py };
    },
    [bounds]
  );

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tStart = performance.now();

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear background: Deep obsidian telemetry canvas
    ctx.fillStyle = '#090D14';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Grid Lines & Tick Labels
    if (showGrid) {
      drawGrid(ctx, width, height);
    }

    // 2. Draw Main Coordinate Axes (X and Y = 0)
    drawAxes(ctx, width, height);

    // 3. Draw Curves
    let totalSamples = 0;
    const stepPx = 1; // 1 sample per pixel column
    const numSteps = Math.ceil(width / stepPx);

    compiledFnsRef.current.forEach((compiled, id) => {
      const meta = functions.find((f) => f.id === id);
      if (!meta || !meta.visible) return;

      const { fn, dfn } = compiled;

      // Draw primary curve with selected line type and width
      const styleCfg = getLineStyleConfig(meta.lineType);
      const strokeWidth = meta.lineWidth || 2.2;

      ctx.save();
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = meta.color;
      ctx.fillStyle = meta.color;

      if (styleCfg.id === 'points-only') {
        // Discrete scatter points line type
        const markerSpacingPx = 12;
        for (let px = 0; px <= width; px += markerSpacingPx) {
          const mx = bounds.xMin + (px / width) * (bounds.xMax - bounds.xMin);
          const my = fn(mx);
          totalSamples++;
          if (!isFinite(my)) continue;
          const py = ((bounds.yMax - my) / (bounds.yMax - bounds.yMin)) * height;
          if (py >= -20 && py <= height + 20) {
            ctx.beginPath();
            ctx.arc(px, py, Math.max(2.5, strokeWidth + 0.5), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        ctx.setLineDash(styleCfg.dash);
        ctx.beginPath();

        let isDrawing = false;
        let prevY = 0;

        for (let s = 0; s <= numSteps; s++) {
          const px = s * stepPx;
          const mx = bounds.xMin + (px / width) * (bounds.xMax - bounds.xMin);
          const my = fn(mx);
          totalSamples++;

          if (!isFinite(my)) {
            isDrawing = false;
            continue;
          }

          const py = ((bounds.yMax - my) / (bounds.yMax - bounds.yMin)) * height;

          // Detect vertical asymptote jumps (e.g. tan(x), 1/x)
          if (isDrawing && Math.abs(py - prevY) > height * 0.75) {
            isDrawing = false;
          }

          if (!isDrawing) {
            ctx.moveTo(px, py);
            isDrawing = true;
          } else {
            if (styleCfg.id === 'stepped') {
              // Staircase zero-order hold: horizontal then vertical
              ctx.lineTo(px, prevY);
              ctx.lineTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          }
          prevY = py;
        }
        ctx.stroke();
      }
      ctx.restore();

      // If user enabled symbolic derivative overlay, render dashed curve
      if (meta.showDerivative) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = meta.derivativeColor || '#94A3B8';
        ctx.beginPath();
        let isDfnDrawing = false;
        let prevDpy = 0;

        for (let s = 0; s <= numSteps; s++) {
          const px = s * stepPx;
          const mx = bounds.xMin + (px / width) * (bounds.xMax - bounds.xMin);
          const dmy = dfn(mx);

          if (!isFinite(dmy)) {
            isDfnDrawing = false;
            continue;
          }

          const dpy = ((bounds.yMax - dmy) / (bounds.yMax - bounds.yMin)) * height;
          if (isDfnDrawing && Math.abs(dpy - prevDpy) > height * 0.75) {
            isDfnDrawing = false;
          }

          if (!isDfnDrawing) {
            ctx.moveTo(px, dpy);
            isDfnDrawing = true;
          } else {
            ctx.lineTo(px, dpy);
          }
          prevDpy = dpy;
        }
        ctx.stroke();
        ctx.restore();
      }
    });

    setPointsDrawn(totalSamples);

    // 4. Draw Critical Points (Roots, Extrema, Intercepts)
    if (showCriticalPoints) {
      for (const cp of criticalPoints) {
        const { px, py } = toPixelCoords(cp.x, cp.y, width, height);
        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          ctx.save();
          ctx.fillStyle = cp.color;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Subtle label
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.fillStyle = '#CBD5E1';
          ctx.fillText(`(${cp.x.toFixed(2)}, ${cp.y.toFixed(2)})`, px + 6, py - 6);
          ctx.restore();
        }
      }
    }

    // 5. Draw Curve Tracing Crosshair & Tangent Line
    if (isTracing && tracePoint) {
      const { px, py } = toPixelCoords(tracePoint.x, tracePoint.y, width, height);
      if (px >= 0 && px <= width && py >= 0 && py <= height) {
        ctx.save();

        // Tangent Line
        const m = tracePoint.slope;
        if (isFinite(m)) {
          const dxRange = (bounds.xMax - bounds.xMin) * 0.15;
          const x1 = tracePoint.x - dxRange;
          const x2 = tracePoint.x + dxRange;
          const y1 = tracePoint.y - m * dxRange;
          const y2 = tracePoint.y + m * dxRange;

          const p1 = toPixelCoords(x1, y1, width, height);
          const p2 = toPixelCoords(x2, y2, width, height);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.setLineDash([2, 2]);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.stroke();
        }

        // Trace Bead
        ctx.fillStyle = tracePoint.color;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }
    }

    ctx.restore();

    const tEnd = performance.now();
    setRenderTimeMs(parseFloat((tEnd - tStart).toFixed(2)));
  }, [
    bounds,
    functions,
    showGrid,
    showCriticalPoints,
    criticalPoints,
    isTracing,
    tracePoint,
    toPixelCoords,
  ]);

  // Helper: Draw Grid
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const xSpan = bounds.xMax - bounds.xMin;
    const ySpan = bounds.yMax - bounds.yMin;

    // Calculate smart tick intervals (e.g. 0.2, 0.5, 1, 2, 5, 10, ...)
    const getTickStep = (span: number, targetTicks: number) => {
      const rough = span / targetTicks;
      const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
      const normalized = rough / magnitude;
      if (normalized < 1.5) return 1 * magnitude;
      if (normalized < 3.5) return 2 * magnitude;
      if (normalized < 7.5) return 5 * magnitude;
      return 10 * magnitude;
    };

    const xStep = getTickStep(xSpan, width / 75);
    const yStep = getTickStep(ySpan, height / 75);

    // Major grid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#162032';

    // Vertical lines
    const firstX = Math.floor(bounds.xMin / xStep) * xStep;
    for (let x = firstX; x <= bounds.xMax; x += xStep) {
      const px = ((x - bounds.xMin) / xSpan) * width;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();

      // Tick number
      if (Math.abs(x) > 1e-6) {
        ctx.fillStyle = '#64748B';
        ctx.font = '10px JetBrains Mono, monospace';
        const label = parseFloat(x.toFixed(4)).toString();
        const originY = ((bounds.yMax - 0) / ySpan) * height;
        const textY = Math.min(Math.max(originY + 14, 16), height - 6);
        ctx.fillText(label, px + 3, textY);
      }
    }

    // Horizontal lines
    const firstY = Math.floor(bounds.yMin / yStep) * yStep;
    for (let y = firstY; y <= bounds.yMax; y += yStep) {
      const py = ((bounds.yMax - y) / ySpan) * height;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
      ctx.stroke();

      // Tick number
      if (Math.abs(y) > 1e-6) {
        ctx.fillStyle = '#64748B';
        ctx.font = '10px JetBrains Mono, monospace';
        const label = parseFloat(y.toFixed(4)).toString();
        const originX = ((0 - bounds.xMin) / xSpan) * width;
        const textX = Math.min(Math.max(originX + 6, 6), width - 36);
        ctx.fillText(label, textX, py - 3);
      }
    }
  };

  // Helper: Draw Axes
  const drawAxes = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const xSpan = bounds.xMax - bounds.xMin;
    const ySpan = bounds.yMax - bounds.yMin;

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#334155';

    // X-Axis (y = 0)
    if (bounds.yMin <= 0 && bounds.yMax >= 0) {
      const py = ((bounds.yMax - 0) / ySpan) * height;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
      ctx.stroke();
    }

    // Y-Axis (x = 0)
    if (bounds.xMin <= 0 && bounds.xMax >= 0) {
      const px = ((0 - bounds.xMin) / xSpan) * width;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }
  };

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      bounds: { ...bounds },
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    setMousePos({ x: px, y: py });

    // Handle Pan Drag
    if (isDragging) {
      const dxPx = e.clientX - dragStartRef.current.x;
      const dyPx = e.clientY - dragStartRef.current.y;

      const xSpan = dragStartRef.current.bounds.xMax - dragStartRef.current.bounds.xMin;
      const ySpan = dragStartRef.current.bounds.yMax - dragStartRef.current.bounds.yMin;

      const dxMath = (dxPx / rect.width) * xSpan;
      const dyMath = (dyPx / rect.height) * ySpan;

      setBounds({
        xMin: dragStartRef.current.bounds.xMin - dxMath,
        xMax: dragStartRef.current.bounds.xMax - dxMath,
        yMin: dragStartRef.current.bounds.yMin + dyMath,
        yMax: dragStartRef.current.bounds.yMax + dyMath,
      });
      return;
    }

    // Handle Curve Tracing
    if (isTracing) {
      const { x: mathX } = toMathCoords(px, py, rect.width, rect.height);
      let closestDist = Infinity;
      let bestPoint: TracePoint | null = null;

      compiledFnsRef.current.forEach((compiled, id) => {
        const meta = functions.find((f) => f.id === id);
        if (!meta || !meta.visible) return;

        const mathY = compiled.fn(mathX);
        if (!isFinite(mathY)) return;

        const ptPx = toPixelCoords(mathX, mathY, rect.width, rect.height);
        const dist = Math.abs(ptPx.py - py);

        if (dist < closestDist && dist < 50) {
          closestDist = dist;
          bestPoint = {
            x: mathX,
            y: mathY,
            slope: compiled.dfn(mathX),
            functionId: id,
            functionName: meta.name,
            color: meta.color,
          };
        }
      });

      setTracePoint(bestPoint);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom Handler (wheel centered at mouse position)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 0.88 : 1.14;
    zoomAtPixel(px, py, rect.width, rect.height, zoomFactor);
  };

  const zoomAtPixel = (
    px: number,
    py: number,
    width: number,
    height: number,
    factor: number
  ) => {
    const { x: focusX, y: focusY } = toMathCoords(px, py, width, height);

    const newXSpan = (bounds.xMax - bounds.xMin) * factor;
    const newYSpan = (bounds.yMax - bounds.yMin) * factor;

    // Prevent extreme zooms
    if (newXSpan < 1e-6 || newXSpan > 1e9) return;

    const xRatio = px / width;
    const yRatio = py / height;

    setBounds({
      xMin: focusX - xRatio * newXSpan,
      xMax: focusX + (1 - xRatio) * newXSpan,
      yMin: focusY - (1 - yRatio) * newYSpan,
      yMax: focusY + yRatio * newYSpan,
    });
  };

  // Presets
  const handleZoomIn = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    zoomAtPixel(rect.width / 2, rect.height / 2, rect.width, rect.height, 0.75);
  };

  const handleZoomOut = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    zoomAtPixel(rect.width / 2, rect.height / 2, rect.width, rect.height, 1.33);
  };

  const handleResetView = () => {
    setBounds({ xMin: -10, xMax: 10, yMin: -6, yMax: 6 });
  };

  const handleTrigPreset = () => {
    setBounds({
      xMin: -2 * Math.PI,
      xMax: 2 * Math.PI,
      yMin: -3,
      yMax: 3,
    });
  };

  // Export Screenshot
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `rustcalc_graph_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full bg-[#090D14] overflow-hidden select-none"
    >
      {/* 2D Canvas */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setTracePoint(null);
        }}
        onWheel={handleWheel}
      />

      {/* Real-Time Telemetry Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-[#0E1420]/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg shadow-lg pointer-events-none text-xs font-mono text-slate-300">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>WASM Canvas</span>
        </div>
        <span className="text-slate-600">|</span>
        <span className="text-emerald-400">{renderTimeMs}ms</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">{pointsDrawn} samples</span>
        <span className="text-slate-600">|</span>
        <span className="text-cyan-300 font-semibold uppercase">{angleMode}</span>
      </div>

      {/* Floating Trace Tooltip HUD */}
      {isTracing && tracePoint && (
        <div
          className="absolute z-20 pointer-events-none bg-[#0E1420]/95 border border-slate-700/80 px-3 py-2 rounded-lg shadow-xl text-xs font-mono text-slate-200"
          style={{
            left: `${mousePos?.x ?? 0}px`,
            top: `${(mousePos?.y ?? 0) - 68}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1 text-[11px] font-semibold" style={{ color: tracePoint.color }}>
            <span>{tracePoint.functionName}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300">
            <div>
              <span className="text-slate-500">x: </span>
              <span className="text-cyan-400">{tracePoint.x.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-slate-500">y: </span>
              <span className="text-emerald-400">{tracePoint.y.toFixed(4)}</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            <span className="text-slate-500">slope f'(x): </span>
            <span className="text-amber-400">{tracePoint.slope.toFixed(4)}</span>
          </div>
        </div>
      )}

      {/* Graph Control Toolbar (Top Right) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 bg-[#0E1420]/90 backdrop-blur border border-slate-800 p-1 rounded-lg shadow-lg">
        <button
          onClick={handleZoomIn}
          title="Zoom In (+)"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out (-)"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          title="Reset Standard Window [-10, 10]"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={handleTrigPreset}
          title="Trigonometric Window [-2π, 2π]"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors font-mono text-xs font-bold"
        >
          π
        </button>
        <div className="w-full h-px bg-slate-800 my-0.5" />
        <button
          onClick={() => setIsTracing(!isTracing)}
          title={isTracing ? 'Disable Curve Tracing' : 'Enable Curve Tracing'}
          className={`p-2 rounded-md transition-colors ${
            isTracing ? 'text-cyan-400 bg-cyan-950/40' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          onClick={handleExportPNG}
          title="Export High-Res PNG"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>

      {/* Window Coordinates Status (Bottom Right) */}
      <div className="absolute bottom-3 right-4 z-10 flex items-center gap-3 bg-[#0E1420]/80 backdrop-blur border border-slate-800/80 px-2.5 py-1 rounded text-[11px] font-mono text-slate-400 pointer-events-none">
        <span>X: [{bounds.xMin.toFixed(2)}, {bounds.xMax.toFixed(2)}]</span>
        <span>Y: [{bounds.yMin.toFixed(2)}, {bounds.yMax.toFixed(2)}]</span>
      </div>
    </div>
  );
};
