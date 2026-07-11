/** Tree model for LiteMathInput. Exactly these node types — nothing more. */

export interface Row {
  type: 'row';
  children: MathNode[];
}

export interface CharNode {
  type: 'char';
  /** One of: 0-9, a-z, A-Z, + - = < > , . */
  value: string;
}

export interface FractionNode {
  type: 'frac';
  num: Row;
  den: Row;
}

/** Base is implicit: the node preceding this one in its row. */
export interface SupSubNode {
  type: 'supsub';
  sup?: Row;
  sub?: Row;
}

export interface SqrtNode {
  type: 'sqrt';
  radicand: Row;
}

export type ParenKind = '(' | '[' | '{' | '|';

export interface ParenNode {
  type: 'paren';
  kind: ParenKind;
  body: Row;
}

export type SymbolName =
  | 'pi'
  | 'cdot'
  | 'le'
  | 'ge'
  | 'ne'
  | 'pm'
  | 'infty'
  | 'rightarrow';

export interface SymbolNode {
  type: 'symbol';
  name: SymbolName;
}

export type MathNode =
  | CharNode
  | FractionNode
  | SupSubNode
  | SqrtNode
  | ParenNode
  | SymbolNode;

/** Characters accepted as CharNode values (also the physical-typing set). */
export const CHAR_RE = /^[0-9a-zA-Z+\-=<>,.]$/;

export const row = (...children: MathNode[]): Row => ({ type: 'row', children });
export const char = (value: string): CharNode => ({ type: 'char', value });
export const frac = (num: Row, den: Row): FractionNode => ({ type: 'frac', num, den });
export const sqrt = (radicand: Row): SqrtNode => ({ type: 'sqrt', radicand });
export const paren = (kind: ParenKind, body: Row): ParenNode => ({ type: 'paren', kind, body });
export const sym = (name: SymbolName): SymbolNode => ({ type: 'symbol', name });

export const isDigit = (n: MathNode): boolean => n.type === 'char' && n.value >= '0' && n.value <= '9';
export const isLetter = (n: MathNode): boolean => n.type === 'char' && /^[a-zA-Z]$/.test(n.value);

export const CLOSE_OF: Record<ParenKind, string> = { '(': ')', '[': ']', '{': '}', '|': '|' };

/** Ordered list of the Row fields a structure node owns (traversal order). */
export function fieldsOf(node: MathNode): { name: string; row: Row }[] {
  switch (node.type) {
    case 'frac':
      return [
        { name: 'num', row: node.num },
        { name: 'den', row: node.den },
      ];
    case 'supsub': {
      const f: { name: string; row: Row }[] = [];
      if (node.sup) f.push({ name: 'sup', row: node.sup });
      if (node.sub) f.push({ name: 'sub', row: node.sub });
      return f;
    }
    case 'sqrt':
      return [{ name: 'radicand', row: node.radicand }];
    case 'paren':
      return [{ name: 'body', row: node.body }];
    default:
      return [];
  }
}
