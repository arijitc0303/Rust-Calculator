/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AngleMode } from '../types/calculator';
import { Delete, CornerDownLeft, RotateCcw } from 'lucide-react';

interface ScientificKeypadProps {
  onInsert: (token: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onEvaluate: () => void;
  angleMode: AngleMode;
  onToggleAngleMode: () => void;
}

export const ScientificKeypad: React.FC<ScientificKeypadProps> = ({
  onInsert,
  onClear,
  onBackspace,
  onEvaluate,
  angleMode,
  onToggleAngleMode,
}) => {
  const [is2nd, setIs2nd] = useState(false);

  const keyClass =
    'h-9 flex items-center justify-center font-mono text-xs rounded-lg transition-colors border select-none active:scale-95';
  const numKey = `${keyClass} bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-white font-semibold`;
  const opKey = `${keyClass} bg-slate-900 hover:bg-slate-800 border-slate-800 text-cyan-400 font-medium`;
  const fnKey = `${keyClass} bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white`;
  const calculusKey = `${keyClass} bg-cyan-950/40 hover:bg-cyan-900/60 border-cyan-800/60 text-cyan-300 font-medium`;
  const accentKey = `${keyClass} bg-cyan-600 hover:bg-cyan-500 border-cyan-500 text-white font-bold`;

  return (
    <div className="bg-[#0E1420] border-t border-slate-800/80 p-3 select-none">
      <div className="grid grid-cols-7 gap-1.5">
        {/* Row 1: Mode, 2nd, Trig, Constants */}
        <button
          onClick={onToggleAngleMode}
          className={`${fnKey} uppercase font-bold text-amber-400`}
          title="Toggle Radian / Degree"
        >
          {angleMode}
        </button>
        <button
          onClick={() => setIs2nd(!is2nd)}
          className={`${fnKey} ${is2nd ? 'bg-amber-950/50 border-amber-600 text-amber-300' : ''}`}
        >
          2nd
        </button>
        <button
          onClick={() => onInsert(is2nd ? 'asin(' : 'sin(')}
          className={fnKey}
        >
          {is2nd ? 'sin⁻¹' : 'sin'}
        </button>
        <button
          onClick={() => onInsert(is2nd ? 'acos(' : 'cos(')}
          className={fnKey}
        >
          {is2nd ? 'cos⁻¹' : 'cos'}
        </button>
        <button
          onClick={() => onInsert(is2nd ? 'atan(' : 'tan(')}
          className={fnKey}
        >
          {is2nd ? 'tan⁻¹' : 'tan'}
        </button>
        <button onClick={() => onInsert('pi')} className={fnKey}>
          π
        </button>
        <button onClick={() => onInsert('e')} className={fnKey}>
          e
        </button>

        {/* Row 2: Powers, Roots, Logs, Variables */}
        <button onClick={() => onInsert('^2')} className={fnKey}>
          x²
        </button>
        <button onClick={() => onInsert('^')} className={fnKey}>
          xʸ
        </button>
        <button
          onClick={() => onInsert(is2nd ? 'cbrt(' : 'sqrt(')}
          className={fnKey}
        >
          {is2nd ? '³√x' : '√x'}
        </button>
        <button onClick={() => onInsert('ln(')} className={fnKey}>
          ln
        </button>
        <button onClick={() => onInsert('log10(')} className={fnKey}>
          log
        </button>
        <button onClick={() => onInsert('x')} className={`${numKey} text-cyan-300`}>
          x
        </button>
        <button onClick={onBackspace} className={`${opKey} text-rose-400`} title="Backspace">
          <Delete className="w-3.5 h-3.5" />
        </button>

        {/* Row 3: Calculus, Parens, Numbers 7-9 */}
        <button
          onClick={() => onInsert('d/dx(')}
          className={calculusKey}
          title="Symbolic Derivative"
        >
          d/dx
        </button>
        <button
          onClick={() => onInsert('integrate(')}
          className={calculusKey}
          title="Definite Integral"
        >
          ∫ dx
        </button>
        <button onClick={() => onInsert('(')} className={fnKey}>
          (
        </button>
        <button onClick={() => onInsert(')')} className={fnKey}>
          )
        </button>
        <button onClick={() => onInsert('7')} className={numKey}>
          7
        </button>
        <button onClick={() => onInsert('8')} className={numKey}>
          8
        </button>
        <button onClick={() => onInsert('9')} className={numKey}>
          9
        </button>

        {/* Row 4: Hyperbolic/Complex, Operations, Numbers 4-6 */}
        <button
          onClick={() => onInsert(is2nd ? 'cosh(' : 'sinh(')}
          className={fnKey}
        >
          {is2nd ? 'cosh' : 'sinh'}
        </button>
        <button onClick={() => onInsert('i')} className={fnKey}>
          i
        </button>
        <button onClick={() => onInsert('+')} className={opKey}>
          +
        </button>
        <button onClick={() => onInsert('-')} className={opKey}>
          −
        </button>
        <button onClick={() => onInsert('4')} className={numKey}>
          4
        </button>
        <button onClick={() => onInsert('5')} className={numKey}>
          5
        </button>
        <button onClick={() => onInsert('6')} className={numKey}>
          6
        </button>

        {/* Row 5: Factorial/Abs, Mult/Div, Numbers 1-3, Equals */}
        <button onClick={() => onInsert('abs(')} className={fnKey}>
          |x|
        </button>
        <button onClick={() => onInsert('fact(')} className={fnKey}>
          n!
        </button>
        <button onClick={() => onInsert('*')} className={opKey}>
          ×
        </button>
        <button onClick={() => onInsert('/')} className={opKey}>
          ÷
        </button>
        <button onClick={() => onInsert('1')} className={numKey}>
          1
        </button>
        <button onClick={() => onInsert('2')} className={numKey}>
          2
        </button>
        <button onClick={() => onInsert('3')} className={numKey}>
          3
        </button>

        {/* Row 6: Clear, Zero, Decimal, Negate, Equals */}
        <button onClick={onClear} className={`${opKey} text-rose-400 font-bold`} title="Clear">
          C
        </button>
        <button onClick={() => onInsert('0')} className={numKey}>
          0
        </button>
        <button onClick={() => onInsert('.')} className={numKey}>
          .
        </button>
        <button onClick={() => onInsert('-')} className={numKey}>
          ±
        </button>
        <button onClick={() => onInsert(',')} className={fnKey}>
          ,
        </button>
        <button
          onClick={onEvaluate}
          className={`${accentKey} col-span-2`}
          title="Evaluate Expression"
        >
          <div className="flex items-center gap-1">
            <span>=</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>
    </div>
  );
};
