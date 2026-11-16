import { createInput } from './core/input.js';
import { createSession } from './run/session.js';
import { loadAssets } from './view/assets.js';
import { drawFrame } from './view/render.js';
import { mountUI } from './view/ui.js';
import { createAudio } from './view/audio.js';

let session = null;

export function getCurrentRun() {
  return session?.run ?? null;
}

function localStorageOrNull() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function showLoading(root, text) {
  const screen = document.createElement('div');
  screen.className = 'screen';
  const panel = document.createElement('div');
  panel.className = 'panel';
  const line = document.createElement('p');
  line.className = 'panel-line';
  line.textContent = text;
  panel.append(line);
  screen.append(panel);
  root.replaceChildren(screen);
  return panel;
}

async function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const root = document.getElementById('ui');

  let assets;
  while (!assets) {
    showLoading(root, '正在载入素材……');
    try {
      assets = await loadAssets();
    } catch (error) {
      const panel = showLoading(root, error.message);
      panel.querySelector('.panel-line').classList.add('panel-status');
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'primary';
      retry.textContent = '重试';
      panel.append(retry);
      retry.focus();
      await new Promise(resolve => retry.addEventListener('click', resolve, { once: true }));
    }
  }

  const input = createInput(window, { onBlur: () => session.blur() });
  session = createSession({
    input,
    storage: localStorageOrNull(),
    audio: createAudio(),
    randomSeed: () => crypto.getRandomValues(new Uint32Array(1))[0]
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) session.blur();
  });
  const ui = mountUI(root, session.handlers);

  let previousTime = 0;
  function frame(timestamp) {
    const elapsed = previousTime ? (timestamp - previousTime) / 1000 : 0;
    previousTime = timestamp;
    session.step(elapsed);
    drawFrame(ctx, session.run, assets, timestamp / 1000);
    ui.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
