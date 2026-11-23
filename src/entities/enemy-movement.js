import { solidHit, sweep } from '../combat/enemy-attacks.js';

const GRAVITY = 1800;
const JUMP_VY = -700;
export function supportOf(enemy, platforms) {
  const feet = enemy.y + enemy.h, cx = enemy.x + enemy.w / 2;
  return platforms.find(p => cx >= p.x && cx <= p.x + p.w && Math.abs(p.y - feet) < 0.5) ?? null;
}
function landingAt(platforms, x, w, previousFeet, feet) {
  let landing = null;
  for (const p of platforms) {
    if (x < p.x + p.w && x + w > p.x && previousFeet <= p.y + 1e-6 && feet >= p.y) {
      if (!landing || p.y < landing.y) landing = p;
    }
  }
  return landing;
}
export function moveOnGround(enemy, run, desiredVx, dt, free = false) {
  const platforms = run.room.platforms;
  if (enemy.knockFor > 0) { enemy.leaping = false; enemy.vx *= Math.pow(0.86, dt * 60); }
  else enemy.vx = enemy.leaping ? enemy.leapVx : desiredVx;
  const previousFeet = enemy.y + enemy.h;
  enemy.vy = Math.min(1100, enemy.vy + GRAVITY * dt);
  enemy.y += enemy.vy * dt;
  const landing = landingAt(platforms, enemy.x, enemy.w, previousFeet, enemy.y + enemy.h);
  if (landing) { enemy.y = landing.y - enemy.h; enemy.vy = 0; enemy.leaping = false; }
  const support = supportOf(enemy, platforms);
  const previousX = enemy.x;
  enemy.x += enemy.vx * dt;
  let blocked = false, minX = 0, maxX = run.room.width - enemy.w;
  if (support && enemy.knockFor <= 0) {
    minX = support.x; maxX = support.x + support.w - enemy.w;
    if (free) {
      for (const p of platforms) {
        if (Math.abs(p.y - support.y) < 0.5 && p.x <= maxX + enemy.w && p.x + p.w >= minX) {
          minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x + p.w - enemy.w);
        }
      }
    }
  }
  if (enemy.x < minX) { enemy.x = minX; blocked = true; }
  if (enemy.x > maxX) { enemy.x = maxX; blocked = true; }
  for (const p of platforms) {
    if (p.solid === false || enemy.y + enemy.h <= p.y + 1e-6 || enemy.y >= p.y + p.h) continue;
    if (previousX + enemy.w <= p.x && enemy.x + enemy.w > p.x) { enemy.x = p.x - enemy.w; blocked = true; }
    else if (previousX >= p.x + p.w && enemy.x < p.x + p.w) { enemy.x = p.x + p.w; blocked = true; }
  }
  return blocked;
}
function planLeap(enemy, run, support, targetX, targetY, jumpVy, maxVx) {
  const dt = 1 / 60, cx = enemy.x + enemy.w / 2, margin = enemy.w / 2 + 4;
  const startDistance = Math.abs(targetX - cx) + Math.abs(targetY - support.y);
  const candidates = run.room.platforms.map(p => {
    const x = Math.max(p.x + margin, Math.min(p.x + p.w - margin, targetX));
    return { p, x, distance: Math.abs(targetX - x) + Math.abs(targetY - p.y) };
  }).filter(({p, distance}) => p.w >= margin * 2 && p !== support && distance < startDistance)
    .sort((a, b) => a.distance - b.distance);
  for (const { p, x: target } of candidates) {
    let feet = support.y, vy = jumpVy, steps = 0;
    for (let i = 0; i < 120; i++) {
      const previousFeet = feet;
      vy = Math.min(1100, vy + GRAVITY * dt); feet += vy * dt;
      if (vy >= 0 && previousFeet <= p.y + 1e-6 && feet >= p.y) { steps = i + 1; break; }
    }
    if (steps < 2) continue;
    const before = (steps - 1) * dt, after = steps * dt;
    const left = p.x + 4 - enemy.x, right = p.x + p.w - enemy.w - 4 - enemy.x;
    const minVx = Math.max(-maxVx, left / before, left / after);
    const limitVx = Math.min(maxVx, right / before, right / after);
    if (minVx > limitVx) continue;
    const vx = Math.max(minVx, Math.min(limitVx, (target - cx) / after));
    let x = enemy.x; feet = support.y; vy = jumpVy;
    for (let i = 0; i < 120; i++) {
      const previousFeet = feet;
      vy = Math.min(1100, vy + GRAVITY * dt); feet += vy * dt;
      const landing = landingAt(run.room.platforms, x, enemy.w, previousFeet, feet);
      const nextX = Math.max(0, Math.min(run.room.width - enemy.w, x + vx * dt));
      if (landing) {
        if (landing === p && Math.min(x, nextX) >= p.x + 4 - 1e-6
          && Math.max(x, nextX) + enemy.w <= p.x + p.w - 4 + 1e-6) return vx;
        break;
      }
      x = nextX; if (feet > 700) break;
    }
  }
  return null;
}
export function chaseMove(enemy, run, desiredVx, dt, dx, dy) {
  const support = supportOf(enemy, run.room.platforms);
  if (support && enemy.jumpFor <= 0 && enemy.knockFor <= 0) {
    const direction = Math.sign(desiredVx);
    const edgeDist = direction > 0 ? support.x + support.w - (enemy.x + enemy.w) : enemy.x - support.x;
    const gapAhead = dx * direction > 0 && edgeDist < 26;
    if ((dy < -46 && Math.abs(dx) < 170 && desiredVx * dx >= 0) || gapAhead) {
      const vx = planLeap(enemy, run, support, run.player.x + run.player.w / 2,
        run.player.y + run.player.h, JUMP_VY, Math.abs(desiredVx) * 2.4);
      if (vx !== null) { enemy.vy = JUMP_VY; enemy.jumpFor = 0.6; enemy.leaping = true; enemy.leapVx = vx; }
    }
  }
  return moveOnGround(enemy, run, desiredVx, dt, true);
}
export function continuousAhead(enemy, run, distance) {
  const support = supportOf(enemy, run.room.platforms);
  if (!support) return false;
  let left = support.x, right = support.x + support.w;
  for (let i = 0; i < run.room.platforms.length; i++) {
    for (const p of run.room.platforms) {
      if (Math.abs(p.y - support.y) < 0.5 && p.x <= right && p.x + p.w >= left) {
        left = Math.min(left, p.x); right = Math.max(right, p.x + p.w);
      }
    }
  }
  const x = enemy.facing > 0 ? enemy.x + enemy.w + distance : enemy.x - distance;
  return x >= left && x <= right;
}
export function moveInAir(enemy, run, vx, vy, dt) {
  enemy.vx = enemy.knockFor > 0 ? enemy.vx * Math.pow(0.86, dt * 60) : vx;
  enemy.vy = vy;
  const x1 = Math.max(0, Math.min(run.room.width - enemy.w, enemy.x + enemy.vx * dt));
  const y1 = Math.max(0, Math.min(run.room.height - enemy.h, enemy.y + vy * dt));
  let hit = null;
  for (const p of run.room.platforms) {
    if (p.solid === false) continue;
    const rect = { x: p.x - enemy.w + 1e-6, y: p.y - enemy.h + 1e-6, w: p.w + enemy.w - 2e-6, h: p.h + enemy.h - 2e-6 };
    const t = sweep(enemy.x, enemy.y, x1, y1, rect);
    if (t !== null && (hit === null || t < hit)) hit = t;
  }
  const t = hit === null ? 1 : Math.max(0, hit - 1e-6);
  enemy.x += (x1 - enemy.x) * t; enemy.y += (y1 - enemy.y) * t;
}
export function canSee(enemy, run) {
  return solidHit(run.room, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2,
    run.player.x + run.player.w / 2, run.player.y + run.player.h / 2) === null;
}
