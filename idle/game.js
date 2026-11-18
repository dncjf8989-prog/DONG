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
const STATS = [
  {k:'atk',  name:'공격력 단련', desc:'공격력 +5',  base:50,  g:1.18},
  {k:'hp',   name:'체력 단련',   desc:'최대 HP +40', base:40,  g:1.17},
  {k:'crit', name:'크리티컬',    desc:'크리율 +0.5% (최대 80%)', base:200, g:1.22, max:160},
  {k:'cdmg', name:'크리 데미지', desc:'크뎀 +2%',    base:300, g:1.2},
  {k:'meso', name:'메소 획득',   desc:'메소 +3%',    base:500, g:1.25},
];

const fresh = () => ({lv:1,exp:0,meso:0,gem:0,map:0,kills:0,rebirth:0,stat:{atk:0,hp:0,crit:0,cdmg:0,meso:0},
  gear:{weapon:0,hat:0,armor:0,shoes:0},best:0,last:Date.now()});
let S = fresh();
try { const raw = localStorage.getItem('mapleIdle'); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch(e){}

const rebMul = () => 1 + S.rebirth * 0.5;
const need = lv => Math.floor(20 * Math.pow(lv, 2.1) * 1.05);
const P = () => {
  const atk = (10 + S.lv*3 + S.stat.atk*5 + S.gear.weapon*12) * rebMul();
  return {
    atk,
    hp: (100 + S.lv*20 + S.stat.hp*40 + S.gear.hat*60) * rebMul(),
    def: S.gear.armor*6 + S.lv,
    crit: Math.min(.8, .05 + S.stat.crit*.005),
    cdmg: 1.5 + S.stat.cdmg*.02,
    spd: 1 + S.gear.shoes*.02,
    meso: 1 + S.stat.meso*.03,
  };
};
const upCost = (s) => Math.floor(s.base * Math.pow(s.g, S.stat[s.k]));
const gearCost = k => Math.floor(100 * Math.pow(1.35, S.gear[k]));
const gearRate = k => Math.max(.15, 1 - S.gear[k]*.02);

// combat state
let mhp, mmax, php, isBoss = false, bossT = 0, atkCd = 0, monCd = 0;
const mon = () => {
  const m = MAPS[S.map], boss = isBoss;
  return {hp: m.hp * (boss ? 12 : 1), exp: m.exp * (boss ? 10 : 1), meso: m.meso * (boss ? 10 : 1)};
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
  if (isBoss) { S.gem += 1 + S.map; isBoss = false; S.best = Math.max(S.best, S.map); }
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
    const raw = (m.hp / 8) * (isBoss ? 1.5 : 1) * Math.pow(1.0, 0) / 4 + m.lv * 2;
    const d = Math.max(1, raw - p.def);
    php -= d; float('-'+fmt(d), false, 'p');
    if (php <= 0) { isBoss = false; respawnPlayer(); spawn(); say('쓰러졌습니다... 부활!'); }
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

// UI
let tab = 'stats';
function renderMaps(){
  $('maps').innerHTML = '';
  MAPS.forEach((m,i) => {
    const b = document.createElement('button');
    b.textContent = m.e + ' Lv.' + m.lv;
    b.disabled = S.lv < m.lv || i === S.map;
    b.onclick = () => { S.map = i; isBoss = false; S.kills = 0; spawn(); renderMaps(); };
    $('maps').appendChild(b);
  });
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
    GEAR.forEach(g => {
      const c = gearCost(g.k);
      h += `<div class="row"><div>${g.e} <b>${g.name} +${S.gear[g.k]}</b><small>${g.stat} +${g.per}/강 · 성공 ${Math.round(gearRate(g.k)*100)}%</small></div>
        <button data-g="${g.k}" ${S.meso<c?'disabled':''}>강화 💰${fmt(c)}</button></div>`;
    });
  } else {
    const gain = Math.floor(S.lv/20);
    h = `<div class="row"><div><b>환생 ${S.rebirth}회</b><small>모든 스탯 ×${rebMul().toFixed(1)} (환생마다 +0.5)<br>레벨·메소·강화 초기화, 💎 유지</small></div>
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
  const rb = $('rb');
  if (rb) rb.onclick = () => { if (confirm('환생하시겠습니까?')) {
    const keep = {rebirth:S.rebirth+1, gem:S.gem, best:S.best};
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
  $('mapname').innerHTML = `<b>${MAPS[S.map].name}</b>`;
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
