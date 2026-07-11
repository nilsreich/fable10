# LiteMathInput

Framework-agnostische mathematische WYSIWYG-Eingabekomponente in purem TypeScript —
**zero runtime dependencies**, Light DOM, didaktische virtuelle Tastatur (Khan-Academy-Stil)
und dünne Wrapper für React und Svelte 5.

- **Core-Bundle ≤ 25 KB** minified+gzip (aktuell ~5,2 KB) — per `bun run size` als Build-Fail-Kriterium geprüft
- Kein `contenteditable`, kein Shadow DOM, kein Canvas, keine Font-Dependency
- Rendering via CSS Flexbox, Schrift: `"STIX Two Math", "Cambria Math", Georgia, serif`

```
packages/core/      @litemath/core    — Engine, Editor, Tastatur
packages/react/     @litemath/react   — kontrollierte React-Komponente
packages/svelte/    @litemath/svelte  — Svelte-5-Komponente (Runes)
demo/               HTML+JS-Playground (bun run demo)
```

## Schnellstart (Core)

```ts
import { MathEditor, MathKeyboard, PRESET_ALGEBRA } from '@litemath/core';
import '@litemath/core/theme.css';

const editor = new MathEditor(document.querySelector('#editor'), {
  ariaLabel: 'Mathematische Eingabe',
  onChange: (latex) => console.log(latex),
  onSubmit: (latex) => send(latex),
});

new MathKeyboard(document.querySelector('#keyboard'), editor, PRESET_ALGEBRA);

editor.setLatex('\\frac{x^{2}+1}{2}');
editor.getLatex();   // '\frac{x^{2}+1}{2}'
editor.getTokens();  // flaches Token-Array für Backend-Validierung
```

Entwickeln: `bun install`, dann `bun run verify` (Typecheck + Tests + Size-Budget)
und `bun run demo` (baut nach `dist/` und serviert auf http://localhost:8080).

## Demo auf Vercel deployen

Das Repo ist deploy-fertig: `vercel.json` baut das Demo (`bun run demo:build`)
als self-contained statische App nach `dist/` und liefert sie aus.

1. Repo bei [Vercel](https://vercel.com/new) importieren (Framework-Preset: „Other")
2. Nichts weiter konfigurieren — Install-/Build-Command und Output-Directory
   kommen aus `vercel.json`

Alternativ per CLI: `vercel deploy` im Repo-Root.

## API-Referenz

### `new MathEditor(container, options?)`

Macht `container` zum fokussierbaren Editor (`tabindex="0"`, `role="textbox"`,
eigene Keydown-Behandlung, blinkender Cursor, Live-Region für Screenreader).

| Option | Typ | Beschreibung |
| --- | --- | --- |
| `onChange` | `(latex: string) => void` | Nach jeder Nutzer-Mutation |
| `onSubmit` | `(latex: string) => void` | Bei Enter bzw. ↵-Taste |
| `ariaLabel` | `string` | Label des Editors (Default: „Mathematische Eingabe") |

| Methode | Beschreibung |
| --- | --- |
| `getLatex(): string` | Standardkonformes LaTeX, synchron |
| `getTokens(): Token[]` | Flache Linearisierung des Baums in Leserichtung |
| `setLatex(latex): void` | Ersetzt den Inhalt; wirft `LatexParseError`; feuert **kein** `onChange` |
| `insertLatex(fragment): void` | Fügt an der Cursorposition ein; Cursor springt ins erste leere Feld |
| `input(key): boolean` | Verarbeitet eine Taste wie physisches Tippen (`'3'`, `'/'`, `'ArrowLeft'`, `'Backspace'`, `'Enter'` …) |
| `getRoot(): Row` / `getCursor()` | Lesezugriff auf Baum und Cursor |
| `focus()` / `destroy()` | Fokus setzen / Listener + DOM aufräumen |

### Editor-Verhalten

- `/` zieht den Operanden links vom Cursor (Ziffernfolge, eine Variable, geschlossene
  Klammergruppe — inkl. anhängendem Exponenten) in den Zähler (MathQuill-Verhalten)
- `^` / `_` erzeugen Hoch-/Tiefstellung; ein vorhandenes SupSub am selben Base wird ergänzt
- `(` `[` `{` `|` öffnen Klammern (Cursor innen), `)` `]` `}` verlassen die aktuelle Klammer
- `*` fügt `\cdot` ein
- `Backspace` am Feldanfang löst die Struktur auf (Inhalt wird in die Eltern-Row gehoben)
- `←`/`→` durchqueren Strukturen linear, `↑`/`↓` wechseln Zähler↔Nenner bzw. Sup↔Sub

### LaTeX-Scope (abschließend)

Ziffern, `a–z A–Z`, `+ - = < > , .`, `\frac{}{}`, `^{}`, `_{}`, `\sqrt{}`,
`\left(...\right)` und einfache Klammern `() [] \{\} ||`, `\cdot`, `\pi`, `\le`, `\ge`,
`\ne`, `\pm`, `\infty`, `\rightarrow` (Aliasse: `\leq`, `\geq`, `\neq`, `\to`).
Alles andere: `LatexParseError` mit 0-basierter `position`.

### Tokens

```ts
type Token = { type: TokenType; value: string };
// 'num' | 'var' | 'op' | 'frac-open' | 'frac-mid' | 'frac-close'
// | 'sup-open' | 'sup-close' | 'sub-open' | 'sub-close'
// | 'sqrt-open' | 'sqrt-close' | 'paren-open' | 'paren-close' | 'symbol'
```

Aufeinanderfolgende Ziffern/`.` verschmelzen zu einem `num`-Token (`'3.14'`).
`paren-*` trägt das Delimiter-Zeichen, `symbol` den Symbolnamen (`'pi'`), übrige
Strukturtoken `''`.

### `new MathKeyboard(container, editor, layout)`

Deklaratives Layout-Schema:

```ts
type KeyboardLayout = { tabs: { id: string; label: string; rows: Key[][] }[] };
type Key = {
  label: string;      // Aufschrift
  latex?: string;     // LaTeX-Fragment einfügen (Cursor → erstes leeres Feld)
  command?: string;   // Editor-Taste ('7', '/', '^') oder left|right|up|down|backspace|enter
  aria: string;       // sprechendes aria-label (Pflicht)
  span?: number;      // Breite relativ zu einer Normaltaste
};
```

Methoden: `setTab(id)`, `getActiveTab()`, `destroy()`.
Aktivierung per `pointerdown` (mit `preventDefault`, Editor behält den Fokus);
Touch-Targets ≥ 44×44 px im Default-CSS; ARIA: `role="toolbar"`, `tablist`/`tab`
mit `aria-selected`, Panels als benannte `group`s, jede Taste mit `aria-label`.

### Presets

| Preset | Tabs | Inhalt |
| --- | --- | --- |
| `PRESET_BASIC` | `123` | Ziffern, `+ − · ÷(Bruch) = , .`, Klammern, Navigation |
| `PRESET_ALGEBRA` | `123`, `abc` | zusätzlich Variablen, `x²`/`xₙ`, `√`, `< > ≤ ≥ ≠ ±` |
| `PRESET_ANALYSIS` | `123`, `f(x)` | zusätzlich `x e π ∞`, Potenz, `√`, Bruch, `ln`, `→` |

Alle Presets enthalten dedizierte Pfeiltasten, `⌫` und `↵` (feuert `onSubmit`).

## Wrapper

### React (`@litemath/react`)

```tsx
import { LiteMathInput, type LiteMathInputHandle } from '@litemath/react';
import { PRESET_ALGEBRA } from '@litemath/core';

const ref = useRef<LiteMathInputHandle>(null);
<LiteMathInput
  value={latex}
  onChange={setLatex}
  onSubmit={submit}
  keyboardLayout={PRESET_ALGEBRA}
  className="my-math"
  ref={ref}
/>;
ref.current?.getEditor()?.getTokens();
```

Kontrolliert über `value`; der Core rendert selbst — React re-rendert **nicht** pro
Tastendruck, es wird nur `value` synchronisiert.

### Svelte 5 (`@litemath/svelte`)

```svelte
<script>
  import { LiteMathInput } from '@litemath/svelte';
  import { PRESET_BASIC } from '@litemath/core';
  let latex = $state('');
</script>

<LiteMathInput bind:value={latex} onsubmit={submit} keyboardLayout={PRESET_BASIC} />
```

Runes-basiert (`$props`/`$bindable`/`$effect`), Events `onchange`/`onsubmit`.

## Styling: CSS-Klassen (Light DOM, komplett überschreibbar)

`theme.css` ist ein ungestyltes Grundgerüst; jedes Element trägt stabile
`lmi-*`-Klassen. Beispiel-Override: `demo/dark.css` (Dark/OLED).

| Klasse | Element |
| --- | --- |
| `lmi-editor` | Editor-Container (`role="textbox"`, `tabindex="0"`) |
| `lmi-root` | Wurzel-Row im Editor |
| `lmi-row` / `lmi-row-empty` | Sequenz von Nodes / Zusatzklasse wenn leer |
| `lmi-char`, `lmi-num`, `lmi-var`, `lmi-op` | Zeichen: Basis, Ziffer/Punkt, Variable (kursiv), Operator |
| `lmi-symbol`, `lmi-sym-<name>` | Symbol, z. B. `lmi-sym-pi` |
| `lmi-frac`, `lmi-frac-num`, `lmi-frac-den` | Bruch, Zähler, Nenner (Bruchstrich = `border-top`) |
| `lmi-supsub`, `lmi-supsub-both`, `lmi-sup`, `lmi-sub` | Hoch-/Tiefstellung |
| `lmi-sqrt`, `lmi-sqrt-sym`, `lmi-sqrt-body` | Wurzel, √-Zeichen, Radikand |
| `lmi-paren`, `lmi-paren-delim` | Klammergruppe, Delimiter |
| `lmi-cursor` | Blinkender Cursor |
| `lmi-placeholder` | Platzhalter-Box für leere Felder |
| `lmi-live` | Visually-hidden Live-Region (`aria-live="polite"`) |
| `lmi-keyboard` | Tastatur-Container (`role="toolbar"`) |
| `lmi-kb-tabs`, `lmi-kb-tab` | Tab-Leiste (`tablist`), Tab-Button |
| `lmi-kb-panel`, `lmi-kb-panel-active` | Tab-Panel (inaktive: `hidden`) |
| `lmi-kb-row`, `lmi-kb-key` | Tastenreihe, Taste (`data-span` für Breite) |

## Nicht-Ziele

Keine Selektion/Teil-Copy-Paste (nur `setLatex()`), kein MathML, kein Undo/Redo,
keine Matrix-/Integral-/Summen-/Limes-Notation, kein IME-Handling, keine
Publishing-Pipeline. Getroffene Design-Entscheidungen: siehe [DECISIONS.md](./DECISIONS.md).
