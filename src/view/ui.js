import { WEAPONS, MODULES, getWeaponStats } from '../combat/catalog.js';
import { isCompatible, MAX_WEAPONS, MAX_MODULES } from '../combat/loadout.js';
import { zoneOf, BOSS_ROOM } from '../world/rooms.js';

export const WEAPON_ORDER = ['icecream', 'crossbow', 'yarn', 'sword'];
const ZONE_NAMES = ['糖霜草原', '黄昏林地', '蛋糕城堡'];

const REASONS = {
  coins: '金币不足。',
  'full-hp': '生命已满，无需回复。',
  owned: '已经拥有该项目。',
  full: '槽位已满，请选择要替换的项目。',
  duplicate: '该武器已装有此模组。',
  incompatible: '该模组与这把武器不兼容。',
  sold: '已售出。',
  'choose-weapon': '请先选择要安装的武器。',
  'bad-slot': '无效的槽位。',
  'bad-offer': '无效的选项。',
  state: '当前无法进行此操作。'
};

export function reasonText(reason) {
  return REASONS[reason] ?? '操作未完成。';
}

const choice = (weaponSlot, replaceIndex, label, disabled) => ({ weaponSlot, replaceIndex, label, disabled });
const moduleNames = ids => ids.map(id => MODULES[id].name).join('、');

export function needsEquipment(run, offer) {
  if (offer.kind === 'module') return true;
  return offer.kind === 'weapon' && run.weapons.length >= MAX_WEAPONS;
}

export function equipmentChoices(run, offer) {
  if (offer.kind === 'weapon') {
    const owned = run.weapons.some(w => w.id === offer.id);
    if (run.weapons.length < MAX_WEAPONS) {
      return [choice(null, null, owned ? '已拥有该武器' : '放入空武器栏', owned)];
    }
    return run.weapons.map((w, i) => {
      const name = WEAPONS[w.id].name;
      if (owned) return choice(i, null, `${name}：已拥有该武器`, true);
      const loss = w.modules.length > 0 ? `（失去模组：${moduleNames(w.modules)}）` : '（无模组）';
      return choice(i, null, `替换${name}${loss}`, false);
    });
  }
  if (offer.kind !== 'module') return [];
  return run.weapons.flatMap((w, i) => {
    const name = WEAPONS[w.id].name;
    if (!isCompatible(w.id, offer.id)) return [choice(i, null, `${name}：不兼容`, true)];
    if (w.modules.includes(offer.id)) return [choice(i, null, `${name}：已装备该模组`, true)];
    if (w.modules.length < MAX_MODULES) {
      return [choice(i, null, `装到${name}（空槽 ${w.modules.length + 1}/${MAX_MODULES}）`, false)];
    }
    return w.modules.map((m, j) => choice(i, j, `${name}：替换「${MODULES[m].name}」`, false));
  });
}

function offerItem(run, offer, index, commit) {
  const equip = needsEquipment(run, offer);
  const choices = equipmentChoices(run, offer);
  const blocked = choices.length > 0 && choices.every(c => c.disabled);
  return {
    label: offer.label,
    description: offer.description,
    note: blocked ? (offer.kind === 'weapon' ? '已拥有该武器' : '没有可安装的武器') : '',
    disabled: blocked,
    action: equip ? { type: 'equip', index } : { type: commit, index, choice: {} }
  };
}

function scoreLines(run, bestScore) {
  return [`分数：${run.score}`, `最高分：${Math.max(bestScore, run.score)}`];
}

export function dialogModel(run, { bestScore = 0 } = {}) {
  if (!run) return null;
  const pending = run.pending;
  switch (run.state) {
    case 'reward': {
      const chest = pending.source === 'chest';
      return {
        state: 'reward',
        title: chest ? '宝箱里有一把武器！' : '房间清空！选择一项奖励',
        lines: chest ? ['装备后可用 Q 切换武器。'] : ['模组卡片上标注了适用武器。'],
        items: pending.offers.map((offer, i) => offerItem(run, offer, i, 'reward')),
        actions: chest ? [{ label: '放弃宝箱', action: { type: 'skip' } }] : []
      };
    }
    case 'shop':
      return {
        state: 'shop',
        title: '流浪猫商店',
        lines: [`持有金币：${run.coins}`],
        items: pending.offers.map((offer, i) => {
          const item = offerItem(run, offer, i, 'purchase');
          item.price = offer.price;
          if (offer.sold) Object.assign(item, { disabled: true, note: '已售出' });
          else if (run.coins < offer.price) Object.assign(item, { disabled: true, note: '金币不足' });
          return item;
        }),
        actions: [{ label: '离开商店，前往下一间', action: { type: 'leave' } }]
      };
    case 'equipment': {
      const index = pending.offerIndex;
      const offer = pending.offers[index];
      const commit = pending.returnState === 'shop' ? 'purchase' : 'reward';
      const lines = [offer.description];
      if (commit === 'purchase') lines.push(`价格：${offer.price} 金币（持有 ${run.coins}）`);
      return {
        state: 'equipment',
        title: `安装：${offer.label}`,
        lines,
        items: equipmentChoices(run, offer).map(c => ({
          label: c.label,
          description: '',
          note: '',
          disabled: c.disabled,
          action: { type: commit, index, choice: { weaponSlot: c.weaponSlot, replaceIndex: c.replaceIndex } }
        })),
        actions: [{ label: '取消', action: { type: 'cancel' } }]
      };
    }
    case 'paused':
      return {
        state: 'paused',
        title: '暂停中',
        lines: ['按 Esc 或点击“继续”返回游戏。'],
        items: [],
        actions: [{ label: '继续', action: { type: 'resume' } }, { label: '重新开始', action: { type: 'restart' } }]
      };
    case 'dead':
    case 'won':
      return {
        state: run.state,
        title: run.state === 'won' ? '击败甜点大王！远征成功！' : '猫猫倒下了……',
        lines: scoreLines(run, bestScore),
        items: [],
        actions: [{ label: '再来一局', action: { type: 'restart' } }, { label: '换把武器', action: { type: 'title' } }]
      };
    default:
      return null;
  }
}

export function runAction(action, handlers, selectedWeapon) {
  switch (action.type) {
    case 'reward': return handlers.onReward(action.index, action.choice);
    case 'skip': return handlers.onReward(null);
    case 'purchase': return handlers.onPurchase(action.index, action.choice);
    case 'equip': return handlers.onEquip(action.index);
    case 'cancel': return handlers.onEquip(null);
    case 'leave': return handlers.onLeaveShop();
    case 'resume': return handlers.onResume();
    case 'restart': return handlers.onStart(selectedWeapon);
    default: return { ok: true };
  }
}

const VOLUME_LEVELS = [0.25, 0.5, 0.75, 1];

export function nextVolume(volume) {
  return VOLUME_LEVELS.find(level => level > volume + 1e-6) ?? VOLUME_LEVELS[0];
}

const MENU_PREV = new Set(['ArrowLeft', 'ArrowUp', 'KeyA', 'KeyW']);
const MENU_NEXT = new Set(['ArrowRight', 'ArrowDown', 'KeyD', 'KeyS']);
const MENU_CONFIRM = new Set(['KeyJ', 'Space', 'Enter', 'NumpadEnter']);

export function menuKey(code, current, entries) {
  const enabled = entries.flatMap((entry, i) => (entry.disabled ? [] : [i]));
  if (MENU_PREV.has(code) || MENU_NEXT.has(code)) {
    if (enabled.length === 0) return null;
    const at = enabled.indexOf(current);
    if (at < 0) return { focus: enabled[0] };
    const step = MENU_NEXT.has(code) ? 1 : -1;
    return { focus: enabled[(at + step + enabled.length) % enabled.length] };
  }
  if (MENU_CONFIRM.has(code)) return enabled.includes(current) ? { press: current } : null;
  const digit = /^(?:Digit|Numpad)([1-9])$/.exec(code);
  if (digit) {
    const index = entries.findIndex(entry => entry.number === Number(digit[1]));
    return index >= 0 && !entries[index].disabled ? { press: index } : null;
  }
  return null;
}

function roomLabel(run) {
  if (run.roomIndex >= BOSS_ROOM) return '最终房间 · Boss';
  return `${ZONE_NAMES[zoneOf(run.roomIndex)]} · 第 ${run.roomIndex + 1}/${BOSS_ROOM} 间`;
}

export function mountUI(root, options) {
  const doc = root.ownerDocument;
  const { getRun, getBestScore = () => 0 } = options;
  let selectedWeapon = WEAPON_ORDER[0];
  let titleOpen = true;
  let muted = options.muted === true;
  let volume = options.volume ?? 0.75;
  let message = '';
  let dialogKey = '';
  let dialogEntries = [];
  const hudCache = new Map();

  const el = (tag, className, text) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (className, text, onClick) => {
    const node = el('button', className, text);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
  };
  const setText = (key, node, text) => {
    if (hudCache.get(key) === text) return;
    hudCache.set(key, text);
    node.textContent = text;
  };
  const setStyle = (key, node, prop, value) => {
    if (hudCache.get(key) === value) return;
    hudCache.set(key, value);
    node.style[prop] = value;
  };

  const hud = el('div', 'hud');
  const hpBox = el('div', 'hud-hp');
  const hpFill = el('div', 'hud-hp-fill');
  const hpText = el('span', 'hud-hp-text');
  const hpBar = el('div', 'hud-hp-bar');
  hpBar.append(hpFill);
  hpBox.append(el('span', 'hud-label', '生命'), hpBar, hpText);
  const coinText = el('div', 'hud-coins');
  const roomText = el('div', 'hud-room');
  const muteButton = button('hud-mute', '', () => {
    muted = !muted;
    options.onMute(muted);
    render();
  });
  const volumeButton = button('hud-mute', '', () => {
    volume = nextVolume(volume);
    options.onVolume(volume);
    render();
  });
  const hudTop = el('div', 'hud-top');
  hudTop.append(hpBox, coinText, roomText, volumeButton, muteButton);
  const weaponBoxes = [0, 1].map(() => {
    const box = el('div', 'hud-weapon');
    const name = el('div', 'hud-weapon-name');
    const slots = [0, 1, 2].map(() => el('span', 'hud-slot'));
    const slotRow = el('div', 'hud-slots');
    slotRow.append(...slots);
    const cooldown = el('div', 'hud-cooldown');
    const cooldownFill = el('div', 'hud-cooldown-fill');
    cooldown.append(cooldownFill);
    box.append(name, slotRow, cooldown);
    return { box, name, slots, cooldownFill };
  });
  const weaponRow = el('div', 'hud-weapons');
  weaponRow.append(...weaponBoxes.map(w => w.box), el('div', 'hud-hint', 'Q 切换'));
  hud.append(hudTop, weaponRow);

  const title = el('div', 'screen title-screen');
  const titlePanel = el('div', 'panel');
  const cards = el('div', 'weapon-cards');
  const cardButtons = WEAPON_ORDER.map((id, i) => {
    const card = button('card weapon-card', undefined, () => {
      selectedWeapon = id;
      render();
    });
    card.dataset.weapon = id;
    card.append(el('span', 'card-key', String(i + 1)), el('span', 'card-icon'), el('strong', 'card-title', WEAPONS[id].name), el('span', 'card-text', WEAPONS[id].description));
    return card;
  });
  cards.append(...cardButtons);
  const startButton = button('primary', '出发！', () => {
    message = '';
    const result = options.onStart(selectedWeapon);
    if (result?.ok !== false) titleOpen = false;
    render();
  });
  const keyHint = () => el('p', 'panel-hint', '键盘：WASD / 方向键 选择 · J / 空格 / 回车 确认 · 数字键 直选');
  titlePanel.append(
    el('h2', 'panel-title', '选择你的起始武器'),
    el('p', 'panel-line', '穿越 6 间战斗房间与商店，击败最终的甜点大王。'),
    cards,
    startButton,
    keyHint()
  );
  title.append(titlePanel);
  const titleEntries = [
    ...cardButtons.map((node, i) => ({ node, number: i + 1, disabled: false })),
    { node: startButton, disabled: false }
  ];

  const dialog = el('div', 'screen dialog-screen');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.hidden = true;
  const status = el('p', 'panel-status');
  status.setAttribute('aria-live', 'polite');

  root.replaceChildren(hud, dialog, title);

  function act(action) {
    if (action.type === 'title') {
      titleOpen = true;
      message = '';
      render();
      cardButtons[WEAPON_ORDER.indexOf(selectedWeapon)].focus();
      return;
    }
    const result = runAction(action, options, selectedWeapon);
    message = result && result.ok === false ? reasonText(result.reason) : '';
    render();
  }

  function buildDialog(model) {
    const panel = el('div', `panel panel-${model.state}`);
    const heading = el('h2', 'panel-title', model.title);
    heading.id = 'dialog-title';
    dialog.setAttribute('aria-labelledby', heading.id);
    panel.append(heading);
    for (const line of model.lines) panel.append(el('p', 'panel-line', line));
    dialogEntries = [];
    if (model.items.length > 0) {
      const list = el('div', model.state === 'equipment' ? 'choice-list' : 'offer-cards');
      model.items.forEach((item, i) => {
        const node = button(model.state === 'equipment' ? 'choice' : 'card', undefined, () => act(item.action));
        node.disabled = item.disabled;
        const number = i < 9 ? i + 1 : undefined;
        if (number) node.append(el('span', 'card-key', String(number)));
        node.append(el('strong', 'card-title', item.label));
        if (item.description) node.append(el('span', 'card-text', item.description));
        if (item.price !== undefined) node.append(el('span', 'card-price', `${item.price} 金币`));
        if (item.note) node.append(el('span', 'card-note', item.note));
        list.append(node);
        dialogEntries.push({ node, number, disabled: item.disabled });
      });
      panel.append(list);
    }
    panel.append(status);
    const actions = el('div', 'panel-actions');
    for (const entry of model.actions) {
      const node = button('secondary', entry.label, () => act(entry.action));
      actions.append(node);
      dialogEntries.push({ node, disabled: false });
    }
    panel.append(actions, keyHint());
    dialog.replaceChildren(panel);
    panel.querySelector('button:not([disabled])')?.focus();
  }

  function onMenuKey(event) {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const entries = !title.hidden ? titleEntries : !dialog.hidden ? dialogEntries : null;
    if (!entries) return;
    const current = entries.findIndex(entry => entry.node === doc.activeElement);
    const result = menuKey(event.code, current, entries);
    if (!result) return;
    event.preventDefault();
    event.stopPropagation();
    if (result.focus !== undefined) {
      entries[result.focus].node.focus();
      return;
    }
    if (event.repeat) return;
    const target = entries[result.press].node;
    target.click();
    if (entries === titleEntries && target !== startButton) startButton.focus();
  }
  doc.addEventListener('keydown', onMenuKey);

  function renderHud(run) {
    const p = run.player;
    setText('hp', hpText, `${Math.ceil(Math.max(0, p.hp))}/${p.maxHp}`);
    setStyle('hpw', hpFill, 'width', `${Math.max(0, Math.min(1, p.hp / p.maxHp)) * 100}%`);
    setText('coins', coinText, `金币 ${run.coins}`);
    setText('room', roomText, roomLabel(run));
    weaponBoxes.forEach((view, i) => {
      const weapon = run.weapons[i];
      view.box.hidden = !weapon;
      if (!weapon) return;
      const active = i === run.activeWeapon;
      view.box.classList.toggle('active', active);
      setText(`w${i}`, view.name, `${active ? '▶ ' : ''}${WEAPONS[weapon.id].name}`);
      view.slots.forEach((slot, j) => {
        const id = weapon.modules[j];
        setText(`w${i}s${j}`, slot, id ? MODULES[id].name : '空');
        slot.classList.toggle('empty', !id);
      });
      const cooldown = getWeaponStats(weapon).cooldown;
      const left = Math.max(0, Math.min(1, (weapon.readyAt - run.time) / cooldown));
      setStyle(`w${i}cd`, view.cooldownFill, 'width', `${(1 - left) * 100}%`);
    });
  }

  function render() {
    const run = getRun();
    const showTitle = titleOpen || !run;
    title.hidden = !showTitle;
    hud.hidden = showTitle || !run;
    setText('volume', volumeButton, `音量：${Math.round(volume * 100)}%`);
    setText('mute', muteButton, muted ? '声音：关' : '声音：开');
    muteButton.setAttribute('aria-pressed', String(muted));
    cardButtons.forEach((card, i) => card.setAttribute('aria-pressed', String(WEAPON_ORDER[i] === selectedWeapon)));
    if (run && !showTitle) renderHud(run);

    const model = showTitle ? null : dialogModel(run, { bestScore: getBestScore() });
    const key = model ? JSON.stringify(model) : '';
    if (key !== dialogKey) {
      dialogKey = key;
      dialog.hidden = !model;
      if (model) buildDialog(model);
      else dialog.replaceChildren();
    }
    status.textContent = message;
  }

  render();
  cardButtons[WEAPON_ORDER.indexOf(selectedWeapon)].focus();
  return {
    render,
    dispose() {
      doc.removeEventListener('keydown', onMenuKey);
      root.replaceChildren();
      hudCache.clear();
    }
  };
}
