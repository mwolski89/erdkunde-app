# Konzept: Mehrsprachigkeit (i18n)

Stand: Juli 2026. Beschlossene Sprachen: Deutsch (Referenz), Englisch,
Polnisch, Italienisch, Russisch, Niederländisch – weitere folgen.

## Entscheidungen

- **Deutsch ist Referenzsprache**: `data/i18n/de/` ist immer vollständig,
  alle anderen Sprachen werden dagegen geprüft.
- **Rekorde sind sprachunabhängig** (ein Highscore pro Level).
- Rechts-nach-links-Sprachen (Arabisch/Hebräisch) sind vorerst nicht geplant.
- Fallback-Kette pro Text: gewählte Sprache → Deutsch. Fehlt ein Länder-Fakt
  in einer Sprache, wird KEIN deutscher Fakt gezeigt, sondern nur der
  Jubel-Satz (keine gemischtsprachigen Sätze).

## Grundprinzip: Sprache = Datenpaket, kein Code

```
data/
  europe-map.json          sprachneutral (Geometrie)
  pools.json               sprachneutral (welche Länder abgefragt werden)
  i18n/
    README.md              Anleitung für Übersetzer:innen
    de/ ui.json countries.json    ← Referenz
    en/ pl/ it/ ru/ nl/ ...       ← je zwei Dateien, sonst nichts
```

- `ui.json`: alle Oberflächentexte und Satzschablonen + Metadaten
  (`meta.label` = Eigenname der Sprache, `meta.speechLang` = Vorlesestimme).
- `countries.json`: Ländernamen, grammatische Zusatzformen, Fakten.

## Satzschablonen & Grammatik

Schablonen stehen in `ui.json` und verwenden Platzhalter:

- `{points}`, `{n}`, `{hint}` – einfache Werte
- `{country}` – Ländername (der Parameter ist ein ISO-Code, wird aufgelöst)
- `{country.von}` – benannte **Zusatzform** des Landes (hier: deutscher
  „von“-Fall). Fehlt die Form, wird der Grundname eingesetzt.
- `{country|cap}` – Modifikator: erster Buchstabe groß (Satzanfang)

Welche Zusatzformen es gibt, entscheidet **jede Sprache selbst**:
Deutsch nutzt `von` („von der Schweiz“), Russisch `gen` (Genitiv:
„флаг Швейцарии“), Polnisch `gen`, Italienisch `di` („della Svizzera“),
Englisch und Niederländisch brauchen keine. Der Code kennt keine Grammatik –
er setzt nur Textbausteine ein, die ein Mensch geschrieben hat.

Pluralländer („die Niederlande“, „Włochy“, „Нидерланды“) tragen
`"plural": true`; für betroffene Fragen gibt es Schablonen-Varianten
(`whereIs` / `whereIsPlural`).

## Sprachwahl

- Umschalter im Startbildschirm mit Eigennamen (Deutsch · English · Polski ·
  Italiano · Русский · Nederlands), bewusst keine Flaggen für Sprachen.
- Erstbesuch: `navigator.language`, sonst Englisch; Wahl wird in
  `localStorage` gemerkt; `?lang=pl` in der URL übersteuert (Link teilbar).
- Vorlesen nutzt `meta.speechLang`; die Stimme wird pro Sprache gewählt.

## Qualitätssicherung

`tools/check_i18n.py` prüft jede Sprache gegen die Referenz:

- fehlende / überzählige Schlüssel in `ui.json`
- Platzhalter stimmen pro Schlüssel überein (Formen dürfen abweichen)
- alle Länder vorhanden, jedes hat `name`
- Zusatzformen, die die Schablonen der Sprache verlangen, existieren für
  alle Pool-Länder (sonst Fehler)
- Fakten-Abdeckung (Bericht)

Neue Sprache anlegen = `de/`-Ordner kopieren, Werte übersetzen, Schlüssel
unverändert lassen, Prüfskript laufen lassen. Kein Code nötig.
