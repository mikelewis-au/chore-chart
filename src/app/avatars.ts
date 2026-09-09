export interface Sprite {
  name: string;
  palette: Record<string, string>;
  rows: string[];
}

export interface Pixel {
  x: number;
  y: number;
  c: string;
}

export const SPRITE_PREFIX = 'px:';
export const SPRITE_SIZE = 12;

const K = '#222222';

// Original 12x12 characters. '.' is transparent; other letters map to the palette.
export const SPRITES: Record<string, Sprite> = {
  hero: {
    name: 'Red cap hero',
    palette: { R: '#e53935', H: '#5d4037', S: '#ffcc99', K, M: '#c62828', B: '#1e88e5', W: '#ffffff' },
    rows: [
      '....RRRRR...',
      '...RRRRRRRR.',
      '..RRRRRRRRRR',
      '...HHSSSSSS.',
      '...HSSKSSKS.',
      '...HSSSSSSS.',
      '....SSMMSS..',
      '....SSSSSS..',
      '...BBBBBBBB.',
      '..SBBBWBBBBS',
      '...BBBBBBBB.',
      '...KK....KK.',
    ],
  },
  dino: {
    name: 'Green dino',
    palette: { G: '#43a047', D: '#2e7d32', W: '#e8f5e9', K, O: '#fb8c00' },
    rows: [
      '.....GGGGG..',
      '....GGGGGGG.',
      '...GGWKGGGGG',
      '...GGGGGGGGG',
      '..GGGGGGGGGG',
      '..GGKGGGGGGG',
      '...GGGGGGG..',
      '..OGGWWWGG..',
      '.OGGGWWWGGG.',
      '..GGGWWWGGGO',
      '..GGGGGGGGGO',
      '..DD....DD..',
    ],
  },
  sparky: {
    name: 'Sparky',
    palette: { Y: '#fdd835', K, P: '#ef5350', B: '#8d6e63' },
    rows: [
      '..K......K..',
      '..YY....YY..',
      '..YYY..YYY..',
      '..YYYYYYYY..',
      '.YYYYYYYYYY.',
      '.YYKYYYYKYY.',
      '.YPYYYYYYPY.',
      '.YYYYKKYYYY.',
      '..YYYYYYYY..',
      '.YYYYYYYYYYB',
      '.YYBYYYYBYY.',
      '..YY....YY..',
    ],
  },
  ember: {
    name: 'Ember',
    palette: { O: '#fb8c00', C: '#ffe0b2', K, F: '#ffeb3b', R: '#f4511e' },
    rows: [
      '..........F.',
      '.........RFF',
      '....OOOO.RF.',
      '...OOOOOOOO.',
      '...OKOOKOO..',
      '...OOOOOOO..',
      '....OOOOO...',
      '...OCCCCCO..',
      '..OOCCCCCOO.',
      '...OCCCCCO..',
      '...OOOOOOO..',
      '...OO...OO..',
    ],
  },
  shelly: {
    name: 'Shelly',
    palette: { G: '#66bb6a', L: '#1e88e5', l: '#64b5f6', K, W: '#ffffff' },
    rows: [
      '............',
      '.....LLLLL..',
      '....LlLlLLL.',
      '...LlLlLlLLL',
      '...LLLLLLLLL',
      'GG.LlLlLlLLL',
      'GWKLLLLLLLLL',
      'GGGGLlLlLlL.',
      '.GGGLLLLLLL.',
      '....GG..GG..',
      '............',
      '............',
    ],
  },
  mushroom: {
    name: 'Mushroom',
    palette: { R: '#e53935', W: '#ffffff', C: '#ffe0b2', K, M: '#c62828' },
    rows: [
      '....RRRR....',
      '..RRWWRRRR..',
      '.RRRWWRRWWR.',
      '.RRRRRRRWWR.',
      'RWWRRRRRRRRR',
      'RWWRRRRRRWWR',
      'RRRRRRRRRWWR',
      '..CCCCCCCC..',
      '..CCKCCKCC..',
      '..CCCCCCCC..',
      '..CCCMMCCC..',
      '...CCCCCC...',
    ],
  },
  robot: {
    name: 'Robot',
    palette: { G: '#b0bec5', D: '#607d8b', C: '#00e5ff', K, Y: '#ffd600' },
    rows: [
      '.....K......',
      '.....Y......',
      '..GGGGGGGG..',
      '.GGGGGGGGGG.',
      '.GCCGGGGCCG.',
      '.GCCGGGGCCG.',
      '.GGGGGGGGGG.',
      '.GGKKKKKKGG.',
      '..GGGGGGGG..',
      '.DDGGGGGGDD.',
      '..GGGGGGGG..',
      '..DD....DD..',
    ],
  },
  slime: {
    name: 'Slime',
    palette: { B: '#42a5f5', W: '#ffffff', K },
    rows: [
      '............',
      '............',
      '.....BB.....',
      '....BBBB....',
      '...BBBBBB...',
      '..BBBBBBBB..',
      '.BBWKBBBWKB.',
      '.BBBBBBBBBB.',
      '.BBBBKKBBBB.',
      '.BBBBBBBBBB.',
      '..BBBBBBBB..',
      '...BBBBBB...',
    ],
  },
};

export function isSprite(value: string): boolean {
  return value.startsWith(SPRITE_PREFIX) && SPRITES[value.slice(SPRITE_PREFIX.length)] !== undefined;
}

export function spriteName(value: string): string {
  return SPRITES[value.slice(SPRITE_PREFIX.length)]?.name ?? value;
}

export function spritePixels(value: string): Pixel[] {
  const sprite = SPRITES[value.slice(SPRITE_PREFIX.length)];
  if (!sprite) return [];
  const pixels: Pixel[] = [];
  sprite.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const c = sprite.palette[ch];
      if (c) pixels.push({ x, y, c });
    });
  });
  return pixels;
}

export const SPRITE_VALUES = Object.keys(SPRITES).map((k) => SPRITE_PREFIX + k);
