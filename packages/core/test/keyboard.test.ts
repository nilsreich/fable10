import { describe, expect, it, vi } from 'vitest';
import {
  MathEditor,
  MathKeyboard,
  PRESET_ALGEBRA,
  PRESET_ANALYSIS,
  PRESET_BASIC,
  type KeyboardLayout,
  type MathEditorOptions,
} from '../src/index.js';

function make(layout: KeyboardLayout = PRESET_BASIC, opts: MathEditorOptions = {}) {
  const edEl = document.createElement('div');
  const kbEl = document.createElement('div');
  document.body.append(edEl, kbEl);
  const ed = new MathEditor(edEl, opts);
  const kb = new MathKeyboard(kbEl, ed, layout);
  return { ed, kb, kbEl };
}

function findKey(kbEl: HTMLElement, aria: string): HTMLElement {
  const all = kbEl.querySelectorAll<HTMLElement>(`.lmi-kb-key[aria-label="${aria}"]`);
  const visible = Array.from(all).find((b) => !b.closest('[hidden]'));
  if (!visible) throw new Error(`key not found: ${aria}`);
  return visible;
}

function press(kbEl: HTMLElement, aria: string) {
  findKey(kbEl, aria).dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
}

describe('preset rendering', () => {
  const presets: [string, KeyboardLayout][] = [
    ['PRESET_BASIC', PRESET_BASIC],
    ['PRESET_ALGEBRA', PRESET_ALGEBRA],
    ['PRESET_ANALYSIS', PRESET_ANALYSIS],
  ];

  for (const [name, preset] of presets) {
    it(`${name} renders all tabs and keys with aria-labels`, () => {
      const { kbEl } = make(preset);
      expect(kbEl.querySelectorAll('.lmi-kb-panel')).toHaveLength(preset.tabs.length);
      const keys = kbEl.querySelectorAll('.lmi-kb-key');
      const expected = preset.tabs.reduce((n, t) => n + t.rows.reduce((m, r) => m + r.length, 0), 0);
      expect(keys).toHaveLength(expected);
      for (const key of keys) {
        expect(key.getAttribute('aria-label')).toBeTruthy();
        expect(key.getAttribute('role')).toBe('button');
      }
    });
  }

  it('every preset has dedicated arrow, backspace and enter keys', () => {
    for (const preset of [PRESET_BASIC, PRESET_ALGEBRA, PRESET_ANALYSIS]) {
      const { kbEl } = make(preset);
      for (const aria of ['Cursor nach links', 'Cursor nach rechts', 'Löschen', 'Absenden']) {
        expect(kbEl.querySelector(`.lmi-kb-key[aria-label="${aria}"]`)).not.toBeNull();
      }
    }
  });
});

describe('key presses mutate the engine', () => {
  it('digit key inserts a digit on pointerdown', () => {
    const { ed, kbEl } = make();
    press(kbEl, 'Sieben');
    expect(ed.getLatex()).toBe('7');
  });

  it('÷ key triggers the smart fraction', () => {
    const { ed, kbEl } = make();
    press(kbEl, 'Drei');
    press(kbEl, 'Bruch');
    expect(ed.getLatex()).toBe('\\frac{3}{}');
    press(kbEl, 'Zwei'); // cursor in denominator
    expect(ed.getLatex()).toBe('\\frac{3}{2}');
  });

  it('· key inserts \\cdot via the latex path', () => {
    const { ed, kbEl } = make();
    press(kbEl, 'Zwei');
    press(kbEl, 'Mal');
    press(kbEl, 'Drei');
    expect(ed.getLatex()).toBe('2\\cdot3');
  });

  it('√ key moves the cursor into the radicand', () => {
    const { ed, kbEl } = make(PRESET_ALGEBRA);
    const kb = kbEl.querySelector('.lmi-kb-tab') as HTMLElement;
    void kb;
    // switch to abc tab where √ lives
    const abcTab = Array.from(kbEl.querySelectorAll<HTMLElement>('.lmi-kb-tab')).find(
      (t) => t.textContent === 'abc'
    )!;
    abcTab.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    press(kbEl, 'Quadratwurzel');
    press(kbEl, 'Variable x');
    expect(ed.getLatex()).toBe('\\sqrt{x}');
  });

  it('backspace key deletes', () => {
    const { ed, kbEl } = make();
    press(kbEl, 'Eins');
    press(kbEl, 'Zwei');
    press(kbEl, 'Löschen');
    expect(ed.getLatex()).toBe('1');
  });

  it('arrow keys navigate (leave the denominator)', () => {
    const { ed, kbEl } = make();
    press(kbEl, 'Eins');
    press(kbEl, 'Bruch');
    press(kbEl, 'Zwei');
    press(kbEl, 'Cursor nach rechts');
    press(kbEl, 'Plus');
    expect(ed.getLatex()).toBe('\\frac{1}{2}+');
  });

  it('enter key fires the submit event', () => {
    const onSubmit = vi.fn();
    const { kbEl } = make(PRESET_BASIC, { onSubmit });
    press(kbEl, 'Vier');
    press(kbEl, 'Absenden');
    expect(onSubmit).toHaveBeenCalledWith('4');
  });

  it('pointerdown is prevented so the editor keeps focus', () => {
    const { kbEl } = make();
    const ev = new Event('pointerdown', { bubbles: true, cancelable: true });
    findKey(kbEl, 'Sieben').dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('keyboard-initiated click (detail 0) also activates the key', () => {
    const { ed, kbEl } = make();
    findKey(kbEl, 'Acht').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    expect(ed.getLatex()).toBe('8');
  });
});

describe('tabs and ARIA', () => {
  it('container is a labelled toolbar', () => {
    const { kbEl } = make();
    expect(kbEl.getAttribute('role')).toBe('toolbar');
    expect(kbEl.getAttribute('aria-label')).toBeTruthy();
  });

  it('multi-tab layouts render a tablist and switch panels', () => {
    const { kb, kbEl } = make(PRESET_ANALYSIS);
    expect(kbEl.querySelector('.lmi-kb-tabs')?.getAttribute('role')).toBe('tablist');
    const panels = kbEl.querySelectorAll<HTMLElement>('.lmi-kb-panel');
    expect(kb.getActiveTab()).toBe('123');
    expect(panels[0]!.hasAttribute('hidden')).toBe(false);
    expect(panels[1]!.hasAttribute('hidden')).toBe(true);

    kb.setTab('fx');
    expect(panels[0]!.hasAttribute('hidden')).toBe(true);
    expect(panels[1]!.hasAttribute('hidden')).toBe(false);
    expect(kb.getActiveTab()).toBe('fx');
  });

  it('tab buttons carry aria-selected and switch on pointerdown', () => {
    const { kbEl } = make(PRESET_ALGEBRA);
    const tabs = kbEl.querySelectorAll<HTMLElement>('.lmi-kb-tab');
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('false');
    tabs[1]!.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('false');
  });

  it('single-tab layouts render no tablist', () => {
    const { kbEl } = make(PRESET_BASIC);
    expect(kbEl.querySelector('.lmi-kb-tabs')).toBeNull();
  });

  it('panels are labelled groups', () => {
    const { kbEl } = make(PRESET_ANALYSIS);
    for (const panel of kbEl.querySelectorAll('.lmi-kb-panel')) {
      expect(panel.getAttribute('role')).toBe('group');
      expect(panel.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('span keys carry a data-span attribute for CSS sizing', () => {
    const { kbEl } = make();
    expect(kbEl.querySelector('.lmi-kb-key[data-span="2"]')).not.toBeNull();
  });

  it('destroy empties the container', () => {
    const { kb, kbEl } = make();
    kb.destroy();
    expect(kbEl.children).toHaveLength(0);
    expect(kbEl.classList.contains('lmi-keyboard')).toBe(false);
  });
});

describe('analysis preset scope', () => {
  it('ln key inserts plain chars l and n (no \\ln in scope)', () => {
    const { ed, kb, kbEl } = make(PRESET_ANALYSIS);
    kb.setTab('fx');
    press(kbEl, 'Natürlicher Logarithmus');
    press(kbEl, 'Klammer auf');
    press(kbEl, 'Variable x');
    expect(ed.getLatex()).toBe('ln(x)');
  });

  it('π and ∞ insert symbols', () => {
    const { ed, kb, kbEl } = make(PRESET_ANALYSIS);
    kb.setTab('fx');
    press(kbEl, 'Pi');
    press(kbEl, 'Unendlich');
    expect(ed.getLatex()).toBe('\\pi\\infty');
  });
});
