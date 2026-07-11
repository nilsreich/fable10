# DECISIONS

Eine Zeile pro Entscheidung: Problem → Entscheidung → Begründung.

- SupSub-Serialisierungsreihenfolge unklar → Serializer emittiert immer `_{sub}` vor `^{sup}`, Parser akzeptiert beide Reihenfolgen und merged in einen Node → deterministischer Output, verlustfreier Roundtrip.
- `^2` ohne Braces (Standard-LaTeX) im Scope? → Parser akzeptiert Single-Atom-Argumente (`^2`, `\frac12`, `^\pi`), Serializer emittiert immer Braces → standardkonforme Eingaben funktionieren, Output bleibt kanonisch.
- Symbol-Aliasse (`\leq`, `\geq`, `\neq`, `\to`) → Parser mappt sie auf die kanonischen Namen (`le`, `ge`, `ne`, `rightarrow`) → gängige Schreibweisen kosten 4 Zeilen und vermeiden unnötige Parse-Fehler.
- Fehlerposition-Konvention → `LatexParseError.position` ist ein 0-basierter Index in den Quellstring → einfachste eindeutige Konvention, direkt für Editor-Markierung nutzbar.
- Token-Werte für Strukturtoken → `''` für frac/sup/sub/sqrt-Token, Delimiter-Zeichen für paren-open/close, Symbolname für symbol → Backend braucht bei Klammern die Art, bei reinen Struktur-Markern nicht.
- Ziffern-Gruppierung in Tokens → aufeinanderfolgende Ziffern und `.` verschmelzen zu einem `num`-Token (`3.14`) → für Backend-Validierung nützlicher als Einzelziffern; Komma bleibt `op` (Operator-Zeichensatz laut Spec).
- Kanonischer Klammer-Output → Serializer emittiert `(...)`, `[...]`, `\{...\}`, `|...|` (nie `\left...\right`) → Spec verlangt einfache Klammern im Output; `\{` ist nötig, da `{}` in LaTeX Gruppierung bedeutet.
- Verstecktes Input-Element für mobile Tastatur ("falls nötig") → nicht implementiert → Desktop nutzt Container-Keydown, Mobile die virtuelle Tastatur; ein Hidden-Input brächte Fokus-Komplexität ohne abgedeckten Use-Case.
- Backspace direkt hinter einer Struktur → Cursor springt ans Ende des letzten Feldes statt zu löschen (MathQuill-Verhalten) → verhindert versehentlichen Verlust ganzer Teilbäume; Auflösen passiert erst am Feldanfang.
- `)` außerhalb jeder Klammer → No-op (kein Char, kein Fehler) → Klammern sind Paren-Nodes, ein einzelnes Schließzeichen hat keine sinnvolle Baum-Repräsentation.
- Schließzeichen `)]}` → verlassen die nächstgelegene umschließende Klammer unabhängig von deren Art → einfachste Regel, deckt didaktische Fälle ab; `|` schließt nur `|…|`, sonst öffnet es neu.
- `*`-Taste → wird als `\cdot` eingefügt → didaktisch korrekte Multiplikationsnotation ohne eigene Taste.
- `/`-Operand bei Symbolen → nur Wert-Symbole (`pi`, `infty`) wandern in den Zähler, Operator-Symbole nicht → `2\cdot/` soll keinen Operator in den Zähler ziehen.
- ↑/↓ klettern durch verschachtelte Strukturen bis zum nächsten Bruch/SupSub → Cursor-Index wird auf Ziellänge geklemmt → intuitives Verhalten auch aus tiefen Positionen, minimaler Code.
- setLatex feuert kein onChange → programmatische Wertsetzung ist keine Nutzereingabe → verhindert Endlosschleifen in kontrollierten Wrappern.
- Vollständiges Re-Rendering pro Mutation statt inkrementellem DOM-Diffing → Formeln sind klein (Schulmathematik), Re-Render ist O(Baumgröße) und hält den Code drastisch kleiner.
- Maus-Klick-Positionierung des Cursors → nicht implementiert (Fokus per Klick, Navigation per Pfeiltasten/virtueller Tastatur) → nicht in der Spec gefordert, spart deutlich Bundle-Größe.
- Key.command-Semantik → Commands sind Editor-Keys (gleiches Pipeline wie physisches Tippen) plus Aliasse left/right/up/down/backspace/enter → eine einzige Eingabe-Pipeline statt zwei Codepfaden.
- Bruch-Taste (÷, a∕b) → nutzt den `/`-Smart-Trigger statt leeres `\frac{}{}` einzufügen → konsistentes Verhalten zwischen physischer und virtueller Tastatur.
- `ln`- und `e`-Tasten im Analysis-Preset → fügen einfache Buchstaben-Chars ein (`\ln`/`\mathrm{e}` sind außerhalb des LaTeX-Scopes) → Spec: Presets nur soweit der Scope reicht.
- Tastatur-Aktivierung → `pointerdown` mit `preventDefault` (Latenz, Fokuserhalt) + `click` mit `detail===0` als Fallback → Screenreader/Tastatur-Nutzer aktivieren Buttons per Enter/Space, das kommt als detail-0-Click an.
- Tab-Leiste nur bei >1 Tab, `hidden`-Attribut für inaktive Panels → weniger DOM/ARIA-Rauschen bei Single-Tab-Layouts.
- span-Tasten via `data-span`-Attribut + CSS `flex-grow` statt Inline-Styles → bleibt komplett von außen stylebar.
