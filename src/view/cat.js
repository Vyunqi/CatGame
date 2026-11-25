import { getWeaponStats, WEAPONS } from '../combat/catalog.js';
import { LAND_DURATION, DASH_ANIM_DURATION } from '../world/physics.js';
import { CAT_FRAME_META } from './catFrameMeta.js';

// Each spec indexes one of the 35 normalized drawings in assets/cat-frames/.
// sx/sy/dy/rotate are per-pose squash, offset and spin applied at draw time.
// The source locomotion drawings are ~15% smaller than the standing ones;
// enlarge them at draw time so the cat does not shrink when it starts moving.
export const LOCOMOTION_SCALE = 1.15;
const locomotion = [6, 7, 8, 9, 10, 11, 12, 13].map(f => ({ f, sx: LOCOMOTION_SCALE, sy: LOCOMOTION_SCALE }));
export const CAT_CLIPS = {
  walk: locomotion,
  idle: [{ f: 0 }, { f: 1 }, { f: 2 }, { f: 3 }, { f: 4 }, { f: 5 }],
  run: locomotion,
  jump: [{ f: 16 }, { f: 17 }],
  fall: [{ f: 18, sy: 1.06 }],
  land: [{ f: 19, sx: 1.12, sy: 0.82 }, { f: 20, sx: 1.05, sy: 0.92 }],
  dash: [{ f: 21 }, { f: 22 }, { f: 23 }, { f: 24 }, { f: 25 }, { f: 26 }, { f: 27 }],
  sword: [{ f: 21 }, { f: 26 }, { f: 27 }],
  throw: [{ f: 6 }, { f: 26 }],
  hurt: [{ f: 19, sx: 1.06, sy: 0.9 }],
  dead: [{ f: 0, rotate: Math.PI / 2 }]
};

// On-screen size of the normalized canvas; baseline row lands on the feet line.
export const CAT_SCALE = 1.2;
export const CAT_BASE = CAT_FRAME_META.base;

const RUN_STRIDE = 10;

function pose(clip, frame) {
  return { clip, frame, sx: 1, sy: 1, dy: 0, rotate: 0, ...CAT_CLIPS[clip][frame] };
}

function dashPose(player) {
  const progress = 1 - player.dashAnimFor / DASH_ANIM_DURATION;
  return pose('dash', Math.max(0, Math.min(CAT_CLIPS.dash.length - 1, Math.floor(progress * CAT_CLIPS.dash.length))));
}

export function catPose(run) {
  const player = run.player;
  if (run.state === 'dead') return pose('dead', 0);
  if (player.hurtFor > 0) return pose('hurt', 0);
  if (player.dashFor > 0) return dashPose(player);
  const melee = run.attacks.find(a => a.kind === 'melee' && a.owner === 'player');
  if (melee) return pose('sword', melee.age < melee.windup ? 0 : melee.age <= melee.activeUntil ? 1 : 2);
  const weapon = run.weapons[run.activeWeapon];
  if (WEAPONS[weapon.id].kind !== 'melee') {
    const sinceShot = getWeaponStats(weapon).cooldown - (weapon.readyAt - run.time);
    if (sinceShot >= 0 && sinceShot < 0.16) return pose('throw', sinceShot < 0.06 ? 0 : 1);
  }
  if (player.dashAnimFor > 0) return dashPose(player);
  if (player.grounded && player.landFor > 0) return pose('land', player.landFor > LAND_DURATION / 2 ? 0 : 1);
  if (!player.grounded) return pose(player.vy < 0 ? 'jump' : 'fall', player.vy < -120 ? 0 : player.vy < 0 ? 1 : 0);
  if (Math.abs(player.vx) > 20) {
    const frame = ((Math.floor((player.x * player.facing) / RUN_STRIDE) % 8) + 8) % 8;
    return pose('run', frame);
  }
  return pose('idle', Math.floor(run.time * 6) % 6);
}