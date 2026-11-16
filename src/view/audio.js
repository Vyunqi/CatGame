const SOUNDS = {
  attack: { type: 'square', from: 520, to: 260, duration: 0.07, gain: 0.05 },
  hit: { type: 'sawtooth', from: 180, to: 70, duration: 0.12, gain: 0.07, noise: true },
  pickup: { type: 'triangle', from: 880, to: 1320, duration: 0.09, gain: 0.06 },
  reward: { type: 'triangle', notes: [523, 659, 784], step: 0.09, gain: 0.07 },
  dead: { type: 'square', notes: [392, 330, 262, 196], step: 0.16, gain: 0.06 },
  win: { type: 'square', notes: [523, 659, 784, 1047], step: 0.12, gain: 0.06 }
};

export function createAudio(AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext) {
  let ctx = null;
  let master = null;
  let muted = false;
  let volume = 1;

  function tone(type, from, to, start, duration, gain) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp).connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function noise(start, duration, gain) {
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    const amp = ctx.createGain();
    amp.gain.value = gain;
    source.buffer = buffer;
    source.connect(amp).connect(master);
    source.start(start);
  }

  return {
    unlock() {
      if (!AudioContextClass) return;
      try {
        if (!ctx) {
          ctx = new AudioContextClass();
          master = ctx.createGain();
          master.gain.value = volume;
          master.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      } catch {
        ctx = null;
        master = null;
      }
    },
    play(name) {
      const sound = SOUNDS[name];
      if (muted || !ctx || !sound || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      if (sound.notes) {
        sound.notes.forEach((f, i) => tone(sound.type, f, f, now + i * sound.step, sound.step * 0.9, sound.gain));
        return;
      }
      tone(sound.type, sound.from, sound.to, now, sound.duration, sound.gain);
      if (sound.noise) noise(now, sound.duration, sound.gain);
    },
    setMuted(value) {
      muted = value === true;
    },
    setVolume(value) {
      volume = value;
      if (master) master.gain.value = volume;
    },
    dispose() {
      ctx?.close().catch(() => {});
      ctx = null;
      master = null;
    }
  };
}
