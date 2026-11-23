import { WEAPONS, MODULES } from '../combat/catalog.js';
import { equipWeapon, installModule, compatibleModules } from '../combat/loadout.js';
import { makeEnemy } from '../entities/enemies.js';
import { restoreSafePosition } from '../world/physics.js';
import { generateRoom, zoneOf, BOSS_ROOM } from '../world/rooms.js';

export const PRICES = { heal: 25, weapon: 40, module: 30 };
export const SHOP_AFTER = [1, 3];
export const ZONE_HP = [1, 1.25, 1.5];
const HEAL_AMOUNT = 30;
const MAX_HP_BONUS = 20;
const DAMAGE_BONUS = 1.12;
const CHEST_ORDER = ['icecream', 'crossbow', 'yarn', 'sword', 'hammer', 'laser', 'bomb'];

const fail = reason => ({ ok: false, reason });

function pickOne(run, list) {
  return list[Math.floor(run.rng() * list.length)];
}

function compatibleNames(id) {
  return MODULES[id].compatible.map(w => WEAPONS[w].name).join('、');
}

function moduleOffer(id, price = 0) {
  const m = MODULES[id];
  return { kind: 'module', id, label: `模组：${m.name}`, description: `${m.description} 适用：${compatibleNames(id)}。`, price };
}

function weaponOffer(id, price = 0) {
  const w = WEAPONS[id];
  return { kind: 'weapon', id, label: `武器：${w.name}`, description: w.description, price };
}

const STAT_OFFERS = {
  maxHp: () => ({ kind: 'maxHp', id: 'maxHp', label: '强健体魄', description: `最大生命 +${MAX_HP_BONUS}，并回复 ${MAX_HP_BONUS} 生命。`, price: 0 }),
  damage: () => ({ kind: 'damage', id: 'damage', label: '锋利爪牙', description: '所有武器伤害 ×1.12。', price: 0 }),
  doubleJump: () => ({ kind: 'doubleJump', id: 'doubleJump', label: '猫跳', description: '获得二段跳。', price: 0 })
};

function availableModules(run) {
  return [...new Set(run.weapons.flatMap(compatibleModules))];
}

export function makeRewards(run) {
  const offers = [STAT_OFFERS[run.rng() < 0.5 ? 'maxHp' : 'damage']()];
  const moduleIds = availableModules(run);
  const pool = moduleIds.map(id => () => moduleOffer(id));
  if (moduleIds.length > 0) {
    const index = Math.floor(run.rng() * moduleIds.length);
    offers.push(moduleOffer(moduleIds[index]));
    pool.splice(index, 1);
  }
  for (const kind of ['maxHp', 'damage']) {
    if (kind !== offers[0].kind) pool.push(STAT_OFFERS[kind]);
  }
  if (run.player.maxJumps < 2) pool.push(STAT_OFFERS.doubleJump);
  while (offers.length < 3 && pool.length > 0) {
    const index = Math.floor(run.rng() * pool.length);
    offers.push(pool.splice(index, 1)[0]());
  }
  return offers;
}

export function makeShop(run) {
  const offers = [{ kind: 'heal', id: 'heal', label: '小鱼干', description: `回复 ${HEAL_AMOUNT} 生命。`, price: PRICES.heal }];
  const weapons = Object.keys(WEAPONS).filter(id => !run.weapons.some(w => w.id === id));
  if (weapons.length > 0) offers.push(weaponOffer(pickOne(run, weapons), PRICES.weapon));
  const modules = availableModules(run);
  for (let i = 0; i < 3 && modules.length > 0; i++) {
    const index = Math.floor(run.rng() * modules.length);
    offers.push(moduleOffer(modules.splice(index, 1)[0], PRICES.module));
  }
  return offers;
}

function applyOffer(run, offer, { weaponSlot = null, replaceIndex = null } = {}) {
  const player = run.player;
  switch (offer.kind) {
    case 'module': {
      const weapon = run.weapons[weaponSlot];
      if (!weapon) return fail('choose-weapon');
      return installModule(weapon, offer.id, replaceIndex);
    }
    case 'weapon': {
      const result = equipWeapon(run, offer.id, weaponSlot);
      if (result.ok && weaponSlot === null) run.activeWeapon = run.weapons.length - 1;
      return result;
    }
    case 'heal':
      if (player.hp >= player.maxHp) return fail('full-hp');
      player.hp = Math.min(player.maxHp, player.hp + HEAL_AMOUNT);
      return { ok: true };
    case 'maxHp':
      player.maxHp += MAX_HP_BONUS;
      player.hp = Math.min(player.maxHp, player.hp + MAX_HP_BONUS);
      return { ok: true };
    case 'damage':
      player.damageMultiplier *= DAMAGE_BONUS;
      return { ok: true };
    case 'doubleJump':
      if (player.maxJumps >= 2) return fail('owned');
      player.maxJumps = 2;
      return { ok: true };
    default:
      return fail('unknown');
  }
}

function closeReward(run) {
  if (run.pending.source === 'reward') run.room.rewardClaimed = true;
  run.pending = null;
  run.state = 'playing';
}

export function selectReward(run, index, choice = {}) {
  if (run.state !== 'reward') return fail('state');
  const offer = run.pending?.offers[index];
  if (!offer) return fail('bad-offer');
  const result = applyOffer(run, offer, choice);
  if (!result.ok) return result;
  closeReward(run);
  return { ok: true };
}

export function skipReward(run) {
  if (run.state !== 'reward') return fail('state');
  closeReward(run);
  return { ok: true };
}

export function purchase(run, index, choice = {}) {
  if (run.state !== 'shop') return fail('state');
  const offer = run.pending?.offers[index];
  if (!offer) return fail('bad-offer');
  if (offer.sold) return fail('sold');
  if (run.coins < offer.price) return fail('coins');
  const result = applyOffer(run, offer, choice);
  if (!result.ok) return result;
  run.coins -= offer.price;
  offer.sold = true;
  return { ok: true };
}

export function openEquipment(run, offerIndex) {
  if (run.state !== 'reward' && run.state !== 'shop') return fail('state');
  if (!run.pending?.offers[offerIndex]) return fail('bad-offer');
  run.pending.offerIndex = offerIndex;
  run.pending.returnState = run.state;
  run.state = 'equipment';
  return { ok: true };
}

export function closeEquipment(run) {
  if (run.state !== 'equipment') return;
  run.state = run.pending.returnState;
  run.pending.offerIndex = null;
}

export function openChest(run, chest) {
  if (chest.opened) return fail('opened');
  const start = run.chestCursor % CHEST_ORDER.length;
  for (let i = 0; i < CHEST_ORDER.length; i++) {
    const slot = (start + i) % CHEST_ORDER.length;
    const id = CHEST_ORDER[slot];
    if (run.weapons.some(w => w.id === id)) continue;
    chest.opened = true;
    run.chestCursor = slot + 1;
    run.pending = { source: 'chest', offers: [weaponOffer(id)], offerIndex: null };
    run.state = 'reward';
    return { ok: true };
  }
  return fail('empty');
}

export function enterRoom(run, index) {
  const room = generateRoom(run.seed, index);
  const scale = ZONE_HP[zoneOf(Math.min(index, BOSS_ROOM - 1))];
  run.roomIndex = index;
  run.room = room;
  run.enemies = index >= BOSS_ROOM
    ? [makeEnemy('ratBoss', room.bossSpawn, ++run.nextEntityId)]
    : room.enemySpawns.map(s => makeEnemy(s.kind, s, ++run.nextEntityId, scale));
  run.attacks = [];
  run.effects = [];
  run.pickups = room.coins.map(c => ({ kind: 'coin', x: c.x, y: c.y, value: 3 }));
  run.pending = null;
  run.rewardShown = false;
  run.state = 'playing';
  const player = run.player;
  player.safe = { ...room.spawn };
  restoreSafePosition(player);
  player.facing = 1;
  player.invulnerableFor = 0;
  player.dashCooldownFor = 0;
}

export function advanceRoom(run) {
  if (run.state !== 'playing') return fail('state');
  if (run.roomIndex >= BOSS_ROOM || !run.room.rewardClaimed) return fail('locked');
  if (SHOP_AFTER.includes(run.roomIndex)) {
    run.pending = { source: 'shop', offers: makeShop(run), offerIndex: null };
    run.state = 'shop';
    return { ok: true };
  }
  enterRoom(run, run.roomIndex + 1);
  return { ok: true };
}

export function leaveShop(run) {
  if (run.state !== 'shop') return fail('state');
  enterRoom(run, run.roomIndex + 1);
  return { ok: true };
}
