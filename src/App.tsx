/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  MathFunction,
  CalculationHistoryItem,
  AngleMode,
} from './types/calculator';
import { MathEngine } from './lib/mathEngine';
import { TopBar, ActiveView } from './components/TopBar';
import { GraphCanvas } from './components/GraphCanvas';
import { FunctionNotebook } from './components/FunctionNotebook';
import { ScientificKeypad } from './components/ScientificKeypad';
import { HistoryDrawer } from './components/HistoryDrawer';
import { RustSourceExport } from './components/RustSourceExport';
import {
  Calculator,
  Terminal,
  CornerDownLeft,
  Sliders,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

const STORAGE_KEY_HISTORY = 'rustcalc_history_v1';
const STORAGE_KEY_FUNCTIONS = 'rustcalc_functions_v1';

const INITIAL_FUNCTIONS: MathFunction[] = [
  {
    id: 'fn-1',
    name: 'f₁(x)',
    expression: 'sin(x) * cos(x / 2)',
    color: '#06B6D4', // Laser Cyan
    lineType: 'solid',
    lineWidth: 2.2,
    visible: true,
    showDerivative: false,
    derivativeColor: '#94A3B8',
  },
  {
    id: 'fn-2',
    name: 'f₂(x)',
    expression: 'x^3 - 3*x',
    color: '#F59E0B', // Telemetry Amber
    lineType: 'dashed',
    lineWidth: 2.2,
    visible: true,
    showDerivative: false,
    derivativeColor: '#FBBF24',
  },
  {
    id: 'fn-3',
    name: 'f₃(x)',
    expression: 'exp(-0.2*x) * sin(2*x)',
    color: '#10B981', // Emerald Jade
    lineType: 'dash-dot',
    lineWidth: 2.2,
    visible: true,
    showDerivative: false,
    derivativeColor: '#34D399',
  },
];

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('workspace');
  const [angleMode, setAngleMode] = useState<AngleMode>('rad');
  const [showCriticalPoints, setShowCriticalPoints] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showKeypad, setShowKeypad] = useState(false);

  // Math Functions State
  const [functions, setFunctions] = useState<MathFunction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FUNCTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      //
    }
    return INITIAL_FUNCTIONS;
  });

  // 20-Item Calculation History Log
  const [history, setHistory] = useState<CalculationHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 20);
      }
    } catch {
      //
    }
    return [
      {
        id: 'hist-init-1',
        expression: 'integrate(x^2, 0, 3)',
        result: '9',
        timestamp: Date.now() - 360000,
        latencyUs: 42,
      },
      {
        id: 'hist-init-2',
        expression: 'd/dx(x^4 - 4*x^2 + 1)',
        result: '4 * (x ^ 3) - 8 * x',
        timestamp: Date.now() - 180000,
        latencyUs: 18,
      },
      {
        id: 'hist-init-3',
        expression: 'sqrt(42) * sin(pi / 3)',
        result: '5.612486',
        timestamp: Date.now() - 60000,
        latencyUs: 25,
      },
    ];
  });

  // Scratchpad input state
  const [scratchpadInput, setScratchpadInput] = useState('sqrt(42) * sin(pi / 3)');
  const [scratchpadResult, setScratchpadResult] = useState<string | null>(null);
  const [scratchpadError, setScratchpadError] = useState<string | null>(null);

  const activeInputRef = useRef<HTMLInputElement | null>(null);

  // Save functions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FUNCTIONS, JSON.stringify(functions));
    } catch {
      //
    }
  }, [functions]);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch {
      //
    }
  }, [history]);

  // Add new function
  const handleAddFunction = (expr: string = '', color?: string) => {
    const palette = ['#06B6D4', '#F59E0B', '#10B981', '#8B5CF6', '#F43F5E', '#3B82F6', '#EAB308'];
    const nextIdx = functions.length + 1;
    const assignedColor = color || palette[(nextIdx - 1) % palette.length];

    const subscriptMap = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    const numStr = nextIdx.toString().split('').map((ch) => subscriptMap[parseInt(ch)] || ch).join('');

    const newFn: MathFunction = {
      id: `fn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `f${numStr}(x)`,
      expression: expr,
      color: assignedColor,
      lineType: 'solid',
      lineWidth: 2.2,
      visible: true,
      showDerivative: false,
    };

    setFunctions([...functions, newFn]);
  };

  const handleDeleteFunction = (id: string) => {
    if (functions.length <= 1) return;
    setFunctions(functions.filter((f) => f.id !== id));
  };

  // Evaluate scratchpad expression and push to 20-calculation history
  const handleEvaluateScratchpad = (customExpr?: string) => {
    const exprToRun = (customExpr ?? scratchpadInput).trim();
    if (!exprToRun) return;

    const t0 = performance.now();
    try {
      const res = MathEngine.evaluateExpression(exprToRun, angleMode);
      const t1 = performance.now();
      const latencyUs = Math.max(1, Math.round((t1 - t0) * 1000));

      setScratchpadResult(res.formatted);
      setScratchpadError(null);

      // Record in 20-calculation history log (FIFO capped at 20)
      const newItem: CalculationHistoryItem = {
        id: `calc-${Date.now()}`,
        expression: exprToRun,
        result: res.formatted,
        approxValue: res.value,
        isComplex: res.isComplex,
        timestamp: Date.now(),
        latencyUs,
      };

      setHistory((prev) => [newItem, ...prev.slice(0, 19)]);
    } catch (e: any) {
      setScratchpadError(e.message || 'Evaluation error');
      setScratchpadResult(null);
    }
  };

  // Recall expression from history
  const handleRecallHistory = (expr: string) => {
    setScratchpadInput(expr);
    setActiveView('workspace');
  };

  // Plot history result as function graph
  const handlePlotHistoryResult = (resultVal: string) => {
    handleAddFunction(resultVal);
    setActiveView('workspace');
  };

  // Keypad token insertion
  const handleInsertToken = (token: string) => {
    setScratchpadInput((prev) => prev + token);
  };

  const handleClearKeypad = () => {
    setScratchpadInput('');
    setScratchpadResult(null);
    setScratchpadError(null);
  };

  const handleBackspaceKeypad = () => {
    setScratchpadInput((prev) => prev.slice(0, -1));
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090D14] text-slate-100 font-sans">
      {/* Top Bar with Strict 3-Zone Contract */}
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        angleMode={angleMode}
        onToggleAngleMode={() => setAngleMode(angleMode === 'rad' ? 'deg' : 'rad')}
        historyCount={history.length}
        showCriticalPoints={showCriticalPoints}
        onToggleCriticalPoints={() => setShowCriticalPoints(!showCriticalPoints)}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeView === 'workspace' && (
          <div className="flex-1 flex h-full w-full overflow-hidden">
            {/* Left Pane: Notebook, Scratchpad, Keypad */}
            <div className="w-[380px] lg:w-[440px] h-full flex flex-col shrink-0 border-r border-slate-800">
              {/* Function Notebook */}
              <div className="flex-1 overflow-hidden">
                <FunctionNotebook
                  functions={functions}
                  angleMode={angleMode}
                  onUpdateFunctions={setFunctions}
                  onAddFunction={handleAddFunction}
                  onDeleteFunction={handleDeleteFunction}
                  activeInputRef={activeInputRef}
                />
              </div>

              {/* Quick Scratchpad Console */}
              <div className="bg-[#0B0F18] border-t border-slate-800 p-3 select-none">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Scientific Scratchpad</span>
                  </div>
                  <button
                    onClick={() => setShowKeypad(!showKeypad)}
                    className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white transition-colors"
                  >
                    <Calculator className="w-3 h-3 text-cyan-400" />
                    <span>{showKeypad ? 'Hide Keypad' : 'Keypad'}</span>
                    {showKeypad ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronUp className="w-3 h-3" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={scratchpadInput}
                    onChange={(e) => setScratchpadInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEvaluateScratchpad();
                    }}
                    placeholder="Enter equation e.g. sqrt(42) * sin(pi/3)"
                    className="flex-1 bg-[#070A0F] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => handleEvaluateScratchpad()}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shrink-0"
                    title="Evaluate (=)"
                  >
                    <span>=</span>
                    <CornerDownLeft className="w-3 h-3" />
                  </button>
                </div>

                {/* Scratchpad Result Readout */}
                {scratchpadResult !== null && (
                  <div className="mt-2 px-2.5 py-1 bg-cyan-950/30 border border-cyan-800/40 rounded flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Result:</span>
                    <span className="text-cyan-300 font-bold">{scratchpadResult}</span>
                  </div>
                )}

                {/* Error Readout */}
                {scratchpadError !== null && (
                  <div className="mt-2 px-2.5 py-1 bg-rose-950/40 border border-rose-900/60 rounded text-xs font-mono text-rose-400">
                    {scratchpadError}
                  </div>
                )}
              </div>

              {/* Collapsible Keypad */}
              {showKeypad && (
                <ScientificKeypad
                  onInsert={handleInsertToken}
                  onClear={handleClearKeypad}
                  onBackspace={handleBackspaceKeypad}
                  onEvaluate={() => handleEvaluateScratchpad()}
                  angleMode={angleMode}
                  onToggleAngleMode={() => setAngleMode(angleMode === 'rad' ? 'deg' : 'rad')}
                />
              )}
            </div>

            {/* Right Pane: Full-Height Interactive Coordinate Plane */}
            <div className="flex-1 h-full w-full overflow-hidden">
              <GraphCanvas
                functions={functions}
                angleMode={angleMode}
                showCriticalPoints={showCriticalPoints}
                showGrid={showGrid}
              />
            </div>
          </div>
        )}

        {/* 20-Calculation History Log View */}
        {activeView === 'history' && (
          <div className="flex-1 h-full max-w-4xl mx-auto w-full p-6">
            <HistoryDrawer
              history={history}
              onRecall={handleRecallHistory}
              onPlotAsGraph={handlePlotHistoryResult}
              onClearHistory={() => setHistory([])}
            />
          </div>
        )}

        {/* Native Rust Desktop Source Code & Exporter */}
        {activeView === 'rust_export' && (
          <div className="flex-1 h-full w-full">
            <RustSourceExport />
          </div>
        )}
      </div>
    </div>
  );
}
