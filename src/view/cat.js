import { getWeaponStats, WEAPONS } from '../combat/catalog.js';
import { LAND_DURATION } from '../world/physics.js';

export const CAT_PALETTE = {
  k: '#26222c', g: '#9a9aa4', d: '#6b6b78', l: '#bcbcc6',
  w: '#f2efe6', p: '#e08e9c', n: '#c9647a', e: '#2e2e38'
};

export const CAT_CLIPS = {
  idle: 4, run: 6, jump: 1, fall: 1, land: 2, dash: 1,
  sword: 3, throw: 2, hurt: 1, dead: 1
};

const W = 44;
const H = 36;
const RUN_STRIDE = 14;
const RUN_BOB = [0, -1, -2, -1, 0, 1];
const HIND_DX = [-5, -1, 4, 6, 2, -3];
const HIND_LIFT = [0, 2, 4, 2, 0, 0];
const FRONT_DX = [5, 2, -4, -6, -2, 3];
const FRONT_LIFT = [2, 4, 2, 0, 0, 2];

function grid() {
  return Array.from({ length: H }, () => Array(W).fill('.'));
}

function put(g, x, y, ch) {
  x = Math.round(x); y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch;
}

function brush(g, x, y, size, ch) {
  const half = Math.floor(size / 2);
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) put(g, x + dx - half, y + dy - half, ch);
}

function line(g, x0, y0, x1, y1, size, ch) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) brush(g, x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, size, ch);
}

function ellipse(g, cx, cy, rx, ry, ch) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1) put(g, x, y, ch);
    }
  }
}

function rect(g, x, y, w, h, ch) {
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) put(g, x + dx, y + dy, ch);
}

function leg(g, hipX, hipY, dx, lift, fur) {
  const footX = hipX + dx;
  const footY = 33 - lift;
  line(g, hipX, hipY, footX, footY - 1, 4, 'k');
  line(g, hipX, hipY, footX, footY - 1, 2, fur);
  rect(g, footX - 2, footY, 5, 2, 'k');
  rect(g, footX - 1, footY, 3, 1, 'w');
}

function tail(g, tipX, tipY, fur) {
  line(g, 9, 22, 5, 18, 4, 'k');
  line(g, 5, 18, tipX, tipY, 4, 'k');
  line(g, 9, 22, 5, 18, 2, fur);
  line(g, 5, 18, tipX, tipY, 2, fur);
  brush(g, tipX, tipY, 2, 'w');
}

function head(g, cx, cy, { blink = false, ears = 'up' } = {}) {
  if (ears === 'up') {
    line(g, cx - 5, cy - 4, cx - 6, cy - 9, 3, 'k');
    line(g, cx + 3, cy - 4, cx + 4, cy - 9, 3, 'k');
    put(g, cx - 5, cy - 6, 'p');
    put(g, cx + 3, cy - 6, 'p');
  } else {
    line(g, cx - 5, cy - 4, cx - 8, cy - 5, 3, 'k');
    line(g, cx + 3, cy - 4, cx + 6, cy - 5, 3, 'k');
  }
  ellipse(g, cx, cy, 8, 7, 'k');
  ellipse(g, cx, cy, 7, 6, 'g');
  ellipse(g, cx - 2, cy - 3, 3, 2, 'l');
  rect(g, cx - 4, cy - 5, 2, 3, 'd');
  rect(g, cx, cy - 6, 2, 3, 'd');
  ellipse(g, cx + 4, cy + 3, 4, 3, 'w');
  rect(g, cx + 6, cy + 1, 2, 2, 'n');
  put(g, cx + 5, cy + 4, 'k');
  if (blink) line(g, cx + 1, cy - 1, cx + 3, cy - 1, 1, 'k');
  else {
    rect(g, cx + 1, cy - 2, 2, 3, 'e');
    put(g, cx + 1, cy - 2, 'w');
  }
  line(g, cx + 7, cy + 2, cx + 11, cy + 1, 1, 'w');
  line(g, cx + 7, cy + 3, cx + 11, cy + 4, 1, 'w');
}

function body(g, cx, cy, lean) {
  ellipse(g, cx, cy, 12, 8, 'k');
  ellipse(g, cx, cy, 11, 7, 'g');
  ellipse(g, cx + 2, cy + 4, 7, 3, 'w');
  ellipse(g, cx + 8, cy + 1, 3, 4, 'w');
  rect(g, cx - 6 + lean, cy - 6, 2, 4, 'd');
  rect(g, cx - 1 + lean, cy - 7, 2, 4, 'd');
  rect(g, cx + 4 + lean, cy - 6, 2, 4, 'd');
}

function standing(p) {
  const g = grid();
  const bob = p.bob || 0;
  const lean = p.lean || 0;
  tail(g, p.tail[0], p.tail[1], 'g');
  leg(g, 14, 25 + bob, p.hindFar.dx, p.hindFar.lift, 'd');
  leg(g, 27, 25 + bob, p.frontFar.dx, p.frontFar.lift, 'd');
  body(g, 20 + lean, 23 + bob, lean);
  head(g, 32 + lean, 13 + bob, p);
  leg(g, 12, 25 + bob, p.hindNear.dx, p.hindNear.lift, 'g');
  leg(g, 28, 25 + bob, p.frontNear.dx, p.frontNear.lift, 'g');
  return g;
}

function lying() {
  const g = grid();
  line(g, 4, 33, 14, 33, 3, 'k');
  line(g, 5, 33, 13, 33, 1, 'g');
  ellipse(g, 20, 29, 13, 6, 'k');
  ellipse(g, 20, 29, 12, 5, 'g');
  ellipse(g, 22, 32, 8, 2, 'w');
  rect(g, 14, 25, 2, 3, 'd');
  rect(g, 19, 24, 2, 3, 'd');
  for (const [x, dx] of [[13, -2], [17, -1], [24, 1], [28, 2]]) {
    line(g, x, 26, x + dx, 21, 3, 'k');
    line(g, x, 26, x + dx, 22, 1, 'g');
    rect(g, x + dx - 1, 20, 3, 2, 'w');
  }
  ellipse(g, 34, 28, 7, 6, 'k');
  ellipse(g, 34, 28, 6, 5, 'g');
  line(g, 30, 23, 28, 20, 3, 'k');
  line(g, 37, 23, 39, 20, 3, 'k');
  ellipse(g, 37, 30, 3, 2, 'w');
  rect(g, 39, 28, 2, 2, 'n');
  line(g, 32, 26, 34, 28, 1, 'k');
  line(g, 34, 26, 32, 28, 1, 'k');
  return g;
}

const legs = (hind, front, offset = 0) => ({
  hindNear: { dx: hind[0], lift: hind[1] },
  hindFar: { dx: hind[0] + offset, lift: Math.max(0, hind[1] - 1) },
  frontNear: { dx: front[0], lift: front[1] },
  frontFar: { dx: front[0] + offset, lift: Math.max(0, front[1] - 1) }
});

function frame(params) {
  const rows = (params.lying ? lying() : standing(params)).map(row => row.join(''));
  return { rows, palette: CAT_PALETTE, scale: 2 };
}

export function buildCatFrames() {
  const idle = [0, 1, 2, 3].map(i => frame({
    bob: [0, 0, 1, 1][i],
    tail: [[3, 10 + i], [2, 11], [3, 12], [4, 11]][i],
    blink: i === 2,
    ...legs([0, 0], [0, 0])
  }));
  const run = [0, 1, 2, 3, 4, 5].map(i => frame({
    bob: RUN_BOB[i],
    tail: [[1, 16], [0, 17], [1, 18], [2, 17], [1, 16], [0, 15]][i],
    ...legs([HIND_DX[i], HIND_LIFT[i]], [FRONT_DX[i], FRONT_LIFT[i]], 3)
  }));
  const jump = frame({ bob: -1, tail: [4, 8], ...legs([-3, 5], [3, 6], 2) });
  const fall = frame({ tail: [2, 9], ...legs([-4, 2], [5, 1], 2) });
  const land = [
    frame({ bob: 2, tail: [2, 14], ...legs([-6, 0], [7, 0], 2) }),
    frame({ bob: 1, tail: [3, 12], ...legs([-3, 0], [4, 0], 1) })
  ];
  const dash = frame({ lean: 3, tail: [0, 20], ...legs([-7, 3], [-6, 4], 2) });
  const sword = [
    frame({ lean: -3, bob: 1, tail: [4, 10], ...legs([-2, 0], [-4, 8], 2) }),
    frame({ lean: 4, tail: [1, 14], ...legs([-4, 0], [8, 6], 2) }),
    frame({ lean: 1, tail: [3, 12], ...legs([-2, 0], [4, 3], 1) })
  ];
  const throwFrames = [
    frame({ lean: -2, bob: 1, tail: [4, 11], ...legs([-1, 0], [-3, 7], 2) }),
    frame({ lean: 3, tail: [2, 13], ...legs([-3, 0], [7, 5], 2) })
  ];
  const hurt = frame({ lean: -4, bob: 1, blink: true, ears: 'flat', tail: [5, 16], ...legs([-2, 1], [3, 1], 1) });
  return {
    idle, run, jump: [jump], fall: [fall], land, dash: [dash],
    sword, throw: throwFrames, hurt: [hurt], dead: [frame({ lying: true })]
  };
}

const mod = (n, m) => ((n % m) + m) % m;

export function catPose(run) {
  const player = run.player;
  if (run.state === 'dead') return { clip: 'dead', frame: 0, sx: 1, sy: 1, dy: 0 };
  if (player.hurtFor > 0) return { clip: 'hurt', frame: 0, sx: 1, sy: 1, dy: 0 };
  if (player.dashFor > 0) return { clip: 'dash', frame: 0, sx: 1.28, sy: 0.78, dy: 0 };
  const melee = run.attacks.find(a => a.kind === 'melee' && a.owner === 'player');
  if (melee) {
    const frameIndex = melee.age < melee.windup ? 0 : melee.age <= melee.activeUntil ? 1 : 2;
    return { clip: 'sword', frame: frameIndex, sx: 1, sy: 1, dy: 0 };
  }
  const weapon = run.weapons[run.activeWeapon];
  if (weapon && WEAPONS[weapon.id].kind === 'projectile') {
    const sinceShot = getWeaponStats(weapon).cooldown - (weapon.readyAt - run.time);
    if (sinceShot >= 0 && sinceShot < 0.16) {
      return { clip: 'throw', frame: sinceShot < 0.06 ? 0 : 1, sx: 1, sy: 1, dy: 0 };
    }
  }
  if (player.grounded && player.landFor > 0) {
    const hard = player.landFor > LAND_DURATION / 2;
    return { clip: 'land', frame: hard ? 0 : 1, sx: hard ? 1.18 : 1.06, sy: hard ? 0.82 : 0.94, dy: 0 };
  }
  if (!player.grounded) {
    return player.vy < 0
      ? { clip: 'jump', frame: 0, sx: 0.94, sy: 1.08, dy: 0 }
      : { clip: 'fall', frame: 0, sx: 1.02, sy: 1.02, dy: 0 };
  }
  if (Math.abs(player.vx) > 20) {
    const frameIndex = mod(Math.floor((player.x * player.facing) / RUN_STRIDE), CAT_CLIPS.run);
    return { clip: 'run', frame: frameIndex, sx: 1, sy: 1, dy: RUN_BOB[frameIndex] };
  }
  return { clip: 'idle', frame: mod(Math.floor(run.time * 2), CAT_CLIPS.idle), sx: 1, sy: 1, dy: 0 };
}
