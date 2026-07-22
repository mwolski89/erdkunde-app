// Gemeinsame Bausteine aller Spielmodi.
//
// createFlow() kapselt den Rundenablauf, der in jedem Modus gleich ist:
// GameSession (Punkte, Kombo, Leben), HUD, Feedback-Panel, Vorlesen und
// das automatische Weiterschalten. Ein Modus liefert nur noch:
//   - onQuestion(): eigene Frage darstellen (Karte, Flaggen-Raster, ...)
//   - Aufrufe von flow.answerCorrect() / flow.answerWrong() bei Eingaben

import { GameSession } from '../core/session.js';
import { sounds } from '../core/audio.js';
import { speak, autoSpeak, stop as stopSpeech } from '../core/speech.js';
import { t } from '../core/i18n.js';

const NEXT_DELAY_MS = 5000; // automatisch weiter, falls das Kind nicht tippt

export function flagEmoji(iso2) {
  return [...iso2].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('');
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createFlow({ elements: el, onQuestion, onFinished }) {
  const session = new GameSession();
  let nextTimer = null;
  let questionText = '';
  let feedbackSpeechText = '';

  // Vorlesen mit wackelndem 🔊-Button; auto = nur wenn Auto-Vorlesen an ist
  function speakWith(btn, text, { auto = false } = {}) {
    const done = auto ? autoSpeak(text) : speak(text);
    if (!done) return null;
    btn.classList.add('speaking');
    return done.then(() => btn.classList.remove('speaking'));
  }

  function updateHud() {
    el.progress.textContent = `${Math.min(session.index + 1, session.questionCount)}/${session.questionCount}`;
    el.lives.textContent = '❤️'.repeat(session.livesLeft) + '🖤'.repeat(3 - session.livesLeft);
    el.score.textContent = `⭐ ${session.score}`;
    if (session.combo >= 2) {
      el.combo.textContent = t('game.combo', { n: session.combo });
      el.combo.classList.remove('hidden');
    } else {
      el.combo.classList.add('hidden');
    }
  }

  function askQuestion(text, bannerIcon) {
    questionText = text;
    el.qFlag.textContent = bannerIcon;
    el.qText.textContent = text;
    el.feedback.classList.add('hidden');
    updateHud();
    speakWith(el.qSpeak, text, { auto: true });
  }

  // speechText: eigens formulierter Vorlese-Text (natürlicher als der Bildschirmtext)
  function showFeedback(kind, title, fact, speechText) {
    el.feedback.className = `feedback ${kind}`;
    el.feedbackTitle.textContent = title;
    el.feedbackFact.textContent = fact || '';
    el.feedbackFact.classList.toggle('hidden', !fact);
    feedbackSpeechText = speechText;
    updateHud();
    scheduleNext(speakWith(el.feedbackSpeak, speechText, { auto: true }));
  }

  function answerCorrect({ fact } = {}) {
    const points = session.answerCorrect();
    sounds.correct();
    const cheer = session.combo >= 3 ? t('game.correctStreak', { n: session.combo }) : t('game.correct');
    showFeedback('good', `${cheer} ${t('game.points', { points })}`, fact,
      `${cheer} ${t('game.pointsSpeech', { points })} ${fact || ''}`);
  }

  function answerWrong({ title, speech }) {
    session.answerWrong();
    sounds.wrong();
    showFeedback('bad', title, null, speech);
  }

  function proceed() {
    clearTimeout(nextTimer);
    stopSpeech();
    if (session.next()) {
      onQuestion();
    } else {
      onFinished(session);
    }
  }

  // Automatisch weiter: normal nach NEXT_DELAY_MS; wird gerade vorgelesen,
  // dann erst kurz nach dem Ende des Vorlesens.
  function scheduleNext(spokenPromise) {
    clearTimeout(nextTimer);
    nextTimer = setTimeout(proceed, NEXT_DELAY_MS);
    if (!spokenPromise) return;
    const idx = session.index;
    spokenPromise.then(() => {
      if (session.index !== idx) return; // Frage wurde inzwischen gewechselt
      clearTimeout(nextTimer);
      nextTimer = setTimeout(proceed, 1500);
    });
  }

  el.nextBtn.onclick = proceed;
  el.qSpeak.onclick = () => speakWith(el.qSpeak, questionText);
  // erneutes Anhören verschiebt auch das automatische Weiterschalten
  el.feedbackSpeak.onclick = () => scheduleNext(speakWith(el.feedbackSpeak, feedbackSpeechText));

  return {
    session,
    askQuestion,
    answerCorrect,
    answerWrong,
    stop() {
      clearTimeout(nextTimer);
      stopSpeech();
    },
  };
}
