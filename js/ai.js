// 매우 단순한 규칙 기반 AI - 상대 플레이어(플레이어 인덱스 1)를 조종합니다.
import { getCardDef } from './cards.js';
import { HERO_POWER } from './engine.js';

export function runAiTurn(game, idx = 1) {
  const player = game.players[idx];

  // 1. 마나가 허용하는 한 손패의 카드를 최대한 많이 사용합니다 (비싼 카드 우선).
  let playedSomething = true;
  while (playedSomething && !game.gameOver) {
    playedSomething = false;
    const order = player.hand
      .map((entry, i) => ({ i, def: getCardDef(entry.cardId) }))
      .filter(x => x.def.cost <= player.mana.current)
      .sort((a, b) => b.def.cost - a.def.cost);

    for (const { i, def } of order) {
      if (def.type === 'minion' && player.board.length >= 7) continue;
      const target = pickTargetForCard(game, idx, def);
      if (def.requiresTarget && !def.optionalTarget && !target) continue;
      const result = game.playCard(idx, i, target);
      if (result.ok) {
        playedSomething = true;
        break;
      }
    }
  }

  // 2. 영웅 능력 사용을 고려합니다.
  if (!game.gameOver && !player.heroPowerUsed && player.mana.current >= HERO_POWER.cost) {
    const target = pickHeroPowerTarget(game, idx);
    if (target) game.useHeroPower(idx, target);
  }

  // 3. 공격 가능한 미니언으로 공격합니다.
  if (!game.gameOver) {
    const attackers = player.board.filter(m => m.canAttack && !m.summoningSick);
    for (const attacker of attackers) {
      if (game.gameOver) break;
      const targetRef = pickAttackTarget(game, idx, attacker);
      if (targetRef) game.attack(idx, attacker.id, targetRef);
    }
  }

  // 4. 턴 종료.
  if (!game.gameOver) game.endTurn();
}

function pickTargetForCard(game, idx, def) {
  if (!def.requiresTarget) return null;
  const targets = game.getValidTargets(idx, def);
  if (targets.length === 0) return null;

  if (def.targetType === 'friendly_minion') {
    // 체력이 가장 높은(가장 오래 살아남을) 아군 미니언을 강화합니다.
    return targets.reduce((best, t) => {
      const m = game.getCharacter(t);
      const bestM = best ? game.getCharacter(best) : null;
      return !bestM || m.health > bestM.health ? t : best;
    }, null);
  }

  // 처치 가능한 적 미니언 우선, 없으면 상대 영웅(가능한 대상 종류일 때만).
  const oppMinionTargets = targets.filter(t => t.kind === 'minion' && t.playerIdx !== idx);
  const killable = oppMinionTargets.filter(t => {
    const m = game.getCharacter(t);
    return m && m.health <= 6 && !m.divineShield;
  });
  if (killable.length > 0) {
    killable.sort((a, b) => game.getCharacter(b).attack - game.getCharacter(a).attack);
    return killable[0];
  }

  const heroTarget = targets.find(t => t.kind === 'hero' && t.playerIdx !== idx);
  if (heroTarget) return heroTarget;

  // 영웅을 대상으로 할 수 없는 카드(예: 적 미니언 전용)라면 가장 위협적인 적 미니언을 고른다.
  if (oppMinionTargets.length > 0) {
    oppMinionTargets.sort((a, b) => game.getCharacter(b).attack - game.getCharacter(a).attack);
    return oppMinionTargets[0];
  }
  return targets[0];
}

function pickHeroPowerTarget(game, idx) {
  const targets = game.getValidTargets(idx, HERO_POWER);
  const oppMinionTargets = targets.filter(t => t.kind === 'minion' && t.playerIdx !== idx);
  const finishable = oppMinionTargets.filter(t => {
    const m = game.getCharacter(t);
    return m && m.health <= 1 && !m.divineShield;
  });
  if (finishable.length > 0) return finishable[0];
  return { kind: 'hero', playerIdx: 1 - idx };
}

function pickAttackTarget(game, idx, attacker) {
  const validTargets = game.getValidAttackTargets(idx);
  if (validTargets.length === 0) return null;

  const forcedTaunts = validTargets.filter(t => t.kind === 'minion');
  const heroTarget = validTargets.find(t => t.kind === 'hero');

  if (forcedTaunts.length > 0 && !heroTarget) {
    // 도발로 강제된 경우 안전하게 처치할 수 있는 것을 고릅니다.
    forcedTaunts.sort((a, b) => game.getCharacter(a).health - game.getCharacter(b).health);
    return forcedTaunts[0];
  }

  // 공격자가 죽지 않고 처치 가능한 적 미니언을 찾습니다.
  const goodTrades = forcedTaunts.filter(t => {
    const def = game.getCharacter(t);
    if (!def) return false;
    const survives = def.divineShield || attacker.health > def.attack;
    const kills = def.divineShield ? attacker.attack > 0 : def.health <= attacker.attack;
    return survives && kills;
  });
  if (goodTrades.length > 0) {
    goodTrades.sort((a, b) => game.getCharacter(b).attack - game.getCharacter(a).attack);
    return goodTrades[0];
  }

  return heroTarget || forcedTaunts[0] || null;
}
