import { act } from 'react';
import { createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { PRESET_BASIC } from '@litemath/core';
import { LiteMathInput, type LiteMathInputHandle } from '../src/index.js';

(globalThis as Record<string, unknown>)['IS_REACT_ACT_ENVIRONMENT'] = true;

describe('@litemath/react smoke', () => {
  it('value in → LaTeX out, typing fires onChange', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const ref = createRef<LiteMathInputHandle>();
    const onChange = vi.fn();

    await act(async () => {
      createRoot(host).render(
        <LiteMathInput ref={ref} value={'\\frac{1}{2}'} onChange={onChange} className="my-math" />
      );
    });

    expect(host.querySelector('.my-math')).not.toBeNull();
    expect(host.querySelector('.lmi-frac')).not.toBeNull();
    expect(ref.current!.getEditor()!.getLatex()).toBe('\\frac{1}{2}');

    host
      .querySelector('.lmi-editor')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true, cancelable: true }));
    expect(onChange).toHaveBeenCalledWith('\\frac{1}{2}+');
  });

  it('renders the virtual keyboard when a layout is passed', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    await act(async () => {
      createRoot(host).render(<LiteMathInput keyboardLayout={PRESET_BASIC} />);
    });
    expect(host.querySelector('.lmi-keyboard')).not.toBeNull();
    expect(host.querySelectorAll('.lmi-kb-key').length).toBeGreaterThan(10);
  });
});
