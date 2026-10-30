const STORAGE_KEY = 'gun-shooter-2000-save';
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const loginScreen = document.getElementById('loginScreen');
const gameScreen = document.getElementById('gameScreen');
const authForm = document.getElementById('authForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginStatus = document.getElementById('loginStatus');
const restartBtn = document.getElementById('restartBtn');
const overlay = document.getElementById('gameOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');

const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const bestScoreEl = document.getElementById('bestScore');
const playerNameEl = document.getElementById('playerName');
const healthBarEl = document.getElementById('healthBar');

const input = {
  keys: {},
  mouseX: canvas.width / 2,
  mouseY: canvas.height / 2,
  mouseDown: false,
};

let profile = loadProfile();
let currentPlayer = null;
let gameState = null;
let lastTime = 0;

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { username: '', password: '', bestScore: 0, highestWave: 0 };
    }
    const loaded = JSON.parse(raw);
    return {
      username: loaded.username || '',
      password: loaded.password || '',
      bestScore: Number(loaded.bestScore) || 0,
      highestWave: Number(loaded.highestWave) || 0,
    };
  } catch (error) {
    return { username: '', password: '', bestScore: 0, highestWave: 0 };
  }
}

function saveProfile() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function createPlayer() {
  return {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 18,
    speed: 265,
    health: 100,
    maxHealth: 100,
    weaponLevel: 1,
    fireCooldown: 0,
    angle: 0,
    color: '#77f2ff',
  };
}

function resetGame() {
  currentPlayer = createPlayer();
  gameState = {
    running: true,
    score: 0,
    wave: 1,
    enemies: [],
    bullets: [],
    particles: [],
    powerUps: [],
    message: 'Wave 1',
    finalMessage: '',
    bossActive: false,
    waveDelay: 0,
  };

  playerNameEl.textContent = profile.username || 'Player One';
  bestScoreEl.textContent = profile.bestScore;
  spawnWave(1);
  updateHUD();
  overlay.classList.add('hidden');
}

function showLogin() {
  loginScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
  loginStatus.textContent = 'Use your saved profile or create a new one.';
}

function showGame() {
  loginScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
}

function isLoggedIn() {
  return Boolean(profile.username && profile.password);
}

function handleLogin(event) {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    loginStatus.textContent = 'Username and password are required.';
    loginStatus.style.color = '#ffca57';
    return;
  }

  const savedUser = profile.username === username && profile.password === password;

  if (savedUser) {
    loginStatus.textContent = `Welcome back, ${username}!`;
    loginStatus.style.color = '#7eff83';
  } else {
    profile.username = username;
    profile.password = password;
    profile.bestScore = profile.bestScore || 0;
    profile.highestWave = profile.highestWave || 0;
    saveProfile();
    loginStatus.textContent = `New profile created: ${username}`;
    loginStatus.style.color = '#7eff83';
  }

  playerNameEl.textContent = username;
  bestScoreEl.textContent = profile.bestScore;
  showGame();
  resetGame();
}

authForm.addEventListener('submit', handleLogin);

restartBtn.addEventListener('click', () => {
  resetGame();
});

window.addEventListener('keydown', (event) => {
  input.keys[event.key.toLowerCase()] = true;

  if (event.key === ' ') {
    event.preventDefault();
    input.mouseDown = true;
  }
});

window.addEventListener('keyup', (event) => {
  input.keys[event.key.toLowerCase()] = false;
  if (event.key === ' ') {
    input.mouseDown = false;
  }
});

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  input.mouseX = (event.clientX - rect.left) * scaleX;
  input.mouseY = (event.clientY - rect.top) * scaleY;
});

canvas.addEventListener('mousedown', () => {
  input.mouseDown = true;
});

canvas.addEventListener('mouseup', () => {
  input.mouseDown = false;
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function spawnWave(wave) {
  const numberOfEnemies = Math.min(5 + wave * 2, 30);

  for (let i = 0; i < numberOfEnemies; i += 1) {
    const side = Math.floor(Math.random() * 4);
    let x = 0; let y = 0;

    if (side === 0) {
      x = randomBetween(0, canvas.width);
      y = -30;
    } else if (side === 1) {
      x = canvas.width + 30;
      y = randomBetween(0, canvas.height);
    } else if (side === 2) {
      x = randomBetween(0, canvas.width);
      y = canvas.height + 30;
    } else {
      x = -30;
      y = randomBetween(0, canvas.height);
    }

    const enemy = {
      x, y,
      radius: 14 + Math.random() * 8,
      speed: 80 + wave * 7 + Math.random() * 20,
      hp: 18 + wave * 6,
      maxHp: 18 + wave * 6,
      damage: 8 + wave,
      color: wave % 2 === 0 ? '#ff8c6b' : '#ff5a7a',
      type: 'scout',
      shootTimer: randomBetween(0.8, 2.4),
    };

    if (wave >= 3 && Math.random() < 0.22) {
      enemy.type = 'tank';
      enemy.radius = 22;
      enemy.speed = 52 + wave * 4;
      enemy.hp = 44 + wave * 10;
      enemy.maxHp = enemy.hp;
      enemy.damage = 14 + wave;
      enemy.color = '#ffca57';
    }

    if (wave >= 5 && Math.random() < 0.12) {
      enemy.type = 'runner';
      enemy.radius = 12;
      enemy.speed = 115 + wave * 10;
      enemy.hp = 14 + wave * 5;
      enemy.maxHp = enemy.hp;
      enemy.damage = 12 + wave;
      enemy.color = '#7de4ff';
    }

    gameState.enemies.push(enemy);
  }

  if (wave % 5 === 0) {
    const boss = {
      x: canvas.width / 2,
      y: -80,
      radius: 46,
      speed: 68,
      hp: 220 + wave * 35,
      maxHp: 220 + wave * 35,
      damage: 22 + wave,
      color: '#ff3d81',
      type: 'boss',
      shootTimer: 1.5,
      phase: 0,
    };
    gameState.enemies.push(boss);
    gameState.bossActive = true;
    gameState.message = `Boss wave ${wave}`;
  } else {
    gameState.bossActive = false;
  }
}

function updatePlayer(dt) {
  if (!currentPlayer) return;

  const moveX = (input.keys.d ? 1 : 0) - (input.keys.a ? 1 : 0);
  const moveY = (input.keys.s ? 1 : 0) - (input.keys.w ? 1 : 0);
  const length = Math.hypot(moveX, moveY) || 1;

  currentPlayer.x += (moveX / length) * currentPlayer.speed * dt;
  currentPlayer.y += (moveY / length) * currentPlayer.speed * dt;

  currentPlayer.x = clamp(currentPlayer.x, currentPlayer.radius + 10, canvas.width - currentPlayer.radius - 10);
  currentPlayer.y = clamp(currentPlayer.y, currentPlayer.radius + 10, canvas.height - currentPlayer.radius - 10);

  currentPlayer.angle = Math.atan2(input.mouseY - currentPlayer.y, input.mouseX - currentPlayer.x);
  currentPlayer.fireCooldown = Math.max(0, currentPlayer.fireCooldown - dt);

  if (input.mouseDown && currentPlayer.fireCooldown <= 0) {
    shoot();
    currentPlayer.fireCooldown = currentPlayer.weaponLevel >= 3 ? 0.12 : 0.18;
  }
}

function shoot() {
  const count = currentPlayer.weaponLevel >= 2 ? 3 : 1;
  const spreadStep = currentPlayer.weaponLevel >= 3 ? 0.18 : 0.09;

  for (let i = 0; i < count; i += 1) {
    const angle = currentPlayer.angle + (i - (count - 1) / 2) * spreadStep;
    gameState.bullets.push({
      x: currentPlayer.x + Math.cos(angle) * 28,
      y: currentPlayer.y + Math.sin(angle) * 28,
      radius: 5,
      speed: 520,
      angle,
      damage: currentPlayer.weaponLevel >= 3 ? 16 : 11,
      color: '#aafcff',
      life: 1.2,
    });
  }
}

function updateBullets(dt) {
  for (let i = gameState.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = gameState.bullets[i];
    bullet.x += Math.cos(bullet.angle) * bullet.speed * dt;
    bullet.y += Math.sin(bullet.angle) * bullet.speed * dt;
    bullet.life -= dt;

    if (
      bullet.life <= 0 ||
      bullet.x < -20 || bullet.x > canvas.width + 20 ||
      bullet.y < -20 || bullet.y > canvas.height + 20
    ) {
      gameState.bullets.splice(i, 1);
    }
  }
}

function updateEnemies(dt) {
  for (let i = gameState.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = gameState.enemies[i];

    const dx = currentPlayer.x - enemy.x;
    const dy = currentPlayer.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;

    if (enemy.type === 'boss') {
      enemy.x += Math.cos(enemy.phase) * 50 * dt;
      enemy.phase += 2.2 * dt;
      enemy.x = clamp(enemy.x, 120, canvas.width - 120);
      enemy.y = clamp(enemy.y + enemy.speed * 0.28 * dt, 80, 260);
    } else {
      enemy.x += dirX * enemy.speed * dt;
      enemy.y += dirY * enemy.speed * dt;
    }

    if (enemy.type !== 'boss') {
      enemy.shootTimer -= dt;
      if (enemy.shootTimer <= 0 && dist < 260) {
        const angle = Math.atan2(dy, dx);
        gameState.bullets.push({
          x: enemy.x,
          y: enemy.y,
          radius: 6,
          speed: 320,
          angle,
          damage: enemy.damage,
          color: '#ff7d7d',
          life: 2.3,
          enemyShot: true,
        });
        enemy.shootTimer = randomBetween(1.2, 2.3);
      }
    }

    if (dist < enemy.radius + currentPlayer.radius) {
      currentPlayer.health -= enemy.damage * dt * 1.5;
      currentPlayer.x -= dirX * 30 * dt;
      currentPlayer.y -= dirY * 30 * dt;
    }
  }

  for (let i = gameState.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = gameState.bullets[i];

    for (let j = gameState.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = gameState.enemies[j];
      if (!enemy || bullet.enemyShot) continue;

      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= bullet.radius + enemy.radius) {
        enemy.hp -= bullet.damage;
        gameState.bullets.splice(i, 1);

        spawnParticles(enemy.x, enemy.y, '#8ce9ff', 8);

        if (enemy.hp <= 0) {
          destroyEnemy(j, enemy);
        }
        break;
      }
    }
  }
}

function destroyEnemy(index, enemy) {
  gameState.enemies.splice(index, 1);
  gameState.score += enemy.type === 'boss' ? 400 : 20;
  spawnParticles(enemy.x, enemy.y, enemy.color, enemy.type === 'boss' ? 26 : 12);

  if (Math.random() < 0.18) {
    const powers = ['heal', 'rapid', 'shield'];
    const kind = powers[Math.floor(Math.random() * powers.length)];
    gameState.powerUps.push({ x: enemy.x, y: enemy.y, radius: 10, type: kind });
  }

  if (gameState.enemies.length === 0 && !gameState.bossActive) {
    gameState.wave += 1;
    gameState.waveDelay = 1.2;
    gameState.message = `Wave ${gameState.wave}`;
  }
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    gameState.particles.push({
      x,
      y,
      vx: randomBetween(-110, 110),
      vy: randomBetween(-110, 110),
      radius: randomBetween(2, 5),
      life: randomBetween(0.3, 0.8),
      color,
    });
  }
}

function updatePowerUps(dt) {
  for (let i = gameState.powerUps.length - 1; i >= 0; i -= 1) {
    const power = gameState.powerUps[i];
    power.y += Math.sin((performance.now() / 300) + i) * 10 * dt;

    const dx = currentPlayer.x - power.x;
    const dy = currentPlayer.y - power.y;
    const dist = Math.hypot(dx, dy);

    if (dist < currentPlayer.radius + power.radius) {
      applyPower(power.type);
      gameState.powerUps.splice(i, 1);
    }
  }
}

function applyPower(type) {
  if (type === 'heal') {
    currentPlayer.health = Math.min(currentPlayer.maxHealth, currentPlayer.health + 30);
  }

  if (type === 'rapid') {
    currentPlayer.weaponLevel = Math.min(3, currentPlayer.weaponLevel + 1);
  }

  if (type === 'shield') {
    currentPlayer.health = Math.min(currentPlayer.maxHealth, currentPlayer.health + 18);
  }
}

function updateParticles(dt) {
  for (let i = gameState.particles.length - 1; i >= 0; i -= 1) {
    const p = gameState.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    if (p.life <= 0) {
      gameState.particles.splice(i, 1);
    }
  }
}

function updateGame(dt) {
  if (!gameState || !currentPlayer) return;

  if (gameState.waveDelay > 0) {
    gameState.waveDelay -= dt;
    if (gameState.waveDelay <= 0) {
      spawnWave(gameState.wave);
    }
  }

  updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updatePowerUps(dt);
  updateParticles(dt);

  if (gameState.enemies.length === 0 && gameState.waveDelay <= 0 && !gameState.bossActive && !gameState.running) {
    gameState.running = true;
  }

  currentPlayer.health = clamp(currentPlayer.health, 0, currentPlayer.maxHealth);

  if (currentPlayer.health <= 0) {
    gameOver();
  }

  updateHUD();
}

function gameOver() {
  if (!gameState.running) return;
  gameState.running = false;
  overlayTitle.textContent = 'Game Over';
  overlayText.textContent = `You reached wave ${gameState.wave} with a score of ${gameState.score}.`;
  overlay.classList.remove('hidden');

  profile.bestScore = Math.max(profile.bestScore, gameState.score);
  profile.highestWave = Math.max(profile.highestWave, gameState.wave);
  saveProfile();
  bestScoreEl.textContent = profile.bestScore;
}

function updateHUD() {
  if (!gameState || !currentPlayer) return;
  scoreEl.textContent = Math.floor(gameState.score);
  waveEl.textContent = gameState.wave;
  healthBarEl.style.width = `${(currentPlayer.health / currentPlayer.maxHealth) * 100}%`;
  bestScoreEl.textContent = profile.bestScore;
}

function drawBackground() {
  ctx.fillStyle = '#07111d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 50; i += 1) {
    const x = (i * 97) % canvas.width;
    const y = (i * 71) % canvas.height;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawBullets() {
  for (const bullet of gameState.bullets) {
    ctx.beginPath();
    ctx.fillStyle = bullet.color;
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const enemy of gameState.enemies) {
    ctx.beginPath();
    ctx.fillStyle = enemy.color;
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 12, enemy.radius * 2, 6);
    ctx.fillStyle = '#7ef7a8';
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 12, (enemy.hp / enemy.maxHp) * enemy.radius * 2, 6);
  }
}

function drawPowerUps() {
  for (const power of gameState.powerUps) {
    ctx.beginPath();
    ctx.fillStyle = power.type === 'heal' ? '#7eff83' : power.type === 'rapid' ? '#74f7ff' : '#ffca57';
    ctx.arc(power.x, power.y, power.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  const p = currentPlayer;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#d7f9ff';
  ctx.fillRect(0, -4, 24, 8);
  ctx.restore();

  ctx.beginPath();
  ctx.fillStyle = '#7be8ff';
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.stroke();
}

function drawParticles() {
  for (const p of gameState.particles) {
    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.globalAlpha = clamp(p.life, 0, 1);
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawBossBar() {
  const boss = gameState.enemies.find((enemy) => enemy.type === 'boss');
  if (!boss) return;

  const width = 420;
  const x = canvas.width / 2 - width / 2;
  const y = 18;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(x, y, width, 16);
  ctx.fillStyle = '#ff5a5a';
  ctx.fillRect(x, y, (boss.hp / boss.maxHp) * width, 16);
  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('BOSS', canvas.width / 2, 32);
}

function drawGame() {
  if (!gameState || !currentPlayer) return;

  drawBackground();
  drawParticles();
  drawPowerUps();
  drawBullets();
  drawEnemies();
  drawPlayer();
  drawBossBar();

  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${Math.floor(gameState.score)}`, 18, 28);
  ctx.fillText(`Wave: ${gameState.wave}`, 18, 52);
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0.016, 0.033);
  lastTime = timestamp;

  if (gameState && gameState.running) {
    updateGame(dt);
  }

  drawGame();
  requestAnimationFrame(gameLoop);
}

if (isLoggedIn()) {
  playerNameEl.textContent = profile.username;
  bestScoreEl.textContent = profile.bestScore;
  showGame();
  resetGame();
} else {
  showLogin();
}

requestAnimationFrame(gameLoop);
