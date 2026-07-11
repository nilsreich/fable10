import { describe, expect, it, vi } from 'vitest';
import { LatexParseError, MathEditor, type MathEditorOptions } from '../src/index.js';

function make(opts: MathEditorOptions = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const ed = new MathEditor(container, opts);
  return { container, ed };
}

function type(ed: MathEditor, ...keys: string[]) {
  for (const k of keys) ed.input(k);
}

describe('basic input', () => {
  it('inserts chars in scope', () => {
    const { ed } = make();
    type(ed, '3', 'x', '+', '1');
    expect(ed.getLatex()).toBe('3x+1');
  });

  it('handles real keydown events and prevents default', () => {
    const { container, ed } = make();
    const ev = new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true });
    container.dispatchEvent(ev);
    expect(ed.getLatex()).toBe('x');
    expect(ev.defaultPrevented).toBe(true);
  });

  it('ignores keys outside scope (no preventDefault)', () => {
    const { container, ed } = make();
    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    container.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    expect(ed.getLatex()).toBe('');
  });

  it('ignores keydown with ctrl/meta modifiers', () => {
    const { container, ed } = make();
    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true })
    );
    expect(ed.getLatex()).toBe('');
  });

  it('maps * to \\cdot', () => {
    const { ed } = make();
    type(ed, '2', '*', 'r');
    expect(ed.getLatex()).toBe('2\\cdot r');
  });
});

describe('smart fraction trigger', () => {
  it('/ after 3x+1 pulls only the 1 into the numerator', () => {
    const { ed } = make();
    type(ed, '3', 'x', '+', '1', '/');
    expect(ed.getLatex()).toBe('3x+\\frac{1}{}');
    type(ed, '2'); // cursor must be in the denominator
    expect(ed.getLatex()).toBe('3x+\\frac{1}{2}');
  });

  it('/ pulls a whole digit run', () => {
    const { ed } = make();
    type(ed, '1', '2', '.', '5', '/');
    expect(ed.getLatex()).toBe('\\frac{12.5}{}');
  });

  it('/ pulls a closed paren group as one operand', () => {
    const { ed } = make();
    type(ed, '(', 'x', '+', '1', ')', '/');
    expect(ed.getLatex()).toBe('\\frac{(x+1)}{}');
  });

  it('/ with no operand puts the cursor into the empty numerator', () => {
    const { ed } = make();
    type(ed, '+', '/');
    expect(ed.getLatex()).toBe('+\\frac{}{}');
    type(ed, 'a'); // cursor must be in the numerator
    expect(ed.getLatex()).toBe('+\\frac{a}{}');
  });

  it('/ takes an exponent along with its base', () => {
    const { ed } = make();
    type(ed, 'x', '^', '2', 'ArrowRight', '/');
    expect(ed.getLatex()).toBe('\\frac{x^{2}}{}');
  });
});

describe('sup/sub trigger', () => {
  it('^ creates a superscript and moves the cursor inside', () => {
    const { ed } = make();
    type(ed, 'x', '^', '2');
    expect(ed.getLatex()).toBe('x^{2}');
  });

  it('_ creates a subscript', () => {
    const { ed } = make();
    type(ed, 'a', '_', 'n');
    expect(ed.getLatex()).toBe('a_{n}');
  });

  it('^ after an existing subscript completes the same SupSub node', () => {
    const { ed } = make();
    type(ed, 'x', '_', 'i', 'ArrowRight', '^', '2');
    expect(ed.getLatex()).toBe('x_{i}^{2}');
    expect(ed.getRoot().children).toHaveLength(2); // x + ONE supsub
  });

  it('^ on an existing superscript moves into it instead of nesting', () => {
    const { ed } = make();
    type(ed, 'x', '^', '2', 'ArrowRight', '^', '3');
    expect(ed.getLatex()).toBe('x^{23}');
  });
});

describe('paren trigger', () => {
  it('( opens a pair with the cursor inside, ) leaves it', () => {
    const { ed } = make();
    type(ed, 'x', '(', 'y', ')', 'z');
    expect(ed.getLatex()).toBe('x(y)z');
  });

  it(') outside any paren is a no-op', () => {
    const { ed } = make();
    type(ed, 'x', ')');
    expect(ed.getLatex()).toBe('x');
  });

  it(') leaves a paren from a nested position', () => {
    const { ed } = make();
    type(ed, '(', '1', '/', '2', ')', '+');
    expect(ed.getLatex()).toBe('(\\frac{1}{2})+');
  });

  it('| opens on first press and closes on second', () => {
    const { ed } = make();
    type(ed, '|', 'x', '|', 'y');
    expect(ed.getLatex()).toBe('|x|y');
  });

  it('square and curly pairs work', () => {
    const { ed } = make();
    type(ed, '[', 'a', ']', '{', 'b', '}');
    expect(ed.getLatex()).toBe('[a]\\{b\\}');
  });
});

describe('backspace', () => {
  it('deletes the previous char', () => {
    const { ed } = make();
    type(ed, 'a', 'b', 'Backspace');
    expect(ed.getLatex()).toBe('a');
  });

  it('at the start of a denominator dissolves the fraction, lifting content', () => {
    const { ed } = make();
    type(ed, '1', '2', '/', '3', '4');
    expect(ed.getLatex()).toBe('\\frac{12}{34}');
    type(ed, 'ArrowLeft', 'ArrowLeft', 'Backspace');
    expect(ed.getLatex()).toBe('1234');
    type(ed, 'x'); // cursor sits between lifted num and den content
    expect(ed.getLatex()).toBe('12x34');
  });

  it('after a structure steps into its last field instead of deleting it', () => {
    const { ed } = make();
    type(ed, '1', '/', '2', 'ArrowRight', 'Backspace');
    expect(ed.getLatex()).toBe('\\frac{1}{2}'); // nothing deleted
    type(ed, 'Backspace'); // now deletes the 2 inside the denominator
    expect(ed.getLatex()).toBe('\\frac{1}{}');
  });

  it('removes an entirely empty structure', () => {
    const { ed } = make();
    type(ed, '/', 'Backspace');
    expect(ed.getLatex()).toBe('');
  });

  it('dissolves a sqrt lifting the radicand', () => {
    const { ed } = make();
    ed.insertLatex('\\sqrt{ab}');
    type(ed, 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'Backspace');
    expect(ed.getLatex()).toBe('ab');
  });

  it('at the very start of the root is a no-op', () => {
    const { ed } = make();
    type(ed, 'ArrowLeft', 'Backspace');
    expect(ed.getLatex()).toBe('');
  });
});

describe('arrow navigation', () => {
  it('→ leaves the denominator and exits the fraction', () => {
    const { ed } = make();
    type(ed, '1', '/', '2', 'ArrowRight', 'z');
    expect(ed.getLatex()).toBe('\\frac{1}{2}z');
  });

  it('→ from the numerator end moves into the denominator', () => {
    const { ed } = make();
    type(ed, '1', '/');
    // cursor in empty den; ↑ lands at num start, walk to num end, then → moves into den
    type(ed, 'ArrowUp', 'ArrowRight', 'ArrowRight', 'x');
    expect(ed.getLatex()).toBe('\\frac{1}{x}');
  });

  it('→ before a fraction enters the numerator', () => {
    const { ed } = make();
    ed.setLatex('\\frac{1}{2}');
    const root = ed.getRoot();
    // cursor at root end; walk left to root start (den → num → out)
    type(ed, 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft');
    expect(ed.getCursor()).toEqual({ row: root, index: 0 });
    type(ed, 'ArrowRight', 'a');
    expect(ed.getLatex()).toBe('\\frac{a1}{2}');
  });

  it('← at the root start stays put', () => {
    const { ed } = make();
    const before = ed.getCursor();
    type(ed, 'ArrowLeft');
    expect(ed.getCursor()).toEqual(before);
  });

  it('← enters a fraction from behind via the denominator', () => {
    const { ed } = make();
    type(ed, '1', '/', '2', 'ArrowRight', 'ArrowLeft', 'x');
    expect(ed.getLatex()).toBe('\\frac{1}{2x}');
  });

  it('↑/↓ switch between numerator and denominator', () => {
    const { ed } = make();
    type(ed, '1', '/', '2', 'ArrowUp', 'a');
    expect(ed.getLatex()).toBe('\\frac{1a}{2}');
    type(ed, 'ArrowDown', 'b');
    expect(ed.getLatex()).toBe('\\frac{1a}{2b}');
  });

  it('↑/↓ switch between sub and sup', () => {
    const { ed } = make();
    type(ed, 'x', '_', 'i', 'ArrowRight', '^', '2');
    type(ed, 'ArrowDown', 'j'); // sup → sub
    expect(ed.getLatex()).toBe('x_{ij}^{2}');
    type(ed, 'ArrowUp', '3'); // sub → sup
    expect(ed.getLatex()).toBe('x_{ij}^{23}');
  });

  it('↑/↓ at the top level are no-ops', () => {
    const { ed } = make();
    type(ed, 'x');
    const before = ed.getCursor();
    type(ed, 'ArrowUp', 'ArrowDown');
    expect(ed.getCursor()).toEqual(before);
  });

  it('↑ from a deep position finds the enclosing fraction', () => {
    const { ed } = make();
    type(ed, '1', '/', '(', 'x'); // cursor inside paren inside den — ↑ climbs to the frac
    type(ed, 'ArrowUp', 'q');
    expect(ed.getLatex()).toBe('\\frac{1q}{(x)}');
  });
});

describe('DOM rendering', () => {
  it('renders fraction, cursor and placeholder for the empty denominator', () => {
    const { container, ed } = make();
    type(ed, '1', '/');
    expect(container.querySelector('.lmi-frac')).not.toBeNull();
    expect(container.querySelector('.lmi-frac-den .lmi-placeholder')).not.toBeNull();
    expect(container.querySelectorAll('.lmi-cursor')).toHaveLength(1);
    expect(container.querySelector('.lmi-frac-den .lmi-cursor')).not.toBeNull();
  });

  it('renders symbols with display characters', () => {
    const { container, ed } = make();
    ed.insertLatex('\\pi\\cdot');
    expect(container.querySelector('.lmi-sym-pi')?.textContent).toBe('π');
    expect(container.querySelector('.lmi-sym-cdot')?.textContent).toBe('·');
  });

  it('sets textbox ARIA and focusability on the container', () => {
    const { container } = make();
    expect(container.getAttribute('role')).toBe('textbox');
    expect(container.getAttribute('tabindex')).toBe('0');
    expect(container.getAttribute('aria-label')).toBeTruthy();
    expect(container.classList.contains('lmi-editor')).toBe(true);
  });

  it('mirrors the LaTeX value into the live region', () => {
    const { container, ed } = make();
    type(ed, '1', '+', '2');
    expect(container.querySelector('.lmi-live')?.textContent).toBe('1+2');
  });
});

describe('API', () => {
  it('setLatex replaces content and does not fire onChange', () => {
    const onChange = vi.fn();
    const { ed } = make({ onChange });
    ed.setLatex('\\frac{1}{2}');
    expect(ed.getLatex()).toBe('\\frac{1}{2}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('setLatex throws LatexParseError on invalid input', () => {
    const { ed } = make();
    expect(() => ed.setLatex('\\alpha')).toThrow(LatexParseError);
  });

  it('fires onChange with the current LaTeX on every mutation', () => {
    const onChange = vi.fn();
    const { ed } = make({ onChange });
    type(ed, '1', '+');
    expect(onChange).toHaveBeenNthCalledWith(1, '1');
    expect(onChange).toHaveBeenNthCalledWith(2, '1+');
  });

  it('Enter fires onSubmit with the current LaTeX', () => {
    const onSubmit = vi.fn();
    const { ed } = make({ onSubmit });
    type(ed, '4', '2', 'Enter');
    expect(onSubmit).toHaveBeenCalledWith('42');
  });

  it('getTokens linearizes the current content', () => {
    const { ed } = make();
    type(ed, '1', '/', '2');
    expect(ed.getTokens()).toEqual([
      { type: 'frac-open', value: '' },
      { type: 'num', value: '1' },
      { type: 'frac-mid', value: '' },
      { type: 'num', value: '2' },
      { type: 'frac-close', value: '' },
    ]);
  });

  it('insertLatex moves the cursor into the first empty field', () => {
    const { ed } = make();
    ed.insertLatex('\\sqrt{}');
    type(ed, '2');
    expect(ed.getLatex()).toBe('\\sqrt{2}');
  });

  it('insertLatex without empty fields places the cursor after the fragment', () => {
    const { ed } = make();
    ed.insertLatex('\\pi');
    type(ed, 'r');
    expect(ed.getLatex()).toBe('\\pi r');
  });

  it('destroy removes the keydown handling and empties the container', () => {
    const { container, ed } = make();
    type(ed, '1');
    ed.destroy();
    container.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true, cancelable: true }));
    expect(ed.getLatex()).toBe('1');
    expect(container.children).toHaveLength(0);
  });
});
