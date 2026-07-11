import type { MathNode, ParenKind, Row, SupSubNode } from './model.js';
import { CHAR_RE, fieldsOf } from './model.js';
import { parseLatex, toLatex } from './latex.js';
import { toTokens, type Token } from './tokens.js';
import { renderRow } from './render.js';

export interface MathEditorOptions {
  onChange?: (latex: string) => void;
  onSubmit?: (latex: string) => void;
  ariaLabel?: string;
}

interface Ctx {
  parentRow: Row;
  index: number;
  node: MathNode;
  field: string;
}

/** Locates the structure node whose field is `target`, or null if target is the root. */
function findContext(root: Row, target: Row): Ctx | null {
  for (let i = 0; i < root.children.length; i++) {
    const node = root.children[i]!;
    for (const f of fieldsOf(node)) {
      if (f.row === target) return { parentRow: root, index: i, node, field: f.name };
      const deep = findContext(f.row, target);
      if (deep) return deep;
    }
  }
  return null;
}

function firstEmptyField(nodes: MathNode[]): Row | null {
  for (const n of nodes) {
    for (const f of fieldsOf(n)) {
      if (f.row.children.length === 0) return f.row;
      const deep = firstEmptyField(f.row.children);
      if (deep) return deep;
    }
  }
  return null;
}

const isNumChar = (n: MathNode): boolean => n.type === 'char' && /[0-9.]/.test(n.value);
const isLetterChar = (n: MathNode): boolean => n.type === 'char' && /[a-zA-Z]/.test(n.value);

export class MathEditor {
  private root: Row = { type: 'row', children: [] };
  private cRow: Row = this.root;
  private cIndex = 0;
  private readonly container: HTMLElement;
  private readonly live: HTMLElement;
  private readonly opts: MathEditorOptions;
  private readonly onKeydown: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, opts: MathEditorOptions = {}) {
    this.container = container;
    this.opts = opts;
    container.classList.add('lmi-editor');
    container.tabIndex = 0;
    container.setAttribute('role', 'textbox');
    container.setAttribute('aria-label', opts.ariaLabel ?? 'Mathematische Eingabe');
    this.live = document.createElement('div');
    this.live.className = 'lmi-live';
    this.live.setAttribute('aria-live', 'polite');
    this.onKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (this.input(e.key)) e.preventDefault();
    };
    container.addEventListener('keydown', this.onKeydown);
    this.render();
  }

  // ---------- public API ----------

  getLatex(): string {
    return toLatex(this.root);
  }

  getTokens(): Token[] {
    return toTokens(this.root);
  }

  /** Replaces the content. Throws LatexParseError on invalid input. Does NOT fire onChange. */
  setLatex(latex: string): void {
    const parsed = parseLatex(latex);
    this.root = parsed;
    this.cRow = this.root;
    this.cIndex = this.root.children.length;
    this.render();
  }

  getRoot(): Row {
    return this.root;
  }

  getCursor(): { row: Row; index: number } {
    return { row: this.cRow, index: this.cIndex };
  }

  focus(): void {
    this.container.focus();
  }

  destroy(): void {
    this.container.removeEventListener('keydown', this.onKeydown);
    this.container.replaceChildren();
  }

  /**
   * Feeds one key into the editor (same pipeline as physical typing).
   * Accepts printable chars in scope plus 'ArrowLeft', 'ArrowRight', 'ArrowUp',
   * 'ArrowDown', 'Backspace', 'Enter' and the triggers / ^ _ ( ) [ ] { } | *.
   * Returns true if the key was handled.
   */
  input(key: string): boolean {
    switch (key) {
      case 'ArrowLeft':
        this.moveLeft();
        return true;
      case 'ArrowRight':
        this.moveRight();
        return true;
      case 'ArrowUp':
        this.moveVertical(-1);
        return true;
      case 'ArrowDown':
        this.moveVertical(1);
        return true;
      case 'Backspace':
        this.backspace();
        return true;
      case 'Enter':
        this.opts.onSubmit?.(this.getLatex());
        return true;
      case '/':
        this.smartFrac();
        return true;
      case '^':
        this.smartSupSub('sup');
        return true;
      case '_':
        this.smartSupSub('sub');
        return true;
      case '(':
      case '[':
      case '{':
        this.openParen(key);
        return true;
      case ')':
      case ']':
      case '}':
        this.exitParen();
        return true;
      case '|':
        this.pipe();
        return true;
      case '*':
        this.insertNode({ type: 'symbol', name: 'cdot' });
        return true;
      default:
        if (key.length === 1 && CHAR_RE.test(key)) {
          this.insertNode({ type: 'char', value: key });
          return true;
        }
        return false;
    }
  }

  /** Parses a LaTeX fragment and splices it at the cursor. Cursor moves into the first empty field, else after the fragment. */
  insertLatex(fragment: string): void {
    const nodes = parseLatex(fragment).children;
    if (nodes.length === 0) return;
    this.cRow.children.splice(this.cIndex, 0, ...nodes);
    const target = firstEmptyField(nodes);
    if (target) {
      this.cRow = target;
      this.cIndex = 0;
    } else {
      this.cIndex += nodes.length;
    }
    this.emit();
  }

  // ---------- mutations ----------

  private insertNode(node: MathNode): void {
    this.cRow.children.splice(this.cIndex, 0, node);
    this.cIndex++;
    this.emit();
  }

  /**
   * MathQuill-style fraction trigger: the operand left of the cursor
   * (digit run / one variable / one closed group, incl. attached SupSub)
   * moves into the numerator.
   */
  private smartFrac(): void {
    const ch = this.cRow.children;
    let k = this.cIndex;
    if (k > 0 && ch[k - 1]!.type === 'supsub') k--;
    if (k > 0) {
      const p = ch[k - 1]!;
      if (
        p.type === 'paren' ||
        p.type === 'sqrt' ||
        p.type === 'frac' ||
        (p.type === 'symbol' && (p.name === 'pi' || p.name === 'infty')) ||
        isLetterChar(p)
      ) {
        k--;
      } else if (isNumChar(p)) {
        while (k > 0 && isNumChar(ch[k - 1]!)) k--;
      }
    }
    const operand = ch.splice(k, this.cIndex - k);
    const node: MathNode = {
      type: 'frac',
      num: { type: 'row', children: operand },
      den: { type: 'row', children: [] },
    };
    ch.splice(k, 0, node);
    this.cRow = operand.length === 0 ? node.num : node.den;
    this.cIndex = 0;
    this.emit();
  }

  /** ^ / _ trigger. Reuses an existing SupSub on the same base instead of creating a second one. */
  private smartSupSub(field: 'sup' | 'sub'): void {
    const prev = this.cRow.children[this.cIndex - 1];
    if (prev && prev.type === 'supsub') {
      if (!prev[field]) prev[field] = { type: 'row', children: [] };
      this.cRow = prev[field]!;
      this.cIndex = this.cRow.children.length;
    } else {
      const node: SupSubNode = { type: 'supsub' };
      node[field] = { type: 'row', children: [] };
      this.cRow.children.splice(this.cIndex, 0, node);
      this.cRow = node[field]!;
      this.cIndex = 0;
    }
    this.emit();
  }

  private openParen(kind: ParenKind): void {
    const node: MathNode = { type: 'paren', kind, body: { type: 'row', children: [] } };
    this.cRow.children.splice(this.cIndex, 0, node);
    this.cRow = node.body;
    this.cIndex = 0;
    this.emit();
  }

  /** Nearest enclosing paren of the cursor, walking up through other structures. */
  private enclosingParen(): Ctx | null {
    let r = this.cRow;
    for (;;) {
      const ctx = findContext(this.root, r);
      if (!ctx) return null;
      if (ctx.node.type === 'paren') return ctx;
      r = ctx.parentRow;
    }
  }

  /** Closing delimiter: leave the paren the cursor is in; no-op outside any paren. */
  private exitParen(): void {
    const ctx = this.enclosingParen();
    if (!ctx) return;
    this.cRow = ctx.parentRow;
    this.cIndex = ctx.index + 1;
    this.render();
  }

  /** '|' closes an enclosing |…| paren, otherwise opens a new one. */
  private pipe(): void {
    const ctx = this.enclosingParen();
    if (ctx && ctx.node.type === 'paren' && ctx.node.kind === '|') {
      this.cRow = ctx.parentRow;
      this.cIndex = ctx.index + 1;
      this.render();
    } else {
      this.openParen('|');
    }
  }

  private backspace(): void {
    if (this.cIndex > 0) {
      const prev = this.cRow.children[this.cIndex - 1]!;
      const fields = fieldsOf(prev);
      if (fields.length) {
        // Don't delete a structure outright: step into its last field.
        const last = fields[fields.length - 1]!;
        this.cRow = last.row;
        this.cIndex = last.row.children.length;
        this.render();
        return;
      }
      this.cRow.children.splice(this.cIndex - 1, 1);
      this.cIndex--;
      this.emit();
      return;
    }
    // At field start: dissolve the structure, lifting all field contents into the parent row.
    const ctx = findContext(this.root, this.cRow);
    if (!ctx) return;
    const lifted: MathNode[] = [];
    let cursorOffset = 0;
    for (const f of fieldsOf(ctx.node)) {
      if (f.row === this.cRow) cursorOffset = lifted.length;
      lifted.push(...f.row.children);
    }
    ctx.parentRow.children.splice(ctx.index, 1, ...lifted);
    this.cRow = ctx.parentRow;
    this.cIndex = ctx.index + cursorOffset;
    this.emit();
  }

  // ---------- navigation ----------

  private moveRight(): void {
    if (this.cIndex < this.cRow.children.length) {
      const node = this.cRow.children[this.cIndex]!;
      const fields = fieldsOf(node);
      if (fields.length) {
        this.cRow = fields[0]!.row;
        this.cIndex = 0;
      } else {
        this.cIndex++;
      }
    } else {
      const ctx = findContext(this.root, this.cRow);
      if (!ctx) return;
      const fields = fieldsOf(ctx.node);
      const fi = fields.findIndex((f) => f.row === this.cRow);
      if (fi < fields.length - 1) {
        this.cRow = fields[fi + 1]!.row;
        this.cIndex = 0;
      } else {
        this.cRow = ctx.parentRow;
        this.cIndex = ctx.index + 1;
      }
    }
    this.render();
  }

  private moveLeft(): void {
    if (this.cIndex > 0) {
      const node = this.cRow.children[this.cIndex - 1]!;
      const fields = fieldsOf(node);
      if (fields.length) {
        const last = fields[fields.length - 1]!;
        this.cRow = last.row;
        this.cIndex = last.row.children.length;
      } else {
        this.cIndex--;
      }
    } else {
      const ctx = findContext(this.root, this.cRow);
      if (!ctx) return;
      const fields = fieldsOf(ctx.node);
      const fi = fields.findIndex((f) => f.row === this.cRow);
      if (fi > 0) {
        this.cRow = fields[fi - 1]!.row;
        this.cIndex = this.cRow.children.length;
      } else {
        this.cRow = ctx.parentRow;
        this.cIndex = ctx.index;
      }
    }
    this.render();
  }

  /** Up (-1) / Down (1): num↔den in fractions, sup↔sub in SupSub; otherwise no effect. */
  private moveVertical(dir: -1 | 1): void {
    let r = this.cRow;
    for (;;) {
      const ctx = findContext(this.root, r);
      if (!ctx) return;
      const { node, field } = ctx;
      let target: Row | undefined;
      if (node.type === 'frac') {
        target = dir === 1 ? (field === 'num' ? node.den : undefined) : field === 'den' ? node.num : undefined;
      } else if (node.type === 'supsub') {
        target = dir === 1 ? (field === 'sup' ? node.sub : undefined) : field === 'sub' ? node.sup : undefined;
      }
      if (target) {
        this.cRow = target;
        this.cIndex = Math.min(this.cIndex, target.children.length);
        this.render();
        return;
      }
      r = ctx.parentRow;
    }
  }

  // ---------- rendering ----------

  private render(): void {
    const content = renderRow(this.root, { row: this.cRow, index: this.cIndex });
    content.classList.add('lmi-root');
    this.container.replaceChildren(content, this.live);
    this.live.textContent = this.getLatex();
  }

  private emit(): void {
    this.render();
    this.opts.onChange?.(this.getLatex());
  }
}
