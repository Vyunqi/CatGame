import { MONSTERS, SKILLS } from '../entities/monster-definitions.js';

export const MONSTER_CLIPS = {
  'boar-idle': { count:4, width:224, height:128, anchor:[112,114], bodyWidth:135 },
  'boar-headbutt': { count:4, width:224, height:128, anchor:[112,114], bodyWidth:135 },
  'boar-charge': { count:4, width:224, height:128, anchor:[112,114], bodyWidth:135 },
  'ant-idle': { count:4, width:160, height:112, anchor:[72,102], bodyWidth:88 },
  'ant-bite': { count:4, width:160, height:112, anchor:[72,102], bodyWidth:88 },
  'wasp-idle': { count:4, width:180, height:112, anchor:[84,72], bodyWidth:94, centered:true },
  'wasp-fire': { count:4, width:180, height:112, anchor:[84,72], bodyWidth:94, centered:true },
  'rat-idle': { count:4, width:224, height:112, anchor:[108,100], bodyWidth:78 },
  'rat-throw': { count:4, width:224, height:112, anchor:[108,100], bodyWidth:78 },
  needle: { count:4, width:104, height:32, anchor:[52,16], bodyWidth:76 },
  durian: { count:4, width:72, height:80, anchor:[36,48], bodyWidth:48 },
  durianExplosion: { count:6, width:112, height:112, anchor:[56,56], bodyWidth:100 }
};
export const MONSTER_FRAME_NAMES = Object.entries(MONSTER_CLIPS).flatMap(([clip,spec])=>Array.from({length:spec.count},(_,i)=>`${clip}-${i}`));

export function monsterPose(enemy) {
  const def = MONSTERS[enemy.kind], s = SKILLS[enemy.skill];
  const idle = () => ({clip:def.animations.idle,frame:Math.floor(enemy.localTime*6)%4});
  if (!s || !['windup','active','recovery'].includes(enemy.phase)) return idle();
  const clip = def.animations[enemy.skill];
  if (enemy.phase === 'windup') return {clip,frame:enemy.phaseTime < s.windup / 2 ? 0 : 1};
  if (enemy.phase === 'active') return {clip,frame:enemy.skill==='charge'&&enemy.impactFor>0?3:2};
  if (enemy.phaseTime >= Math.min(0.25,s.recovery)) return idle();
  return {clip,frame:enemy.skill==='charge'&&!(enemy.impactFor>0)?2:3};
}
export function projectilePose(attack) {
  if (attack.kind === 'durianExplosion') return {clip:'durianExplosion',frame:Math.min(5,Math.floor(attack.age*12))};
  if (attack.kind === 'durian') return {clip:'durian',frame:attack.phase==='armed'?Math.min(3,Math.floor(attack.fuseTime/attack.fuse*4)):Math.floor(attack.age*12)%4};
  return {clip:'needle',frame:Math.floor(attack.age*12)%4};
}
