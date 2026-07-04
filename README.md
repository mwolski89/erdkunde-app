# 🌍 Erdkunde-Abenteuer

Ein webbasiertes Lernspiel für Kinder (6–13 Jahre): Länder auf der Karte finden,
Punkte und Kombi-Boni sammeln, dabei spannende Fakten lernen.

## Spielregeln (aktueller Stand)

- Eine Session hat **15 Fragen** („Wo ist die Schweiz?" mit Flagge).
- Richtige Antwort: **100 Punkte + Kombi-Bonus** (50 Punkte × Serienlänge),
  dazu ein kindgerechter Fakt über das Land.
- Falsche Antwort: Kombi-Bonus fällt auf 0, ein Herz geht verloren,
  das richtige Land wird auf der Karte aufgedeckt.
- **3 Fehler = Session vorbei** – die Punkte zählen trotzdem für den Rekord.
- Rekord wird pro Level im Browser gespeichert (ohne Login, `localStorage`).

## Starten

Es gibt keinen Build-Schritt – nur statische Dateien. Lokal genügt:

```bash
python3 -m http.server 4173
# dann http://localhost:4173 öffnen
```

**Hosting:** Das Spiel ist eine rein statische Website und läuft auf jedem
statischen Host (GitHub Pages, Netlify, Cloudflare Pages, eigener Webserver).
Einfach den Ordnerinhalt hochladen – fertig.

## Architektur

```
index.html            Bildschirme: Start / Spiel / Ergebnis
css/style.css         kindgerechtes, responsives Design (Handy + Tablet)
js/
  main.js             Einstieg: Bildschirmwechsel, Level laden, Ergebnis anzeigen
  core/
    session.js        Spielregeln: 15 Fragen, 3 Leben, Punkte + Kombo (modus-unabhängig!)
    storage.js        Rekorde in localStorage
    audio.js          synthetische Sounds (WebAudio, keine Dateien)
  map/
    europe-map.js     wiederverwendbare SVG-Karte: Antippen, Pinch-Zoom, Verschieben
  modes/
    registry.js       Liste aller Spielmodi + Level
    locate-country.js Modus „Land auf der Karte finden"
data/
  europe-map.json     vorberechnete SVG-Pfade der Ländergrenzen (~61 kB)
  countries-de.json   Inhaltspaket: deutsche Namen, Fakten, Fragen-Pools
```

### Die drei Erweiterungspunkte

1. **Neuer Spielmodus** (z. B. Hauptstädte, Flaggen-Quiz, Multiple Choice):
   neue Datei in `js/modes/` mit der Schnittstelle
   `createGame(ctx) -> { start(), stop() }`, dann in `registry.js` eintragen.
   Die `GameSession` (Punkte, Leben, Kombo) wird wiederverwendet – ein Modus
   bestimmt nur, *wie* gefragt und geantwortet wird.
2. **Neues Level / neue Region** (z. B. „Welt – schwer"): neuer Eintrag in
   `LEVELS` (registry.js) mit eigener Karten-JSON und eigenem Fragen-Pool.
   Neue Karten werden mit `tools/build_map.py` aus GeoJSON generiert.
3. **Neue Inhalte** (mehr Länder, mehr Fakten, andere Sprachen): nur
   `data/countries-de.json` erweitern bzw. ein `countries-en.json` daneben
   legen – kein Code nötig.

### Bewusste Entscheidungen

- **Kein Framework, kein Build-Schritt**: reine ES-Module, läuft direkt in
  Safari, Chrome und Firefox. Später kann man jederzeit auf Vite o. Ä.
  umsteigen, die Modulstruktur bleibt gleich.
- **Kein Backend, kein Login**: Spielstart in 2 Tipps. Rekorde liegen im
  Browser. Wenn später eine geteilte Bestenliste gewünscht ist, kommt eine
  kleine API dazu – `storage.js` ist die einzige Stelle, die man anfassen muss.
- **Karte als vorberechnete SVG-Pfade** statt Karten-Bibliothek: winzig,
  schnell, offline-fähig, und die Ländergrenzen sind klar hervorgehoben.
  Für den späteren „Erdkugel"-Modus (ganze Welt) kann ein eigenes
  Kartenmodul (z. B. mit d3-geo Orthographic-Projektion) neben
  `europe-map.js` entstehen – die Modi sprechen nur über `onTap(iso2)`
  und `mark(iso2, klasse)` mit der Karte.

## Karten-Daten neu generieren

```bash
cd tools
curl -sLO https://raw.githubusercontent.com/leakyMirror/map-of-europe/master/GeoJSON/europe.geojson
# Der Europa-Datensatz schneidet Russland bei ~46° Ost ab – vollständige
# Geometrie aus Natural Earth holen (wird automatisch eingesetzt):
curl -sL https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson \
  | python3 -c "import json,sys; d=json.load(sys.stdin); ru=[f for f in d['features'] if f['properties']['ADMIN']=='Russia']; json.dump({'type':'FeatureCollection','features':ru}, open('russia-full.geojson','w'))"
python3 build_map.py ../data/europe-map.json
```

Die Karte enthält ganz Russland (bis zur Datumsgrenze); die Startansicht
(`home` in der JSON) bleibt auf Europa fokussiert, der Osten ist per
Schwenken/Herauszoomen erreichbar.

## Roadmap-Ideen

- 🏛️ Hauptstädte-Modus (gleiche Karte, andere Frage)
- 🚩 Flaggen-Quiz ohne Karte (Multiple Choice)
- 🌍 Ganze Welt als drehbare Erdkugel (höherer Schwierigkeitsgrad)
- 🏅 Sammelalbum: gefundene Länder als Sticker

Bereits umgesetzt: 🔊 Vorlesefunktion für Leseanfänger (Web Speech API,
`js/core/speech.js`) – liest Fragen und Fakten automatisch vor (abschaltbar
im Startbildschirm), 🔊-Buttons zum Wiederholen.
