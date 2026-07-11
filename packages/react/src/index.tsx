import { MathEditor, MathKeyboard, type KeyboardLayout } from '@litemath/core';
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';

export interface LiteMathInputProps {
  /** Controlled LaTeX value. */
  value?: string;
  onChange?: (latex: string) => void;
  onSubmit?: (latex: string) => void;
  keyboardLayout?: KeyboardLayout;
  className?: string;
  ariaLabel?: string;
}

export interface LiteMathInputHandle {
  /** Direct access to the core engine (getLatex, getTokens, setLatex, insertLatex, input, focus …). */
  getEditor(): MathEditor | null;
}

/**
 * Controlled React wrapper. The core renders itself into light DOM;
 * React only synchronizes `value` — no re-render per keystroke.
 */
export const LiteMathInput = forwardRef<LiteMathInputHandle, LiteMathInputProps>(
  function LiteMathInput({ value, onChange, onSubmit, keyboardLayout, className, ariaLabel }, ref) {
    const editorHost = useRef<HTMLDivElement>(null);
    const kbHost = useRef<HTMLDivElement>(null);
    const editor = useRef<MathEditor | null>(null);
    const callbacks = useRef({ onChange, onSubmit });
    callbacks.current = { onChange, onSubmit };

    useImperativeHandle(ref, () => ({ getEditor: () => editor.current }), []);

    useLayoutEffect(() => {
      const ed = new MathEditor(editorHost.current!, {
        ariaLabel,
        onChange: (latex) => callbacks.current.onChange?.(latex),
        onSubmit: (latex) => callbacks.current.onSubmit?.(latex),
      });
      editor.current = ed;
      return () => {
        ed.destroy();
        editor.current = null;
      };
      // mount-only: the engine owns its DOM afterwards
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useLayoutEffect(() => {
      if (!keyboardLayout || !kbHost.current || !editor.current) return;
      const kb = new MathKeyboard(kbHost.current, editor.current, keyboardLayout);
      return () => kb.destroy();
    }, [keyboardLayout]);

    useLayoutEffect(() => {
      const ed = editor.current;
      if (ed && value !== undefined && value !== ed.getLatex()) ed.setLatex(value);
    }, [value]);

    return (
      <div className={className}>
        <div ref={editorHost} />
        {keyboardLayout ? <div ref={kbHost} /> : null}
      </div>
    );
  }
);
