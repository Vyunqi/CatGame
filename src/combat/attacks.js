import { getWeaponStats, COMBO_WINDOW, KNOCKBACK } from './catalog.js';
import { resolveHit, damagePlayer } from './damage.js';

const SWORDWAVE = { speed: 560, ttl: 0.7, radius: 18, damageRatio: 0.6, pierce: 2 };
const COMBO_ARCS = { 1: [-1.1, 0.5], 2: [-0.5, 1.1], 3: [-1.4, 1.4] };
const HOMING_RANGE = 600;
const BOUNCE_RANGE = 320;
const EXPLOSION_TTL = 0.3;

export function beginAttack(weapon, player, now, nextId) {
  if (now < weapon.readyAt) return [];
  const stats = getWeaponStats(weapon, player.damageMultiplier);
  weapon.readyAt = now + stats.cooldown;
  const modules = [...weapon.modules];
  const facing = player.facing;
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;

  if (stats.kind === 'melee') {
    let stage = 1;
    if (modules.includes('combo')) {
      stage = now - weapon.lastSwingAt <= COMBO_WINDOW ? (weapon.combo % 3) + 1 : 1;
    }
    weapon.combo = stage;
    weapon.lastSwingAt = now;
    const damage = stats.damage * (stage === 3 ? 1.4 : 1);
    const attacks = [{
      id: nextId(), kind: 'melee', owner: 'player', weapon: weapon.id,
      x: cx, y: cy, vx: 0, vy: 0, age: 0, ttl: stats.cooldown,
      windup: stats.windup, activeUntil: stats.activeUntil,
      damage, radius: stats.reach, facing, stage,
      arc: modules.includes('combo') ? COMBO_ARCS[stage] : (modules.includes('wide') ? [-1.4, 1.2] : [-1.1, 0.9]),
      knockback: stats.knockback * (stage === 3 ? 1.8 : 1),
      hitIds: new Set(), modules, pierceLeft: 0, bouncesLeft: 0
    }];
    if (modules.includes('swordwave')) {
      attacks.push({
        id: nextId(), kind: 'projectile', owner: 'player', weapon: 'swordwave',
        x: cx + facing * 24, y: cy, vx: facing * SWORDWAVE.speed, vy: 0, age: 0, ttl: SWORDWAVE.ttl,
        damage: damage * SWORDWAVE.damageRatio, radius: SWORDWAVE.radius, facing,
        hitIds: new Set(), modules, pierceLeft: SWORDWAVE.pierce, bouncesLeft: 0,
        gravity: 0, blastRadius: 0, turnRate: 0, passesTerrain: true
      });
    }
    return attacks;
  }

  return stats.angles.map(angle => ({
    id: nextId(), kind: 'projectile', owner: 'player', weapon: weapon.id,
    x: cx + facing * 20, y: cy - 4,
    vx: Math.cos(angle) * stats.speed * facing,
    vy: Math.sin(angle) * stats.speed + (stats.lift ?? 0),
    age: 0, ttl: stats.ttl, damage: stats.damage, radius: stats.radius, facing,
    hitIds: new Set(), modules, pierceLeft: stats.pierce, bouncesLeft: stats.bounces,
    gravity: stats.gravity ?? 0, blastRadius: stats.blastRadius ?? 0, turnRate: stats.turnRate,
    slowOnHit: stats.slowOnHit ?? 0,
    knockback: modules.includes('knock') ? KNOCKBACK : 0
  }));
}

const alive = enemy => enemy.hp > 0;

function sweep(x0, y0, x1, y1, rect, r) {
  let tmin = 0;
  let tmax = 1;
  const axes = [[x0, x1 - x0, rect.x - r, rect.x + rect.w + r], [y0, y1 - y0, rect.y - r, rect.y + rect.h + r]];
  for (const [start, delta, min, max] of axes) {
    if (Math.abs(delta) < 1e-9) {
      if (start < min || start > max) return null;
      continue;
    }
    const a = (min - start) / delta;
    const b = (max - start) / delta;
    tmin = Math.max(tmin, Math.min(a, b));
    tmax = Math.min(tmax, Math.max(a, b));
    if (tmin > tmax) return null;
  }
  return tmin;
}

function center(entity) {
  return { x: entity.x + entity.w / 2, y: entity.y + entity.h / 2 };
}

function nearest(enemies, x, y, range, exclude) {
  let best = null;
  let bestDistance = range;
  for (const enemy of enemies) {
    if (!alive(enemy) || exclude.has(enemy.id)) continue;
    const c = center(enemy);
    const d = Math.hypot(c.x - x, c.y - y);
    if (d <= bestDistance) {
      best = enemy;
      bestDistance = d;
    }
  }
  return best;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function meleeBox(attack, player) {
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  const tall = attack.stage === 3 ? 16 : 0;
  const x = attack.facing > 0 ? cx - 12 : cx - attack.radius;
  return { x, y: cy - 44 - tall, w: attack.radius + 12, h: 74 + tall * 2 };
}

function stepMelee(run, attack) {
  const player = run.player;
  attack.x = player.x + player.w / 2;
  attack.y = player.y + player.h / 2;
  if (attack.age < attack.windup || attack.age > attack.activeUntil) return;
  const box = meleeBox(attack, player);
  for (const enemy of run.enemies) {
    if (alive(enemy) && overlaps(box, enemy)) resolveHit(attack, enemy, run);
  }
}

function explode(run, attack, x, y) {
  const blast = {
    id: ++run.nextEntityId, kind: 'explosion', owner: 'player', x, y, radius: attack.blastRadius,
    damage: attack.damage, modules: attack.modules, hitIds: new Set()
  };
  for (const enemy of run.enemies) {
    if (!alive(enemy)) continue;
    const nx = Math.max(enemy.x, Math.min(x, enemy.x + enemy.w));
    const ny = Math.max(enemy.y, Math.min(y, enemy.y + enemy.h));
    if (Math.hypot(nx - x, ny - y) <= blast.radius) resolveHit(blast, enemy, run);
  }
  run.effects.push({ kind: 'explosion', x, y, radius: blast.radius, age: 0, ttl: EXPLOSION_TTL });
  attack.done = true;
}

function steer(run, attack, dt) {
  const target = nearest(run.enemies, attack.x, attack.y, HOMING_RANGE, attack.hitIds);
  if (!target) return;
  const c = center(target);
  const speed = Math.hypot(attack.vx, attack.vy);
  const current = Math.atan2(attack.vy, attack.vx);
  let diff = Math.atan2(c.y - attack.y, c.x - attack.x) - current;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  const turn = Math.max(-attack.turnRate * dt, Math.min(attack.turnRate * dt, diff));
  attack.vx = Math.cos(current + turn) * speed;
  attack.vy = Math.sin(current + turn) * speed;
}

function terrainHit(run, x0, y0, x1, y1) {
  let best = null;
  for (const p of run.room.platforms) {
    if (p.solid === false) continue;
    const t = sweep(x0, y0, x1, y1, p, 0);
    if (t !== null && (best === null || t < best)) best = t;
  }
  return best;
}

function stepPlayerProjectile(run, attack, dt) {
  if (attack.turnRate > 0) steer(run, attack, dt);
  attack.vy += (attack.gravity ?? 0) * dt;
  const x0 = attack.x;
  const y0 = attack.y;
  const x1 = x0 + attack.vx * dt;
  const y1 = y0 + attack.vy * dt;

  let hitEnemy = null;
  let hitT = Infinity;
  for (const enemy of run.enemies) {
    if (!alive(enemy) || attack.hitIds.has(enemy.id)) continue;
    const t = sweep(x0, y0, x1, y1, enemy, attack.radius);
    if (t !== null && t < hitT) {
      hitEnemy = enemy;
      hitT = t;
    }
  }
  const wallT = attack.passesTerrain ? null : terrainHit(run, x0, y0, x1, y1);

  if (hitEnemy && (wallT === null || hitT <= wallT)) {
    const px = x0 + (x1 - x0) * hitT;
    const py = y0 + (y1 - y0) * hitT;
    if (attack.blastRadius > 0) {
      explode(run, attack, px, py);
      return;
    }
    resolveHit(attack, hitEnemy, run);
    if (attack.pierceLeft > 0) {
      attack.pierceLeft--;
    } else if (attack.bouncesLeft > 0) {
      const c = center(hitEnemy);
      const next = nearest(run.enemies, c.x, c.y, BOUNCE_RANGE, attack.hitIds);
      if (!next) {
        attack.done = true;
        return;
      }
      attack.bouncesLeft--;
      const nc = center(next);
      const speed = Math.hypot(attack.vx, attack.vy);
      const angle = Math.atan2(nc.y - py, nc.x - px);
      attack.vx = Math.cos(angle) * speed;
      attack.vy = Math.sin(angle) * speed;
      attack.x = px;
      attack.y = py;
      return;
    } else {
      attack.done = true;
      return;
    }
  } else if (wallT !== null) {
    if (attack.blastRadius > 0) explode(run, attack, x0 + (x1 - x0) * wallT, y0 + (y1 - y0) * wallT);
    attack.done = true;
    return;
  }
  attack.x = x1;
  attack.y = y1;
  if (x1 < -60 || x1 > run.room.width + 60 || y1 > run.room.height + 60 || y1 < -200) attack.done = true;
}

function stepEnemyProjectile(run, attack, dt) {
  const x0 = attack.x;
  const y0 = attack.y;
  const x1 = x0 + attack.vx * dt;
  const y1 = y0 + attack.vy * dt;
  if (sweep(x0, y0, x1, y1, run.player, attack.radius) !== null && damagePlayer(run, attack.damage)) {
    attack.done = true;
    return;
  }
  if (terrainHit(run, x0, y0, x1, y1) !== null) {
    attack.done = true;
    return;
  }
  attack.x = x1;
  attack.y = y1;
  if (x1 < -60 || x1 > run.room.width + 60 || y1 > run.room.height + 60 || y1 < -200) attack.done = true;
}

export function stepAttacks(run, dt) {
  for (const attack of run.attacks) {
    attack.age += dt;
    if (attack.age >= attack.ttl) continue;
    if (attack.kind === 'melee') stepMelee(run, attack);
    else if (attack.owner === 'player') stepPlayerProjectile(run, attack, dt);
    else stepEnemyProjectile(run, attack, dt);
    if (run.state === 'dead') break;
  }
  run.attacks = run.attacks.filter(attack => !attack.done && attack.age < attack.ttl);
}
