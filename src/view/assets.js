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

export async function loadAssets() {
  const sprites = {};
  for (const [name, sprite] of Object.entries(SPRITES)) sprites[name] = paintSprite(sprite);
  const catFrames = await Promise.all(
    Array.from({ length: 35 }, (_, i) => loadImage(`assets/cat-frames/f${String(i).padStart(2, '0')}.png`)),
  );
  return { catFrames, sprites };
}
