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
];
const RARITY = [
  {n:'일반',     c:'#9aa0a6', rate:55, mul:1},
  {n:'레어',     c:'#3b9cff', rate:28, mul:2},
  {n:'에픽',     c:'#b05cff', rate:12, mul:4},
  {n:'유니크',   c:'#ffb020', rate:4,  mul:8},
  {n:'레전더리', c:'#2ecc71', rate:1,  mul:16},
];
const ITEM = {
  weapon:{base:36,  names:['목검','강철 검','미스릴 대검','엑스칼리버','검은 마법사의 지팡이']},
  hat:   {base:180, names:['털모자','철 투구','마법사 모자','용기사 투구','핑크빈 왕관']},
  armor: {base:18,  names:['천 옷','가죽 갑옷','미스릴 갑옷','용린 갑옷','시간의 갑주']},
  shoes: {base:2,   names:['고무 신발','가죽 부츠','바람의 신발','천둥 부츠','시공의 신발']},
};
// 동료: role dps(공격) / tank(받는 피해 감소) / heal(HP 회복) / buff(공격력·경험치·메소)
const MATES = {
  kai:  {n:'카이',   e:'🛡️', role:'탱커',     lv:5,   cost:500,   cd:3,  m:.4,  b:{red:.08}},
  mira: {n:'미라',   e:'🔮', role:'마법사',   lv:10,  cost:2000,  cd:3,  m:1.3},
  leon: {n:'레온',   e:'🏹', role:'궁수',     lv:20,  cost:2e4,   cd:1.5,m:.5},
  shado:{n:'샤도',   e:'🥷', role:'도적',     lv:35,  cost:3e5,   cd:2,  m:.9,  b:{meso:.10}},
  eri:  {n:'에리',   e:'💚', role:'힐러',     lv:50,  cost:3e6,   b:{regen:.01}},
  luna: {n:'루나',   e:'🎵', role:'음유시인', lv:70,  cost:5e7,   b:{atk:.10,exp:.10}},
  zeno: {n:'제노',   e:'⚙️', role:'기계공학자',lv:100, cost:1e9,   cd:4,  m:3.5, b:{meso:.10}},
};
const MATEBT = {red:'받는 피해 -',regen:'HP 회복/초 +',atk:'공격력 +',exp:'경험치 +',meso:'메소 +'};
const MATEMAX = 50, PARTY = 3;
const mateLv = id => S.mates[id] ? S.mates[id].lv : 0;
const mateMul = id => 1 + .12*(mateLv(id)-1);
const mateCost = id => Math.floor(MATES[id].cost * .3 * Math.pow(1.22, mateLv(id)-1));
function mt(){
  const o = {atk:1,exp:1,meso:1,regen:0,red:0};
  S.party.forEach(id => { if (!id || !S.mates[id]) return; const b = MATES[id].b || {};
    for (const k in b) { const v = b[k]*mateMul(id); if (k === 'red') o.red = Math.min(.5, o.red+v); else if (k === 'regen') o.regen += v; else o[k] += v; } });
  return o;
}
const mateTxt = id => { const m = MATES[id], x = [];
  if (m.cd) x.push(`${m.cd}초마다 공격력 ×${(m.m*mateMul(id)).toFixed(2)} 공격`);
  for (const k in (m.b||{})) x.push(MATEBT[k] + (m.b[k]*mateMul(id)*100).toFixed(1).replace(/\.0$/,'') + '%');
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
  o.atk += .03*n; o.exp += .02*n;
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
  {k:'atk',  name:'공격력 단련', desc:'공격력 +5',  base:50,  g:1.18},
  {k:'hp',   name:'체력 단련',   desc:'최대 HP +40', base:40,  g:1.17},
  {k:'crit', name:'크리티컬',    desc:'크리율 +0.5% (최대 80%)', base:200, g:1.22, max:160},
  {k:'cdmg', name:'크리 데미지', desc:'크뎀 +2%',    base:300, g:1.2},
  {k:'meso', name:'메소 획득',   desc:'메소 +3%',    base:500, g:1.25},
];

const fresh = () => ({lv:1,exp:0,meso:0,gem:0,map:0,kills:0,rebirth:0,stat:{atk:0,hp:0,crit:0,cdmg:0,meso:0},
  gear:{weapon:0,hat:0,armor:0,shoes:0},best:0,last:Date.now(),stage:1,clear:{},job:[],pets:{},mates:{},party:[null,null,null],petEq:[null,null],ppity:0,ppulls:0,lastEgg:[],inv:[],equip:{weapon:null,hat:null,armor:null,shoes:null},pity:0,pity10:0,pulls:0,nid:1,lastPull:[]});
let S = fresh();
try { const raw = localStorage.getItem('mapleIdle'); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch(e){}

const rebMul = () => 1 + S.rebirth * 0.5;
const need = lv => Math.floor(20 * Math.pow(lv, 2.1) * 1.05);
const P = () => {
  const J = jm(), B = pb(), M = mt(), H = hold(), E = S.equip, ep = k => (E[k] ? E[k].pow : 0) + H[k];
  const atk = (10 + S.lv*3 + S.stat.atk*5 + S.gear.weapon*12 + ep('weapon')) * rebMul() * J.atk * B.atk * M.atk;
  return {
    atk,
    hp: (100 + S.lv*20 + S.stat.hp*40 + S.gear.hat*60 + ep('hat')) * rebMul() * J.hp * B.hp,
    def: (S.gear.armor*6 + S.lv + ep('armor')) * J.def,
    crit: Math.min(.8, .05 + S.stat.crit*.005 + J.crit + B.crit),
    cdmg: 1.5 + S.stat.cdmg*.02 + J.cdmg,
    spd: (1 + (S.gear.shoes*2 + ep('shoes'))/100) * J.spd * B.spd,
    meso: (1 + S.stat.meso*.03) * J.meso * B.meso * M.meso, exp: B.exp * M.exp, red: M.red,
    skill: J.skill, regen: J.regen + M.regen,
  };
};
const upCost = (s) => Math.floor(s.base * Math.pow(s.g, S.stat[s.k]));
const gearCost = k => Math.floor(100 * Math.pow(1.35, S.gear[k]));
const gearRate = k => Math.max(.15, 1 - S.gear[k]*.02);

// combat state
const mCd = {};
let petCd = 2, mhp, mmax, php, isBoss = false, bossT = 0, atkCd = 0, monCd = 0, skCd = 3;
const mon = () => {
  const m = MAPS[S.map], boss = isBoss, sm = Math.pow(1.35, S.stage-1), rm = Math.pow(1.25, S.stage-1);
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
  const m = mon(); gain(m.exp, m.meso); S.kills++;
  if (isBoss) {
    const g = 3 + S.map*2 + S.stage; S.gem += g; isBoss = false; S.best = Math.max(S.best, S.map);
    const first = (S.clear[S.map]||0) < S.stage;
    if (first) { S.clear[S.map] = S.stage; say(`스테이지 ${S.stage} 클리어! 💎+${g} (첫 클리어)`); S.gem += g; }
    else say(`보스 처치! 💎+${g}`);
    if (S.stage < STAGES) S.stage++;
    S.kills = 0;
  }
  else if (S.kills % 10 === 0) { isBoss = true; bossT = 30; }
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
    const raw = (m.hp / 32) * Math.pow(1.35, S.stage-1) * (isBoss ? 1.5 : 1) + m.lv * 2;
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
  if (kills > 0) { gain(kills*m.exp*.5, kills*m.meso*.5); say(`방치 보상: ${Math.floor(sec/60)}분 · ${fmt(kills)}마리 처치`); }
}

function say(t){ $('msg').textContent = t; clearTimeout(say.t); say.t = setTimeout(()=>$('msg').textContent='', 4000); }
function save(){ S.last = Date.now(); try{ localStorage.setItem('mapleIdle', JSON.stringify(S)); }catch(e){} }

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
  const slot = GEAR[Math.floor(Math.random()*4)].k, it = ITEM[slot];
  const item = {id:S.nid++, slot, r, name:it.names[r], pow:Math.round(it.base*RARITY[r].mul*(.9+Math.random()*.2))};
  const cur = S.equip[slot];
  if (!cur || item.pow > cur.pow) { if (cur) S.inv.push(cur); S.equip[slot] = item; item.eq = true; }
  else S.inv.push(item);
  return item;
}
function pull(n){
  const cost = n === 10 ? PULL10 : PULL1;
  if (S.gem < cost) return;
  S.gem -= cost; S.lastPull = [];
  for (let i = 0; i < n; i++) S.lastPull.push(pullOne(n === 10 && i === 9 ? 1 : 0));
  renderTab();
}
const statTxt = it => it.slot === 'shoes' ? `공속 +${it.pow}%` : `${GEAR.find(g=>g.k===it.slot).stat} +${fmt(it.pow)}`;
const HOLD = .1, PETHOLD = .3;
function hold(){ const o = {weapon:0,hat:0,armor:0,shoes:0}; S.inv.forEach(it => o[it.slot] += it.pow*HOLD); return o; }
const holdTxt = H => `공격력 +${fmt(H.weapon)} · HP +${fmt(H.hat)} · 방어 +${fmt(H.armor)} · 공속 +${H.shoes.toFixed(1)}%`;
const itemHtml = it => `<span style="color:${RARITY[it.r].c};font-weight:700">[${RARITY[it.r].n}] ${it.name}</span> <small>${statTxt(it)}</small>`;

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
    STATS.forEach(s => {
      const c = upCost(s), maxed = s.max && S.stat[s.k] >= s.max;
      h += `<div class="row"><div><b>${s.name}</b> Lv.${S.stat[s.k]}<small>${s.desc}</small></div>
        <button data-s="${s.k}" ${S.meso<c||maxed?'disabled':''}>💰${fmt(c)}</button></div>`;
    });
  } else if (tab === 'gear') {
    GEAR.forEach(g => { const e = S.equip[g.k]; h += `<div class="row"><div>${g.e} ${e ? itemHtml(e) : '<small>미장착</small>'}</div></div>`; });
    h += `<small>보유효과 (보관함 장비 ${HOLD*100}%): ${holdTxt(hold())}</small><hr>`;
    GEAR.forEach(g => {
      const c = gearCost(g.k);
      h += `<div class="row"><div>${g.e} <b>${g.name} +${S.gear[g.k]}</b><small>${g.stat} +${g.per}/강 · 성공 ${Math.round(gearRate(g.k)*100)}%</small></div>
        <button data-g="${g.k}" ${S.meso<c?'disabled':''}>강화 💰${fmt(c)}</button></div>`;
    });
    const inv = S.inv.slice().sort((a,b)=>b.r-a.r||b.pow-a.pow);
    h += `<hr><div class="row"><div><b>보관함 (${inv.length})</b><small>판매하면 보유효과가 사라집니다</small></div><button id="sellall" ${inv.length?'':'disabled'}>전부 판매</button></div>`;
    inv.slice(0, 30).forEach(it => { h += `<div class="row"><div>${GEAR.find(g=>g.k===it.slot).e} ${itemHtml(it)}</div><span><button data-eq="${it.id}">장착</button> <button data-sell="${it.id}">판매</button></span></div>`; });
    if (inv.length > 30) h += `<small>…외 ${inv.length-30}개</small>`;
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
    h += '<hr><small>환생하면 전직이 초기화되어 다시 선택할 수 있습니다.</small>';
  } else if (tab === 'mate') {
    h += `<div class="row"><b>파티 (${PARTY}칸)</b><small>환생하면 동료가 초기화됩니다</small></div>`;
    for (let i = 0; i < PARTY; i++) { const id = S.party[i];
      h += `<div class="row"><div>${id ? MATES[id].e + ' <b>' + MATES[id].n + ' Lv.' + mateLv(id) + '</b><small>' + MATES[id].role + ' · ' + mateTxt(id) + '</small>' : '<small>빈 칸</small>'}</div>${id ? `<button data-mu="${i}">해제</button>` : ''}</div>`; }
    h += '<hr>';
    Object.keys(MATES).forEach(id => { const m = MATES[id], o = S.mates[id];
      if (!o) { const ok = S.lv >= m.lv;
        h += `<div class="row"><div>${ok ? m.e : '❔'} <b>${ok ? m.n : '???'}</b> <small>${m.role} · 영입 Lv.${m.lv}</small></div><button data-mr="${id}" ${ok && S.meso >= m.cost ? '' : 'disabled'}>영입 💰${fmt(m.cost)}</button></div>`; return; }
      const c = mateCost(id), inP = S.party.includes(id);
      h += `<div class="row"><div>${m.e} <b>${m.n}</b> Lv.${o.lv} <small>${m.role} · ${mateTxt(id)}</small></div>
        <span><button data-ml="${id}" ${o.lv >= MATEMAX || S.meso < c ? 'disabled' : ''}>${o.lv >= MATEMAX ? 'MAX' : '강화 💰' + fmt(c)}</button> <button data-mp="${id}" ${inP ? 'disabled' : ''}>편성</button></span></div>`; });
  } else if (tab === 'pet') {
    h += `<div class="row"><div><b>장착 중 (${PETSLOT}칸)</b></div><div>💎 ${S.gem}</div></div>`;
    for (let i = 0; i < PETSLOT; i++) { const id = S.petEq[i];
      h += `<div class="row"><div>${id ? PETS[id].e + ' <b style="color:'+RARITY[PETS[id].r].c+'">'+PETS[id].n+' Lv.'+petLv(id)+'</b><small>'+petTxt(id)+' · 2초마다 자동 공격</small>' : '<small>빈 칸</small>'}</div>${id ? `<button data-un="${i}">해제</button>` : ''}</div>`; }
    h += `<small>보유효과: 장착하지 않은 펫도 능력치의 ${PETHOLD*100}%가 적용됩니다.<br>도감 ${petOwned()}/${Object.keys(PETS).length}종 → 공격력 +${petOwned()*3}% · 경험치 +${petOwned()*2}%</small>`;
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
    if (S.lastPull.length) h += '<hr>' + S.lastPull.map(it => `<div class="row">${GEAR.find(g=>g.k===it.slot).e} ${itemHtml(it)}${it.eq?' <b>★장착</b>':''}</div>`).join('');
  } else {
    const gain = Math.floor(S.lv/20);
    h = `<div class="row"><div><b>환생 ${S.rebirth}회</b><small>모든 스탯 ×${rebMul().toFixed(1)} (환생마다 +0.5)<br>레벨·메소·강화·스테이지 초기화, 💎·장비 유지</small></div>
      <button id="rb" ${S.lv<30?'disabled':''}>환생 (Lv.30↑)</button></div>`;
  }
  el.innerHTML = h;
  el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
    const s = STATS.find(x=>x.k===b.dataset.s), c = upCost(s);
    if (S.meso >= c) { S.meso -= c; S.stat[s.k]++; renderTab(); }
  });
  el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
    const k = b.dataset.g, c = gearCost(k);
    if (S.meso < c) return; S.meso -= c;
    if (Math.random() < gearRate(k)) { S.gear[k]++; say('강화 성공!'); } else say('강화 실패...');
    renderTab();
  });
  el.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => {
    const i = S.inv.findIndex(x=>x.id==b.dataset.eq), it = S.inv[i], cur = S.equip[it.slot];
    S.inv.splice(i,1); if (cur) S.inv.push(cur); S.equip[it.slot] = it; renderTab(); });
  el.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => {
    const i = S.inv.findIndex(x=>x.id==b.dataset.sell), it = S.inv[i];
    S.meso += it.pow*30*(it.r+1); S.inv.splice(i,1); renderTab(); });
  if ($('sellall')) $('sellall').onclick = () => { S.inv.forEach(it => S.meso += it.pow*30*(it.r+1)); S.inv = []; say('보관함을 모두 판매'); renderTab(); };
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
  el.querySelectorAll('[data-mr]').forEach(b => b.onclick = () => { const id = b.dataset.mr, m = MATES[id];
    if (S.lv < m.lv || S.meso < m.cost || S.mates[id]) return;
    S.meso -= m.cost; S.mates[id] = {lv:1}; const sl = S.party.indexOf(null); if (sl >= 0) S.party[sl] = id; say(m.n + ' 영입!'); renderTab(); });
  el.querySelectorAll('[data-ml]').forEach(b => b.onclick = () => { const id = b.dataset.ml, c = mateCost(id);
    if (S.meso >= c && mateLv(id) < MATEMAX) { S.meso -= c; S.mates[id].lv++; renderTab(); } });
  el.querySelectorAll('[data-mp]').forEach(b => b.onclick = () => { let sl = S.party.indexOf(null); if (sl < 0) sl = 0; S.party[sl] = b.dataset.mp; renderTab(); });
  el.querySelectorAll('[data-mu]').forEach(b => b.onclick = () => { S.party[b.dataset.mu] = null; renderTab(); });
  const rb = $('rb');
  if (rb) rb.onclick = () => { if (confirm('환생하시겠습니까?')) {
    const keep = {rebirth:S.rebirth+1, gem:S.gem, best:S.best, inv:S.inv, equip:S.equip, pity:S.pity, pity10:S.pity10, pulls:S.pulls, nid:S.nid, pets:S.pets, petEq:S.petEq, ppity:S.ppity, ppulls:S.ppulls};
    S = Object.assign(fresh(), keep); isBoss=false; respawnPlayer(); spawn(); renderMaps(); renderTab(); } };
}
function render(){
  const p = P();
  $('lv').textContent = 'Lv.' + S.lv;
  $('mateview').textContent = S.party.map(id => id ? MATES[id].e : '').join('');
  $('petview').textContent = S.petEq.map(id => id ? PETS[id].e : '').join('');
  const jn = jobNodes(); $('job').textContent = (jn.length ? jn[jn.length-1].n : '모험가') + (S.rebirth ? ` (환생 ${S.rebirth})` : '');
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
