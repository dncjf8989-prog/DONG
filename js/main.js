// UI 렌더링과 사용자 입력 처리
import { Game, HERO_POWER } from './engine.js';
import { getCardDef, getCategoryMeta } from './cards.js';
import { runAiTurn } from './ai.js';

let game = null;
let selection = null; // {type:'card', handIndex, def} | {type:'attack', minionId} | {type:'heropower'}
let gameMode = 'ai'; // 'ai' | 'hotseat' | 'online'

// ---- 온라인 대전 상태 (WebRTC/PeerJS, 로그인·서버 저장소 불필요) ----
let roomCode = null;
let mySeat = null; // 온라인 모드에서 내 좌석(0|1)
let peer = null;
let peerConn = null;

const appEl = document.getElementById('app');
const endTurnBtn = document.getElementById('end-turn-btn');
const restartBtn = document.getElementById('restart-btn');
const overlayEl = document.getElementById('game-over-overlay');
const overlayTextEl = document.getElementById('game-over-text');
const modeSelectEl = document.getElementById('mode-select-overlay');
const handoffEl = document.getElementById('handoff-overlay');
const onlineMenuEl = document.getElementById('online-menu-overlay');
const onlineWaitingEl = document.getElementById('online-waiting-overlay');
const onlineErrorEl = document.getElementById('online-error');

function activeIdx() {
  if (gameMode === 'online') return mySeat;
  if (gameMode === 'hotseat') return game.currentPlayer;
  return 0;
}

function isMyTurn() {
  if (gameMode === 'ai') return game.currentPlayer === 0;
  if (gameMode === 'online') return game.currentPlayer === mySeat;
  return true;
}

function hideAllOverlays() {
  overlayEl.classList.add('hidden');
  modeSelectEl.classList.add('hidden');
  handoffEl.classList.add('hidden');
  onlineMenuEl.classList.add('hidden');
  onlineWaitingEl.classList.add('hidden');
}

function newGame(mode) {
  gameMode = mode;
  game = mode === 'hotseat' ? new Game('플레이어 1', '플레이어 2') : new Game('플레이어', 'AI');
  game.start();
  selection = null;
  hideAllOverlays();
  render();
}

function randomRoomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 혼동되는 0/O, 1/I 제외
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function serializeGame(g) {
  return JSON.parse(JSON.stringify(g));
}

function hydrateGame(data) {
  return Object.assign(Object.create(Game.prototype), data);
}

function showOnlineError(msg) {
  onlineErrorEl.textContent = msg;
  onlineErrorEl.classList.remove('hidden');
}

function sendState() {
  if (peerConn && peerConn.open) peerConn.send({ type: 'state', state: serializeGame(game) });
}

function handlePeerMessage(msg) {
  if (!msg || (msg.type !== 'init' && msg.type !== 'state')) return;
  if (msg.type === 'init') { mySeat = msg.seat; gameMode = 'online'; }
  game = hydrateGame(msg.state);
  selection = null;
  hideAllOverlays();
  render();
  if (game.gameOver) showGameOver();
}

function handlePeerDisconnect() {
  if (gameMode !== 'online' || !game || game.gameOver) return;
  game.log.push('상대방의 연결이 끊어졌습니다. "모드 선택으로"에서 새로 시작해주세요.');
  render();
}

function setupConnHandlers(conn) {
  conn.on('data', handlePeerMessage);
  conn.on('close', handlePeerDisconnect);
  conn.on('error', handlePeerDisconnect);
}

function createOnlineRoom() {
  onlineErrorEl.classList.add('hidden');
  if (typeof Peer === 'undefined') { showOnlineError('이 브라우저에서는 온라인 기능을 사용할 수 없습니다.'); return; }
  const code = randomRoomCode();
  roomCode = code;
  mySeat = 0;
  peer = new Peer(code);

  peer.on('open', () => {
    document.getElementById('online-waiting-title').textContent = '상대를 기다리는 중...';
    document.getElementById('online-room-code').textContent = code;
    hideAllOverlays();
    onlineWaitingEl.classList.remove('hidden');
  });

  peer.on('connection', (conn) => {
    peerConn = conn;
    conn.on('open', () => {
      game = new Game('플레이어 1', '플레이어 2');
      game.start();
      gameMode = 'online';
      selection = null;
      conn.send({ type: 'init', seat: 1, state: serializeGame(game) });
      hideAllOverlays();
      render();
    });
    setupConnHandlers(conn);
  });

  peer.on('error', (err) => {
    if (err.type === 'unavailable-id') { peer.destroy(); createOnlineRoom(); return; }
    showOnlineError(`연결 오류가 발생했습니다 (${err.type}).`);
  });
}

function joinOnlineRoom(codeRaw) {
  onlineErrorEl.classList.add('hidden');
  const code = (codeRaw || '').trim().toUpperCase();
  if (code.length < 4) { showOnlineError('방 코드를 입력해주세요.'); return; }
  if (typeof Peer === 'undefined') { showOnlineError('이 브라우저에서는 온라인 기능을 사용할 수 없습니다.'); return; }
  roomCode = code;

  document.getElementById('online-waiting-title').textContent = '연결하는 중...';
  document.getElementById('online-room-code').textContent = '';
  hideAllOverlays();
  onlineWaitingEl.classList.remove('hidden');

  peer = new Peer();
  peer.on('open', () => {
    const conn = peer.connect(code, { reliable: true });
    peerConn = conn;
    setupConnHandlers(conn);
    conn.on('error', () => showOnlineError('연결에 실패했습니다. 코드를 확인하고 다시 시도해주세요.'));
  });
  peer.on('error', (err) => {
    if (err.type === 'peer-unavailable') { showOnlineError('방을 찾을 수 없습니다. 코드를 확인해주세요.'); return; }
    showOnlineError(`연결 오류가 발생했습니다 (${err.type}).`);
  });
}

function leaveOnlineRoom() {
  if (peerConn) { try { peerConn.close(); } catch (e) {} peerConn = null; }
  if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
  gameMode = 'ai';
  game = null;
  roomCode = null;
  mySeat = null;
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
  if (gameMode === 'online') sendState();
  if (game.gameOver) showGameOver();
}

function showGameOver() {
  overlayTextEl.textContent = `${game.players[game.winner].name} 승리!`;
  restartBtn.classList.toggle('hidden', gameMode === 'online');
  overlayEl.classList.remove('hidden');
}

function showHandoff() {
  document.getElementById('handoff-text').textContent = `${game.players[game.currentPlayer].name}의 턴입니다`;
  handoffEl.classList.remove('hidden');
}

appEl.addEventListener('click', (e) => {
  if (!game || game.gameOver) return;
  if (!isMyTurn()) return;

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
  if (!isMyTurn()) return;
  selection = null;
  game.endTurn();

  if (gameMode === 'online') {
    render();
    sendState();
    if (game.gameOver) showGameOver();
    return;
  }

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

restartBtn.addEventListener('click', () => {
  if (gameMode === 'online') return; // 온라인 대전은 재시작 대신 방을 나가야 함
  newGame(gameMode);
});
document.getElementById('main-menu-btn').addEventListener('click', () => {
  if (gameMode === 'online') leaveOnlineRoom();
  game = null;
  hideAllOverlays();
  modeSelectEl.classList.remove('hidden');
});
document.getElementById('mode-ai-btn').addEventListener('click', () => newGame('ai'));
document.getElementById('mode-hotseat-btn').addEventListener('click', () => newGame('hotseat'));
document.getElementById('handoff-ack-btn').addEventListener('click', () => {
  handoffEl.classList.add('hidden');
});

document.getElementById('mode-online-btn').addEventListener('click', () => {
  onlineErrorEl.classList.add('hidden');
  document.getElementById('online-join-form').classList.add('hidden');
  document.getElementById('online-code-input').value = '';
  hideAllOverlays();
  onlineMenuEl.classList.remove('hidden');
});
document.getElementById('online-back-btn').addEventListener('click', () => {
  hideAllOverlays();
  modeSelectEl.classList.remove('hidden');
});
document.getElementById('online-create-btn').addEventListener('click', createOnlineRoom);
document.getElementById('online-join-toggle-btn').addEventListener('click', () => {
  document.getElementById('online-join-form').classList.remove('hidden');
  document.getElementById('online-code-input').focus();
});
document.getElementById('online-join-btn').addEventListener('click', () => {
  joinOnlineRoom(document.getElementById('online-code-input').value);
});
document.getElementById('online-code-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') joinOnlineRoom(document.getElementById('online-code-input').value);
});
document.getElementById('online-cancel-btn').addEventListener('click', () => {
  leaveOnlineRoom();
  hideAllOverlays();
  modeSelectEl.classList.remove('hidden');
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

  appEl.classList.toggle('opponent-turn', !isMyTurn() || game.gameOver);

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

  endTurnBtn.disabled = !isMyTurn() || game.gameOver;
}
