import confetti from 'canvas-confetti';
import { isSprite } from './avatars';
import { bloop, boing, boom, chime, coin, crash, drumroll, fanfare, party, pop, rising, sparkle, thud, whoosh } from './sounds';

type Effect = (x: number, y: number) => void;

const Z = 9999;
const PRAISE = ['Nice!', 'Boom!', 'Yes!', 'Legend!', 'Super!', 'Wow!', 'Ace!', 'Brilliant!', 'Go you!', 'Champion!'];

const shapes = (chars: string[], scalar = 2.5) => chars.map((text) => confetti.shapeFromText({ text, scalar }));
const origin = (x: number, y: number) => ({ x: x / window.innerWidth, y: y / window.innerHeight });

const classicBurst: Effect = (x, y) =>
  confetti({ particleCount: 70, spread: 75, startVelocity: 32, scalar: 1.1, origin: origin(x, y), zIndex: Z });

const starBurst: Effect = (x, y) =>
  confetti({ particleCount: 18, spread: 90, startVelocity: 28, scalar: 2.5, gravity: 0.8, shapes: shapes(['⭐', '🌟', '✨']), origin: origin(x, y), zIndex: Z });

const heartBurst: Effect = (x, y) =>
  confetti({ particleCount: 16, spread: 100, startVelocity: 26, scalar: 2.5, gravity: 0.6, drift: 0.2, shapes: shapes(['💖', '💛', '💚', '💙']), origin: origin(x, y), zIndex: Z });

const rocket: Effect = (x, y) => {
  confetti({ particleCount: 1, angle: 90, spread: 0, startVelocity: 75, gravity: 0.5, ticks: 120, scalar: 3.5, shapes: shapes(['🚀'], 3.5), origin: origin(x, y), zIndex: Z });
  confetti({ particleCount: 25, angle: 270, spread: 40, startVelocity: 18, gravity: 0.3, scalar: 0.8, colors: ['#fbbf24', '#f97316', '#ef4444'], origin: origin(x, y), zIndex: Z });
};

const streamers: Effect = (x, y) =>
  confetti({ particleCount: 90, spread: 160, startVelocity: 22, gravity: 0.45, ticks: 260, drift: 0.5, scalar: 0.9, shapes: ['circle'], colors: ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'], origin: origin(x, y), zIndex: Z });

const fireworks: Effect = () => {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      confetti({ particleCount: 45, spread: 360, startVelocity: 25, gravity: 0.7, ticks: 80, origin: { x: 0.2 + Math.random() * 0.6, y: 0.15 + Math.random() * 0.3 }, zIndex: Z });
    }, i * 220);
  }
};

const critters: Effect = (x, y) =>
  confetti({ particleCount: 12, spread: 120, startVelocity: 24, scalar: 3, gravity: 0.7, shapes: shapes(['🦄', '🐸', '🦖', '🐼', '🦊'], 3), origin: origin(x, y), zIndex: Z });

// Each animation has a matching sound; the pair is picked at random in cheer().
const EFFECTS: { fx: Effect; sound: () => void }[] = [
  { fx: classicBurst, sound: pop },
  { fx: starBurst, sound: sparkle },
  { fx: heartBurst, sound: chime },
  { fx: rocket, sound: whoosh },
  { fx: streamers, sound: party },
  { fx: fireworks, sound: boom },
  { fx: critters, sound: boing },
];
let last = -1;

function praise(x: number, y: number): void {
  const el = document.createElement('div');
  el.className = 'praise';
  el.textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.setProperty('--tilt', `${Math.round(Math.random() * 20 - 10)}deg`);
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// Random effect, never the same one twice in a row, with a praise word most of the time.
export function cheer(x: number, y: number, sound: boolean): void {
  let i = Math.floor(Math.random() * EFFECTS.length);
  if (i === last) i = (i + 1) % EFFECTS.length;
  last = i;
  EFFECTS[i].fx(x, y);
  if (sound) EFFECTS[i].sound();
  if (Math.random() < 0.7) praise(x, y);
  navigator.vibrate?.(25);
}

export function celebrate(sound: boolean): void {
  if (sound) fanfare();
  const stars = shapes(['⭐', '🎉', '🏆'], 3);
  const end = Date.now() + 3000;
  const frame = () => {
    confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, zIndex: Z });
    confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, zIndex: Z });
    confetti({ particleCount: 2, spread: 120, startVelocity: 20, origin: { x: 0.5, y: 0.3 }, shapes: stars, scalar: 3, zIndex: Z });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
  navigator.vibrate?.([60, 40, 60, 40, 120]);
}

export function splash(x: number, y: number, sound: boolean): void {
  if (sound) bloop();
  confetti({ particleCount: 10, spread: 70, startVelocity: 14, gravity: 1.1, scalar: 1.8, shapes: shapes(['💧'], 1.8), origin: origin(x, y), zIndex: Z });
}

export function coinDrop(x: number, y: number, sound: boolean): void {
  if (sound) coin();
  confetti({ particleCount: 26, spread: 70, startVelocity: 18, scalar: 0.8, colors: ['#fbbf24', '#f59e0b', '#fde68a'], origin: origin(x, y), zIndex: Z });
}

export function giftBurst(x: number, y: number, sound: boolean): void {
  if (sound) party();
  confetti({ particleCount: 14, spread: 90, startVelocity: 22, scalar: 2.2, shapes: shapes(['🎁', '🎉', '⭐'], 2.2), origin: origin(x, y), zIndex: Z });
}

export const FINALE_HOP_START_MS = 300;

// Keeps the whole sticker wave inside the drum roll, however many stickers the chart has.
export function finaleHopStep(count: number): number {
  return Math.min(70, 1150 / Math.max(1, count));
}

// Sound and confetti for a finished dry days chart; the card's overlay uses the same timings. Returns a stop function.
export function finale(sound: boolean, stickers: string[]): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
  const fire = (opts: confetti.Options) => confetti({ disableForReducedMotion: true, zIndex: Z, ...opts });
  let running = true;

  if (sound) {
    drumroll();
    rising(stickers.length, finaleHopStep(stickers.length) / 1000, FINALE_HOP_START_MS / 1000);
  }
  later(1600, () => sound && crash());
  later(1800, () => {
    if (sound) fanfare();
    const end = Date.now() + 2400;
    let lastBoom = 0;
    const frame = () => {
      if (!running) return;
      const now = Date.now();
      fire({ particleCount: 4, angle: 60, spread: 55, startVelocity: 55, origin: { x: 0, y: 0.85 } });
      fire({ particleCount: 4, angle: 120, spread: 55, startVelocity: 55, origin: { x: 1, y: 0.85 } });
      if (now - lastBoom > 380) {
        lastBoom = now;
        fire({ particleCount: 60, spread: 360, startVelocity: 26, gravity: 0.8, ticks: 90, origin: { x: 0.15 + Math.random() * 0.7, y: 0.1 + Math.random() * 0.3 } });
        if (sound) thud();
      }
      if (now < end) requestAnimationFrame(frame);
    };
    frame();
  });
  later(3000, () => {
    // Text shapes can't draw pixel sprites, so the rain uses the chart's emoji stickers only.
    const emoji = [...new Set(stickers.filter((s) => !isSprite(s)))].slice(0, 6);
    const rain = shapes(emoji.length ? emoji : ['⭐', '🌟', '🏆'], 3);
    for (let i = 0; i < 24; i++) {
      later(i * 70, () => fire({ particleCount: 3, angle: 270, spread: 30, startVelocity: 6, gravity: 0.5, ticks: 320, scalar: 3, drift: Math.random() - 0.5, shapes: rain, origin: { x: Math.random(), y: -0.05 } }));
    }
  });
  later(4000, () => {
    if (sound) party();
    navigator.vibrate?.([80, 50, 80, 50, 80, 50, 300]);
  });

  return () => {
    running = false;
    timers.forEach(clearTimeout);
  };
}
