// Spielmodus „Land auf der Karte finden".
//
// Jeder Modus implementiert dieselbe Schnittstelle:
//   createGame(ctx) -> { start(), stop() }
// und meldet sich über ctx.onFinished(session) zurück, wenn die Runde vorbei
// ist. Der gemeinsame Rundenablauf (Punkte, HUD, Feedback, Vorlesen) kommt
// aus shared.js; hier steckt nur die Karten-Logik.

import { EuropeMap } from '../map/europe-map.js';
import { createFlow, flagEmoji, shuffle, capitalize } from './shared.js';

export function createGame({ level, mapData, content, elements: el, onFinished }) {
  const flow = createFlow({ elements: el, onQuestion: showQuestion, onFinished });
  const { session } = flow;
  const questions = shuffle(content.pools[level.pool]).slice(0, session.questionCount);

  el.mapContainer.classList.remove('flag-area');
  el.mapContainer.replaceChildren();
  const map = new EuropeMap(el.mapContainer, mapData);

  function showQuestion() {
    const iso2 = questions[session.index];
    map.clearMarks();
    map.resetView();
    map.setEnabled(true);
    flow.askQuestion(`Wo ist ${content.countries[iso2].name}?`, flagEmoji(iso2));
  }

  map.onTap = (tappedIso2) => {
    const targetIso2 = questions[session.index];
    map.setEnabled(false);

    if (tappedIso2 === targetIso2) {
      map.mark(targetIso2, 'correct');
      flow.answerCorrect({ fact: content.countries[targetIso2].fact });
    } else {
      map.mark(tappedIso2, 'wrong');
      map.mark(targetIso2, 'reveal');
      map.zoomToCountry(targetIso2, 30);
      const tappedName = content.countries[tappedIso2]?.name;
      const hint = tappedName ? `Das war ${tappedName}. ` : '';
      flow.answerWrong({
        title: `Ups! ${hint}${capitalize(content.countries[targetIso2].name)} leuchtet hier! 💡`,
        speech: `Ups! ${hint}Schau, hier leuchtet ${content.countries[targetIso2].name}.`,
      });
    }
  };

  return {
    start: showQuestion,
    stop: flow.stop,
  };
}
