/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LineStyle, LineStyleOption } from '../types/calculator';

export const LINE_STYLES: LineStyleOption[] = [
  {
    id: 'solid',
    label: 'Solid Line',
    dash: [],
    category: 'standard',
  },
  {
    id: 'dashed',
    label: 'Standard Dash',
    dash: [8, 6],
    category: 'dashed',
  },
  {
    id: 'dotted',
    label: 'Fine Dotted',
    dash: [2, 5],
    category: 'dotted',
  },
  {
    id: 'dash-dot',
    label: 'Dash-Dot Pattern',
    dash: [10, 4, 2, 4],
    category: 'dashed',
  },
  {
    id: 'long-dash',
    label: 'Long Dash',
    dash: [16, 6],
    category: 'dashed',
  },
  {
    id: 'short-dash',
    label: 'Short Tight Dash',
    dash: [4, 3],
    category: 'dashed',
  },
  {
    id: 'dot-dot-dash',
    label: 'Double Dot Dash',
    dash: [12, 4, 2, 3, 2, 4],
    category: 'dashed',
  },
  {
    id: 'dense-dot',
    label: 'Dense Stipple',
    dash: [1.5, 2.5],
    category: 'dotted',
  },
  {
    id: 'spaced-dash',
    label: 'Spaced Dash',
    dash: [8, 12],
    category: 'dashed',
  },
  {
    id: 'dash-dot-dot-dot',
    label: 'Triple Dot Dash',
    dash: [14, 4, 2, 3, 2, 3, 2, 4],
    category: 'dashed',
  },
  {
    id: 'stepped',
    label: 'Stepped / Staircase',
    dash: [],
    category: 'special',
  },
  {
    id: 'points-only',
    label: 'Discrete Scatter Points',
    dash: [],
    category: 'special',
  },
];

export function getLineStyleConfig(style?: LineStyle): LineStyleOption {
  return LINE_STYLES.find((s) => s.id === style) || LINE_STYLES[0];
}
