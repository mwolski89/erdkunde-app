// Vorlesefunktion über die Web Speech API (Systemstimmen, offline-fähig).
// Für Leseanfänger: Fragen und Fakten werden in der Spielsprache und in
// etwas gemächlicherem Tempo vorgelesen; die Stimme kommt aus i18n
// (meta.speechLang der gewählten Sprache).
//
// iOS-Besonderheit: Die erste Sprachausgabe braucht eine Nutzeraktion,
// deshalb ruft main.js warmup() beim Start-Tap auf.

import { speechLang } from './i18n.js';

const PREF_KEY = 'erdkunde.speech';

export const isSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

// Standardmäßig AUS – Vorlesen ist bewusst zuschaltbar.
// Wer es einmal eingeschaltet hat, behält die Einstellung.
let enabled = false;
try {
  enabled = localStorage.getItem(PREF_KEY) === 'on';
} catch { /* privater Modus */ }

let voice = null;
let voiceStale = true;
let voiceLang = null;

if (isSupported && typeof speechSynthesis.addEventListener === 'function') {
  // Stimmen werden asynchron geladen – bei Änderung neu auswählen
  speechSynthesis.addEventListener('voiceschanged', () => { voiceStale = true; });
}

function pickVoice(wantedLang) {
  if (!voiceStale && voiceLang === wantedLang) return voice;
  const prefix = wantedLang.slice(0, 2).toLowerCase();
  const matching = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(prefix));
  voice =
    matching.find((v) => v.default) ||
    matching.find((v) => v.localService) ||
    matching[0] ||
    null;
  voiceStale = false;
  voiceLang = wantedLang;
  return voice;
}

// Emojis und Sonderzeichen entfernen, damit die Stimme sie nicht vorliest
function cleanForSpeech(text) {
  return text
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isEnabled() {
  return enabled;
}

export function setEnabled(value) {
  enabled = value;
  if (!enabled) stop();
  try {
    localStorage.setItem(PREF_KEY, enabled ? 'on' : 'off');
  } catch { /* ignorieren */ }
}

export function stop() {
  if (isSupported) speechSynthesis.cancel();
}

// Liest den Text vor (unabhängig vom Auto-Vorlesen, z. B. per 🔊-Button).
// Liefert ein Promise, das nach dem Vorlesen erfüllt wird – oder null,
// wenn Vorlesen nicht möglich ist.
export function speak(text) {
  if (!isSupported) return null;
  const clean = cleanForSpeech(text);
  if (!clean) return null;

  stop();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = speechLang(); // Sprache des Spiels, z. B. 'pl-PL'
  utterance.rate = 0.9;   // etwas langsamer für Kinder
  utterance.pitch = 1.05; // eine Spur freundlicher
  const v = pickVoice(utterance.lang);
  if (v) utterance.voice = v;

  return new Promise((resolve) => {
    utterance.onend = resolve;
    utterance.onerror = resolve; // auch bei Abbruch weitermachen
    // Sicherheitsnetz: manche Browser feuern kein Ereignis, wenn die
    // Ausgabe gar nicht erst startet
    setTimeout(resolve, 15000);
    speechSynthesis.speak(utterance);
  });
}

// Liest nur vor, wenn Auto-Vorlesen eingeschaltet ist.
export function autoSpeak(text) {
  return enabled ? speak(text) : null;
}

// iOS: stumme Mini-Äußerung innerhalb einer Nutzeraktion schaltet Ton frei
export function warmup() {
  if (!isSupported) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  speechSynthesis.speak(u);
}
