import { describe, expect, it } from 'vitest';
import { parseLatex, toTokens, type Token } from '../src/index.js';

const tok = (src: string): Token[] => toTokens(parseLatex(src));

describe('token linearization', () => {
  it('merges consecutive digits into one num token', () => {
    expect(tok('42')).toEqual([{ type: 'num', value: '42' }]);
  });

  it('merges decimal points into the num token', () => {
    expect(tok('3.14')).toEqual([{ type: 'num', value: '3.14' }]);
  });

  it('splits num tokens on variables and operators', () => {
    expect(tok('12x+3')).toEqual([
      { type: 'num', value: '12' },
      { type: 'var', value: 'x' },
      { type: 'op', value: '+' },
      { type: 'num', value: '3' },
    ]);
  });

  it('emits op tokens for all operator chars', () => {
    expect(tok('+-=<>,')).toEqual([
      { type: 'op', value: '+' },
      { type: 'op', value: '-' },
      { type: 'op', value: '=' },
      { type: 'op', value: '<' },
      { type: 'op', value: '>' },
      { type: 'op', value: ',' },
    ]);
  });

  it('linearizes fractions with open/mid/close', () => {
    expect(tok('\\frac{1}{2}')).toEqual([
      { type: 'frac-open', value: '' },
      { type: 'num', value: '1' },
      { type: 'frac-mid', value: '' },
      { type: 'num', value: '2' },
      { type: 'frac-close', value: '' },
    ]);
  });

  it('linearizes sup and sub (sub first, matching serializer order)', () => {
    expect(tok('x_{i}^{2}')).toEqual([
      { type: 'var', value: 'x' },
      { type: 'sub-open', value: '' },
      { type: 'var', value: 'i' },
      { type: 'sub-close', value: '' },
      { type: 'sup-open', value: '' },
      { type: 'num', value: '2' },
      { type: 'sup-close', value: '' },
    ]);
  });

  it('linearizes sqrt', () => {
    expect(tok('\\sqrt{2x}')).toEqual([
      { type: 'sqrt-open', value: '' },
      { type: 'num', value: '2' },
      { type: 'var', value: 'x' },
      { type: 'sqrt-close', value: '' },
    ]);
  });

  it('linearizes parens with delimiter values', () => {
    expect(tok('(x)')).toEqual([
      { type: 'paren-open', value: '(' },
      { type: 'var', value: 'x' },
      { type: 'paren-close', value: ')' },
    ]);
    expect(tok('|y|')).toEqual([
      { type: 'paren-open', value: '|' },
      { type: 'var', value: 'y' },
      { type: 'paren-close', value: '|' },
    ]);
  });

  it('emits symbol tokens with the symbol name', () => {
    expect(tok('2\\cdot\\pi')).toEqual([
      { type: 'num', value: '2' },
      { type: 'symbol', value: 'cdot' },
      { type: 'symbol', value: 'pi' },
    ]);
  });

  it('does not merge digits across structure boundaries', () => {
    expect(tok('1\\frac{2}{3}4')).toEqual([
      { type: 'num', value: '1' },
      { type: 'frac-open', value: '' },
      { type: 'num', value: '2' },
      { type: 'frac-mid', value: '' },
      { type: 'num', value: '3' },
      { type: 'frac-close', value: '' },
      { type: 'num', value: '4' },
    ]);
  });

  it('linearizes a complete expression in reading order', () => {
    expect(tok('\\frac{x^{2}}{2}\\le|y|')).toEqual([
      { type: 'frac-open', value: '' },
      { type: 'var', value: 'x' },
      { type: 'sup-open', value: '' },
      { type: 'num', value: '2' },
      { type: 'sup-close', value: '' },
      { type: 'frac-mid', value: '' },
      { type: 'num', value: '2' },
      { type: 'frac-close', value: '' },
      { type: 'symbol', value: 'le' },
      { type: 'paren-open', value: '|' },
      { type: 'var', value: 'y' },
      { type: 'paren-close', value: '|' },
    ]);
  });

  it('returns an empty array for an empty row', () => {
    expect(tok('')).toEqual([]);
  });
});
