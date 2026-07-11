import type { MathNode, Row } from './model.js';
import { CLOSE_OF } from './model.js';

export type TokenType =
  | 'num'
  | 'var'
  | 'op'
  | 'frac-open'
  | 'frac-mid'
  | 'frac-close'
  | 'sup-open'
  | 'sup-close'
  | 'sub-open'
  | 'sub-close'
  | 'sqrt-open'
  | 'sqrt-close'
  | 'paren-open'
  | 'paren-close'
  | 'symbol';

export interface Token {
  type: TokenType;
  value: string;
}

/**
 * Flat linearization of the tree in reading order.
 * Consecutive digits (incl. '.') merge into one 'num' token.
 * Structural tokens carry '' as value, except paren-open/close (the delimiter)
 * and symbol (the symbol name).
 */
export function toTokens(r: Row): Token[] {
  const out: Token[] = [];
  walkRow(r, out);
  return out;
}

function walkRow(r: Row, out: Token[]): void {
  for (const node of r.children) walkNode(node, out);
}

function walkNode(node: MathNode, out: Token[]): void {
  switch (node.type) {
    case 'char': {
      const v = node.value;
      if (/[0-9.]/.test(v)) {
        const last = out[out.length - 1];
        if (last && last.type === 'num') last.value += v;
        else out.push({ type: 'num', value: v });
      } else if (/[a-zA-Z]/.test(v)) {
        out.push({ type: 'var', value: v });
      } else {
        out.push({ type: 'op', value: v });
      }
      break;
    }
    case 'frac':
      out.push({ type: 'frac-open', value: '' });
      walkRow(node.num, out);
      out.push({ type: 'frac-mid', value: '' });
      walkRow(node.den, out);
      out.push({ type: 'frac-close', value: '' });
      break;
    case 'supsub':
      if (node.sub) {
        out.push({ type: 'sub-open', value: '' });
        walkRow(node.sub, out);
        out.push({ type: 'sub-close', value: '' });
      }
      if (node.sup) {
        out.push({ type: 'sup-open', value: '' });
        walkRow(node.sup, out);
        out.push({ type: 'sup-close', value: '' });
      }
      break;
    case 'sqrt':
      out.push({ type: 'sqrt-open', value: '' });
      walkRow(node.radicand, out);
      out.push({ type: 'sqrt-close', value: '' });
      break;
    case 'paren':
      out.push({ type: 'paren-open', value: node.kind });
      walkRow(node.body, out);
      out.push({ type: 'paren-close', value: CLOSE_OF[node.kind] });
      break;
    case 'symbol':
      out.push({ type: 'symbol', value: node.name });
      break;
  }
}
