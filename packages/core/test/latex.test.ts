import { describe, expect, it } from 'vitest';
import {
  char,
  frac,
  LatexParseError,
  paren,
  parseLatex,
  row,
  sqrt,
  sym,
  toLatex,
  type Row,
  type SupSubNode,
} from '../src/index.js';

const supsub = (fields: { sup?: Row; sub?: Row }): SupSubNode => ({ type: 'supsub', ...fields });

describe('serializer', () => {
  it('serializes plain chars', () => {
    expect(toLatex(row(char('3'), char('x'), char('+'), char('1')))).toBe('3x+1');
  });

  it('serializes a fraction', () => {
    expect(toLatex(row(frac(row(char('1')), row(char('2')))))).toBe('\\frac{1}{2}');
  });

  it('serializes nested fractions', () => {
    const tree = row(frac(row(frac(row(char('a')), row(char('b')))), row(char('c'))));
    expect(toLatex(tree)).toBe('\\frac{\\frac{a}{b}}{c}');
  });

  it('serializes superscript only', () => {
    expect(toLatex(row(char('x'), supsub({ sup: row(char('2')) })))).toBe('x^{2}');
  });

  it('serializes subscript only', () => {
    expect(toLatex(row(char('a'), supsub({ sub: row(char('n')) })))).toBe('a_{n}');
  });

  it('serializes sub before sup when both exist', () => {
    expect(
      toLatex(row(char('x'), supsub({ sup: row(char('2')), sub: row(char('i')) })))
    ).toBe('x_{i}^{2}');
  });

  it('serializes sqrt', () => {
    expect(toLatex(row(sqrt(row(char('2')))))).toBe('\\sqrt{2}');
  });

  it('serializes round/square/curly/pipe parens', () => {
    expect(toLatex(row(paren('(', row(char('x')))))).toBe('(x)');
    expect(toLatex(row(paren('[', row(char('x')))))).toBe('[x]');
    expect(toLatex(row(paren('{', row(char('x')))))).toBe('\\{x\\}');
    expect(toLatex(row(paren('|', row(char('x')))))).toBe('|x|');
  });

  it('serializes all symbols', () => {
    const tree = row(
      sym('pi'),
      sym('cdot'),
      sym('le'),
      sym('ge'),
      sym('ne'),
      sym('pm'),
      sym('infty'),
      sym('rightarrow')
    );
    expect(toLatex(tree)).toBe('\\pi\\cdot\\le\\ge\\ne\\pm\\infty\\rightarrow');
  });

  it('inserts a space between a command and a following letter', () => {
    expect(toLatex(row(sym('pi'), char('x')))).toBe('\\pi x');
    expect(toLatex(row(sym('pi'), char('+'), char('1')))).toBe('\\pi+1');
    expect(toLatex(row(char('2'), sym('cdot'), char('r')))).toBe('2\\cdot r');
  });

  it('serializes an empty row as empty string', () => {
    expect(toLatex(row())).toBe('');
    expect(toLatex(row(frac(row(), row())))).toBe('\\frac{}{}');
  });
});

describe('parser', () => {
  it('parses plain chars and operators', () => {
    expect(parseLatex('3x+1=y')).toEqual(
      row(char('3'), char('x'), char('+'), char('1'), char('='), char('y'))
    );
  });

  it('skips whitespace', () => {
    expect(parseLatex('  3 +  x ')).toEqual(row(char('3'), char('+'), char('x')));
  });

  it('parses \\frac with braced args', () => {
    expect(parseLatex('\\frac{1}{2}')).toEqual(row(frac(row(char('1')), row(char('2')))));
  });

  it('parses \\frac with single-atom args', () => {
    expect(parseLatex('\\frac12')).toEqual(row(frac(row(char('1')), row(char('2')))));
  });

  it('parses superscript with braces and single atom', () => {
    const expected = row(char('x'), supsub({ sup: row(char('2')) }));
    expect(parseLatex('x^{2}')).toEqual(expected);
    expect(parseLatex('x^2')).toEqual(expected);
  });

  it('merges _ and ^ on the same base into one SupSub node', () => {
    const expected = row(char('x'), supsub({ sub: row(char('i')), sup: row(char('2')) }));
    expect(parseLatex('x_{i}^{2}')).toEqual(expected);
    expect(parseLatex('x^{2}_{i}')).toEqual(expected);
  });

  it('parses \\sqrt', () => {
    expect(parseLatex('\\sqrt{x+1}')).toEqual(
      row(sqrt(row(char('x'), char('+'), char('1'))))
    );
  });

  it('parses \\left(...\\right) and plain (...) to the same tree', () => {
    const expected = row(paren('(', row(char('a'), char('+'), char('b'))));
    expect(parseLatex('\\left(a+b\\right)')).toEqual(expected);
    expect(parseLatex('(a+b)')).toEqual(expected);
  });

  it('parses square, curly and pipe delimiters', () => {
    expect(parseLatex('[x]')).toEqual(row(paren('[', row(char('x')))));
    expect(parseLatex('\\{x\\}')).toEqual(row(paren('{', row(char('x')))));
    expect(parseLatex('|x|')).toEqual(row(paren('|', row(char('x')))));
    expect(parseLatex('\\left[x\\right]')).toEqual(row(paren('[', row(char('x')))));
    expect(parseLatex('\\left|x\\right|')).toEqual(row(paren('|', row(char('x')))));
    expect(parseLatex('\\left\\{x\\right\\}')).toEqual(row(paren('{', row(char('x')))));
  });

  it('parses all symbols including aliases', () => {
    expect(parseLatex('\\pi\\cdot\\le\\ge\\ne\\pm\\infty\\rightarrow')).toEqual(
      row(
        sym('pi'),
        sym('cdot'),
        sym('le'),
        sym('ge'),
        sym('ne'),
        sym('pm'),
        sym('infty'),
        sym('rightarrow')
      )
    );
    expect(parseLatex('\\leq\\geq\\neq\\to')).toEqual(
      row(sym('le'), sym('ge'), sym('ne'), sym('rightarrow'))
    );
  });

  it('parses a symbol as a bare argument', () => {
    expect(parseLatex('x^\\pi')).toEqual(row(char('x'), supsub({ sup: row(sym('pi')) })));
  });

  it('parses nested structures', () => {
    expect(parseLatex('\\frac{\\sqrt{2}}{(x_{1})}')).toEqual(
      row(
        frac(
          row(sqrt(row(char('2')))),
          row(paren('(', row(char('x'), supsub({ sub: row(char('1')) }))))
        )
      )
    );
  });
});

describe('parser errors', () => {
  const errAt = (src: string, position: number) => {
    let caught: unknown;
    try {
      parseLatex(src);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(LatexParseError);
    expect((caught as LatexParseError).position).toBe(position);
  };

  it('rejects unknown commands with position', () => {
    errAt('1+\\alpha', 2);
  });

  it('rejects out-of-scope characters with position', () => {
    errAt('3!', 1);
    errAt('a&b', 1);
  });

  it('rejects unclosed groups', () => {
    expect(() => parseLatex('\\frac{1}{2')).toThrow(LatexParseError);
    expect(() => parseLatex('(1+2')).toThrow(LatexParseError);
    expect(() => parseLatex('\\left(1\\right')).toThrow(LatexParseError);
  });

  it('rejects missing arguments', () => {
    expect(() => parseLatex('\\frac{1}')).toThrow(LatexParseError);
    expect(() => parseLatex('x^')).toThrow(LatexParseError);
    expect(() => parseLatex('\\sqrt')).toThrow(LatexParseError);
  });

  it('rejects unmatched closers with position', () => {
    errAt('1)', 1);
    errAt('x]', 1);
    errAt('a}', 1);
    errAt('ab\\right)', 2);
  });

  it('rejects mismatched \\left...\\right delimiters', () => {
    expect(() => parseLatex('\\left(1\\right]')).toThrow(LatexParseError);
  });

  it('rejects bare { and stray backslash', () => {
    errAt('{x}', 0);
    expect(() => parseLatex('x\\')).toThrow(LatexParseError);
  });

  it('does not silently swallow anything: \\mathop is rejected', () => {
    expect(() => parseLatex('\\mathop{f}')).toThrow(LatexParseError);
  });
});

describe('roundtrip', () => {
  const trees: [string, Row][] = [
    ['chars', row(char('3'), char('x'), char('+'), char('1'))],
    ['fraction', row(frac(row(char('1')), row(char('2'))))],
    [
      'fraction 3 levels deep',
      row(
        frac(
          row(frac(row(frac(row(char('a')), row(char('b')))), row(char('c')))),
          row(char('d'))
        )
      ),
    ],
    ['supsub both', row(char('x'), supsub({ sup: row(char('2')), sub: row(char('i')) }))],
    ['sup only', row(char('x'), supsub({ sup: row(char('n'), char('+'), char('1')) }))],
    ['sub only', row(char('a'), supsub({ sub: row(char('k')) }))],
    ['sqrt', row(sqrt(row(char('x'), char('+'), char('1'))))],
    ['paren round', row(paren('(', row(char('a'), char('+'), char('b'))))],
    ['paren square', row(paren('[', row(char('0'), char(','), char('1'))))],
    ['paren curly', row(paren('{', row(char('x'))))],
    ['paren pipe', row(paren('|', row(char('-'), char('x'))))],
    ['symbols', row(char('2'), sym('cdot'), sym('pi'), sym('le'), sym('infty'))],
    [
      'kitchen sink',
      row(
        paren('(', row(char('x'), supsub({ sup: row(char('2')) }), char('+'), char('1'))),
        sym('cdot'),
        frac(row(sqrt(row(char('2')))), row(sym('pi'))),
        char('='),
        char('y'),
        supsub({ sub: row(char('0')) })
      ),
    ],
    ['empty fraction fields', row(frac(row(), row()))],
  ];

  for (const [name, tree] of trees) {
    it(`parse(serialize(tree)) ≡ tree — ${name}`, () => {
      expect(parseLatex(toLatex(tree))).toEqual(tree);
    });
  }

  it('roundtrips \\left(...\\right) input through the plain-paren serializer', () => {
    const t = parseLatex('\\left(1+2\\right)');
    expect(parseLatex(toLatex(t))).toEqual(t);
    expect(toLatex(t)).toBe('(1+2)');
  });
});
