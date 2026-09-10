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
  spell_summon:  { label: '소환',          color: '#7a5cc9', icon: '🐾' },
  freeze:        { label: '빙결',          color: '#5ec8e8', icon: '❄️' },
  stealth:       { label: '은신',          color: '#6c6f93', icon: '🌫️' },
  silence:       { label: '침묵',          color: '#8a8a8a', icon: '🔇' },
  legendary:     { label: '전설',          color: '#e8b64a', icon: '👑' },
  trample:       { label: '돌파',          color: '#c9622f', icon: '🐘' },
  shadow:        { label: '어둠의 낱말',   color: '#6b3fae', icon: '🌑' },
  warcry:        { label: '전쟁의 함성',   color: '#a8452f', icon: '🪓' },
  assassination: { label: '암살',          color: '#7a2f42', icon: '🩸' },
};

// 게임에서 쓰이는 키워드 설명 목록 - 용어집 화면에 표시됩니다.
export const KEYWORD_GLOSSARY = [
  { icon: '🧱', name: '미니언 차단', desc: '상대 전장에 미니언이 있으면(은신 제외) 영웅을 바로 공격하거나 주문/영웅 능력으로 직접 피해를 줄 수 없습니다. 미니언이 모두 사라져야 영웅을 노릴 수 있습니다.' },
  { icon: '🛡️', name: '도발', desc: '적 전장에 도발 미니언이 있으면, 다른 미니언이 있어도 반드시 도발 미니언부터 공격해야 합니다.' },
  { icon: '✨', name: '신성한 보호막', desc: '처음 받는 피해를 완전히 막아줍니다. 한 번 막고 나면 사라집니다.' },
  { icon: '⚡', name: '돌진', desc: '보통 미니언은 소환된 턴에 공격할 수 없지만, 돌진이 있으면 소환된 바로 그 턴에도 공격할 수 있습니다.' },
  { icon: '🌫️', name: '은신', desc: '상대에게 보이지 않아 공격이나 주문의 대상이 될 수 없고, 미니언 차단에도 관여하지 않습니다. 이 미니언이 직접 공격하면 은신이 풀립니다.' },
  { icon: '🐘', name: '돌파', desc: '공격력이 막고 있는 미니언의 남은 체력보다 크면, 그 초과분만큼 피해가 상대 영웅에게 그대로 들어갑니다. 신성한 보호막으로 막히면 돌파 피해도 발생하지 않습니다.' },
  { icon: '❄️', name: '빙결', desc: '얼려진 대상은 다음 공격 기회를 한 번 사용하지 못합니다.' },
  { icon: '🔇', name: '침묵', desc: '도발·보호막·돌진·은신·돌파 등 모든 특수 능력과 죽음의 메아리를 제거합니다. 공격력/체력은 그대로 유지됩니다.' },
  { icon: '📯', name: '전투의 함성', desc: '이 카드를 낼 때 한 번 발동하는 효과입니다.' },
  { icon: '💀', name: '죽음의 메아리', desc: '이 미니언이 파괴될 때 발동하는 효과입니다. (침묵당한 상태면 발동하지 않습니다)' },
  { icon: '👑', name: '전설', desc: '단 한 장뿐인, 강력하고 독특한 효과를 가진 특별한 카드입니다.' },
];

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
    keywords: { taunt: true }, category: 'taunt', art: '🛡️', text: '도발 (상대는 이 미니언부터 공격해야 함)' },
  { id: 'grunt', name: '서리늑대 전사', cost: 2, type: 'minion', attack: 2, health: 2, copies: 1,
    keywords: { taunt: true }, category: 'taunt', art: '🪓', text: '도발 (상대는 이 미니언부터 공격해야 함)' },
  { id: 'jungle_watcher', name: '정글 파수꾼', cost: 4, type: 'minion', attack: 2, health: 5, copies: 1,
    keywords: { taunt: true }, category: 'taunt', art: '🌳', text: '도발 (상대는 이 미니언부터 공격해야 함)' },
  { id: 'fen_creeper', name: '늪지 크리퍼', cost: 5, type: 'minion', attack: 3, health: 6, copies: 1,
    keywords: { taunt: true }, category: 'taunt', art: '🌿', text: '도발 (상대는 이 미니언부터 공격해야 함)' },

  // ---- 신성한 보호막 ----
  { id: 'argent_squire', name: '은빛 종자', cost: 1, type: 'minion', attack: 1, health: 1, copies: 2,
    keywords: { divineShield: true }, category: 'divine_shield', art: '⚔️', text: '신성한 보호막 (처음 받는 피해 무효화)' },

  // ---- 돌진 ----
  { id: 'charging_scout', name: '돌격 정찰병', cost: 3, type: 'minion', attack: 3, health: 2, copies: 1,
    keywords: { charge: true }, category: 'charge', art: '🐎', text: '돌진 (소환된 턴에 바로 공격 가능)' },

  // ---- 돌파 (하급 몬스터는 갖지 못하는 고급 능력) ----
  { id: 'rampaging_rhino', name: '성난 코뿔소', cost: 5, type: 'minion', attack: 3, health: 5, copies: 1,
    keywords: { trample: true }, category: 'trample', art: '🦏',
    text: '돌파 (막고 있는 미니언 체력을 넘는 피해는 영웅에게 그대로 들어감)' },
  { id: 'rampaging_giant', name: '폭주하는 거인', cost: 7, type: 'minion', attack: 5, health: 6, copies: 1,
    keywords: { trample: true }, category: 'trample', art: '🗿',
    text: '돌파 (막고 있는 미니언 체력을 넘는 피해는 영웅에게 그대로 들어감)' },

  // ---- 전쟁의 함성 (전사 전용 주문 - 미니언에게 힘을 실어주는 전술) ----
  { id: 'shield_wall', name: '방벽의 함성', cost: 3, type: 'spell', copies: 2,
    category: 'warcry', art: '🪖',
    text: '대상 아군 미니언에게 +0/+3과 도발을 부여합니다.',
    requiresTarget: true, targetType: 'friendly_minion',
    spellEffect: (game, casterIdx, target) => { game.buffMinion(target, 0, 3); game.grantTaunt(target); } },
  { id: 'war_charge', name: '결전의 돌격', cost: 3, type: 'spell', copies: 2,
    category: 'warcry', art: '🏇',
    text: '대상 아군 미니언에게 +2/+0을 부여하고 이번 턴 즉시 공격할 수 있게 합니다.',
    requiresTarget: true, targetType: 'friendly_minion',
    spellEffect: (game, casterIdx, target) => { game.buffMinion(target, 2, 0); game.grantCharge(target); } },

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

  { id: 'lesser_heal', name: '치유의 기도', cost: 1, type: 'spell', copies: 2,
    category: 'spell_heal', art: '🙌',
    text: '대상의 체력을 4 회복시킵니다.',
    requiresTarget: true, targetType: 'any',
    spellEffect: (game, casterIdx, target) => { game.healCharacter(target, 4); } },

  { id: 'arcane_intellect', name: '비전 지능', cost: 3, type: 'spell', copies: 1,
    category: 'spell_draw', art: '📖',
    text: '카드를 2장 뽑습니다.',
    spellEffect: (game, casterIdx) => { game.drawCard(casterIdx); game.drawCard(casterIdx); } },

  { id: 'blessing', name: '축복의 힘', cost: 2, type: 'spell', copies: 1,
    category: 'spell_buff', art: '🌟',
    text: '아군 미니언에게 +2/+2를 부여합니다.',
    requiresTarget: true, targetType: 'friendly_minion',
    spellEffect: (game, casterIdx, target) => { game.buffMinion(target, 2, 2); } },

  { id: 'battlefield_blessing', name: '전장의 축복', cost: 1, type: 'spell', copies: 2,
    category: 'spell_buff', art: '🍀',
    text: '아군 미니언에게 +1/+1을 부여합니다.',
    requiresTarget: true, targetType: 'friendly_minion',
    spellEffect: (game, casterIdx, target) => { game.buffMinion(target, 1, 1); } },

  // ---- 은신 ----
  { id: 'stealth_scout', name: '은신 정찰병', cost: 2, type: 'minion', attack: 2, health: 1, copies: 1,
    keywords: { stealth: true }, category: 'stealth', art: '🥷', text: '은신 (상대에게 보이지 않음, 공격하면 해제)' },
  { id: 'shadowstalker', name: '어둠추적자', cost: 4, type: 'minion', attack: 5, health: 3, copies: 1,
    keywords: { stealth: true }, category: 'stealth', art: '🦇', text: '은신 (상대에게 보이지 않음, 공격하면 해제)' },

  // ---- 암살 (도적 전용 주문 - 은신과 기습으로 상대를 노리는 기술) ----
  { id: 'shadowstep', name: '그림자 걸음', cost: 2, type: 'spell', copies: 2,
    category: 'assassination', art: '🌫️',
    text: '대상 아군 미니언에게 +1/+1과 은신을 부여합니다.',
    requiresTarget: true, targetType: 'friendly_minion',
    spellEffect: (game, casterIdx, target) => { game.buffMinion(target, 1, 1); game.grantStealth(target); } },
  { id: 'ambush', name: '기습', cost: 2, type: 'spell', copies: 2,
    category: 'assassination', art: '🩸',
    text: '대상 적 미니언에게 피해를 3 줍니다.',
    requiresTarget: true, targetType: 'enemy_minion',
    spellEffect: (game, casterIdx, target) => { game.damageCharacter(target, 3); } },

  // ---- 빙결 ----
  { id: 'frost_elemental', name: '서리 정령', cost: 4, type: 'minion', attack: 3, health: 3, copies: 1,
    category: 'freeze', art: '❄️',
    text: '전투의 함성: 대상 적 미니언을 얼립니다 (다음 공격 기회를 사용하지 못함).',
    requiresTarget: true, targetType: 'enemy_minion',
    battlecry: (game, casterIdx, target) => { game.freezeCharacter(target); } },
  { id: 'ice_archer', name: '얼음 궁수', cost: 3, type: 'minion', attack: 2, health: 3, copies: 1,
    category: 'freeze', art: '🧊',
    text: '전투의 함성: 대상 적 미니언에게 피해를 2 주고 얼립니다.',
    requiresTarget: true, targetType: 'enemy_minion',
    battlecry: (game, casterIdx, target) => { game.damageCharacter(target, 2); game.freezeCharacter(target); } },
  { id: 'chains_of_frost', name: '빙결의 사슬', cost: 2, type: 'spell', copies: 1,
    category: 'freeze', art: '❄️',
    text: '대상 적 미니언을 얼립니다 (다음 공격 기회를 사용하지 못함).',
    requiresTarget: true, targetType: 'enemy_minion',
    spellEffect: (game, casterIdx, target) => { game.freezeCharacter(target); } },

  { id: 'frostfire_bolt', name: '서리불꽃 화살', cost: 3, type: 'spell', copies: 1,
    category: 'freeze', art: '🧨',
    text: '대상 적 미니언에게 피해를 3 주고 얼립니다.',
    requiresTarget: true, targetType: 'enemy_minion',
    spellEffect: (game, casterIdx, target) => { game.damageCharacter(target, 3); game.freezeCharacter(target); } },

  // ---- 침묵 ----
  { id: 'silence_owl', name: '침묵의 부엉이', cost: 2, type: 'minion', attack: 2, health: 3, copies: 2,
    category: 'silence', art: '🦉',
    text: '전투의 함성: 대상 미니언을 침묵시킵니다 (모든 특수 능력 제거).',
    requiresTarget: true, targetType: 'any_minion',
    battlecry: (game, casterIdx, target) => { game.silenceMinion(target); } },
  { id: 'silencing_prayer', name: '침묵의 기도', cost: 1, type: 'spell', copies: 1,
    category: 'silence', art: '🔇',
    text: '대상 미니언을 침묵시킵니다 (모든 특수 능력 제거).',
    requiresTarget: true, targetType: 'any_minion',
    spellEffect: (game, casterIdx, target) => { game.silenceMinion(target); } },

  // ---- 어둠의 낱말 (사제 전용 - 실질적인 승리 수단) ----
  { id: 'mind_blast', name: '정신 강타', cost: 3, type: 'spell', copies: 2,
    category: 'shadow', art: '🌑',
    text: '대상에게 피해를 4 줍니다.',
    requiresTarget: true, targetType: 'any',
    spellEffect: (game, casterIdx, target) => { game.damageCharacter(target, 4); } },
  { id: 'shadow_word_death', name: '그림자 낱말: 죽음', cost: 2, type: 'spell', copies: 2,
    category: 'shadow', art: '☠️', destroysMinion: true,
    text: '대상 적 미니언을 파괴합니다 (신성한 보호막도 무시).',
    requiresTarget: true, targetType: 'enemy_minion',
    spellEffect: (game, casterIdx, target) => { game.destroyMinion(target); } },
  { id: 'guardian_of_light', name: '빛의 수호자', cost: 4, type: 'minion', attack: 4, health: 6, copies: 1,
    keywords: { taunt: true }, category: 'shadow', art: '🕊️',
    text: '도발 (상대는 이 미니언부터 공격해야 함)' },
  { id: 'shadow_disciple', name: '그림자 신도', cost: 3, type: 'minion', attack: 3, health: 4, copies: 2,
    category: 'shadow', art: '🙏',
    text: '전투의 함성: 대상의 체력을 4 회복시킵니다.',
    requiresTarget: true, targetType: 'any',
    battlecry: (game, casterIdx, target) => { game.healCharacter(target, 4); } },
  { id: 'holy_nova', name: '신성한 폭발', cost: 3, type: 'spell', copies: 2,
    category: 'shadow', art: '💥', boardClear: true,
    text: '적 미니언 전체에게 피해를 3 줍니다.',
    spellEffect: (game, casterIdx) => { game.damageEnemyBoard(casterIdx, 3); } },

  // ---- 소환(토큰) ----
  { id: 'wolf_trainer', name: '늑대 조련사', cost: 2, type: 'minion', attack: 2, health: 2, copies: 1,
    category: 'battlecry', art: '🐺',
    text: '전투의 함성: 1/1 늑대 토큰을 소환합니다.',
    battlecry: (game, casterIdx) => { game.summonToken(casterIdx, 'wolf_token'); } },
  { id: 'horn_of_summoning', name: '소환의 뿔피리', cost: 3, type: 'spell', copies: 1,
    category: 'spell_summon', art: '🐾',
    text: '3/3 곰 토큰을 소환합니다.',
    spellEffect: (game, casterIdx) => { game.summonToken(casterIdx, 'bear_token'); } },

  // ---- 전설 (단 한 장, 고유한 특수 능력) ----
  { id: 'dragon_sentinel', name: '고룡의 감시자', cost: 6, type: 'minion', attack: 5, health: 6, copies: 1,
    keywords: { taunt: true }, category: 'legendary', art: '🐲',
    text: '도발. 전투의 함성: 아군 미니언 전체에게 +1/+0을 부여합니다.',
    battlecry: (game, casterIdx) => { game.buffAllFriendly(casterIdx, 1, 0); } },

  { id: 'legion_commander', name: '군단의 사령관', cost: 4, type: 'minion', attack: 4, health: 3, copies: 1,
    category: 'legendary', art: '🎖️',
    text: '전투의 함성: 아군 미니언 전체에게 +0/+2를 부여합니다.',
    battlecry: (game, casterIdx) => { game.buffAllFriendly(casterIdx, 0, 2); } },

  { id: 'chaos_reaper', name: '혼돈의 학살자', cost: 5, type: 'minion', attack: 4, health: 4, copies: 1,
    category: 'legendary', art: '💢',
    text: '전투의 함성: 모든 적 미니언에게 피해를 2 줍니다.',
    battlecry: (game, casterIdx) => { game.damageEnemyBoard(casterIdx, 2); } },

  { id: 'static_elemental', name: '감전의 정령', cost: 3, type: 'minion', attack: 3, health: 2, copies: 1,
    category: 'legendary', art: '⚡',
    text: '전투의 함성: 무작위 적 미니언에게 피해를 3 줍니다.',
    battlecry: (game, casterIdx) => {
      const pool = game.players[1 - casterIdx].board.filter(m => !m.stealth);
      if (pool.length === 0) return;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      game.damageCharacter({ kind: 'minion', playerIdx: 1 - casterIdx, id: pick.id }, 3);
    } },

  { id: 'chronomancer', name: '시간의 마법사', cost: 3, type: 'minion', attack: 2, health: 4, copies: 1,
    category: 'legendary', art: '⏳',
    text: '전투의 함성: 대상 아군 미니언을 손으로 되돌립니다.',
    requiresTarget: true, targetType: 'friendly_minion', optionalTarget: true,
    battlecry: (game, casterIdx, target) => { if (target) game.returnToHand(target); } },

  { id: 'regrowth_spirit', name: '재생의 정령', cost: 3, type: 'minion', attack: 2, health: 4, copies: 1,
    category: 'legendary', art: '🌱',
    text: '죽음의 메아리: 내 영웅의 체력을 5 회복시킵니다.',
    deathrattle: (game, ownerIdx) => { game.healCharacter({ kind: 'hero', playerIdx: ownerIdx }, 5); } },

  // ---- 토큰 (덱에는 들어가지 않고 소환 효과로만 등장) ----
  { id: 'wolf_token', name: '늑대', cost: 1, type: 'minion', attack: 1, health: 1, copies: 0,
    category: 'vanilla', art: '🐺', text: '' },
  { id: 'bear_token', name: '곰', cost: 3, type: 'minion', attack: 3, health: 3, copies: 0,
    category: 'vanilla', art: '🐻', text: '' },
];

export function getCardDef(id) {
  const def = CARD_DB.find(c => c.id === id);
  if (!def) throw new Error(`알 수 없는 카드 id: ${id}`);
  return def;
}

export function getCategoryMeta(category) {
  return CATEGORY_META[category] || CATEGORY_META.vanilla;
}

// 공유 카드 풀을 이용해 덱을 구성합니다 (카드 id 배열, 셔플됨).
// copies: 0인 카드(토큰)는 소환 효과로만 등장하며 덱에는 들어가지 않습니다.
// ================= 직업(클래스) - 서로 다른 카드 풀과 영웅 능력을 가진 덱 =================
// 대전 시작 시 플레이어와 AI에게 각각 무작위로 배정되어, 같은 카드 풀을 공유하는
// "미러전"이 아니라 실제로 다른 덱으로 대결하게 됩니다.
const NEUTRAL_CATEGORIES = ['vanilla', 'legendary', 'spell_summon', 'spell_buff'];

export const CLASSES = [
  { id: 'warrior', name: '전사', icon: '⚔️', categories: ['taunt', 'charge', 'trample', 'warcry'],
    heroPower: { name: '강타', icon: '⚔️', cost: 3, text: '대상에게 피해를 1 줍니다.',
      requiresTarget: true, targetType: 'any',
      effect: (game, casterIdx, target) => { game.damageCharacter(target, 1); } } },
  { id: 'mage', name: '마법사', icon: '🔥', categories: ['spell_damage', 'freeze', 'spell_draw'],
    heroPower: { name: '화염 손가락', icon: '🔥', cost: 2, text: '대상에게 피해를 1 줍니다.',
      requiresTarget: true, targetType: 'any',
      effect: (game, casterIdx, target) => { game.damageCharacter(target, 1); } } },
  { id: 'priest', name: '사제', icon: '✨', categories: ['spell_heal', 'divine_shield', 'silence', 'shadow'],
    heroPower: { name: '신성한 손길', icon: '✨', cost: 2, text: '대상의 체력을 3 회복시킵니다.',
      requiresTarget: true, targetType: 'any',
      effect: (game, casterIdx, target) => { game.healCharacter(target, 3); } } },
  { id: 'rogue', name: '도적', icon: '🗡️', categories: ['stealth', 'deathrattle', 'battlecry', 'assassination'],
    heroPower: { name: '표창 투척', icon: '🗡️', cost: 1, text: '대상에게 피해를 1 줍니다.',
      requiresTarget: true, targetType: 'any',
      effect: (game, casterIdx, target) => { game.damageCharacter(target, 1); } } },
];

export function getClassDef(classId) {
  return CLASSES.find(c => c.id === classId) || CLASSES[0];
}

export function randomClassId() {
  return CLASSES[Math.floor(Math.random() * CLASSES.length)].id;
}

// classId의 직업이 다루는 카드 풀(중립 카테고리 + 직업 전용 카테고리)만 모아 덱을 구성합니다.
export function buildDeck(classId) {
  const cls = getClassDef(classId);
  const allowed = new Set([...NEUTRAL_CATEGORIES, ...cls.categories]);
  const deck = [];
  for (const card of CARD_DB) {
    if (!allowed.has(card.category)) continue;
    const copies = card.copies === undefined ? 1 : card.copies;
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
