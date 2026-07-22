#!/usr/bin/env python3
"""Prueft alle Sprachdateien gegen die Referenzsprache Deutsch.

Fehler (Exit-Code 1):
  - fehlende oder ueberzaehlige Schluessel in ui.json
    (Schluessel mit Endung "Plural" sind optional pro Sprache)
  - Platzhalter-Parameter eines Schluessels weichen von der Referenz ab
    (benannte Formen wie {chosen.gen} duerfen pro Sprache abweichen)
  - fehlende Laender oder Laender ohne "name" in countries.json
  - eine Schablone der Sprache verlangt eine Zusatzform (z. B. .gen),
    die einem Pool-Land dieser Sprache fehlt

Bericht: Fakten-Abdeckung pro Sprache.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
I18N = ROOT / "data" / "i18n"
REFERENCE = "de"

PLACEHOLDER = re.compile(r"\{(\w+)(?:\.(\w+))?(?:\|(\w+))?\}")


def flatten(obj, prefix=""):
    out = {}
    for key, value in obj.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            out.update(flatten(value, path))
        else:
            out[path] = value
    return out


def params_of(template):
    return {m.group(1) for m in PLACEHOLDER.finditer(template)}


def forms_of(template):
    return {m.group(2) for m in PLACEHOLDER.finditer(template) if m.group(2)}


ref_ui = flatten(json.load(open(I18N / REFERENCE / "ui.json")))
ref_countries = json.load(open(I18N / REFERENCE / "countries.json"))
pools = json.load(open(ROOT / "data" / "pools.json"))
pool_isos = sorted({iso for pool in pools.values() for iso in pool})

errors = []
report = []

langs = sorted(p.name for p in I18N.iterdir() if p.is_dir())
for lang in langs:
    ui_path = I18N / lang / "ui.json"
    countries_path = I18N / lang / "countries.json"
    if not ui_path.exists() or not countries_path.exists():
        errors.append(f"[{lang}] ui.json oder countries.json fehlt")
        continue
    try:
        ui = flatten(json.load(open(ui_path)))
        countries = json.load(open(countries_path))
    except json.JSONDecodeError as e:
        errors.append(f"[{lang}] kaputtes JSON: {e}")
        continue

    if lang != REFERENCE:
        required = {k for k in ref_ui if not k.endswith("Plural")}
        missing = required - set(ui)
        extra = {k for k in ui if k not in ref_ui and not k.endswith("Plural")}
        for k in sorted(missing):
            errors.append(f"[{lang}] ui.json: Schluessel fehlt: {k}")
        for k in sorted(extra):
            errors.append(f"[{lang}] ui.json: unbekannter Schluessel: {k}")

        # Platzhalter-Parameter muessen zur Referenz passen (Formen frei)
        for key, template in ui.items():
            base = key[:-6] if key.endswith("Plural") else key
            ref_template = ref_ui.get(base) or ref_ui.get(key)
            if isinstance(template, str) and isinstance(ref_template, str):
                if params_of(template) - params_of(ref_template):
                    errors.append(
                        f"[{lang}] ui.json: {key} nutzt unbekannte Platzhalter "
                        f"{sorted(params_of(template) - params_of(ref_template))}"
                    )

        for iso in ref_countries:
            if iso not in countries:
                errors.append(f"[{lang}] countries.json: Land fehlt: {iso}")
            elif not countries[iso].get("name"):
                errors.append(f"[{lang}] countries.json: {iso} hat keinen name")

    # In meta.requiredForms deklarierte Zusatzformen muessen fuer alle
    # Pool-Laender existieren. Formen, die in Schablonen vorkommen, aber
    # nicht deklariert sind (z. B. deutsches 'von'), fallen bewusst auf
    # den Grundnamen zurueck und werden nicht geprueft.
    declared = set(json.load(open(ui_path)).get("meta", {}).get("requiredForms", []))
    for form in sorted(declared):
        for iso in pool_isos:
            entry = countries.get(iso, {})
            if entry and form not in entry:
                errors.append(f"[{lang}] countries.json: {iso} fehlt die Form '{form}'")

    facts = sum(1 for iso in pool_isos if countries.get(iso, {}).get("fact"))
    report.append(f"  {lang}: {facts}/{len(pool_isos)} Fakten fuer Pool-Laender")

print("Fakten-Abdeckung:")
print("\n".join(report))
if errors:
    print(f"\n{len(errors)} FEHLER:")
    print("\n".join(errors))
    sys.exit(1)
print("\nAlles in Ordnung ✓")
