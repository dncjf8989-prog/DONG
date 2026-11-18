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
const PULL1 = 5, PULL10 = 45, STAGES = 10;
const STATS = [
  {k:'atk',  name:'공격력 단련', desc:'공격력 +5',  base:50,  g:1.18},
  {k:'hp',   name:'체력 단련',   desc:'최대 HP +40', base:40,  g:1.17},
  {k:'crit', name:'크리티컬',    desc:'크리율 +0.5% (최대 80%)', base:200, g:1.22, max:160},
  {k:'cdmg', name:'크리 데미지', desc:'크뎀 +2%',    base:300, g:1.2},
  {k:'meso', name:'메소 획득',   desc:'메소 +3%',    base:500, g:1.25},
];

const fresh = () => ({lv:1,exp:0,meso:0,gem:0,map:0,kills:0,rebirth:0,stat:{atk:0,hp:0,crit:0,cdmg:0,meso:0},
  gear:{weapon:0,hat:0,armor:0,shoes:0},best:0,last:Date.now(),stage:1,clear:{},inv:[],equip:{weapon:null,hat:null,armor:null,shoes:null},pity:0,pity10:0,pulls:0,nid:1,lastPull:[]});
let S = fresh();
try { const raw = localStorage.getItem('mapleIdle'); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch(e){}

const rebMul = () => 1 + S.rebirth * 0.5;
const need = lv => Math.floor(20 * Math.pow(lv, 2.1) * 1.05);
const P = () => {
  const E = S.equip, ep = k => E[k] ? E[k].pow : 0;
  const atk = (10 + S.lv*3 + S.stat.atk*5 + S.gear.weapon*12 + ep('weapon')) * rebMul();
  return {
    atk,
    hp: (100 + S.lv*20 + S.stat.hp*40 + S.gear.hat*60 + ep('hat')) * rebMul(),
    def: S.gear.armor*6 + S.lv + ep('armor'),
    crit: Math.min(.8, .05 + S.stat.crit*.005),
    cdmg: 1.5 + S.stat.cdmg*.02,
    spd: 1 + (S.gear.shoes*2 + ep('shoes'))/100,
    meso: 1 + S.stat.meso*.03,
  };
};
const upCost = (s) => Math.floor(s.base * Math.pow(s.g, S.stat[s.k]));
const gearCost = k => Math.floor(100 * Math.pow(1.35, S.gear[k]));
const gearRate = k => Math.max(.15, 1 - S.gear[k]*.02);

// combat state
let mhp, mmax, php, isBoss = false, bossT = 0, atkCd = 0, monCd = 0;
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
  S.exp += exp; S.meso += meso * P().meso;
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
  monCd -= DT;
  if (monCd <= 0) {
    monCd = 1;
    const raw = (m.hp / 32) * Math.pow(1.35, S.stage-1) * (isBoss ? 1.5 : 1) + m.lv * 2;
    const d = Math.max(1, raw - p.def);
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
const itemHtml = it => `<span style="color:${RARITY[it.r].c};font-weight:700">[${RARITY[it.r].n}] ${it.name}</span> <small>${statTxt(it)}</small>`;

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
    h += '<hr>';
    GEAR.forEach(g => {
      const c = gearCost(g.k);
      h += `<div class="row"><div>${g.e} <b>${g.name} +${S.gear[g.k]}</b><small>${g.stat} +${g.per}/강 · 성공 ${Math.round(gearRate(g.k)*100)}%</small></div>
        <button data-g="${g.k}" ${S.meso<c?'disabled':''}>강화 💰${fmt(c)}</button></div>`;
    });
    const inv = S.inv.slice().sort((a,b)=>b.r-a.r||b.pow-a.pow);
    h += `<hr><div class="row"><b>보관함 (${inv.length})</b><button id="sellall" ${inv.length?'':'disabled'}>전부 판매</button></div>`;
    inv.slice(0, 30).forEach(it => { h += `<div class="row"><div>${GEAR.find(g=>g.k===it.slot).e} ${itemHtml(it)}</div><span><button data-eq="${it.id}">장착</button> <button data-sell="${it.id}">판매</button></span></div>`; });
    if (inv.length > 30) h += `<small>…외 ${inv.length-30}개</small>`;
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
  const rb = $('rb');
  if (rb) rb.onclick = () => { if (confirm('환생하시겠습니까?')) {
    const keep = {rebirth:S.rebirth+1, gem:S.gem, best:S.best, inv:S.inv, equip:S.equip, pity:S.pity, pity10:S.pity10, pulls:S.pulls, nid:S.nid};
    S = Object.assign(fresh(), keep); isBoss=false; respawnPlayer(); spawn(); renderMaps(); renderTab(); } };
}
function render(){
  const p = P();
  $('lv').textContent = 'Lv.' + S.lv;
  $('job').textContent = S.rebirth ? `환생 ${S.rebirth}회` : '모험가';
  $('meso').textContent = fmt(S.meso); $('gem').textContent = S.gem;
  $('mhpbar').style.width = Math.max(0, mhp/mmax*100) + '%';
  $('phpbar').style.width = Math.max(0, php/p.hp*100) + '%';
  $('expbar').style.width = S.exp/need(S.lv)*100 + '%';
  $('exptext').textContent = `${fmt(S.exp)} / ${fmt(need(S.lv))}`;
  $('mapname').innerHTML = `<b>${MAPS[S.map].name}</b> · 스테이지 ${S.stage}/${STAGES}`;
  $('mname').textContent = isBoss ? `BOSS (${Math.ceil(bossT)}s)` : MAPS[S.map].mon;
  $('stageinfo').textContent = `공격 ${fmt(p.atk)} · HP ${fmt(p.hp)} · 방어 ${fmt(p.def)} · 크리 ${(p.crit*100).toFixed(1)}%/${Math.round(p.cdmg*100)}% · 처치 ${S.kills%10}/10`;
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
