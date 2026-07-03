// Spielmodus „Land auf der Karte finden".
//
// Jeder Modus implementiert dieselbe Schnittstelle:
//   createGame(ctx) -> { start() }
// und meldet sich über ctx.onFinished(session) zurück, wenn die Runde vorbei ist.
// Weitere Modi (Hauptstädte, Flaggen-Quiz, Multiple Choice) kommen als eigene
// Dateien dazu und werden in modes/registry.js eingetragen.

import { GameSession } from '../core/session.js';
import { EuropeMap } from '../map/europe-map.js';
import { sounds } from '../core/audio.js';

const NEXT_DELAY_MS = 5000; // automatisch weiter, falls das Kind nicht tippt

function flagEmoji(iso2) {
  return [...iso2].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ländername am Satzanfang großschreiben („die Schweiz" -> „Die Schweiz")
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function createGame(ctx) {
  const { level, mapData, content, elements, onFinished } = ctx;
  const el = elements;

  const session = new GameSession();
  const questions = shuffle(content.pools[level.pool]).slice(0, session.questionCount);

  el.mapContainer.replaceChildren();
  const map = new EuropeMap(el.mapContainer, mapData);

  let nextTimer = null;

  function updateHud() {
    el.progress.textContent = `${Math.min(session.index + 1, session.questionCount)}/${session.questionCount}`;
    el.lives.textContent = '❤️'.repeat(session.livesLeft) + '🖤'.repeat(3 - session.livesLeft);
    el.score.textContent = `⭐ ${session.score}`;
    if (session.combo >= 2) {
      el.combo.textContent = `🔥 ${session.combo}er-Serie!`;
      el.combo.classList.remove('hidden');
    } else {
      el.combo.classList.add('hidden');
    }
  }

  function showQuestion() {
    const iso2 = questions[session.index];
    const country = content.countries[iso2];
    el.qFlag.textContent = flagEmoji(iso2);
    el.qText.textContent = `Wo ist ${country.name}?`;
    el.feedback.classList.add('hidden');
    map.clearMarks();
    map.resetView();
    map.setEnabled(true);
    updateHud();
  }

  function showFeedback(kind, title, fact) {
    el.feedback.className = `feedback ${kind}`;
    el.feedbackTitle.textContent = title;
    el.feedbackFact.textContent = fact || '';
    el.feedbackFact.classList.toggle('hidden', !fact);
  }

  function proceed() {
    clearTimeout(nextTimer);
    if (session.next()) {
      showQuestion();
    } else {
      onFinished(session);
    }
  }

  function handleTap(tappedIso2) {
    const targetIso2 = questions[session.index];
    map.setEnabled(false);
    clearTimeout(nextTimer);

    if (tappedIso2 === targetIso2) {
      const points = session.answerCorrect();
      sounds.correct();
      map.mark(targetIso2, 'correct');
      const cheer = session.combo >= 3 ? `Super, ${session.combo} richtige hintereinander!` : 'Richtig!';
      showFeedback('good', `${cheer} +${points} Punkte 🎉`, content.countries[targetIso2].fact);
    } else {
      session.answerWrong();
      sounds.wrong();
      map.mark(tappedIso2, 'wrong');
      map.mark(targetIso2, 'reveal');
      map.zoomToCountry(targetIso2, 30);
      const tappedName = content.countries[tappedIso2]?.name;
      const hint = tappedName ? `Das war ${tappedName}. ` : '';
      showFeedback('bad', `Ups! ${hint}${capitalize(content.countries[targetIso2].name)} leuchtet hier! 💡`);
    }
    updateHud();
    nextTimer = setTimeout(proceed, NEXT_DELAY_MS);
  }

  map.onTap = handleTap;
  el.nextBtn.onclick = proceed;

  return {
    start() {
      showQuestion();
    },
    stop() {
      clearTimeout(nextTimer);
    },
  };
}
