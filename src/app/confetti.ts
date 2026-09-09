import confetti from 'canvas-confetti';

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

const EFFECTS: Effect[] = [classicBurst, starBurst, heartBurst, rocket, streamers, fireworks, critters];
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
export function cheer(x: number, y: number): void {
  let i = Math.floor(Math.random() * EFFECTS.length);
  if (i === last) i = (i + 1) % EFFECTS.length;
  last = i;
  EFFECTS[i](x, y);
  if (Math.random() < 0.7) praise(x, y);
  navigator.vibrate?.(25);
}

export function celebrate(): void {
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
