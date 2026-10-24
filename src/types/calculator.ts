/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LineStyle =
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'dash-dot'
  | 'long-dash'
  | 'short-dash'
  | 'dot-dot-dash'
  | 'dense-dot'
  | 'spaced-dash'
  | 'dash-dot-dot-dot'
  | 'stepped'
  | 'points-only';

export interface LineStyleOption {
  id: LineStyle;
  label: string;
  dash: number[];
  category: 'standard' | 'dashed' | 'dotted' | 'special';
}

export interface MathFunction {
  id: string;
  name: string; // e.g., f1(x)
  expression: string; // e.g., sin(x) * cos(x/2)
  color: string;
  lineType?: LineStyle;
  lineWidth?: number;
  visible: boolean;
  showDerivative: boolean;
  derivativeColor?: string;
  error?: string | null;
  samplePointsCount?: number;
}

export interface CalculationHistoryItem {
  id: string;
  expression: string;
  result: string;
  approxValue?: number;
  isComplex?: boolean;
  timestamp: number; // Unix epoch ms
  latencyUs: number; // Execution time in microseconds
  category?: 'arithmetic' | 'calculus' | 'trig' | 'complex';
}

export interface GraphBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface CriticalPoint {
  x: number;
  y: number;
  type: 'root' | 'local_min' | 'local_max' | 'y_intercept';
  label: string;
  functionId: string;
  color: string;
}

export interface TracePoint {
  x: number;
  y: number;
  slope: number;
  functionId: string;
  functionName: string;
  color: string;
}

export interface TableRow {
  x: number;
  y: number | null;
  dy: number | null;
}

export type AngleMode = 'rad' | 'deg';

export interface IntegralConfig {
  functionId: string;
  a: number;
  b: number;
  result?: number;
  error?: string;
}
