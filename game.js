/* ===========================================================
   표류: 무인도 생존
   턴(시간대) 기반 생존 게임 — 실시간 타이머 없음.
   행동을 선택할 때마다 시간대가 넘어가며 상태가 갱신된다.
=========================================================== */

const SAVE_KEY = "adrift-island-save-v1";
const PHASES = ["아침", "낮", "저녁", "밤"];

const RESOURCE_NAMES = {
  wood: "나무",
  stone: "돌",
  fiber: "섬유",
  rawFood: "생고기",
  cookedFood: "익힌 고기",
  fruit: "열매",
  water: "물",
  shellfish: "조개",
  rope: "밧줄",
  cloth: "천",
  flare: "신호탄",
};

function freshState() {
  return {
    day: 1,
    phase: 0,
    location: "beach",
    stats: { health: 100, satiety: 100, hydration: 100, sanity: 100 },
    inventory: {
      wood: 0, stone: 0, fiber: 0, rawFood: 0, cookedFood: 0,
      fruit: 0, water: 0, shellfish: 0, rope: 0, cloth: 0, flare: 0,
    },
    tools: {
      axe: false, rod: false, spear: false,
      campfire: false, shelter: false, raft: false,
    },
    log: [],
    over: false,
    won: false,
  };
}

let state = freshState();

/* ---------------- Locations ---------------- */

const LOCATIONS = {
  beach: {
    name: "해변",
    desc: "부서진 배의 잔해가 파도에 실려 오는 넓은 백사장. 조개와 표류물을 주울 수 있고, 낚싯대만 있다면 물고기도 노려볼 만하다.",
    actions: [
      {
        id: "gatherShell",
        label: "조개 줍기",
        sub: "만조 때 드러난 조개를 줍는다. 안전하지만 소득은 적다.",
        run() {
          const n = rand(1, 3);
          addItem("shellfish", n);
          log(`조개 ${n}개를 주웠다.`, "good");
        },
      },
      {
        id: "searchDriftwood",
        label: "표류물 수색",
        sub: "해안으로 밀려온 잔해를 뒤진다. 운이 좋으면 쓸만한 자재를 얻는다.",
        run() {
          const wood = rand(1, 2);
          addItem("wood", wood);
          log(`떠내려온 나무 조각 ${wood}개를 건졌다.`, "good");
          roll(0.18, () => {
            const pick = choice(["fiber", "cloth", "rope"]);
            addItem(pick, 1);
            log(`잔해 속에서 ${RESOURCE_NAMES[pick]}을(를) 발견했다!`, "good");
          });
          roll(0.12, () => {
            damage("health", rand(5, 10));
            log("날카로운 파편에 손을 베였다.", "bad");
          });
        },
      },
      {
        id: "fish",
        label: "낚시하기",
        sub: "낚싯대 필요. 잔잔한 바다에서 물고기를 노린다.",
        requires: () => state.tools.rod,
        lockedHint: "낚싯대가 필요하다.",
        run() {
          if (chance(0.75)) {
            const n = rand(1, 3);
            addItem("rawFood", n);
            log(`물고기 ${n}마리를 낚았다.`, "good");
          } else {
            log("입질이 없었다. 빈손으로 돌아왔다.", "warn");
          }
          modStat("sanity", 3);
        },
      },
      {
        id: "searchFlare",
        label: "구조 신호탄 찾기",
        sub: "해변 구석구석을 뒤져 신호탄을 찾는다. 확률은 낮지만 찾으면 즉시 탈출 기회가 생긴다.",
        hideIfOwned: "flare",
        run() {
          if (chance(0.1)) {
            addItem("flare", 1);
            log("녹슨 방수함 속에서 신호탄을 발견했다!", "good");
          } else {
            log("신호탄으로 보이는 것은 없었다.", "warn");
          }
        },
      },
      {
        id: "escape",
        label: "뗏목 타고 탈출하기",
        sub: "완성된 뗏목으로 섬을 떠난다.",
        requires: () => state.tools.raft,
        hidden: () => !state.tools.raft,
        run() {
          finishGame(true, "raft");
        },
      },
    ],
  },

  forest: {
    name: "숲",
    desc: "울창한 나무와 넝쿨이 뒤엉킨 숲. 목재와 섬유, 열매를 구할 수 있고 안쪽 깊은 곳에서는 사냥도 가능하다.",
    actions: [
      {
        id: "chopWood",
        label: "나무 하기",
        sub: state_axeSub,
        run() {
          const n = state.tools.axe ? rand(3, 5) : rand(2, 3);
          addItem("wood", n);
          log(`나무 ${n}개를 모았다.`, "good");
        },
      },
      {
        id: "gatherFiber",
        label: "섬유 채집",
        sub: "덩굴과 억센 풀을 모아 섬유를 얻는다.",
        run() {
          const n = rand(2, 4);
          addItem("fiber", n);
          log(`섬유 ${n}개를 모았다.`, "good");
        },
      },
      {
        id: "gatherFruit",
        label: "열매 채집",
        sub: "눈에 띄는 열매를 딴다. 가끔 독이 있는 것도 섞여 있다.",
        run() {
          const n = rand(1, 3);
          addItem("fruit", n);
          log(`열매 ${n}개를 땄다.`, "good");
          roll(0.15, () => {
            damage("health", rand(8, 14));
            log("독이 있는 열매를 잘못 먹어 속이 뒤틀렸다.", "bad");
          });
        },
      },
      {
        id: "collectWater",
        label: "샘물 긷기",
        sub: "숲속 작은 샘에서 깨끗한 물을 얻는다.",
        run() {
          const n = rand(2, 3);
          addItem("water", n);
          log(`샘물 ${n}병을 길었다.`, "good");
        },
      },
      {
        id: "hunt",
        label: "사냥하기",
        sub: state.tools.spear
          ? "창으로 사냥감을 노린다. 비교적 안전하다."
          : "맨손 사냥은 위험하다. 창이 있으면 성공률이 오른다.",
        run() {
          const successRate = state.tools.spear ? 0.75 : 0.4;
          if (chance(successRate)) {
            const n = rand(2, 4);
            addItem("rawFood", n);
            log(`사냥에 성공해 고기 ${n}개를 얻었다.`, "good");
          } else {
            log("사냥감을 놓쳤다.", "warn");
            if (!state.tools.spear) {
              roll(0.35, () => {
                damage("health", rand(10, 18));
                log("성난 짐승에게 반격당해 다쳤다.", "bad");
              });
            }
          }
        },
      },
    ],
  },

  cave: {
    name: "동굴",
    desc: "섬 중앙 절벽에 뚫린 어두운 동굴. 돌과 광물을 캘 수 있지만 안쪽은 예측할 수 없이 위험하다.",
    actions: [
      {
        id: "mineStone",
        label: "돌 캐기",
        sub: "입구 근처에서 비교적 안전하게 돌을 캔다.",
        run() {
          const n = rand(2, 4);
          addItem("stone", n);
          log(`돌 ${n}개를 캤다.`, "good");
        },
      },
      {
        id: "exploreDepths",
        label: "깊은 곳 탐험",
        sub: "동굴 깊숙이 들어간다. 위험하지만 특별한 것을 찾을 수도 있다.",
        run() {
          if (chance(0.55)) {
            const pick = choice(["stone", "rope", "cloth"]);
            const n = rand(1, 3);
            addItem(pick, n);
            log(`동굴 깊은 곳에서 ${RESOURCE_NAMES[pick]} ${n}개를 발견했다.`, "good");
            roll(0.2, () => {
              modStat("sanity", 10);
              log("벽에 새겨진 오래된 벽화를 보며 마음이 차분해졌다.", "good");
            });
          } else {
            damage("health", rand(12, 22));
            log("발밑이 무너지며 낙석에 다쳤다!", "bad");
          }
        },
      },
    ],
  },

  wreck: {
    name: "난파선",
    desc: "얕은 물속에 반쯤 잠긴 낡은 화물선. 위험을 감수할 가치가 있는 물자가 남아있을지도 모른다.",
    actions: [
      {
        id: "searchWreck",
        label: "잔해 수색",
        sub: "선체 내부를 뒤진다. 밧줄과 천 같은 귀한 자재를 구할 확률이 높다.",
        run() {
          const gains = [];
          if (chance(0.7)) { addItem("rope", rand(1, 2)); gains.push("밧줄"); }
          if (chance(0.7)) { addItem("cloth", rand(1, 2)); gains.push("천"); }
          if (chance(0.3)) { addItem("wood", rand(1, 3)); gains.push("나무"); }
          if (gains.length) {
            log(`잔해에서 ${gains.join(", ")}을(를) 건졌다.`, "good");
          } else {
            log("쓸만한 것을 찾지 못했다.", "warn");
          }
          roll(0.25, () => {
            const dmg = rand(8, 16);
            damage("health", dmg);
            modStat("sanity", -5);
            log("녹슨 철판에 걸려 다치고, 불안감이 엄습했다.", "bad");
          });
        },
      },
      {
        id: "searchFlareWreck",
        label: "구조 신호탄 찾기",
        sub: "선장실 부근을 뒤져 신호탄을 찾는다.",
        hideIfOwned: "flare",
        run() {
          if (chance(0.14)) {
            addItem("flare", 1);
            log("선장실 서랍에서 신호탄을 발견했다!", "good");
          } else {
            log("찾는 데 실패했다.", "warn");
          }
        },
      },
    ],
  },
};

function state_axeSub() {
  return state.tools.axe
    ? "돌도끼가 있어 더 많은 나무를 벨 수 있다."
    : "도끼 없이 나무를 벤다. 도끼가 있으면 더 효율적이다.";
}

/* ---------------- Crafting ---------------- */

const CRAFTS = [
  {
    id: "campfire",
    name: "모닥불",
    desc: "밤을 버티고 음식을 익힐 수 있게 해준다.",
    cost: { wood: 5, stone: 3 },
    owned: () => state.tools.campfire,
    build() { state.tools.campfire = true; },
  },
  {
    id: "axe",
    name: "돌도끼",
    desc: "나무를 더 효율적으로 벨 수 있다.",
    cost: { wood: 2, stone: 4 },
    owned: () => state.tools.axe,
    build() { state.tools.axe = true; },
  },
  {
    id: "rod",
    name: "낚싯대",
    desc: "해변에서 낚시를 할 수 있게 해준다.",
    cost: { wood: 3, fiber: 4 },
    owned: () => state.tools.rod,
    build() { state.tools.rod = true; },
  },
  {
    id: "spear",
    name: "창",
    desc: "사냥 성공률을 높이고 부상 위험을 줄인다.",
    cost: { wood: 4, stone: 2 },
    owned: () => state.tools.spear,
    build() { state.tools.spear = true; },
  },
  {
    id: "shelter",
    name: "쉼터",
    desc: "밤 동안 체력 손실을 크게 줄이고 정신력 회복을 돕는다.",
    cost: { wood: 10, fiber: 6, stone: 4 },
    owned: () => state.tools.shelter,
    build() { state.tools.shelter = true; },
  },
  {
    id: "rope",
    name: "밧줄 엮기",
    desc: "섬유를 꼬아 밧줄을 만든다.",
    cost: { fiber: 5 },
    repeatable: true,
    build() { addItem("rope", 1); },
  },
  {
    id: "cloth",
    name: "천 짜기",
    desc: "섬유를 엮어 천을 만든다.",
    cost: { fiber: 8 },
    repeatable: true,
    build() { addItem("cloth", 1); },
  },
  {
    id: "raft",
    name: "뗏목",
    desc: "섬을 탈출할 수 있는 뗏목. 완성하면 해변에서 탈출할 수 있다.",
    cost: { wood: 30, rope: 6, cloth: 4, stone: 5 },
    owned: () => state.tools.raft,
    build() { state.tools.raft = true; },
  },
];

/* ---------------- Core helpers ---------------- */

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function chance(p) { return Math.random() < p; }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function roll(p, fn) { if (chance(p)) fn(); }

function clampStat(v) { return Math.max(0, Math.min(100, v)); }

function modStat(stat, delta) {
  state.stats[stat] = clampStat(state.stats[stat] + delta);
}

function damage(stat, amount) {
  state.stats[stat] = clampStat(state.stats[stat] - amount);
}

function addItem(item, n) {
  state.inventory[item] = (state.inventory[item] || 0) + n;
}

function hasItems(cost) {
  return Object.entries(cost).every(([k, v]) => (state.inventory[k] || 0) >= v);
}

function spendItems(cost) {
  Object.entries(cost).forEach(([k, v]) => { state.inventory[k] -= v; });
}

function log(msg, kind) {
  state.log.push({ msg, kind: kind || "" });
  if (state.log.length > 60) state.log.shift();
}

/* ---------------- Time / survival tick ---------------- */

function baseActionDecay(isRest) {
  if (isRest) {
    modStat("satiety", -3);
    modStat("hydration", -4);
  } else {
    modStat("satiety", -6);
    modStat("hydration", -8);
    modStat("sanity", -2);
  }
  applyStarvationPenalties();
}

function applyStarvationPenalties() {
  if (state.stats.satiety <= 0) damage("health", 8);
  if (state.stats.hydration <= 0) damage("health", 8);
  if (state.stats.sanity <= 0) damage("health", 3);
}

function advancePhase() {
  state.phase++;
  if (state.phase >= PHASES.length) {
    state.phase = 0;
    state.day++;
    nightlyTick();
  }
}

function nightlyTick() {
  // Applied once per new day, representing the night that just passed.
  const hydroPenalty = state.tools.campfire ? 8 : 14;
  const satietyPenalty = state.tools.campfire ? 6 : 10;
  modStat("satiety", -satietyPenalty);
  modStat("hydration", -hydroPenalty);

  if (state.tools.shelter) {
    damage("health", 2);
    modStat("sanity", 5);
  } else {
    damage("health", 10);
    if (!state.tools.campfire) modStat("sanity", -5);
  }
  applyStarvationPenalties();
  log(`밤이 지나고 ${state.day}일째 아침이 밝았다.`, "");
}

function checkGameOver() {
  if (state.stats.health <= 0 && !state.over) {
    finishGame(false, "health");
  }
}

function finishGame(won, reason) {
  state.over = true;
  state.won = won;
  state.endReason = reason;
  saveGame();
  render();
}

/* ---------------- Action execution ---------------- */

function doLocationAction(actionId) {
  if (state.over) return;
  const loc = LOCATIONS[state.location];
  const action = loc.actions.find(a => a.id === actionId);
  if (!action) return;
  if (action.requires && !action.requires()) return;

  action.run();
  baseActionDecay(false);
  checkGameOver();
  if (!state.over) advancePhase();
  checkGameOver();
  saveGame();
  render();
}

function doRest() {
  if (state.over) return;
  modStat("health", 8);
  modStat("sanity", 12);
  log("잠시 휴식을 취했다.", "good");
  baseActionDecay(true);
  checkGameOver();
  if (!state.over) advancePhase();
  checkGameOver();
  saveGame();
  render();
}

function doMove(locId) {
  if (state.over || locId === state.location) return;
  state.location = locId;
  log(`${LOCATIONS[locId].name}(으)로 이동했다.`);
  baseActionDecay(false);
  checkGameOver();
  if (!state.over) advancePhase();
  checkGameOver();
  saveGame();
  render();
}

function doEatCooked() {
  if (state.over || state.inventory.cookedFood <= 0) return;
  state.inventory.cookedFood--;
  modStat("satiety", 28);
  log("익힌 고기를 먹었다. 든든하다.", "good");
  saveGame();
  render();
}

function doEatShellfish() {
  if (state.over || state.inventory.shellfish <= 0) return;
  state.inventory.shellfish--;
  modStat("satiety", 10);
  log("조개를 까서 먹었다.", "good");
  saveGame();
  render();
}

function doEatFruit() {
  if (state.over || state.inventory.fruit <= 0) return;
  state.inventory.fruit--;
  modStat("satiety", 14);
  log("열매를 먹었다.", "good");
  saveGame();
  render();
}

function doEatRaw() {
  if (state.over || state.inventory.rawFood <= 0) return;
  state.inventory.rawFood--;
  modStat("satiety", 12);
  if (chance(0.3)) {
    damage("health", 10);
    log("날고기를 먹고 배탈이 났다.", "bad");
  } else {
    log("날고기를 그냥 먹었다.", "warn");
  }
  saveGame();
  render();
}

function doCook() {
  if (state.over || !state.tools.campfire || state.inventory.rawFood <= 0) return;
  state.inventory.rawFood--;
  addItem("cookedFood", 1);
  log("모닥불에 고기를 구웠다.", "good");
  saveGame();
  render();
}

function doDrink() {
  if (state.over || state.inventory.water <= 0) return;
  state.inventory.water--;
  modStat("hydration", 30);
  log("물을 마셨다.", "good");
  saveGame();
  render();
}

function doFireFlare() {
  if (state.over || state.inventory.flare <= 0) return;
  finishGame(true, "flare");
}

function doCraft(craftId) {
  if (state.over) return;
  const c = CRAFTS.find(x => x.id === craftId);
  if (!c) return;
  if (c.owned && c.owned()) return;
  if (!hasItems(c.cost)) return;
  spendItems(c.cost);
  c.build();
  log(`${c.name}을(를) 제작했다.`, "good");
  saveGame();
  renderCraftPanel();
  render();
}

/* ---------------- Persistence ---------------- */

function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

/* ---------------- Rendering ---------------- */

const el = (id) => document.getElementById(id);

function statColor(v) {
  if (v > 55) return "var(--good)";
  if (v > 25) return "var(--warn)";
  return "var(--danger)";
}

function render() {
  const app = el("app");
  app.classList.remove("phase-morning", "phase-day", "phase-evening", "phase-night");
  app.classList.add(["phase-morning", "phase-day", "phase-evening", "phase-night"][state.phase]);

  el("dayLabel").textContent = `${state.day}일차`;
  el("phaseLabel").textContent = PHASES[state.phase];
  el("locLabel").textContent = LOCATIONS[state.location].name;

  ["health", "satiety", "hydration", "sanity"].forEach(s => {
    const v = state.stats[s];
    el(`fill-${s}`).style.width = v + "%";
    el(`fill-${s}`).style.background = statColor(v);
    el(`num-${s}`).textContent = v;
  });

  renderLocation();
  renderMoveList();
  renderInventory();
  renderTools();
  renderQuickActions();
  renderLog();
  renderOverlay();
}

function renderLocation() {
  const loc = LOCATIONS[state.location];
  el("locTitle").textContent = loc.name;
  el("locDesc").textContent = loc.desc;

  const list = el("actionList");
  list.innerHTML = "";
  loc.actions.forEach(a => {
    if (a.hidden && a.hidden()) return;
    if (a.hideIfOwned && state.inventory[a.hideIfOwned] > 0) return;
    const locked = a.requires && !a.requires();
    const btn = document.createElement("button");
    btn.className = "action-btn";
    btn.disabled = locked || state.over;
    btn.innerHTML = `${a.label}<span class="action-sub">${locked ? a.lockedHint : (typeof a.sub === "function" ? a.sub() : a.sub)}</span>`;
    btn.onclick = () => doLocationAction(a.id);
    list.appendChild(btn);
  });

  const restBtn = document.createElement("button");
  restBtn.className = "action-btn";
  restBtn.disabled = state.over;
  restBtn.innerHTML = `휴식하기<span class="action-sub">체력과 정신력을 회복한다. 자원은 얻지 못한다.</span>`;
  restBtn.onclick = doRest;
  list.appendChild(restBtn);

  const craftBtn = document.createElement("button");
  craftBtn.className = "action-btn";
  craftBtn.disabled = state.over;
  craftBtn.innerHTML = `제작하기<span class="action-sub">모은 자재로 도구와 시설을 만든다.</span>`;
  craftBtn.onclick = openCraftPanel;
  list.appendChild(craftBtn);
}

function renderMoveList() {
  const box = el("moveList");
  box.innerHTML = "";
  Object.entries(LOCATIONS).forEach(([id, loc]) => {
    if (id === state.location) return;
    const btn = document.createElement("button");
    btn.className = "move-btn";
    btn.disabled = state.over;
    btn.textContent = `→ ${loc.name}`;
    btn.onclick = () => doMove(id);
    box.appendChild(btn);
  });
}

function renderInventory() {
  const box = el("inventoryList");
  box.innerHTML = "";
  Object.entries(state.inventory).forEach(([k, v]) => {
    if (!v) return;
    const chip = document.createElement("span");
    chip.className = "inv-chip";
    chip.textContent = `${RESOURCE_NAMES[k]} ${v}`;
    box.appendChild(chip);
  });
  if (![...Object.values(state.inventory)].some(v => v)) {
    box.innerHTML = `<span class="inv-chip">비어 있음</span>`;
  }
}

function renderTools() {
  const box = el("toolList");
  box.innerHTML = "";
  const names = {
    axe: "돌도끼", rod: "낚싯대", spear: "창",
    campfire: "모닥불", shelter: "쉼터", raft: "뗏목",
  };
  Object.entries(names).forEach(([k, label]) => {
    const chip = document.createElement("span");
    chip.className = "tool-chip" + (state.tools[k] ? " owned" : "");
    chip.textContent = label;
    box.appendChild(chip);
  });
}

function renderQuickActions() {
  const box = el("quickActions");
  box.innerHTML = "";
  const buttons = [
    { label: `익힌 고기 먹기 (${state.inventory.cookedFood})`, fn: doEatCooked, enabled: state.inventory.cookedFood > 0 },
    { label: `조개 먹기 (${state.inventory.shellfish})`, fn: doEatShellfish, enabled: state.inventory.shellfish > 0 },
    { label: `열매 먹기 (${state.inventory.fruit})`, fn: doEatFruit, enabled: state.inventory.fruit > 0 },
    { label: `생고기 먹기 (${state.inventory.rawFood})`, fn: doEatRaw, enabled: state.inventory.rawFood > 0 },
    { label: `물 마시기 (${state.inventory.water})`, fn: doDrink, enabled: state.inventory.water > 0 },
    { label: `고기 굽기 (모닥불 필요)`, fn: doCook, enabled: state.tools.campfire && state.inventory.rawFood > 0 },
  ];
  if (state.inventory.flare > 0) {
    buttons.push({ label: "🚨 신호탄 발사하여 탈출", fn: doFireFlare, enabled: true });
  }
  buttons.forEach(b => {
    const btn = document.createElement("button");
    btn.className = "quick-btn";
    btn.textContent = b.label;
    btn.disabled = !b.enabled || state.over;
    btn.onclick = b.fn;
    box.appendChild(btn);
  });
}

function renderLog() {
  const list = el("logList");
  list.innerHTML = "";
  state.log.slice(-30).forEach(entry => {
    const li = document.createElement("li");
    li.textContent = entry.msg;
    if (entry.kind === "bad") li.className = "event-bad";
    else if (entry.kind === "good") li.className = "event-good";
    else if (entry.kind === "warn") li.className = "event-warn";
    list.appendChild(li);
  });
}

function renderOverlay() {
  const overlay = el("overlay");
  if (!state.over) { overlay.classList.add("hidden"); return; }
  overlay.classList.remove("hidden");
  if (state.won) {
    el("overlayTitle").textContent = state.endReason === "flare" ? "🚨 구조되었다!" : "🛶 섬을 탈출했다!";
    el("overlayText").textContent =
      `${state.day}일 동안 표류 끝에 살아남아 섬을 벗어났다. ` +
      (state.endReason === "flare" ? "쏘아올린 신호탄을 본 배가 다가온다." : "직접 만든 뗏목을 타고 망망대해로 나선다.");
  } else {
    el("overlayTitle").textContent = "☠ 표류 끝에 쓰러지다";
    el("overlayText").textContent = `${state.day}일째, 섬에서 버티지 못하고 쓰러졌다.`;
  }
}

/* ---------------- Craft panel ---------------- */

function openCraftPanel() {
  renderCraftPanel();
  el("craftPanel").classList.remove("hidden");
}

function closeCraftPanel() {
  el("craftPanel").classList.add("hidden");
}

function renderCraftPanel() {
  const list = el("craftList");
  list.innerHTML = "";
  CRAFTS.forEach(c => {
    const owned = c.owned && c.owned();
    if (owned) return;
    const div = document.createElement("div");
    div.className = "craft-item";
    const costText = Object.entries(c.cost)
      .map(([k, v]) => `${RESOURCE_NAMES[k]} ${state.inventory[k] || 0}/${v}`)
      .join(", ");
    const canBuild = hasItems(c.cost);
    div.innerHTML = `
      <div class="craft-name">${c.name}</div>
      <div class="craft-desc">${c.desc}</div>
      <div class="craft-cost">필요: ${costText}</div>
    `;
    const btn = document.createElement("button");
    btn.textContent = "제작";
    btn.disabled = !canBuild || state.over;
    btn.onclick = () => doCraft(c.id);
    div.appendChild(btn);
    list.appendChild(div);
  });
  if (!list.children.length) {
    list.innerHTML = `<p style="color:var(--text-dim)">더 이상 제작할 것이 없다.</p>`;
  }
}

/* ---------------- Boot ---------------- */

function startNewGame() {
  clearSave();
  state = freshState();
  log("난파선에서 표류하다 섬에 도착했다. 생존이 시작된다.");
  el("startOverlay").classList.add("hidden");
  render();
}

function continueGame() {
  const loaded = loadGame();
  if (loaded) state = loaded;
  el("startOverlay").classList.add("hidden");
  render();
}

function initBoot() {
  const loaded = loadGame();
  if (loaded && !loaded.over) {
    el("continueBtn").classList.remove("hidden");
  }
  el("newGameBtn").onclick = startNewGame;
  el("continueBtn").onclick = continueGame;
  el("closeCraft").onclick = closeCraftPanel;
  el("overlayRestart").onclick = () => {
    el("overlay").classList.add("hidden");
    el("startOverlay").classList.remove("hidden");
  };
}

initBoot();
