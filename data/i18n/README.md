# Übersetzungen pflegen

Jede Sprache ist ein Ordner mit genau zwei Dateien. Zum Bearbeiten reicht
ein Texteditor – am Code muss nichts geändert werden.

```
i18n/
  de/   ← Referenz: immer vollständig, Vorlage für alles
    ui.json         Oberflächentexte und Satzschablonen
    countries.json  Ländernamen, Zusatzformen, Fakten
  en/  pl/  it/  ru/  nl/  ...
```

## Regeln

1. **Nur Werte übersetzen, niemals Schlüssel ändern.**
   Aus `"correct": "Richtig!"` wird z. B. `"correct": "Dobrze!"` –
   `correct` bleibt.
2. **Platzhalter übernehmen.** `{country}`, `{points}`, `{n}`, `{hint}`
   müssen in der Übersetzung vorkommen (Position darf sich ändern).
   - `{country}` wird durch den Ländernamen ersetzt
   - `{country.gen}` nutzt die Zusatzform `gen` des Landes (siehe unten)
   - `{country|cap}` schreibt den ersten Buchstaben groß (Satzanfang)
3. **Zusatzformen**: Braucht deine Sprache gebeugte Ländernamen
   (Genitiv, Artikel-Verschmelzung …), erfinde eine Form, z. B. `gen`,
   trage sie bei den Ländern ein und nutze sie in den Schablonen.
   Formen, die **jedes** Pool-Land haben muss, gehören in
   `meta.requiredForms` – dann prüft das Skript die Vollständigkeit.
   Formen mit gewolltem Rückfall auf den Grundnamen (wie deutsches
   `von`) bleiben dort draußen.
4. **Pluralländer** („die Niederlande“, „Włochy“) bekommen
   `"plural": true`. Wenn deine Sprache dafür andere Sätze braucht,
   lege Schablonen-Varianten mit Endung `Plural` an
   (z. B. `whereIsPlural`). Sie sind optional.
5. **Fakten dürfen frei angepasst werden** – lieber ein guter Vergleich
   in deiner Sprache als eine wörtliche Übersetzung. Fehlt ein Fakt,
   zeigt das Spiel einfach keinen (niemals einen fremdsprachigen).
6. `meta.label` ist der Name der Sprache in ihr selbst („Polski“),
   `meta.speechLang` die Vorlesestimme (z. B. `pl-PL`).

## Neue Sprache anlegen

1. Ordner `de/` kopieren und nach dem Sprachcode benennen (z. B. `fr/`).
2. Beide Dateien übersetzen (Regeln oben).
3. Sprache in `js/core/i18n.js` in die Liste `LANGUAGES` eintragen
   (einzige Code-Zeile, Format: `{ code: 'fr', label: 'Français' }`).
4. Prüfen: `python3 tools/check_i18n.py` – muss „Alles in Ordnung“ melden.
