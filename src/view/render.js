import { catPose } from './cat.js';
import { LAND_DURATION } from '../world/physics.js';

export const VIEW = { width: 960, height: 540 };

const THEMES = {
  grass: {
    skyTop: '#5b8fd0', skyBottom: '#b6dcf2', far: '#7fa9d6', mid: '#3f7d4e', midDark: '#2d5e3a',
    top: '#62c24a', topDark: '#3b8c2f', body: '#9a5a2e', bodyDark: '#6e3c1e', ledge: '#b5713a', ledgeDark: '#7a4620'
  },
  dusk: {
    skyTop: '#3b2a5e', skyBottom: '#f0a070', far: '#8a5a7e', mid: '#4a3050', midDark: '#2e1e36',
    top: '#86b84a', topDark: '#527a2a', body: '#7a4a3a', bodyDark: '#4a2a22', ledge: '#a8683a', ledgeDark: '#6a3a1e'
  },
  castle: {
    skyTop: '#161a36', skyBottom: '#4a4a7e', far: '#2e3258', mid: '#23263f', midDark: '#171a2c',
    top: '#9a9ab2', topDark: '#5e5e78', body: '#5a5b74', bodyDark: '#3a3b50', ledge: '#8a7058', ledgeDark: '#5a4636'
  }
};

export function cameraFor(player, room) {
  return { x: Math.max(0, Math.min(room.width - VIEW.width, player.x + player.w / 2 - 360)), y: 0 };
}

export function groundShadow(player, room) {
  const feet = player.y + player.h;
  const cx = player.x + player.w / 2;
  let ground = null;
  for (const p of room.platforms) {
    if (p.y < feet - 1 || cx < p.x || cx > p.x + p.w) continue;
    if (ground === null || p.y < ground) ground = p.y;
  }
  if (ground === null) return null;
  const t = 1 - (ground - feet) / 260;
  if (t <= 0) return null;
  return { y: ground, alpha: 0.3 * t, width: 40 * (0.5 + 0.5 * t) };
}

function hash(a, b) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function drawSky(ctx, theme) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, theme.skyTop);
  g.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawFar(ctx, theme, themeName, camX) {
  const offset = camX * 0.2;
  const span = 240;
  const first = Math.floor(offset / span) - 1;
  ctx.fillStyle = theme.far;
  for (let i = first; i < first + 7; i++) {
    const x = Math.round(i * span - offset);
    const r = hash(i, 7);
    if (themeName === 'castle') {
      const h = 150 + Math.floor(r * 5) * 16;
      ctx.fillRect(x + 40, VIEW.height - 120 - h, 64, h);
      for (let b = 0; b < 4; b++) ctx.fillRect(x + 40 + b * 18, VIEW.height - 132 - h, 10, 12);
      ctx.fillRect(x + 120, VIEW.height - 200, 96, 80);
    } else if (themeName === 'dusk') {
      const h = 80 + Math.floor(r * 6) * 16;
      ctx.fillRect(x + 30, VIEW.height - 130 - h, 40, h);
      ctx.fillRect(x + 70, VIEW.height - 130 - h * 0.6, 56, h * 0.6);
      ctx.fillRect(x + 150, VIEW.height - 180, 24, 50);
    } else {
      const h = 64 + Math.floor(r * 5) * 16;
      for (let s = 0; s < 6; s++) ctx.fillRect(x + s * 16, VIEW.height - 130 - h + Math.abs(3 - s) * 14, 16, h);
      ctx.fillRect(x + 110, VIEW.height - 170, 120, 40);
    }
  }
  ctx.fillRect(0, VIEW.height - 130, VIEW.width, 130);
}

function drawMid(ctx, theme, camX) {
  const offset = camX * 0.5;
  const span = 160;
  const first = Math.floor(offset / span) - 1;
  for (let i = first; i < first + 9; i++) {
    const x = Math.round(i * span - offset);
    const r = hash(i, 31);
    const h = 48 + Math.floor(r * 4) * 16;
    ctx.fillStyle = theme.midDark;
    ctx.fillRect(x + 30, VIEW.height - 90 - 12, 12, 40);
    ctx.fillStyle = theme.mid;
    ctx.fillRect(x + 6, VIEW.height - 102 - h, 60, h);
    ctx.fillRect(x + 14, VIEW.height - 118 - h, 44, 16);
    ctx.fillStyle = theme.midDark;
    ctx.fillRect(x + 6, VIEW.height - 102 - 8, 60, 8);
  }
}

function drawPit(ctx) {
  const g = ctx.createLinearGradient(0, 440, 0, VIEW.height);
  g.addColorStop(0, 'rgba(20, 14, 24, 0)');
  g.addColorStop(1, 'rgba(20, 14, 24, 0.92)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 440, VIEW.width, VIEW.height - 440);
}

function drawPlatform(ctx, p, theme, themeName, camX) {
  const x0 = Math.max(p.x, camX - 16);
  const x1 = Math.min(p.x + p.w, camX + VIEW.width + 16);
  if (x1 <= x0) return;
  const sx = Math.round(p.x - camX);
  if (p.solid === false) {
    ctx.fillStyle = '#22161a';
    ctx.fillRect(sx - 2, p.y - 2, p.w + 4, p.h + 4);
    ctx.fillStyle = theme.ledge;
    ctx.fillRect(sx, p.y, p.w, p.h);
    ctx.fillStyle = theme.ledgeDark;
    for (let bx = 0; bx < p.w; bx += 24) ctx.fillRect(sx + bx, p.y, 2, p.h);
    ctx.fillRect(sx, p.y + p.h - 4, p.w, 4);
    return;
  }
  const h = VIEW.height - p.y + 4;
  ctx.fillStyle = '#22161a';
  ctx.fillRect(sx - 2, p.y - 2, p.w + 4, h + 2);
  ctx.fillStyle = theme.body;
  ctx.fillRect(sx, p.y, p.w, h);
  const start = Math.floor((x0 - p.x) / 16) * 16;
  for (let gx = start; gx < x1 - p.x; gx += 16) {
    for (let gy = 16; gy < h; gy += 16) {
      const r = hash(p.x + gx, p.y + gy);
      ctx.fillStyle = theme.bodyDark;
      if (themeName === 'castle') {
        const shift = (gy / 16) % 2 ? 8 : 0;
        ctx.fillRect(sx + gx + shift, p.y + gy, 2, 16);
        ctx.fillRect(sx + gx, p.y + gy, 16, 2);
      } else if (r < 0.35) {
        ctx.fillRect(sx + gx + Math.floor(r * 30) % 12, p.y + gy + 4, 4, 4);
      }
    }
  }
  ctx.fillStyle = theme.top;
  ctx.fillRect(sx, p.y, p.w, 12);
  ctx.fillStyle = theme.topDark;
  ctx.fillRect(sx, p.y + 12, p.w, 4);
  for (let gx = start; gx < x1 - p.x; gx += 8) {
    if (hash(p.x + gx, 3) < 0.5) ctx.fillRect(sx + gx, p.y + 16, 4, 4);
    ctx.fillStyle = hash(gx + p.x, 9) < 0.5 ? theme.top : theme.topDark;
    ctx.fillRect(sx + gx + 2, p.y - 4, 4, 4);
    ctx.fillStyle = theme.topDark;
  }
}

function drawSprite(ctx, image, x, y, { flip = false, alpha = 1, scale = 1, rotate = 0 } = {}) {
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(Math.round(x), Math.round(y));
  if (rotate) ctx.rotate(rotate);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawExit(ctx, room, player, camX, t) {
  const exit = room.exit;
  if (!exit) return;
  const x = Math.round(exit.x - camX);
  ctx.fillStyle = '#22161a';
  ctx.fillRect(x - 10, exit.y - 10, exit.w + 20, exit.h + 10);
  ctx.fillStyle = '#7a7a90';
  ctx.fillRect(x - 6, exit.y - 6, exit.w + 12, exit.h + 6);
  if (room.rewardClaimed) {
    const pulse = 0.75 + Math.sin(t * 4) * 0.25;
    ctx.fillStyle = `rgba(255, 214, 90, ${pulse})`;
    ctx.fillRect(x, exit.y, exit.w, exit.h);
    ctx.fillStyle = '#fff6c8';
    ctx.fillRect(x + 12, exit.y + 12, exit.w - 24, exit.h - 12);
  } else {
    ctx.fillStyle = '#1a1424';
    ctx.fillRect(x, exit.y, exit.w, exit.h);
    ctx.fillStyle = '#4a4a5e';
    for (let b = 8; b < exit.w; b += 14) ctx.fillRect(x + b, exit.y, 4, exit.h);
  }
  const near = Math.abs(player.x + player.w / 2 - (exit.x + exit.w / 2)) < 70;
  if (near) drawPrompt(ctx, x + exit.w / 2, exit.y - 24, room.rewardClaimed ? 'E 前进' : '清空敌人后开启');
}

function drawPrompt(ctx, x, y, text) {
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.textAlign = 'center';
  const w = ctx.measureText(text).width + 16;
  ctx.fillStyle = 'rgba(20, 14, 24, 0.85)';
  ctx.fillRect(Math.round(x - w / 2), y - 16, w, 22);
  ctx.fillStyle = '#ffe680';
  ctx.fillText(text, x, y);
}

function drawChests(ctx, room, player, assets, camX) {
  const image = assets.sprites.chest;
  for (const chest of room.chests) {
    const cx = chest.x + chest.w / 2 - camX;
    if (cx < -40 || cx > VIEW.width + 40) continue;
    if (chest.opened) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - image.width / 2, chest.y + 8, image.width, image.height);
      ctx.clip();
      drawSprite(ctx, image, cx, chest.y + chest.h - image.height / 2);
      ctx.restore();
      ctx.fillStyle = '#22161a';
      ctx.fillRect(Math.round(cx - image.width / 2), chest.y - 4, image.width, 10);
      ctx.fillStyle = '#6a3a18';
      ctx.fillRect(Math.round(cx - image.width / 2) + 2, chest.y - 2, image.width - 4, 6);
    } else {
      drawSprite(ctx, image, cx, chest.y + chest.h - image.height / 2);
      if (Math.abs(player.x + player.w / 2 - (chest.x + chest.w / 2)) < 56) drawPrompt(ctx, cx, chest.y - 16, 'E 打开');
    }
  }
}

function drawPickups(ctx, run, assets, camX, t) {
  for (const pickup of run.pickups) {
    const x = pickup.x - camX;
    if (x < -20 || x > VIEW.width + 20) continue;
    const spin = Math.max(0.25, Math.abs(Math.cos(t * 4 + pickup.x * 0.01)));
    ctx.save();
    ctx.translate(Math.round(x), Math.round(pickup.y + Math.sin(t * 3 + pickup.x) * 2));
    ctx.scale(spin, 1);
    ctx.drawImage(assets.sprites.coin, -8, -8);
    ctx.restore();
  }
}

const WARN_PHASES = new Set(['warn', 'dashWarn', 'volleyWarn']);

function drawEnemy(ctx, enemy, assets, camX, t) {
  const image = assets.sprites[enemy.kind];
  const cx = enemy.x + enemy.w / 2 - camX;
  if (cx < -120 || cx > VIEW.width + 120) return;
  const bob = enemy.kind === 'flyer' ? Math.sin(t * 8 + enemy.id) * 2 : 0;
  const cy = enemy.y + enemy.h - image.height / 2 + bob;
  const s = enemy.statuses;
  ctx.save();
  if (enemy.hurtFor > 0) ctx.filter = 'brightness(2.2)';
  else if (s.frozenFor > 0) ctx.filter = 'saturate(0.3) brightness(1.4) hue-rotate(160deg)';
  drawSprite(ctx, image, cx, cy, { flip: enemy.facing < 0 && enemy.kind === 'shooter' });
  ctx.restore();
  if (s.frozenFor > 0) {
    ctx.strokeStyle = '#dff6ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(cx - image.width / 2) - 3, Math.round(cy - image.height / 2) - 3, image.width + 6, image.height + 6);
  } else if (s.slowFor > 0) {
    ctx.fillStyle = '#9fe0ff';
    for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(cx - 10 + i * 9), Math.round(enemy.y - 6 + Math.sin(t * 6 + i) * 2), 3, 3);
  }
  if (s.burnFor > 0) {
    for (let i = 0; i < 3; i++) {
      const fy = enemy.y + 4 - ((t * 30 + i * 9) % 18);
      ctx.fillStyle = i % 2 ? '#ff9a2a' : '#ff4a2a';
      ctx.fillRect(Math.round(cx - 10 + i * 8), Math.round(fy), 4, 6);
    }
  }
  if (WARN_PHASES.has(enemy.phase)) {
    const size = enemy.boss ? 28 : 18;
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#22161a';
    ctx.fillText('!', cx + 2, enemy.y - 8 + 2);
    ctx.fillStyle = Math.floor(t * 12) % 2 ? '#ff3a3a' : '#ffe14a';
    ctx.fillText('!', cx, enemy.y - 8);
  }
  if (!enemy.boss && enemy.hp < enemy.maxHp) {
    const w = 30;
    ctx.fillStyle = '#22161a';
    ctx.fillRect(Math.round(cx - w / 2) - 1, Math.round(enemy.y - 10), w + 2, 5);
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(Math.round(cx - w / 2), Math.round(enemy.y - 9), Math.round((w * enemy.hp) / enemy.maxHp), 3);
  }
}

function drawCat(ctx, assets, x, feetY, facing, pose, alpha = 1) {
  const image = assets.cats[pose.clip][pose.frame];
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(Math.round(x), Math.round(feetY + (pose.dy || 0)));
  ctx.scale(facing * (pose.sx || 1), pose.sy || 1);
  ctx.drawImage(image, -image.width / 2, -image.height);
  ctx.restore();
}

function drawDust(ctx, run, cx, feet, t) {
  const player = run.player;
  const puff = (x, y, size, alpha) => {
    ctx.fillStyle = `rgba(240, 230, 210, ${alpha})`;
    ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), Math.round(size), Math.round(size));
  };
  if (player.grounded && Math.abs(player.vx) > 20 && player.dashFor <= 0) {
    for (let i = 0; i < 2; i++) {
      const p = (t * 6 + i * 0.5) % 1;
      puff(cx - player.facing * (10 + p * 16), feet - 2 - p * 6, 2 + p * 4, (1 - p) * 0.45);
    }
  }
  if (player.landFor > 0) {
    const p = 1 - player.landFor / LAND_DURATION;
    for (const side of [-1, 1]) puff(cx + side * (8 + p * 20), feet - 2 - p * 5, 3 + p * 4, (1 - p) * 0.6);
  }
}

function activeMelee(run) {
  return run.attacks.find(a => a.kind === 'melee' && a.owner === 'player');
}

function drawHeldWeapon(ctx, run, assets, camX) {
  const player = run.player;
  const weapon = run.weapons[run.activeWeapon];
  const image = assets.sprites[weapon.id];
  const facing = player.facing;
  const hx = player.x + player.w / 2 - camX + facing * 18;
  const hy = player.y + player.h - 30;
  if (weapon.id === 'sword') {
    const swing = activeMelee(run);
    let angle = -0.9;
    if (swing) {
      const p = Math.min(1, swing.age / Math.max(swing.activeUntil, 0.01));
      angle = swing.arc[0] + (swing.arc[1] - swing.arc[0]) * p;
    }
    ctx.save();
    ctx.translate(Math.round(hx), Math.round(hy));
    ctx.scale(facing, 1);
    ctx.rotate(angle);
    ctx.drawImage(image, -6, -image.height / 2);
    ctx.restore();
    return;
  }
  const recoil = weapon.readyAt - run.time > 0 && weapon.readyAt - run.time > 0.25 ? -3 : 0;
  drawSprite(ctx, image, hx + facing * (6 + recoil), hy, { flip: facing < 0 && weapon.id !== 'icecream' });
}

function drawPlayer(ctx, run, assets, camX, t) {
  const player = run.player;
  const cx = player.x + player.w / 2 - camX;
  const feet = player.y + player.h;
  const pose = catPose(run);
  if (player.dashFor > 0) {
    drawCat(ctx, assets, cx - player.facing * 24, feet, player.facing, pose, 0.22);
    drawCat(ctx, assets, cx - player.facing * 12, feet, player.facing, pose, 0.42);
  }
  const flicker = player.invulnerableFor > 0 && player.hurtFor <= 0 && Math.floor(t * 20) % 2 === 0;
  const shadow = groundShadow(player, run.room);
  if (shadow) {
    ctx.fillStyle = `rgba(20, 14, 24, ${shadow.alpha.toFixed(3)})`;
    ctx.fillRect(Math.round(cx - shadow.width / 2), Math.round(shadow.y - 3), Math.round(shadow.width), 4);
  }
  drawDust(ctx, run, cx, feet, t);
  drawCat(ctx, assets, cx, feet, player.facing, pose, flicker ? 0.4 : 1);
  drawHeldWeapon(ctx, run, assets, camX);
}

function drawMeleeArc(ctx, attack, camX) {
  if (attack.age < attack.windup || attack.age > attack.activeUntil + 0.08) return;
  const span = Math.max(attack.activeUntil - attack.windup, 0.01);
  const progress = Math.min(1, (attack.age - attack.windup) / span);
  const fade = attack.age > attack.activeUntil ? 1 - (attack.age - attack.activeUntil) / 0.08 : 1;
  const [a0, a1] = attack.arc;
  const end = a0 + (a1 - a0) * progress;
  const toScreen = a => (attack.facing > 0 ? a : Math.PI - a);
  const x = attack.x - camX;
  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  ctx.lineCap = 'butt';
  const outer = attack.stage === 3 ? '#ffd84a' : '#ffffff';
  for (const [r, width, color] of [[attack.radius, 12, 'rgba(140, 220, 255, 0.55)'], [attack.radius - 4, 5, outer]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    if (attack.facing > 0) ctx.arc(x, attack.y, r, toScreen(a0), toScreen(end));
    else ctx.arc(x, attack.y, r, toScreen(end), toScreen(a0));
    ctx.stroke();
  }
  ctx.restore();
}

function moduleGlow(ctx, attack, x, y) {
  if (attack.modules.includes('burn')) {
    ctx.fillStyle = 'rgba(255, 120, 40, 0.45)';
    ctx.fillRect(Math.round(x - attack.vx * 0.02) - 5, Math.round(y - attack.vy * 0.02) - 5, 10, 10);
  }
  if (attack.modules.includes('frost')) {
    ctx.fillStyle = 'rgba(180, 235, 255, 0.6)';
    ctx.fillRect(Math.round(x) - 7, Math.round(y) - 7, 3, 3);
    ctx.fillRect(Math.round(x) + 4, Math.round(y) + 4, 3, 3);
  }
}

function drawProjectile(ctx, attack, assets, camX) {
  const x = attack.x - camX;
  const y = attack.y;
  if (x < -40 || x > VIEW.width + 40) return;
  if (attack.owner === 'enemy') {
    ctx.fillStyle = 'rgba(255, 80, 120, 0.35)';
    ctx.fillRect(Math.round(x) - 9, Math.round(y) - 9, 18, 18);
    ctx.fillStyle = '#22161a';
    ctx.fillRect(Math.round(x) - 6, Math.round(y) - 6, 12, 12);
    ctx.fillStyle = '#ff4a7a';
    ctx.fillRect(Math.round(x) - 4, Math.round(y) - 4, 8, 8);
    ctx.fillStyle = '#ffd0dc';
    ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 3, 3);
    return;
  }
  moduleGlow(ctx, attack, x, y);
  const angle = Math.atan2(attack.vy, attack.vx);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (attack.weapon === 'swordwave') {
    ctx.scale(attack.facing, 1);
    ctx.strokeStyle = 'rgba(150, 230, 255, 0.9)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(-10, 0, 18, -1.1, 1.1);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-8, 0, 18, -0.9, 0.9);
    ctx.stroke();
  } else if (attack.weapon === 'crossbow') {
    ctx.rotate(angle);
    ctx.fillStyle = '#22161a';
    ctx.fillRect(-14, -3, 28, 6);
    ctx.fillStyle = '#f0ecd8';
    ctx.fillRect(-12, -1, 24, 2);
    for (let r = -8; r <= 4; r += 4) ctx.fillRect(r, -4, 2, 8);
    ctx.fillRect(8, -3, 5, 6);
    ctx.fillRect(-15, -4, 3, 8);
  } else if (attack.weapon === 'yarn') {
    ctx.rotate(attack.age * 10);
    ctx.drawImage(assets.sprites.yarn, -10, -10);
  } else {
    ctx.rotate(angle);
    ctx.fillStyle = '#22161a';
    ctx.fillRect(-8, -6, 14, 12);
    ctx.fillStyle = '#fff6e8';
    ctx.fillRect(-6, -4, 10, 8);
    ctx.fillStyle = '#ff9ec4';
    ctx.fillRect(-6, 1, 10, 2);
    ctx.fillStyle = '#e0a050';
    ctx.fillRect(-14, -2, 6, 4);
  }
  ctx.restore();
}

function drawEffects(ctx, run, camX) {
  ctx.textAlign = 'center';
  for (const effect of run.effects) {
    const p = effect.age / effect.ttl;
    const x = effect.x - camX;
    if (effect.kind === 'explosion') {
      const r = effect.radius * (0.4 + p * 0.6);
      ctx.fillStyle = `rgba(255, 170, 60, ${0.5 * (1 - p)})`;
      ctx.beginPath();
      ctx.arc(x, effect.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 240, 180, ${1 - p})`;
      ctx.lineWidth = 4;
      ctx.stroke();
      continue;
    }
    const label = effect.kind === 'number' ? String(effect.value)
      : effect.kind === 'coin' ? `+${effect.value} 金币` : effect.text;
    const color = effect.kind === 'coin' ? '#ffd23f' : effect.color;
    ctx.globalAlpha = Math.max(0, 1 - p * p);
    ctx.font = 'bold 16px "Courier New", monospace';
    const y = effect.y - 8 - p * 36;
    ctx.fillStyle = '#22161a';
    ctx.fillText(label, x + 2, y + 2);
    ctx.fillStyle = color;
    ctx.fillText(label, x, y);
    ctx.globalAlpha = 1;
  }
}

function drawBossBar(ctx, run) {
  const boss = run.enemies.find(e => e.boss);
  if (!boss) return;
  const w = 520;
  const x = (VIEW.width - w) / 2;
  const y = VIEW.height - 40;
  ctx.fillStyle = '#22161a';
  ctx.fillRect(x - 4, y - 4, w + 8, 22);
  ctx.fillStyle = '#5a1a2a';
  ctx.fillRect(x, y, w, 14);
  ctx.fillStyle = boss.hp / boss.maxHp < 0.4 ? '#ff4a3a' : '#ff8fb8';
  ctx.fillRect(x, y, Math.round((w * boss.hp) / boss.maxHp), 14);
  ctx.font = 'bold 15px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff4e0';
  ctx.fillText('甜点大王 · 巨型蛋糕', VIEW.width / 2, y - 10);
}

function drawVignette(ctx, run) {
  const p = run.player;
  if (p.hp / p.maxHp > 0.3) return;
  ctx.strokeStyle = 'rgba(220, 30, 40, 0.35)';
  ctx.lineWidth = 24;
  ctx.strokeRect(12, 12, VIEW.width - 24, VIEW.height - 24);
}

function drawTitleScene(ctx, assets, t) {
  const theme = THEMES.grass;
  drawSky(ctx, theme);
  drawFar(ctx, theme, 'grass', t * 20);
  drawMid(ctx, theme, t * 20);
  drawPlatform(ctx, { x: 0, y: 440, w: VIEW.width, h: 100 }, theme, 'grass', 0);
  drawCat(ctx, assets, 250, 440, 1, { clip: 'idle', frame: Math.floor(t * 2) % 4, sx: 1, sy: 1, dy: 0 });
  ctx.save();
  ctx.translate(560, 300);
  ctx.scale(1.4, 1.4);
  ctx.drawImage(assets.sprites.walker, 0, 0);
  ctx.restore();
  drawSprite(ctx, assets.sprites.coin, 420, 330 + Math.sin(t * 3) * 4);
  drawSprite(ctx, assets.sprites.coin, 460, 320 + Math.sin(t * 3 + 1) * 4);
}

export function drawFrame(ctx, run, assets, viewTime) {
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!run) {
    drawTitleScene(ctx, assets, viewTime);
    return;
  }
  const room = run.room;
  const theme = THEMES[room.theme];
  const camera = cameraFor(run.player, room);
  const shake = run.state === 'playing' && run.shake > 0 ? Math.round(Math.sin(viewTime * 90) * run.shake * 24) : 0;
  const camX = camera.x + shake;

  drawSky(ctx, theme);
  drawFar(ctx, theme, room.theme, camera.x);
  drawMid(ctx, theme, camera.x);
  drawPit(ctx);
  for (const p of room.platforms) drawPlatform(ctx, p, theme, room.theme, camX);
  drawExit(ctx, room, run.player, camX, viewTime);
  drawChests(ctx, room, run.player, assets, camX);
  drawPickups(ctx, run, assets, camX, viewTime);
  for (const enemy of run.enemies) if (enemy.hp > 0) drawEnemy(ctx, enemy, assets, camX, viewTime);
  drawPlayer(ctx, run, assets, camX, viewTime);
  for (const attack of run.attacks) {
    if (attack.age >= attack.ttl) continue;
    if (attack.kind === 'melee') drawMeleeArc(ctx, attack, camX);
    else drawProjectile(ctx, attack, assets, camX);
  }
  drawEffects(ctx, run, camX);
  drawBossBar(ctx, run);
  drawVignette(ctx, run);
}
