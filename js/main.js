// UI 렌더링과 사용자 입력 처리
import { Game, HERO_POWER } from './engine.js';
import { getCardDef, getCategoryMeta } from './cards.js';
import { runAiTurn } from './ai.js';

let game = null;
let selection = null; // {type:'card', handIndex, def} | {type:'attack', minionId} | {type:'heropower'}
let gameMode = 'ai'; // 'ai' | 'hotseat'

const appEl = document.getElementById('app');
const endTurnBtn = document.getElementById('end-turn-btn');
const restartBtn = document.getElementById('restart-btn');
const overlayEl = document.getElementById('game-over-overlay');
const overlayTextEl = document.getElementById('game-over-text');
const modeSelectEl = document.getElementById('mode-select-overlay');
const handoffEl = document.getElementById('handoff-overlay');

function activeIdx() {
  return gameMode === 'hotseat' ? game.currentPlayer : 0;
}

function newGame(mode) {
  gameMode = mode;
  game = mode === 'hotseat' ? new Game('플레이어 1', '플레이어 2') : new Game('플레이어', 'AI');
  game.start();
  selection = null;
  overlayEl.classList.add('hidden');
  modeSelectEl.classList.add('hidden');
  handoffEl.classList.add('hidden');
  render();
}

function currentValidTargets() {
  if (!selection) return [];
  const idx = activeIdx();
  if (selection.type === 'card') return game.getValidTargets(idx, selection.def);
  if (selection.type === 'heropower') return game.getValidTargets(idx, HERO_POWER);
  if (selection.type === 'attack') return game.getValidAttackTargets(idx);
  return [];
}

function isRefInList(ref, list) {
  return list.some(t => t.kind === ref.kind && t.playerIdx === ref.playerIdx &&
    (t.kind === 'hero' || t.id === ref.id));
}

// ---- 입력 처리 ----

function handleHandCardClick(i) {
  const idx = activeIdx();
  const player = game.players[idx];
  const entry = player.hand[i];
  if (!entry) return;
  const def = getCardDef(entry.cardId);

  if (selection && selection.type === 'card' && selection.handIndex === i) {
    selection = null;
    render();
    return;
  }
  if (!game.canPlayCard(idx, i)) return;

  if (!def.requiresTarget) {
    game.playCard(idx, i, null);
    selection = null;
    afterAction();
    return;
  }
  selection = { type: 'card', handIndex: i, def };
  render();
}

function handleOwnMinionAsAttacker(id) {
  const idx = activeIdx();
  if (!game.canMinionAttack(idx, id)) return;
  if (selection && selection.type === 'attack' && selection.minionId === id) {
    selection = null;
    render();
    return;
  }
  selection = { type: 'attack', minionId: id };
  render();
}

function handleHeroPowerClick() {
  const idx = activeIdx();
  const player = game.players[idx];
  if (player.heroPowerUsed || player.mana.current < HERO_POWER.cost) return;
  if (selection && selection.type === 'heropower') {
    selection = null;
    render();
    return;
  }
  selection = { type: 'heropower' };
  render();
}

function resolveTarget(ref) {
  if (!selection) return;
  const idx = activeIdx();
  const validTargets = currentValidTargets();
  if (!isRefInList(ref, validTargets)) return;

  if (selection.type === 'card') {
    game.playCard(idx, selection.handIndex, ref);
  } else if (selection.type === 'heropower') {
    game.useHeroPower(idx, ref);
  } else if (selection.type === 'attack') {
    game.attack(idx, selection.minionId, ref);
  }
  selection = null;
  afterAction();
}

function skipOptionalTarget() {
  if (!selection || selection.type !== 'card' || !selection.def.optionalTarget) return;
  game.playCard(activeIdx(), selection.handIndex, null);
  selection = null;
  afterAction();
}

function afterAction() {
  render();
  if (game.gameOver) showGameOver();
}

function showGameOver() {
  overlayTextEl.textContent = `${game.players[game.winner].name} 승리!`;
  overlayEl.classList.remove('hidden');
}

function showHandoff() {
  document.getElementById('handoff-text').textContent = `${game.players[game.currentPlayer].name}의 턴입니다`;
  handoffEl.classList.remove('hidden');
}

appEl.addEventListener('click', (e) => {
  if (!game || game.gameOver) return;
  if (gameMode === 'ai' && game.currentPlayer !== 0) return;

  const skipEl = e.target.closest('[data-role="skip-target"]');
  if (skipEl) { skipOptionalTarget(); return; }

  const heroPowerEl = e.target.closest('[data-role="hero-power"]');
  if (heroPowerEl) { handleHeroPowerClick(); return; }

  const handCardEl = e.target.closest('[data-role="hand-card"]');
  if (handCardEl) { handleHandCardClick(parseInt(handCardEl.dataset.handIndex, 10)); return; }

  const myIdx = activeIdx();
  const oppIdx = 1 - myIdx;

  const ownMinionEl = e.target.closest('[data-role="own-minion"]');
  if (ownMinionEl) {
    const id = parseInt(ownMinionEl.dataset.minionId, 10);
    if (selection && (selection.type === 'card' || selection.type === 'heropower')) {
      resolveTarget({ kind: 'minion', playerIdx: myIdx, id });
    } else {
      handleOwnMinionAsAttacker(id);
    }
    return;
  }

  const enemyMinionEl = e.target.closest('[data-role="enemy-minion"]');
  if (enemyMinionEl) {
    const id = parseInt(enemyMinionEl.dataset.minionId, 10);
    resolveTarget({ kind: 'minion', playerIdx: oppIdx, id });
    return;
  }

  const ownHeroEl = e.target.closest('[data-role="own-hero"]');
  if (ownHeroEl) { resolveTarget({ kind: 'hero', playerIdx: myIdx }); return; }

  const enemyHeroEl = e.target.closest('[data-role="enemy-hero"]');
  if (enemyHeroEl) { resolveTarget({ kind: 'hero', playerIdx: oppIdx }); return; }
});

endTurnBtn.addEventListener('click', () => {
  if (!game || game.gameOver) return;
  if (gameMode === 'ai' && game.currentPlayer !== 0) return;
  selection = null;
  game.endTurn();

  if (gameMode === 'hotseat') {
    render();
    if (!game.gameOver) showHandoff();
    else showGameOver();
    return;
  }

  render();
  endTurnBtn.disabled = true;
  setTimeout(() => {
    if (!game.gameOver) runAiTurn(game);
    render();
    if (game.gameOver) showGameOver();
  }, 700);
});

restartBtn.addEventListener('click', () => newGame(gameMode));
document.getElementById('main-menu-btn').addEventListener('click', () => {
  game = null;
  overlayEl.classList.add('hidden');
  modeSelectEl.classList.remove('hidden');
});
document.getElementById('mode-ai-btn').addEventListener('click', () => newGame('ai'));
document.getElementById('mode-hotseat-btn').addEventListener('click', () => newGame('hotseat'));
document.getElementById('handoff-ack-btn').addEventListener('click', () => {
  handoffEl.classList.add('hidden');
});

// ---- 렌더링 ----

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function minionHtml(minion, owner, targetable, extraClasses) {
  const def = getCardDef(minion.cardId);
  const cat = getCategoryMeta(def.category);
  const classes = ['minion', ...extraClasses];
  if (minion.taunt) classes.push('taunt');
  if (minion.divineShield) classes.push('divine-shield');
  if (targetable) classes.push('targetable');
  const role = owner === 0 ? 'own-minion' : 'enemy-minion';
  return `<div class="${classes.join(' ')}" data-role="${role}" data-minion-id="${minion.id}" style="--cat-color:${cat.color}" title="${escapeHtml(cat.label)}">
    <div class="minion-cat-badge">${cat.icon}</div>
    <div class="minion-art">${def.art || ''}</div>
    <div class="minion-name">${escapeHtml(def.name)}</div>
    <div class="minion-stats"><span class="atk">${minion.attack}</span><span class="hp">${minion.health}</span></div>
  </div>`;
}

function handCardHtml(entry, i, playable) {
  const def = getCardDef(entry.cardId);
  const cat = getCategoryMeta(def.category);
  const classes = ['card', 'in-hand', `type-${def.type}`];
  if (!playable) classes.push('disabled');
  if (selection && selection.type === 'card' && selection.handIndex === i) classes.push('selected');
  const stats = def.type === 'minion'
    ? `<div class="minion-stats"><span class="atk">${def.attack}</span><span class="hp">${def.health}</span></div>`
    : '';
  return `<div class="${classes.join(' ')}" data-role="hand-card" data-hand-index="${i}" style="--cat-color:${cat.color}">
    <div class="cost-badge">${def.cost}</div>
    <div class="cat-badge" title="${escapeHtml(cat.label)}">${cat.icon}</div>
    <div class="card-art">${def.art || ''}</div>
    <div class="card-name">${escapeHtml(def.name)}</div>
    <div class="card-text">${escapeHtml(def.text || '')}</div>
    ${stats}
  </div>`;
}

function manaHtml(mana) {
  let out = '';
  for (let i = 0; i < mana.max; i++) {
    out += `<span class="mana-crystal ${i < mana.current ? 'filled' : 'empty'}"></span>`;
  }
  return out;
}

function render() {
  const myIdx = activeIdx();
  const oppIdx = 1 - myIdx;
  const me = game.players[myIdx];
  const opp = game.players[oppIdx];
  const validTargets = currentValidTargets();
  const targetable = (ref) => isRefInList(ref, validTargets);

  appEl.classList.toggle('opponent-turn', (gameMode === 'ai' && game.currentPlayer !== 0) || game.gameOver);

  const heroPowerClasses = ['hero-power-btn'];
  if (me.heroPowerUsed || me.mana.current < HERO_POWER.cost) heroPowerClasses.push('disabled');
  if (selection && selection.type === 'heropower') heroPowerClasses.push('selected');

  document.getElementById('opponent-hero').outerHTML = `
    <div id="opponent-hero" class="hero ${targetable({ kind: 'hero', playerIdx: oppIdx }) ? 'targetable' : ''}" data-role="enemy-hero">
      <div class="hero-name">${escapeHtml(opp.name)}</div>
      <div class="hero-health">${opp.hero.health}</div>
    </div>`;

  document.getElementById('opponent-hand').innerHTML =
    Array(opp.hand.length).fill('<div class="card card-back"></div>').join('');

  document.getElementById('opponent-board').innerHTML =
    opp.board.map(m => minionHtml(m, 1, targetable({ kind: 'minion', playerIdx: oppIdx, id: m.id }), [])).join('');

  document.getElementById('player-board').innerHTML =
    me.board.map(m => {
      const extra = [];
      const canAtk = game.canMinionAttack(myIdx, m.id);
      if (canAtk) extra.push('can-attack');
      if (selection && selection.type === 'attack' && selection.minionId === m.id) extra.push('selected');
      const isTarget = targetable({ kind: 'minion', playerIdx: myIdx, id: m.id });
      return minionHtml(m, 0, isTarget, extra);
    }).join('');

  document.getElementById('player-hero').outerHTML = `
    <div id="player-hero" class="hero ${targetable({ kind: 'hero', playerIdx: myIdx }) ? 'targetable' : ''}" data-role="own-hero">
      <div class="hero-name">${escapeHtml(me.name)}</div>
      <div class="hero-health">${me.hero.health}</div>
    </div>`;

  const heroPowerBtn = document.getElementById('player-hero-power');
  heroPowerBtn.className = heroPowerClasses.join(' ');
  heroPowerBtn.title = `${HERO_POWER.name}: ${HERO_POWER.text}`;

  document.getElementById('mana-crystals').innerHTML =
    `${manaHtml(me.mana)} <span class="mana-text">${me.mana.current}/${me.mana.max}</span>`;

  document.getElementById('player-hand').innerHTML =
    me.hand.map((entry, i) => handCardHtml(entry, i, game.canPlayCard(myIdx, i))).join('');

  const skipVisible = selection && selection.type === 'card' && selection.def.optionalTarget;
  document.getElementById('skip-target-btn').classList.toggle('hidden', !skipVisible);

  document.getElementById('turn-indicator').textContent =
    `${game.players[game.currentPlayer].name}의 턴`;

  document.getElementById('log-panel').innerHTML =
    game.log.slice(-8).map(l => `<div class="log-line">${escapeHtml(l)}</div>`).join('');

  endTurnBtn.disabled = (gameMode === 'ai' && game.currentPlayer !== 0) || game.gameOver;
}
