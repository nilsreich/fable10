# DECISIONS

Eine Zeile pro Entscheidung: Problem → Entscheidung → Begründung.

- SupSub-Serialisierungsreihenfolge unklar → Serializer emittiert immer `_{sub}` vor `^{sup}`, Parser akzeptiert beide Reihenfolgen und merged in einen Node → deterministischer Output, verlustfreier Roundtrip.
- `^2` ohne Braces (Standard-LaTeX) im Scope? → Parser akzeptiert Single-Atom-Argumente (`^2`, `\frac12`, `^\pi`), Serializer emittiert immer Braces → standardkonforme Eingaben funktionieren, Output bleibt kanonisch.
- Symbol-Aliasse (`\leq`, `\geq`, `\neq`, `\to`) → Parser mappt sie auf die kanonischen Namen (`le`, `ge`, `ne`, `rightarrow`) → gängige Schreibweisen kosten 4 Zeilen und vermeiden unnötige Parse-Fehler.
- Fehlerposition-Konvention → `LatexParseError.position` ist ein 0-basierter Index in den Quellstring → einfachste eindeutige Konvention, direkt für Editor-Markierung nutzbar.
- Token-Werte für Strukturtoken → `''` für frac/sup/sub/sqrt-Token, Delimiter-Zeichen für paren-open/close, Symbolname für symbol → Backend braucht bei Klammern die Art, bei reinen Struktur-Markern nicht.
- Ziffern-Gruppierung in Tokens → aufeinanderfolgende Ziffern und `.` verschmelzen zu einem `num`-Token (`3.14`) → für Backend-Validierung nützlicher als Einzelziffern; Komma bleibt `op` (Operator-Zeichensatz laut Spec).
- Kanonischer Klammer-Output → Serializer emittiert `(...)`, `[...]`, `\{...\}`, `|...|` (nie `\left...\right`) → Spec verlangt einfache Klammern im Output; `\{` ist nötig, da `{}` in LaTeX Gruppierung bedeutet.
