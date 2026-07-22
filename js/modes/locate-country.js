// Spielmodus „Land auf der Karte finden".
//
// Jeder Modus implementiert dieselbe Schnittstelle:
//   createGame(ctx) -> { start(), stop() }
// und meldet sich über ctx.onFinished(session) zurück, wenn die Runde vorbei
// ist. Der gemeinsame Rundenablauf (Punkte, HUD, Feedback, Vorlesen) kommt
// aus shared.js, alle Texte aus den Sprachdateien (core/i18n.js).

import { EuropeMap } from '../map/europe-map.js';
import { createFlow, flagEmoji, shuffle } from './shared.js';
import { tp, countryName, countryFact, isPlural } from '../core/i18n.js';

export function createGame({ level, mapData, pools, elements: el, onFinished }) {
  const flow = createFlow({ elements: el, onQuestion: showQuestion, onFinished });
  const { session } = flow;
  const questions = shuffle(pools[level.pool]).slice(0, session.questionCount);

  el.mapContainer.classList.remove('flag-area');
  el.mapContainer.replaceChildren();
  const map = new EuropeMap(el.mapContainer, mapData);

  function showQuestion() {
    const iso2 = questions[session.index];
    map.clearMarks();
    map.resetView();
    map.setEnabled(true);
    flow.askQuestion(
      tp('game.whereIs', isPlural(iso2), { country: iso2 }),
      flagEmoji(iso2),
    );
  }

  map.onTap = (tappedIso2) => {
    const targetIso2 = questions[session.index];
    map.setEnabled(false);

    // Gefragtes Land bleibt bis zum Rundenende markiert, mit Flagge darauf
    map.setDone(targetIso2, tappedIso2 === targetIso2 ? 'right' : 'wrong', flagEmoji(targetIso2));

    if (tappedIso2 === targetIso2) {
      map.mark(targetIso2, 'correct');
      flow.answerCorrect({ fact: countryFact(targetIso2) });
    } else {
      map.mark(tappedIso2, 'wrong');
      map.mark(targetIso2, 'reveal');
      map.zoomToCountry(targetIso2, 30);
      // Hinweis nur, wenn das angetippte Land einen Namen hat
      const hint = countryName(tappedIso2) !== tappedIso2
        ? tp('game.wrongMapHint', isPlural(tappedIso2), { country: tappedIso2 })
        : '';
      flow.answerWrong({
        title: tp('game.wrongMap', isPlural(targetIso2), { hint, country: targetIso2 }),
        speech: tp('game.wrongMapSpeech', isPlural(targetIso2), { hint, country: targetIso2 }),
      });
    }
  };

  return {
    start: showQuestion,
    stop: flow.stop,
  };
}
