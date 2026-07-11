import type { MathEditor } from './editor.js';

export interface Key {
  label: string;
  /** LaTeX fragment inserted at the cursor (cursor moves into the first empty field). */
  latex?: string;
  /** Editor key fed through the same pipeline as physical typing, or one of: left, right, up, down, backspace, enter. */
  command?: string;
  aria: string;
  /** Horizontal size relative to a normal key (default 1). */
  span?: number;
}

export interface KeyboardTab {
  id: string;
  label: string;
  rows: Key[][];
}

export interface KeyboardLayout {
  tabs: KeyboardTab[];
}

const COMMAND_KEYS: Record<string, string> = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'ArrowUp',
  down: 'ArrowDown',
  backspace: 'Backspace',
  enter: 'Enter',
};

export class MathKeyboard {
  private readonly container: HTMLElement;
  private readonly editor: MathEditor;
  private readonly panels = new Map<string, HTMLElement>();
  private readonly tabButtons = new Map<string, HTMLElement>();
  private activeTab = '';

  constructor(container: HTMLElement, editor: MathEditor, layout: KeyboardLayout) {
    this.container = container;
    this.editor = editor;
    container.classList.add('lmi-keyboard');
    container.setAttribute('role', 'toolbar');
    container.setAttribute('aria-label', 'Mathematische Tastatur');

    if (layout.tabs.length > 1) {
      const tabBar = document.createElement('div');
      tabBar.className = 'lmi-kb-tabs';
      tabBar.setAttribute('role', 'tablist');
      for (const tab of layout.tabs) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lmi-kb-tab';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-label', tab.label);
        btn.textContent = tab.label;
        this.activate(btn, () => this.setTab(tab.id));
        this.tabButtons.set(tab.id, btn);
        tabBar.appendChild(btn);
      }
      container.appendChild(tabBar);
    }

    for (const tab of layout.tabs) {
      const panel = document.createElement('div');
      panel.className = 'lmi-kb-panel';
      panel.setAttribute('role', 'group');
      panel.setAttribute('aria-label', tab.label);
      for (const rowKeys of tab.rows) {
        const rowEl = document.createElement('div');
        rowEl.className = 'lmi-kb-row';
        for (const key of rowKeys) rowEl.appendChild(this.buildKey(key));
        panel.appendChild(rowEl);
      }
      this.panels.set(tab.id, panel);
      container.appendChild(panel);
    }

    const first = layout.tabs[0];
    if (first) this.setTab(first.id);
  }

  setTab(id: string): void {
    if (!this.panels.has(id)) return;
    this.activeTab = id;
    for (const [tabId, panel] of this.panels) {
      const active = tabId === id;
      panel.classList.toggle('lmi-kb-panel-active', active);
      if (active) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
      const btn = this.tabButtons.get(tabId);
      if (btn) btn.setAttribute('aria-selected', String(active));
    }
  }

  getActiveTab(): string {
    return this.activeTab;
  }

  destroy(): void {
    this.container.replaceChildren();
    this.container.classList.remove('lmi-keyboard');
  }

  private buildKey(key: Key): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lmi-kb-key';
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', key.aria);
    btn.textContent = key.label;
    if (key.span && key.span > 1) btn.dataset['span'] = String(key.span);
    this.activate(btn, () => this.press(key));
    return btn;
  }

  private press(key: Key): void {
    if (key.command) {
      this.editor.input(COMMAND_KEYS[key.command] ?? key.command);
    } else if (key.latex) {
      this.editor.insertLatex(key.latex);
    }
  }

  /** pointerdown for low latency; preventDefault keeps the editor focused. Keyboard activation arrives as click with detail 0. */
  private activate(btn: HTMLElement, fn: () => void): void {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      fn();
    });
    btn.addEventListener('click', (e) => {
      if (e.detail === 0) fn();
    });
  }
}
