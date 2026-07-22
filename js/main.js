// Einstiegspunkt: Sprache laden, Bildschirmwechsel (Start -> Spiel ->
// Ergebnis) und Verdrahtung von Level, Modus, Daten und HUD.

import { MODES, LEVELS } from './modes/registry.js';
import { loadBestScore, saveBestScore } from './core/storage.js';
import { unlock as unlockAudio, sounds } from './core/audio.js';
import * as speech from './core/speech.js';
import { initI18n, setLanguage, currentLang, t, LANGUAGES } from './core/i18n.js';

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
  const [mapData, pools] = await Promise.all([
    level.map ? loadJson(level.map) : null, // nicht jeder Modus braucht eine Karte
    loadJson('data/pools.json'),
  ]);

  currentGame?.stop?.();
  currentGame = MODES[level.mode]({
    level,
    mapData,
    pools,
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
    $('end-title').textContent = t('end.lostTitle');
    $('end-message').textContent = t('end.lostMessage');
  } else {
    sounds.fanfare();
    $('end-emoji').textContent = session.correctCount >= 13 ? '🏆' : '🎉';
    $('end-title').textContent = t('end.wonTitle');
    $('end-message').textContent = t('end.wonMessage', { n: session.correctCount, total: session.questionCount });
  }

  const stars = session.correctCount >= 13 ? 3 : session.correctCount >= 9 ? 2 : session.correctCount >= 5 ? 1 : 0;
  $('end-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  $('end-score').textContent = t('end.points', { points: session.score });
  $('end-best').textContent = isRecord ? t('end.newRecord') : t('end.best', { points: best });
  showScreen('end');
}

// Statische Texte (alles außerhalb einer laufenden Runde) neu setzen –
// wird beim Start und nach jedem Sprachwechsel aufgerufen.
function applyStaticTexts() {
  document.title = `${t('app.title')} 🌍`;
  $('app-title').textContent = t('app.title');
  $('tagline').textContent = t('app.tagline');
  $('feedback-next').textContent = t('game.next');
  $('end-retry').textContent = t('end.retry');
  $('end-menu').textContent = t('end.menu');
}

function renderMenu() {
  const menu = $('menu');
  menu.replaceChildren();
  for (const level of LEVELS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-big' + (level.locked ? ' btn-locked' : '');
    const title = t(`level.${level.id}`);
    btn.textContent = level.locked ? `${title} 🔒` : title;
    btn.disabled = level.locked;
    if (!level.locked) {
      btn.addEventListener('click', () => {
        unlockAudio(); // iOS: Ton braucht eine Nutzeraktion
        speech.warmup(); // dito für die Vorlesestimme
        startLevel(level).catch((err) => {
          console.error(err);
          alert(t('app.loadError'));
        });
      });
    }
    menu.appendChild(btn);
  }

  // Rekorde aller freigeschalteten Level (Emoji des Leveltitels + Punkte);
  // Rekorde sind bewusst sprachunabhängig (ein Highscore pro Level)
  const records = LEVELS.filter((l) => !l.locked)
    .map((l) => ({ icon: t(`level.${l.id}`).split(' ')[0], best: loadBestScore(l.id) }))
    .filter((r) => r.best > 0);
  $('best-score').textContent = records.length
    ? `${t('app.records')} ` + records.map((r) => `${r.icon} ${r.best}`).join('   ')
    : '';
}

// Sprachumschalter: Eigennamen der Sprachen, bewusst keine Flaggen
function renderLangPicker() {
  const picker = $('lang-picker');
  picker.replaceChildren();
  for (const { code, label } of LANGUAGES) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = label;
    picker.appendChild(opt);
  }
  picker.value = currentLang();
  picker.addEventListener('change', async () => {
    await setLanguage(picker.value);
    applyStaticTexts();
    renderMenu();
    updateSpeechUi();
  });
}

// Vorlesen an/aus – ein gemeinsamer Zustand für den Schalter im
// Startbildschirm und den 🔊/🔇-Knopf in der Spiel-Kopfleiste.
function updateSpeechUi() {
  document.body.classList.toggle('no-speech', !speech.isSupported);
  if (!speech.isSupported) return;
  const on = speech.isEnabled();
  document.body.classList.toggle('speech-off', !on);
  const toggle = $('speech-toggle');
  toggle.classList.remove('hidden');
  toggle.textContent = on ? t('speech.on') : t('speech.off');
  const mute = $('hud-mute');
  mute.textContent = on ? '🔊' : '🔇';
  mute.classList.toggle('off', !on);
}

function toggleSpeech({ announce = false } = {}) {
  speech.setEnabled(!speech.isEnabled()); // schaltet aus + stoppt laufende Ausgabe
  updateSpeechUi();
  if (announce && speech.isEnabled()) speech.speak(t('speech.hello'));
}

$('speech-toggle').addEventListener('click', () => toggleSpeech({ announce: true }));
$('hud-mute').addEventListener('click', () => toggleSpeech());

$('end-retry').addEventListener('click', () => startLevel(currentLevel));
$('end-menu').addEventListener('click', () => {
  renderMenu();
  showScreen('start');
});

initI18n()
  .then(() => {
    applyStaticTexts();
    renderMenu();
    renderLangPicker();
    updateSpeechUi();
    showScreen('start');
  })
  .catch((err) => {
    console.error(err);
    alert('Ohje, das Spiel konnte nicht laden. Bitte Seite neu laden.');
  });
