// Reines HTML+JS-Playground. `bun run demo:build` erzeugt ./lmi.js aus dem Core.
import {
  MathEditor,
  MathKeyboard,
  PRESET_ALGEBRA,
  PRESET_ANALYSIS,
  PRESET_BASIC,
} from './lmi.js';

const latexOut = document.getElementById('latex');
const tokensOut = document.getElementById('tokens');
const submitOut = document.getElementById('submit');

const editor = new MathEditor(document.getElementById('editor'), {
  ariaLabel: 'Mathematische Eingabe',
  onChange: (latex) => update(latex),
  onSubmit: (latex) => (submitOut.textContent = latex || '(leer)'),
});

function update(latex) {
  latexOut.textContent = latex || '(leer)';
  tokensOut.textContent = editor
    .getTokens()
    .map((t) => `${t.type}${t.value ? `(${t.value})` : ''}`)
    .join(' ');
}

const PRESETS = { basic: PRESET_BASIC, algebra: PRESET_ALGEBRA, analysis: PRESET_ANALYSIS };
const keyboardEl = document.getElementById('keyboard');
const presetSelect = document.getElementById('preset');
let keyboard = new MathKeyboard(keyboardEl, editor, PRESETS[presetSelect.value]);

presetSelect.addEventListener('change', () => {
  keyboard.destroy();
  keyboard = new MathKeyboard(keyboardEl, editor, PRESETS[presetSelect.value]);
  editor.focus();
});

document.getElementById('dark').addEventListener('change', (e) => {
  document.body.classList.toggle('dark', e.target.checked);
});

editor.setLatex('\\frac{x^{2}+1}{2}');
update(editor.getLatex());
editor.focus();
