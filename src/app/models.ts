export type ChoreKind = 'daily' | 'weekly';

export interface Chore {
  id: string;
  name: string;
  emoji: string;
  kind: ChoreKind;
}

export interface Kid {
  id: string;
  name: string;
  emoji: string;
  colour: string;
  prize: string;
  prizeThreshold: number;
  chores: Chore[];
}

export interface AppState {
  version: 1;
  kids: Kid[];
  activeKidId: string | null;
  done: Record<string, true>;
  soundOn: boolean;
}

export const KID_EMOJIS = ['🦄', '🦖', '🐼', '🦊', '🐸', '🐯', '🐨', '🦁', '🐙', '🐧', '🦋', '🚀'];
export const KID_COLOURS = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
export const CHORE_EMOJIS = ['⭐', '🛏️', '🧹', '🍽️', '🐶', '🐱', '🧸', '📚', '🪥', '🗑️', '👕', '🌱', '🧺', '🎒', '🛁', '✏️', '🎹', '🥗', '🧽', '🚲'];

const EMOJI_HINTS: [RegExp, string][] = [
  [/bed/i, '🛏️'],
  [/dish|table|plate/i, '🍽️'],
  [/dog|walk/i, '🐶'],
  [/cat|litter/i, '🐱'],
  [/teeth|tooth|brush/i, '🪥'],
  [/bin|trash|rubbish|garbage/i, '🗑️'],
  [/room|tidy|clean|vacuum|sweep/i, '🧹'],
  [/read|book/i, '📚'],
  [/cloth|laundry|wash/i, '👕'],
  [/bath|shower/i, '🛁'],
  [/homework|study|spelling/i, '✏️'],
  [/plant|water|garden/i, '🌱'],
  [/toy|lego/i, '🧸'],
  [/piano|guitar|practi[cs]e|music/i, '🎹'],
  [/bag|school/i, '🎒'],
  [/lunch|dinner|veg|fruit/i, '🥗'],
  [/bike/i, '🚲'],
];

export function guessEmoji(name: string): string {
  return EMOJI_HINTS.find(([re]) => re.test(name))?.[1] ?? '⭐';
}

export function nextEmoji(current: string): string {
  const i = CHORE_EMOJIS.indexOf(current);
  return CHORE_EMOJIS[(i + 1) % CHORE_EMOJIS.length];
}
