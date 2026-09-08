// 카드 데이터베이스 - 하스스톤 스타일 미니언/주문 카드 정의

// 카드 "기능" 분류 체계 - 카드의 핵심 메커니즘을 색상/아이콘으로 구분합니다.
export const CATEGORY_META = {
  vanilla:       { label: '일반',          color: '#8c7b5c', icon: '◆' },
  taunt:         { label: '도발',          color: '#c97a3c', icon: '🛡️' },
  divine_shield: { label: '신성한 보호막', color: '#d8c65a', icon: '✨' },
  charge:        { label: '돌진',          color: '#3fae8a', icon: '⚡' },
  battlecry:     { label: '전투의 함성',   color: '#4f88b8', icon: '📯' },
  deathrattle:   { label: '죽음의 메아리', color: '#9b6bc9', icon: '💀' },
  spell_damage:  { label: '피해',          color: '#b23f3f', icon: '🎯' },
  spell_heal:    { label: '회복',          color: '#d9738f', icon: '💗' },
  spell_draw:    { label: '카드 뽑기',     color: '#4fc9c9', icon: '📘' },
  spell_buff:    { label: '강화',          color: '#cf9d3f', icon: '🌟' },
};

export const CARD_DB = [
  // ---- 바닐라(효과 없는) 미니언 ----
  { id: 'wisp', name: '작은 정령', cost: 1, type: 'minion', attack: 1, health: 1, copies: 2,
    category: 'vanilla', art: '👻', text: '' },
  { id: 'raptor', name: '습지 랩터', cost: 2, type: 'minion', attack: 3, health: 2, copies: 2,
    category: 'vanilla', art: '🦖', text: '' },
  { id: 'crocolisk', name: '강 악어', cost: 2, type: 'minion', attack: 2, health: 3, copies: 2,
    category: 'vanilla', art: '🐊', text: '' },
  { id: 'yeti', name: '눈보라 예티', cost: 4, type: 'minion', attack: 4, health: 5, copies: 1,
    category: 'vanilla', art: '🐻‍❄️', text: '' },
  { id: 'ogre', name: '바위주먹 오우거', cost: 6, type: 'minion', attack: 6, health: 7, copies: 1,
    category: 'vanilla', art: '👹', text: '' },
  { id: 'ancient_wyrm', name: '고대 비룡', cost: 8, type: 'minion', attack: 8, health: 8, copies: 1,
    category: 'vanilla', art: '🐉', text: '' },

  // ---- 도발 미니언 ----
  { id: 'footman', name: '골드샤이어 보병', cost: 1, type: 'minion', attack: 1, health: 2, copies: 2,
    keywords: { taunt: true }, category: 'taunt', art: '🛡️', text: '도발' },
  { id: 'grunt', name: '서리늑대 전사', cost: 2, type: 'minion', attack: 2, health: 2, copies: 1,
    keywords: { taunt: true }, category: 'taunt', art: '🪓', text: '도발' },
  { id: 'jungle_watcher', name: '정글 파수꾼', cost: 4, type: 'minion', attack: 2, health: 5, copies: 1,
    keywords: { taunt: true }, category: 'taunt', art: '🌳', text: '도발' },
  { id: 'fen_creeper', name: '늪지 크리퍼', cost: 5, type: 'minion', attack: 3, health: 6, copies: 1,
    keywords: { taunt: true }, category: 'taunt', art: '🌿', text: '도발' },

  // ---- 신성한 보호막 ----
  { id: 'argent_squire', name: '은빛 종자', cost: 1, type: 'minion', attack: 1, health: 1, copies: 1,
    keywords: { divineShield: true }, category: 'divine_shield', art: '⚔️', text: '신성한 보호막' },

  // ---- 돌진 ----
  { id: 'charging_scout', name: '돌격 정찰병', cost: 3, type: 'minion', attack: 3, health: 2, copies: 1,
    keywords: { charge: true }, category: 'charge', art: '🐎', text: '돌진' },

  // ---- 전투의 함성(소환 시 효과) ----
  { id: 'novice_engineer', name: '견습 기술자', cost: 2, type: 'minion', attack: 1, health: 1, copies: 1,
    category: 'battlecry', art: '⚙️',
    text: '전투의 함성: 카드를 1장 뽑습니다.',
    battlecry: (game, casterIdx) => { game.drawCard(casterIdx); } },

  { id: 'voodoo_doctor', name: '부두 주술사', cost: 1, type: 'minion', attack: 0, health: 1, copies: 1,
    category: 'battlecry', art: '🧪',
    text: '전투의 함성: 대상의 체력을 2 회복시킵니다.',
    requiresTarget: true, targetType: 'any',
    battlecry: (game, casterIdx, target) => { game.healCharacter(target, 2); } },

  { id: 'elven_archer', name: '요정 궁수', cost: 1, type: 'minion', attack: 1, health: 1, copies: 1,
    category: 'battlecry', art: '🏹',
    text: '전투의 함성: 대상에게 피해를 1 줍니다.',
    requiresTarget: true, targetType: 'any',
    battlecry: (game, casterIdx, target) => { game.damageCharacter(target, 1); } },

  { id: 'shattered_sun', name: '부서진 태양 성직자', cost: 3, type: 'minion', attack: 3, health: 2, copies: 1,
    category: 'battlecry', art: '☀️',
    text: '전투의 함성: 아군 미니언에게 +1/+1을 부여합니다.',
    requiresTarget: true, targetType: 'friendly_minion', optionalTarget: true,
    battlecry: (game, casterIdx, target) => { if (target) game.buffMinion(target, 1, 1); } },

  { id: 'abusive_sergeant', name: '학대받는 하사관', cost: 1, type: 'minion', attack: 1, health: 1, copies: 1,
    category: 'battlecry', art: '📯',
    text: '전투의 함성: 아군 미니언에게 +1/+1을 부여합니다.',
    requiresTarget: true, targetType: 'friendly_minion', optionalTarget: true,
    battlecry: (game, casterIdx, target) => { if (target) game.buffMinion(target, 1, 1); } },

  // ---- 죽음의 메아리 ----
  { id: 'loot_hoarder', name: '전리품 사냥꾼', cost: 2, type: 'minion', attack: 2, health: 1, copies: 1,
    category: 'deathrattle', art: '💰',
    text: '죽음의 메아리: 카드를 1장 뽑습니다.',
    deathrattle: (game, ownerIdx) => { game.drawCard(ownerIdx); } },

  { id: 'leper_gnome', name: '문둥이 노움', cost: 1, type: 'minion', attack: 2, health: 1, copies: 1,
    category: 'deathrattle', art: '💀',
    text: '죽음의 메아리: 상대 영웅에게 피해를 2 줍니다.',
    deathrattle: (game, ownerIdx) => { game.damageCharacter({ kind: 'hero', playerIdx: 1 - ownerIdx }, 2); } },

  // ---- 주문 ----
  { id: 'fireball', name: '화염구', cost: 4, type: 'spell', copies: 1,
    category: 'spell_damage', art: '🔥',
    text: '피해를 6 줍니다.',
    requiresTarget: true, targetType: 'any',
    spellEffect: (game, casterIdx, target) => { game.damageCharacter(target, 6); } },

  { id: 'arcane_shot', name: '비전 사격', cost: 1, type: 'spell', copies: 2,
    category: 'spell_damage', art: '💥',
    text: '피해를 2 줍니다.',
    requiresTarget: true, targetType: 'any',
    spellEffect: (game, casterIdx, target) => { game.damageCharacter(target, 2); } },

  { id: 'whirlwind', name: '소용돌이', cost: 1, type: 'spell', copies: 1,
    category: 'spell_damage', art: '🌪️',
    text: '모든 미니언에게 피해를 1 줍니다.',
    spellEffect: (game) => { game.damageAllMinions(1); } },

  { id: 'healing_touch', name: '치유의 손길', cost: 3, type: 'spell', copies: 1,
    category: 'spell_heal', art: '💗',
    text: '내 영웅의 체력을 8 회복시킵니다.',
    spellEffect: (game, casterIdx) => { game.healCharacter({ kind: 'hero', playerIdx: casterIdx }, 8); } },

  { id: 'arcane_intellect', name: '비전 지능', cost: 3, type: 'spell', copies: 1,
    category: 'spell_draw', art: '📖',
    text: '카드를 2장 뽑습니다.',
    spellEffect: (game, casterIdx) => { game.drawCard(casterIdx); game.drawCard(casterIdx); } },

  { id: 'blessing', name: '축복의 힘', cost: 2, type: 'spell', copies: 1,
    category: 'spell_buff', art: '🌟',
    text: '아군 미니언에게 +2/+2를 부여합니다.',
    requiresTarget: true, targetType: 'friendly_minion',
    spellEffect: (game, casterIdx, target) => { game.buffMinion(target, 2, 2); } },
];

export function getCardDef(id) {
  const def = CARD_DB.find(c => c.id === id);
  if (!def) throw new Error(`알 수 없는 카드 id: ${id}`);
  return def;
}

export function getCategoryMeta(category) {
  return CATEGORY_META[category] || CATEGORY_META.vanilla;
}

// 공유 카드 풀을 이용해 30장짜리 덱을 구성합니다 (카드 id 배열, 셔플됨).
export function buildDeck() {
  const deck = [];
  for (const card of CARD_DB) {
    const copies = card.copies || 1;
    for (let i = 0; i < copies; i++) deck.push(card.id);
  }
  shuffle(deck);
  return deck;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
