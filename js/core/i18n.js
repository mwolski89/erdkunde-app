// Mehrsprachigkeit: lädt pro Sprache zwei JSON-Dateien (ui.json,
// countries.json) und stellt Übersetzungs-Helfer bereit.
//
// Satzschablonen (siehe docs/i18n-konzept.md):
//   {points}        einfacher Parameter
//   {country}       Parameter ist ein ISO-Code -> Ländername
//   {country.von}   benannte Zusatzform des Landes (Fallback: Grundname)
//   {country|cap}   Modifikator: erster Buchstabe groß
//
// Fallback-Kette: gewählte Sprache -> Deutsch (Referenz, immer vollständig).
// Ausnahme Fakten: fehlt ein Fakt, gibt es KEINEN deutschen Ersatz.

const STORAGE_KEY = 'erdkunde.lang';
const REFERENCE = 'de';

export const LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'pl', label: 'Polski' },
  { code: 'it', label: 'Italiano' },
  { code: 'ru', label: 'Русский' },
  { code: 'nl', label: 'Nederlands' },
];

let lang = REFERENCE;
let ui = {};
let countries = {};
let refUi = {};
let refCountries = {};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Konnte ${url} nicht laden`);
  return res.json();
}

function detectLanguage() {
  const known = (code) => LANGUAGES.some((l) => l.code === code);
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (fromUrl && known(fromUrl)) return fromUrl;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && known(stored)) return stored;
  } catch { /* privater Modus */ }
  const nav = (navigator.language || '').slice(0, 2).toLowerCase();
  return known(nav) ? nav : 'en';
}

export async function setLanguage(code) {
  if (!LANGUAGES.some((l) => l.code === code)) code = REFERENCE;
  [ui, countries] = await Promise.all([
    fetchJson(`data/i18n/${code}/ui.json`),
    fetchJson(`data/i18n/${code}/countries.json`),
  ]);
  if (code === REFERENCE) {
    refUi = ui;
    refCountries = countries;
  } else if (!refUi.meta) {
    [refUi, refCountries] = await Promise.all([
      fetchJson(`data/i18n/${REFERENCE}/ui.json`),
      fetchJson(`data/i18n/${REFERENCE}/countries.json`),
    ]);
  }
  lang = code;
  document.documentElement.lang = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch { /* ignorieren */ }
}

export function initI18n() {
  return setLanguage(detectLanguage());
}

export function currentLang() {
  return lang;
}

export function speechLang() {
  return ui.meta?.speechLang || refUi.meta?.speechLang || 'de-DE';
}

export function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function lookup(obj, dottedKey) {
  return dottedKey.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function countryEntry(iso2) {
  return countries[iso2] || refCountries[iso2];
}

// Ländername, optional in einer benannten Zusatzform (z. B. 'von', 'gen')
export function countryName(iso2, form) {
  const entry = countryEntry(iso2);
  if (!entry) return iso2;
  return (form && entry[form]) || entry.name;
}

export function countryFact(iso2) {
  // bewusst OHNE Fallback: lieber kein Fakt als ein fremdsprachiger
  return countries[iso2]?.fact;
}

export function isPlural(iso2) {
  return Boolean(countryEntry(iso2)?.plural);
}

// Wie t(), wählt aber die "...Plural"-Variante des Schlüssels, wenn
// plural true ist UND die aktuelle Sprache die Variante definiert
// (Pluralländer wie „die Niederlande", „Włochy", „Нидерланды").
export function tp(key, plural, params) {
  if (plural && typeof lookup(ui, `${key}Plural`) === 'string') {
    return t(`${key}Plural`, params);
  }
  return t(key, params);
}

const PLACEHOLDER = /\{(\w+)(?:\.(\w+))?(?:\|(\w+))?\}/g;

export function t(key, params = {}) {
  let template = lookup(ui, key);
  if (typeof template !== 'string') template = lookup(refUi, key);
  if (typeof template !== 'string') {
    console.warn(`i18n: fehlender Schlüssel "${key}" (${lang})`);
    return key;
  }
  return template.replace(PLACEHOLDER, (_, name, form, mod) => {
    let value = params[name];
    if (value === undefined || value === null) return '';
    // ISO-Codes werden zu Ländernamen aufgelöst (mit optionaler Form)
    if (typeof value === 'string' && /^[A-Z]{2}$/.test(value) && countryEntry(value)) {
      value = countryName(value, form);
    }
    value = String(value);
    if (mod === 'cap') value = cap(value);
    return value;
  });
}
