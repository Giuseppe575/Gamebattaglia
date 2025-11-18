// Simple top‑down shooter inspired by Battalion Commander 2
// This script implements a minimal endless run with missions and upgrades.

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI elements
const menuDiv = document.getElementById('menu');
const upgradeDiv = document.getElementById('upgrade');
const gameoverDiv = document.getElementById('gameover');
const uiDiv = document.getElementById('ui');
const missionsList = document.getElementById('missionsList');
const totalCoinsSpan = document.getElementById('totalCoins');
const coinsSpan = document.getElementById('coins');
const killsSpan = document.getElementById('kills');
const hpContainer = document.getElementById('hpContainer');
const gameoverStats = document.getElementById('gameoverStats');
const upgradeList = document.getElementById('upgradeList');
const coinsForUpgradeSpan = document.getElementById('coinsForUpgrade');

// Buttons
const playButton = document.getElementById('playButton');
const upgradeButton = document.getElementById('upgradeButton');
const backToMenuButton = document.getElementById('backToMenu');
const restartButton = document.getElementById('restartButton');

// Game variables
let state = 'menu';
let lastTime = 0;

// Player data and progression
let totalCoins = 0;
let missions = [
    {
        id: 'kill15',
        description: 'Uccidi 15 nemici',
        type: 'kills',
        target: 15,
        progress: 0,
        completed: false,
        rewardCoins: 20
    },
    {
        id: 'collect50',
        description: 'Raccogli 50 monete',
        type: 'collect',
        target: 50,
        progress: 0,
        completed: false,
        rewardCoins: 30
    },
    {
        id: 'run200',
        description: 'Percorri 200 metri in una partita',
        type: 'distance',
        target: 200,
        progress: 0,
        completed: false,
        rewardCoins: 25
    }
];

let upgrades = [
    {
        key: 'speed',
        name: 'Velocità',
        level: 0,
        baseCost: 50,
        maxLevel: 5
    },
    {
        key: 'firerate',
        name: 'Cadenza di tiro',
        level: 0,
        baseCost: 75,
        maxLevel: 5
    },
    {
        key: 'hp',
        name: 'Punti vita',
        level: 0,
        baseCost: 100,
        maxLevel: 5
    }
];

// Entities
class Player {
    constructor() {
        this.reset();
    }
    reset() {
        this.width = 24;
        this.height = 32;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 10;
        // Base speed; upgrade adds extra
        this.baseSpeed = 180;
        this.speed = this.baseSpeed + upgrades.find(u => u.key === 'speed').level * 30;
        this.maxHp = 3 + upgrades.find(u => u.key === 'hp').level;
        this.hp = this.maxHp;
        this.fireInterval = 0.35 - upgrades.find(u => u.key === 'firerate').level * 0.05;
        if (this.fireInterval < 0.1) this.fireInterval = 0.1;
        this.fireTimer = 0;
        this.kills = 0;
        this.collectedCoins = 0;
        this.distance = 0;
    }
    update(dt) {
        // Horizontal movement
        let dx = 0;
        if (keys['ArrowLeft'] || keys['a']) dx -= 1;
        if (keys['ArrowRight'] || keys['d']) dx += 1;
        this.x += dx * this.speed * dt;
        // Clamp horizontal position
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        // Distance increases with time (simple approximation: speed in y direction)
        this.distance += 60 * dt; // 60 pixels per second ~ 1 meter; adjust as desired
        // Shooting
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
            this.shoot();
            this.fireTimer = this.fireInterval;
        }
    }
    shoot() {
        const bullet = new Bullet(this.x + this.width / 2 - 2, this.y - 8);
        bullets.push(bullet);
    }
    draw() {
        ctx.fillStyle = '#0f0';
        // simple representation: a rectangle representing the soldier
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 8;
        this.speed = 350;
    }
    update(dt) {
        this.y -= this.speed * dt;
    }
    draw() {
        ctx.fillStyle = '#ff0';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 32;
        this.speed = 100 + Math.random() * 40;
    }
    update(dt) {
        this.y += this.speed * dt;
    }
    draw() {
        ctx.fillStyle = '#f00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 6;
        this.speed = 100;
    }
    update(dt) {
        this.y += this.speed * dt;
    }
    draw() {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Game state variables for current run
let player;
let bullets = [];
let enemies = [];
let coins = [];
let enemySpawnTimer = 0;
let enemySpawnInterval = 1.0;
let coinSpawnTimer = 0;
let coinSpawnInterval = 2.0;

// Input handling
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.key] = true;
});
window.addEventListener('keyup', e => {
    keys[e.key] = false;
});

// Utility functions
function rectsIntersect(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function circleRectIntersect(circle, rect) {
    // Check intersection between circle (with x,y,radius) and rectangle
    const distX = Math.abs(circle.x - (rect.x + rect.width / 2));
    const distY = Math.abs(circle.y - (rect.y + rect.height / 2));
    if (distX > (rect.width / 2 + circle.radius)) return false;
    if (distY > (rect.height / 2 + circle.radius)) return false;
    if (distX <= (rect.width / 2)) return true;
    if (distY <= (rect.height / 2)) return true;
    const dx = distX - rect.width / 2;
    const dy = distY - rect.height / 2;
    return (dx * dx + dy * dy <= circle.radius * circle.radius);
}

// Mission and upgrade helpers
function updateMissionProgress(type, amount = 1) {
    missions.forEach(m => {
        if (m.completed) return;
        if (m.type === type) {
            m.progress += amount;
            if (m.progress >= m.target) {
                m.completed = true;
                totalCoins += m.rewardCoins;
            }
        }
    });
}

function renderMissions() {
    missionsList.innerHTML = '';
    missions.forEach(m => {
        const li = document.createElement('li');
        const progress = m.completed ? 'Completata!' : `${Math.min(m.progress, m.target)}/${m.target}`;
        li.textContent = `${m.description} – ${progress}`;
        missionsList.appendChild(li);
    });
}

function renderHp() {
    hpContainer.innerHTML = '';
    for (let i = 0; i < player.maxHp; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart';
        if (i >= player.hp) {
            heart.style.opacity = 0.3;
        }
        hpContainer.appendChild(heart);
    }
}

function openMenu() {
    state = 'menu';
    menuDiv.classList.add('active');
    upgradeDiv.classList.remove('active');
    gameoverDiv.classList.remove('active');
    uiDiv.style.display = 'none';
    canvas.style.display = 'none';
    totalCoinsSpan.textContent = totalCoins;
    renderMissions();
}

function openUpgrade() {
    state = 'upgrade';
    menuDiv.classList.remove('active');
    upgradeDiv.classList.add('active');
    gameoverDiv.classList.remove('active');
    uiDiv.style.display = 'none';
    canvas.style.display = 'none';
    coinsForUpgradeSpan.textContent = totalCoins;
    // Render upgrade list
    upgradeList.innerHTML = '';
    upgrades.forEach((u, index) => {
        const div = document.createElement('div');
        div.className = 'upgrade-item';
        const info = document.createElement('span');
        info.textContent = `${u.name} livello ${u.level}/${u.maxLevel} (costo: ${u.baseCost * (u.level + 1)} monete)`;
        div.appendChild(info);
        const button = document.createElement('button');
        button.textContent = 'Acquista';
        button.disabled = (u.level >= u.maxLevel || totalCoins < u.baseCost * (u.level + 1));
        button.addEventListener('click', () => {
            const cost = u.baseCost * (u.level + 1);
            if (totalCoins >= cost && u.level < u.maxLevel) {
                totalCoins -= cost;
                u.level++;
                // Update player stats if currently created
                if (player) {
                    // adjust speed, fire rate, hp accordingly
                    player.speed = player.baseSpeed + upgrades.find(x => x.key === 'speed').level * 30;
                    player.fireInterval = 0.35 - upgrades.find(x => x.key === 'firerate').level * 0.05;
                    if (player.fireInterval < 0.1) player.fireInterval = 0.1;
                    player.maxHp = 3 + upgrades.find(x => x.key === 'hp').level;
                    if (player.hp > player.maxHp) player.hp = player.maxHp;
                }
                openUpgrade();
            }
        });
        div.appendChild(button);
        upgradeList.appendChild(div);
    });
}

function startGame() {
    state = 'playing';
    menuDiv.classList.remove('active');
    upgradeDiv.classList.remove('active');
    gameoverDiv.classList.remove('active');
    uiDiv.style.display = 'block';
    canvas.style.display = 'block';
    // Initialize player and arrays
    player = new Player();
    bullets = [];
    enemies = [];
    coins = [];
    enemySpawnTimer = 0;
    enemySpawnInterval = 1.0;
    coinSpawnTimer = 0;
    coinSpawnInterval = 2.0;
    // Reset mission run progress for distance mission only
    missions.forEach(m => {
        if (m.type === 'distance') {
            m.progress = 0;
        }
    });
    lastTime = 0;
}

function endGame() {
    state = 'gameover';
    gameoverDiv.classList.add('active');
    uiDiv.style.display = 'none';
    canvas.style.display = 'none';
    // show stats: kills, coins collected, distance
    const kills = player.kills;
    const runCoins = player.collectedCoins;
    const distance = Math.floor(player.distance);
    // Add coins to total
    totalCoins += runCoins;
    gameoverStats.innerHTML = `Uccisioni: ${kills}, Monete raccolte: ${runCoins}, Distanza: ${distance}`;
    totalCoinsSpan.textContent = totalCoins;
}

// Main game update and draw
function updateGame(dt) {
    player.update(dt);
    // spawn enemies and coins
    enemySpawnTimer -= dt;
    if (enemySpawnTimer <= 0) {
        enemySpawnTimer = enemySpawnInterval;
        const ex = Math.random() * (canvas.width - 24);
        enemies.push(new Enemy(ex, -32));
    }
    coinSpawnTimer -= dt;
    if (coinSpawnTimer <= 0) {
        coinSpawnTimer = coinSpawnInterval;
        const cx = Math.random() * (canvas.width - 12) + 6;
        coins.push(new Coin(cx, -10));
    }
    // update bullets
    bullets.forEach(b => b.update(dt));
    bullets = bullets.filter(b => b.y + b.height > 0);
    // update enemies
    enemies.forEach(e => e.update(dt));
    enemies = enemies.filter(e => e.y < canvas.height + 40);
    // update coins
    coins.forEach(c => c.update(dt));
    coins = coins.filter(c => c.y - c.radius < canvas.height + 20);
    // collisions bullet-enemy
    bullets.forEach((b, bi) => {
        enemies.forEach((e, ei) => {
            if (rectsIntersect(b, e)) {
                // remove both
                bullets.splice(bi, 1);
                enemies.splice(ei, 1);
                player.kills++;
                updateMissionProgress('kills', 1);
            }
        });
    });
    // collisions player-enemy
    enemies.forEach((e, ei) => {
        if (rectsIntersect(player, e)) {
            enemies.splice(ei, 1);
            player.hp--;
            if (player.hp <= 0) {
                endGame();
            }
        }
    });
    // collisions player-coin
    coins.forEach((c, ci) => {
        // coin is circle; player is rectangle
        if (circleRectIntersect(c, player)) {
            coins.splice(ci, 1);
            player.collectedCoins++;
            updateMissionProgress('collect', 1);
        }
    });
    // update distance mission progress in real time
    missions.forEach(m => {
        if (m.type === 'distance' && !m.completed) {
            m.progress = Math.max(m.progress, player.distance);
            if (m.progress >= m.target) {
                m.completed = true;
                totalCoins += m.rewardCoins;
            }
        }
    });
    // update UI displays
    coinsSpan.textContent = player.collectedCoins;
    killsSpan.textContent = player.kills;
    renderHp();
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // draw background (simple scrolling effect using vertical offset)
    // We'll create stripes to simulate snow/ground
    const stripeHeight = 50;
    const offset = (Date.now() / 50) % stripeHeight;
    for (let y = -stripeHeight; y < canvas.height; y += stripeHeight) {
        ctx.fillStyle = (Math.floor((y + offset) / stripeHeight) % 2 === 0) ? '#2e2e2e' : '#3a3a3a';
        ctx.fillRect(0, y + offset, canvas.width, stripeHeight);
    }
    // draw player
    player.draw();
    // draw bullets
    bullets.forEach(b => b.draw());
    // draw enemies
    enemies.forEach(e => e.draw());
    // draw coins
    coins.forEach(c => c.draw());
}

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (state === 'playing') {
        updateGame(dt);
        drawGame();
    }
    requestAnimationFrame(gameLoop);
}

// Event listeners for UI buttons
playButton.addEventListener('click', () => {
    startGame();
});
upgradeButton.addEventListener('click', () => {
    openUpgrade();
});
backToMenuButton.addEventListener('click', () => {
    openMenu();
});
restartButton.addEventListener('click', () => {
    openMenu();
});

// Initialize menu on load
openMenu();
requestAnimationFrame(gameLoop);
