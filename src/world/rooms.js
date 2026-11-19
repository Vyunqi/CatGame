import { MOTION } from './physics.js';

export const ROOM_HEIGHT = 540;
export const COMBAT_ROOMS = 6;
export const BOSS_ROOM = 6;
export const ENEMY_COUNTS = [6, 7, 8, 9, 10, 12];
export const THEMES = ['grass', 'dusk', 'castle'];

const ENEMY_POOLS = [
  ['walker', 'walker', 'flyer', 'shooter', 'hopper'],
  ['walker', 'flyer', 'flyer', 'shooter', 'hopper', 'charger'],
  ['walker', 'flyer', 'shooter', 'shooter', 'charger', 'lobber']
];

const EDGE_MARGIN = 20;
const TAKEOFF_INSETS = [20, 40, 60, 80];
const MAX_STEPS = 180;

export function createRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) >>> 0;
    let n = Math.imul(value ^ (value >>> 15), value | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export function zoneOf(index) {
  return Math.min(2, Math.floor(index / 2));
}

export function canReach(from, to) {
  const dt = 1 / 60;
  const { width: w, height: h, speed, jumpSpeed, gravity } = MOTION;
  for (const inset of TAKEOFF_INSETS) {
    let x = from.x + from.w - inset - w / 2;
    if (x < from.x) continue;
    let y = from.y - h;
    let vy = jumpSpeed;
    for (let i = 0; i < MAX_STEPS; i++) {
      vy += gravity * dt;
      x += speed * dt;
      const previousFeet = y + h;
      y += vy * dt;
      const feet = y + h;
      const overlaps = x < to.x + to.w && x + w > to.x;
      if (overlaps && feet > to.y && previousFeet > to.y + 1e-6) break;
      const center = x + w / 2;
      if (vy >= 0 && previousFeet <= to.y + 1e-6 && feet >= to.y
        && center >= to.x + EDGE_MARGIN && center <= to.x + to.w - EDGE_MARGIN) {
        return true;
      }
      if (y > ROOM_HEIGHT) break;
    }
  }
  return false;
}

function between(rng, min, max) {
  return Math.round(min + rng() * (max - min));
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function block(x, y, w) {
  return { x, y, w, h: ROOM_HEIGHT - y, solid: true };
}

function nextSegment(rng, previous) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const gap = pick(rng, [0, 40, 56, 64, 72, 80]);
    const rise = between(rng, -56, 56);
    const y = Math.max(300, Math.min(460, previous.y - rise));
    const candidate = block(previous.x + previous.w + gap, y, between(rng, 160, 360));
    if (canReach(previous, candidate)) return candidate;
  }
  return block(previous.x + previous.w + 48, previous.y, 240);
}

function bossRoom(index) {
  const width = 1600;
  const ground = block(0, 440, width);
  return {
    width, height: ROOM_HEIGHT, index, theme: 'castle',
    platforms: [
      ground,
      { x: 260, y: 330, w: 180, h: 16, solid: false },
      { x: 1160, y: 330, w: 180, h: 16, solid: false },
      { x: 700, y: 250, w: 200, h: 16, solid: false }
    ],
    mainPath: [ground],
    spawn: { x: 120, y: 440 - MOTION.height },
    exit: null,
    enemySpawns: [],
    bossSpawn: { x: 1240, y: 440 },
    chests: [],
    coins: [],
    rewardClaimed: false
  };
}

export function generateRoom(seed, index) {
  if (index >= BOSS_ROOM) return bossRoom(index);
  const rng = createRng((seed ^ Math.imul(index + 1, 0x9E3779B1)) >>> 0);
  const zone = zoneOf(index);
  const targetWidth = between(rng, 2560, 3000);

  const mainPath = [block(0, 440, between(rng, 420, 520))];
  while (true) {
    const last = mainPath[mainPath.length - 1];
    if (last.x + last.w >= targetWidth - 360) break;
    mainPath.push(nextSegment(rng, last));
  }
  const last = mainPath[mainPath.length - 1];
  let exitBlock = block(last.x + last.w + 48, last.y, 360);
  if (!canReach(last, exitBlock)) exitBlock = block(last.x + last.w + 40, last.y, 360);
  mainPath.push(exitBlock);
  const width = exitBlock.x + exitBlock.w;

  const extras = [];
  const coins = [];
  for (let i = 1; i < mainPath.length - 1; i++) {
    const seg = mainPath[i];
    if (seg.w >= 220 && rng() < 0.45) {
      const w = between(rng, 96, 150);
      const x = seg.x + between(rng, 20, seg.w - w - 20);
      const y = seg.y - between(rng, 96, 108);
      extras.push({ x, y, w, h: 16, solid: false });
      for (let c = 0; c < 3; c++) coins.push({ x: x + 16 + c * ((w - 32) / 2), y: y - 22 });
    } else if (rng() < 0.5) {
      coins.push({ x: seg.x + seg.w / 2, y: seg.y - 26 });
    }
  }

  const middle = mainPath.slice(1, -1).sort((a, b) => b.w - a.w);
  const chestSeg = middle[Math.floor(rng() * Math.min(3, middle.length))] ?? mainPath[0];
  const chests = [{ x: chestSeg.x + chestSeg.w / 2 - 16, y: chestSeg.y - 28, w: 32, h: 28, opened: false }];

  const spawnSegments = mainPath.slice(1);
  const enemySpawns = [];
  const pool = ENEMY_POOLS[zone];
  for (let i = 0; i < ENEMY_COUNTS[index]; i++) {
    const seg = spawnSegments[i % spawnSegments.length];
    const kind = i === 0 && index === 1 ? 'shooter' : pick(rng, pool);
    const x = seg.x + between(rng, 24, Math.max(24, seg.w - 56));
    const y = kind === 'flyer' ? seg.y - between(rng, 130, 180) : seg.y;
    enemySpawns.push({ kind, x, y });
  }

  return {
    width, height: ROOM_HEIGHT, index, theme: THEMES[zone],
    platforms: [...mainPath, ...extras],
    mainPath,
    spawn: { x: 80, y: mainPath[0].y - MOTION.height },
    exit: { x: exitBlock.x + exitBlock.w - 140, y: exitBlock.y - 96, w: 64, h: 96 },
    enemySpawns,
    chests,
    coins,
    rewardClaimed: false
  };
}
