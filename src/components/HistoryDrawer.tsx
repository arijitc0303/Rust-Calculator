/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CalculationHistoryItem } from '../types/calculator';
import {
  History,
  Copy,
  Check,
  RotateCcw,
  TrendingUp,
  Trash2,
  Clock,
  Zap,
} from 'lucide-react';

interface HistoryDrawerProps {
  history: CalculationHistoryItem[];
  onRecall: (expr: string) => void;
  onPlotAsGraph: (resultVal: string) => void;
  onClearHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  history,
  onRecall,
  onPlotAsGraph,
  onClearHistory,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="flex flex-col h-full bg-[#0E1420] text-slate-200 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Calculation History</h2>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded">
            {history.length}/20
          </span>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition-colors"
            title="Clear all 20 history records"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* History Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {history.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Clock className="w-8 h-8 mb-2 stroke-[1.5] text-slate-600" />
            <p className="text-xs font-medium text-slate-400">No calculations recorded yet</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
              Evaluate equations in the scratchpad or notebook to populate your 20-calculation log.
            </p>
          </div>
        ) : (
          history.map((item, index) => {
            const date = new Date(item.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return (
              <div
                key={item.id}
                className="bg-[#121927]/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3 shadow-sm transition-all text-xs font-mono group"
              >
                {/* Meta row: index & timestamp */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
                  <span className="text-slate-400 font-semibold">#{history.length - index}</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5 text-emerald-400">
                      <Zap className="w-2.5 h-2.5" />
                      {item.latencyUs}μs
                    </span>
                    <span>·</span>
                    <span>{timeStr}</span>
                  </div>
                </div>

                {/* Input Expression */}
                <div className="text-slate-300 font-medium break-all mb-1 select-text">
                  {item.expression}
                </div>

                {/* Evaluated Result */}
                <div className="text-cyan-300 font-bold text-sm break-all mb-2 select-text">
                  = {item.result}
                </div>

                {/* Actions Bar */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRecall(item.expression)}
                      className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                      title="Recall equation into input"
                    >
                      <RotateCcw className="w-3 h-3 text-cyan-400" />
                      <span>Recall</span>
                    </button>

                    <button
                      onClick={() => onPlotAsGraph(item.result)}
                      className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors"
                      title="Plot result on coordinate plane"
                    >
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span>Plot</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleCopy(item.id, item.result)}
                    className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                    title="Copy result to clipboard"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
