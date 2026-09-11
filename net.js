'use strict';

// ============ 온라인 대전 (Claude 아티팩트 db 기능 사용) ============
// game.js가 정의하는 전역 G, render(), log(), newGame(), GEMS 등을 그대로 사용한다.

const NET = {
  db: null,
  available: false, // db 기능을 사용할 수 있는 환경인지
  checked: false,
  mode: 'local', // 'local' | 'online'
  role: null, // 'host' | 'guest'
  roomCode: null,
  clientId: null,
  seat: null, // 0 또는 1
  appliedVersion: -1,
  unsub: null,
  gameStarted: false,
  status: 'idle', // idle | creating | joining | waiting | starting | active | error
  errorMsg: '',
};
// game.js는 window.NET으로 존재 여부를 확인하므로 전역 객체에 명시적으로 노출한다.
// (top-level const는 window의 프로퍼티가 되지 않는다.)
window.NET = NET;

const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 혼동되는 0/O/1/I/L 제외

function netGetClientId() {
  try {
    let id = localStorage.getItem('splendorLiteClientId');
    if (!id) {
      id = 'c-' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('splendorLiteClientId', id);
    }
    return id;
  } catch (e) {
    return 'c-' + Math.random().toString(36).slice(2, 10);
  }
}

function netGenRoomCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  return s;
}

async function netInit() {
  NET.clientId = netGetClientId();
  if (typeof window.claude === 'undefined' || typeof window.claude.use !== 'function') {
    NET.available = false;
    NET.checked = true;
    renderNetPanel();
    return;
  }
  try {
    const db = await window.claude.use('db');
    NET.db = db;
    NET.available = !!db;
  } catch (e) {
    NET.available = false;
  }
  NET.checked = true;
  renderNetPanel();
}

// ============ 상태 직렬화 ============
function netSerializeState() {
  return {
    bank: G.bank,
    tiers: G.tiers.map((t) => ({ deck: t.deck, faceUp: t.faceUp })),
    nobles: G.nobles,
    players: G.players,
    currentIndex: G.currentIndex,
    logs: G.logs.slice(0, 20),
    gameOver: G.gameOver,
    winnerText: G.winnerText,
  };
}

function netApplyRemoteState(state) {
  G = {
    bank: state.bank,
    tiers: state.tiers,
    nobles: state.nobles,
    players: state.players,
    currentIndex: state.currentIndex,
    pending: [],
    discardState: null,
    nobleChoice: null,
    logs: state.logs || [],
    gameOver: !!state.gameOver,
    winnerText: state.winnerText || '',
  };
  render();
}

async function netWriteRoom(fields) {
  if (!NET.db || !NET.roomCode) return;
  try {
    await NET.db.doc('matches/' + NET.roomCode).update(fields);
  } catch (e) {
    console.error('[온라인 대전] 방 갱신 실패', e);
  }
}

NET.commit = async function commit() {
  if (NET.mode !== 'online' || !NET.db || !NET.roomCode) return;
  const nextVersion = NET.appliedVersion + 1;
  NET.appliedVersion = nextVersion;
  await netWriteRoom({
    status: 'active',
    state: netSerializeState(),
    version: nextVersion,
    updatedAt: Date.now(),
  });
};

NET.requestNewGame = function requestNewGame() {
  if (NET.role !== 'host') {
    log('방장만 새 게임을 시작할 수 있습니다.');
    render();
    return;
  }
  newGame();
  NET.appliedVersion = -1;
  NET.commit();
};

// ============ 방 생성 / 참가 ============
async function netCreateRoom() {
  if (!NET.available || NET.status === 'creating') return;
  NET.status = 'creating';
  renderNetPanel();
  try {
    const code = netGenRoomCode();
    const ref = NET.db.doc('matches/' + code);
    const snap = await ref.get();
    if (snap.exists) {
      NET.status = 'idle';
      return netCreateRoom(); // 코드 충돌 시 재시도
    }
    await ref.set({
      status: 'waiting',
      hostId: NET.clientId,
      guestId: null,
      version: -1,
      state: null,
      updatedAt: Date.now(),
    });
    NET.mode = 'online';
    NET.role = 'host';
    NET.roomCode = code;
    NET.seat = 0;
    NET.appliedVersion = -1;
    NET.gameStarted = false;
    NET.status = 'waiting';
    netSubscribeRoom(code);
  } catch (e) {
    console.error(e);
    NET.status = 'error';
    NET.errorMsg = '방 생성에 실패했습니다. 다시 시도해 주세요.';
  }
  renderNetPanel();
}

async function netJoinRoom(rawCode) {
  const code = (rawCode || '').trim().toUpperCase();
  if (!NET.available || !code || NET.status === 'joining') return;
  NET.status = 'joining';
  renderNetPanel();
  try {
    const ref = NET.db.doc('matches/' + code);
    const snap = await ref.get();
    if (!snap.exists) {
      NET.status = 'error';
      NET.errorMsg = '존재하지 않는 방 코드입니다.';
      renderNetPanel();
      return;
    }
    const data = snap.data();
    if (data.hostId === NET.clientId) {
      NET.status = 'error';
      NET.errorMsg = '자신이 만든 방에는 참가할 수 없습니다.';
      renderNetPanel();
      return;
    }
    if (data.guestId && data.guestId !== NET.clientId) {
      NET.status = 'error';
      NET.errorMsg = '이미 다른 상대가 참가한 방입니다.';
      renderNetPanel();
      return;
    }
    await ref.update({ guestId: NET.clientId });
    NET.mode = 'online';
    NET.role = 'guest';
    NET.roomCode = code;
    NET.seat = 1;
    NET.appliedVersion = -1;
    NET.gameStarted = false;
    NET.status = 'starting';
    netSubscribeRoom(code);
  } catch (e) {
    console.error(e);
    NET.status = 'error';
    NET.errorMsg = '참가에 실패했습니다. 코드를 확인해 주세요.';
  }
  renderNetPanel();
}

function netSubscribeRoom(code) {
  if (NET.unsub) {
    NET.unsub();
    NET.unsub = null;
  }
  const ref = NET.db.doc('matches/' + code);
  NET.unsub = ref.onSnapshot(
    (snap) => {
      if (!snap.exists) {
        NET.status = 'error';
        NET.errorMsg = '방이 사라졌습니다.';
        renderNetPanel();
        return;
      }
      const data = snap.data();

      if (data.status === 'left' && data.leftBy && data.leftBy !== NET.clientId) {
        NET.status = 'error';
        NET.errorMsg = '상대방이 방을 나갔습니다.';
        netTeardown();
        renderNetPanel();
        return;
      }

      if (NET.role === 'guest' && data.guestId && data.guestId !== NET.clientId) {
        NET.status = 'error';
        NET.errorMsg = '이미 다른 상대가 참가했습니다.';
        netTeardown();
        renderNetPanel();
        return;
      }

      if (NET.role === 'host' && data.status === 'waiting' && data.guestId && !NET.gameStarted) {
        NET.gameStarted = true;
        newGame();
        NET.appliedVersion = -1;
        NET.commit();
        return;
      }

      if (data.status === 'active' && data.state && typeof data.version === 'number') {
        NET.status = 'active';
        if (data.version !== NET.appliedVersion) {
          NET.appliedVersion = data.version;
          netApplyRemoteState(data.state);
        }
        renderNetPanel();
        return;
      }

      NET.status = data.guestId ? 'starting' : 'waiting';
      renderNetPanel();
    },
    (err) => {
      console.error('[온라인 대전] 구독 오류', err);
      NET.status = 'error';
      NET.errorMsg = '연결에 문제가 발생했습니다.';
      renderNetPanel();
    }
  );
}

function netTeardown() {
  if (NET.unsub) {
    NET.unsub();
    NET.unsub = null;
  }
  NET.role = null;
  NET.roomCode = null;
  NET.seat = null;
  NET.appliedVersion = -1;
  NET.gameStarted = false;
}

function netLeaveRoom() {
  if (NET.db && NET.roomCode) {
    if (NET.role === 'host' && NET.status === 'waiting') {
      // 아직 상대가 없는 빈 방은 정리한다.
      NET.db.doc('matches/' + NET.roomCode).delete().catch(() => {});
    } else if (NET.status === 'active' || NET.status === 'starting') {
      // 진행 중이던 상대에게 내가 나갔음을 알린다.
      netWriteRoom({ status: 'left', leftBy: NET.clientId }).catch(() => {});
    }
  }
  netTeardown();
  NET.status = 'idle';
  NET.errorMsg = '';
  renderNetPanel();
}

function netSwitchMode(mode) {
  if (mode === NET.mode) return;
  if (mode === 'local') {
    if (NET.mode === 'online') netLeaveRoom();
    NET.mode = 'local';
    if (!G) newGame();
    else render();
  } else {
    NET.mode = 'online';
    NET.status = 'idle';
    render();
  }
  renderNetPanel();
  updateModeTabs();
}

// ============ 렌더링 ============
function updateModeTabs() {
  const localBtn = document.getElementById('modeLocalBtn');
  const onlineBtn = document.getElementById('modeOnlineBtn');
  if (!localBtn || !onlineBtn) return;
  localBtn.classList.toggle('active', NET.mode === 'local');
  onlineBtn.classList.toggle('active', NET.mode === 'online');
  const gameArea = document.getElementById('gameArea');
  const netPanel = document.getElementById('netPanel');
  if (NET.mode === 'local') {
    gameArea.hidden = false;
    netPanel.hidden = true;
  } else {
    netPanel.hidden = false;
    gameArea.hidden = NET.status !== 'active';
  }
  updateNewGameButton();
}

function updateNewGameButton() {
  const btn = document.getElementById('newGameBtn');
  if (!btn) return;
  if (NET.mode === 'online') {
    btn.textContent = '재대결';
    btn.disabled = !(NET.status === 'active' && NET.role === 'host');
  } else {
    btn.textContent = '새 게임';
    btn.disabled = false;
  }
}

function renderNetPanel() {
  const el = document.getElementById('netPanel');
  if (!el) return;
  updateModeTabs();
  if (NET.mode !== 'online') {
    el.innerHTML = '';
    return;
  }

  if (!NET.checked) {
    el.innerHTML = `<div class="net-box">온라인 대전 기능을 확인하는 중...</div>`;
    return;
  }

  if (!NET.available) {
    el.innerHTML = `<div class="net-box net-warn">
      이 화면에서는 온라인 대전을 사용할 수 없습니다. claude.ai에 게시된 아티팩트 링크로 열어야 온라인 대전이 활성화됩니다.
      <br><button data-net-act="toLocal">로컬 플레이로 돌아가기</button>
    </div>`;
    return;
  }

  if (NET.status === 'idle') {
    el.innerHTML = `<div class="net-box">
      <div class="net-row">
        <button data-net-act="create">방 만들기</button>
        <span class="net-or">또는</span>
        <input id="joinCodeInput" maxlength="4" placeholder="방 코드 4자리" autocomplete="off">
        <button data-net-act="join">참가하기</button>
      </div>
    </div>`;
    return;
  }

  if (NET.status === 'creating' || NET.status === 'joining') {
    el.innerHTML = `<div class="net-box">${NET.status === 'creating' ? '방을 만드는 중...' : '참가하는 중...'}</div>`;
    return;
  }

  if (NET.status === 'error') {
    el.innerHTML = `<div class="net-box net-warn">
      ${NET.errorMsg}
      <br><button data-net-act="retry">다시 시도</button>
    </div>`;
    return;
  }

  if (NET.status === 'waiting') {
    el.innerHTML = `<div class="net-box">
      <div class="room-code-label">방 코드</div>
      <div class="room-code">${NET.roomCode}</div>
      <div class="net-sub">이 코드를 상대방에게 알려주세요. 상대방을 기다리는 중...</div>
      <button data-net-act="leave">방 나가기</button>
    </div>`;
    return;
  }

  if (NET.status === 'starting') {
    el.innerHTML = `<div class="net-box">방 코드 <strong>${NET.roomCode}</strong> · 게임을 시작하는 중...</div>`;
    return;
  }

  if (NET.status === 'active') {
    const roleLabel = NET.role === 'host' ? '호스트' : '게스트';
    el.innerHTML = `<div class="net-strip">
      온라인 대전 · 방 코드 <strong>${NET.roomCode}</strong> · 나: 플레이어 ${NET.seat + 1} (${roleLabel})
      <button class="net-leave" data-net-act="leave">나가기</button>
    </div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modeLocalBtn').addEventListener('click', () => netSwitchMode('local'));
  document.getElementById('modeOnlineBtn').addEventListener('click', () => netSwitchMode('online'));

  document.getElementById('netPanel').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-net-act]');
    if (!btn) return;
    const act = btn.dataset.netAct;
    if (act === 'create') netCreateRoom();
    if (act === 'join') {
      const input = document.getElementById('joinCodeInput');
      netJoinRoom(input ? input.value : '');
    }
    if (act === 'leave') netLeaveRoom();
    if (act === 'retry') {
      NET.status = 'idle';
      NET.errorMsg = '';
      renderNetPanel();
    }
    if (act === 'toLocal') netSwitchMode('local');
  });

  document.getElementById('netPanel').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target && e.target.id === 'joinCodeInput') {
      netJoinRoom(e.target.value);
    }
  });

  updateModeTabs();
  netInit();
});
