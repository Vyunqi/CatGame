import { getWeaponStats, WEAPONS } from '../combat/catalog.js';
import { LAND_DURATION } from '../world/physics.js';

// Source rects into assets/reference.png (1024x1024). Masks erase the branded
// ice cream so published crops carry no commercial logo and paws stay empty
// for the held-weapon overlay.
export const CAT_CROPS = {
  walk1: { x: 338, y: 78, w: 142, h: 190, drawH: 74, masks: [[10, 0, 48, 88]] },
  walk2: { x: 498, y: 78, w: 142, h: 190, drawH: 74, masks: [[10, 0, 48, 88]] },
  walk3: { x: 658, y: 78, w: 142, h: 190, drawH: 74, masks: [[30, 2, 40, 42], [34, 40, 13, 20], [46, 40, 20, 40], [37, 60, 3, 20]] },
  walk4: { x: 828, y: 78, w: 142, h: 190, drawH: 74, masks: [[36, 4, 38, 38], [36, 42, 36, 20], [51, 62, 19, 20], [41, 62, 4, 20]] },
  runA: { x: 352, y: 318, w: 132, h: 148, drawH: 60, masks: [[102, 55, 30, 58]] },
  runB: { x: 178, y: 828, w: 152, h: 128, drawH: 56, masks: [[110, 36, 42, 64]] },
  leap: { x: 518, y: 296, w: 168, h: 158, drawH: 66, masks: [] },
  kick: { x: 698, y: 296, w: 138, h: 168, drawH: 66, masks: [] },
  hurt: { x: 838, y: 292, w: 152, h: 172, drawH: 64, masks: [] },
  throw: { x: 458, y: 494, w: 262, h: 132, drawH: 58, masks: [[150, 8, 112, 66]] },
  dash: { x: 718, y: 504, w: 168, h: 118, drawH: 52, masks: [[0, 24, 16, 44]] }
};

export const CAT_CLIPS = {
  walk: [{ crop: 'walk1' }, { crop: 'walk2' }, { crop: 'walk3' }, { crop: 'walk4' }],
  idle: [{ crop: 'walk2' }, { crop: 'walk2', sy: 1.03, dy: -1 }, { crop: 'walk2' }, { crop: 'walk2', sy: 0.97 }],
  run: [{ crop: 'runB' }, { crop: 'runA', dy: -2 }, { crop: 'dash', dy: -1, sx: 1.05, sy: 0.95 }],
  jump: [{ crop: 'leap', sx: 0.96, sy: 1.06 }],
  fall: [{ crop: 'kick' }],
  land: [{ crop: 'runB', sx: 1.15, sy: 0.8 }, { crop: 'runB', sx: 1.06, sy: 0.92 }],
  dash: [{ crop: 'dash', sx: 1.22, sy: 0.85 }],
  sword: [{ crop: 'runB', sx: 1.06, sy: 0.9 }, { crop: 'throw' }, { crop: 'runA' }],
  throw: [{ crop: 'runB', sx: 1.04, sy: 0.94 }, { crop: 'throw' }],
  hurt: [{ crop: 'hurt' }],
  dead: [{ crop: 'hurt', rotate: Math.PI / 2 }]
};

const RUN_STRIDE = 28;

function pose(clip, frame) {
  return { clip, frame, sx: 1, sy: 1, dy: 0, rotate: 0, ...CAT_CLIPS[clip][frame] };
}

export function catPose(run) {
  const player = run.player;
  if (run.state === 'dead') return pose('dead', 0);
  if (player.hurtFor > 0) return pose('hurt', 0);
  if (player.dashFor > 0) return pose('dash', 0);
  const melee = run.attacks.find(a => a.kind === 'melee' && a.owner === 'player');
  if (melee) return pose('sword', melee.age < melee.windup ? 0 : melee.age <= melee.activeUntil ? 1 : 2);
  const weapon = run.weapons[run.activeWeapon];
  if (WEAPONS[weapon.id].kind !== 'melee') {
    const sinceShot = getWeaponStats(weapon).cooldown - (weapon.readyAt - run.time);
    if (sinceShot >= 0 && sinceShot < 0.16) return pose('throw', sinceShot < 0.06 ? 0 : 1);
  }
  if (player.grounded && player.landFor > 0) return pose('land', player.landFor > LAND_DURATION / 2 ? 0 : 1);
  if (!player.grounded) return pose(player.vy < 0 ? 'jump' : 'fall', 0);
  if (Math.abs(player.vx) > 20) {
    const frame = ((Math.floor((player.x * player.facing) / RUN_STRIDE) % 3) + 3) % 3;
    return pose('run', frame);
  }
  return pose('idle', Math.floor(run.time * 2) % 4);
}
