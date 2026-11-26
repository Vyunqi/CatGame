import { WEAPONS, createWeapon } from '../combat/catalog.js';
import { switchWeapon } from '../combat/loadout.js';
import { beginAttack, stepAttacks } from '../combat/attacks.js';
import { damagePlayer } from '../combat/damage.js';
import { stepEnemies } from '../entities/enemies.js';
import { createPlayer, stepPlayer, restoreSafePosition } from '../world/physics.js';
import { createRng, zoneOf, BOSS_ROOM } from '../world/rooms.js';
import { enterRoom, makeRewards, advanceRoom, openChest } from './progression.js';

const FALL_DAMAGE = 20;
const PAUSABLE = ['playing', 'reward', 'shop', 'equipment'];
const BOSS_SCORE = 500;
const CLEAR_SCORE = 50;

export function createRun(seed, startingWeapon) {
  if (!WEAPONS[startingWeapon]) throw new Error(`unknown weapon: ${startingWeapon}`);
  const run = {
    seed: seed >>> 0,
    rng: createRng((seed ^ 0x5bd1e995) >>> 0),
    state: 'playing', resumeState: null, time: 0,
    roomIndex: 0, room: null,
    player: createPlayer({ x: 80, y: 392 }),
    weapons: [createWeapon(startingWeapon)], activeWeapon: 0,
    coins: 0, score: 0,
    enemies: [], attacks: [], pickups: [], effects: [],
    pending: null, rewardShown: false, nextEntityId: 0,
    chestCursor: 0, shake: 0
  };
  enterRoom(run, 0);
  return run;
}

export function pauseRun(run) {
  if (!PAUSABLE.includes(run.state)) return;
  run.resumeState = run.state;
  run.state = 'paused';
}

export function resumeRun(run) {
  if (run.state !== 'paused') return;
  run.state = run.resumeState ?? 'playing';
  run.resumeState = null;
}

function overlaps(a, b, pad = 0) {
  return a.x < b.x + b.w + pad && a.x + a.w > b.x - pad && a.y < b.y + b.h + pad && a.y + a.h > b.y - pad;
}

function pushText(run, text) {
  const p = run.player;
  run.effects.push({ kind: 'text', x: p.x + p.w / 2, y: p.y - 12, text, color: '#ffe680', age: 0, ttl: 1.2 });
}

function collectDefeated(run) {
  const alive = [];
  for (const enemy of run.enemies) {
    if (enemy.hp > 0) {
      alive.push(enemy);
      continue;
    }
    if (enemy.boss) {
      run.score += BOSS_SCORE;
      run.enemies = [];
      run.attacks = [];
      run.effects = [];
      run.pending = null;
      run.state = 'won';
      return;
    }
    const coins = 5 + Math.floor(run.rng() * 5);
    run.coins += coins;
    run.score += 10 * (zoneOf(run.roomIndex) + 1);
    run.effects.push({ kind: 'coin', x: enemy.x + enemy.w / 2, y: enemy.y, value: coins, age: 0, ttl: 0.8 });
  }
  run.enemies = alive;
}

function collectPickups(run) {
  run.pickups = run.pickups.filter(pickup => {
    const box = { x: pickup.x - 8, y: pickup.y - 8, w: 16, h: 16 };
    if (!overlaps(run.player, box)) return true;
    run.coins += pickup.value;
    run.score += pickup.value;
    return false;
  });
}

function handleRoomCompletion(run) {
  if (run.roomIndex >= BOSS_ROOM || run.rewardShown || run.enemies.length > 0) return;
  run.rewardShown = true;
  run.score += CLEAR_SCORE;
  run.pending = { source: 'reward', offers: makeRewards(run), offerIndex: null };
  run.state = 'reward';
}

export function canOpenChest(player, chest) {
  return !chest.opened && overlaps(player, chest, 24);
}

function handleInteraction(run) {
  const exit = run.room.exit;
  if (exit && overlaps(run.player, exit, 16)) {
    if (!advanceRoom(run).ok) pushText(run, '先清空房间的敌人');
    return;
  }
  const chest = run.room.chests.find(c => canOpenChest(run.player, c));
  if (chest) openChest(run, chest);
}

function ageEffects(run, dt) {
  for (const effect of run.effects) effect.age += dt;
  run.effects = run.effects.filter(effect => effect.age < effect.ttl);
  run.shake = Math.max(0, run.shake - dt);
}

export function updateRun(run, input, dt) {
  if (run.state !== 'playing') return;
  run.time += dt;
  const player = run.player;
  const movement = stepPlayer(player, input, run.room.platforms, dt);
  if (movement.fell) {
    damagePlayer(run, FALL_DAMAGE, { ignoreInvulnerability: true });
    if (run.state === 'dead') return;
    restoreSafePosition(player);
    input.clear();
  }
  player.x = Math.max(0, Math.min(run.room.width - player.w, player.x));
  if (input.consume('switch')) switchWeapon(run);
  if (input.held('attack')) {
    const attacks = beginAttack(run.weapons[run.activeWeapon], player, run.time, () => ++run.nextEntityId);
    run.attacks.push(...attacks);
  }
  stepEnemies(run, dt);
  if (run.state === 'dead') return;
  stepAttacks(run, dt);
  if (run.state === 'dead') return;
  collectDefeated(run);
  if (run.state === 'won') return;
  collectPickups(run);
  ageEffects(run, dt);
  handleRoomCompletion(run);
  if (run.state === 'playing' && input.consume('interact')) handleInteraction(run);
}
