// Registry aller Spielmodi und Level.
// Ein neuer Modus = neue Datei in js/modes/ + ein Eintrag hier.
// Ein neues Level = ein Eintrag in LEVELS; der Titel kommt aus den
// Sprachdateien (ui.json, Schlüssel "level.<id>"), der Fragen-Pool
// aus data/pools.json.

import { createGame as locateCountry } from './locate-country.js';
import { createGame as flagQuiz } from './flag-quiz.js';

export const MODES = {
  'locate-country': locateCountry,
  'flag-quiz': flagQuiz,
  // 'locate-capital': ...   (geplant)
  // 'multiple-choice': ...  (geplant)
};

export const LEVELS = [
  {
    id: 'europa-leicht',
    mode: 'locate-country',
    map: 'data/europe-map.json',
    pool: 'easy',
    locked: false,
  },
  {
    id: 'flaggen-quiz',
    mode: 'flag-quiz', // keine Karte nötig
    pool: 'easy',
    locked: false,
  },
  { id: 'welt-schwer', locked: true },
  { id: 'hauptstaedte', locked: true },
];
