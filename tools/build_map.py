#!/usr/bin/env python3
"""Wandelt europe.geojson in vorberechnete SVG-Pfade um (data/europe-map.json)."""
import json, math, sys

SRC = "europe.geojson"
OUT = sys.argv[1] if len(sys.argv) > 1 else "europe-map.json"

# Gesamtausdehnung (Grad): Island bis Tschukotka, Zypern bis Franz-Josef-Land.
# Russland liegt vollstaendig auf der Karte; die Startansicht (home) bleibt
# auf Europa fokussiert, der Rest ist per Schwenken/Zoomen erreichbar.
LON_MIN, LON_MAX = -25.0, 191.0
LAT_MIN, LAT_MAX = 34.0, 82.0
# Startansicht Europa
HOME_LON_MAX = 46.0
HOME_LAT_MIN, HOME_LAT_MAX = 34.0, 71.6
LAT0 = math.radians(52.0)          # Referenzbreite fuer Equirectangular
SCALE = 14.0
W = (LON_MAX - LON_MIN) * math.cos(LAT0) * SCALE
H = (LAT_MAX - LAT_MIN) * SCALE

def project(lon, lat):
    # Tschukotka liegt jenseits der Datumsgrenze (Laengengrad -180..-168):
    # um 360 Grad verschieben, damit Russland zusammenhaengend bleibt
    if lon < -30.0:
        lon += 360.0
    x = (lon - LON_MIN) * math.cos(LAT0) * SCALE
    y = (LAT_MAX - lat) * SCALE
    return (round(x, 1), round(y, 1))

def perp_dist(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    dx, dy = bx - ax, by - ay
    if dx == dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))

def simplify(pts, tol):
    if len(pts) < 3:
        return pts
    # iterative Douglas-Peucker
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i0, i1 = stack.pop()
        if i1 <= i0 + 1:
            continue
        dmax, imax = -1.0, -1
        for i in range(i0 + 1, i1):
            d = perp_dist(pts[i], pts[i0], pts[i1])
            if d > dmax:
                dmax, imax = d, i
        if dmax > tol:
            keep[imax] = True
            stack.append((i0, imax))
            stack.append((imax, i1))
    return [p for p, k in zip(pts, keep) if k]

def ring_area(pts):
    s = 0.0
    for i in range(len(pts) - 1):
        s += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
    return abs(s) / 2.0

def ring_to_path(ring, tol):
    pts = [project(lon, lat) for lon, lat in ring]
    pts = simplify(pts, tol)
    if len(pts) < 4:
        return None, 0.0
    a = ring_area(pts)
    d = f"M{pts[0][0]} {pts[0][1]}"
    for x, y in pts[1:-1]:
        d += f"L{x} {y}"
    return d + "Z", a

data = json.load(open(SRC))

# Der Europa-Datensatz schneidet Russland bei ~46 Grad Ost ab. Liegt eine
# russia-full.geojson (aus Natural Earth) daneben, ersetzen wir die
# Geometrie durch die vollstaendige.
try:
    ru_full = json.load(open("russia-full.geojson"))["features"][0]
    for ft in data["features"]:
        if ft["properties"]["ISO2"] == "RU":
            ft["geometry"] = ru_full["geometry"]
            print("Russland durch vollstaendige Geometrie ersetzt")
            break
except FileNotFoundError:
    print("Hinweis: russia-full.geojson fehlt, Russland bleibt beschnitten")

countries = []
for ft in data["features"]:
    props = ft["properties"]
    iso2 = props["ISO2"]
    geom = ft["geometry"]
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    rings = []
    for poly in polys:
        d, area = ring_to_path(poly[0], tol=0.6)  # nur Aussenring, Toleranz in SVG-Einheiten
        if d:
            rings.append((d, area))
    if not rings:
        # Zwergstaaten: groebste Geometrie trotzdem als Punkt-Kreis behandeln -> ueberspringen
        continue
    rings.sort(key=lambda r: -r[1])
    biggest = rings[0][1]
    # kleine Inseln weglassen, aber Hauptflaeche immer behalten;
    # Obergrenze, damit riesige Laender (Russland) ihre Exklaven und
    # grossen Inseln (Kaliningrad, Nowaja Semlja) nicht verlieren
    threshold = max(3.0, min(biggest * 0.02, 40.0))
    kept = [d for d, a in rings if a >= threshold]
    countries.append({"iso2": iso2, "name": props["NAME"], "d": "".join(kept)})

home_x, home_y = project(LON_MIN, HOME_LAT_MAX)
home_x2, home_y2 = project(HOME_LON_MAX, HOME_LAT_MIN)
out = {
    "width": round(W, 1),
    "height": round(H, 1),
    "home": {
        "x": home_x, "y": home_y,
        "w": round(home_x2 - home_x, 1), "h": round(home_y2 - home_y, 1),
    },
    "countries": countries,
}
json.dump(out, open(OUT, "w"), separators=(",", ":"))
size = len(json.dumps(out, separators=(",", ":")))
print(f"{len(countries)} Laender, {size/1024:.0f} kB, viewBox 0 0 {out['width']} {out['height']}")
