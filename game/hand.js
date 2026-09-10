'use strict';

/**
 * 섯다(화투 2장) 족보 판정
 * 카드 구성: 1~10월, 각 월당 2장(총 20장).
 * 1,3,8월에는 각각 광(光) 카드가 1장씩 존재한다.
 */

const MONTH_NAMES = ['', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월'];

// 월(month) 1~10, index(그 달의 0번/1번 카드) 구분. 1,3,8월의 index=0 카드를 광으로 취급.
function createDeck() {
  const deck = [];
  for (let month = 1; month <= 10; month++) {
    const gwangMonths = [1, 3, 8];
    for (let idx = 0; idx < 2; idx++) {
      const isGwang = gwangMonths.includes(month) && idx === 0;
      deck.push({
        id: `${month}-${idx}`,
        month,
        isGwang,
      });
    }
  }
  return deck;
}

function shuffle(deck) {
  const arr = deck.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 두 장의 카드를 받아 족보 정보를 리턴한다.
 * { score: number (높을수록 강함), name: string, detail: string }
 */
function evaluateHand(cards) {
  const [a, b] = cards;
  const months = [a.month, b.month].sort((x, y) => x - y);
  const [m1, m2] = months;
  const sum = (a.month + b.month) % 10;

  // 광땡 (1,3,8월의 광 카드 조합)
  if (a.isGwang && b.isGwang) {
    const key = `${m1}-${m2}`;
    if (key === '3-8') return { score: 1103, name: '38광땡', detail: '38광땡' };
    if (key === '1-8') return { score: 1102, name: '18광땡', detail: '18광땡' };
    if (key === '1-3') return { score: 1101, name: '13광땡', detail: '13광땡' };
  }

  // 땡 (페어)
  if (a.month === b.month) {
    const month = a.month;
    const names = {
      1: '1땡(알땡)', 2: '2땡', 3: '3땡', 4: '4땡', 5: '5땡',
      6: '6땡', 7: '7땡', 8: '8땡', 9: '9땡', 10: '장땡',
    };
    return { score: 900 + month, name: names[month], detail: names[month] };
  }

  // 특수 조합 (알리/독사/구삥/장삥/세륙)
  const key = `${m1}-${m2}`;
  const specials = {
    '1-2': { score: 890, name: '알리' },
    '1-4': { score: 889, name: '독사' },
    '1-9': { score: 888, name: '구삥' },
    '1-10': { score: 887, name: '장삥' },
    '4-6': { score: 886, name: '세륙' },
  };
  if (specials[key]) {
    const s = specials[key];
    return { score: s.score, name: s.name, detail: `${s.name} (${MONTH_NAMES[m1]}-${MONTH_NAMES[m2]})` };
  }

  // 갑오 (합이 9)
  if (sum === 9) {
    return { score: 800, name: '갑오', detail: `갑오 (${MONTH_NAMES[a.month]}-${MONTH_NAMES[b.month]})` };
  }

  // 끗수 (합의 일의 자리)
  if (sum === 0) {
    return { score: 0, name: '망통', detail: `망통 (${MONTH_NAMES[a.month]}-${MONTH_NAMES[b.month]})` };
  }

  return { score: 700 + sum, name: `${sum}끗`, detail: `${sum}끗 (${MONTH_NAMES[a.month]}-${MONTH_NAMES[b.month]})` };
}

function compareHands(handA, handB) {
  return handA.score - handB.score;
}

module.exports = { createDeck, shuffle, evaluateHand, compareHands, MONTH_NAMES };
