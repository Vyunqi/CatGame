export const SKILLS = {
  bite: { type: 'melee', windup: 0.24, active: 0.12, recovery: 0.40, cooldown: 0.45, damage: 10, reach: 36, height: 34, maxDy: 30 },
  headbutt: { type: 'melee', windup: 0.30, active: 0.12, recovery: 0.45, cooldown: 0.65, damage: 10, reach: 44, height: 36, maxDy: 32 },
  charge: { type: 'charge', windup: 0.50, active: 0.70, recovery: 0.90, cooldown: 0.80, damage: 16, speed: 440 },
  needle: { type: 'projectile', windup: 0.30, active: 0.12, recovery: 0.25, cooldown: 0.93, damage: 8, speed: 300, radius: 6, ttl: 2.5 },
  durianVolley: { type: 'durian', windup: 0.60, active: 0.12, recovery: 1.20, cooldown: 0.80, damage: 14, gravity: 760, radius: 9, blastRadius: 44, fuse: 0.60, ttl: 6 }
};

export const MONSTERS = {
  ant: { stats: { w: 34, h: 30, hp: 30, speed: 70 }, movement: 'ground', chaseSpeed: 112, detection: [420, 240], skills: ['bite'], animations: { idle: 'ant-idle', bite: 'ant-bite' }, boss: false },
  boar: { stats: { w: 40, h: 32, hp: 44, speed: 60 }, movement: 'ground', chaseSpeed: 96, detection: [460, 110], skills: ['headbutt', 'charge'], animations: { idle: 'boar-idle', headbutt: 'boar-headbutt', charge: 'boar-charge' }, boss: false },
  wasp: { stats: { w: 32, h: 30, hp: 26, speed: 120 }, movement: 'air', detection: [640, 300], skills: ['needle'], animations: { idle: 'wasp-idle', needle: 'wasp-fire' }, boss: false },
  ratBoss: { stats: { w: 96, h: 96, hp: 700, speed: 60 }, movement: 'bossGround', detection: [1600, 540], skills: ['durianVolley'], animations: { idle: 'rat-idle', durianVolley: 'rat-throw' }, boss: true }
};
