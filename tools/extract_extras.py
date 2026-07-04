#!/usr/bin/env python3
"""Erzeugt world-extras.geojson aus dem Natural-Earth-Weltdatensatz.

Eingabe:  ne_50m_admin_0_countries.geojson (siehe README)
Ausgabe:  world-extras.geojson mit zwei Rollen:
  - override:   vollstaendige Russland-Geometrie (der Europa-Datensatz
                schneidet Russland bei ~46 Grad Ost ab)
  - background: Nachbarlaender, die build_map.py als nicht antippbare
                Orientierungsflaechen einbaut
"""
import json

SRC = "ne_50m_admin_0_countries.geojson"
OUT = "world-extras.geojson"

BACKGROUND = {
    "Morocco": "MA", "Algeria": "DZ", "Tunisia": "TN", "Libya": "LY",
    "Egypt": "EG", "Syria": "SY", "Lebanon": "LB", "Jordan": "JO",
    "Iraq": "IQ", "Iran": "IR", "Saudi Arabia": "SA", "Kuwait": "KW",
    "Kazakhstan": "KZ", "Turkmenistan": "TM", "Uzbekistan": "UZ",
    "Afghanistan": "AF", "Pakistan": "PK", "Greenland": "GL",
}

features = []
for f in json.load(open(SRC))["features"]:
    admin = f["properties"]["ADMIN"]
    geom = f["geometry"]
    if admin == "Russia":
        features.append({"type": "Feature",
                         "properties": {"ADMIN": admin, "ROLE": "override", "ISO2": "RU"},
                         "geometry": geom})
    elif admin == "Norway":
        # Spitzbergen & Baereninsel (noerdlich von 72N) als Hintergrund abtrennen;
        # das norwegische Festland kommt weiter aus dem Europa-Datensatz
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        svalbard = [p for p in polys if min(pt[1] for pt in p[0]) >= 72]
        if svalbard:
            features.append({"type": "Feature",
                             "properties": {"ADMIN": "Svalbard", "ROLE": "background", "ISO2": "SJ"},
                             "geometry": {"type": "MultiPolygon", "coordinates": svalbard}})
    elif admin in BACKGROUND:
        features.append({"type": "Feature",
                         "properties": {"ADMIN": admin, "ROLE": "background", "ISO2": BACKGROUND[admin]},
                         "geometry": geom})

json.dump({"type": "FeatureCollection", "features": features}, open(OUT, "w"))
print(f"{len(features)} Features -> {OUT}:", ", ".join(sorted(f["properties"]["ADMIN"] for f in features)))
