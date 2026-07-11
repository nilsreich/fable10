import type { MathNode, ParenKind, Row, SymbolName } from './model.js';

const SYMBOL_CHAR: Record<SymbolName, string> = {
  pi: 'π',
  cdot: '·',
  le: '≤',
  ge: '≥',
  ne: '≠',
  pm: '±',
  infty: '∞',
  rightarrow: '→',
};

/** Symbols rendered with operator spacing. */
const OP_SYMBOLS: SymbolName[] = ['cdot', 'le', 'ge', 'ne', 'pm', 'rightarrow'];

const PAREN_CHARS: Record<ParenKind, [string, string]> = {
  '(': ['(', ')'],
  '[': ['[', ']'],
  '{': ['{', '}'],
  '|': ['|', '|'],
};

export interface CursorPos {
  row: Row;
  index: number;
}

function span(cls: string, text?: string): HTMLElement {
  const el = document.createElement('span');
  el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

const cursorEl = (): HTMLElement => span('lmi-cursor');

export function renderRow(r: Row, cursor: CursorPos | null): HTMLElement {
  const el = span('lmi-row');
  if (r.children.length === 0) {
    el.classList.add('lmi-row-empty');
    const ph = span('lmi-placeholder');
    if (cursor && cursor.row === r) ph.appendChild(cursorEl());
    el.appendChild(ph);
    return el;
  }
  const here = cursor && cursor.row === r;
  r.children.forEach((node, i) => {
    if (here && cursor.index === i) el.appendChild(cursorEl());
    el.appendChild(renderNode(node, cursor));
  });
  if (here && cursor.index === r.children.length) el.appendChild(cursorEl());
  return el;
}

function renderNode(node: MathNode, cursor: CursorPos | null): HTMLElement {
  switch (node.type) {
    case 'char': {
      const cls = /[0-9.]/.test(node.value)
        ? 'lmi-char lmi-num'
        : /[a-zA-Z]/.test(node.value)
          ? 'lmi-char lmi-var'
          : 'lmi-char lmi-op';
      return span(cls, node.value === '-' ? '−' : node.value);
    }
    case 'frac': {
      const el = span('lmi-frac');
      const num = span('lmi-frac-num');
      num.appendChild(renderRow(node.num, cursor));
      const den = span('lmi-frac-den');
      den.appendChild(renderRow(node.den, cursor));
      el.append(num, den);
      return el;
    }
    case 'supsub': {
      const el = span('lmi-supsub');
      if (node.sup && node.sub) el.classList.add('lmi-supsub-both');
      if (node.sup) {
        const sup = span('lmi-sup');
        sup.appendChild(renderRow(node.sup, cursor));
        el.appendChild(sup);
      }
      if (node.sub) {
        const sub = span('lmi-sub');
        sub.appendChild(renderRow(node.sub, cursor));
        el.appendChild(sub);
      }
      return el;
    }
    case 'sqrt': {
      const el = span('lmi-sqrt');
      el.appendChild(span('lmi-sqrt-sym', '√'));
      const body = span('lmi-sqrt-body');
      body.appendChild(renderRow(node.radicand, cursor));
      el.appendChild(body);
      return el;
    }
    case 'paren': {
      const el = span('lmi-paren');
      const [open, close] = PAREN_CHARS[node.kind];
      el.appendChild(span('lmi-paren-delim', open));
      el.appendChild(renderRow(node.body, cursor));
      el.appendChild(span('lmi-paren-delim', close));
      return el;
    }
    case 'symbol': {
      const cls = OP_SYMBOLS.includes(node.name)
        ? `lmi-symbol lmi-op lmi-sym-${node.name}`
        : `lmi-symbol lmi-sym-${node.name}`;
      return span(cls, SYMBOL_CHAR[node.name]);
    }
  }
}
