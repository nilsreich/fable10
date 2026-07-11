import { flushSync, mount, unmount } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { PRESET_BASIC } from '@litemath/core';
import { LiteMathInput } from '../src/index.js';

describe('@litemath/svelte smoke', () => {
  it('value in → LaTeX out, typing fires onchange', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const onchange = vi.fn();

    const app = mount(LiteMathInput, {
      target,
      props: { value: '\\frac{1}{2}', onchange, class: 'my-math' },
    });
    flushSync();

    expect(target.querySelector('.my-math')).not.toBeNull();
    expect(target.querySelector('.lmi-frac')).not.toBeNull();

    target
      .querySelector('.lmi-editor')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true, cancelable: true }));
    expect(onchange).toHaveBeenCalledWith('\\frac{1}{2}+');

    unmount(app);
  });

  it('renders the virtual keyboard and fires onsubmit', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const onsubmit = vi.fn();

    const app = mount(LiteMathInput, {
      target,
      props: { keyboardLayout: PRESET_BASIC, onsubmit },
    });
    flushSync();

    expect(target.querySelector('.lmi-keyboard')).not.toBeNull();
    target
      .querySelector('.lmi-kb-key[aria-label="Absenden"]')!
      .dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    expect(onsubmit).toHaveBeenCalledWith('');

    unmount(app);
  });
});
