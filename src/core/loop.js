export function advanceClock(clock, elapsed, step) {
  const dt = 1 / 60;
  clock.accumulator += Math.min(Math.max(elapsed, 0), dt * 5);
  let count = 0;
  while (clock.accumulator >= dt - 1e-10 && count < 5) {
    step(dt);
    clock.accumulator = Math.max(0, clock.accumulator - dt);
    count++;
  }
  return count;
}
