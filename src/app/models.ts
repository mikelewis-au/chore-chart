import { SPRITES, SPRITE_PREFIX, SPRITE_VALUES } from './avatars';
import type { PickerGroup } from './emoji-picker/emoji-picker';
import { isWeekend } from './week';

export type ChoreKind = 'daily' | 'weekly';

export interface Chore {
  id: string;
  name: string;
  emoji: string;
  kind: ChoreKind;
  // Optional so chores saved before this existed load as every-day.
  weekdaysOnly?: boolean;
}

export function dueOn(chore: Chore, day: Date): boolean {
  return !chore.weekdaysOnly || !isWeekend(day);
}

export interface Kid {
  id: string;
  name: string;
  emoji: string;
  colour: string;
  prize: string;
  prizeThreshold: number;
  chores: Chore[];
  // Optional so kids saved before this existed load with the chart off.
  toilet?: ToiletChart;
}

export type ChartStyle = 'every-go' | 'dry-days';

export interface ToiletChart {
  enabled: boolean;
  goal: number;
  reward: string;
  // Optional so charts saved before dry days existed stay on a sticker for every go.
  style?: ChartStyle;
  perRow?: number;
  rows?: number;
  smallPrize?: string;
  bigPrize?: string;
  bigPrizeCoins?: number;
}

export const DEFAULT_TOILET: ToiletChart = { enabled: false, goal: 10, reward: '' };
export const DEFAULT_DRY = { perRow: 5, rows: 4, bigPrizeCoins: 3 };

export interface Sticker {
  emoji: string;
  at: number;
}

export interface DryEntry {
  sticker?: string;
  // Set alongside any sticker from earlier that day, so removing the accident gives the day back.
  accident?: true;
  at: number;
}

export type CoinChoice = 'spent' | 'saved';

export interface DryChart {
  entries: Record<string, DryEntry>; // ISO date -> that day
  choices: Record<number, CoinChoice>; // full row index -> what its coin went on
  // Copied from the settings on the first entry.
  perRow?: number;
  rows?: number;
  // First day this chart counts, so starting a new chart can't count a day twice.
  startedOn?: string;
}

export type BoardMode = 'chores' | 'toilet';

export const STICKER_GAP_MS = 10 * 60_000;

export interface AppState {
  version: 1;
  kids: Kid[];
  activeKidId: string | null;
  done: Record<string, true>;
  soundOn: boolean;
  cooldown: CooldownId;
  lockSettings: boolean;
  celebrated: Record<string, number>;
  stickers: Record<string, Sticker[]>;
  lastStickerAt: Record<string, number>;
  boardMode: Record<string, BoardMode>;
  dryCharts: Record<string, DryChart>;
  // Kid id -> saved coins, kept across charts.
  coins: Record<string, number>;
}

export type CooldownId = 'off' | '1m' | '10m' | '1h' | 'once';

export interface CooldownOption {
  id: CooldownId;
  label: string;
  ms: number;
  hint: string;
}

// How long before the same chore may celebrate again: 0 replays every tick, Infinity means one celebration ever.
export const COOLDOWNS: CooldownOption[] = [
  { id: 'off', label: 'Always', ms: 0, hint: 'Every tick sets off a celebration.' },
  { id: '1m', label: '1 min', ms: 60_000, hint: 'Re-ticking a chore within a minute stays quiet.' },
  { id: '10m', label: '10 min', ms: 600_000, hint: 'Re-ticking a chore within ten minutes stays quiet.' },
  { id: '1h', label: '1 hour', ms: 3_600_000, hint: 'Re-ticking a chore within an hour stays quiet.' },
  { id: 'once', label: 'Once', ms: Number.POSITIVE_INFINITY, hint: 'Each chore celebrates once and never again.' },
];

export const DEFAULT_COOLDOWN: CooldownId = '10m';

export function cooldownMs(id: CooldownId): number {
  return COOLDOWNS.find((c) => c.id === id)?.ms ?? 0;
}

export const KID_COLOURS = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

const items = (spec: string): { value: string; label: string }[] =>
  spec
    .trim()
    .split('\n')
    .map((line) => {
      const [value, ...label] = line.trim().split(' ');
      return { value, label: label.join(' ') };
    });

export const AVATAR_GROUPS: PickerGroup[] = [
  {
    label: 'Characters',
    items: SPRITE_VALUES.map((value) => ({ value, label: SPRITES[value.slice(SPRITE_PREFIX.length)].name })),
  },
  {
    label: 'Animals',
    items: items(`
      🦄 unicorn
      🦖 t-rex dinosaur
      🦕 dinosaur
      🐲 dragon
      🐉 dragon
      🐼 panda
      🦊 fox
      🐸 frog
      🐯 tiger
      🐨 koala
      🦁 lion
      🐻 bear
      🐰 rabbit bunny
      🐵 monkey
      🐶 dog puppy
      🐱 cat kitten
      🐮 cow
      🐷 pig
      🐔 chicken
      🐧 penguin
      🦉 owl
      🦩 flamingo
      🦋 butterfly
      🐝 bee
      🐞 ladybug
      🐙 octopus
      🦀 crab
      🐳 whale
      🐬 dolphin
      🦈 shark
      🐢 turtle
      🦎 lizard
      🐺 wolf
      🐹 hamster
    `),
  },
  {
    label: 'Heroes and magic',
    items: items(`
      🦸 superhero
      🦹 villain
      🧙 wizard
      🧚 fairy
      🧜‍♀️ mermaid
      🥷 ninja
      🧑‍🚀 astronaut
      🤖 robot
      👾 alien monster
      👻 ghost
      🎮 gamer
      🚀 rocket
      ⚡ lightning
      🔥 fire
      🌟 star
      🍄 mushroom
      🎃 pumpkin
      🧟 zombie
      🏴‍☠️ pirate
    `),
  },
];

export const KID_AVATARS = AVATAR_GROUPS.flatMap((g) => g.items.map((i) => i.value));

const sprites = (...keys: string[]) => keys.map((key) => ({ value: SPRITE_PREFIX + key, label: SPRITES[key].name }));

export const STICKER_GROUPS: PickerGroup[] = [
  {
    label: 'Superheroes',
    items: [
      ...sprites('webHero', 'nightHero', 'greenGiant', 'starShield', 'armourHero', 'thunderHammer'),
      ...items(`
        🦸 superhero
        🦸‍♀️ superhero
        🦹 villain
        ⚡ lightning
      `),
    ],
  },
  {
    label: 'Battle tops',
    items: [
      ...sprites('blazeTop', 'stormTop', 'venomTop', 'goldTop'),
      ...items(`
        🌀 spin
        💥 boom
      `),
    ],
  },
  {
    label: 'Speedy hedgehog',
    items: sprites('blueSpeedster', 'twinTailFox', 'redBrawler', 'goldRing', 'powerGem'),
  },
  {
    label: 'Pocket monsters',
    items: sprites(
      'sparky',
      'catchMoment',
      'ember',
      'flameWing',
      'catchBall',
      'greatBall',
      'bulbBuddy',
      'bubbleTurtle',
      'jetTurtle',
      'puffball',
      'songPuff',
      'grinGhost',
      'fluffFox',
      'puzzleDuck',
      'snoozeGiant',
      'luckyCat',
    ),
  },
  {
    label: 'Mushroom kingdom',
    items: sprites('hero', 'greenCap', 'mushroom', 'powerStar', 'coin', 'questionBlock', 'fireFlower', 'greenPipe', 'dino', 'shelly'),
  },
  {
    label: 'Classics',
    items: items(`
      ⭐ star
      🌟 sparkle
      🦄 unicorn
      🦖 dinosaur
      🚀 rocket
      🌈 rainbow
      🐸 frog
      🐼 panda
      🍭 lollipop
      🎈 balloon
      🦋 butterfly
      🐳 whale
      🍩 doughnut
      💖 heart
      🐙 octopus
    `),
  },
];

export const STICKERS = STICKER_GROUPS.flatMap((g) => g.items.map((i) => i.value));

export const CHORE_GROUPS: PickerGroup[] = [
  {
    label: 'Around the house',
    items: items(`
      🛏️ make bed
      🧹 sweep tidy clean
      🧽 wipe clean
      🧺 laundry washing
      👕 clothes
      🧦 socks
      🗑️ bins rubbish trash
      🍽️ dishes table
      🥣 breakfast bowl
      🧻 toilet paper
      🚽 toilet
      🪟 windows
      🧼 soap wash
      🪣 bucket mop
      🛒 shopping
      📦 box pack
      🔑 keys
      🚪 door
      🧸 toys
      🪴 plant
      🌱 garden water
      🌳 garden tree
      🍂 leaves
      🚗 car
    `),
  },
  {
    label: 'Looking after me',
    items: items(`
      🪥 brush teeth
      🛁 bath
      🚿 shower
      💇 hair
      👟 shoes
      🎒 school bag
      🛌 bedtime
      ⏰ wake up alarm
      😴 sleep
      🧴 sunscreen
      💊 medicine vitamins
      🧢 hat
      🧥 jacket coat
    `),
  },
  {
    label: 'Pets',
    items: items(`
      🐶 dog
      🦮 walk dog
      🐱 cat
      🐰 rabbit bunny
      🐹 hamster guinea pig
      🐟 fish
      🐦 bird
      🐔 chickens eggs
      🐴 horse
      🦎 lizard
      🐢 turtle
      🐾 pets paws
    `),
  },
  {
    label: 'School and play',
    items: items(`
      📚 reading book
      ✏️ homework writing
      🔤 spelling
      🔢 maths
      🎹 piano
      🎸 guitar
      🎻 violin
      🥁 drums
      🎤 singing
      ⚽ football soccer
      🏀 basketball
      🏊 swimming
      🚲 bike
      🏃 run exercise
      🧩 puzzle
      🎨 art painting
      🖍️ colouring drawing
      🎮 games
      💻 computer
      📱 screen time
      🎲 board game
    `),
  },
  {
    label: 'Food',
    items: items(`
      🍎 fruit apple
      🥕 veggies carrot
      🥗 salad veggies
      🥪 lunch sandwich
      🍱 lunchbox
      🍳 cook
      🥛 milk drink
      💧 water drink
      🧃 juice
      🍪 snack biscuit
      🧁 baking
      🍕 dinner
    `),
  },
  {
    label: 'Fun',
    items: items(`
      ⭐ star
      🌟 sparkle
      ✨ magic
      🏆 trophy
      🎯 target goal
      🚀 rocket
      💪 strong
      👍 thumbs up
      ❤️ heart love
      🔥 fire
      🌈 rainbow
      🎉 party
      🙏 thanks
      🤝 help
      🫶 kindness
      😊 smile happy
      🎁 gift
      💌 letter
    `),
  },
];

const EMOJI_HINTS: [RegExp, string][] = [
  [/bed/i, '🛏️'],
  [/dish|table|plate/i, '🍽️'],
  [/walk/i, '🦮'],
  [/dog|pupp/i, '🐶'],
  [/cat|kitt|litter/i, '🐱'],
  [/teeth|tooth|brush/i, '🪥'],
  [/bin|trash|rubbish|garbage/i, '🗑️'],
  [/room|tidy|clean|vacuum|sweep/i, '🧹'],
  [/read|book/i, '📚'],
  [/sock/i, '🧦'],
  [/cloth|laundry|wash/i, '👕'],
  [/bath/i, '🛁'],
  [/shower/i, '🚿'],
  [/homework|study|writ/i, '✏️'],
  [/spell/i, '🔤'],
  [/math/i, '🔢'],
  [/plant|water|garden/i, '🌱'],
  [/toy|lego/i, '🧸'],
  [/piano|keyboard/i, '🎹'],
  [/guitar/i, '🎸'],
  [/violin/i, '🎻'],
  [/drum/i, '🥁'],
  [/practi[cs]e|music/i, '🎵'],
  [/bag|school/i, '🎒'],
  [/lunch|sandwich/i, '🥪'],
  [/dinner|tea\b/i, '🍕'],
  [/veg|fruit|salad/i, '🥗'],
  [/bike/i, '🚲'],
  [/swim/i, '🏊'],
  [/soccer|football/i, '⚽'],
  [/shoe/i, '👟'],
  [/hair/i, '💇'],
  [/fish/i, '🐟'],
  [/chicken|egg/i, '🐔'],
  [/toilet|loo\b/i, '🚽'],
  [/screen|ipad|tablet|phone/i, '📱'],
  [/sleep|nap/i, '😴'],
  [/wake|alarm/i, '⏰'],
  [/car\b/i, '🚗'],
];

export function guessEmoji(name: string): string {
  return EMOJI_HINTS.find(([re]) => re.test(name))?.[1] ?? '⭐';
}
