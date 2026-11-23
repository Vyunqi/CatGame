import { createStatuses, stepStatuses } from '../combat/damage.js';
import { MONSTERS } from './monster-definitions.js';
import { stepEnemySkill } from './enemy-skills.js';
import { stepEnemyAttack } from '../combat/enemy-attacks.js';

export function makeEnemy(kind, spawn, id, scale = 1) {
  const def = MONSTERS[kind];
  const { w, h, speed } = def.stats;
  const hp = def.boss ? def.stats.hp : Math.round(def.stats.hp * scale);
  return { id, kind, x: spawn.x, y: spawn.y - h, w, h, speed, vx: 0, vy: 0,
    hp, maxHp: hp, boss: def.boss, facing: -1, statuses: createStatuses(),
    hurtFor: 0, knockFor: 0, jumpFor: 0, leaping: false, leapVx: 0, aggroFor: 0,
    localTime: 0, phase: 'idle', phaseTime: 0, skill: null, readyAt: 0, actionId: null,
    lockedTarget: null, impactFor: 0 };
}

export function stepEnemies(run, dt) {
  if (run.state !== 'playing') return;
  for (const enemy of run.enemies) {
    if (enemy.hp <= 0) continue;
    const frozen = enemy.statuses.frozenFor > 0;
    const slow = enemy.statuses.slowFor > 0 ? (enemy.boss ? 0.6 : 0.5) : 1;
    stepStatuses(enemy, dt);
    enemy.hurtFor = Math.max(0, enemy.hurtFor - dt);
    if (enemy.hp <= 0 || frozen) continue;
    enemy.impactFor = Math.max(0, enemy.impactFor - dt * slow);
    stepEnemySkill(enemy, run, dt, slow);
    for (const attack of run.attacks) {
      if (!attack.done && attack.kind === 'enemyMelee' && attack.sourceId === enemy.id) stepEnemyAttack(run, attack, 0);
      if (run.state === 'dead') return;
    }
    enemy.knockFor = Math.max(0, enemy.knockFor - dt);
    enemy.jumpFor = Math.max(0, enemy.jumpFor - dt);
    if (enemy.y > 700) enemy.hp = 0;
    if (run.state === 'dead') return;
  }
}
