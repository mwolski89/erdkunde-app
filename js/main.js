// Einstiegspunkt: Bildschirmwechsel (Start -> Spiel -> Ergebnis) und
// Verdrahtung von Level, Modus, Daten und HUD.

import { MODES, LEVELS } from './modes/registry.js';
import { loadBestScore, saveBestScore } from './core/storage.js';
import { unlock as unlockAudio, sounds } from './core/audio.js';
import * as speech from './core/speech.js';

const $ = (id) => document.getElementById(id);

const screens = {
  start: $('screen-start'),
  game: $('screen-game'),
  end: $('screen-end'),
};

function showScreen(name) {
  for (const [key, node] of Object.entries(screens)) {
    node.classList.toggle('hidden', key !== name);
  }
}

const dataCache = new Map();
async function loadJson(url) {
  if (!dataCache.has(url)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Konnte ${url} nicht laden`);
    dataCache.set(url, await res.json());
  }
  return dataCache.get(url);
}

let currentGame = null;
let currentLevel = null;

async function startLevel(level) {
  currentLevel = level;
  const [mapData, content] = await Promise.all([loadJson(level.map), loadJson(level.content)]);

  currentGame?.stop?.();
  currentGame = MODES[level.mode]({
    level,
    mapData,
    content,
    elements: {
      mapContainer: $('map-container'),
      progress: $('hud-progress'),
      lives: $('hud-lives'),
      score: $('hud-score'),
      combo: $('combo-badge'),
      qFlag: $('q-flag'),
      qText: $('q-text'),
      qSpeak: $('q-speak'),
      feedbackSpeak: $('feedback-speak'),
      feedback: $('feedback'),
      feedbackTitle: $('feedback-title'),
      feedbackFact: $('feedback-fact'),
      nextBtn: $('feedback-next'),
    },
    onFinished: showResult,
  });

  showScreen('game');
  currentGame.start();
}

function showResult(session) {
  const isRecord = saveBestScore(currentLevel.id, session.score);
  const best = loadBestScore(currentLevel.id);

  if (session.failed) {
    $('end-emoji').textContent = '💪';
    $('end-title').textContent = 'Fast geschafft!';
    $('end-message').textContent = 'Drei Herzen weg – aber deine Punkte zählen! Versuch es gleich nochmal.';
  } else {
    sounds.fanfare();
    $('end-emoji').textContent = session.correctCount >= 13 ? '🏆' : '🎉';
    $('end-title').textContent = 'Geschafft!';
    $('end-message').textContent = `Du hast ${session.correctCount} von ${session.questionCount} Ländern gefunden!`;
  }

  const stars = session.correctCount >= 13 ? 3 : session.correctCount >= 9 ? 2 : session.correctCount >= 5 ? 1 : 0;
  $('end-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  $('end-score').textContent = `${session.score} Punkte`;
  $('end-best').textContent = isRecord ? '🎊 Neuer Rekord!' : `Rekord: ${best} Punkte`;
  showScreen('end');
}

function renderMenu() {
  const menu = $('menu');
  menu.replaceChildren();
  for (const level of LEVELS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-big' + (level.locked ? ' btn-locked' : '');
    btn.textContent = level.locked ? `${level.title} 🔒` : level.title;
    btn.disabled = level.locked;
    if (!level.locked) {
      btn.addEventListener('click', () => {
        unlockAudio(); // iOS: Ton braucht eine Nutzeraktion
        speech.warmup(); // dito für die Vorlesestimme
        startLevel(level).catch((err) => {
          console.error(err);
          alert('Ohje, das Spiel konnte nicht laden. Bitte Seite neu laden.');
        });
      });
    }
    menu.appendChild(btn);
  }

  const best = loadBestScore(LEVELS[0].id);
  $('best-score').textContent = best > 0 ? `Dein Rekord: ⭐ ${best} Punkte` : '';
}

// Vorlesen an/aus – ein gemeinsamer Zustand für den Schalter im
// Startbildschirm und den 🔊/🔇-Knopf in der Spiel-Kopfleiste.
// Ausgeschaltet heißt komplett aus: laufende Ausgabe stoppt,
// alle Vorlese-Knöpfe werden ausgeblendet.
function updateSpeechUi() {
  document.body.classList.toggle('no-speech', !speech.isSupported);
  if (!speech.isSupported) return;
  const on = speech.isEnabled();
  document.body.classList.toggle('speech-off', !on);
  const toggle = $('speech-toggle');
  toggle.classList.remove('hidden');
  toggle.textContent = on ? '🔊 Vorlesen: AN' : '🔇 Vorlesen: AUS';
  const mute = $('hud-mute');
  mute.textContent = on ? '🔊' : '🔇';
  mute.classList.toggle('off', !on);
}

function toggleSpeech({ announce = false } = {}) {
  speech.setEnabled(!speech.isEnabled()); // schaltet aus + stoppt laufende Ausgabe
  updateSpeechUi();
  if (announce && speech.isEnabled()) speech.speak('Hallo! Ich lese dir jetzt alles vor.');
}

$('speech-toggle').addEventListener('click', () => toggleSpeech({ announce: true }));
$('hud-mute').addEventListener('click', () => toggleSpeech());

$('end-retry').addEventListener('click', () => startLevel(currentLevel));
$('end-menu').addEventListener('click', () => {
  renderMenu();
  showScreen('start');
});

renderMenu();
updateSpeechUi();
showScreen('start');
