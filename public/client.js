'use strict';

const socket = io();

const MONTH_INFO = {
  1: { name: '1월', flower: '송학', color: '#e9d9a8' },
  2: { name: '2월', flower: '매조', color: '#f0b7c4' },
  3: { name: '3월', flower: '벚꽃', color: '#f6c9d8' },
  4: { name: '4월', flower: '흑싸리', color: '#8a9a6b' },
  5: { name: '5월', flower: '난초', color: '#bfe3b8' },
  6: { name: '6월', flower: '모란', color: '#e2909c' },
  7: { name: '7월', flower: '홍싸리', color: '#9dbb7c' },
  8: { name: '8월', flower: '공산', color: '#e0cd7a' },
  9: { name: '9월', flower: '국화', color: '#e8c96a' },
  10: { name: '10월', flower: '단풍', color: '#cf8a52' },
};

let myId = null;
let currentState = null;
let timerInterval = null;

// ---------- Screen helpers ----------
const screenLobby = document.getElementById('screen-lobby');
const screenGame = document.getElementById('screen-game');

function showScreen(name) {
  screenLobby.classList.toggle('hidden', name !== 'lobby');
  screenGame.classList.toggle('hidden', name !== 'game');
}

// ---------- Lobby tabs ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

function setLobbyError(msg) {
  document.getElementById('lobby-error').textContent = msg || '';
}

document.getElementById('btn-create').addEventListener('click', () => {
  const nickname = document.getElementById('nickname').value.trim();
  if (!nickname) return setLobbyError('닉네임을 입력해주세요.');
  const maxPlayers = Number(document.getElementById('maxPlayers').value);
  const ante = Number(document.getElementById('ante').value);
  const startingChips = Number(document.getElementById('startingChips').value);
  setLobbyError('');
  socket.emit('create_room', { nickname, maxPlayers, ante, startingChips }, (res) => {
    if (res.error) return setLobbyError(res.error);
    enterGameScreen();
  });
});

document.getElementById('btn-join').addEventListener('click', () => {
  const nickname = document.getElementById('nickname').value.trim();
  const code = document.getElementById('joinCode').value.trim().toUpperCase();
  if (!nickname) return setLobbyError('닉네임을 입력해주세요.');
  if (!code) return setLobbyError('방 코드를 입력해주세요.');
  setLobbyError('');
  socket.emit('join_room', { nickname, code }, (res) => {
    if (res.error) return setLobbyError(res.error);
    enterGameScreen();
  });
});

function enterGameScreen() {
  showScreen('game');
  document.getElementById('log-box').innerHTML = '';
  document.getElementById('chat-log').innerHTML = '';
}

document.getElementById('btn-leave').addEventListener('click', () => {
  socket.emit('leave_room', {}, () => {
    location.reload();
  });
});

document.getElementById('btn-copy').addEventListener('click', () => {
  const code = document.getElementById('room-code').textContent;
  if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
});

document.getElementById('btn-start').addEventListener('click', () => {
  socket.emit('start_game', {}, (res) => {
    if (res && res.error) appendLog(`⚠️ ${res.error}`);
  });
});

// ---------- Chat ----------
document.getElementById('chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  socket.emit('chat_message', { text });
  input.value = '';
});

function appendChat(nickname, text) {
  const box = document.getElementById('chat-log');
  const div = document.createElement('div');
  div.innerHTML = `<b>${escapeHtml(nickname)}:</b> ${escapeHtml(text)}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function appendLog(text) {
  const box = document.getElementById('log-box');
  const div = document.createElement('div');
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Socket events ----------
socket.on('connect', () => { myId = socket.id; });
socket.on('log', ({ text }) => appendLog(text));
socket.on('chat_message', ({ nickname, text }) => appendChat(nickname, text));
socket.on('room_state', (state) => {
  currentState = state;
  myId = state.youId;
  render(state);
});

// ---------- Card rendering ----------
function cardFaceEl(card, cls) {
  const info = MONTH_INFO[card.month];
  const div = document.createElement('div');
  div.className = `${cls} card-face` + (card.isGwang ? ' card-gwang' : '');
  div.style.background = `linear-gradient(160deg, ${info.color}, #ffffffcc)`;
  div.innerHTML = `<div class="month">${card.month}</div><div class="label">${card.isGwang ? '光 ' + info.flower : info.flower}</div>`;
  return div;
}

function cardBackEl(cls) {
  const div = document.createElement('div');
  div.className = `${cls} card-back`;
  return div;
}

// ---------- Main render ----------
function render(state) {
  document.getElementById('room-code').textContent = state.code;
  document.getElementById('ante-label').textContent = `참가비 ${state.ante.toLocaleString()}`;
  document.getElementById('pot-amount').textContent = state.pot.toLocaleString();
  document.getElementById('current-bet-label').textContent = state.currentBet > 0 ? `현재 베팅 ${state.currentBet.toLocaleString()}` : '';

  const roundLabel = document.getElementById('round-label');
  if (state.state === 'lobby') roundLabel.textContent = state.round === 0 ? '게임 대기중' : `${state.round}라운드 종료`;
  else if (state.state === 'playing') roundLabel.textContent = `${state.round}라운드 진행중`;
  else if (state.state === 'showdown') roundLabel.textContent = `${state.round}라운드 쇼다운`;
  else if (state.state === 'ended') roundLabel.textContent = '게임 종료';

  renderSeats(state);
  renderWaitingPanel(state);
  renderActionBar(state);
  renderTimer(state);
}

function renderSeats(state) {
  const seatsEl = document.getElementById('seats');
  seatsEl.innerHTML = '';
  const players = state.players.slice().sort((a, b) => a.seat - b.seat);
  if (players.length === 0) return;

  let myIndex = players.findIndex((p) => p.id === myId);
  if (myIndex === -1) myIndex = 0;
  const order = [...players.slice(myIndex), ...players.slice(0, myIndex)];

  const n = order.length;
  const angleStep = 360 / n;
  const rx = 44, ry = 40;

  order.forEach((p, i) => {
    const angleDeg = 90 + i * angleStep;
    const rad = (angleDeg * Math.PI) / 180;
    const left = 50 + rx * Math.cos(rad);
    const top = 50 + ry * Math.sin(rad);

    const seat = document.createElement('div');
    seat.className = 'seat' + (p.folded ? ' folded' : '') + (state.turnPlayerId === p.id ? ' turn' : '');
    seat.style.left = `${left}%`;
    seat.style.top = `${top}%`;

    const box = document.createElement('div');
    box.className = 'seat-box';

    const isMe = p.id === myId;

    let statusText = '';
    if (p.folded) statusText = '다이';
    else if (p.allIn) statusText = '올인';
    else if (state.state === 'showdown' && p.handResult) statusText = p.handResult.name;
    else if (state.dealerSeat === p.seat) statusText = '딜러';

    box.innerHTML = `
      <div class="seat-name">${escapeHtml(p.nickname)}${p.isHost ? '<span class="host-badge">방장</span>' : ''}${isMe ? ' (나)' : ''}</div>
      <div class="seat-chips">💰 ${p.chips.toLocaleString()}</div>
      <div class="seat-status">${statusText}</div>
      ${p.contributed > 0 ? `<div class="seat-bet">베팅 ${p.contributed.toLocaleString()}</div>` : ''}
    `;

    if (state.turnPlayerId === p.id && state.turnDeadline) {
      const ring = document.createElement('div');
      ring.className = 'timer-ring';
      ring.id = `ring-${p.id}`;
      box.appendChild(ring);
    }

    const cardsWrap = document.createElement('div');
    cardsWrap.className = 'seat-cards';
    if (state.state === 'playing' || state.state === 'showdown') {
      if (p.cards && p.cards.length && (isMe || state.state === 'showdown')) {
        p.cards.forEach((c) => cardsWrap.appendChild(cardFaceEl(c, 'card-mini')));
      } else if (p.cardCount) {
        for (let k = 0; k < p.cardCount; k++) cardsWrap.appendChild(cardBackEl('card-mini'));
      }
    }
    box.appendChild(cardsWrap);

    seat.appendChild(box);
    seatsEl.appendChild(seat);
  });
}

function renderWaitingPanel(state) {
  const panel = document.getElementById('waiting-panel');
  const startBtn = document.getElementById('btn-start');
  const text = document.getElementById('waiting-text');
  const me = state.players.find((p) => p.id === myId);

  if (state.state === 'lobby') {
    panel.classList.remove('hidden');
    text.textContent = `참가자 ${state.players.length}/${state.maxPlayers}명 대기중... (4~5인 권장)`;
    startBtn.classList.toggle('hidden', !(me && me.isHost));
  } else if (state.state === 'ended') {
    panel.classList.remove('hidden');
    text.textContent = '게임이 종료되었습니다. 최종 결과는 로그를 확인하세요.';
    startBtn.classList.add('hidden');
  } else {
    panel.classList.add('hidden');
  }
}

function renderActionBar(state) {
  const bar = document.getElementById('action-bar');
  const me = state.players.find((p) => p.id === myId);
  if (state.state !== 'playing' || !me || me.folded) {
    bar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');

  const myCardsEl = document.getElementById('my-cards');
  myCardsEl.innerHTML = '';
  (me.cards || []).forEach((c) => myCardsEl.appendChild(cardFaceEl(c, 'card-full')));

  const isMyTurn = state.turnPlayerId === myId;
  const bingBtn = document.getElementById('act-bing');
  const callBtn = document.getElementById('act-call');
  const raiseBtn = document.getElementById('act-raise');
  const allinBtn = document.getElementById('act-allin');
  const foldBtn = document.getElementById('act-fold');
  const raiseInput = document.getElementById('raise-amount');

  [bingBtn, callBtn, raiseBtn, allinBtn, foldBtn].forEach((b) => (b.disabled = !isMyTurn || me.allIn));
  raiseInput.disabled = !isMyTurn || me.allIn;

  bingBtn.classList.toggle('hidden', state.currentBet !== 0);
  callBtn.classList.toggle('hidden', state.currentBet === 0);
  callBtn.textContent = state.currentBet > 0 ? `콜 (${(state.currentBet - me.contributed).toLocaleString()})` : '콜';

  const minRaise = state.currentBet > 0 ? state.currentBet * 2 : state.ante;
  raiseInput.min = minRaise;
  if (isMyTurn && !raiseInput.dataset.userEdited) raiseInput.value = minRaise;
}

document.getElementById('raise-amount').addEventListener('input', (e) => {
  e.target.dataset.userEdited = '1';
});

document.getElementById('act-fold').addEventListener('click', () => sendAction('fold'));
document.getElementById('act-bing').addEventListener('click', () => sendAction('bing'));
document.getElementById('act-call').addEventListener('click', () => sendAction('call'));
document.getElementById('act-allin').addEventListener('click', () => sendAction('allin'));
document.getElementById('act-raise').addEventListener('click', () => {
  const amount = Number(document.getElementById('raise-amount').value);
  sendAction('raise', amount);
});

function sendAction(action, amount) {
  document.getElementById('raise-amount').dataset.userEdited = '';
  socket.emit('player_action', { action, amount }, (res) => {
    if (res && res.error) appendLog(`⚠️ ${res.error}`);
  });
}

function renderTimer(state) {
  if (timerInterval) clearInterval(timerInterval);
  if (state.state !== 'playing' || !state.turnDeadline) return;

  const TURN_MS = 25000;
  const tick = () => {
    const remain = Math.max(0, state.turnDeadline - Date.now());
    const pct = Math.min(100, (remain / TURN_MS) * 100);
    const fill = document.getElementById('timer-fill');
    if (fill) fill.style.width = `${pct}%`;
    const ring = document.getElementById(`ring-${state.turnPlayerId}`);
    if (ring) ring.textContent = Math.ceil(remain / 1000);
    if (remain <= 0) clearInterval(timerInterval);
  };
  tick();
  timerInterval = setInterval(tick, 200);
}
