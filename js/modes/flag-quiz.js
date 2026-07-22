// Spielmodus „Flaggen-Quiz": Welche Flagge hat <Land>?
//
// Es erscheinen 4 Flaggen, genau eine ist richtig. Die falschen werden
// zufällig aus dem Fragen-Pool gezogen – ohne das gesuchte Land, dadurch
// können keine Flaggen doppelt auftauchen. Punkte, Leben und Kombo sind
// identisch zum Karten-Modus (gemeinsame GameSession über shared.js).

import { createFlow, flagEmoji, shuffle } from './shared.js';
import { t, tp, cap, countryName, countryFact, isPlural } from '../core/i18n.js';

const OPTION_COUNT = 4;

export function createGame({ level, pools, elements: el, onFinished }) {
  const flow = createFlow({ elements: el, onQuestion: showQuestion, onFinished });
  const { session } = flow;
  const pool = pools[level.pool];
  const questions = shuffle(pool).slice(0, session.questionCount);

  el.mapContainer.classList.add('flag-area');
  el.mapContainer.replaceChildren();
  const grid = document.createElement('div');
  grid.className = 'flag-grid';
  el.mapContainer.appendChild(grid);

  function showQuestion() {
    const targetIso2 = questions[session.index];
    const distractors = shuffle(pool.filter((iso2) => iso2 !== targetIso2)).slice(0, OPTION_COUNT - 1);
    const options = shuffle([targetIso2, ...distractors]);

    grid.replaceChildren();
    for (const iso2 of options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'flag-option';
      btn.dataset.iso2 = iso2;
      btn.setAttribute('aria-label', countryName(iso2));
      // Flagge + Ländername; der Name wird erst nach der Antwort sichtbar
      // (Lerneffekt: man sieht dann, welche Flagge zu welchem Land gehört)
      const flag = document.createElement('span');
      flag.className = 'flag-emoji';
      flag.textContent = flagEmoji(iso2);
      const name = document.createElement('span');
      name.className = 'flag-name';
      name.textContent = cap(countryName(iso2));
      btn.append(flag, name);
      btn.addEventListener('click', () => handleChoice(iso2, btn));
      grid.appendChild(btn);
    }
    grid.classList.remove('locked');
    flow.askQuestion(
      tp('game.whichFlag', isPlural(targetIso2), { country: targetIso2 }),
      '❓',
    );
  }

  function handleChoice(chosenIso2, btn) {
    if (grid.classList.contains('locked')) return; // nur eine Antwort pro Frage
    grid.classList.add('locked');
    const targetIso2 = questions[session.index];

    if (chosenIso2 === targetIso2) {
      btn.classList.add('correct');
      flow.answerCorrect({ fact: countryFact(targetIso2) });
    } else {
      btn.classList.add('wrong');
      grid.querySelector(`[data-iso2="${targetIso2}"]`)?.classList.add('reveal');
      flow.answerWrong({
        title: t('game.wrongFlag', { chosen: chosenIso2, country: targetIso2 }),
        speech: t('game.wrongFlagSpeech', { chosen: chosenIso2, country: targetIso2 }),
      });
    }
  }

  return {
    start: showQuestion,
    stop: flow.stop,
  };
}
