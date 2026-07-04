#!/usr/bin/env python3
"""Wandelt europe.geojson in vorberechnete SVG-Pfade um (data/europe-map.json)."""
import json, math, sys

SRC = "europe.geojson"
OUT = sys.argv[1] if len(sys.argv) > 1 else "europe-map.json"

# Gesamtausdehnung (Grad): Island bis Ural, Nordafrika bis Franz-Josef-Land.
# Russland ist nur mit seinem europaeischen Teil auf der Karte; geschnitten
# wird knapp AUSSERHALB des sichtbaren Bereichs (CLIP_MARGIN), damit am
# Kartenrand nie eine kuenstliche Schnittkante sichtbar ist.
# Nachbarregionen (Nordafrika, Naher Osten, Groenland, Spitzbergen) liegen
# als nicht antippbare Hintergrundlaender zur Orientierung auf der Karte.
LON_MIN, LON_MAX = -25.0, 66.0
LAT_MIN, LAT_MAX = 28.0, 82.0
CLIP_MARGIN = 20.0  # SVG-Einheiten jenseits des Kartenrands
# Startansicht Europa
HOME_LON_MAX = 46.0
HOME_LAT_MIN, HOME_LAT_MAX = 34.0, 71.6
LAT0 = math.radians(52.0)          # Referenzbreite fuer Equirectangular
SCALE = 14.0
W = (LON_MAX - LON_MIN) * math.cos(LAT0) * SCALE
H = (LAT_MAX - LAT_MIN) * SCALE

def project(lon, lat):
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
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0

# Sutherland-Hodgman: Polygon an einer Halbebene beschneiden
def clip_halfplane(pts, inside, intersect):
    out = []
    for i in range(len(pts)):
        prev, cur = pts[i - 1], pts[i]
        if inside(cur):
            if not inside(prev):
                out.append(intersect(prev, cur))
            out.append(cur)
        elif inside(prev):
            out.append(intersect(prev, cur))
    return out

def clip_to_map(pts):
    x_max = W + CLIP_MARGIN
    y_max = H + CLIP_MARGIN
    edges = [
        (lambda p: p[0] <= x_max, lambda a, b: _cut_x(a, b, x_max)),
        (lambda p: p[0] >= -CLIP_MARGIN, lambda a, b: _cut_x(a, b, -CLIP_MARGIN)),
        (lambda p: p[1] <= y_max, lambda a, b: _cut_y(a, b, y_max)),
        (lambda p: p[1] >= -CLIP_MARGIN, lambda a, b: _cut_y(a, b, -CLIP_MARGIN)),
    ]
    for inside, intersect in edges:
        pts = clip_halfplane(pts, inside, intersect)
        if len(pts) < 3:
            return []
    return pts

def _cut_x(a, b, x):
    t = (x - a[0]) / (b[0] - a[0])
    return (round(x, 1), round(a[1] + t * (b[1] - a[1]), 1))

def _cut_y(a, b, y):
    t = (y - a[1]) / (b[1] - a[1])
    return (round(a[0] + t * (b[0] - a[0]), 1), round(y, 1))

def ring_to_path(ring, tol):
    pts = [project(lon, lat) for lon, lat in ring]
    if pts[0] == pts[-1]:
        pts = pts[:-1]  # GeoJSON-Ringe sind geschlossen, wir arbeiten offen
    pts = clip_to_map(pts)
    pts = simplify(pts, tol)
    if len(pts) < 3:
        return None, 0.0
    a = ring_area(pts)
    d = f"M{pts[0][0]} {pts[0][1]}"
    for x, y in pts[1:]:
        d += f"L{x} {y}"
    return d + "Z", a

data = json.load(open(SRC))

# world-extras.geojson (aus Natural Earth, siehe README):
#  - ROLE=override:   ersetzt beschnittene Geometrie im Europa-Datensatz
#                     (Russland endet dort bei ~46 Grad Ost)
#  - ROLE=background: Nachbarlaender, nur zur Orientierung (nicht antippbar)
background_feats = []
try:
    for extra in json.load(open("world-extras.geojson"))["features"]:
        role = extra["properties"]["ROLE"]
        if role == "override":
            for ft in data["features"]:
                if ft["properties"]["ISO2"] == extra["properties"]["ISO2"]:
                    ft["geometry"] = extra["geometry"]
                    print(f"{extra['properties']['ADMIN']}: Geometrie ersetzt")
                    break
        else:
            background_feats.append(extra)
except FileNotFoundError:
    print("Hinweis: world-extras.geojson fehlt – keine Hintergrundlaender")

def feature_to_country(ft, iso2, name, bg=False):
    geom = ft["geometry"]
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    rings = []
    for poly in polys:
        d, area = ring_to_path(poly[0], tol=0.6)  # nur Aussenring, Toleranz in SVG-Einheiten
        if d:
            rings.append((d, area))
    if not rings:
        # Zwergstaaten oder komplett ausserhalb des Kartenausschnitts
        return None
    rings.sort(key=lambda r: -r[1])
    biggest = rings[0][1]
    # kleine Inseln weglassen, aber Hauptflaeche immer behalten;
    # Obergrenze, damit riesige Laender (Russland) ihre Exklaven und
    # grossen Inseln (Kaliningrad, Nowaja Semlja) nicht verlieren
    threshold = max(3.0, min(biggest * 0.02, 40.0))
    country = {"iso2": iso2, "name": name, "d": "".join(d for d, a in rings if a >= threshold)}
    if bg:
        country["bg"] = 1
    return country

# Hintergrund zuerst, damit die spielbaren Laender darueber gezeichnet werden
countries = []
for ft in background_feats:
    c = feature_to_country(ft, ft["properties"]["ISO2"], ft["properties"]["ADMIN"], bg=True)
    if c:
        countries.append(c)
n_background = len(countries)

for ft in data["features"]:
    c = feature_to_country(ft, ft["properties"]["ISO2"], ft["properties"]["NAME"])
    if c:
        countries.append(c)

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
print(f"{len(countries) - n_background} Laender + {n_background} Hintergrund, "
      f"{size/1024:.0f} kB, viewBox 0 0 {out['width']} {out['height']}")
