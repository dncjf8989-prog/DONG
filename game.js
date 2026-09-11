// 메이플랜드 미니 - 아주 간단한 사이드스크롤 사냥 게임
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const GRAVITY = 0.6;
const KEYS = {};
window.addEventListener("keydown", (e) => (KEYS[e.code] = true));
window.addEventListener("keyup", (e) => (KEYS[e.code] = false));

// ---------- 맵 (플랫폼) ----------
const platforms = [
  { x: 0, y: 400, w: 800, h: 50 },      // 바닥
  { x: 80, y: 310, w: 160, h: 20 },
  { x: 320, y: 260, w: 160, h: 20 },
  { x: 560, y: 310, w: 160, h: 20 },
  { x: 260, y: 190, w: 200, h: 20 },
];

// ---------- 플레이어 ----------
const player = {
  x: 380,
  y: 340,
  w: 30,
  h: 40,
  vx: 0,
  vy: 0,
  speed: 4,
  jumpPower: 12,
  onGround: false,
  facing: 1,
  attackTimer: 0,
  attackCooldown: 0,
  level: 1,
  hp: 50,
  maxHp: 50,
  mp: 20,
  maxMp: 20,
  exp: 0,
  expToNext: 20,
  atk: 8,
  invuln: 0,
};

let kills = 0;

// ---------- 몬스터 ----------
function makeSnail(x, patrolMinX, patrolMaxX, y) {
  return {
    type: "snail",
    x,
    y,
    w: 28,
    h: 20,
    vx: 1,
    hp: 20,
    maxHp: 20,
    dead: false,
    patrolMinX,
    patrolMaxX,
    hitFlash: 0,
  };
}

let monsters = [];
function spawnMonsters() {
  monsters = [
    makeSnail(120, 90, 220, 400 - 20),
    makeSnail(600, 570, 700, 400 - 20),
    makeSnail(350, 330, 460, 260 - 20),
    makeSnail(300, 270, 440, 190 - 20),
  ];
}
spawnMonsters();

// ---------- 유틸 ----------
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function gainExp(amount) {
  player.exp += amount;
  while (player.exp >= player.expToNext) {
    player.exp -= player.expToNext;
    player.level++;
    player.expToNext = Math.floor(player.expToNext * 1.3 + 10);
    player.maxHp += 15;
    player.maxMp += 8;
    player.atk += 2;
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    showLevelUp();
  }
  updateHud();
}

let levelUpTimer = 0;
function showLevelUp() {
  levelUpTimer = 90;
}

// ---------- 입력/물리 업데이트 ----------
function updatePlayer() {
  // 좌우 이동
  if (KEYS["ArrowLeft"]) {
    player.vx = -player.speed;
    player.facing = -1;
  } else if (KEYS["ArrowRight"]) {
    player.vx = player.speed;
    player.facing = 1;
  } else {
    player.vx = 0;
  }

  // 점프
  if ((KEYS["ArrowUp"] || KEYS["Space"]) && player.onGround) {
    player.vy = -player.jumpPower;
    player.onGround = false;
  }

  // 공격
  if (player.attackCooldown > 0) player.attackCooldown--;
  if (KEYS["KeyZ"] && player.attackCooldown === 0) {
    player.attackTimer = 12;
    player.attackCooldown = 22;
    doAttack();
  }
  if (player.attackTimer > 0) player.attackTimer--;

  // 중력
  player.vy += GRAVITY;
  if (player.vy > 18) player.vy = 18;

  player.x += player.vx;
  player.y += player.vy;

  player.x = Math.max(0, Math.min(W - player.w, player.x));

  // 플랫폼 충돌 (위에서 떨어질 때만)
  player.onGround = false;
  for (const p of platforms) {
    const feetPrev = player.y + player.h - player.vy;
    const feet = player.y + player.h;
    if (
      player.vy >= 0 &&
      feetPrev <= p.y + 2 &&
      feet >= p.y &&
      player.x + player.w > p.x &&
      player.x < p.x + p.w
    ) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
    }
  }

  if (player.y > H) {
    // 낙사 방지: 바닥으로 복귀
    player.x = 380;
    player.y = 340;
    player.vy = 0;
  }

  if (player.invuln > 0) player.invuln--;
}

function doAttack() {
  const range = 40;
  const hitBox = {
    x: player.facing === 1 ? player.x + player.w : player.x - range,
    y: player.y,
    w: range,
    h: player.h,
  };
  for (const m of monsters) {
    if (m.dead) continue;
    if (rectsOverlap(hitBox, m)) {
      m.hp -= player.atk;
      m.hitFlash = 8;
      if (m.hp <= 0) {
        m.dead = true;
        kills++;
        gainExp(8 + player.level);
      }
    }
  }
  updateHud();
}

function updateMonsters() {
  for (const m of monsters) {
    if (m.dead) continue;
    m.x += m.vx;
    if (m.x < m.patrolMinX || m.x + m.w > m.patrolMaxX) {
      m.vx *= -1;
      m.x = Math.max(m.patrolMinX, Math.min(m.patrolMaxX - m.w, m.x));
    }
    if (m.hitFlash > 0) m.hitFlash--;

    // 플레이어와 접촉 시 데미지
    if (player.invuln === 0 && rectsOverlap(player, m)) {
      player.hp -= 5;
      player.invuln = 45;
      if (player.hp <= 0) {
        player.hp = player.maxHp;
        player.x = 380;
        player.y = 340;
      }
      updateHud();
    }
  }

  // 전멸하면 리스폰
  if (monsters.every((m) => m.dead)) {
    setTimeout(spawnMonsters, 1200);
  }
}

// ---------- 렌더링 ----------
function drawBackground() {
  ctx.fillStyle = "#cdeeff";
  ctx.fillRect(0, 0, W, H);
  // 구름
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  drawCloud(100, 70);
  drawCloud(500, 50);
  drawCloud(680, 110);
}

function drawCloud(x, y) {
  ctx.beginPath();
  ctx.ellipse(x, y, 30, 14, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 24, y + 4, 22, 12, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 24, y + 4, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlatforms() {
  for (const p of platforms) {
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "#5fb84f";
    ctx.fillRect(p.x, p.y, p.w, 8);
  }
}

function drawPlayer() {
  ctx.save();
  if (player.invuln > 0 && Math.floor(player.invuln / 5) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }
  const cx = player.x + player.w / 2;
  // 몸
  ctx.fillStyle = "#3b6fe0";
  ctx.fillRect(player.x, player.y + 14, player.w, player.h - 14);
  // 머리
  ctx.fillStyle = "#ffd8a8";
  ctx.beginPath();
  ctx.arc(cx, player.y + 10, 12, 0, Math.PI * 2);
  ctx.fill();
  // 머리카락
  ctx.fillStyle = "#e08b2b";
  ctx.beginPath();
  ctx.arc(cx, player.y + 4, 12, Math.PI, 0);
  ctx.fill();
  // 눈
  ctx.fillStyle = "#222";
  ctx.fillRect(cx + player.facing * 3 - 2, player.y + 9, 3, 3);

  // 공격 이펙트
  if (player.attackTimer > 0) {
    ctx.strokeStyle = "#fff86b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    const sx = player.facing === 1 ? player.x + player.w : player.x;
    ctx.arc(sx, player.y + player.h / 2, 30, player.facing === 1 ? -0.9 : Math.PI - 0.9, player.facing === 1 ? 0.9 : Math.PI + 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMonsters() {
  for (const m of monsters) {
    if (m.dead) continue;
    ctx.save();
    if (m.hitFlash > 0) ctx.filter = "brightness(2)";
    // 몸통
    ctx.fillStyle = "#6fbf4a";
    ctx.beginPath();
    ctx.ellipse(m.x + m.w / 2, m.y + m.h * 0.7, m.w / 2, m.h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    // 껍질
    ctx.fillStyle = "#c97a3d";
    ctx.beginPath();
    ctx.arc(m.x + m.w / 2, m.y + m.h * 0.35, m.h * 0.5, Math.PI, 0);
    ctx.fill();
    ctx.restore();

    // 몬스터 체력바
    const barW = m.w;
    ctx.fillStyle = "#222";
    ctx.fillRect(m.x, m.y - 8, barW, 4);
    ctx.fillStyle = "#e0453b";
    ctx.fillRect(m.x, m.y - 8, barW * (m.hp / m.maxHp), 4);
  }
}

function drawLevelUp() {
  if (levelUpTimer > 0) {
    levelUpTimer--;
    ctx.save();
    ctx.globalAlpha = Math.min(1, levelUpTimer / 30);
    ctx.fillStyle = "#ffcf3f";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("LEVEL UP!", W / 2, 100);
    ctx.restore();
  }
}

// ---------- HUD ----------
function updateHud() {
  document.getElementById("level").textContent = player.level;
  document.getElementById("kills").textContent = kills;

  const hpFill = document.getElementById("hp-fill");
  hpFill.style.width = `${(player.hp / player.maxHp) * 100}%`;
  document.getElementById("hp-text").textContent = `${Math.max(0, Math.floor(player.hp))}/${player.maxHp}`;

  const mpFill = document.getElementById("mp-fill");
  mpFill.style.width = `${(player.mp / player.maxMp) * 100}%`;
  document.getElementById("mp-text").textContent = `${player.mp}/${player.maxMp}`;

  const expFill = document.getElementById("exp-fill");
  expFill.style.width = `${(player.exp / player.expToNext) * 100}%`;
  document.getElementById("exp-text").textContent = `${player.exp}/${player.expToNext}`;
}

// ---------- 메인 루프 ----------
function loop() {
  updatePlayer();
  updateMonsters();

  drawBackground();
  drawPlatforms();
  drawMonsters();
  drawPlayer();
  drawLevelUp();

  requestAnimationFrame(loop);
}

updateHud();
loop();
