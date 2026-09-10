'use strict';

const { createDeck, shuffle, evaluateHand } = require('./hand');

const TURN_SECONDS = 25;
const MAX_PLAYERS = 5;
const MIN_PLAYERS = 2;

function genRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

class Room {
  constructor(io, code, options = {}) {
    this.io = io;
    this.code = code;
    this.maxPlayers = Math.min(options.maxPlayers || MAX_PLAYERS, MAX_PLAYERS);
    this.ante = options.ante || 1000;
    this.startingChips = options.startingChips || 100000;
    this.players = []; // {id, nickname, chips, seat, connected, folded, allIn, cards, hand, contributed, isHost}
    this.state = 'lobby'; // lobby | playing | showdown | ended
    this.dealerSeat = -1;
    this.round = 0;
    this.pot = 0;
    this.currentBet = 0;
    this.deck = [];
    this.turnPlayerId = null;
    this.toAct = new Set();
    this.log = [];
    this.turnTimer = null;
    this.turnDeadline = null;
    this.lastRaiserId = null;
  }

  get playerCount() {
    return this.players.length;
  }

  pushLog(text) {
    this.log.push({ text, ts: Date.now() });
    if (this.log.length > 200) this.log.shift();
    this.io.to(this.code).emit('log', { text });
  }

  publicPlayers(forId) {
    return this.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      chips: p.chips,
      seat: p.seat,
      connected: p.connected,
      folded: p.folded,
      allIn: p.allIn,
      contributed: p.contributed,
      isHost: p.isHost,
      cardCount: p.cards.length,
      cards: (this.state === 'showdown' || p.id === forId) ? p.cards : undefined,
      handResult: this.state === 'showdown' ? p.handResult : undefined,
    }));
  }

  broadcastState() {
    for (const p of this.players) {
      if (!p.socketId) continue;
      this.io.to(p.socketId).emit('room_state', this.stateFor(p.id));
    }
    // also emit a generic snapshot to the room channel for anyone without a seat yet (shouldn't happen)
  }

  stateFor(playerId) {
    return {
      code: this.code,
      state: this.state,
      ante: this.ante,
      pot: this.pot,
      currentBet: this.currentBet,
      dealerSeat: this.dealerSeat,
      round: this.round,
      turnPlayerId: this.turnPlayerId,
      turnDeadline: this.turnDeadline,
      players: this.publicPlayers(playerId),
      youId: playerId,
      maxPlayers: this.maxPlayers,
    };
  }

  addPlayer(socket, nickname) {
    if (this.players.length >= this.maxPlayers) {
      return { error: '방이 가득 찼습니다. (최대 5인)' };
    }
    if (this.state === 'playing') {
      return { error: '이미 게임이 진행 중입니다. 라운드가 끝난 후 참가할 수 있어요.' };
    }
    const usedSeats = new Set(this.players.map((p) => p.seat));
    let seat = 0;
    while (usedSeats.has(seat)) seat++;

    const player = {
      id: socket.id,
      socketId: socket.id,
      nickname: nickname && nickname.trim() ? nickname.trim().slice(0, 12) : `Guest${Math.floor(Math.random() * 1000)}`,
      chips: this.startingChips,
      seat,
      connected: true,
      folded: false,
      allIn: false,
      cards: [],
      hand: null,
      handResult: null,
      contributed: 0,
      isHost: this.players.length === 0,
    };
    this.players.push(player);
    socket.join(this.code);
    this.pushLog(`${player.nickname} 님이 입장했습니다. (${this.players.length}/${this.maxPlayers})`);
    this.broadcastState();
    return { player };
  }

  removePlayer(socketId) {
    const idx = this.players.findIndex((p) => p.id === socketId);
    if (idx === -1) return;
    const player = this.players[idx];

    if (this.state === 'playing' && !player.folded) {
      player.folded = true;
      this.toAct.delete(player.id);
      this.pushLog(`${player.nickname} 님이 연결이 끊겨 다이(fold) 처리되었습니다.`);
      if (this.turnPlayerId === player.id) {
        this.clearTurnTimer();
        this.advanceTurn();
      } else {
        this.checkRoundEnd();
      }
    }

    this.players.splice(idx, 1);
    if (player.isHost && this.players.length > 0) {
      this.players[0].isHost = true;
    }
    if (this.players.length === 0) {
      this.clearTurnTimer();
      return true; // room now empty, caller should delete it
    }
    this.pushLog(`${player.nickname} 님이 퇴장했습니다.`);
    this.broadcastState();
    return false;
  }

  markDisconnected(socketId) {
    const player = this.players.find((p) => p.id === socketId);
    if (!player) return false;
    player.connected = false;
    return this.removePlayer(socketId);
  }

  canStart() {
    return this.state !== 'playing' && this.players.filter((p) => p.chips >= this.ante).length >= MIN_PLAYERS;
  }

  startGame(requesterId) {
    const requester = this.players.find((p) => p.id === requesterId);
    if (!requester || !requester.isHost) return { error: '방장만 게임을 시작할 수 있습니다.' };
    if (!this.canStart()) return { error: `최소 ${MIN_PLAYERS}명 이상, 판돈을 낼 수 있는 참가자가 필요합니다.` };
    this.startRound();
    return { ok: true };
  }

  eligiblePlayers() {
    return this.players.filter((p) => p.chips >= this.ante || p.chips > 0);
  }

  startRound() {
    const eligible = this.players.filter((p) => p.chips > 0);
    if (eligible.length < MIN_PLAYERS) {
      this.state = 'ended';
      const winner = eligible[0];
      this.pushLog(winner ? `${winner.nickname} 님이 최종 우승했습니다! 🎉` : '게임이 종료되었습니다.');
      this.broadcastState();
      return;
    }

    this.round += 1;
    this.state = 'playing';
    this.pot = 0;
    this.currentBet = 0;
    this.deck = shuffle(createDeck());
    this.log = [];

    // rotate dealer to next seat among players with chips
    const seats = eligible.map((p) => p.seat).sort((a, b) => a - b);
    let nextDealerSeat = seats.find((s) => s > this.dealerSeat);
    if (nextDealerSeat === undefined) nextDealerSeat = seats[0];
    this.dealerSeat = nextDealerSeat;

    for (const p of this.players) {
      p.folded = p.chips <= 0; // no chips => sits out this round
      p.allIn = false;
      p.cards = [];
      p.hand = null;
      p.handResult = null;
      p.contributed = 0;
    }

    // ante
    for (const p of this.players) {
      if (p.folded) continue;
      const ante = Math.min(this.ante, p.chips);
      p.chips -= ante;
      this.pot += ante;
      if (p.chips === 0) p.allIn = true;
    }
    this.pushLog(`--- ${this.round}라운드 시작 (참가비 ${this.ante.toLocaleString()}) ---`);

    // deal 2 cards each
    for (const p of this.players) {
      if (p.folded) continue;
      p.cards = [this.deck.pop(), this.deck.pop()];
    }

    this.pushLog('카드가 배분되었습니다. 베팅을 시작하세요.');

    this.beginBettingRound();
    this.broadcastState();
  }

  activeSeatsOrder() {
    return this.players
      .filter((p) => !p.folded)
      .sort((a, b) => a.seat - b.seat);
  }

  beginBettingRound() {
    const active = this.activeSeatsOrder();
    this.toAct = new Set(active.filter((p) => !p.allIn).map((p) => p.id));
    // first to act = first active seat after dealer
    const order = this.turnOrderFromDealer();
    const first = order.find((p) => !p.folded && !p.allIn);
    if (!first) {
      this.resolveShowdown();
      return;
    }
    this.setTurn(first.id);
  }

  turnOrderFromDealer() {
    const all = this.players.slice().sort((a, b) => a.seat - b.seat);
    const dealerIdx = all.findIndex((p) => p.seat === this.dealerSeat);
    const ordered = [];
    for (let i = 1; i <= all.length; i++) {
      ordered.push(all[(dealerIdx + i) % all.length]);
    }
    return ordered;
  }

  setTurn(playerId) {
    this.clearTurnTimer();
    this.turnPlayerId = playerId;
    this.turnDeadline = Date.now() + TURN_SECONDS * 1000;
    this.turnTimer = setTimeout(() => this.handleTimeout(playerId), TURN_SECONDS * 1000 + 500);
    this.broadcastState();
  }

  clearTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  handleTimeout(playerId) {
    if (this.turnPlayerId !== playerId || this.state !== 'playing') return;
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return;
    this.pushLog(`${player.nickname} 님이 시간 초과로 다이(fold) 처리되었습니다.`);
    this.applyFold(player);
    this.afterAction();
  }

  activeNonFoldedCount() {
    return this.players.filter((p) => !p.folded).length;
  }

  applyFold(player) {
    player.folded = true;
    this.toAct.delete(player.id);
  }

  handleAction(playerId, action, amount) {
    if (this.state !== 'playing') return { error: '게임이 진행 중이 아닙니다.' };
    if (this.turnPlayerId !== playerId) return { error: '당신의 차례가 아닙니다.' };
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.folded || player.allIn) return { error: '행동할 수 없는 상태입니다.' };

    this.clearTurnTimer();

    switch (action) {
      case 'fold': {
        this.applyFold(player);
        this.pushLog(`${player.nickname} 님이 다이(fold)를 선택했습니다.`);
        break;
      }
      case 'bing': {
        if (this.currentBet !== 0) return this.revive(player, '지금은 삥을 할 수 없습니다.');
        const betAmt = Math.min(this.ante, player.chips);
        this.currentBet = betAmt;
        this.commitBet(player, betAmt);
        this.pushLog(`${player.nickname} 님이 삥(${betAmt.toLocaleString()}) 베팅했습니다.`);
        this.reopenAction(player.id);
        break;
      }
      case 'call': {
        if (this.currentBet === 0) return this.revive(player, '콜할 베팅이 없습니다. 삥으로 시작하세요.');
        const needed = this.currentBet - player.contributed;
        const payAmt = Math.min(needed, player.chips);
        this.commitBet(player, payAmt);
        this.toAct.delete(player.id);
        this.pushLog(`${player.nickname} 님이 콜(${this.currentBet.toLocaleString()}) 했습니다.`);
        break;
      }
      case 'raise': {
        const target = Number(amount);
        const minRaise = this.currentBet > 0 ? this.currentBet * 2 : this.ante;
        if (!Number.isFinite(target) || target < minRaise) {
          return this.revive(player, `최소 ${minRaise.toLocaleString()} 이상으로 레이즈(따당)해야 합니다.`);
        }
        const needed = target - player.contributed;
        if (needed > player.chips) return this.revive(player, '보유 칩보다 많이 베팅할 수 없습니다. 올인을 이용하세요.');
        this.currentBet = target;
        this.commitBet(player, needed);
        this.pushLog(`${player.nickname} 님이 ${target.toLocaleString()}(으)로 레이즈(따당) 했습니다.`);
        this.reopenAction(player.id);
        break;
      }
      case 'allin': {
        const total = player.contributed + player.chips;
        const payAmt = player.chips;
        this.commitBet(player, payAmt);
        this.pushLog(`${player.nickname} 님이 올인(${total.toLocaleString()}) 했습니다!`);
        if (total > this.currentBet) {
          this.currentBet = total;
          this.reopenAction(player.id, true);
        } else {
          this.toAct.delete(player.id);
        }
        break;
      }
      default:
        return this.revive(player, '알 수 없는 행동입니다.');
    }

    this.afterAction();
    return { ok: true };
  }

  revive(player, errorMsg) {
    // re-arm the timer since the action was rejected
    this.setTurn(player.id);
    return { error: errorMsg };
  }

  commitBet(player, amount) {
    player.chips -= amount;
    player.contributed += amount;
    this.pot += amount;
    if (player.chips <= 0) {
      player.chips = 0;
      player.allIn = true;
      this.toAct.delete(player.id);
    }
  }

  reopenAction(exceptPlayerId, includeAllInRaiser) {
    this.toAct = new Set(
      this.players
        .filter((p) => !p.folded && !p.allIn && p.id !== exceptPlayerId)
        .map((p) => p.id)
    );
  }

  afterAction() {
    if (this.activeNonFoldedCount() <= 1) {
      this.resolveShowdown();
      return;
    }
    if (this.checkRoundEnd()) return;
    this.advanceTurn();
  }

  checkRoundEnd() {
    if (this.activeNonFoldedCount() <= 1 || this.toAct.size === 0) {
      this.resolveShowdown();
      return true;
    }
    return false;
  }

  advanceTurn() {
    if (this.toAct.size === 0) {
      this.resolveShowdown();
      return;
    }
    const order = this.turnOrderFromDealer();
    const startIdx = order.findIndex((p) => p.id === this.turnPlayerId);
    for (let i = 1; i <= order.length; i++) {
      const candidate = order[(startIdx + i) % order.length];
      if (this.toAct.has(candidate.id)) {
        this.setTurn(candidate.id);
        return;
      }
    }
    this.resolveShowdown();
  }

  resolveShowdown() {
    this.clearTurnTimer();
    this.state = 'showdown';
    this.turnPlayerId = null;
    this.turnDeadline = null;

    const contenders = this.players.filter((p) => !p.folded);
    for (const p of contenders) {
      p.hand = evaluateHand(p.cards);
      p.handResult = p.hand;
    }

    let winners = [];
    if (contenders.length === 1) {
      winners = contenders;
      this.pushLog(`${winners[0].nickname} 님이 혼자 남아 ${this.pot.toLocaleString()} 획득!`);
    } else {
      const maxScore = Math.max(...contenders.map((p) => p.hand.score));
      winners = contenders.filter((p) => p.hand.score === maxScore);
      const names = winners.map((w) => `${w.nickname}(${w.hand.name})`).join(', ');
      this.pushLog(`쇼다운! 승자: ${names} - 팟 ${this.pot.toLocaleString()} 획득`);
    }

    const share = Math.floor(this.pot / winners.length);
    let remainder = this.pot - share * winners.length;
    winners.sort((a, b) => a.seat - b.seat);
    for (const w of winners) {
      let amt = share;
      if (remainder > 0) {
        amt += 1;
        remainder -= 1;
      }
      w.chips += amt;
    }
    this.pot = 0;
    this.broadcastState();

    setTimeout(() => {
      if (this.players.length === 0) return;
      this.state = 'lobby';
      const stillIn = this.players.filter((p) => p.chips > 0);
      if (stillIn.length < MIN_PLAYERS) {
        this.state = 'ended';
        const winner = stillIn[0];
        this.pushLog(winner ? `🏆 ${winner.nickname} 님이 최종 우승했습니다!` : '게임 종료.');
        this.broadcastState();
        return;
      }
      this.pushLog('다음 라운드를 위해 방장이 "게임 시작"을 눌러주세요.');
      this.broadcastState();
    }, 8000);
  }
}

module.exports = { Room, genRoomCode, MAX_PLAYERS, MIN_PLAYERS };
