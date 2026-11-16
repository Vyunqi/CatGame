const KEYMAP = {
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  Space: 'jump',
  KeyJ: 'attack',
  KeyK: 'dash',
  KeyQ: 'switch',
  KeyE: 'interact',
  Escape: 'pause'
};

export function createInput(target, { onBlur } = {}) {
  const held = new Set();
  const pending = new Set();

  const onKeyDown = event => {
    const action = KEYMAP[event.code];
    if (!action) return;
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault?.();
    if (event.repeat) return;
    held.add(action);
    pending.add(action);
  };
  const onKeyUp = event => {
    const action = KEYMAP[event.code];
    if (action) held.delete(action);
  };
  const clear = () => {
    held.clear();
    pending.clear();
  };
  const onWindowBlur = () => {
    clear();
    onBlur?.();
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', onWindowBlur);

  return {
    held: action => held.has(action),
    consume(action) {
      if (!pending.has(action)) return false;
      pending.delete(action);
      return true;
    },
    clear,
    dispose() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', onWindowBlur);
      clear();
    }
  };
}
