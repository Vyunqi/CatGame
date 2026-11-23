import { MONSTERS, SKILLS } from './monster-definitions.js';
import { supportOf, chaseMove, moveOnGround, moveInAir, canSee, continuousAhead } from './enemy-movement.js';
import { emitEnemyAttack } from '../combat/enemy-attacks.js';

function targetDelta(e, p) {
  return { dx: p.x + p.w / 2 - e.x - e.w / 2, dy: p.y + p.h / 2 - e.y - e.h / 2,
    gap: Math.max(0, p.x - e.x - e.w, e.x - p.x - p.w) };
}
function selectSkill(e, run, def, delta) {
  if (e.knockFor > 0 || e.leaping || e.localTime < e.readyAt) return null;
  for (const id of def.skills) {
    const s = SKILLS[id];
    if (s.type === 'durian') return id;
    if (s.type === 'projectile') { if (e.aggroFor > 0 && canSee(e, run)) return id; }
    else if (supportOf(e, run.room.platforms) && e.aggroFor > 0) {
      if (s.type === 'melee' && delta.gap <= s.reach && Math.abs(delta.dy) <= s.maxDy) return id;
      if (s.type === 'charge' && delta.gap >= 120 && Math.abs(delta.dy) <= 64 && continuousAhead(e, run, 24)) return id;
    }
  }
  return null;
}
export function recoverEnemy(e) { e.phase = 'recovery'; e.phaseTime = 0; }

function move(e, run, def, phase, s, dt, slow) {
  const p = run.player, delta = targetDelta(e, p);
  if (def.movement === 'air') {
    let vx = 0, vy = 0;
    if (phase === 'idle' || phase === 'cooldown') {
      const dir = Math.sign(delta.dx);
      if (Math.abs(delta.dx) < 280) vx = -dir * e.speed;
      else if (Math.abs(delta.dx) > 420 && e.aggroFor > 0) vx = dir * e.speed;
      const targetY = p.y + p.h / 2 - 110;
      vy = Math.max(-60, Math.min(60, (targetY - e.y - e.h / 2) * 1.5));
      const speed = Math.hypot(vx, vy);
      if (speed > e.speed) { vx *= e.speed / speed; vy *= e.speed / speed; }
    }
    moveInAir(e, run, vx * slow, vy * slow, dt); return;
  }
  if (phase === 'active' && s.type === 'charge') {
    const x = e.x, y = e.y;
    const blocked = moveOnGround(e, run, e.facing * s.speed * slow, dt, true);
    const attack = run.attacks.find(a => a.kind === 'enemyMelee' && a.actionId === e.actionId);
    if (attack) attack.segments.push([x, y, e.x, e.y]);
    if (blocked) recoverEnemy(e);
  } else if (phase === 'idle' || phase === 'cooldown') {
    if (def.movement === 'bossGround') {
      const desired = Math.abs(delta.dx) > 420 ? e.facing * e.speed * slow : Math.abs(delta.dx) < 260 ? -e.facing * e.speed * slow : 0;
      moveOnGround(e, run, desired, dt, true);
    } else if (e.aggroFor > 0) chaseMove(e, run, e.facing * def.chaseSpeed * slow, dt, delta.dx, delta.dy);
    else if (moveOnGround(e, run, e.facing * e.speed * slow, dt) && e.knockFor <= 0) e.facing *= -1;
  } else moveOnGround(e, run, 0, dt, true);
}

export function stepEnemySkill(e, run, dt, slow) {
  const def = MONSTERS[e.kind], delta = targetDelta(e, run.player);
  const [rx, ry] = def.detection;
  if (Math.abs(delta.dx) < rx && Math.abs(delta.dy) < ry) e.aggroFor = 3;
  else e.aggroFor = Math.max(0, e.aggroFor - dt);
  if (e.phase === 'idle' || e.phase === 'cooldown') {
    if (e.aggroFor > 0 || e.boss) e.facing = Math.sign(delta.dx) || e.facing;
    if (e.phase === 'cooldown' && e.localTime >= e.readyAt - 1e-9) e.phase = 'idle';
    if (e.phase === 'idle') {
      const id = selectSkill(e, run, def, delta);
      if (id) {
        e.skill = id; e.phase = 'windup'; e.phaseTime = 0; e.actionId = ++run.nextEntityId;
        e.impactFor = 0;
        e.lockedTarget = { x: run.player.x + run.player.w / 2, count: e.boss && e.hp < e.maxHp * 0.4 ? 5 : 3 };
      }
    }
  }
  const s = SKILLS[e.skill];
  if (e.knockFor > 0 && s && (s.type === 'melee' || s.type === 'charge') && ['windup', 'active'].includes(e.phase)) recoverEnemy(e);
  let remaining = dt;
  while (remaining > 1e-9) {
    const phase = e.phase;
    const duration = phase === 'windup' ? s.windup : phase === 'active' ? s.active : phase === 'recovery' ? s.recovery : Infinity;
    const slice = Math.min(remaining, Math.max(0, duration - e.phaseTime) / slow);
    move(e, run, def, phase, s, slice, slow);
    e.localTime += slice * slow;
    if (e.phase === phase) e.phaseTime += slice * slow;
    remaining -= slice;
    if (e.phase !== phase) continue;
    if (e.phaseTime < duration - 1e-9) break;
    e.phaseTime = 0;
    if (phase === 'windup') { e.phase = 'active'; emitEnemyAttack(e, run, s); }
    else if (phase === 'active') e.phase = 'recovery';
    else { e.phase = 'cooldown'; e.readyAt = e.localTime + s.cooldown; }
  }
}
