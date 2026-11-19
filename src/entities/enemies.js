import { createStatuses, stepStatuses, damagePlayer } from '../combat/damage.js';

const GRAVITY = 1800;
const SPECS = {
  walker: { w: 34, h: 30, hp: 30, speed: 70, contact: 10 },
  flyer: { w: 30, h: 26, hp: 22, speed: 120, contact: 10 },
  shooter: { w: 32, h: 36, hp: 26, speed: 80, contact: 10 },
  hopper: { w: 30, h: 28, hp: 26, speed: 240, contact: 12 },
  charger: { w: 40, h: 32, hp: 44, speed: 60, contact: 10 },
  lobber: { w: 30, h: 32, hp: 24, speed: 70, contact: 8 },
  boss: { w: 96, h: 96, hp: 700, speed: 60, contact: 15 }
};

export const SHOOTER = { interval: 1.6, warn: 0.3, range: 640, bulletSpeed: 300, damage: 8 };
export const CHARGER = { warn: 0.5, dash: 0.7, dashSpeed: 440, recover: 0.9, dashContact: 16 };
export const LOBBER = { interval: 2.2, warn: 0.4, range: 620, gravity: 760, flight: 0.95, damage: 10 };
const DETECT = {
  walker: [420, 240], shooter: [560, 300], hopper: [520, 300], charger: [460, 110], lobber: [620, 340]
};
const AGGRO_MEMORY = 3;
const JUMP_VY = -700;
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
    timer: boss ? 1.2 : kind === 'hopper' ? 0.6 : kind === 'lobber' ? LOBBER.interval : SHOOTER.interval,
    facing: -1, statuses: createStatuses(), hurtFor: 0, knockFor: 0,
    aggroFor: 0, jumpFor: 0, leaping: false, leapVx: 0,
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

function landingAt(platforms, x, w, previousFeet, feet) {
  let landing = null;
  for (const p of platforms) {
    if (x < p.x + p.w && x + w > p.x && previousFeet <= p.y + 1e-6 && feet >= p.y) {
      if (!landing || p.y < landing.y) landing = p;
    }
  }
  return landing;
}

function moveOnGround(enemy, run, desiredVx, dt, free = false) {
  const platforms = run.room.platforms;
  if (enemy.knockFor > 0) {
    enemy.leaping = false;
    enemy.vx *= 0.86;
  } else enemy.vx = enemy.leaping ? enemy.leapVx : desiredVx;

  const previousFeet = enemy.y + enemy.h;
  enemy.vy = Math.min(1100, enemy.vy + GRAVITY * dt);
  enemy.y += enemy.vy * dt;
  const feet = enemy.y + enemy.h;
  const landing = landingAt(platforms, enemy.x, enemy.w, previousFeet, feet);
  if (landing) {
    enemy.y = landing.y - enemy.h;
    enemy.vy = 0;
    enemy.leaping = false;
  }

  const support = supportOf(enemy, platforms);
  enemy.x += enemy.vx * dt;
  let blocked = false;
  let minX = 0;
  let maxX = run.room.width - enemy.w;
  if (support && (enemy.knockFor <= 0 || !free)) {
    minX = support.x;
    maxX = support.x + support.w - enemy.w;
    if (free) {
      for (const p of platforms) {
        if (Math.abs(p.y - support.y) < 0.5 && p.x <= maxX + enemy.w && p.x + p.w >= minX) {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x + p.w - enemy.w);
        }
      }
    }
  }
  if (enemy.x < minX) { enemy.x = minX; blocked = true; }
  if (enemy.x > maxX) { enemy.x = maxX; blocked = true; }
  return blocked;
}

function planLeap(enemy, run, support, targetX, targetY, jumpVy, maxVx, allowSame = false) {
  const dt = 1 / 60;
  const cx = enemy.x + enemy.w / 2;
  const margin = enemy.w / 2 + 4;
  const startDistance = Math.abs(targetX - cx) + Math.abs(targetY - support.y);
  const candidates = run.room.platforms.map(p => {
    const x = Math.max(p.x + margin, Math.min(p.x + p.w - margin, targetX));
    return { p, x, distance: Math.abs(targetX - x) + Math.abs(targetY - p.y) };
  }).filter(({ p, distance }) => p.w >= margin * 2
    && (p === support ? allowSame : distance < startDistance))
    .sort((a, b) => a.distance - b.distance);

  for (const { p, x: target } of candidates) {
    let feet = support.y;
    let vy = jumpVy;
    let steps = 0;
    for (let i = 0; i < 120; i++) {
      const previousFeet = feet;
      vy = Math.min(1100, vy + GRAVITY * dt);
      feet += vy * dt;
      if (vy >= 0 && previousFeet <= p.y + 1e-6 && feet >= p.y) { steps = i + 1; break; }
    }
    if (steps < 2) continue;
    const before = (steps - 1) * dt;
    const after = steps * dt;
    const left = p.x + 4 - enemy.x;
    const right = p.x + p.w - enemy.w - 4 - enemy.x;
    const minVx = Math.max(-maxVx, left / before, left / after);
    const limitVx = Math.min(maxVx, right / before, right / after);
    if (minVx > limitVx) continue;
    const vx = Math.max(minVx, Math.min(limitVx, (target - cx) / after));
    let x = enemy.x;
    feet = support.y;
    vy = jumpVy;
    for (let i = 0; i < 120; i++) {
      const previousFeet = feet;
      vy = Math.min(1100, vy + GRAVITY * dt);
      feet += vy * dt;
      const landing = landingAt(run.room.platforms, x, enemy.w, previousFeet, feet);
      const nextX = Math.max(0, Math.min(run.room.width - enemy.w, x + vx * dt));
      if (landing) {
        if (landing === p && Math.min(x, nextX) >= p.x + 4 - 1e-6
          && Math.max(x, nextX) + enemy.w <= p.x + p.w - 4 + 1e-6) return vx;
        break;
      }
      x = nextX;
      if (feet > 700) break;
    }
  }
  return null;
}

function sense(enemy, dx, dy, dt) {
  const [rx, ry] = DETECT[enemy.kind] ?? [0, 0];
  if (Math.abs(dx) < rx && Math.abs(dy) < ry) enemy.aggroFor = AGGRO_MEMORY;
  else enemy.aggroFor = Math.max(0, enemy.aggroFor - dt);
  return enemy.aggroFor > 0;
}

function chaseMove(enemy, run, desiredVx, dt, dx, dy) {
  const support = supportOf(enemy, run.room.platforms);
  if (support && enemy.jumpFor <= 0 && enemy.knockFor <= 0) {
    const direction = Math.sign(desiredVx);
    const edgeDist = direction > 0 ? support.x + support.w - (enemy.x + enemy.w) : enemy.x - support.x;
    const gapAhead = dx * direction > 0 && edgeDist < 26;
    if ((dy < -46 && Math.abs(dx) < 170 && desiredVx * dx >= 0) || gapAhead) {
      const speed = Math.abs(desiredVx) || enemy.speed;
      const vx = planLeap(enemy, run, support, run.player.x + run.player.w / 2,
        run.player.y + run.player.h, JUMP_VY, speed * 2.4);
      if (vx !== null) {
        enemy.vy = JUMP_VY;
        enemy.jumpFor = 0.6;
        enemy.leaping = true;
        enemy.leapVx = vx;
      }
    }
  }
  return moveOnGround(enemy, run, desiredVx, dt, true);
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
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  if (!sense(enemy, dx, dy, dt)) {
    if (moveOnGround(enemy, run, enemy.facing * enemy.speed * slow, dt) && enemy.knockFor <= 0) enemy.facing *= -1;
    return;
  }
  enemy.facing = Math.sign(dx) || enemy.facing;
  chaseMove(enemy, run, enemy.facing * enemy.speed * 1.6 * slow, dt, dx, dy);
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
  const dy = p.y - c.y;
  const distance = Math.abs(dx);
  const aggro = sense(enemy, dx, dy, dt);
  enemy.facing = Math.sign(dx) || enemy.facing;
  let desired = 0;
  if (distance < 220) desired = -enemy.facing * enemy.speed;
  else if (distance > 420 && distance < SHOOTER.range) desired = enemy.facing * enemy.speed;
  if (aggro) chaseMove(enemy, run, desired * slow, dt, dx, dy);
  else moveOnGround(enemy, run, desired * slow, dt);

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

function stepHopper(enemy, run, slow, dt) {
  const p = centerOf(run.player);
  const c = centerOf(enemy);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const aggro = sense(enemy, dx, dy, dt);
  const support = supportOf(enemy, run.room.platforms);
  enemy.timer -= dt * slow;
  if (aggro) enemy.facing = Math.sign(dx) || enemy.facing;
  if (support && enemy.timer <= 0 && enemy.knockFor <= 0) {
    const jumpVy = aggro ? -560 : -260;
    const targetX = aggro ? p.x : c.x + enemy.facing * 40 * slow;
    const vx = planLeap(enemy, run, support, targetX, aggro ? run.player.y + run.player.h : support.y,
      jumpVy, (aggro ? 260 : 40) * slow, true);
    if (vx !== null) {
      enemy.vy = jumpVy;
      enemy.leapVx = vx;
      enemy.leaping = true;
    }
    enemy.timer = aggro ? 1.15 : 1.6;
  }
  const desired = aggro ? 0 : enemy.facing * 40 * slow;
  if (moveOnGround(enemy, run, desired, dt, aggro) && !aggro && enemy.knockFor <= 0) enemy.facing *= -1;
}

function stepCharger(enemy, run, slow, dt) {
  const p = centerOf(run.player);
  const c = centerOf(enemy);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const aggro = sense(enemy, dx, dy, dt);
  enemy.timer -= dt * slow;
  let desired = 0;
  let free = false;
  switch (enemy.phase) {
    case 'warn':
      if (enemy.timer <= 0) { enemy.phase = 'dash'; enemy.timer = CHARGER.dash; }
      break;
    case 'dash':
      desired = enemy.facing * CHARGER.dashSpeed;
      free = true;
      if (enemy.timer <= 0) { enemy.phase = 'recover'; enemy.timer = CHARGER.recover; }
      break;
    case 'recover':
      free = true;
      if (enemy.timer <= 0) enemy.phase = 'idle';
      break;
    default:
      if (aggro && Math.abs(dy) < 110 && Math.abs(dx) > 60 && enemy.knockFor <= 0) {
        enemy.phase = 'warn';
        enemy.timer = CHARGER.warn;
        enemy.facing = Math.sign(dx) || enemy.facing;
      } else if (moveOnGround(enemy, run, enemy.facing * enemy.speed * slow, dt) && enemy.knockFor <= 0) {
        enemy.facing *= -1;
      }
  }
  enemy.contact = enemy.phase === 'dash' ? CHARGER.dashContact : SPECS.charger.contact;
  if (enemy.phase !== 'idle' || desired !== 0) {
    const blocked = moveOnGround(enemy, run, desired * slow, dt, free);
    if (blocked && enemy.phase === 'dash') { enemy.phase = 'recover'; enemy.timer = CHARGER.recover; }
  }
}

function stepLobber(enemy, run, slow, dt) {
  const p = centerOf(run.player);
  const c = centerOf(enemy);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const distance = Math.abs(dx);
  const aggro = sense(enemy, dx, dy, dt);
  enemy.facing = Math.sign(dx) || enemy.facing;
  let desired = 0;
  if (distance < 240) desired = -enemy.facing * enemy.speed;
  else if (distance > 460 && distance < LOBBER.range) desired = enemy.facing * enemy.speed;
  if (aggro) chaseMove(enemy, run, desired * slow, dt, dx, dy);
  else moveOnGround(enemy, run, desired * slow, dt);

  if (!aggro || distance > LOBBER.range || Math.abs(dy) > 340) {
    enemy.phase = 'idle';
    enemy.timer = Math.max(enemy.timer, LOBBER.warn + 0.3);
    return;
  }
  enemy.timer -= dt * slow;
  if (enemy.timer <= LOBBER.warn) enemy.phase = 'warn';
  if (enemy.timer <= 0) {
    const t = LOBBER.flight;
    const vx = dx / t;
    const vy = Math.max(-620, (dy - 0.5 * LOBBER.gravity * t * t) / t);
    run.attacks.push({
      id: ++run.nextEntityId, kind: 'projectile', owner: 'enemy', weapon: 'lob',
      x: c.x, y: c.y, vx, vy, gravity: LOBBER.gravity,
      age: 0, ttl: t + 0.8, damage: LOBBER.damage, radius: 7,
      hitIds: new Set(), modules: [], pierceLeft: 0, bouncesLeft: 0
    });
    enemy.timer = LOBBER.interval;
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
    enemy.jumpFor = Math.max(0, enemy.jumpFor - dt);
    if (enemy.hp <= 0 || enemy.statuses.frozenFor > 0) continue;
    const slow = enemy.statuses.slowFor > 0 ? (enemy.boss ? 0.6 : 0.5) : 1;

    if (enemy.kind === 'walker') stepWalker(enemy, run, slow, dt);
    else if (enemy.kind === 'flyer') stepFlyer(enemy, run, slow, dt, run.time);
    else if (enemy.kind === 'shooter') stepShooter(enemy, run, slow, dt);
    else if (enemy.kind === 'hopper') stepHopper(enemy, run, slow, dt);
    else if (enemy.kind === 'charger') stepCharger(enemy, run, slow, dt);
    else if (enemy.kind === 'lobber') stepLobber(enemy, run, slow, dt);
    else stepBoss(enemy, run, slow, dt);

    if (enemy.y > 700) {
      enemy.hp = 0;
      continue;
    }
    if (touching(enemy, run.player)) damagePlayer(run, enemy.contact);
    if (run.state === 'dead') return;
  }
}
