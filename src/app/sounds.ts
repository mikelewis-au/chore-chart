// All sounds are synthesised with the Web Audio API so the app stays small and works offline.
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    // Browsers keep the context suspended until a user gesture; every call here happens inside a tap.
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  freq: number;
  to?: number;
  type?: OscillatorType;
  start?: number;
  dur?: number;
  gain?: number;
}

function tone(c: AudioContext, { freq, to, type = 'sine', start = 0, dur = 0.15, gain = 0.25 }: ToneOpts): void {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

interface NoiseOpts {
  start?: number;
  dur?: number;
  gain?: number;
  from?: number;
  to?: number;
}

function noise(c: AudioContext, { start = 0, dur = 0.3, gain = 0.15, from = 800, to = 4000 }: NoiseOpts): void {
  const t0 = c.currentTime + start;
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.9;
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
}

const play = (fn: (c: AudioContext) => void) => () => {
  const c = audio();
  if (c) fn(c);
};

export const pop = play((c) => {
  tone(c, { freq: 480, to: 980, dur: 0.12, gain: 0.3 });
  noise(c, { dur: 0.08, gain: 0.08, from: 2000, to: 6000 });
});

export const sparkle = play((c) => {
  [1319, 1568, 2093, 2637].forEach((f, i) => tone(c, { freq: f, type: 'triangle', start: i * 0.06, dur: 0.14, gain: 0.18 }));
});

export const chime = play((c) => {
  tone(c, { freq: 660, dur: 0.22, gain: 0.22 });
  tone(c, { freq: 880, start: 0.14, dur: 0.32, gain: 0.22 });
});

export const whoosh = play((c) => {
  noise(c, { dur: 0.55, gain: 0.2, from: 250, to: 3500 });
  tone(c, { freq: 180, to: 1400, type: 'sawtooth', dur: 0.45, gain: 0.06 });
});

export const party = play((c) => {
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, { freq: f, type: 'triangle', start: i * 0.05, dur: 0.1, gain: 0.2 }));
});

export const boom = play((c) => {
  for (let i = 0; i < 3; i++) {
    tone(c, { freq: 140, to: 40, start: i * 0.22, dur: 0.35, gain: 0.45 });
    noise(c, { start: i * 0.22, dur: 0.3, gain: 0.12, from: 2500, to: 200 });
  }
});

export const boing = play((c) => {
  tone(c, { freq: 420, to: 140, type: 'triangle', dur: 0.22, gain: 0.25 });
  tone(c, { freq: 140, to: 620, type: 'triangle', start: 0.2, dur: 0.25, gain: 0.22 });
});

export const fanfare = play((c) => {
  [523, 659, 784, 1047].forEach((f, i) => tone(c, { freq: f, type: 'triangle', start: i * 0.13, dur: 0.28, gain: 0.22 }));
  [523, 659, 784, 1047, 1319].forEach((f) => tone(c, { freq: f, type: 'triangle', start: 0.55, dur: 1.1, gain: 0.12 }));
  tone(c, { freq: 262, type: 'square', start: 0.55, dur: 1.1, gain: 0.04 });
  noise(c, { start: 0.55, dur: 0.9, gain: 0.08, from: 1000, to: 6000 });
});
