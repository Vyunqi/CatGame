import { advanceClock } from '../core/loop.js';
import { readSettings, saveSettings } from '../view/storage.js';
import { createRun, updateRun, pauseRun, resumeRun } from './game.js';
import { selectReward, skipReward, purchase, openEquipment, closeEquipment, leaveShop } from './progression.js';

const PAUSABLE = ['playing', 'reward', 'shop', 'equipment'];
const ENDED = ['dead', 'won'];

function snapshot(run) {
  if (!run) return null;
  let attackId = 0;
  for (const attack of run.attacks) if (attack.owner === 'player') attackId = Math.max(attackId, attack.id);
  return {
    state: run.state,
    coins: run.coins,
    hp: run.player.hp,
    enemyHp: run.enemies.reduce((sum, enemy) => sum + Math.max(0, enemy.hp), 0),
    attackId
  };
}

export function createSession({ input, storage, audio, randomSeed }) {
  const settings = readSettings(storage);
  const clock = { accumulator: 0 };
  let run = null;
  let recorded = null;
  let last = null;
  audio.setMuted(settings.muted);
  audio.setVolume(settings.volume);

  function playSounds(before, after) {
    if (!before || !after) return;
    if (after.state !== before.state) {
      if (after.state === 'reward') audio.play('reward');
      if (after.state === 'dead') audio.play('dead');
      if (after.state === 'won') audio.play('win');
    }
    if (after.attackId > before.attackId) audio.play('attack');
    if (after.enemyHp < before.enemyHp || after.hp < before.hp) audio.play('hit');
    if (after.coins > before.coins) audio.play('pickup');
  }

  function recordEnd() {
    if (!run || !ENDED.includes(run.state) || recorded === run) return;
    recorded = run;
    settings.bestScore = Math.max(settings.bestScore, run.score);
    saveSettings(storage, settings);
  }

  function afterChange() {
    const now = snapshot(run);
    playSounds(last, now);
    last = now;
    recordEnd();
  }

  function enterPlay(previousState) {
    if (run?.state === 'playing' && previousState !== 'playing') {
      input.clear();
      clock.accumulator = 0;
    }
  }

  function commit(action) {
    if (!run) return { ok: false, reason: 'state' };
    const before = run.state;
    const result = action();
    enterPlay(before);
    afterChange();
    return result;
  }

  function leaveEquipment() {
    if (run.state === 'equipment') closeEquipment(run);
  }

  const handlers = {
    getRun: () => run,
    getBestScore: () => settings.bestScore,
    get muted() {
      return settings.muted;
    },
    get volume() {
      return settings.volume;
    },
    onStart(weapon) {
      audio.unlock();
      run = createRun(randomSeed(), weapon);
      recorded = null;
      input.clear();
      clock.accumulator = 0;
      last = snapshot(run);
      return { ok: true };
    },
    onResume() {
      audio.unlock();
      return commit(() => {
        if (run.state !== 'paused') return { ok: false, reason: 'state' };
        resumeRun(run);
        return { ok: true };
      });
    },
    onReward(index, choice) {
      audio.unlock();
      return commit(() => {
        leaveEquipment();
        return index === null ? skipReward(run) : selectReward(run, index, choice);
      });
    },
    onPurchase(index, choice) {
      audio.unlock();
      return commit(() => {
        leaveEquipment();
        const result = purchase(run, index, choice);
        if (result.ok) audio.play('reward');
        return result;
      });
    },
    onEquip(index) {
      audio.unlock();
      return commit(() => {
        if (index !== null) return openEquipment(run, index);
        closeEquipment(run);
        return { ok: true };
      });
    },
    onLeaveShop() {
      return commit(() => leaveShop(run));
    },
    onMute(value) {
      audio.unlock();
      settings.muted = value === true;
      audio.setMuted(settings.muted);
      saveSettings(storage, settings);
      return { ok: true };
    },
    onVolume(value) {
      audio.unlock();
      settings.volume = Math.min(1, Math.max(0, value));
      audio.setVolume(settings.volume);
      saveSettings(storage, settings);
      return { ok: true };
    }
  };

  return {
    handlers,
    clock,
    get run() {
      return run;
    },
    blur() {
      clock.accumulator = 0;
      input.clear();
      if (run) pauseRun(run);
      afterChange();
    },
    step(elapsed) {
      if (!run) return;
      const before = run.state;
      if (input.consume('pause')) {
        if (run.state === 'paused') resumeRun(run);
        else if (PAUSABLE.includes(run.state)) pauseRun(run);
      }
      enterPlay(before);
      if (run.state === 'playing') advanceClock(clock, elapsed, dt => updateRun(run, input, dt));
      else clock.accumulator = 0;
      afterChange();
    }
  };
}
