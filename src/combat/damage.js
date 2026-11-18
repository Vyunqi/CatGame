import { CRIT_CHANCE, CRIT_MULT } from './catalog.js';

export const BURN = { duration: 2, interval: 0.4, damage: 2 };
export const FROST = { slow: 1.2, hitsToFreeze: 3, freeze: 0.7 };
export const LEECH_RATIO = 0.08;
export const PLAYER_INVULNERABILITY = 0.7;

export function createStatuses() {
  return { burnFor: 0, burnTickFor: 0, slowFor: 0, frozenFor: 0, chillHits: 0 };
}

function pushNumber(run, target, value, color) {
  run.effects?.push({
    kind: 'number', x: target.x + (target.w ?? 0) / 2, y: target.y, value: Math.round(value),
    color, age: 0, ttl: 0.7
  });
}

export function resolveHit(attack, target, run, kind = 'direct') {
  if (target.hp <= 0 || attack.hitIds.has(target.id)) return 0;
  attack.hitIds.add(target.id);
  const isCrit = attack.modules.includes('crit') && run.rng() < CRIT_CHANCE;
  const damage = attack.damage * (isCrit ? CRIT_MULT : 1);
  const dealt = Math.min(target.hp, damage);
  target.hp -= dealt;
  target.hurtFor = 0.12;
  if (dealt > 0) pushNumber(run, target, dealt, isCrit ? '#ffd84a' : '#fff6d0');
  if (kind !== 'direct') return dealt;

  const statuses = target.statuses;
  if (attack.slowOnHit) statuses.slowFor = Math.max(statuses.slowFor, attack.slowOnHit);
  if (attack.modules.includes('burn')) {
    statuses.burnFor = BURN.duration;
    if (statuses.burnTickFor <= 0) statuses.burnTickFor = BURN.interval;
  }
  if (attack.modules.includes('frost')) {
    statuses.chillHits++;
    statuses.slowFor = Math.max(statuses.slowFor, FROST.slow);
    if (!target.boss && statuses.chillHits >= FROST.hitsToFreeze) {
      statuses.frozenFor = FROST.freeze;
      statuses.chillHits = 0;
    }
  }
  if (attack.modules.includes('leech') && run.player) {
    run.player.hp = Math.min(run.player.maxHp, run.player.hp + dealt * LEECH_RATIO);
  }
  if (attack.knockback && !target.boss) {
    target.vx = attack.facing * attack.knockback;
    target.knockFor = 0.18;
  }
  return dealt;
}

export function stepStatuses(target, dt) {
  const s = target.statuses;
  if (s.burnFor > 0) {
    s.burnFor -= dt;
    s.burnTickFor -= dt;
    if (s.burnTickFor <= 1e-9 && target.hp > 0) {
      target.hp -= Math.min(target.hp, BURN.damage);
      target.hurtFor = 0.08;
      s.burnTickFor += BURN.interval;
    }
    if (s.burnFor <= 1e-9) {
      s.burnFor = 0;
      s.burnTickFor = 0;
    }
  }
  s.slowFor = Math.max(0, s.slowFor - dt);
  s.frozenFor = Math.max(0, s.frozenFor - dt);
}

export function damagePlayer(run, amount, { ignoreInvulnerability = false } = {}) {
  const player = run.player;
  if (run.state !== 'playing' || player.hp <= 0) return false;
  if (!ignoreInvulnerability && player.invulnerableFor > 0) return false;
  player.hp = Math.max(0, player.hp - amount);
  player.invulnerableFor = PLAYER_INVULNERABILITY;
  player.hurtFor = 0.22;
  pushNumber(run, player, amount, '#ff6b5e');
  run.shake = 0.18;
  if (player.hp <= 0) {
    run.state = 'dead';
    run.pending = null;
  }
  return true;
}
