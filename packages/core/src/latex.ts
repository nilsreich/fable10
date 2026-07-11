import type { MathNode, ParenKind, Row, SupSubNode, SymbolName } from './model.js';
import { CHAR_RE, CLOSE_OF } from './model.js';

/** Thrown on any input outside the supported LaTeX scope. `position` is a 0-based index into the source string. */
export class LatexParseError extends Error {
  readonly position: number;
  constructor(message: string, position: number) {
    super(`${message} (position ${position})`);
    this.name = 'LatexParseError';
    this.position = position;
  }
}

const SYMBOL_LATEX: Record<SymbolName, string> = {
  pi: '\\pi',
  cdot: '\\cdot',
  le: '\\le',
  ge: '\\ge',
  ne: '\\ne',
  pm: '\\pm',
  infty: '\\infty',
  rightarrow: '\\rightarrow',
};

/** Accepted command → canonical symbol name (includes common aliases). */
const SYMBOL_COMMANDS: Record<string, SymbolName> = {
  pi: 'pi',
  cdot: 'cdot',
  le: 'le',
  leq: 'le',
  ge: 'ge',
  geq: 'ge',
  ne: 'ne',
  neq: 'ne',
  pm: 'pm',
  infty: 'infty',
  rightarrow: 'rightarrow',
  to: 'rightarrow',
};

// ---------- Serializer ----------

export function toLatex(r: Row): string {
  let out = '';
  for (const node of r.children) {
    const piece = nodeToLatex(node);
    // "\pi x" needs the space; "\pi+1" does not.
    if (/\\[a-zA-Z]+$/.test(out) && /^[a-zA-Z]/.test(piece)) out += ' ';
    out += piece;
  }
  return out;
}

function nodeToLatex(node: MathNode): string {
  switch (node.type) {
    case 'char':
      return node.value;
    case 'frac':
      return `\\frac{${toLatex(node.num)}}{${toLatex(node.den)}}`;
    case 'supsub': {
      let s = '';
      if (node.sub) s += `_{${toLatex(node.sub)}}`;
      if (node.sup) s += `^{${toLatex(node.sup)}}`;
      return s;
    }
    case 'sqrt':
      return `\\sqrt{${toLatex(node.radicand)}}`;
    case 'paren': {
      const body = toLatex(node.body);
      if (node.kind === '{') return `\\{${body}\\}`;
      return node.kind + body + CLOSE_OF[node.kind];
    }
    case 'symbol':
      return SYMBOL_LATEX[node.name];
  }
}

// ---------- Parser ----------

type Closer =
  | { t: 'brace' } //  }   (argument group)
  | { t: 'esc' } //  \}    (literal brace paren)
  | { t: 'plain'; close: ')' | ']' | '|' }
  | { t: 'right'; close: string }; // \right) etc.

export function parseLatex(src: string): Row {
  let i = 0;

  const fail = (msg: string, pos: number): never => {
    throw new LatexParseError(msg, pos);
  };

  const ws = () => {
    while (i < src.length && /\s/.test(src[i]!)) i++;
  };

  /** At src[i] === '\\'. Reads the command name, or '{' / '}' for escaped braces. */
  const readCommand = (): { cmd: string; start: number } => {
    const start = i;
    i++;
    const c = src[i];
    if (c === undefined) fail('unexpected end of input after \\', start);
    if (c === '{' || c === '}') {
      i++;
      return { cmd: c, start };
    }
    let name = '';
    while (i < src.length && /[a-zA-Z]/.test(src[i]!)) name += src[i++];
    if (!name) fail(`invalid escape \\${c}`, start);
    return { cmd: name, start };
  };

  /** Reads a \left / \right delimiter: ( ) [ ] | \{ \} — returns the raw delimiter char. */
  const readDelim = (ctx: string): string => {
    ws();
    const c = src[i];
    if (c === undefined) fail(`missing delimiter after ${ctx}`, i);
    if (c === '\\') {
      const { cmd, start } = readCommand();
      if (cmd === '{' || cmd === '}') return cmd;
      fail(`invalid delimiter after ${ctx}`, start);
    }
    if ('()[]|'.includes(c!)) {
      i++;
      return c!;
    }
    return fail(`invalid delimiter '${c}' after ${ctx}`, i);
  };

  const parseRow = (closer: Closer | null): Row => {
    const r: Row = { type: 'row', children: [] };
    for (;;) {
      ws();
      if (i >= src.length) {
        if (closer) fail('unexpected end of input, unclosed group', i);
        return r;
      }
      const ch = src[i]!;

      if (ch === '}') {
        if (closer?.t === 'brace') {
          i++;
          return r;
        }
        fail("unexpected '}'", i);
      }

      if (ch === ')' || ch === ']') {
        if (closer?.t === 'plain' && closer.close === ch) {
          i++;
          return r;
        }
        fail(`unmatched '${ch}'`, i);
      }

      if (ch === '|') {
        if (closer?.t === 'plain' && closer.close === '|') {
          i++;
          return r;
        }
        i++;
        r.children.push({ type: 'paren', kind: '|', body: parseRow({ t: 'plain', close: '|' }) });
        continue;
      }

      if (ch === '(' || ch === '[') {
        i++;
        r.children.push({
          type: 'paren',
          kind: ch,
          body: parseRow({ t: 'plain', close: CLOSE_OF[ch] as ')' | ']' }),
        });
        continue;
      }

      if (ch === '{') fail("unexpected '{'", i);

      if (ch === '^' || ch === '_') {
        i++;
        const arg = parseArg(ch);
        const last = r.children[r.children.length - 1];
        const field = ch === '^' ? 'sup' : 'sub';
        if (last && last.type === 'supsub' && !last[field]) {
          last[field] = arg;
        } else {
          const node: SupSubNode = { type: 'supsub' };
          node[field] = arg;
          r.children.push(node);
        }
        continue;
      }

      if (ch === '\\') {
        const { cmd, start } = readCommand();
        if (cmd === '}') {
          if (closer?.t === 'esc') return r;
          fail("unmatched '\\}'", start);
        }
        if (cmd === 'right') {
          if (closer?.t === 'right') {
            const d = readDelim('\\right');
            if (d !== closer.close) fail(`mismatched \\right delimiter '${d}'`, start);
            return r;
          }
          fail('unmatched \\right', start);
        }
        if (cmd === '{') {
          r.children.push({ type: 'paren', kind: '{', body: parseRow({ t: 'esc' }) });
          continue;
        }
        if (cmd === 'left') {
          const d = readDelim('\\left');
          if (d === ')' || d === ']' || d === '}') fail(`invalid \\left delimiter '${d}'`, start);
          const kind = d as ParenKind;
          r.children.push({
            type: 'paren',
            kind,
            body: parseRow({ t: 'right', close: CLOSE_OF[kind] }),
          });
          continue;
        }
        if (cmd === 'frac') {
          const num = parseArg('\\frac');
          const den = parseArg('\\frac');
          r.children.push({ type: 'frac', num, den });
          continue;
        }
        if (cmd === 'sqrt') {
          r.children.push({ type: 'sqrt', radicand: parseArg('\\sqrt') });
          continue;
        }
        const symName = SYMBOL_COMMANDS[cmd];
        if (symName) {
          r.children.push({ type: 'symbol', name: symName });
          continue;
        }
        fail(`unknown command '\\${cmd}'`, start);
      }

      if (CHAR_RE.test(ch)) {
        i++;
        r.children.push({ type: 'char', value: ch });
        continue;
      }

      fail(`unexpected character '${ch}'`, i);
    }
  };

  /** Argument of \frac, \sqrt, ^ or _: a braced group or a single atom. */
  const parseArg = (ctx: string): Row => {
    ws();
    const c = src[i];
    if (c === undefined) fail(`missing argument for ${ctx}`, i);
    if (c === '{') {
      i++;
      return parseRow({ t: 'brace' });
    }
    if (c === '\\') {
      const { cmd, start } = readCommand();
      const symName = SYMBOL_COMMANDS[cmd];
      if (symName) return { type: 'row', children: [{ type: 'symbol', name: symName }] };
      fail(`invalid argument '\\${cmd}' for ${ctx}`, start);
    }
    if (CHAR_RE.test(c!)) {
      i++;
      return { type: 'row', children: [{ type: 'char', value: c! }] };
    }
    return fail(`invalid argument for ${ctx}`, i);
  };

  const result = parseRow(null);
  return result;
}
