<script lang="ts">
  import { MathEditor, MathKeyboard, type KeyboardLayout } from '@litemath/core';

  interface Props {
    /** Bindbarer LaTeX-Wert. */
    value?: string;
    onchange?: (latex: string) => void;
    onsubmit?: (latex: string) => void;
    keyboardLayout?: KeyboardLayout;
    class?: string;
    ariaLabel?: string;
  }

  let {
    value = $bindable(''),
    onchange,
    onsubmit,
    keyboardLayout,
    class: className = '',
    ariaLabel,
  }: Props = $props();

  let editorHost: HTMLDivElement;
  let kbHost = $state<HTMLDivElement>();
  let editor: MathEditor | undefined;

  $effect(() => {
    editor = new MathEditor(editorHost, {
      ariaLabel,
      onChange: (latex) => {
        value = latex;
        onchange?.(latex);
      },
      onSubmit: (latex) => onsubmit?.(latex),
    });
    return () => editor?.destroy();
  });

  // value-Synchronisation (setLatex feuert kein onChange → keine Schleife)
  $effect(() => {
    if (editor && value !== editor.getLatex()) editor.setLatex(value);
  });

  $effect(() => {
    if (!editor || !keyboardLayout || !kbHost) return;
    const kb = new MathKeyboard(kbHost, editor, keyboardLayout);
    return () => kb.destroy();
  });
</script>

<div class={className}>
  <div bind:this={editorHost}></div>
  {#if keyboardLayout}
    <div bind:this={kbHost}></div>
  {/if}
</div>
