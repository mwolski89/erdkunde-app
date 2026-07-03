// Kleine synthetische Sounds über die WebAudio-API – keine Audiodateien nötig.
// iOS erlaubt Ton erst nach einer Nutzeraktion, deshalb unlock() beim Start-Tap.

let ctx = null;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(freq, startIn, duration, type = 'sine', volume = 0.12) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + startIn;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

export const sounds = {
  correct() {
    tone(660, 0, 0.15, 'triangle');
    tone(880, 0.12, 0.25, 'triangle');
  },
  wrong() {
    tone(220, 0, 0.3, 'sawtooth', 0.08);
    tone(180, 0.15, 0.35, 'sawtooth', 0.08);
  },
  fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.15, 0.3, 'triangle'));
  },
};
