// Registry aller Spielmodi und Level.
// Ein neuer Modus = neue Datei in js/modes/ + ein Eintrag hier.
// Ein neues Level (z. B. „Welt – schwer") = nur ein neuer Eintrag in LEVELS,
// mit eigenem Kartendatensatz und eigenem Fragen-Pool im Inhaltspaket.

import { createGame as locateCountry } from './locate-country.js';

export const MODES = {
  'locate-country': locateCountry,
  // 'locate-capital': ...   (geplant)
  // 'flag-quiz': ...        (geplant)
  // 'multiple-choice': ...  (geplant)
};

export const LEVELS = [
  {
    id: 'europa-leicht',
    title: '🗺️ Europa – Leicht',
    mode: 'locate-country',
    map: 'data/europe-map.json',
    content: 'data/countries-de.json',
    pool: 'easy',
    locked: false,
  },
  { id: 'welt-schwer', title: '🌍 Ganze Welt', locked: true },
  { id: 'hauptstaedte', title: '🏛️ Hauptstädte', locked: true },
];
