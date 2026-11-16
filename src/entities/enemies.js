import { createStatuses, stepStatuses, damagePlayer } from '../combat/damage.js';

const GRAVITY = 1800;
const SPECS = {
  walker: { w: 34, h: 30, hp: 30, speed: 70, contact: 10 },
  flyer: { w: 30, h: 26, hp: 22, speed: 120, contact: 10 },
  shooter: { w: 32, h: 36, hp: 26, speed: 80, contact: 10 },
  boss: { w: 96, h: 96, hp: 700, speed: 60, contact: 15 }
};

export const SHOOTER = { interval: 1.6, warn: 0.3, range: 640, bulletSpeed: 300, damage: 8 };
export const BOSS = {
  dashWarn: 0.6, dash: 0.45, dashSpeed: 520, recoverAfterDash: 0.7,
  volleyWarn: 0.5, recoverAfterVolley: 0.9, enrageAt: 0.4, enrageRecovery: 0.7,
  bulletSpeed: 280, damage: 12, spread: 0.22
};

export function makeEnemy(kind, spawn, id, scale = 1) {
  const spec = SPECS[kind];
  const boss = kind === 'boss';
  const hp = boss ? spec.hp : Math.round(spec.hp * scale);
  return {
    id, kind, x: spawn.x, y: spawn.y - spec.h, w: spec.w, h: spec.h, vx: 0, vy: 0,
    hp, maxHp: hp, boss, speed: spec.speed, contact: spec.contact,
    phase: boss ? 'recover2' : 'idle',
    timer: boss ? 1.2 : SHOOTER.interval,
    facing: -1, statuses: createStatuses(), hurtFor: 0, knockFor: 0,
    homeY: spawn.y - spec.h
  };
}

function centerOf(e) {
  return { x: e.x + e.w / 2, y: e.y + e.h / 2 };
}

function supportOf(enemy, platforms) {
  const feet = enemy.y + enemy.h;
  const cx = enemy.x + enemy.w / 2;
  return platforms.find(p => cx >= p.x && cx <= p.x + p.w && Math.abs(p.y - feet) < 0.5) ?? null;
}

function moveOnGround(enemy, run, desiredVx, dt) {
  const platforms = run.room.platforms;
  if (enemy.knockFor > 0) enemy.vx *= 0.86;
  else enemy.vx = desiredVx;

  const previousFeet = enemy.y + enemy.h;
  enemy.vy = Math.min(1100, enemy.vy + GRAVITY * dt);
  enemy.y += enemy.vy * dt;
  const feet = enemy.y + enemy.h;
  let landing = null;
  for (const p of platforms) {
    if (enemy.x < p.x + p.w && enemy.x + enemy.w > p.x && previousFeet <= p.y + 1e-6 && feet >= p.y) {
      if (!landing || p.y < landing.y) landing = p;
    }
  }
  if (landing) {
    enemy.y = landing.y - enemy.h;
    enemy.vy = 0;
  }

  const support = supportOf(enemy, platforms);
  enemy.x += enemy.vx * dt;
  let blocked = false;
  const minX = support ? support.x : 0;
  const maxX = support ? support.x + support.w - enemy.w : run.room.width - enemy.w;
  if (enemy.x < minX) { enemy.x = minX; blocked = true; }
  if (enemy.x > maxX) { enemy.x = maxX; blocked = true; }
  return blocked;
}

function fireAt(run, enemy, count, speed, damage, spread) {
  const c = centerOf(enemy);
  const p = centerOf(run.player);
  const base = Math.atan2(p.y - c.y, p.x - c.x);
  for (let i = 0; i < count; i++) {
    const angle = base + (i - (count - 1) / 2) * spread;
    run.attacks.push({
      id: ++run.nextEntityId, kind: 'projectile', owner: 'enemy', weapon: enemy.boss ? 'bossOrb' : 'seed',
      x: c.x, y: c.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      age: 0, ttl: enemy.boss ? 4 : 2.5, damage, radius: enemy.boss ? 8 : 6,
      hitIds: new Set(), modules: [], pierceLeft: 0, bouncesLeft: 0
    });
  }
}

function stepWalker(enemy, run, slow, dt) {
  const p = centerOf(run.player);
  const c = centerOf(enemy);
  let speed = enemy.speed;
  if (Math.abs(p.x - c.x) < 240 && Math.abs(p.y - c.y) < 70) {
    enemy.facing = Math.sign(p.x - c.x) || enemy.facing;
    speed *= 1.5;
  }
  if (moveOnGround(enemy, run, enemy.facing * speed * slow, dt) && enemy.knockFor <= 0) enemy.facing *= -1;
}

function stepFlyer(enemy, run, slow, dt, time) {
  const p = centerOf(run.player);
  const c = centerOf(enemy);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const distance = Math.hypot(dx, dy);
  const cap = enemy.speed * slow;
  if (enemy.knockFor > 0) {
    enemy.vx *= 0.86;
  } else if (distance < 560 && distance > 1) {
    enemy.vx += (dx / distance) * 260 * dt;
    enemy.vy += (dy / distance) * 260 * dt;
    enemy.facing = Math.sign(dx) || enemy.facing;
  } else {
    enemy.vx *= 0.95;
    enemy.vy = Math.sin(time * 2 + enemy.id) * 30;
  }
  const speed = Math.hypot(enemy.vx, enemy.vy);
  if (speed > cap && enemy.knockFor <= 0) {
    enemy.vx = (enemy.vx / speed) * cap;
    enemy.vy = (enemy.vy / speed) * cap;
  }
  enemy.x = Math.max(0, Math.min(run.room.width - enemy.w, enemy.x + enemy.vx * dt));
  enemy.y = Math.max(20, Math.min(420, enemy.y + enemy.vy * dt));
}

function stepShooter(enemy, run, slow, dt) {
  const p = centerOf(run.player);
  const c = centerOf(enemy);
  const dx = p.x - c.x;
  const distance = Math.abs(dx);
  enemy.facing = Math.sign(dx) || enemy.facing;
  let desired = 0;
  if (distance < 220) desired = -enemy.facing * enemy.speed;
  else if (distance > 420 && distance < SHOOTER.range) desired = enemy.facing * enemy.speed;
  moveOnGround(enemy, run, desired * slow, dt);

  if (distance > SHOOTER.range || Math.abs(p.y - c.y) > 300) {
    enemy.phase = 'idle';
    enemy.timer = Math.max(enemy.timer, SHOOTER.warn + 0.3);
    return;
  }
  enemy.timer -= dt * slow;
  if (enemy.timer <= SHOOTER.warn) enemy.phase = 'warn';
  if (enemy.timer <= 0) {
    fireAt(run, enemy, 1, SHOOTER.bulletSpeed, SHOOTER.damage, 0);
    enemy.timer = SHOOTER.interval;
    enemy.phase = 'idle';
  }
}

function stepBoss(enemy, run, slow, dt) {
  const enraged = enemy.hp < enemy.maxHp * BOSS.enrageAt;
  const recovery = enraged ? BOSS.enrageRecovery : 1;
  const p = centerOf(run.player);
  const c = centerOf(enemy);
  enemy.timer -= dt * slow;
  let desired = 0;

  switch (enemy.phase) {
    case 'recover2':
      enemy.facing = Math.sign(p.x - c.x) || enemy.facing;
      desired = enemy.facing * enemy.speed;
      if (enemy.timer <= 0) {
        enemy.phase = 'dashWarn';
        enemy.timer = BOSS.dashWarn;
        enemy.facing = Math.sign(p.x - c.x) || enemy.facing;
      }
      break;
    case 'dashWarn':
      if (enemy.timer <= 0) {
        enemy.phase = 'dash';
        enemy.timer = BOSS.dash;
      }
      break;
    case 'dash':
      desired = enemy.facing * BOSS.dashSpeed;
      if (enemy.timer <= 0) {
        enemy.phase = 'recover1';
        enemy.timer = BOSS.recoverAfterDash * recovery;
      }
      break;
    case 'recover1':
      if (enemy.timer <= 0) {
        enemy.phase = 'volleyWarn';
        enemy.timer = BOSS.volleyWarn;
      }
      break;
    case 'volleyWarn':
      enemy.facing = Math.sign(p.x - c.x) || enemy.facing;
      if (enemy.timer <= 0) {
        fireAt(run, enemy, enraged ? 5 : 3, BOSS.bulletSpeed, BOSS.damage, BOSS.spread);
        enemy.phase = 'recover2';
        enemy.timer = BOSS.recoverAfterVolley * recovery;
      }
      break;
  }

  moveOnGround(enemy, run, desired * slow, dt);
  enemy.x = Math.max(20, Math.min(run.room.width - enemy.w - 20, enemy.x));
}

function touching(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function stepEnemies(run, dt) {
  for (const enemy of run.enemies) {
    if (enemy.hp <= 0) continue;
    stepStatuses(enemy, dt);
    enemy.hurtFor = Math.max(0, enemy.hurtFor - dt);
    enemy.knockFor = Math.max(0, enemy.knockFor - dt);
    if (enemy.hp <= 0 || enemy.statuses.frozenFor > 0) continue;
    const slow = enemy.statuses.slowFor > 0 ? (enemy.boss ? 0.6 : 0.5) : 1;

    if (enemy.kind === 'walker') stepWalker(enemy, run, slow, dt);
    else if (enemy.kind === 'flyer') stepFlyer(enemy, run, slow, dt, run.time);
    else if (enemy.kind === 'shooter') stepShooter(enemy, run, slow, dt);
    else stepBoss(enemy, run, slow, dt);

    if (enemy.y > 700) {
      enemy.hp = 0;
      continue;
    }
    if (touching(enemy, run.player)) damagePlayer(run, enemy.contact);
    if (run.state === 'dead') return;
  }
}
