// 게임 엔진 - 턴, 마나, 전투, 카드 효과 등 핵심 규칙을 담당합니다.
import { getCardDef, buildDeck, getClassDef, randomClassId } from './cards.js';

const MAX_BOARD_SIZE = 7;
const MAX_HAND_SIZE = 10;
const STARTING_HEALTH = 25;
const OVERTIME_START_TURN = 10; // 이 턴(라운드)을 넘기면 매 라운드 양쪽 영웅에게 누적 피해가 들어갑니다.

export class Game {
  constructor(player1Name = '플레이어', player2Name = 'AI', player1ClassId, player2ClassId) {
    this.nextId = 1;
    this.players = [
      this.createPlayer(0, player1Name, player1ClassId || randomClassId()),
      this.createPlayer(1, player2Name, player2ClassId || randomClassId()),
    ];
    this.currentPlayer = 0;
    this.turnNumber = 0;
    this.overtimeStacks = 0;
    this.gameOver = false;
    this.winner = null;
    this.log = [];
    this.eventSeq = 0;
    this.lastCast = null; // { seq, kind: 'spell'|'heropower', cardId?, classId?, playerIdx } - UI가 주문/영웅 능력 사용을 알아채기 위한 정보
  }

  createPlayer(idx, name, classId) {
    return {
      idx,
      name,
      classId,
      hero: { health: STARTING_HEALTH, maxHealth: STARTING_HEALTH },
      heroPowerUsed: false,
      mana: { current: 0, max: 0 },
      deck: buildDeck(classId),
      hand: [],
      board: [],
      fatigue: 0,
    };
  }

  getHeroPower(playerIdx) {
    return getClassDef(this.players[playerIdx].classId).heroPower;
  }

  logEvent(msg) {
    this.log.push(msg);
    if (this.log.length > 50) this.log.shift();
  }

  start() {
    this.drawCard(0);
    this.drawCard(0);
    this.drawCard(0);
    this.drawCard(1);
    this.drawCard(1);
    this.drawCard(1);
    this.drawCard(1);
    this.startTurn(0);
  }

  startTurn(idx) {
    const player = this.players[idx];
    if (idx === 0) {
      this.turnNumber++;
      if (this.turnNumber > OVERTIME_START_TURN) {
        this.overtimeStacks++;
        this.logEvent(`⚡ 연장전! 폭풍이 몰아쳐 양쪽 영웅이 ${this.overtimeStacks}의 피해를 입습니다.`);
        this.damageCharacter({ kind: 'hero', playerIdx: 0 }, this.overtimeStacks);
        this.damageCharacter({ kind: 'hero', playerIdx: 1 }, this.overtimeStacks);
        this.checkGameOver();
      }
    }
    player.mana.max = Math.min(10, player.mana.max + 1);
    player.mana.current = player.mana.max;
    player.heroPowerUsed = false;
    for (const minion of player.board) {
      minion.summoningSick = false;
      minion.canAttack = !minion.frozen;
      minion.frozen = false;
    }
    this.currentPlayer = idx;
    this.drawCard(idx);
    this.logEvent(`${player.name}의 턴 ${this.turnNumber} 시작 (마나 ${player.mana.current}/${player.mana.max})`);
  }

  endTurn() {
    if (this.gameOver) return;
    const next = 1 - this.currentPlayer;
    this.startTurn(next);
  }

  drawCard(idx) {
    const player = this.players[idx];
    if (player.deck.length === 0) {
      player.fatigue++;
      this.logEvent(`${player.name}의 덱이 비어 피로 피해 ${player.fatigue}를 받습니다.`);
      this.damageCharacter({ kind: 'hero', playerIdx: idx }, player.fatigue);
      return;
    }
    const cardId = player.deck.pop();
    if (player.hand.length >= MAX_HAND_SIZE) {
      this.logEvent(`${player.name}의 손패가 가득 차 카드가 파괴되었습니다.`);
      return;
    }
    player.hand.push({ instanceId: this.nextId++, cardId });
  }

  // ---- 조회 헬퍼 ----

  findMinion(playerIdx, minionId) {
    return this.players[playerIdx].board.find(m => m.id === minionId);
  }

  getCharacter(ref) {
    if (!ref) return null;
    if (ref.kind === 'hero') return this.players[ref.playerIdx].hero;
    return this.findMinion(ref.playerIdx, ref.id);
  }

  canPlayCard(playerIdx, handIndex) {
    const player = this.players[playerIdx];
    const entry = player.hand[handIndex];
    if (!entry) return false;
    const def = getCardDef(entry.cardId);
    if (player.mana.current < def.cost) return false;
    if (def.type === 'minion' && player.board.length >= MAX_BOARD_SIZE) return false;
    return true;
  }

  // 카드 효과 대상으로 고를 수 있는 목록
  getValidTargets(playerIdx, def) {
    if (!def.requiresTarget) return [];
    const me = this.players[playerIdx];
    const opp = this.players[1 - playerIdx];
    const oppVisible = opp.board.filter(m => !m.stealth);
    const enemyHeroReachable = oppVisible.length === 0;
    const targets = [];
    if (def.targetType === 'any') {
      targets.push({ kind: 'hero', playerIdx });
      if (enemyHeroReachable) targets.push({ kind: 'hero', playerIdx: 1 - playerIdx });
      for (const m of me.board) targets.push({ kind: 'minion', playerIdx, id: m.id });
      for (const m of oppVisible) targets.push({ kind: 'minion', playerIdx: 1 - playerIdx, id: m.id });
    } else if (def.targetType === 'friendly_minion') {
      for (const m of me.board) targets.push({ kind: 'minion', playerIdx, id: m.id });
    } else if (def.targetType === 'enemy') {
      if (enemyHeroReachable) targets.push({ kind: 'hero', playerIdx: 1 - playerIdx });
      for (const m of oppVisible) targets.push({ kind: 'minion', playerIdx: 1 - playerIdx, id: m.id });
    } else if (def.targetType === 'enemy_minion') {
      for (const m of oppVisible) targets.push({ kind: 'minion', playerIdx: 1 - playerIdx, id: m.id });
    } else if (def.targetType === 'any_minion') {
      for (const m of me.board) targets.push({ kind: 'minion', playerIdx, id: m.id });
      for (const m of oppVisible) targets.push({ kind: 'minion', playerIdx: 1 - playerIdx, id: m.id });
    }
    return targets;
  }

  // ---- 카드 실행 ----

  playCard(playerIdx, handIndex, target = null) {
    if (this.gameOver) return { ok: false, reason: '게임이 종료되었습니다.' };
    const player = this.players[playerIdx];
    const entry = player.hand[handIndex];
    if (!entry) return { ok: false, reason: '해당 카드가 손패에 없습니다.' };
    const def = getCardDef(entry.cardId);

    if (player.mana.current < def.cost) return { ok: false, reason: '마나가 부족합니다.' };
    if (def.type === 'minion' && player.board.length >= MAX_BOARD_SIZE) {
      return { ok: false, reason: '전장이 가득 찼습니다.' };
    }
    if (def.requiresTarget && !def.optionalTarget && !target) {
      return { ok: false, reason: '대상을 선택해야 합니다.' };
    }

    player.mana.current -= def.cost;
    player.hand.splice(handIndex, 1);

    if (def.type === 'minion') {
      const minion = {
        id: this.nextId++,
        cardId: def.id,
        attack: def.attack,
        health: def.health,
        maxHealth: def.health,
        taunt: !!(def.keywords && def.keywords.taunt),
        divineShield: !!(def.keywords && def.keywords.divineShield),
        charge: !!(def.keywords && def.keywords.charge),
        stealth: !!(def.keywords && def.keywords.stealth),
        trample: !!(def.keywords && def.keywords.trample),
        frozen: false,
        silenced: false,
        summoningSick: !(def.keywords && def.keywords.charge),
        canAttack: !!(def.keywords && def.keywords.charge),
      };
      player.board.push(minion);
      this.logEvent(`${player.name}이(가) ${def.name}을(를) 소환했습니다.`);
      if (def.battlecry) def.battlecry(this, playerIdx, target);
    } else {
      this.logEvent(`${player.name}이(가) ${def.name}을(를) 사용했습니다.${def.text ? ` (${def.text})` : ''}`);
      this.lastCast = { seq: ++this.eventSeq, kind: 'spell', cardId: def.id, playerIdx };
      if (def.spellEffect) def.spellEffect(this, playerIdx, target);
    }

    this.checkDeaths();
    this.checkGameOver();
    return { ok: true };
  }

  useHeroPower(playerIdx, target = null) {
    if (this.gameOver) return { ok: false, reason: '게임이 종료되었습니다.' };
    const player = this.players[playerIdx];
    const heroPower = this.getHeroPower(playerIdx);
    if (player.heroPowerUsed) return { ok: false, reason: '이미 사용한 영웅 능력입니다.' };
    if (player.mana.current < heroPower.cost) return { ok: false, reason: '마나가 부족합니다.' };
    if (heroPower.requiresTarget && !target) return { ok: false, reason: '대상을 선택해야 합니다.' };

    player.mana.current -= heroPower.cost;
    player.heroPowerUsed = true;
    this.logEvent(`${player.name}이(가) 영웅 능력 [${heroPower.name}]을(를) 사용했습니다. (${heroPower.text})`);
    this.lastCast = { seq: ++this.eventSeq, kind: 'heropower', classId: player.classId, playerIdx };
    heroPower.effect(this, playerIdx, target);

    this.checkDeaths();
    this.checkGameOver();
    return { ok: true };
  }

  getValidAttackTargets(playerIdx) {
    const opp = this.players[1 - playerIdx];
    const visible = opp.board.filter(m => !m.stealth);
    const taunts = visible.filter(m => m.taunt);
    const pool = taunts.length > 0 ? taunts : visible;
    const targets = pool.map(m => ({ kind: 'minion', playerIdx: 1 - playerIdx, id: m.id }));
    if (visible.length === 0) targets.push({ kind: 'hero', playerIdx: 1 - playerIdx });
    return targets;
  }

  canMinionAttack(playerIdx, minionId) {
    const minion = this.findMinion(playerIdx, minionId);
    return !!(minion && minion.canAttack && !minion.summoningSick);
  }

  attack(playerIdx, attackerId, targetRef) {
    if (this.gameOver) return { ok: false, reason: '게임이 종료되었습니다.' };
    const attacker = this.findMinion(playerIdx, attackerId);
    if (!attacker) return { ok: false, reason: '공격자를 찾을 수 없습니다.' };
    if (!attacker.canAttack || attacker.summoningSick) return { ok: false, reason: '이 미니언은 공격할 수 없습니다.' };

    const validTargets = this.getValidAttackTargets(playerIdx);
    const isValid = validTargets.some(t => t.kind === targetRef.kind &&
      t.playerIdx === targetRef.playerIdx && (t.kind === 'hero' || t.id === targetRef.id));
    if (!isValid) return { ok: false, reason: '적 미니언이 있으면 미니언부터 공격해야 합니다.' };

    attacker.canAttack = false;
    attacker.stealth = false;

    if (targetRef.kind === 'hero') {
      this.damageCharacter(targetRef, attacker.attack);
    } else {
      const defender = this.findMinion(targetRef.playerIdx, targetRef.id);
      const defenderHadShield = defender.divineShield;
      const defenderHealthBefore = defender.health;
      this.damageCharacter(targetRef, attacker.attack);
      this.damageCharacter({ kind: 'minion', playerIdx, id: attacker.id }, defender.attack);
      if (attacker.trample && !defenderHadShield && attacker.attack > defenderHealthBefore) {
        const excess = attacker.attack - defenderHealthBefore;
        this.damageCharacter({ kind: 'hero', playerIdx: targetRef.playerIdx }, excess);
        this.logEvent(`${getCardDef(attacker.cardId).name}의 돌파 피해가 영웅에게 ${excess} 들어갔습니다.`);
      }
    }

    this.checkDeaths();
    this.checkGameOver();
    return { ok: true };
  }

  // ---- 피해/치유/버프 헬퍼 (카드 효과에서 사용) ----

  damageCharacter(ref, amount) {
    if (!ref || amount <= 0) return;
    if (ref.kind === 'hero') {
      const hero = this.players[ref.playerIdx].hero;
      hero.health -= amount;
      return;
    }
    const minion = this.findMinion(ref.playerIdx, ref.id);
    if (!minion) return;
    if (minion.divineShield) {
      minion.divineShield = false;
      return;
    }
    minion.health -= amount;
  }

  healCharacter(ref, amount) {
    if (!ref) return;
    if (ref.kind === 'hero') {
      const hero = this.players[ref.playerIdx].hero;
      hero.health = Math.min(hero.maxHealth, hero.health + amount);
      return;
    }
    const minion = this.findMinion(ref.playerIdx, ref.id);
    if (!minion) return;
    minion.health = Math.min(minion.maxHealth, minion.health + amount);
  }

  buffMinion(ref, atk, hp) {
    if (!ref) return;
    const minion = this.findMinion(ref.playerIdx, ref.id);
    if (!minion) return;
    minion.attack += atk;
    minion.maxHealth += hp;
    minion.health += hp;
  }

  freezeCharacter(ref) {
    if (!ref || ref.kind !== 'minion') return;
    const minion = this.findMinion(ref.playerIdx, ref.id);
    if (!minion) return;
    minion.frozen = true;
    minion.canAttack = false;
  }

  silenceMinion(ref) {
    if (!ref || ref.kind !== 'minion') return;
    const minion = this.findMinion(ref.playerIdx, ref.id);
    if (!minion) return;
    minion.taunt = false;
    minion.divineShield = false;
    minion.charge = false;
    minion.stealth = false;
    minion.trample = false;
    minion.frozen = false;
    minion.silenced = true;
  }

  // 신성한 보호막 등 피해 방지 효과를 무시하고 미니언을 즉시 파괴합니다 (죽음의 메아리는 정상 발동).
  destroyMinion(ref) {
    if (!ref || ref.kind !== 'minion') return;
    const minion = this.findMinion(ref.playerIdx, ref.id);
    if (!minion) return;
    minion.health = -999;
  }

  summonToken(playerIdx, tokenCardId) {
    const player = this.players[playerIdx];
    if (player.board.length >= MAX_BOARD_SIZE) return;
    const def = getCardDef(tokenCardId);
    const minion = {
      id: this.nextId++,
      cardId: def.id,
      attack: def.attack,
      health: def.health,
      maxHealth: def.health,
      taunt: !!(def.keywords && def.keywords.taunt),
      divineShield: !!(def.keywords && def.keywords.divineShield),
      charge: !!(def.keywords && def.keywords.charge),
      stealth: !!(def.keywords && def.keywords.stealth),
      trample: !!(def.keywords && def.keywords.trample),
      frozen: false,
      silenced: false,
      summoningSick: !(def.keywords && def.keywords.charge),
      canAttack: !!(def.keywords && def.keywords.charge),
    };
    player.board.push(minion);
    this.logEvent(`${player.name}이(가) ${def.name}을(를) 소환했습니다.`);
  }

  damageAllMinions(amount) {
    for (const player of this.players) {
      for (const minion of player.board) {
        this.damageCharacter({ kind: 'minion', playerIdx: player.idx, id: minion.id }, amount);
      }
    }
  }

  damageEnemyBoard(playerIdx, amount) {
    const opp = this.players[1 - playerIdx];
    for (const minion of [...opp.board]) {
      this.damageCharacter({ kind: 'minion', playerIdx: 1 - playerIdx, id: minion.id }, amount);
    }
  }

  buffAllFriendly(playerIdx, atk, hp) {
    const player = this.players[playerIdx];
    for (const minion of player.board) {
      this.buffMinion({ kind: 'minion', playerIdx, id: minion.id }, atk, hp);
    }
  }

  returnToHand(ref) {
    if (!ref || ref.kind !== 'minion') return;
    const player = this.players[ref.playerIdx];
    const minion = this.findMinion(ref.playerIdx, ref.id);
    if (!minion) return;
    player.board = player.board.filter(m => m.id !== ref.id);
    if (player.hand.length < MAX_HAND_SIZE) {
      player.hand.push({ instanceId: this.nextId++, cardId: minion.cardId });
      this.logEvent(`${player.name}의 ${getCardDef(minion.cardId).name}이(가) 손으로 돌아갔습니다.`);
    } else {
      this.logEvent(`${player.name}의 손패가 가득 차 ${getCardDef(minion.cardId).name}이(가) 사라졌습니다.`);
    }
  }

  checkDeaths() {
    for (const player of this.players) {
      const dead = player.board.filter(m => m.health <= 0);
      if (dead.length === 0) continue;
      player.board = player.board.filter(m => m.health > 0);
      for (const minion of dead) {
        const def = getCardDef(minion.cardId);
        this.logEvent(`${def.name}이(가) 파괴되었습니다.`);
        if (def.deathrattle && !minion.silenced) def.deathrattle(this, player.idx, minion);
      }
    }
  }

  checkGameOver() {
    for (const player of this.players) {
      if (player.hero.health <= 0 && !this.gameOver) {
        this.gameOver = true;
        this.winner = 1 - player.idx;
        this.logEvent(`${this.players[this.winner].name} 승리!`);
      }
    }
  }
}
