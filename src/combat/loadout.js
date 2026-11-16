import { WEAPONS, MODULES, createWeapon } from './catalog.js';

export const MAX_WEAPONS = 2;
export const MAX_MODULES = 3;

const fail = reason => ({ ok: false, reason });

export function isCompatible(weaponId, moduleId) {
  return MODULES[moduleId]?.compatible.includes(weaponId) ?? false;
}

export function compatibleModules(weapon) {
  return Object.keys(MODULES).filter(id => isCompatible(weapon.id, id) && !weapon.modules.includes(id));
}

export function installModule(weapon, id, replaceIndex = null) {
  if (!MODULES[id]) return fail('unknown');
  if (!isCompatible(weapon.id, id)) return fail('incompatible');
  if (weapon.modules.some((m, i) => m === id && i !== replaceIndex)) return fail('duplicate');
  if (replaceIndex === null) {
    if (weapon.modules.length >= MAX_MODULES) return fail('full');
    weapon.modules.push(id);
    return { ok: true };
  }
  if (!Number.isInteger(replaceIndex) || replaceIndex < 0 || replaceIndex >= weapon.modules.length) {
    return fail('bad-slot');
  }
  weapon.modules[replaceIndex] = id;
  return { ok: true };
}

export function equipWeapon(run, id, slot = null) {
  if (!WEAPONS[id]) return fail('unknown');
  if (run.weapons.some(w => w.id === id)) return fail('owned');
  if (slot === null) {
    if (run.weapons.length >= MAX_WEAPONS) return fail('full');
    run.weapons.push(createWeapon(id));
    return { ok: true };
  }
  if (!Number.isInteger(slot) || slot < 0 || slot >= run.weapons.length) return fail('bad-slot');
  run.weapons[slot] = createWeapon(id);
  return { ok: true };
}

export function switchWeapon(run) {
  if (run.weapons.length > 1) run.activeWeapon = (run.activeWeapon + 1) % run.weapons.length;
}
