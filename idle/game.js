'use strict';
const $ = id => document.getElementById(id);
const fmt = n => n < 1e4 ? Math.floor(n).toString() :
  n < 1e8 ? (n/1e4).toFixed(1)+'만' : n < 1e12 ? (n/1e8).toFixed(1)+'억' : (n/1e12).toFixed(1)+'조';

const MAPS = [
  {name:'메이플 아일랜드',  mon:'달팽이',     e:'🐌', lv:1,   hp:30,      exp:8,     meso:5},
  {name:'헤네시스 사냥터',  mon:'주황버섯',   e:'🍄', lv:5,   hp:200,     exp:40,    meso:30},
  {name:'페리온 바위산',    mon:'와일드보어', e:'🐗', lv:15,  hp:2000,    exp:300,   meso:200},
  {name:'엘리니아 숲',      mon:'스톤골렘',   e:'🗿', lv:30,  hp:30000,   exp:3000,  meso:2000},
  {name:'오르비스 탑',      mon:'루나픽시',   e:'🧚', lv:50,  hp:5e5,     exp:5e4,   meso:3e4},
  {name:'리프레 용의 둥지', mon:'와이번',     e:'🐲', lv:80,  hp:1e7,     exp:1e6,   meso:6e5},
  {name:'시간의 신전',      mon:'핑크빈',     e:'🌸', lv:120, hp:3e8,     exp:4e7,   meso:2e7},
  {name:'검은 마법사의 성', mon:'검은 마법사',e:'🧙‍♂️', lv:180, hp:1e10,    exp:2e9,   meso:1e9},
];
const GEAR = [
  {k:'weapon', name:'무기', e:'🗡️', stat:'공격력', per:12},
  {k:'hat',    name:'모자', e:'🎩', stat:'HP',     per:60},
  {k:'armor',  name:'갑옷', e:'🛡️', stat:'방어력', per:6},
  {k:'shoes',  name:'신발', e:'👟', stat:'공속%',  per:2},
  {k:'gloves', name:'장갑', e:'🧤', stat:'크리율%', per:.2},
  {k:'cape',   name:'망토', e:'🧥', stat:'피해감소%', per:.3},
  {k:'ring',   name:'반지', e:'💍', stat:'크뎀%',  per:1},
  {k:'neck',   name:'목걸이', e:'📿', stat:'메소·경험치%', per:1},
];
// % 단위 부위: 등급별 수치표와 표기
const PCT = {shoes:'공속 +', gloves:'크리율 +', cape:'받는 피해 -', ring:'크리 데미지 +', neck:'메소·경험치 +'};
const RARITY = [
  {n:'일반',     c:'#9aa0a6', rate:55, mul:1},
  {n:'레어',     c:'#3b9cff', rate:28, mul:2.5},
  {n:'에픽',     c:'#b05cff', rate:12, mul:6},
  {n:'유니크',   c:'#ffb020', rate:4,  mul:13},
  {n:'레전더리', c:'#2ecc71', rate:1,  mul:30},
];
const ITEM = {
  weapon:{base:70,  names:['목검','강철 검','미스릴 대검','엑스칼리버','검은 마법사의 지팡이']},
  hat:   {base:350, names:['털모자','철 투구','마법사 모자','용기사 투구','핑크빈 왕관']},
  armor: {base:35,  names:['천 옷','가죽 갑옷','미스릴 갑옷','용린 갑옷','시간의 갑주']},
  shoes: {tbl:[2,4,8,14,22],   names:['고무 신발','가죽 부츠','바람의 신발','천둥 부츠','시공의 신발']},
  gloves:{tbl:[1,2,4,7,12],    names:['면장갑','가죽 장갑','강철 건틀릿','용의 발톱','신의 손길']},
  cape:  {tbl:[2,4,7,11,16],   names:['낡은 망토','가죽 망토','마법사의 망토','불사조 망토','시간의 망토']},
  ring:  {tbl:[5,10,20,35,60], names:['구리 반지','은 반지','루비 반지','용의 눈 반지','영원의 반지']},
  neck:  {tbl:[5,10,20,35,60], names:['나무 목걸이','진주 목걸이','사파이어 목걸이','영웅의 목걸이','세계수의 눈물']},
};
// 동료: 가챠로 획득, 중복은 조각으로 성장 (dps 공격 / tank 받는 피해 감소 / heal HP 회복 / buff 공격력·경험치·메소)
const MATES = {
  kai:  {n:'카이',   e:'🛡️', r:0, role:'탱커',     cd:3,  m:.8,  b:{red:.12}},
  leon: {n:'레온',   e:'🏹', r:0, role:'궁수',     cd:1.5,m:1.2},
  mira: {n:'미라',   e:'🔮', r:1, role:'마법사',   cd:3,  m:3},
  shado:{n:'샤도',   e:'🥷', r:1, role:'도적',     cd:2,  m:2,   b:{meso:.20}},
  eri:  {n:'에리',   e:'💚', r:2, role:'힐러',     b:{regen:.02,red:.10}},
  luna: {n:'루나',   e:'🎵', r:2, role:'음유시인', b:{atk:.25,exp:.25}},
  zeno: {n:'제노',   e:'⚙️', r:3, role:'기계공학자',cd:4,  m:9,   b:{meso:.20}},
  arca: {n:'아르카', e:'👑', r:4, role:'용사',     cd:2.5,m:14,  b:{atk:.30,red:.10}},
  toby: {n:'토비',   e:'🥊', r:0, role:'격투가',   cd:2,  m:1.1},
  gus:  {n:'거스',   e:'⛏️', r:0, role:'광부',     cd:4,  m:1.6, b:{meso:.15}},
  rina: {n:'리나',   e:'🌿', r:1, role:'드루이드', cd:4,  m:2.5, b:{regen:.015,atk:.08}},
  vik:  {n:'빅',     e:'🏴‍☠️', r:1, role:'해적',     cd:2,  m:2.2, b:{meso:.15}},
  sage: {n:'세이지', e:'📚', r:2, role:'현자',     cd:3,  m:5,   b:{exp:.20}},
  mina: {n:'미나',   e:'🔰', r:2, role:'성기사',   cd:3,  m:1.6, b:{red:.20,regen:.01}},
  irene:{n:'아이린', e:'⚡', r:3, role:'마검사',   cd:2,  m:8,   b:{atk:.20}},
  nero: {n:'네로',   e:'🌑', r:4, role:'암흑기사', cd:2.5,m:18,  b:{atk:.35,red:.12}},
};
const MATEBT = {red:'받는 피해 -',regen:'HP 회복/초 +',atk:'공격력 +',exp:'경험치 +',meso:'메소 +'};
const MATEMAX = 20, PARTY = 3, MATE1 = 10, MATE10 = 90;
const mateLv = id => S.mates[id] ? S.mates[id].lv : 0;
const mateMul = id => 1 + .2*(mateLv(id)-1);
const mateOwned = () => Object.keys(S.mates).length;
function mt(){
  const o = {atk:1,exp:1,meso:1,regen:0,red:0}, n = mateOwned();
  o.atk += .05*n; o.meso += .08*n;   // 도감 보너스
  Object.keys(S.mates).forEach(id => { const b = MATES[id].b || {}, f = S.party.includes(id) ? 1 : PETHOLD;
    for (const k in b) { const v = b[k]*mateMul(id)*f; if (k === 'red') o.red += v; else if (k === 'regen') o.regen += v; else o[k] += v; } });
  o.red = Math.min(.5, o.red);
  return o;
}
const mateTxt = (id, f=1) => { const m = MATES[id], x = [];
  if (m.cd) x.push(`${m.cd}초마다 공격력 ×${(m.m*mateMul(id)).toFixed(2)} 공격`);
  for (const k in (m.b||{})) x.push(MATEBT[k] + (m.b[k]*mateMul(id)*f*100).toFixed(1).replace(/\.0$/,'') + '%');
  return x.join(' · '); };
const PETS = {
  slime:  {n:'슬라임',   e:'🟢', r:0, b:{atk:.05}},
  chick:  {n:'병아리',   e:'🐥', r:0, b:{meso:.10}},
  cat:    {n:'고양이',   e:'🐱', r:1, b:{crit:.03,atk:.05}},
  owl:    {n:'부엉이',   e:'🦉', r:1, b:{exp:.15}},
  wolf:   {n:'늑대',     e:'🐺', r:2, b:{atk:.15,hp:.1}},
  fox:    {n:'구미호',   e:'🦊', r:2, b:{meso:.25,exp:.1}},
  unicorn:{n:'유니콘',   e:'🦄', r:3, b:{hp:.3,exp:.25,spd:.05}},
  dragon: {n:'드래곤',   e:'🐲', r:4, b:{atk:.4,crit:.05,meso:.2}},
  bunny:  {n:'토끼',     e:'🐰', r:0, b:{hp:.08}},
  frog:   {n:'개구리',   e:'🐸', r:0, b:{crit:.02,atk:.03}},
  penguin:{n:'펭귄',     e:'🐧', r:1, b:{hp:.15,spd:.03}},
  panda:  {n:'판다',     e:'🐼', r:1, b:{exp:.15,hp:.10}},
  tiger:  {n:'호랑이',   e:'🐯', r:2, b:{atk:.20,crit:.03}},
  monkey: {n:'원숭이',   e:'🐵', r:2, b:{meso:.30,exp:.10}},
  fairy:  {n:'요정',     e:'🧚', r:3, b:{exp:.35,meso:.20}},
  phoenix:{n:'불사조',   e:'🦅', r:4, b:{atk:.40,hp:.30,crit:.05}},
};
const PETBT = {atk:'공격력',hp:'HP',meso:'메소',exp:'경험치',crit:'크리율',spd:'공속'};
const PET1 = 10, PET10 = 90, PETMAX = 20, PETSLOT = 2;
const petLv = id => S.pets[id] ? S.pets[id].lv : 0;
const petMul = id => 1 + .15*(petLv(id)-1);
const petTxt = (id, f=1) => Object.entries(PETS[id].b).map(([k,v]) => `${PETBT[k]} +${(v*petMul(id)*f*100).toFixed(f<1?1:0).replace(/\.0$/,'')}%`).join(' · ');
const petOwned = () => Object.keys(S.pets).length;
function pb(){
  const o = {atk:1,hp:1,meso:1,exp:1,crit:0,spd:1}, n = petOwned();
  // 도감 보너스: 보유 종류당 공격력 +3%, 경험치 +2%
  o.atk += .05*n; o.exp += .04*n;
  Object.keys(S.pets).forEach(id => {
    const f = S.petEq.includes(id) ? 1 : PETHOLD;   // 장착 100% / 보유만 30%
    for (const k in PETS[id].b) { const v = PETS[id].b[k]*petMul(id)*f; if (k === 'crit') o.crit += v; else o[k] += v; } });
  return o;
}
const JOB_LV = [10, 40, 80, 130];
// m: 배수(atk,hp,def,spd,meso,skill) / 가산(crit,cdmg,regen)
const TREE = {
  warrior:{n:'전사', e:'⚔️', m:{atk:1.1,hp:1.4,def:1.3}, sk:['파워 스트라이크',6,4,1], kids:{
    fighter:{n:'파이터', m:{atk:1.25,spd:1.05}, kids:{crusader:{n:'크루세이더', m:{atk:1.3,skill:1.3}, kids:{hero:{n:'히어로', m:{atk:1.7,crit:.1,skill:1.5}}}}}},
    paladin:{n:'팔라딘', m:{hp:1.4,def:1.5}, kids:{knight:{n:'나이트', m:{hp:1.4,def:1.4,regen:.01}, kids:{darkknight:{n:'다크나이트', m:{atk:1.4,hp:1.5,def:1.5,regen:.01}}}}}},
  }},
  mage:{n:'마법사', e:'🔮', m:{atk:1.35,hp:.9}, sk:['에너지 볼트',5,4.5,1], kids:{
    firemage:{n:'불독', m:{atk:1.4,skill:1.3}, kids:{firewizard:{n:'불독 마도사', m:{atk:1.3,skill:1.5}, kids:{archmage:{n:'아크메이지', m:{atk:1.8,skill:1.8}}}}}},
    cleric:{n:'클레릭', m:{hp:1.3,regen:.02}, kids:{priest:{n:'프리스트', m:{atk:1.2,hp:1.3,regen:.02}, kids:{bishop:{n:'비숍', m:{atk:1.5,hp:1.5,regen:.03,skill:1.4}}}}}},
  }},
  archer:{n:'궁수', e:'🏹', m:{atk:1.15,spd:1.1,crit:.1}, sk:['애로우 레인',6,2,3], kids:{
    hunter:{n:'헌터', m:{atk:1.25,spd:1.1}, kids:{ranger:{n:'레인저', m:{atk:1.3,spd:1.1,skill:1.3}, kids:{bowmaster:{n:'보우마스터', m:{atk:1.6,spd:1.2,crit:.1}}}}}},
    crossbow:{n:'사수', m:{atk:1.2,crit:.1,cdmg:.3}, kids:{sniper:{n:'저격수', m:{crit:.1,cdmg:.4}, kids:{marksman:{n:'신궁', m:{atk:1.5,crit:.1,cdmg:.6}}}}}},
  }},
  thief:{n:'도적', e:'🗡️', m:{atk:1.15,spd:1.15,cdmg:.4}, sk:['럭키 세븐',5,3,2], kids:{
    assassin:{n:'어쌔신', m:{atk:1.2,cdmg:.5}, kids:{hermit:{n:'허밋', m:{atk:1.3,cdmg:.6,skill:1.3}, kids:{nightlord:{n:'나이트로드', m:{atk:1.6,cdmg:.8,skill:1.5}}}}}},
    bandit:{n:'시프', m:{spd:1.2,meso:1.3}, kids:{chiefbandit:{n:'시프마스터', m:{spd:1.15,meso:1.5,atk:1.2}, kids:{shadower:{n:'섀도어', m:{atk:1.5,spd:1.2,meso:2}}}}}},
  }},
};
const ADD = {crit:1,cdmg:1,regen:1};
const MODTXT = {atk:'공격력',hp:'HP',def:'방어',spd:'공속',meso:'메소',skill:'스킬 데미지',crit:'크리율',cdmg:'크뎀',regen:'HP 회복/초'};
function jobNodes(){ const out = []; let kids = TREE; for (const id of S.job) { const n = kids[id]; if (!n) break; out.push(n); kids = n.kids || {}; } return out; }
function jobKids(){ const ns = jobNodes(); return ns.length ? (ns[ns.length-1].kids || {}) : TREE; }
function jm(){
  const o = {atk:1,hp:1,def:1,spd:1,meso:1,skill:1,crit:0,cdmg:0,regen:0};
  jobNodes().forEach(n => { for (const k in n.m) { if (ADD[k]) o[k] += n.m[k]; else o[k] *= n.m[k]; } });
  return o;
}
const modTxt = m => Object.keys(m).map(k => ADD[k] ? `${MODTXT[k]} +${Math.round(m[k]*100)}%` : `${MODTXT[k]} ×${m[k]}`).join(' · ');
const PULL1 = 5, PULL10 = 45, STAGES = 10;
const STATS = [
  {k:'atk',  name:'공격력 단련', desc:'공격력 +5',  base:50,  g:1.09},
  {k:'hp',   name:'체력 단련',   desc:'최대 HP +40', base:40,  g:1.09},
  {k:'crit', name:'크리티컬',    desc:'크리율 +0.5% (최대 80%)', base:200, g:1.11, max:160},
  {k:'cdmg', name:'크리 데미지', desc:'크뎀 +2%',    base:300, g:1.10},
  {k:'meso', name:'메소 획득',   desc:'메소 +3%',    base:500, g:1.12},
];

const fresh = () => ({lv:1,exp:0,meso:0,gem:0,map:0,kills:0,stat:{atk:0,hp:0,crit:0,cdmg:0,meso:0},
  gear:{weapon:0,hat:0,armor:0,shoes:0,gloves:0,cape:0,ring:0,neck:0},best:0,last:Date.now(),stage:1,clear:{},daily:{},ach:{},tk:0,week:{},mine:{lv:0,t:0},ex:{d:'',n:0},job:[],pets:{},mates:{},party:[null,null,null],mpity:0,mpulls:0,lastMate:[],petEq:[null,null],ppity:0,ppulls:0,lastEgg:[],items:{},equip:{weapon:null,hat:null,armor:null,shoes:null,gloves:null,cape:null,ring:null,neck:null},pity:0,pity10:0,pulls:0,lastPull:[]});
let S = fresh();
try { const raw = localStorage.getItem('mapleIdle'); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch(e){}
if (Array.isArray(S.inv) || Object.values(S.equip||{}).some(v => v && typeof v === 'object')) {   // 구버전 장비 변환
  const add = it => { const k = it.slot + ':' + it.r; (S.items[k] = S.items[k] || {n:0, star:0}).n++; return k; };
  S.items = S.items || {}; (S.inv || []).forEach(add); delete S.inv;
  for (const sl in S.equip) if (S.equip[sl] && typeof S.equip[sl] === 'object') S.equip[sl] = add(S.equip[sl]);
  S.lastPull = [];
  for (const sl of Object.keys(S.equip)) if (!S.equip[sl]) {   // 빈 부위는 보유한 최고 등급으로 장착
    const ks = Object.keys(S.items).filter(k => k.startsWith(sl + ':')).sort((x, y) => +y.split(':')[1] - +x.split(':')[1]);
    if (ks.length) S.equip[sl] = ks[0];
  }
}
GEAR.forEach(g => { if (S.gear[g.k] == null) S.gear[g.k] = 0; if (!(g.k in S.equip)) S.equip[g.k] = null; });
for (const id of Object.keys(S.mates)) { if (!MATES[id]) delete S.mates[id]; else { S.mates[id].lv = Math.min(MATEMAX, S.mates[id].lv||1); S.mates[id].sh = S.mates[id].sh||0; } }
S.party = S.party.map(id => S.mates[id] ? id : null);

const need = lv => Math.floor(20 * Math.pow(lv, 2.1) * 1.05);
const P = () => {
  const J = jm(), B = pb(), M = mt(), H = hold(), E = S.equip, ep = k => (E[k] ? kindPow(E[k]) : 0) + H[k], pg = k => (ep(k) + S.gear[k]*GEAR.find(g=>g.k===k).per) / 100;
  const atk = (10 + S.lv*3 + S.stat.atk*5 + S.gear.weapon*12 + ep('weapon')) * J.atk * B.atk * M.atk;
  return {
    atk,
    hp: (100 + S.lv*20 + S.stat.hp*40 + S.gear.hat*60 + ep('hat')) * J.hp * B.hp,
    def: (S.gear.armor*6 + S.lv + ep('armor')) * J.def,
    crit: Math.min(.8, .05 + S.stat.crit*.005 + J.crit + B.crit + pg('gloves')),
    cdmg: 1.5 + S.stat.cdmg*.02 + J.cdmg + pg('ring'),
    spd: (1 + (S.gear.shoes*2 + ep('shoes'))/100) * J.spd * B.spd,
    meso: (1 + S.stat.meso*.03) * J.meso * B.meso * M.meso * (1 + pg('neck')), exp: B.exp * M.exp * (1 + pg('neck')), red: Math.min(.7, M.red + pg('cape')),
    skill: J.skill, regen: J.regen + M.regen,
  };
};
const upCost = (s) => Math.floor(s.base * Math.pow(s.g, S.stat[s.k]));
// n레벨을 한 번에 올릴 때의 총 비용 (최대치 제한 포함)
function bulkCost(s, n){ let t = 0, lv = S.stat[s.k]; for (let i = 0; i < n && !(s.max && lv >= s.max); i++, lv++) t += Math.floor(s.base * Math.pow(s.g, lv)); return t; }
const gearCost = k => Math.floor(100 * Math.pow(1.22, S.gear[k]));
const gearRate = k => Math.max(.15, 1 - S.gear[k]*.02);

// combat state
// 스테이지 난이도 / 보상 성장률 (스테이지당 배수)
const HPG = 1.6, DMGG = 1.45, RWG = 1.5;
const bossTime = st => Math.max(15, 32 - st*2);
const bossGem = (map, st) => Math.round((3 + map*2) * (1 + .6*(st-1)));
const mCd = {};
let petCd = 2, mhp, mmax, php, isBoss = false, bossT = 0, atkCd = 0, monCd = 0, skCd = 3;
const mon = () => {
  const m = MAPS[S.map], boss = isBoss, sm = Math.pow(HPG, S.stage-1), rm = Math.pow(RWG, S.stage-1);
  return {hp: m.hp * sm * (boss ? 12 : 1), exp: m.exp * rm * (boss ? 10 : 1), meso: m.meso * rm * (boss ? 10 : 1)};
};
function spawn(){ const m = mon(); mmax = mhp = m.hp; $('monster').firstChild.textContent = isBoss?'👹':MAPS[S.map].e; }
function respawnPlayer(){ php = P().hp; }
function float(t, crit, side){
  const f = document.createElement('div'); f.className = 'f' + (crit?' crit':'');
  f.textContent = t; f.style.left = (side==='p'? 20 : 72) + Math.random()*8 + '%'; f.style.top = 30 + Math.random()*20 + 'px';
  $('floaters').appendChild(f); setTimeout(()=>f.remove(), 800);
}
function gain(exp, meso){
  const pp = P(); S.exp += exp * pp.exp; S.meso += meso * pp.meso;
  while (S.exp >= need(S.lv)) { S.exp -= need(S.lv); S.lv++; php = P().hp; }
}
function kill(){
  chkDaily(); const m = mon(); gain(m.exp, m.meso); S.kills++; S.tk++;
  if (isBoss) { S.daily.boss++; S.week.boss++; } else { S.daily.kills++; S.week.kills++;
    if (S.tk % 300 === 0) { const g = 5 + S.map*2 + S.stage; S.gem += g; say(`🎁 보석 상자! 💎+${g}`); }
    if (Math.random() < .02) { const g = 1 + (S.map >> 1) + (S.stage >> 1); S.gem += g; float('💎+' + g, true, 'm'); } }
  if (isBoss) {
    const g = bossGem(S.map, S.stage); S.gem += g; isBoss = false; S.best = Math.max(S.best, S.map);
    const first = (S.clear[S.map]||0) < S.stage;
    if (first) { S.clear[S.map] = S.stage; say(`스테이지 ${S.stage} 클리어! 💎+${g} (첫 클리어)`); S.gem += g; }
    else say(`보스 처치! 💎+${g}`);
    if (S.stage < STAGES) S.stage++;
    S.kills = 0;
  }
  else if (S.kills % 10 === 0) { isBoss = true; bossT = bossTime(S.stage); }
  spawn();
}
const DT = .1;
function tick(){
  const p = P(), m = MAPS[S.map];
  atkCd -= DT * p.spd;
  if (atkCd <= 0) {
    atkCd = 1;
    const c = Math.random() < p.crit, d = p.atk * (c ? p.cdmg : 1) * (.9 + Math.random()*.2);
    mhp -= d; float(fmt(d), c, 'm');
    $('monster').classList.add('hit'); setTimeout(()=>$('monster').classList.remove('hit'), 150);
    if (mhp <= 0) kill();
  }
  S.party.forEach(id => { if (!id || !S.mates[id] || !MATES[id].cd) return;
    mCd[id] = (mCd[id] ?? MATES[id].cd) - DT;
    if (mCd[id] <= 0) { mCd[id] = MATES[id].cd;
      const d = p.atk * MATES[id].m * mateMul(id) * (.9 + Math.random()*.2);
      mhp -= d; float(MATES[id].e + fmt(d), false, 'm'); if (mhp <= 0) kill(); } });
  petCd -= DT;
  if (petCd <= 0) {
    petCd = 2;
    S.petEq.forEach(id => { if (!id || !S.pets[id]) return;
      const d = p.atk * (.15 + .1*PETS[id].r) * petMul(id);
      mhp -= d; float(PETS[id].e + fmt(d), false, 'm'); });
    if (mhp <= 0) kill();
  }
  const root = jobNodes()[0];
  if (root) {
    skCd -= DT;
    if (skCd <= 0) {
      const [nm, cd, mul, hits] = root.sk; skCd = cd;
      const d = p.atk * mul * hits * p.skill;
      mhp -= d; float(nm + ' ' + fmt(d), true, 'm');
      if (mhp <= 0) kill();
    }
  }
  if (p.regen) php = Math.min(p.hp, php + p.hp * p.regen * DT);
  monCd -= DT;
  if (monCd <= 0) {
    monCd = 1;
    const raw = (m.hp / 32) * Math.pow(DMGG, S.stage-1) * (isBoss ? 1.5 : 1) + m.lv * 2;
    const d = Math.max(1, raw - p.def) * (1 - p.red);
    php -= d; float('-'+fmt(d), false, 'p');
    if (php <= 0) { isBoss = false; S.kills = 0; respawnPlayer(); spawn(); say('쓰러졌습니다... 부활!'); }
  }
  if (isBoss) { bossT -= DT; if (bossT <= 0) { isBoss = false; spawn(); say('보스 시간 초과!'); } }
}

// offline progress
function offline(){
  const sec = Math.min((Date.now() - S.last) / 1000, 8*3600);
  if (sec < 60) return;
  const p = P(), m = MAPS[S.map];
  const dps = p.atk * (1 + p.crit*(p.cdmg-1)) * p.spd;
  const kills = Math.floor(sec * dps / m.hp * .5);
  const og = Math.floor(sec/600); S.gem += og;
  if (kills > 0) { gain(kills*m.exp*.5, kills*m.meso*.5); say(`방치 보상: ${Math.floor(sec/60)}분 · ${fmt(kills)}마리 처치 · 💎${og}`); }
}

function say(t){ $('msg').textContent = t; clearTimeout(say.t); say.t = setTimeout(()=>$('msg').textContent='', 4000); }
function save(){ S.last = Date.now(); try{ localStorage.setItem('mapleIdle', JSON.stringify(S)); }catch(e){} }

// 장비 종류 = 부위:등급. 중복은 개수로 쌓이고, 5개마다 1성 승급
const STARMAX = 5, STARUP = 5, STARBONUS = .5;
const kslot = k => k.split(':')[0], kr = k => +k.split(':')[1];
const starOf = k => S.items[k] ? S.items[k].star : 0;
const kindPow = k => Math.round((ITEM[kslot(k)].tbl ? ITEM[kslot(k)].tbl[kr(k)] : ITEM[kslot(k)].base * RARITY[kr(k)].mul) * (1 + STARBONUS*starOf(k)));
const kindName = k => ITEM[kslot(k)].names[kr(k)];
// gacha
function roll(minR){
  let r = Math.random()*100, i = 0;
  for (; i < RARITY.length; i++) { r -= RARITY[i].rate; if (r < 0) break; }
  return Math.max(Math.min(i, 4), minR||0);
}
function pullOne(minR){
  S.pulls++; S.pity++; S.pity10++;
  let r = roll(minR);
  if (S.pity >= 100) r = 4;
  else if (S.pity10 >= 10 && r < 2) r = 2;
  if (r >= 4) S.pity = 0;
  if (r >= 2) S.pity10 = 0;
  const slot = GEAR[Math.floor(Math.random()*GEAR.length)].k, key = slot + ':' + r;
  const isNew = !S.items[key];
  if (isNew) S.items[key] = {n:0, star:0};
  S.items[key].n++;
  const cur = S.equip[slot];
  let eq = false;
  if (!cur || kindPow(key) > kindPow(cur)) { S.equip[slot] = key; eq = true; }
  return {key, isNew, eq};
}
function pull(n){
  const cost = n === 10 ? PULL10 : PULL1;
  if (S.gem < cost) return;
  S.gem -= cost; S.lastPull = [];
  for (let i = 0; i < n; i++) S.lastPull.push(pullOne(n === 10 && i === 9 ? 1 : 0));
  renderTab();
}
const statTxt = k => PCT[kslot(k)] ? `${PCT[kslot(k)]}${kindPow(k)}%` : `${GEAR.find(g=>g.k===kslot(k)).stat} +${fmt(kindPow(k))}`;
const HOLD = .35, PETHOLD = .7;
function hold(){ const o = {weapon:0,hat:0,armor:0,shoes:0,gloves:0,cape:0,ring:0,neck:0}; Object.keys(S.items).forEach(k => { if (S.equip[kslot(k)] !== k) o[kslot(k)] += kindPow(k)*HOLD; }); return o; }
const holdTxt = H => `공격력 +${fmt(H.weapon)} · HP +${fmt(H.hat)} · 방어 +${fmt(H.armor)} · 공속 +${H.shoes.toFixed(1)}% · 크리율 +${H.gloves.toFixed(1)}% · 피해 -${H.cape.toFixed(1)}% · 크뎀 +${H.ring.toFixed(1)}% · 메소·경험치 +${H.neck.toFixed(1)}%`;
const itemHtml = k => `<span style="color:${RARITY[kr(k)].c};font-weight:700">[${RARITY[kr(k)].n}] ${kindName(k)}${starOf(k) ? ' ' + '★'.repeat(starOf(k)) : ''}</span> <small>${statTxt(k)}</small>`;

// DPS 추정 (내 공격 + 스킬 / 동료 / 펫)
function dpsInfo(){
  const p = P(), root = jobNodes()[0];
  const me = p.atk * (1 + p.crit*(p.cdmg-1)) * p.spd + (root ? p.atk*root.sk[2]*root.sk[3]*p.skill/root.sk[1] : 0);
  let mate = 0, pet = 0;
  S.party.forEach(id => { if (id && S.mates[id] && MATES[id].cd) mate += p.atk*MATES[id].m*mateMul(id)/MATES[id].cd; });
  S.petEq.forEach(id => { if (id && S.pets[id]) pet += p.atk*(.15+.1*PETS[id].r)*petMul(id)/2; });
  return {me, mate, pet, total: me+mate+pet};
}
// mate gacha
function pullMate(minR){
  S.mpulls++; S.mpity++;
  let r = roll(minR); if (S.mpity >= 80) r = 4;
  if (r >= 4) S.mpity = 0;
  const pool = Object.keys(MATES).filter(k => MATES[k].r === r);
  const id = pool[Math.floor(Math.random()*pool.length)];
  const isNew = !S.mates[id];
  if (isNew) { S.mates[id] = {lv:1, sh:0}; const sl = S.party.indexOf(null); if (sl >= 0) S.party[sl] = id; }
  else S.mates[id].sh++;
  return {id, isNew};
}
function recruit(n){
  const cost = n === 10 ? MATE10 : MATE1;
  if (S.gem < cost) return;
  S.gem -= cost; S.lastMate = [];
  for (let i = 0; i < n; i++) S.lastMate.push(pullMate(n === 10 && i === 9 ? 1 : 0));
  renderTab();
}
// pet gacha
function pullPet(minR){
  S.ppulls++; S.ppity++;
  let r = roll(minR); if (S.ppity >= 80) r = 4;
  if (r >= 4) S.ppity = 0;
  const pool = Object.keys(PETS).filter(k => PETS[k].r === r);
  const id = pool[Math.floor(Math.random()*pool.length)];
  const isNew = !S.pets[id];
  if (isNew) { S.pets[id] = {lv:1, sh:0}; const slot = S.petEq.indexOf(null); if (slot >= 0 && slot < PETSLOT) S.petEq[slot] = id; }
  else S.pets[id].sh++;
  return {id, isNew};
}
function eggs(n){
  const cost = n === 10 ? PET10 : PET1;
  if (S.gem < cost) return;
  S.gem -= cost; S.lastEgg = [];
  for (let i = 0; i < n; i++) S.lastEgg.push(pullPet(n === 10 && i === 9 ? 1 : 0));
  renderTab();
}
// 보석 수급: 출석 / 일일 퀘스트 / 업적 / 드롭 / 방치
const today = () => new Date().toLocaleDateString('sv');
const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - (d.getDay()+6)%7); return d.toLocaleDateString('sv'); };
function chkDaily(){
  if (S.daily.d !== today()) S.daily = {d:today(), kills:0, boss:0, enh:0, claim:{}};
  if (S.week.d !== weekKey()) S.week = {d:weekKey(), kills:0, boss:0, enh:0, claim:{}};
  if (S.ex.d !== today()) S.ex = {d:today(), n:0};
}
const WQ = [
  {id:'kills', name:'몬스터 3,000마리 처치', goal:3000, gem:40},
  {id:'boss',  name:'보스 40회 처치',        goal:40,   gem:50},
  {id:'enh',   name:'장비 강화 100회 시도',  goal:100,  gem:30},
];
// 보석 광산: 메소로 확장, 자리를 비운 동안에도 생산 (최대 8시간 보관)
const MINEMAX = 25, MINECAP = 8*3600;
const mineRate = () => S.mine.lv * .8;   // 시간당 💎
const minePending = () => S.mine.lv ? Math.floor(Math.min(MINECAP, (Date.now() - S.mine.t)/1000) * mineRate() / 3600) : 0;
const mineCost = () => Math.floor(20000 * Math.pow(1.45, S.mine.lv));
// 메소→보석 교환소 (하루 10회, 살수록 가격 상승)
const EXMAX = 10;
const exPrice = () => Math.floor((2000 + S.lv*300) * Math.pow(1.2, S.ex.n));
const DQ = [
  {id:'kills', name:'몬스터 200마리 처치', goal:200, gem:10},
  {id:'boss',  name:'보스 5회 처치',       goal:5,   gem:15},
  {id:'enh',   name:'장비 강화 10회 시도', goal:10,  gem:10},
];
const sum = o => Object.values(o).reduce((a,b)=>a+b, 0);
const ACH = [];
[[10,10],[30,20],[50,30],[80,50],[100,80],[150,120],[200,200]].forEach(([g,v]) => ACH.push({id:'lv'+g, name:`레벨 ${g} 달성`, goal:g, gem:v, cur:()=>S.lv}));
[[10,20],[40,40],[80,100]].forEach(([g,v]) => ACH.push({id:'cl'+g, name:`스테이지 ${g}개 클리어`, goal:g, gem:v, cur:()=>sum(S.clear)}));
[[1000,20],[10000,60],[100000,200]].forEach(([g,v]) => ACH.push({id:'tk'+g, name:`몬스터 ${fmt(g)}마리 처치`, goal:g, gem:v, cur:()=>S.tk}));
[[4,30],[8,80],[16,200]].forEach(([g,v]) => ACH.push({id:'pet'+g, name:`펫 ${g}종 수집`, goal:g, gem:v, cur:()=>Object.keys(S.pets).length}));
[[4,30],[8,80],[16,200]].forEach(([g,v]) => ACH.push({id:'mt'+g, name:`동료 ${g}명 수집`, goal:g, gem:v, cur:()=>Object.keys(S.mates).length}));
[[1,10],[5,30],[15,80]].forEach(([g,v]) => ACH.push({id:'st'+g, name:`장비 승급 ${g}회`, goal:g, gem:v, cur:()=>Object.values(S.items).reduce((a,b)=>a+b.star,0)}));
const claimable = () => { chkDaily(); let n = S.daily.login ? 0 : 1;
  DQ.forEach(q => { if (S.daily[q.id] >= q.goal && !S.daily.claim[q.id]) n++; });
  WQ.forEach(q => { if (S.week[q.id] >= q.goal && !S.week.claim[q.id]) n++; });
  if (minePending() >= 1) n++;
  ACH.forEach(a => { if (a.cur() >= a.goal && !S.ach[a.id]) n++; }); return n; };
// UI
let tab = 'stats';
function renderMaps(){
  $('maps').innerHTML = '';
  MAPS.forEach((m,i) => {
    const b = document.createElement('button');
    b.textContent = m.e + ' Lv.' + m.lv;
    b.disabled = S.lv < m.lv || i === S.map;
    b.onclick = () => { S.map = i; S.stage = Math.min(STAGES, (S.clear[i]||0)+1); isBoss = false; S.kills = 0; spawn(); renderMaps(); };
    $('maps').appendChild(b);
  });
  const st = $('stages'); st.innerHTML = '';
  const open = Math.min(STAGES, (S.clear[S.map]||0)+1);
  for (let i = 1; i <= STAGES; i++) {
    const b = document.createElement('button');
    b.textContent = i; b.disabled = i > open; if (i === S.stage) b.className = 'cur';
    b.onclick = () => { S.stage = i; isBoss = false; S.kills = 0; spawn(); renderMaps(); };
    st.appendChild(b);
  }
}
function renderTab(){
  const el = $('tab'); let h = '';
  if (tab === 'stats') {
    const p = P(), D = dpsInfo(), pc = x => (x*100).toFixed(1).replace(/\.0$/,'') + '%';
    const rows = [['공격력', fmt(p.atk)], ['HP', fmt(p.hp)], ['방어', fmt(p.def)], ['공격속도', '+' + pc(p.spd-1)],
      ['크리율', pc(p.crit)], ['크리 데미지', pc(p.cdmg)], ['메소 획득', '+' + pc(p.meso-1)], ['경험치 획득', '+' + pc(p.exp-1)],
      ['받는 피해', '-' + pc(p.red)], ['HP 회복/초', pc(p.regen)],
      ['내 DPS', fmt(D.me)], ['동료 DPS', fmt(D.mate) + ' (' + Math.round(D.mate/D.total*100) + '%)'], ['펫 DPS', fmt(D.pet)], ['총 DPS', fmt(D.total)]];
    h += '<div class="sg">' + rows.map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('') + '</div><hr>';
    STATS.forEach(s => {
      const c = upCost(s), maxed = s.max && S.stat[s.k] >= s.max;
      h += `<div class="row"><div><b>${s.name}</b> Lv.${S.stat[s.k]}<small>${s.desc}</small></div>
        <span><button data-s="${s.k}" ${S.meso<c||maxed?'disabled':''}>💰${fmt(c)}</button> <button data-s10="${s.k}" ${S.meso<c||maxed?'disabled':''}>×10 💰${fmt(bulkCost(s,10))}</button></span></div>`;
    });
  } else if (tab === 'gear') {
    GEAR.forEach(g => { const e = S.equip[g.k]; h += `<div class="row"><div>${g.e} ${e ? itemHtml(e) : '<small>미장착</small>'}</div></div>`; });
    h += `<small>보유효과 (장착하지 않은 보유 장비 ${HOLD*100}%): ${holdTxt(hold())}</small><hr>`;
    GEAR.forEach(g => {
      const c = gearCost(g.k);
      h += `<div class="row"><div>${g.e} <b>${g.name} +${S.gear[g.k]}</b><small>${g.stat} +${g.per}/강 · 성공 ${Math.round(gearRate(g.k)*100)}%</small></div>
        <button data-g="${g.k}" ${S.meso<c?'disabled':''}>강화 💰${fmt(c)}</button></div>`;
    });
    const keys = Object.keys(S.items).sort((a,b)=>GEAR.findIndex(g=>g.k===kslot(a))-GEAR.findIndex(g=>g.k===kslot(b)) || kr(b)-kr(a));
    h += `<hr><div class="row"><div><b>보유 장비 (${keys.length}종)</b><small>같은 장비 ${STARUP}개를 모으면 1성 승급 (최대 ${STARMAX}성, 성당 능력치 +${STARBONUS*100}%)</small></div></div>`;
    keys.forEach(k => { const it = S.items[k], eq = S.equip[kslot(k)] === k, up = it.n >= STARUP && it.star < STARMAX;
      h += `<div class="row"><div>${GEAR.find(g=>g.k===kslot(k)).e} ${itemHtml(k)}<small>보유 ${it.n}/${it.star < STARMAX ? STARUP : 'MAX'}${eq ? ' · 장착 중' : ' · 보유효과 ' + (PCT[kslot(k)] ? '+' + (kindPow(k)*HOLD).toFixed(1) + '%' : '+' + fmt(kindPow(k)*HOLD))}</small></div>
        <span><button data-star="${k}" ${up?'':'disabled'}>승급</button> <button data-eq="${k}" ${eq?'disabled':''}>장착</button></span></div>`; });
  } else if (tab === 'reward') {
    chkDaily();
    h += `<div class="row"><b>💎 보석 얻는 법</b><div>💎 ${S.gem}</div></div>`;
    h += `<small>· 보스 처치 (스테이지가 높을수록 크게 ↑, 첫 클리어 2배)<br>· 일반 몬스터 처치 시 2% 드롭 / 300마리마다 🎁 보석 상자<br>· 보석 광산 · 메소 교환소 (반복) · 출석 · 일일/주간 퀘스트 · 업적<br>· 자리 비운 10분마다 💎1 (최대 8시간)</small><hr>`;
    // 보석 광산
    const pend = minePending(), mc = mineCost();
    h += `<div class="row"><div><b>⛏️ 보석 광산 Lv.${S.mine.lv}/${MINEMAX}</b><small>시간당 💎${mineRate().toFixed(1)} · 쌓인 보석 💎${pend} (최대 ${(mineRate()*8).toFixed(0)})</small></div>
      <span><button data-mine="claim" ${pend>=1?'':'disabled'}>수령 💎${pend}</button> <button data-mine="up" ${S.mine.lv>=MINEMAX||S.meso<mc?'disabled':''}>${S.mine.lv>=MINEMAX?'MAX':'확장 💰'+fmt(mc)}</button></span></div>`;
    // 교환소
    h += `<div class="row"><div><b>💱 메소 교환소</b><small>💎1 = 💰${fmt(exPrice())} · 오늘 ${S.ex.n}/${EXMAX}</small></div><button data-mine="ex" ${S.ex.n>=EXMAX||S.meso<exPrice()?'disabled':''}>교환</button></div>`;
    h += `<small>🎁 다음 보석 상자까지 ${300 - S.tk % 300}마리</small><hr>`;
    h += `<div class="row"><div><b>출석 보상</b><small>하루 한 번 💎20</small></div><button data-claim="login" ${S.daily.login?'disabled':''}>${S.daily.login?'완료':'받기 💎20'}</button></div>`;
    h += '<hr><b>일일 퀘스트</b>';

    DQ.forEach(q => { const c = Math.min(S.daily[q.id]||0, q.goal), done = c >= q.goal, got = S.daily.claim[q.id];
      h += `<div class="row"><div>${q.name}<small>${c}/${q.goal}</small></div><button data-claim="q:${q.id}" ${done && !got ? '' : 'disabled'}>${got ? '완료' : '💎' + q.gem}</button></div>`; });
    h += '<hr><b>주간 퀘스트</b> <small>(월요일 초기화)</small>';
    WQ.forEach(q => { const c = Math.min(S.week[q.id]||0, q.goal), done = c >= q.goal, got = S.week.claim[q.id];
      h += `<div class="row"><div>${q.name}<small>${fmt(c)}/${fmt(q.goal)}</small></div><button data-claim="w:${q.id}" ${done && !got ? '' : 'disabled'}>${got ? '완료' : '💎' + q.gem}</button></div>`; });
    h += '<hr><b>업적</b>';
    ACH.slice().sort((a,b)=>(S.ach[a.id]?1:0)-(S.ach[b.id]?1:0)).forEach(a => { const c = Math.min(a.cur(), a.goal), done = c >= a.goal, got = S.ach[a.id];
      h += `<div class="row" style="${got?'opacity:.5':''}"><div>${a.name}<small>${fmt(c)}/${fmt(a.goal)}</small></div><button data-claim="a:${a.id}" ${done && !got ? '' : 'disabled'}>${got ? '완료' : '💎' + a.gem}</button></div>`; });
  } else if (tab === 'job') {
    const ns = jobNodes(), tier = ns.length, kids = jobKids();
    h += `<div class="row"><div><b>현재 직업: ${tier ? ns.map(n=>n.n).join(' → ') : '모험가'}</b>` +
      (tier ? `<small>${ns[0].e} 스킬: ${ns[0].sk[0]} (${ns[0].sk[1]}초마다 ×${ns[0].sk[2]*ns[0].sk[3]*jm().skill > 0 ? (ns[0].sk[2]*ns[0].sk[3]*jm().skill).toFixed(1) : ''} 데미지, 자동 발동)</small>` : '<small>Lv.10에 1차 전직할 수 있습니다.</small>') + '</div></div>';
    if (tier >= 4) h += '<small>최종 전직 완료!</small>';
    else if (S.lv < JOB_LV[tier]) h += `<small>${tier+1}차 전직: Lv.${JOB_LV[tier]} 필요 (현재 Lv.${S.lv})</small>`;
    else {
      h += `<b>${tier+1}차 전직 선택</b>`;
      Object.keys(kids).forEach(id => { const n = kids[id];
        h += `<div class="row"><div>${n.e||''} <b>${n.n}</b><small>${modTxt(n.m)}${n.sk ? '<br>스킬: ' + n.sk[0] : ''}</small></div><button data-job="${id}">전직</button></div>`; });
    }
    h += '';
  } else if (tab === 'mate') {
    h += `<div class="row"><div><b>파티 (${PARTY}칸)</b></div><div>💎 ${S.gem}</div></div>`;
    for (let i = 0; i < PARTY; i++) { const id = S.party[i];
      h += `<div class="row"><div>${id ? MATES[id].e + ' <b style="color:'+RARITY[MATES[id].r].c+'">' + MATES[id].n + ' Lv.' + mateLv(id) + '</b><small>' + MATES[id].role + ' · ' + mateTxt(id) + '</small>' : '<small>빈 칸</small>'}</div>${id ? `<button data-mu="${i}">해제</button>` : ''}</div>`; }
    { const D = dpsInfo(); h += `<div class="row"><div><b>파티 DPS ${fmt(D.mate)}</b><small>전체 DPS ${fmt(D.total)} 중 ${Math.round(D.mate/D.total*100)}%</small></div></div>`; }
    h += `<small>보유효과: 파티에 넣지 않은 동료도 능력치의 ${PETHOLD*100}%가 적용됩니다.<br>도감 ${mateOwned()}/${Object.keys(MATES).length}명 → 공격력 +${mateOwned()*5}% · 메소 +${mateOwned()*8}%</small><hr>`;
    h += `<div class="row"><div><b>동료 소환</b><small>천장 ${S.mpity}/80 (레전더리 보장) · 총 ${S.mpulls}회</small></div></div>`;
    h += '<table class="rates"><tr>' + RARITY.map((r,i)=>{ const n = Object.values(MATES).filter(p=>p.r===i).length; return `<td style="color:${r.c}"><b>${r.n}</b><br>${r.rate}%<br><small>명당 ${(r.rate/n).toFixed(1)}%</small></td>`; }).join('') + '</tr></table>';
    h += `<div class="row"><button id="m1" ${S.gem<MATE1?'disabled':''}>1회 💎${MATE1}</button><button id="m10" ${S.gem<MATE10?'disabled':''}>10회 💎${MATE10} (레어↑ 1명 보장)</button></div>`;
    if (S.lastMate.length) h += '<small>결과: ' + S.lastMate.map(x => `${MATES[x.id].e}${MATES[x.id].n}${x.isNew?'(NEW)':''}`).join(', ') + '</small>';
    h += '<hr><b>도감</b>';
    Object.keys(MATES).sort((a,b)=>MATES[b].r-MATES[a].r).forEach(id => { const m = MATES[id], o = S.mates[id];
      if (!o) { h += `<div class="row"><div style="opacity:.45">❔ ${m.n}<small>${RARITY[m.r].n} · ${m.role} · 미획득</small></div></div>`; return; }
      const can = o.sh >= o.lv && o.lv < MATEMAX, inP = S.party.includes(id);
      h += `<div class="row"><div>${m.e} <b style="color:${RARITY[m.r].c}">${m.n}</b> Lv.${o.lv}<small>${m.role} · ${inP ? mateTxt(id) : '보유효과 ' + mateTxt(id, PETHOLD)}<br>조각 ${o.sh}/${o.lv < MATEMAX ? o.lv : 'MAX'}</small></div>
        <span><button data-ml="${id}" ${can?'':'disabled'}>강화</button> <button data-mp="${id}" ${inP?'disabled':''}>편성</button></span></div>`; });
  } else if (tab === 'pet') {
    h += `<div class="row"><div><b>장착 중 (${PETSLOT}칸)</b></div><div>💎 ${S.gem}</div></div>`;
    for (let i = 0; i < PETSLOT; i++) { const id = S.petEq[i];
      h += `<div class="row"><div>${id ? PETS[id].e + ' <b style="color:'+RARITY[PETS[id].r].c+'">'+PETS[id].n+' Lv.'+petLv(id)+'</b><small>'+petTxt(id)+' · 2초마다 자동 공격</small>' : '<small>빈 칸</small>'}</div>${id ? `<button data-un="${i}">해제</button>` : ''}</div>`; }
    h += `<small>보유효과: 장착하지 않은 펫도 능력치의 ${PETHOLD*100}%가 적용됩니다.<br>도감 ${petOwned()}/${Object.keys(PETS).length}종 → 공격력 +${petOwned()*5}% · 경험치 +${petOwned()*4}%</small>`;
    h += '<hr>';
    h += `<div class="row"><div><b>펫 알 뽑기</b><small>천장 ${S.ppity}/80 (레전더리 보장) · 총 ${S.ppulls}회</small></div></div>`;
    h += '<table class="rates"><tr>' + RARITY.map((r,i)=>{ const n = Object.values(PETS).filter(p=>p.r===i).length; return `<td style="color:${r.c}"><b>${r.n}</b><br>${r.rate}%<br><small>종당 ${(r.rate/n).toFixed(1)}%</small></td>`; }).join('') + '</tr></table>';
    h += `<div class="row"><button id="e1" ${S.gem<PET1?'disabled':''}>1회 💎${PET1}</button><button id="e10" ${S.gem<PET10?'disabled':''}>10회 💎${PET10} (레어↑ 1개 보장)</button></div>`;
    if (S.lastEgg.length) h += '<small>결과: ' + S.lastEgg.map(x => `${PETS[x.id].e}${PETS[x.id].n}${x.isNew?'(NEW)':''}`).join(', ') + '</small>';
    h += '<hr><b>도감</b>';
    Object.keys(PETS).sort((a,b)=>PETS[b].r-PETS[a].r).forEach(id => { const p = PETS[id], o = S.pets[id];
      if (!o) { h += `<div class="row"><div style="opacity:.45">❔ ${p.n}<small>${RARITY[p.r].n} · 미발견</small></div></div>`; return; }
      const need = o.lv, can = o.sh >= need && o.lv < PETMAX, eq = S.petEq.includes(id);
      h += `<div class="row"><div>${p.e} <b style="color:${RARITY[p.r].c}">${p.n}</b> Lv.${o.lv}<small>${eq ? petTxt(id) : '보유효과 ' + petTxt(id, PETHOLD)}<br>조각 ${o.sh}/${o.lv < PETMAX ? need : 'MAX'}</small></div>
        <span><button data-pl="${id}" ${can?'':'disabled'}>강화</button> <button data-pe="${id}" ${eq?'disabled':''}>장착</button></span></div>`; });
  } else if (tab === 'gacha') {
    h += `<div class="row"><div><b>장비 뽑기</b><small>천장: 10회 안에 에픽↑ 보장 · 100회 레전더리 보장 (현재 ${S.pity10}/10 · ${S.pity}/100)</small></div><div>💎 ${S.gem}</div></div>`;
    h += '<table class="rates"><tr>' + RARITY.map(r=>`<td style="color:${r.c}"><b>${r.n}</b><br>${r.rate}%</td>`).join('') + '</tr></table>';
    h += `<div class="row"><button id="p1" ${S.gem<PULL1?'disabled':''}>1회 💎${PULL1}</button><button id="p10" ${S.gem<PULL10?'disabled':''}>10회 💎${PULL10} (레어↑ 1개 보장)</button></div>`;
    h += `<small>💎는 보스 처치(첫 클리어 2배)로 얻습니다. 총 ${S.pulls}회 뽑음.</small>`;
    if (S.lastPull.length) h += '<hr>' + S.lastPull.map(x => `<div class="row">${GEAR.find(g=>g.k===kslot(x.key)).e} ${itemHtml(x.key)}${x.isNew?' <b>NEW</b>':''}${x.eq?' <b>★장착</b>':''}</div>`).join('');
  }
  el.innerHTML = h;
  el.querySelectorAll('[data-s10]').forEach(b => b.onclick = () => { const s = STATS.find(x=>x.k===b.dataset.s10);
    for (let i = 0; i < 10; i++) { const c = upCost(s); if (S.meso < c || (s.max && S.stat[s.k] >= s.max)) break; S.meso -= c; S.stat[s.k]++; }
    renderTab(); });
  el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
    const s = STATS.find(x=>x.k===b.dataset.s), c = upCost(s);
    if (S.meso >= c) { S.meso -= c; S.stat[s.k]++; renderTab(); }
  });
  el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
    const k = b.dataset.g, c = gearCost(k);
    if (S.meso < c) return; S.meso -= c; chkDaily(); S.daily.enh++; S.week.enh++;
    if (Math.random() < gearRate(k)) { S.gear[k]++; say('강화 성공!'); } else say('강화 실패...');
    renderTab();
  });
  el.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => { const k = b.dataset.eq; S.equip[kslot(k)] = k; renderTab(); });
  el.querySelectorAll('[data-mine]').forEach(b => b.onclick = () => { chkDaily(); const t = b.dataset.mine;
    if (t === 'claim') { const g = minePending(); if (g >= 1) { S.gem += g; S.mine.t = Date.now(); say('광산 수령 💎+' + g); } }
    else if (t === 'up') { const c = mineCost(); if (S.mine.lv < MINEMAX && S.meso >= c) { if (S.mine.lv === 0) S.mine.t = Date.now(); else { const g = minePending(); S.gem += g; S.mine.t = Date.now(); } S.meso -= c; S.mine.lv++; } }
    else if (t === 'ex') { const c = exPrice(); if (S.ex.n < EXMAX && S.meso >= c) { S.meso -= c; S.ex.n++; S.gem++; } }
    renderTab(); });
  el.querySelectorAll('[data-claim]').forEach(b => b.onclick = () => { const [t, id] = b.dataset.claim.split(':'); chkDaily();
    if (t === 'login' && !S.daily.login) { S.daily.login = true; S.gem += 20; }
    else if (t === 'q') { const q = DQ.find(x=>x.id===id); if (S.daily[id] >= q.goal && !S.daily.claim[id]) { S.daily.claim[id] = true; S.gem += q.gem; } }
    else if (t === 'w') { const q = WQ.find(x=>x.id===id); if (S.week[id] >= q.goal && !S.week.claim[id]) { S.week.claim[id] = true; S.gem += q.gem; } }
    else if (t === 'a') { const a = ACH.find(x=>x.id===id); if (a.cur() >= a.goal && !S.ach[id]) { S.ach[id] = true; S.gem += a.gem; } }
    renderTab(); });
  el.querySelectorAll('[data-star]').forEach(b => b.onclick = () => { const it = S.items[b.dataset.star];
    if (it.n >= STARUP && it.star < STARMAX) { it.n -= STARUP; it.star++; say('승급! ' + it.star + '성'); renderTab(); } });
  if ($('p1')) $('p1').onclick = () => pull(1);
  if ($('p10')) $('p10').onclick = () => pull(10);
  el.querySelectorAll('[data-job]').forEach(b => b.onclick = () => {
    if (S.lv < JOB_LV[S.job.length]) return;
    S.job.push(b.dataset.job); skCd = 3; php = P().hp; say('전직 완료!'); renderTab(); });
  el.querySelectorAll('[data-un]').forEach(b => b.onclick = () => { S.petEq[b.dataset.un] = null; renderTab(); });
  el.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => { const o = S.pets[b.dataset.pl];
    if (o.sh >= o.lv && o.lv < PETMAX) { o.sh -= o.lv; o.lv++; renderTab(); } });
  el.querySelectorAll('[data-pe]').forEach(b => b.onclick = () => { const id = b.dataset.pe;
    let slot = S.petEq.slice(0, PETSLOT).indexOf(null); if (slot < 0) slot = 0; S.petEq[slot] = id; renderTab(); });
  if ($('e1')) $('e1').onclick = () => eggs(1);
  if ($('e10')) $('e10').onclick = () => eggs(10);
  el.querySelectorAll('[data-ml]').forEach(b => b.onclick = () => { const o = S.mates[b.dataset.ml];
    if (o.sh >= o.lv && o.lv < MATEMAX) { o.sh -= o.lv; o.lv++; renderTab(); } });
  if ($('m1')) $('m1').onclick = () => recruit(1);
  if ($('m10')) $('m10').onclick = () => recruit(10);
  el.querySelectorAll('[data-mp]').forEach(b => b.onclick = () => { let sl = S.party.indexOf(null); if (sl < 0) sl = 0; S.party[sl] = b.dataset.mp; renderTab(); });
  el.querySelectorAll('[data-mu]').forEach(b => b.onclick = () => { S.party[b.dataset.mu] = null; renderTab(); });
}
function render(){
  const p = P();
  $('lv').textContent = 'Lv.' + S.lv;
  { const n = claimable(), bt = document.querySelector('[data-tab=reward]'); const t = '보상' + (n ? ` (${n})` : ''); if (bt.textContent !== t) bt.textContent = t; }
  $('mateview').textContent = S.party.map(id => id ? MATES[id].e : '').join('');
  $('petview').textContent = S.petEq.map(id => id ? PETS[id].e : '').join('');
  const jn = jobNodes(); $('job').textContent = (jn.length ? jn[jn.length-1].n : '모험가');
  $('meso').textContent = fmt(S.meso); $('gem').textContent = S.gem;
  $('mhpbar').style.width = Math.max(0, mhp/mmax*100) + '%';
  $('phpbar').style.width = Math.max(0, php/p.hp*100) + '%';
  $('expbar').style.width = S.exp/need(S.lv)*100 + '%';
  $('exptext').textContent = `${fmt(S.exp)} / ${fmt(need(S.lv))}`;
  $('mapname').innerHTML = `<b>${MAPS[S.map].name}</b> · 스테이지 ${S.stage}/${STAGES}`;
  $('mname').textContent = isBoss ? `BOSS (${Math.ceil(bossT)}s)` : MAPS[S.map].mon;
  $('stageinfo').textContent = `공격 ${fmt(p.atk)} · HP ${fmt(p.hp)} · 방어 ${fmt(p.def)} · 크리 ${(p.crit*100).toFixed(1)}%/${Math.round(p.cdmg*100)}% · 처치 ${S.kills%10}/10` + (jobNodes()[0] ? ` · ${jobNodes()[0].sk[0]} ${Math.max(0,Math.ceil(skCd))}s` : '');
}
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  tab = b.dataset.tab; document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on', x===b)); renderTab(); });
$('save').onclick = () => { save(); say('저장됨'); };
$('reset').onclick = () => { if (confirm('정말 초기화?')) { localStorage.removeItem('mapleIdle'); S = fresh(); respawnPlayer(); spawn(); renderMaps(); renderTab(); } };

offline(); respawnPlayer(); spawn(); renderMaps(); renderTab();
setInterval(tick, 100);
setInterval(render, 100);
setInterval(renderTab, 1000);
setInterval(renderMaps, 2000);
setInterval(save, 10000);
addEventListener('beforeunload', save);

// 위장 모드: 흑백 축소 화면 + Esc 비상 화면
const TITLE = document.title;
function setStealth(on){
  document.body.classList.toggle('stealth', on);
  document.title = on ? '문서1 - 편집기' : TITLE;
  $('stealth').textContent = on ? '일반 모드' : '위장 모드';
  try { localStorage.setItem('mapleStealth', on ? '1' : ''); } catch(e){}
}
$('stealth').onclick = () => setStealth(!document.body.classList.contains('stealth'));
addEventListener('keydown', e => { if (e.key === 'Escape') $('cover').hidden = !$('cover').hidden; });
document.addEventListener('visibilitychange', () => { if (document.hidden) $('cover').hidden = false; });
try { if (localStorage.getItem('mapleStealth')) setStealth(true); } catch(e){}
