export const WEAPONS = {
  icecream: {
    name: '冰淇淋发射器', kind: 'projectile', damage: 12, speed: 520, cooldown: 0.38,
    radius: 9, ttl: 1.4, slowOnHit: 0.8,
    description: '水平发射甜筒，命中造成伤害并短暂减速。'
  },
  crossbow: {
    name: '鱼骨弩', kind: 'projectile', damage: 22, speed: 820, cooldown: 0.55, pierce: 1,
    radius: 7, ttl: 1.1,
    description: '高速鱼骨弹，可额外穿透一个敌人。'
  },
  yarn: {
    name: '毛线球炮', kind: 'projectile', damage: 18, speed: 360, cooldown: 0.72, gravity: 600, blastRadius: 96,
    radius: 11, ttl: 2, lift: -220,
    description: '弧线飞行的毛线球，碰到敌人或地形时小范围爆炸。'
  },
  sword: {
    name: '长剑', kind: 'melee', damage: 24, cooldown: 0.44, reach: 76,
    windup: 0.05, activeUntil: 0.16, knockback: 260,
    description: '前方弧形挥砍，每次挥砍对同一敌人只结算一次，带击退。'
  }
};

export const MODULES = {
  scatter: { name: '散射', compatible: ['icecream', 'crossbow', 'yarn'], description: '一次发射三个方向，单发伤害降低。' },
  rapid: { name: '连射', compatible: ['icecream', 'crossbow', 'yarn'], description: '攻击间隔缩短 35%。' },
  bounce: { name: '弹射', compatible: ['icecream', 'crossbow'], description: '命中后弹向附近未命中的敌人，最多两次。' },
  homing: { name: '追踪', compatible: ['icecream', 'crossbow', 'yarn'], description: '弹丸缓慢转向附近敌人。' },
  burn: { name: '燃烧', compatible: ['icecream', 'crossbow', 'yarn', 'sword'], description: '命中后持续灼烧 2 秒，重复命中刷新时间。' },
  frost: { name: '冰冻', compatible: ['icecream', 'crossbow', 'yarn', 'sword'], description: '命中减速，连续三次冻结敌人；Boss 只减速。' },
  combo: { name: '连斩', compatible: ['sword'], description: '连续挥砍形成三段斩击，第三段更强并大幅击退。' },
  swordwave: { name: '剑气', compatible: ['sword'], description: '挥砍时同时放出一道向前飞行的剑气。' },
  leech: { name: '吸血', compatible: ['icecream', 'crossbow', 'yarn', 'sword'], description: '按造成伤害的 8% 回复生命。' }
};

export const SCATTER_ANGLES = [-0.18, 0, 0.18];
export const COMBO_WINDOW = 0.8;

export function createWeapon(id) {
  return { id, modules: [], readyAt: 0, combo: 0, lastSwingAt: -Infinity };
}

export function getWeaponStats(weapon, damageMultiplier = 1) {
  const base = WEAPONS[weapon.id];
  const has = id => weapon.modules.includes(id);
  const scatter = base.kind === 'projectile' && has('scatter');
  return {
    ...base,
    damage: base.damage * (scatter ? 0.55 : 1) * damageMultiplier,
    cooldown: base.cooldown * (has('rapid') ? 0.65 : 1),
    angles: scatter ? SCATTER_ANGLES : [0],
    pierce: base.pierce ?? 0,
    bounces: has('bounce') ? 2 : 0,
    turnRate: has('homing') ? 3 : 0
  };
}
