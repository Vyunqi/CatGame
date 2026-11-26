import { MOTION } from './physics.js';

export const ROOM_HEIGHT = 540;
export const COMBAT_ROOMS = 6;
export const BOSS_ROOM = 6;
export const ENEMY_COUNTS = [6, 7, 8, 9, 10, 12];
export const THEMES = ['grass', 'dusk', 'castle'];

const ENEMY_POOLS = [
  ['ant', 'ant', 'ant', 'boar', 'wasp'],
  ['ant', 'ant', 'boar', 'boar', 'wasp', 'wasp'],
  ['ant', 'boar', 'boar', 'wasp', 'wasp', 'wasp']
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
  const hasHighBridge = index % 2 === 0;
  const heights = hasHighBridge ? [440, 392, 344, 296, 344, 392, 392] : [392, 344, 392, 440, 392, 344, 344];
  const mainPath = [block(0, heights[0], between(rng, 380, 440))];
  for (let i = 1; i < heights.length; i++) {
    const prev = mainPath.at(-1);
    const last = i === heights.length - 1;
    const gap = !hasHighBridge && last ? 108 : between(rng, 40, 64);
    mainPath.push(block(prev.x + prev.w + gap, heights[i], last ? 320 : between(rng, 216, 264)));
  }
  const exitBlock = mainPath.at(-1);
  const width = exitBlock.x + exitBlock.w;
  const summit = mainPath[3];
  const beforeExit = mainPath.at(-2);
  const branch = hasHighBridge
    ? { x: summit.x + Math.floor((summit.w - 128) / 2), y: summit.y - 68, w: 128, h: 16, solid: false }
    : block(beforeExit.x + beforeExit.w + 8, beforeExit.y + 64, 92);
  const coins = hasHighBridge ? [20, 64, 108].map(dx => ({ x: branch.x + dx, y: branch.y - 22 })) : [];
  const chestSeg = hasHighBridge ? mainPath[2] : branch;
  const chests = [{ x: chestSeg.x + chestSeg.w / 2 - 16, y: chestSeg.y - 28, w: 32, h: 28, opened: false }];

  const spawnSegments = mainPath.slice(1);
  const enemySpawns = [];
  const pool = ENEMY_POOLS[zone];
  for (let i = 0; i < ENEMY_COUNTS[index]; i++) {
    const seg = spawnSegments[i % spawnSegments.length];
    const kind = i === 0 && index === 1 ? 'wasp' : pick(rng, pool);
    const x = seg.x + between(rng, 24, Math.max(24, seg.w - 56));
    const y = kind === 'wasp' ? seg.y - between(rng, 130, 180) + 15 : seg.y;
    enemySpawns.push({ kind, x, y });
  }

  return {
    width, height: ROOM_HEIGHT, index, theme: THEMES[zone],
    platforms: [...mainPath, branch],
    mainPath,
    spawn: { x: 80, y: mainPath[0].y - MOTION.height },
    exit: { x: exitBlock.x + exitBlock.w - 140, y: exitBlock.y - 96, w: 64, h: 96 },
    enemySpawns,
    chests,
    coins,
    rewardClaimed: false
  };
}
