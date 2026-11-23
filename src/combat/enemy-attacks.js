import { damagePlayer } from './damage.js';

export function sweep(x0, y0, x1, y1, rect, radius = 0) {
  let lo = 0, hi = 1;
  for (const [start, delta, min, max] of [[x0, x1 - x0, rect.x - radius, rect.x + rect.w + radius], [y0, y1 - y0, rect.y - radius, rect.y + rect.h + radius]]) {
    if (Math.abs(delta) < 1e-9) { if (start < min || start > max) return null; continue; }
    const a = (min - start) / delta, b = (max - start) / delta;
    lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
    if (lo > hi) return null;
  }
  return lo;
}

export function solidHit(room, x0, y0, x1, y1, radius = 0) {
  let best = null;
  for (const p of room.platforms) {
    if (p.solid === false) continue;
    const t = sweep(x0, y0, x1, y1, p, radius);
    if (t !== null && (best === null || t < best)) best = t;
  }
  return best;
}

export function emitEnemyAttack(enemy, run, skill) {
  const base = { sourceId: enemy.id, actionId: enemy.actionId, owner: 'enemy', weapon: enemy.skill,
    x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2, age: 0, ttl: skill.ttl ?? Infinity,
    damage: skill.damage, hitIds: new Set(), modules: [] };
  const add = attack => { run.attacks.push({ ...base, ...attack, id: ++run.nextEntityId }); };
  if (skill.type === 'melee' || skill.type === 'charge') {
    add({ kind: 'enemyMelee', reach: skill.reach, height: skill.height, facing: enemy.facing,
      charge: skill.type === 'charge', segments: [] });
  } else if (skill.type === 'projectile') {
    const p = run.player;
    const angle = Math.atan2(p.y + p.h / 2 - base.y, p.x + p.w / 2 - base.x);
    add({ kind: 'projectile', vx: Math.cos(angle) * skill.speed, vy: Math.sin(angle) * skill.speed, radius: skill.radius });
  } else if (skill.type === 'durian') {
    const count = enemy.lockedTarget.count;
    const extent = (count - 1) / 2 * 144;
    const anchor = Math.max(80 + extent, Math.min(run.room.width - 80 - extent, enemy.lockedTarget.x));
    const ground = run.room.platforms.find(p => p.solid !== false && p.x <= 0 && p.x + p.w >= run.room.width);
    const x = enemy.x + enemy.w / 2 + enemy.facing * 26;
    const y = enemy.y + enemy.h * 0.42;
    for (let i = 0; i < count; i++) {
      const targetX = anchor + (i - (count - 1) / 2) * 144;
      const targetY = ground.y - skill.radius;
      const flight = 0.9 + i * 0.3 / (count - 1) + Math.abs(targetX - x) / 1400;
      const d = 1 / 60, n = Math.ceil(flight / d);
      add({ kind: 'durian', weapon: 'durian', phase: 'flying', x, y, targetX, targetY,
        vx: (targetX - x) / (n * d), vy: (targetY - y - skill.gravity * d * d * n * (n + 1) / 2) / (n * d),
        gravity: skill.gravity, radius: skill.radius, blastRadius: skill.blastRadius, fuse: skill.fuse, fuseTime: 0 });
    }
  }
}

function hitMelee(run, attack) {
  const e = run.enemies.find(e => e.id === attack.sourceId);
  if (!e || e.hp <= 0 || e.actionId !== attack.actionId || e.knockFor > 0) { attack.done = true; return; }
  if (e.statuses.frozenFor > 0) return;
  if (attack.hitIds.has('player')) { attack.segments = []; if (e.phase !== 'active') attack.done = true; return; }
  let touches = false;
  if (attack.charge) {
    for (const [x0, y0, x1, y1] of attack.segments) {
      const rect = { x: run.player.x - e.w, y: run.player.y - e.h, w: run.player.w + e.w, h: run.player.h + e.h };
      if (sweep(x0, y0, x1, y1, rect) !== null) touches = true;
    }
    attack.segments = [];
  } else if (e.phase === 'active') {
    const x = attack.facing > 0 ? e.x + e.w / 2 : e.x - attack.reach;
    const box = { x, y: e.y + e.h / 2 - attack.height / 2, w: attack.reach + e.w / 2, h: attack.height };
    touches = sweep(run.player.x + run.player.w / 2, run.player.y + run.player.h / 2,
      run.player.x + run.player.w / 2, run.player.y + run.player.h / 2,
      { x: box.x - run.player.w / 2, y: box.y - run.player.h / 2, w: box.w + run.player.w, h: box.h + run.player.h }) !== null;
  }
  if (touches) {
    attack.hitIds.add('player');
    if (damagePlayer(run, attack.damage)) e.impactFor = 0.20;
  }
  if (e.phase !== 'active') attack.done = true;
}

function explodeDurian(run, attack) {
  attack.done = true;
  attack.phase = 'exploded';
  const p = run.player;
  const nx = Math.max(p.x, Math.min(p.x + p.w, attack.x));
  const ny = Math.max(p.y, Math.min(p.y + p.h, attack.y));
  if (Math.hypot(nx - attack.x, ny - attack.y) <= attack.blastRadius) damagePlayer(run, attack.damage);
  run.effects.push({ kind: 'durianExplosion', x: attack.x, y: attack.y, radius: attack.blastRadius, age: 0, ttl: 0.5 });
}

export function stepEnemyAttack(run, attack, dt) {
  if (attack.kind === 'enemyMelee') { hitMelee(run, attack); return; }
  if (attack.kind === 'durian' && attack.phase === 'armed') {
    attack.fuseTime += dt;
    if (attack.fuseTime >= attack.fuse - 1e-9) explodeDurian(run, attack);
    return;
  }
  attack.vy += (attack.gravity ?? 0) * dt;
  const x1 = attack.x + attack.vx * dt, y1 = attack.y + attack.vy * dt;
  const wall = solidHit(run.room, attack.x, attack.y, x1, y1, attack.radius);
  const player = attack.kind === 'durian' ? null : sweep(attack.x, attack.y, x1, y1, run.player, attack.radius);
  if (player !== null && (wall === null || player < wall)) {
    damagePlayer(run, attack.damage); attack.done = true; return;
  }
  if (wall !== null) {
    attack.x += (x1 - attack.x) * wall; attack.y += (y1 - attack.y) * wall;
    if (attack.kind === 'durian') { attack.phase = 'armed'; attack.vx = 0; attack.vy = 0; }
    else attack.done = true;
    return;
  }
  attack.x = x1; attack.y = y1;
  if (x1 < -60 || x1 > run.room.width + 60 || (attack.kind !== 'durian' && y1 < -60) || y1 > run.room.height + 60) attack.done = true;
}
