export const VIEW = { width: 960, height: 540 };

// Palette sampled from the floating-ruins reference art: blue-grey stone,
// lush moss caps, cyan water, warm wood and heraldic red banners.
export const THEMES = {
  grass: {
    skyTop: '#79bfe8', skyBottom: '#dff2fb', sun: '#fff6d8',
    far: '#a9c2d0', farGrass: '#8fd06a', farHole: '#cfe6f2',
    mid: '#7d94a4', midDark: '#5f7684', midGrass: '#69b845', tree: '#4f9e3a', treeLight: '#7ec850',
    stone: '#8ba0ac', stoneDark: '#6b8290', stoneLight: '#a8bcc6', mortar: '#5a707c', edge: '#41565f',
    moss: '#5aa832', top: '#8fd455', topDark: '#57a832', tuft: '#b8e878', flower: '#ffd7e8',
    water: '#3fc0e8', waterLight: '#9fe8f8', waterDeep: '#2a9cc4',
    wood: '#a9743f', woodDark: '#7c5226', woodLight: '#c99a5f', rope: '#8a6a3a',
    banner: '#d84343', gold: '#f4c542', cloud: '#ffffff', mist: '#e6f4fb'
  },
  dusk: {
    skyTop: '#4a2a5e', skyBottom: '#ffb070', sun: '#ffd9a0',
    far: '#8a5a7e', farGrass: '#a8b84a', farHole: '#e8a070',
    mid: '#5e4060', midDark: '#463048', midGrass: '#86a83a', tree: '#5e7a2a', treeLight: '#96b84a',
    stone: '#8a7a72', stoneDark: '#6a5a54', stoneLight: '#a8988e', mortar: '#5a4a46', edge: '#3e3230',
    moss: '#7a9a30', top: '#a8b84a', topDark: '#6a8a2a', tuft: '#d0d878', flower: '#ffe8b0',
    water: '#e8a05a', waterLight: '#ffd0a0', waterDeep: '#c47a3a',
    wood: '#a9743f', woodDark: '#6a421e', woodLight: '#c99a5f', rope: '#8a6a3a',
    banner: '#c43a3a', gold: '#f4c542', cloud: '#ffd9b8', mist: '#f0c0a0'
  },
  castle: {
    skyTop: '#161a36', skyBottom: '#4a4a7e', sun: '#e8e8ff',
    far: '#2e3258', farGrass: '#3f8f7a', farHole: '#4a4a7e',
    mid: '#23263f', midDark: '#171a2c', midGrass: '#3f7d6a', tree: '#2d5e4a', treeLight: '#4f9e7a',
    stone: '#5a5b74', stoneDark: '#3a3b50', stoneLight: '#7a7b94', mortar: '#2e2f42', edge: '#1e1f30',
    moss: '#3f8f7a', top: '#9a9ab2', topDark: '#5e5e78', tuft: '#c0c0d8', flower: '#e8d8ff',
    water: '#7f8fd8', waterLight: '#b0c0f0', waterDeep: '#5a6ab8',
    wood: '#8a7058', woodDark: '#5a4636', woodLight: '#a89070', rope: '#6a5a42',
    banner: '#a83a4a', gold: '#d8b84a', cloud: '#8a8ab8', mist: '#3a3a5e'
  }
};

function hash(a, b) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function mixHex(a, b, u) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = sh => Math.round(((pa >> sh) & 255) * (1 - u) + ((pb >> sh) & 255) * u);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

// Opaque backdrop strips meet the painted sky with a short fade instead of a hard seam.
function fadeTop(ctx, theme, y, h) {
  const sky = mixHex(theme.skyTop, theme.skyBottom, y / VIEW.height);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, rgba(sky, 1));
  g.addColorStop(1, rgba(sky, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, y, VIEW.width, h);
}

function tileStrip(ctx, img, y, offset) {
  const first = Math.floor(offset / img.width) - 1;
  for (let i = first; i < first + Math.ceil(VIEW.width / img.width) + 2; i++) {
    ctx.drawImage(img, Math.round(i * img.width - offset), y);
  }
}

// Strip bottoms dissolve into haze so their edge never cuts across the sky.
function fadeBottom(ctx, theme, yEnd, h) {
  const sky = mixHex(theme.skyTop, theme.skyBottom, yEnd / VIEW.height);
  const g = ctx.createLinearGradient(0, yEnd - h, 0, yEnd);
  g.addColorStop(0, rgba(sky, 0));
  g.addColorStop(1, rgba(sky, 1));
  ctx.fillStyle = g;
  ctx.fillRect(0, yEnd - h, VIEW.width, h);
}

function withAlpha(ctx, alpha, fn) {
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  fn();
  ctx.globalAlpha = prev;
}

export function waterfallSpans(room) {
  const spans = [];
  const path = room.mainPath;
  for (let i = 0; i < path.length - 1; i++) {
    const gap = path[i + 1].x - (path[i].x + path[i].w);
    if (gap >= 24) spans.push({ x: path[i].x + path[i].w, w: gap, y: Math.min(path[i].y, path[i + 1].y) });
  }
  return spans;
}

const DECOR_KINDS = ['torch', 'banner', 'fence', 'bush', 'flower', 'crate'];

export function decorFor(room) {
  const zones = [];
  if (room.exit) zones.push([room.exit.x - 50, room.exit.x + room.exit.w + 50]);
  for (const c of room.chests ?? []) zones.push([c.x - 44, c.x + c.w + 44]);
  const out = [];
  room.mainPath.forEach((seg, i) => {
    if (seg.w < 120) return;
    const start = Math.max(seg.x + 28, i === 0 ? 170 : 0);
    const end = seg.x + seg.w - 28;
    for (let x = start; x <= end; x += 88) {
      const px = Math.max(start, Math.min(end, x + Math.floor(hash(x, i + 1) * 40) - 20));
      if (zones.some(([a, b]) => px >= a && px <= b)) continue;
      const r = hash(px, room.index + 13);
      const kind = DECOR_KINDS[Math.min(DECOR_KINDS.length - 1, Math.floor(r * DECOR_KINDS.length))];
      out.push({ kind, x: px, y: seg.y, v: hash(px, 77) });
    }
  });
  return out;
}

export function drawSky(ctx, theme, t) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, theme.skyTop);
  g.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const sx = 760, sy = 64;
  withAlpha(ctx, 0.25, () => { ctx.fillStyle = theme.sun; ctx.fillRect(sx - 10, sy - 10, 44, 44); });
  ctx.fillStyle = theme.sun;
  ctx.fillRect(sx, sy, 24, 24);
  ctx.fillRect(sx + 4, sy - 4, 16, 4);
  ctx.fillRect(sx + 4, sy + 24, 16, 4);
  void t;
}

export function drawFar(ctx, theme, name, camX, t, art) {
  if (art) {
    tileStrip(ctx, art.far[name], 150, camX * 0.15 + t * 3);
    fadeTop(ctx, theme, 150, 36);
    fadeBottom(ctx, theme, 150 + art.far[name].height, 46);
  } else {
  const offset = camX * 0.15 + t * 3;
  const span = 320;
  const first = Math.floor(offset / span) - 1;
  for (let i = first; i < first + 6; i++) {
    const x = Math.round(i * span - offset);
    const r = hash(i, 7);
    const top = 110 + Math.floor(r * 4) * 36;
    const w = 170 + Math.floor(r * 3) * 30;
    const h = 70 + Math.floor(hash(i, 11) * 3) * 24;
    ctx.fillStyle = theme.far;
    if (name === 'castle') {
      ctx.fillRect(x + 30, top, 40, h + 60);
      for (let b = 0; b < 3; b++) ctx.fillRect(x + 30 + b * 14, top - 10, 8, 10);
      ctx.fillRect(x + 90, top + 30, 70, h + 30);
      ctx.fillRect(x + 90, top + 20, 12, 10);
      ctx.fillRect(x + 148, top + 20, 12, 10);
    } else {
      ctx.fillRect(x, top, w, h);
      ctx.fillRect(x + 14, top + h, w - 28, 14);
      ctx.fillRect(x + 30, top + h + 14, w - 60, 10);
      ctx.fillStyle = theme.farHole;
      ctx.fillRect(x + 56, top + 26, 36, h - 26);
      ctx.fillStyle = theme.far;
      ctx.fillRect(x + 56, top + 26, 36, 8);
      ctx.fillRect(x + 56, top + 34, 6, 6);
      ctx.fillRect(x + 86, top + 34, 6, 6);
      ctx.fillRect(x + 56, top + 40, 3, 4);
      ctx.fillRect(x + 89, top + 40, 3, 4);
    }
    ctx.fillStyle = theme.farGrass;
    ctx.fillRect(x - 4, top - 6, w + 8, 8);
    for (let bx = 0; bx < w; bx += 24) {
      if (hash(i * 31 + bx, 5) < 0.5) ctx.fillRect(x + bx, top - 10, 10, 4);
    }
    ctx.fillStyle = theme.far;
    ctx.fillRect(x + 18, top - 22, 16, 16);
    ctx.fillRect(x + 22, top - 30, 8, 8);
    withAlpha(ctx, 0.55, () => {
      ctx.fillStyle = theme.water;
      ctx.fillRect(x + w - 16, top + 2, 10, 150);
      ctx.fillStyle = theme.waterLight;
      const phase = Math.floor(t * 90) % 24;
      for (let y = top + 2 - 24 + phase; y < top + 152; y += 24) {
        if (y < top + 2) continue;
        ctx.fillRect(x + w - 13, y, 3, 12);
      }
      ctx.fillStyle = theme.cloud;
      ctx.fillRect(x + w - 22, top + 148, 22, 8);
      ctx.fillRect(x + w - 16, top + 142, 12, 6);
    });
  }
  }
  const cloudOffset = camX * 0.08 + t * 8;
  const cspan = 260;
  const cfirst = Math.floor(cloudOffset / cspan) - 1;
  withAlpha(ctx, 0.85, () => {
    ctx.fillStyle = theme.cloud;
    for (let i = cfirst; i < cfirst + 6; i++) {
      const x = Math.round(i * cspan - cloudOffset);
      const y = 40 + Math.floor(hash(i, 17) * 5) * 34;
      ctx.fillRect(x, y, 92, 14);
      ctx.fillRect(x + 14, y - 8, 60, 10);
      ctx.fillRect(x + 28, y + 12, 70, 10);
    }
  });
  if (art) return;
  withAlpha(ctx, 0.35, () => {
    ctx.fillStyle = theme.cloud;
    ctx.fillRect(0, 402, VIEW.width, 138);
    for (let x = -Math.floor(camX * 0.1) % 64; x < VIEW.width; x += 64) {
      ctx.fillRect(x, 396 - Math.floor(hash(x, 23) * 3) * 6, 44, 10);
    }
  });
}

export function drawMid(ctx, theme, name, camX, t, art) {
  if (art) {
    const offset = camX * 0.45;
    tileStrip(ctx, art.mid[name], 300, offset);
    const span = art.mid[name].width;
    const first = Math.floor(offset / span) - 1;
    for (let i = first; i < first + Math.ceil(VIEW.width / span) + 2; i++) {
      if (hash(i, 57) < 0.35) ctx.drawImage(art.tower, Math.round(i * span - offset) + 40, 300 + art.mid[name].height - 273);
    }
    fadeBottom(ctx, theme, 300 + art.mid[name].height, 30);
    return;
  }
  const offset = camX * 0.45;
  const span = 220;
  const first = Math.floor(offset / span) - 1;
  for (let i = first; i < first + 7; i++) {
    const x = Math.round(i * span - offset);
    const r = hash(i, 31);
    const top = 330 + Math.floor(r * 3) * 24;
    const w = 110 + Math.floor(r * 3) * 30;
    ctx.fillStyle = theme.mid;
    ctx.fillRect(x, top, w, 34);
    ctx.fillStyle = theme.midDark;
    ctx.fillRect(x + 10, top + 34, w - 20, 12);
    ctx.fillRect(x + 24, top + 46, w - 48, 10);
    ctx.fillRect(x + 30, top + 56, 2, 12);
    ctx.fillRect(x + w - 32, top + 56, 2, 10);
    ctx.fillStyle = theme.midGrass;
    ctx.fillRect(x - 3, top - 5, w + 6, 7);
    for (let bx = 0; bx < w; bx += 20) {
      if (hash(i * 17 + bx, 9) < 0.5) ctx.fillRect(x + bx, top - 9, 8, 4);
    }
    if (name === 'castle') {
      ctx.fillStyle = theme.midDark;
      ctx.fillRect(x + 24, top - 34, 14, 30);
      ctx.fillRect(x + 24, top - 40, 4, 6);
      ctx.fillRect(x + 34, top - 40, 4, 6);
      ctx.fillRect(x + w - 44, top - 24, 12, 20);
    } else {
      ctx.fillStyle = theme.woodDark;
      ctx.fillRect(x + 26, top - 18, 6, 16);
      ctx.fillStyle = theme.tree;
      ctx.fillRect(x + 12, top - 30, 40, 16);
      ctx.fillRect(x + 18, top - 40, 28, 12);
      ctx.fillRect(x + 24, top - 48, 16, 10);
      ctx.fillStyle = theme.treeLight;
      ctx.fillRect(x + 20, top - 44, 10, 6);
      ctx.fillRect(x + 14, top - 28, 8, 5);
      ctx.fillStyle = theme.tree;
      ctx.fillRect(x + w - 34, top - 12, 20, 10);
      ctx.fillStyle = theme.treeLight;
      ctx.fillRect(x + w - 30, top - 16, 10, 6);
    }
    if (r < 0.3) {
      ctx.fillStyle = theme.woodDark;
      ctx.fillRect(x + w - 12, top - 32, 2, 30);
      ctx.fillStyle = theme.banner;
      const wave = Math.round(Math.sin(t * 3 + i) * 1);
      ctx.fillRect(x + w - 10, top - 32, 14 + wave, 9);
      ctx.fillStyle = theme.gold;
      ctx.fillRect(x + w - 6, top - 29, 3, 3);
    }
  }
}

export function drawChasm(ctx, room, theme, camX, t, art) {
  if (art) {
    for (const s of waterfallSpans(room)) {
      const sx = Math.round(s.x - camX);
      if (sx > VIEW.width + 40 || sx + s.w < -40) continue;
      const w = Math.min(s.w, 30);
      const x = sx + Math.floor((s.w - w) / 2);
      const top = s.y + 4;
      ctx.drawImage(art.fall, x, top, w, 508 - top);
      withAlpha(ctx, 0.5, () => {
        ctx.fillStyle = theme.waterLight;
        const phase = Math.floor(t * 160) % 40;
        for (let y = top - 40 + phase; y < 506; y += 40) {
          if (y < top) continue;
          ctx.fillRect(x + Math.floor(w / 2) - 1, y, 2, 18);
        }
      });
    }
    const drift = ((Math.floor(camX) % 76) + 76) % 76;
    for (let x = -drift; x < VIEW.width; x += 76) ctx.drawImage(art.pool, x, 506);
    ctx.fillStyle = theme.waterDeep;
    ctx.fillRect(0, 524, VIEW.width, 16);
    withAlpha(ctx, 0.7, () => {
      ctx.fillStyle = theme.waterLight;
      const slide = Math.floor(t * 20) % 32;
      for (let x = -slide; x < VIEW.width; x += 32) {
        ctx.fillRect(x, 508 + Math.floor(hash(x + slide, 29) * 4) * 3, 7, 2);
      }
    });
    return;
  }
  for (const s of waterfallSpans(room)) {
    const sx = Math.round(s.x - camX);
    if (sx > VIEW.width + 40 || sx + s.w < -40) continue;
    const w = Math.min(s.w, 26);
    const x = sx + Math.floor((s.w - w) / 2);
    const top = s.y + 6;
    withAlpha(ctx, 0.8, () => {
      ctx.fillStyle = theme.water;
      ctx.fillRect(x, top, w, VIEW.height - top);
    });
    withAlpha(ctx, 0.6, () => {
      ctx.fillStyle = theme.waterLight;
      for (let k = 0; k < Math.floor(w / 6); k++) {
        const phase = Math.floor(t * 160 + k * 23) % 40;
        for (let y = top - 40 + phase; y < VIEW.height; y += 40) {
          if (y < top) continue;
          ctx.fillRect(x + 2 + k * 6, y, 2, 22);
        }
      }
    });
    ctx.fillStyle = theme.waterLight;
    ctx.fillRect(x - 2, top - 2, w + 4, 4);
    withAlpha(ctx, 0.5, () => {
      ctx.fillStyle = theme.cloud;
      for (let k = 0; k < 3; k++) {
        const j = Math.floor(hash(k, s.x) * 8) - 4;
        ctx.fillRect(x - 4 + k * 8 + j, 496 + (Math.floor(t * 8 + k) % 2) * 2, 8, 5);
      }
    });
  }
  withAlpha(ctx, 0.9, () => {
    ctx.fillStyle = theme.water;
    ctx.fillRect(0, 506, VIEW.width, 34);
  });
  ctx.fillStyle = theme.waterDeep;
  ctx.fillRect(0, 528, VIEW.width, 12);
  withAlpha(ctx, 0.7, () => {
    ctx.fillStyle = theme.waterLight;
    const drift = Math.floor(t * 20) % 32;
    for (let x = -drift; x < VIEW.width; x += 32) {
      ctx.fillRect(x, 508 + Math.floor(hash(x + drift, 29) * 4) * 3, 7, 2);
    }
  });
}

export function drawCliff(ctx, p, theme, name, camX, t, art) {
  const x0 = Math.max(p.x, camX - 16);
  const x1 = Math.min(p.x + p.w, camX + VIEW.width + 16);
  if (x1 <= x0) return;
  const sx = Math.round(p.x - camX);
  if (art) {
    const cap = art.cap[name], body = art.body[name];
    ctx.fillStyle = theme.stoneDark;
    ctx.fillRect(sx, p.y + 12, p.w, VIEW.height - p.y);
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx - 14, p.y - 12, p.w + 28, VIEW.height - p.y + 16);
    ctx.clip();
    for (let by = p.y + 14; by < VIEW.height; by += 36) {
      for (let bx = 0; bx < p.w; bx += 30) {
        const bw = Math.min(30, p.w - bx);
        ctx.drawImage(body, 0, 0, bw, 36, sx + bx, by, bw, 36);
      }
    }
    for (let bx = 0; bx < p.w; bx += 46) {
      const cw = Math.min(46, p.w - bx);
      ctx.drawImage(cap, 0, 0, cw, 24, sx + bx, p.y - 10, cw, 24);
    }
    ctx.restore();
    ctx.drawImage(art.edgeL[name], sx - 12, p.y - 10);
    ctx.drawImage(art.edgeR[name], sx + p.w - 12, p.y - 10);
    return;
  }
  const h = VIEW.height - p.y + 4;
  ctx.fillStyle = theme.edge;
  ctx.fillRect(sx - 2, p.y - 2, p.w + 4, h + 2);
  ctx.fillStyle = theme.stone;
  ctx.fillRect(sx, p.y, p.w, h);
  const start = Math.floor((x0 - p.x) / 24) * 24 - 24;
  for (let gy = 16; gy < h; gy += 12) {
    const shift = (gy / 12) % 2 ? 12 : 0;
    ctx.fillStyle = theme.mortar;
    ctx.fillRect(sx, p.y + gy, p.w, 1);
    for (let gx = start; gx < x1 - p.x; gx += 24) {
      const bx = gx + shift;
      if (bx >= p.w) continue;
      const bw = Math.min(24, p.w - bx);
      const r = hash(p.x + bx, p.y + gy);
      if (r < 0.16) { ctx.fillStyle = theme.stoneDark; ctx.fillRect(sx + bx, p.y + gy + 1, bw, 11); }
      else if (r > 0.88) { ctx.fillStyle = theme.stoneLight; ctx.fillRect(sx + bx, p.y + gy + 1, bw, 11); }
      ctx.fillStyle = theme.mortar;
      ctx.fillRect(sx + bx, p.y + gy, Math.min(2, bw), 12);
      if (gy <= 40 && hash(p.x + bx, gy + 7) < 0.3) {
        ctx.fillStyle = theme.moss;
        ctx.fillRect(sx + bx + 2, p.y + gy + 1, Math.max(2, bw - 6), 4);
      } else if (r > 0.4 && r < 0.45 && bw > 14) {
        ctx.fillStyle = theme.moss;
        ctx.fillRect(sx + bx + 6, p.y + gy + 4, 8, 5);
      }
      if (r < 0.04 && bw > 12) { ctx.fillStyle = theme.edge; ctx.fillRect(sx + bx + 10, p.y + gy + 2, 2, 8); }
    }
  }
  if (name === 'castle') {
    withAlpha(ctx, 0.35, () => {
      ctx.fillStyle = theme.edge;
      for (let gx = start; gx < x1 - p.x; gx += 48) ctx.fillRect(sx + gx, p.y + 16, 2, h - 16);
    });
  }
  ctx.fillStyle = theme.top;
  ctx.fillRect(sx - 2, p.y, p.w + 4, 10);
  ctx.fillStyle = theme.topDark;
  ctx.fillRect(sx - 2, p.y + 10, p.w + 4, 4);
  for (let gx = start; gx < x1 - p.x; gx += 8) {
    const r = hash(p.x + gx, 3);
    if (r < 0.6) {
      ctx.fillStyle = r < 0.3 ? theme.tuft : theme.top;
      ctx.fillRect(sx + gx, p.y - 4, 4, 4);
    }
    if (r > 0.8) { ctx.fillStyle = theme.tuft; ctx.fillRect(sx + gx + 2, p.y - 8, 2, 6); }
    if (hash(p.x + gx, 5) < 0.07) {
      ctx.fillStyle = theme.flower;
      ctx.fillRect(sx + gx + 1, p.y - 6, 3, 3);
      ctx.fillStyle = theme.gold;
      ctx.fillRect(sx + gx + 2, p.y - 5, 1, 1);
    }
    if (hash(p.x + gx, 9) < 0.5) { ctx.fillStyle = theme.topDark; ctx.fillRect(sx + gx, p.y + 14, 4, 3); }
    if (hash(p.x + gx, 11) < 0.22) {
      ctx.fillStyle = theme.moss;
      ctx.fillRect(sx + gx, p.y + 14, 4, 6 + Math.floor(hash(p.x + gx, 13) * 10));
    }
  }
  ctx.fillStyle = theme.moss;
  const leftL = 12 + Math.floor(hash(p.x, 41) * 24);
  const rightL = 12 + Math.floor(hash(p.x + p.w, 43) * 24);
  ctx.fillRect(sx - 2, p.y + 8, 2, leftL);
  ctx.fillRect(sx + p.w, p.y + 8, 2, rightL);
  for (let y = 12; y < leftL; y += 6) ctx.fillRect(sx - 4, p.y + y, 2, 3);
  for (let y = 12; y < rightL; y += 6) ctx.fillRect(sx + p.w + 2, p.y + y, 2, 3);
  for (let gx = 24; gx < p.w - 16; gx += 48) {
    if (hash(p.x + gx, 47) < 0.35) {
      const L = 10 + Math.floor(hash(p.x + gx, 49) * 18);
      ctx.fillRect(sx + gx, p.y + 12, 2, L);
      ctx.fillRect(sx + gx - 2, p.y + 12 + L - 4, 2, 3);
      ctx.fillRect(sx + gx + 2, p.y + 12 + Math.floor(L / 2), 2, 3);
    }
  }
  void t;
}

export function drawBridge(ctx, p, theme, camX, t, art) {
  const sx = Math.round(p.x - camX);
  if (sx > VIEW.width + 40 || sx + p.w < -40) return;
  if (art) {
    ctx.drawImage(art.bridge, sx - 20, p.y - 26, p.w + 40, 64);
    return;
  }
  ctx.fillStyle = theme.woodDark;
  ctx.fillRect(sx - 2, p.y - 2, p.w + 4, p.h + 4);
  for (let bx = 0; bx < p.w; bx += 12) {
    ctx.fillStyle = (bx / 12) % 2 ? theme.wood : theme.woodLight;
    ctx.fillRect(sx + bx, p.y, Math.min(10, p.w - bx), p.h);
    ctx.fillStyle = theme.woodDark;
    if (bx + 10 < p.w) ctx.fillRect(sx + bx + 10, p.y, 2, p.h);
  }
  ctx.fillStyle = theme.woodLight;
  ctx.fillRect(sx, p.y, p.w, 2);
  ctx.fillStyle = theme.woodDark;
  ctx.fillRect(sx - 3, p.y - 16, 6, p.h + 16);
  ctx.fillRect(sx + p.w - 3, p.y - 16, 6, p.h + 16);
  ctx.fillStyle = theme.wood;
  ctx.fillRect(sx - 4, p.y - 18, 8, 3);
  ctx.fillRect(sx + p.w - 4, p.y - 18, 8, 3);
  const sway = Math.round(Math.sin(t * 2 + p.x * 0.01) * 1);
  ctx.fillStyle = theme.rope;
  const steps = 16;
  for (let k = 0; k < steps; k++) {
    const u = k / steps;
    const sag = Math.round(Math.sin(Math.PI * u) * 5);
    ctx.fillRect(sx + Math.floor(u * p.w), p.y - 14 + sag + sway, Math.ceil(p.w / steps) + 1, 2);
    ctx.fillRect(sx + Math.floor(u * p.w), p.y - 7 + Math.round(Math.sin(Math.PI * u) * 3) + sway, Math.ceil(p.w / steps) + 1, 2);
  }
  for (let bx = 12; bx < p.w - 6; bx += 24) {
    const u = bx / p.w;
    const top = p.y - 14 + Math.round(Math.sin(Math.PI * u) * 5) + sway;
    ctx.fillRect(sx + bx, top, 2, p.y - 7 + Math.round(Math.sin(Math.PI * u) * 3) + sway - top + 2);
  }
}

export function drawDecor(ctx, room, theme, camX, t, art) {
  for (const d of decorFor(room)) {
    const sx = Math.round(d.x - camX);
    if (sx > VIEW.width + 40 || sx < -60) continue;
    const y = d.y;
    if (art) {
      if (d.kind === 'torch') {
        const f = Math.floor(t * 10 + d.v * 10) % 2;
        withAlpha(ctx, 0.1 + 0.06 * f, () => { ctx.fillStyle = theme.gold; ctx.fillRect(sx - 6, y - 48, 12, 16); });
        ctx.drawImage(art.torch, sx - 8, y - 50);
        continue;
      }
      if (d.kind === 'banner') {
        ctx.fillStyle = theme.woodDark;
        ctx.fillRect(sx, y - 58, 3, 58);
        ctx.fillStyle = theme.gold;
        ctx.fillRect(sx - 1, y - 60, 5, 3);
        ctx.drawImage(art.banner, sx + 3 + Math.round(Math.sin(t * 3 + d.v * 6)), y - 56);
        continue;
      }
      if (d.kind === 'fence') { ctx.drawImage(art.fence, sx - 31, y - 18); continue; }
      if (d.kind === 'crate') { ctx.drawImage(art.crate, sx - 15, y - 28); continue; }
    }
    if (d.kind === 'torch') {
      ctx.fillStyle = theme.woodDark;
      ctx.fillRect(sx, y - 22, 4, 22);
      ctx.fillRect(sx - 2, y - 26, 8, 4);
      const f = Math.floor(t * 10 + d.v * 10) % 2;
      withAlpha(ctx, 0.18, () => { ctx.fillStyle = theme.gold; ctx.fillRect(sx - 7, y - 42, 20, 26); });
      ctx.fillStyle = '#ff7a29';
      ctx.fillRect(sx - 1, y - 34 + f, 6, 8 - f);
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(sx, y - 31 + f, 4, 5 - f);
    } else if (d.kind === 'banner') {
      ctx.fillStyle = theme.woodDark;
      ctx.fillRect(sx, y - 46, 3, 46);
      ctx.fillStyle = theme.gold;
      ctx.fillRect(sx - 1, y - 48, 5, 3);
      const wave = Math.round(Math.sin(t * 3 + d.v * 6) * 2);
      ctx.fillStyle = theme.banner;
      ctx.fillRect(sx + 3, y - 45, 22 + wave, 12);
      ctx.fillRect(sx + 3, y - 33, 8, 4);
      ctx.fillRect(sx + 15 + wave, y - 33, 8, 4);
      ctx.fillStyle = theme.gold;
      ctx.fillRect(sx + 11, y - 42, 4, 4);
      ctx.fillRect(sx + 9, y - 40, 2, 2);
      ctx.fillRect(sx + 15, y - 40, 2, 2);
    } else if (d.kind === 'fence') {
      ctx.fillStyle = theme.wood;
      ctx.fillRect(sx, y - 14, 4, 14);
      ctx.fillRect(sx + 26, y - 14, 4, 14);
      ctx.fillStyle = theme.woodLight;
      ctx.fillRect(sx, y - 11, 30, 3);
      ctx.fillRect(sx, y - 5, 30, 3);
    } else if (d.kind === 'bush') {
      ctx.fillStyle = theme.tree;
      ctx.fillRect(sx - 10, y - 10, 20, 10);
      ctx.fillRect(sx - 6, y - 16, 14, 8);
      ctx.fillStyle = theme.treeLight;
      ctx.fillRect(sx - 4, y - 14, 8, 5);
    } else if (d.kind === 'flower') {
      ctx.fillStyle = theme.moss;
      ctx.fillRect(sx, y - 8, 2, 8);
      ctx.fillStyle = theme.flower;
      ctx.fillRect(sx - 2, y - 12, 6, 5);
      ctx.fillStyle = theme.gold;
      ctx.fillRect(sx, y - 11, 2, 2);
    } else {
      ctx.fillStyle = theme.wood;
      ctx.fillRect(sx - 8, y - 16, 16, 16);
      ctx.fillStyle = theme.woodDark;
      ctx.fillRect(sx - 8, y - 16, 16, 2);
      ctx.fillRect(sx - 8, y - 2, 16, 2);
      ctx.fillRect(sx - 1, y - 16, 2, 16);
      ctx.fillStyle = theme.woodLight;
      ctx.fillRect(sx - 6, y - 12, 4, 4);
    }
  }
}

export function drawMist(ctx, theme, t) {
  const g = ctx.createLinearGradient(0, 478, 0, VIEW.height);
  g.addColorStop(0, rgba(theme.mist, 0));
  g.addColorStop(1, rgba(theme.mist, 0.85));
  ctx.fillStyle = g;
  ctx.fillRect(0, 478, VIEW.width, VIEW.height - 478);
  withAlpha(ctx, 0.45, () => {
    ctx.fillStyle = theme.cloud;
    for (let i = 0; i < 10; i++) {
      const x = ((hash(i, 3) * 1400 - t * 14) % 1400 + 1400) % 1400 - 200;
      const y = 496 + Math.floor(hash(i, 5) * 5) * 8;
      const w = 70 + Math.floor(hash(i, 7) * 5) * 18;
      ctx.fillRect(Math.round(x), y, w, 12);
      ctx.fillRect(Math.round(x) + 16, y - 6, w - 40, 8);
    }
  });
}