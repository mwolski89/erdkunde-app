// Bestenliste ohne Login: localStorage pro Level.
// Privater Modus in Safari kann localStorage blockieren – dann läuft das
// Spiel einfach ohne gespeicherten Rekord weiter.

const PREFIX = 'erdkunde.best.';

export function loadBestScore(levelId) {
  try {
    return Number(localStorage.getItem(PREFIX + levelId)) || 0;
  } catch {
    return 0;
  }
}

// Speichert den Score, wenn er ein neuer Rekord ist. Liefert true bei Rekord.
export function saveBestScore(levelId, score) {
  const best = loadBestScore(levelId);
  if (score <= best) return false;
  try {
    localStorage.setItem(PREFIX + levelId, String(score));
  } catch {
    /* z. B. privater Modus – ignorieren */
  }
  return true;
}
