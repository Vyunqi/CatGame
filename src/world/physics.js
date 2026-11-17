export const MOTION = {
  width: 32, height: 48, speed: 260,
  jumpSpeed: -650, gravity: 1800, maxFall: 1100,
  dashSpeed: 680, dashDuration: 0.16, dashCooldown: 0.8,
  coyoteDuration: 0.1, jumpBufferDuration: 0.12
};

export const FALL_LINE = 700;
export const LAND_DURATION = 0.14;

export function createPlayer(spawn) {
  return {
    x: spawn.x, y: spawn.y, w: MOTION.width, h: MOTION.height, vx: 0, vy: 0,
    facing: 1, grounded: true, jumpsUsed: 0, maxJumps: 1,
    hp: 100, maxHp: 100, damageMultiplier: 1,
    invulnerableFor: 0, dashFor: 0, dashCooldownFor: 0,
    coyoteFor: 0, jumpBufferFor: 0, landFor: 0, hurtFor: 0, safe: { x: spawn.x, y: spawn.y }
  };
}

const isSolid = platform => platform.solid !== false;

function overlapsX(a, p) {
  return a.x < p.x + p.w && a.x + a.w > p.x;
}

function tick(value, dt) {
  return Math.max(0, value - dt);
}

export function stepPlayer(player, input, platforms, dt) {
  player.invulnerableFor = tick(player.invulnerableFor, dt);
  player.dashCooldownFor = tick(player.dashCooldownFor, dt);
  player.coyoteFor = tick(player.coyoteFor, dt);
  player.jumpBufferFor = tick(player.jumpBufferFor, dt);
  player.landFor = tick(player.landFor, dt);
  player.hurtFor = tick(player.hurtFor, dt);
  const wasDashing = player.dashFor > 0;
  player.dashFor = tick(player.dashFor, dt);

  const dir = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
  if (dir !== 0 && player.dashFor <= 0) player.facing = dir;

  if (input.consume('dash') && player.dashCooldownFor <= 0) {
    player.dashFor = MOTION.dashDuration;
    player.dashCooldownFor = MOTION.dashCooldown;
    player.invulnerableFor = Math.max(player.invulnerableFor, MOTION.dashDuration);
  }
  if (input.consume('jump')) player.jumpBufferFor = MOTION.jumpBufferDuration;

  if (player.jumpBufferFor > 0) {
    if (player.grounded || player.coyoteFor > 0) {
      jump(player, 1);
    } else {
      const used = Math.max(player.jumpsUsed, 1);
      if (used < player.maxJumps) jump(player, used + 1);
    }
  }

  const dashing = player.dashFor > 0;
  if (dashing) {
    player.vx = player.facing * MOTION.dashSpeed;
    player.vy = 0;
  } else {
    player.vx = dir * MOTION.speed;
    if (wasDashing) player.vy = Math.max(player.vy, 0);
    player.vy = Math.min(MOTION.maxFall, player.vy + MOTION.gravity * dt);
  }

  moveHorizontal(player, platforms, dt);
  moveVertical(player, platforms, dt);

  return { fell: player.y > FALL_LINE };
}

function jump(player, jumpsUsed) {
  player.vy = MOTION.jumpSpeed;
  player.jumpsUsed = jumpsUsed;
  player.grounded = false;
  player.coyoteFor = 0;
  player.jumpBufferFor = 0;
}

function moveHorizontal(player, platforms, dt) {
  const previousX = player.x;
  player.x += player.vx * dt;
  for (const p of platforms) {
    if (!isSolid(p)) continue;
    if (!(player.y < p.y + p.h && player.y + player.h > p.y)) continue;
    if (!overlapsX(player, p)) continue;
    if (previousX + player.w <= p.x) player.x = p.x - player.w;
    else if (previousX >= p.x + p.w) player.x = p.x + p.w;
  }
}

function moveVertical(player, platforms, dt) {
  const wasGrounded = player.grounded;
  const previousTop = player.y;
  const previousFeet = player.y + player.h;
  player.y += player.vy * dt;
  const nextFeet = player.y + player.h;

  let landing = null;
  if (player.vy >= 0) {
    for (const p of platforms) {
      if (!overlapsX(player, p)) continue;
      if (previousFeet <= p.y + 1e-6 && nextFeet >= p.y && (!landing || p.y < landing.y)) landing = p;
    }
  } else {
    for (const p of platforms) {
      if (!isSolid(p) || !overlapsX(player, p)) continue;
      const bottom = p.y + p.h;
      if (previousTop >= bottom - 1e-6 && player.y < bottom) {
        player.y = bottom;
        player.vy = 0;
      }
    }
  }

  if (landing) {
    player.y = landing.y - player.h;
    player.vy = 0;
    player.grounded = true;
    player.jumpsUsed = 0;
    if (!wasGrounded) player.landFor = LAND_DURATION;
    if (isSolid(landing) && player.x >= landing.x && player.x + player.w <= landing.x + landing.w) {
      player.safe = { x: player.x, y: player.y };
    }
  } else {
    player.grounded = false;
    if (wasGrounded && player.vy >= 0) player.coyoteFor = MOTION.coyoteDuration;
  }
}

export function restoreSafePosition(player) {
  player.x = player.safe.x;
  player.y = player.safe.y;
  player.vx = 0;
  player.vy = 0;
  player.grounded = true;
  player.jumpsUsed = 0;
  player.dashFor = 0;
  player.coyoteFor = 0;
  player.jumpBufferFor = 0;
}
