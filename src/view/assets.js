import { MONSTER_FRAME_NAMES } from './monster-animation.js';
import { WEAPONS } from '../combat/catalog.js';

const OUTLINE = '#22161a';

const cake = inner => `..k${inner}k..`;

export const SPRITES = {
  walker: {
    scale: 2,
    palette: { k: OUTLINE, c: '#8a4a1e', y: '#f2c14e', l: '#ffe39a', w: '#ffffff', e: '#1a1010', d: '#c98a2a' },
    rows: [
      '......kkkkk......',
      '....kkccccckk....',
      '...kccccccccck...',
      '..kyycccccccyyk..',
      '..kyyyyyyyyyyyk..',
      '.kyywwyyyyywwyyk.',
      '.kyyweyyyyyweyyk.',
      '.kyyweyyyyyweyyk.',
      '.kyyyyyykyyyyyyk.',
      'kyllyyyyyyyyyylyk',
      'klllyyyyyyyyyyllk',
      'kyyyyyyyyyyyyyyyk',
      'kyyyyyyyyyyyyyyyk',
      'kdddddddddddddddk',
      '.kkkkkkkkkkkkkkk.'
    ]
  },
  flyer: {
    scale: 2,
    palette: { k: OUTLINE, p: '#ff7fb0', b: '#d9924a', r: '#ff4d4d', g: '#6de06d', w: '#ffffff', e: '#1a1010', m: '#7a4ab0' },
    rows: [
      '....kkkkkkk....',
      '..kkpppppppkk..',
      '.kpprpppgppppk.',
      'kmkpwwpppwwpkmk',
      'kmmpwepppwepmmk',
      'kmmppppkppppmmk',
      'kmkbpppppppbkmk',
      '.k.kbbbbbbbbk.k',
      '...kbbbbbbbk...',
      '....kbbbbbk....',
      '.....kkkkk.....'
    ]
  },
  shooter: {
    scale: 2,
    palette: { k: OUTLINE, r: '#e84a5f', R: '#a8283c', w: '#ffffff', e: '#1a1010', h: '#ff9aa8', g: '#9aa0ae', G: '#4a4e58' },
    rows: [
      '......kkkk......',
      '.....krrrrk.....',
      '....krhrrwrk....',
      '...krhrrwwrrk...',
      '..krrrrwwrrrrk..',
      '..krwwerrwwerk..',
      '..krrrrrrrrrrkGG',
      '..krrrkkkkrrrkgg',
      '..kRrrrrrrrrRkGG',
      '..kRRrrrrrrRRk..',
      '...kRRRRRRRRk...',
      '....kkkkkkkk....',
      '......kwwk......',
      '......kwrk......',
      '......kwwk......',
      '......krwk......',
      '....kkkkkkkk....',
      '....kGGGGGGk....'
    ]
  },
  boss: {
    scale: 4,
    palette: {
      k: OUTLINE, w: '#fff4e0', W: '#e8d2b0', p: '#ff8fb8', P: '#d9568a', c: '#b0643a', C: '#7a3f22',
      r: '#e02a3a', h: '#ffffff', E: '#1a1010', m: '#4a1010', G: '#c9ccd6'
    },
    rows: [
      '...........kk...........',
      '..........krrk..........',
      '.........krhrrk.........',
      '.........krrrrk.........',
      '....kkkkkkkkkkkkkkkk....',
      '...kwwwwwwwwwwwwwwwwk...',
      '..kwwhwwwwwwwwwwwwwwwk..',
      cake('wwwwpwwwwwpwwwwpww'),
      cake('pwwpppwwwpppwwpppp'),
      cake('pppPppppppPpppppPp'),
      cake('cccccccccccccccccc'),
      cake('ccwwwcccccccwwwccc'),
      cake('ccwEEcccccccwEEccc'),
      cake('cccccccccccccccccc'),
      cake('ccccckmmmmmmkccccc'),
      cake('ccccckmhmhmhkccccc'),
      cake('cccccckkkkkkcccccc'),
      cake('WWWWWWWWWWWWWWWWWW'),
      cake('wwwwwwwwwwwwwwwwww'),
      cake('CCCCCCCCCCCCCCCCCC'),
      cake('CCcCCCCcCCCCCcCCCC'),
      cake('CCCCCCCCCCCCCCCCCC'),
      '..kkkkkkkkkkkkkkkkkkkk..',
      '.kGGGGGGGGGGGGGGGGGGGGk.'
    ]
  },
  icecream: {
    scale: 2,
    palette: { k: OUTLINE, w: '#fff6e8', h: '#ffffff', p: '#ff9ec4', y: '#e0a050', Y: '#a8692a' },
    rows: [
      '...kkkk.....',
      '..kwwwwk....',
      '.kwwhwwwk...',
      '.kwwwwwwk...',
      'kppppppppk..',
      '.kyYyYyYk...',
      '.kYyYyYyk...',
      '..kyYyYk....',
      '..kYyYyk....',
      '...kyYk.....',
      '...kYyk.....',
      '....kk......'
    ]
  },
  crossbow: {
    scale: 2,
    palette: { k: OUTLINE, b: '#8a5a2a', B: '#5a3618', s: '#e8e8e8' },
    rows: [
      '....kk........',
      '....kbk.......',
      '....kbsk......',
      'kbbbbbbbbbbbbk',
      'kBBBBBBBBBBBBk',
      '....kbsk......',
      '....kbk.......',
      '....kk........'
    ]
  },
  yarn: {
    scale: 2,
    palette: { k: OUTLINE, r: '#d84a8a', R: '#962e5e', h: '#ff9ac8' },
    rows: [
      '...kkkk...',
      '..krhrrk..',
      '.krhRrrRk.',
      'krhRrrRrrk',
      'krRrrRrrRk',
      'kRrrRrrRrk',
      'krrRrrRrRk',
      '.kRrrRrrk.',
      '..kRRrRk..',
      '...kkkk...'
    ]
  },
  sword: {
    scale: 2,
    palette: { k: OUTLINE, s: '#dfe8f2', S: '#8a98ac', h: '#f2c14e', g: '#6a3a1e' },
    rows: [
      '...k..............',
      '..khk.kkkkkkkkkk..',
      'kgghhksssssssssssk',
      'kgghhkSSSSSSSSSSk.',
      '..khk.kkkkkkkkkk..',
      '...k..............'
    ]
  },
  hammer: {
    scale: 2,
    palette: { k: OUTLINE, g: '#6a3a1e', h: '#c9ccd6', p: '#ff8fb8' },
    rows: [
      '..........kkkkkk..',
      '.........khhhhhhk.',
      'kggggggggkhpppphk.',
      'kggggggggkhpppphk.',
      '.........khhhhhhk.',
      '..........kkkkkk..'
    ]
  },
  laser: {
    scale: 2,
    palette: { k: OUTLINE, s: '#e8e8f0', r: '#ff5a4a', R: '#c03028', h: '#ffd0c8' },
    rows: [
      'kkkkkkkkkkkkk...',
      'kssssssssrrRhk..',
      'kssssssssrrRhk..',
      'kkkkkkkkkkkkk...'
    ]
  },
  bomb: {
    scale: 2,
    palette: { k: OUTLINE, G: '#5a6a72', g: '#8fd8a0', y: '#ffd23f' },
    rows: [
      '....kk....',
      '...kyyk...',
      '....kk....',
      '..kkkkkk..',
      '.kGGGGGGk.',
      'kGGgGGgGGk',
      'kGgGGgGGGk',
      'kGGGGGGGGk',
      '.kGGGGGGk.',
      '..kkkkkk..'
    ]
  },
  hopper: {
    scale: 2,
    palette: { k: OUTLINE, g: '#6de06d', G: '#2e9e46', l: '#c8ff9a', w: '#ffffff', e: '#1a1010' },
    rows: [
      '..k.........k..',
      '.kgk.......kgk.',
      '.kggk.....kggk.',
      '.kgggggggggggk.',
      'kgglggggggglggk',
      'kggwwegggewwggk',
      'kggwwegggewwggk',
      'kggggggkggggggk',
      'kgllgggggggllgk',
      'kGgggggggggggGk',
      'kGGGGGGGGGGGGGk',
      '.kkkkkkkkkkkkk.',
      '.kGk.......kGk.',
      '..k.........k..'
    ]
  },
  charger: {
    scale: 2,
    palette: { k: OUTLINE, b: '#8a5a2a', B: '#5a3618', r: '#e02a3a', t: '#f0ecd8', w: '#ffffff', e: '#1a1010' },
    rows: [
      '....kkkkkkkkkkkk....',
      '..kkbbbbbbbbbbbbkk..',
      '.kbbrrbbbbbbbbrrbbk.',
      '.kbbrrbbbbbbbbrrbbk.',
      'kbbwwbbbbbbbbwwbbbbk',
      'kbbwebbbbbbbbewbbbbk',
      'kbbbbbbkkkkbbbbbbbbk',
      'kbbbbbkttttkbbbbbbbk',
      'kbbbbbkttttkbbbbbbbk',
      'kBbbbbbbbbbbbbbbbbBk',
      'kBBbbbbbbbbbbbbbbBBk',
      'kBBBBBBBBBBBBBBBBBBk',
      '.kkkkkkkkkkkkkkkkkk.',
      '..kBk..........kBk..',
      '..kBk..........kBk..',
      '..kkk..........kkk..'
    ]
  },
  lobber: {
    scale: 2,
    palette: { k: OUTLINE, o: '#e08a3a', O: '#a85a1e', l: '#ffd9a0', w: '#ffffff', e: '#1a1010', t: '#8a5a2a' },
    rows: [
      '..k.........k..',
      '.kok.......kok.',
      '.kook.....kook.',
      '.koooooooooook.',
      'koolooolooolook',
      'kowweoooooewwok',
      'kowweoooooewwok',
      'kooookkkkkooook',
      'koloookttkooolk',
      'kOoooktttkoooOk',
      'kOOooookkoooOOk',
      'kOOOoooooooOOOk',
      '.kOOOOOOOOOOOk.',
      '..kkkkkkkkkkk..',
      '..kOk.....kOk..',
      '..kkk.....kkk..'
    ]
  },
  coin: {
    scale: 2,
    palette: { k: OUTLINE, y: '#ffd23f', h: '#fff3a0', Y: '#c8961a' },
    rows: [
      '..kkkk..',
      '.kyyyyk.',
      'kyhyyyYk',
      'kyhyyyYk',
      'kyhyyyYk',
      'kyyyyyYk',
      '.kYYYYk.',
      '..kkkk..'
    ]
  },
  chest: {
    scale: 2,
    palette: { k: OUTLINE, b: '#9a5a2a', B: '#6a3a18', g: '#f2c14e' },
    rows: [
      '.kkkkkkkkkkkkkk.',
      'kbbbbbbbbbbbbbbk',
      'kbBbbbbbbbbbbBbk',
      'kbBbbbbbbbbbbBbk',
      'kkkkkkkggkkkkkkk',
      'kbBbbbkggkbbbBbk',
      'kbBbbbbkkbbbbBbk',
      'kbBbbbbbbbbbbBbk',
      'kbBbbbbbbbbbbBbk',
      'kbBbbbbbbbbbbBbk',
      'kbBbbbbbbbbbbBbk',
      'kbBbbbbbbbbbbBbk',
      'kBBBBBBBBBBBBBBk',
      '.kkkkkkkkkkkkkk.'
    ]
  }
};

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function paintSprite({ rows, palette, scale }) {
  const canvas = makeCanvas(rows[0].length * scale, rows.length * scale);
  const ctx = canvas.getContext('2d');
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = palette[ch];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    });
  });
  return canvas;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`failed to load ${src}`));
    image.src = src;
  });
}

const TERRAIN_SHARED = ['bridge', 'torch', 'banner', 'fence', 'crate', 'tower', 'fall', 'pool'];
const TERRAIN_THEMED = ['cap', 'body', 'edgeL', 'edgeR'];
const TERRAIN_THEMES = ['grass', 'dusk', 'castle'];

async function loadTerrain() {
  const terrain = {};
  const jobs = [];
  for (const n of TERRAIN_SHARED) jobs.push(loadImage(`assets/terrain/${n}.png`).then(img => { terrain[n] = img; }));
  for (const n of TERRAIN_THEMED) {
    terrain[n] = {};
    for (const t of TERRAIN_THEMES) {
      jobs.push(loadImage(`assets/terrain/${n}${t === 'grass' ? '' : `-${t}`}.png`).then(img => { terrain[n][t] = img; }));
    }
  }
  for (const layer of ['far', 'mid']) {
    terrain[layer] = {};
    for (const t of TERRAIN_THEMES) jobs.push(loadImage(`assets/terrain/${layer}-${t}.png`).then(img => { terrain[layer][t] = img; }));
  }
  await Promise.all(jobs);
  return terrain;
}

export async function loadAssets() {
  const sprites = {};
  for (const name of [...Object.keys(WEAPONS), 'coin', 'chest']) sprites[name] = paintSprite(SPRITES[name]);
  const [catFrames, frames, terrain] = await Promise.all([
    Promise.all(Array.from({ length: 35 }, (_, i) => loadImage(`assets/cat-frames/f${String(i).padStart(2, '0')}.png`))),
    Promise.all(MONSTER_FRAME_NAMES.map(name => loadImage(`assets/monster-frames/${name}.png`))),
    loadTerrain()
  ]);
  const monsterFrames = Object.fromEntries(MONSTER_FRAME_NAMES.map((name, i) => [name, frames[i]]));
  return { catFrames, sprites, monsterFrames, terrain };
}
