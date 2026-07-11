import type { Key, KeyboardLayout, KeyboardTab } from './keyboard.js';

const k = (label: string, aria: string, opts: Partial<Key> = {}): Key => ({
  label,
  aria,
  command: opts.latex ? undefined : (opts.command ?? label),
  ...opts,
});

const NAV_ROW: Key[] = [
  k('←', 'Cursor nach links', { command: 'left' }),
  k('→', 'Cursor nach rechts', { command: 'right' }),
  k('↑', 'Cursor nach oben', { command: 'up' }),
  k('↓', 'Cursor nach unten', { command: 'down' }),
  k('⌫', 'Löschen', { command: 'backspace' }),
  k('↵', 'Absenden', { command: 'enter', span: 2 }),
];

const digitTab = (extra: Key[][]): KeyboardTab => ({
  id: '123',
  label: '123',
  rows: [
    [k('7', 'Sieben'), k('8', 'Acht'), k('9', 'Neun'), k('÷', 'Bruch', { command: '/' })],
    [k('4', 'Vier'), k('5', 'Fünf'), k('6', 'Sechs'), k('·', 'Mal', { latex: '\\cdot' })],
    [k('1', 'Eins'), k('2', 'Zwei'), k('3', 'Drei'), k('−', 'Minus', { command: '-' })],
    [k('0', 'Null'), k(',', 'Komma'), k('.', 'Punkt'), k('+', 'Plus')],
    ...extra,
    NAV_ROW,
  ],
});

/** Grundrechenarten. */
export const PRESET_BASIC: KeyboardLayout = {
  tabs: [
    digitTab([
      [
        k('=', 'Gleich', { span: 2 }),
        k('(', 'Klammer auf'),
        k(')', 'Klammer zu'),
      ],
    ]),
  ],
};

/** Terme & Gleichungen. */
export const PRESET_ALGEBRA: KeyboardLayout = {
  tabs: [
    digitTab([[k('=', 'Gleich', { span: 2 }), k('(', 'Klammer auf'), k(')', 'Klammer zu')]]),
    {
      id: 'abc',
      label: 'abc',
      rows: [
        [k('x', 'Variable x'), k('y', 'Variable y'), k('z', 'Variable z'), k('a', 'Variable a'), k('b', 'Variable b')],
        [
          k('x²', 'Hochstellen', { command: '^' }),
          k('xₙ', 'Tiefstellen', { command: '_' }),
          k('√', 'Quadratwurzel', { latex: '\\sqrt{}' }),
          k('(', 'Klammer auf'),
          k(')', 'Klammer zu'),
        ],
        [
          k('<', 'Kleiner als'),
          k('>', 'Größer als'),
          k('≤', 'Kleiner oder gleich', { latex: '\\le' }),
          k('≥', 'Größer oder gleich', { latex: '\\ge' }),
          k('≠', 'Ungleich', { latex: '\\ne' }),
        ],
        [k('=', 'Gleich'), k('±', 'Plusminus', { latex: '\\pm' })],
        NAV_ROW,
      ],
    },
  ],
};

/** Oberstufe: Potenz, Wurzel, Bruch, e, π, ln — im Rahmen des LaTeX-Scopes. */
export const PRESET_ANALYSIS: KeyboardLayout = {
  tabs: [
    digitTab([[k('=', 'Gleich', { span: 2 }), k('(', 'Klammer auf'), k(')', 'Klammer zu')]]),
    {
      id: 'fx',
      label: 'f(x)',
      rows: [
        [k('x', 'Variable x'), k('e', 'Eulersche Zahl'), k('π', 'Pi', { latex: '\\pi' }), k('∞', 'Unendlich', { latex: '\\infty' })],
        [
          k('xⁿ', 'Potenz', { command: '^' }),
          k('√', 'Quadratwurzel', { latex: '\\sqrt{}' }),
          k('a∕b', 'Bruch', { command: '/' }),
          k('ln', 'Natürlicher Logarithmus', { latex: 'ln' }),
        ],
        [
          k('(', 'Klammer auf'),
          k(')', 'Klammer zu'),
          k('→', 'Pfeil nach rechts', { latex: '\\rightarrow' }),
          k('=', 'Gleich'),
        ],
        NAV_ROW,
      ],
    },
  ],
};
