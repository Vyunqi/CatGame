const KEY = 'cat-roguelike-settings';
const DEFAULT_VOLUME = 0.75;

export function readSettings(storage) {
  try {
    const value = JSON.parse(storage.getItem(KEY) || '{}');
    const volume = value?.volume;
    return {
      bestScore: Number.isFinite(value?.bestScore) && value.bestScore >= 0 ? value.bestScore : 0,
      muted: value?.muted === true,
      volume: Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : DEFAULT_VOLUME
    };
  } catch {
    return { bestScore: 0, muted: false, volume: DEFAULT_VOLUME };
  }
}

export function saveSettings(storage, settings) {
  try {
    storage.setItem(KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}
