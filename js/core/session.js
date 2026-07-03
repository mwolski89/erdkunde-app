// Spielsitzung: 15 Fragen, 3 Leben, Punkte mit Kombi-Bonus.
// Bewusst unabhängig vom Spielmodus – jede Art von Frage (Land finden,
// Hauptstadt, Flagge, Multiple Choice) kann dieselbe Session verwenden.

export class GameSession {
  constructor({ questionCount = 15, lives = 3, basePoints = 100, comboBonus = 50 } = {}) {
    this.questionCount = questionCount;
    this.livesLeft = lives;
    this.basePoints = basePoints;
    this.comboBonus = comboBonus;
    this.score = 0;
    this.combo = 0; // aktuelle Serie richtiger Antworten
    this.index = 0; // 0-basierter Index der aktuellen Frage
    this.correctCount = 0;
  }

  // Richtige Antwort: Serie verlängern, Punkte mit Kombi-Bonus gutschreiben.
  answerCorrect() {
    this.combo += 1;
    const points = this.basePoints + (this.combo - 1) * this.comboBonus;
    this.score += points;
    this.correctCount += 1;
    return points;
  }

  // Falsche Antwort: Kombi-Bonus verfällt, ein Leben weniger.
  answerWrong() {
    this.combo = 0;
    this.livesLeft -= 1;
  }

  // Zur nächsten Frage. Liefert false, wenn die Session vorbei ist.
  next() {
    this.index += 1;
    return !this.finished;
  }

  get failed() {
    return this.livesLeft <= 0;
  }

  get finished() {
    return this.failed || this.index >= this.questionCount;
  }
}
