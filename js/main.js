// UI 렌더링과 사용자 입력 처리
import { Game, HERO_POWER } from './engine.js';
import { getCardDef } from './cards.js';
import { runAiTurn } from './ai.js';

let game = null;
let selection = null; // {type:'card', handIndex, def} | {type:'attack', minionId} | {type:'heropower'}

const appEl = document.getElementById('app');
const endTurnBtn = document.getElementById('end-turn-btn');
const restartBtn = document.getElementById('restart-btn');
const overlayEl = document.getElementById('game-over-overlay');
const overlayTextEl = document.getElementById('game-over-text');

function newGame() {
  game = new Game();
  game.start();
  selection = null;
  overlayEl.classList.add('hidden');
  render();
}

function currentValidTargets() {
  if (!selection) return [];
  if (selection.type === 'card') return game.getValidTargets(0, selection.def);
  if (selection.type === 'heropower') return game.getValidTargets(0, HERO_POWER);
  if (selection.type === 'attack') return game.getValidAttackTargets(0);
  return [];
}

function isRefInList(ref, list) {
  return list.some(t => t.kind === ref.kind && t.playerIdx === ref.playerIdx &&
    (t.kind === 'hero' || t.id === ref.id));
}

// ---- 입력 처리 ----

function handleHandCardClick(i) {
  const player = game.players[0];
  const entry = player.hand[i];
  if (!entry) return;
  const def = getCardDef(entry.cardId);

  if (selection && selection.type === 'card' && selection.handIndex === i) {
    selection = null;
    render();
    return;
  }
  if (!game.canPlayCard(0, i)) return;

  if (!def.requiresTarget) {
    game.playCard(0, i, null);
    selection = null;
    afterAction();
    return;
  }
  selection = { type: 'card', handIndex: i, def };
  render();
}

function handleOwnMinionAsAttacker(id) {
  if (!game.canMinionAttack(0, id)) return;
  if (selection && selection.type === 'attack' && selection.minionId === id) {
    selection = null;
    render();
    return;
  }
  selection = { type: 'attack', minionId: id };
  render();
}

function handleHeroPowerClick() {
  const player = game.players[0];
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
  const validTargets = currentValidTargets();
  if (!isRefInList(ref, validTargets)) return;

  if (selection.type === 'card') {
    game.playCard(0, selection.handIndex, ref);
  } else if (selection.type === 'heropower') {
    game.useHeroPower(0, ref);
  } else if (selection.type === 'attack') {
    game.attack(0, selection.minionId, ref);
  }
  selection = null;
  afterAction();
}

function skipOptionalTarget() {
  if (!selection || selection.type !== 'card' || !selection.def.optionalTarget) return;
  game.playCard(0, selection.handIndex, null);
  selection = null;
  afterAction();
}

function afterAction() {
  render();
  if (game.gameOver) showGameOver();
}

function showGameOver() {
  overlayTextEl.textContent = game.winner === 0 ? '승리했습니다!' : '패배했습니다...';
  overlayEl.classList.remove('hidden');
}

appEl.addEventListener('click', (e) => {
  if (!game || game.gameOver || game.currentPlayer !== 0) return;

  const skipEl = e.target.closest('[data-role="skip-target"]');
  if (skipEl) { skipOptionalTarget(); return; }

  const heroPowerEl = e.target.closest('[data-role="hero-power"]');
  if (heroPowerEl) { handleHeroPowerClick(); return; }

  const handCardEl = e.target.closest('[data-role="hand-card"]');
  if (handCardEl) { handleHandCardClick(parseInt(handCardEl.dataset.handIndex, 10)); return; }

  const ownMinionEl = e.target.closest('[data-role="own-minion"]');
  if (ownMinionEl) {
    const id = parseInt(ownMinionEl.dataset.minionId, 10);
    if (selection && (selection.type === 'card' || selection.type === 'heropower')) {
      resolveTarget({ kind: 'minion', playerIdx: 0, id });
    } else {
      handleOwnMinionAsAttacker(id);
    }
    return;
  }

  const enemyMinionEl = e.target.closest('[data-role="enemy-minion"]');
  if (enemyMinionEl) {
    const id = parseInt(enemyMinionEl.dataset.minionId, 10);
    resolveTarget({ kind: 'minion', playerIdx: 1, id });
    return;
  }

  const ownHeroEl = e.target.closest('[data-role="own-hero"]');
  if (ownHeroEl) { resolveTarget({ kind: 'hero', playerIdx: 0 }); return; }

  const enemyHeroEl = e.target.closest('[data-role="enemy-hero"]');
  if (enemyHeroEl) { resolveTarget({ kind: 'hero', playerIdx: 1 }); return; }
});

endTurnBtn.addEventListener('click', () => {
  if (!game || game.gameOver || game.currentPlayer !== 0) return;
  selection = null;
  game.endTurn();
  render();
  endTurnBtn.disabled = true;
  setTimeout(() => {
    if (!game.gameOver) runAiTurn(game);
    render();
    if (game.gameOver) showGameOver();
  }, 700);
});

restartBtn.addEventListener('click', newGame);

// ---- 렌더링 ----

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function minionHtml(minion, owner, targetable, extraClasses) {
  const def = getCardDef(minion.cardId);
  const classes = ['minion', ...extraClasses];
  if (minion.taunt) classes.push('taunt');
  if (minion.divineShield) classes.push('divine-shield');
  if (targetable) classes.push('targetable');
  const role = owner === 0 ? 'own-minion' : 'enemy-minion';
  const badges = [];
  if (minion.taunt) badges.push('🛡');
  if (minion.divineShield) badges.push('✨');
  if (minion.charge) badges.push('⚡');
  return `<div class="${classes.join(' ')}" data-role="${role}" data-minion-id="${minion.id}">
    <div class="minion-name">${escapeHtml(def.name)}</div>
    <div class="minion-badges">${badges.join(' ')}</div>
    <div class="minion-stats"><span class="atk">${minion.attack}</span><span class="hp">${minion.health}</span></div>
  </div>`;
}

function handCardHtml(entry, i, playable) {
  const def = getCardDef(entry.cardId);
  const classes = ['card', 'in-hand'];
  if (!playable) classes.push('disabled');
  if (selection && selection.type === 'card' && selection.handIndex === i) classes.push('selected');
  const stats = def.type === 'minion'
    ? `<div class="minion-stats"><span class="atk">${def.attack}</span><span class="hp">${def.health}</span></div>`
    : '';
  return `<div class="${classes.join(' ')}" data-role="hand-card" data-hand-index="${i}">
    <div class="cost-badge">${def.cost}</div>
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
  const p0 = game.players[0];
  const p1 = game.players[1];
  const validTargets = currentValidTargets();
  const targetable = (ref) => isRefInList(ref, validTargets);

  appEl.classList.toggle('opponent-turn', game.currentPlayer !== 0 || game.gameOver);

  const heroPowerClasses = ['hero-power-btn'];
  if (p0.heroPowerUsed || p0.mana.current < HERO_POWER.cost) heroPowerClasses.push('disabled');
  if (selection && selection.type === 'heropower') heroPowerClasses.push('selected');

  document.getElementById('opponent-hero').outerHTML = `
    <div id="opponent-hero" class="hero ${targetable({ kind: 'hero', playerIdx: 1 }) ? 'targetable' : ''}" data-role="enemy-hero">
      <div class="hero-name">${escapeHtml(p1.name)}</div>
      <div class="hero-health">${p1.hero.health}</div>
    </div>`;

  document.getElementById('opponent-hand').innerHTML =
    Array(p1.hand.length).fill('<div class="card card-back"></div>').join('');

  document.getElementById('opponent-board').innerHTML =
    p1.board.map(m => minionHtml(m, 1, targetable({ kind: 'minion', playerIdx: 1, id: m.id }), [])).join('');

  document.getElementById('player-board').innerHTML =
    p0.board.map(m => {
      const extra = [];
      const canAtk = game.canMinionAttack(0, m.id);
      if (canAtk) extra.push('can-attack');
      if (selection && selection.type === 'attack' && selection.minionId === m.id) extra.push('selected');
      const isTarget = targetable({ kind: 'minion', playerIdx: 0, id: m.id });
      return minionHtml(m, 0, isTarget, extra);
    }).join('');

  document.getElementById('player-hero').outerHTML = `
    <div id="player-hero" class="hero ${targetable({ kind: 'hero', playerIdx: 0 }) ? 'targetable' : ''}" data-role="own-hero">
      <div class="hero-name">${escapeHtml(p0.name)}</div>
      <div class="hero-health">${p0.hero.health}</div>
      <button class="${heroPowerClasses.join(' ')}" data-role="hero-power" title="${escapeHtml(HERO_POWER.name)}: ${escapeHtml(HERO_POWER.text)}">
        ${escapeHtml(HERO_POWER.name)}<br/>(${HERO_POWER.cost})
      </button>
    </div>`;

  document.getElementById('mana-crystals').innerHTML =
    `${manaHtml(p0.mana)} <span class="mana-text">${p0.mana.current}/${p0.mana.max}</span>`;

  document.getElementById('player-hand').innerHTML =
    p0.hand.map((entry, i) => handCardHtml(entry, i, game.canPlayCard(0, i))).join('');

  const skipVisible = selection && selection.type === 'card' && selection.def.optionalTarget;
  document.getElementById('skip-target-btn').classList.toggle('hidden', !skipVisible);

  document.getElementById('turn-indicator').textContent =
    game.currentPlayer === 0 ? '당신의 턴' : 'AI의 턴';

  document.getElementById('log-panel').innerHTML =
    game.log.slice(-8).map(l => `<div class="log-line">${escapeHtml(l)}</div>`).join('');

  endTurnBtn.disabled = game.currentPlayer !== 0 || game.gameOver;
}

newGame();
