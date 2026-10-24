/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MathFunction, AngleMode, TableRow, LineStyle } from '../types/calculator';
import { MathEngine } from '../lib/mathEngine';
import { LINE_STYLES, getLineStyleConfig } from '../lib/lineStyles';
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Table as TableIcon,
  Calculator,
  Sliders,
  Check,
  Sparkles,
  Spline,
} from 'lucide-react';

interface FunctionNotebookProps {
  functions: MathFunction[];
  angleMode: AngleMode;
  onUpdateFunctions: (fns: MathFunction[]) => void;
  onAddFunction: (expr?: string, color?: string) => void;
  onDeleteFunction: (id: string) => void;
  activeInputRef?: React.MutableRefObject<HTMLInputElement | null>;
}

const PALETTE = [
  '#06B6D4', // Laser Cyan
  '#F59E0B', // Telemetry Amber
  '#10B981', // Emerald Jade
  '#8B5CF6', // Orchid Violet
  '#F43F5E', // Crimson Rose
  '#3B82F6', // Cobalt Blue
  '#EAB308', // Solar Yellow
  '#14B8A6', // Teal
];

const PRESETS = [
  { label: 'Cubic Polynomial', expr: 'x^3 - 3*x' },
  { label: 'Damped Sine Wave', expr: 'exp(-0.2*x) * sin(2*x)' },
  { label: 'Gaussian Normal', expr: 'exp(-x^2 / 2) / sqrt(2*pi)' },
  { label: 'Harmonic Product', expr: 'sin(x) * cos(2*x)' },
  { label: 'Sigmoid / Logistic', expr: '1 / (1 + exp(-x))' },
  { label: 'Rational Hyperbola', expr: '1 / (x^2 + 1)' },
];

export const LineStylePreview: React.FC<{
  styleId?: LineStyle;
  color?: string;
  width?: number;
}> = ({ styleId = 'solid', color = 'currentColor', width = 42 }) => {
  const cfg = getLineStyleConfig(styleId);

  if (cfg.id === 'points-only') {
    return (
      <svg width={width} height="12" viewBox={`0 0 ${width} 12`} className="overflow-visible shrink-0">
        <circle cx={width * 0.15} cy="6" r="2.2" fill={color} />
        <circle cx={width * 0.38} cy="6" r="2.2" fill={color} />
        <circle cx={width * 0.62} cy="6" r="2.2" fill={color} />
        <circle cx={width * 0.85} cy="6" r="2.2" fill={color} />
      </svg>
    );
  }

  if (cfg.id === 'stepped') {
    return (
      <svg width={width} height="12" viewBox={`0 0 ${width} 12`} className="overflow-visible shrink-0">
        <path
          d={`M 0 9 L ${width * 0.3} 9 L ${width * 0.3} 3 L ${width * 0.65} 3 L ${width * 0.65} 9 L ${width} 9`}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg width={width} height="12" viewBox={`0 0 ${width} 12`} className="overflow-visible shrink-0">
      <line
        x1="0"
        y1="6"
        x2={width}
        y2="6"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={cfg.dash.length > 0 ? cfg.dash.join(' ') : undefined}
      />
    </svg>
  );
};

export const FunctionNotebook: React.FC<FunctionNotebookProps> = ({
  functions,
  angleMode,
  onUpdateFunctions,
  onAddFunction,
  onDeleteFunction,
  activeInputRef,
}) => {
  const [expandedCalcs, setExpandedCalcs] = useState<Record<string, boolean>>({});
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  const [activeLinePicker, setActiveLinePicker] = useState<string | null>(null);
  const [tableModalFn, setTableModalFn] = useState<{ id: string; name: string; expr: string } | null>(null);
  const [tableStep, setTableStep] = useState(1);
  const [tableRange, setTableRange] = useState({ min: -5, max: 5 });

  // Integral inputs per function
  const [integralBounds, setIntegralBounds] = useState<Record<string, { a: string; b: string; res?: string }>>({});

  const toggleVisibility = (id: string) => {
    onUpdateFunctions(
      functions.map((f) => (f.id === id ? { ...f, visible: !f.visible } : f))
    );
  };

  const toggleDerivative = (id: string) => {
    onUpdateFunctions(
      functions.map((f) =>
        f.id === id ? { ...f, showDerivative: !f.showDerivative } : f
      )
    );
  };

  const handleExpressionChange = (id: string, newExpr: string) => {
    let err: string | null = null;
    if (newExpr.trim()) {
      try {
        MathEngine.parse(newExpr);
      } catch (e: any) {
        err = e.message;
      }
    }
    onUpdateFunctions(
      functions.map((f) => (f.id === id ? { ...f, expression: newExpr, error: err } : f))
    );
  };

  const setColor = (id: string, color: string) => {
    onUpdateFunctions(
      functions.map((f) => (f.id === id ? { ...f, color } : f))
    );
    setActiveColorPicker(null);
  };

  const setLineStyle = (id: string, style: LineStyle) => {
    onUpdateFunctions(
      functions.map((f) => (f.id === id ? { ...f, lineType: style } : f))
    );
    setActiveLinePicker(null);
  };

  const setLineWidth = (id: string, width: number) => {
    onUpdateFunctions(
      functions.map((f) => (f.id === id ? { ...f, lineWidth: width } : f))
    );
  };

  const getDerivativeFormula = (expr: string): string => {
    try {
      const ast = MathEngine.parse(expr);
      const diffAst = MathEngine.differentiate(ast);
      return MathEngine.stringify(diffAst);
    } catch {
      return 'Derivative unavailable';
    }
  };

  const computeIntegral = (id: string, expr: string) => {
    const bounds = integralBounds[id] || { a: '0', b: '3' };
    const aNum = parseFloat(bounds.a);
    const bNum = parseFloat(bounds.b);

    if (isNaN(aNum) || isNaN(bNum)) {
      setIntegralBounds({
        ...integralBounds,
        [id]: { ...bounds, res: 'Invalid limits' },
      });
      return;
    }

    try {
      const ast = MathEngine.parse(expr);
      const val = MathEngine.adaptiveSimpson(ast, aNum, bNum, {}, angleMode);
      setIntegralBounds({
        ...integralBounds,
        [id]: { ...bounds, res: MathEngine.formatNumber(val) },
      });
    } catch (e: any) {
      setIntegralBounds({
        ...integralBounds,
        [id]: { ...bounds, res: 'Error' },
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0E1420] border-r border-slate-800/80 text-slate-200 select-none">
      {/* Notebook Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-wide">Functions & Equations</h2>
          <p className="text-[11px] text-slate-400">Real-time multi-curve graphing notebook</p>
        </div>

        {/* Add Preset Dropdown */}
        <div className="relative group">
          <button
            onClick={() => onAddFunction()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Function</span>
          </button>
        </div>
      </div>

      {/* Quick Presets Strip */}
      <div className="px-4 py-2 bg-[#090D14]/70 border-b border-slate-800/60 overflow-x-auto flex items-center gap-2 text-xs">
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider shrink-0">Presets:</span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => onAddFunction(p.expr)}
            className="px-2 py-0.5 text-[11px] font-mono text-slate-300 hover:text-cyan-400 bg-slate-800/60 hover:bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Function Rows List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {functions.map((fn, index) => {
          const isExpanded = !!expandedCalcs[fn.id];
          const derivativeStr = fn.expression ? getDerivativeFormula(fn.expression) : '';
          const intData = integralBounds[fn.id] || { a: '0', b: '3' };

          return (
            <div
              key={fn.id}
              className={`rounded-xl border transition-all ${
                fn.error
                  ? 'border-rose-900/60 bg-rose-950/10'
                  : 'border-slate-800/80 bg-[#121927]/90 hover:border-slate-700'
              } p-3.5 shadow-sm`}
            >
              {/* Function Row Main Line */}
              <div className="flex items-center gap-2.5">
                {/* Visibility Toggle */}
                <button
                  onClick={() => toggleVisibility(fn.id)}
                  className="text-slate-400 hover:text-white transition-colors"
                  title={fn.visible ? 'Hide Curve' : 'Show Curve'}
                >
                  {fn.visible ? (
                    <Eye className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-600" />
                  )}
                </button>

                {/* Color Pill & Swatch */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setActiveColorPicker(activeColorPicker === fn.id ? null : fn.id);
                      setActiveLinePicker(null);
                    }}
                    className="w-5 h-5 rounded-full border-2 border-white/20 transition-transform hover:scale-110 shadow-sm"
                    style={{ backgroundColor: fn.color }}
                    title="Change Curve Color"
                  />
                  {activeColorPicker === fn.id && (
                    <div className="absolute top-7 left-0 z-30 p-2 bg-[#1A2333] border border-slate-700 rounded-lg shadow-xl grid grid-cols-4 gap-1.5 w-36">
                      {PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => setColor(fn.id, c)}
                          className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform flex items-center justify-center"
                          style={{ backgroundColor: c }}
                        >
                          {fn.color === c && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Line Type Picker Button with live preview (12 Line Styles) */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setActiveLinePicker(activeLinePicker === fn.id ? null : fn.id);
                      setActiveColorPicker(null);
                    }}
                    className="h-6 px-1.5 rounded-md border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 transition-colors flex items-center gap-1 shrink-0"
                    title="Change Line Type (12 line styles available)"
                  >
                    <LineStylePreview styleId={fn.lineType} color={fn.color} width={28} />
                    <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                  </button>

                  {activeLinePicker === fn.id && (
                    <div className="absolute top-8 left-0 z-40 p-2.5 bg-[#121927] border border-slate-700 rounded-xl shadow-2xl w-64 text-xs select-none">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-semibold text-slate-300">
                        <span>Line Type & Stroke</span>
                        <span className="text-[10px] text-cyan-400 font-mono">12 Styles</span>
                      </div>

                      {/* Thickness selector */}
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/80 text-[11px] text-slate-400">
                        <span>Width:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4].map((w) => (
                            <button
                              key={w}
                              onClick={() => setLineWidth(fn.id, w)}
                              className={`w-5 h-5 rounded text-[10px] font-mono transition-colors ${
                                (fn.lineWidth || 2) === w
                                  ? 'bg-cyan-600 text-white font-bold'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {w}px
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* List of 12 Line Types */}
                      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                        {LINE_STYLES.map((style) => {
                          const isSelected = (fn.lineType || 'solid') === style.id;
                          return (
                            <button
                              key={style.id}
                              onClick={() => setLineStyle(fn.id, style.id)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
                                isSelected
                                  ? 'bg-cyan-950/60 border border-cyan-800 text-cyan-200'
                                  : 'hover:bg-slate-800/60 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <LineStylePreview styleId={style.id} color={fn.color} width={36} />
                                <span className="text-[11px] font-medium">{style.label}</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Function Name Indicator */}
                <span className="font-mono text-xs text-slate-400 shrink-0 font-medium">
                  {fn.name} =
                </span>

                {/* Expression Input */}
                <input
                  type="text"
                  value={fn.expression}
                  onChange={(e) => handleExpressionChange(fn.id, e.target.value)}
                  placeholder="e.g. sin(x) * cos(x/2)"
                  ref={index === 0 ? activeInputRef : undefined}
                  className="flex-1 bg-[#090D14] border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />

                {/* Delete Button */}
                <button
                  onClick={() => onDeleteFunction(fn.id)}
                  disabled={functions.length <= 1}
                  className={`p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors ${
                    functions.length <= 1 ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                  title="Remove Function"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Error Message */}
              {fn.error && (
                <div className="mt-2 text-xs font-mono text-rose-400 bg-rose-950/30 px-2.5 py-1 rounded">
                  {fn.error}
                </div>
              )}

              {/* Quick Actions Row */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  {/* Symbolic Derivative Toggle */}
                  <button
                    onClick={() => toggleDerivative(fn.id)}
                    className={`flex items-center gap-1 hover:text-white transition-colors ${
                      fn.showDerivative ? 'text-amber-400 font-semibold' : ''
                    }`}
                    title="Toggle Symbolic Derivative Curve"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>d/dx</span>
                  </button>

                  {/* Table of Values Popup */}
                  <button
                    onClick={() =>
                      setTableModalFn({
                        id: fn.id,
                        name: fn.name,
                        expr: fn.expression,
                      })
                    }
                    className="flex items-center gap-1 hover:text-white transition-colors"
                    title="Open Value Table"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>

                  {/* Calculus Drawer Toggle */}
                  <button
                    onClick={() =>
                      setExpandedCalcs({
                        ...expandedCalcs,
                        [fn.id]: !isExpanded,
                      })
                    }
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Calculus</span>
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Calculus Drawer */}
              {isExpanded && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2.5 text-xs font-mono bg-[#090D14]/60 p-2.5 rounded-lg">
                  {/* Analytical Derivative */}
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider block mb-0.5">
                      Exact Derivative f'(x):
                    </span>
                    <span className="text-amber-400 font-semibold break-all">
                      {derivativeStr}
                    </span>
                  </div>

                  {/* Definite Integral Calculator */}
                  <div className="pt-2 border-t border-slate-800/60">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1">
                      Definite Numerical Integral ∫ [a, b]:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">a:</span>
                      <input
                        type="text"
                        value={intData.a}
                        onChange={(e) =>
                          setIntegralBounds({
                            ...integralBounds,
                            [fn.id]: { ...intData, a: e.target.value },
                          })
                        }
                        className="w-14 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-white text-xs"
                      />
                      <span className="text-slate-500">b:</span>
                      <input
                        type="text"
                        value={intData.b}
                        onChange={(e) =>
                          setIntegralBounds({
                            ...integralBounds,
                            [fn.id]: { ...intData, b: e.target.value },
                          })
                        }
                        className="w-14 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-white text-xs"
                      />
                      <button
                        onClick={() => computeIntegral(fn.id, fn.expression)}
                        className="px-2.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded transition-colors text-xs"
                      >
                        Compute
                      </button>
                      {intData.res && (
                        <span className="text-emerald-400 font-semibold ml-1">
                          = {intData.res}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Table of Values Modal */}
      {tableModalFn && (
        <TableModal
          fnMeta={tableModalFn}
          angleMode={angleMode}
          step={tableStep}
          range={tableRange}
          onStepChange={setTableStep}
          onRangeChange={setTableRange}
          onClose={() => setTableModalFn(null)}
        />
      )}
    </div>
  );
};

// Modal for Table of Values
interface TableModalProps {
  fnMeta: { id: string; name: string; expr: string };
  angleMode: AngleMode;
  step: number;
  range: { min: number; max: number };
  onStepChange: (step: number) => void;
  onRangeChange: (range: { min: number; max: number }) => void;
  onClose: () => void;
}

const TableModal: React.FC<TableModalProps> = ({
  fnMeta,
  angleMode,
  step,
  range,
  onStepChange,
  onRangeChange,
  onClose,
}) => {
  let rows: TableRow[] = [];
  try {
    const ast = MathEngine.parse(fnMeta.expr);
    const diffAst = MathEngine.differentiate(ast);
    const fn = MathEngine.compile(ast, angleMode);
    const dfn = MathEngine.compile(diffAst, angleMode);
    rows = MathEngine.generateTable(fn, dfn, range.min, range.max, step);
  } catch {
    //
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0E1420] border border-slate-700 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-white">Table of Values: {fnMeta.name}</h3>
            <p className="text-xs font-mono text-cyan-400">{fnMeta.expr}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-1 rounded-md text-sm"
          >
            ✕
          </button>
        </div>

        {/* Range & Step Controls */}
        <div className="flex items-center gap-4 px-5 py-2.5 bg-[#090D14] border-b border-slate-800 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Step (Δx):</span>
            <select
              value={step}
              onChange={(e) => onStepChange(parseFloat(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
            >
              <option value="0.1">0.1</option>
              <option value="0.5">0.5</option>
              <option value="1">1.0</option>
              <option value="2">2.0</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Min:</span>
            <input
              type="number"
              value={range.min}
              onChange={(e) => onRangeChange({ ...range, min: parseFloat(e.target.value) || 0 })}
              className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Max:</span>
            <input
              type="number"
              value={range.max}
              onChange={(e) => onRangeChange({ ...range, max: parseFloat(e.target.value) || 0 })}
              className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
            />
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3">x</th>
                <th className="py-2 px-3 text-cyan-400">f(x)</th>
                <th className="py-2 px-3 text-amber-400">f'(x)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                  <td className="py-1.5 px-3 text-slate-300">{r.x}</td>
                  <td className="py-1.5 px-3 text-cyan-300 font-semibold">{r.y !== null ? r.y : 'Undefined'}</td>
                  <td className="py-1.5 px-3 text-amber-300">{r.dy !== null ? r.dy : 'Undefined'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
