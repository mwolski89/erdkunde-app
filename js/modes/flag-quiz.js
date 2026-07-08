// Spielmodus „Flaggen-Quiz": Welche Flagge hat <Land>?
//
// Es erscheinen 4 Flaggen, genau eine ist richtig. Die falschen werden
// zufällig aus dem Fragen-Pool gezogen – ohne das gesuchte Land, dadurch
// können keine Flaggen doppelt auftauchen. Punkte, Leben und Kombo sind
// identisch zum Karten-Modus (gemeinsame GameSession über shared.js).

import { createFlow, flagEmoji, shuffle } from './shared.js';

const OPTION_COUNT = 4;

export function createGame({ level, content, elements: el, onFinished }) {
  const flow = createFlow({ elements: el, onQuestion: showQuestion, onFinished });
  const { session } = flow;
  const pool = content.pools[level.pool];
  const questions = shuffle(pool).slice(0, session.questionCount);

  el.mapContainer.classList.add('flag-area');
  el.mapContainer.replaceChildren();
  const grid = document.createElement('div');
  grid.className = 'flag-grid';
  el.mapContainer.appendChild(grid);

  // "die Niederlande" ist Plural („haben"), alles andere Singular („hat")
  function questionFor(iso2) {
    const c = content.countries[iso2];
    return c.plural ? `Welche Flagge haben ${c.name}?` : `Welche Flagge hat ${c.name}?`;
  }

  // Für „die Flagge von …" braucht es den Dativ („von der Schweiz")
  function dativName(iso2) {
    const c = content.countries[iso2];
    return c.dativ || c.name;
  }

  function showQuestion() {
    const targetIso2 = questions[session.index];
    const distractors = shuffle(pool.filter((iso2) => iso2 !== targetIso2)).slice(0, OPTION_COUNT - 1);
    const options = shuffle([targetIso2, ...distractors]);

    grid.replaceChildren();
    for (const iso2 of options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'flag-option';
      btn.textContent = flagEmoji(iso2);
      btn.dataset.iso2 = iso2;
      btn.setAttribute('aria-label', content.countries[iso2].name);
      btn.addEventListener('click', () => handleChoice(iso2, btn));
      grid.appendChild(btn);
    }
    grid.classList.remove('locked');
    flow.askQuestion(questionFor(targetIso2), '❓');
  }

  function handleChoice(chosenIso2, btn) {
    if (grid.classList.contains('locked')) return; // nur eine Antwort pro Frage
    grid.classList.add('locked');
    const targetIso2 = questions[session.index];

    if (chosenIso2 === targetIso2) {
      btn.classList.add('correct');
      flow.answerCorrect({ fact: content.countries[targetIso2].fact });
    } else {
      btn.classList.add('wrong');
      grid.querySelector(`[data-iso2="${targetIso2}"]`)?.classList.add('reveal');
      flow.answerWrong({
        title: `Ups! Das war die Flagge von ${dativName(chosenIso2)}. Die richtige leuchtet! 💡`,
        speech: `Ups! Das war die Flagge von ${dativName(chosenIso2)}. Schau, die Flagge von ${dativName(targetIso2)} leuchtet.`,
      });
    }
  }

  return {
    start: showQuestion,
    stop: flow.stop,
  };
}
