/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AngleMode } from '../types/calculator';
import { Download, SlidersHorizontal, Activity } from 'lucide-react';

export type ActiveView = 'workspace' | 'history' | 'rust_export';

interface TopBarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  angleMode: AngleMode;
  onToggleAngleMode: () => void;
  historyCount: number;
  onExportGraph?: () => void;
  showCriticalPoints: boolean;
  onToggleCriticalPoints: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onSelectView,
  angleMode,
  onToggleAngleMode,
  historyCount,
  showCriticalPoints,
  onToggleCriticalPoints,
  showGrid,
  onToggleGrid,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-[#0B0E14] border-b border-slate-800/90 select-none">
      {/* Zone 1: Brand Wordmark (Single text element) */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <a
          href="/"
          className="text-base font-bold tracking-tight text-white font-mono hover:text-cyan-400 transition-colors"
        >
          RustCalc Workstation
        </a>
      </div>

      {/* Zone 2: 4 Single-Line Navigation Links / Views */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          onClick={() => onSelectView('workspace')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'workspace' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Graphing Notebook
        </button>

        <button
          onClick={() => onSelectView('history')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeView === 'history' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          <span>History Log</span>
          <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-cyan-300">
            {historyCount}
          </span>
        </button>

        <button
          onClick={() => onSelectView('rust_export')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeView === 'rust_export' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          <span>Native Rust App</span>
          <span className="text-[10px] text-amber-500 font-mono">.rs</span>
        </button>
      </nav>

      {/* Zone 3: Primary Action & Precision Toggles */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Critical Points Toggle */}
        <button
          onClick={onToggleCriticalPoints}
          className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors border ${
            showCriticalPoints
              ? 'bg-cyan-950/40 border-cyan-800 text-cyan-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Roots and Extrema Points"
        >
          Critical Points
        </button>

        {/* Angle Mode Switch */}
        <button
          onClick={onToggleAngleMode}
          className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800 transition-colors uppercase"
          title="Toggle Radian / Degree"
        >
          {angleMode}
        </button>

        {/* Primary Action Button */}
        <button
          onClick={() => onSelectView('rust_export')}
          className="px-4 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors whitespace-nowrap shadow-sm"
        >
          Get Native App
        </button>
      </div>
    </header>
  );
};
