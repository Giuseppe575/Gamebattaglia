        // Fix: ripristinato avvio game loop e rendering di player/nemici dopo introduzione immagini sprite.
        // Desert Raiders update: sprite-based enemies, bullets and heart pickups with asset preloading.
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const playerEntity = document.getElementById('playerEntity');

        const menuOverlay = document.getElementById('menuOverlay');
        const mainMenuButtons = document.getElementById('mainMenuButtons');
        const perksMenu = document.getElementById('perksMenu');
        const gameOverMenu = document.getElementById('gameOverMenu');
        const perkPointsDisplay = document.getElementById('perkPoints');
        const perksPanel = document.getElementById('perksPanel');

        const backgroundMusic = new Audio('https://nu.vgmtreasurechest.com/soundtracks/girls-battlefield-android-ios-windows-gamerip-2023/vyzopqeldn/01.mp3');
        backgroundMusic.loop = true;
        backgroundMusic.volume = 0.5;
        backgroundMusic.preload = 'auto';

        // === SPRITE GRAFICI ===
        const images = {};
        let assetsReady = false;
        let pendingStart = false;
        const enemyCanvas = document.createElement('canvas');
        const enemyCtx = enemyCanvas.getContext('2d');

        function loadSprite(key, src) {
            const img = new Image();
            img.src = src;
            images[key] = img;
        }

        // Sprite di base dei nemici + atlante scena per estrarre i soldati identici al mockup
        // [OLD] Sprite precedente per enemy1 (non più utilizzato)
        // loadSprite('enemy1', 'assets/enemy1.png');
        const enemy1Img = new Image();
        enemy1Img.src = "assets/enemy1gif.gif";
        loadSprite('enemy2', 'assets/enemy2.png');
        loadSprite('enemyA', 'assets/BE3A88FB-B8AD-4BB2-9860-AD27070A22A3.png');
        loadSprite('enemyB', 'assets/E641B542-9B7C-4911-AA14-6D144B64BC78.png');
        loadSprite('sceneAtlas', 'scena.png'); // contiene i soldati di riferimento

        // Sprite giocatore
        const playerImg = new Image();
        let playerImgReady = false;
        playerImg.onload = () => { playerImgReady = true; };
        playerImg.src = 'assets/player_soldier.png';
        if (playerImg.complete && playerImg.naturalWidth > 0) playerImgReady = true;
        const playerRunFrames = [];
        let playerRunReady = false;
        let playerIdleImg = null;
        (function loadPlayerRunFrames() {
            const files = Array.from({ length: 12 }, (_, i) => {
                const idx = String(i + 1).padStart(2, '0');
                return `assets/player_run/run_${idx}.png`;
            });
            let loaded = 0;
            files.forEach((src, i) => {
                const img = new Image();
                img.onload = () => {
                    loaded++;
                    if (!playerIdleImg) playerIdleImg = img;
                    if (loaded === files.length) playerRunReady = true;
                };
                img.src = src;
                playerRunFrames[i] = img;
            });
        })();

        const MUZZLE_OFFSET_X = 60;
        const MUZZLE_OFFSET_Y = -10;
        const PLAYER_ROT_OFFSET = Math.PI / 2; // sprite faces right in texture; rotate to align "up"
        const PLAYER_ANGLE_OFFSET = -0.3; // correzione base per fucile orizzontale

        const atlasSlices = [
            { x: 18,  y: 400, w: 150, h: 180 }, // soldato in piedi che spara (basso sinistra)
            { x: 30,  y: 280, w: 90,  h: 110 }, // soldato accovacciato dietro cactus
            { x: 165, y: 165, w: 80,  h: 95  }, // soldato sulla duna in alto
            { x: 260, y: 320, w: 85,  h: 115 }  // soldato inginocchiato a destra
        ];
        const enemySprites = [];
        let atlasPrepared = false;

        function prepareAtlasSprites() {
            if (atlasPrepared) return;
            const atlas = images.sceneAtlas;
            if (!isValidImage(atlas)) {
                atlas.onload = prepareAtlasSprites;
                return;
            }
            atlasPrepared = true;
            atlasSlices.forEach(rect => {
                const buf = document.createElement('canvas');
                buf.width = rect.w;
                buf.height = rect.h;
                const bctx = buf.getContext('2d');
                bctx.drawImage(atlas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
                enemySprites.push({ img: buf, w: rect.w, h: rect.h });
            });
        }

        function isValidImage(img) {
            return !!(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
        }

        function loadAssets() {
            if (assetsReady) return;
            // Inline asset fallback to avoid missing local files
            loadSprite('heart',  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAQAAAC1HAwCAAAADklEQVR42mNk+M/wHwADoQE4CuzRLwAAAABJRU5ErkJggg==');
            loadSprite('bullet', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAQAAAC1HAwCAAAADklEQVR42mP8z/CfBwADNwG+5nbCfQAAAABJRU5ErkJggg==');
            assetsReady = true;
            prepareAtlasSprites();
            if (pendingStart) {
                pendingStart = false;
                startGame();
            }
        }

        const audioBeep = "data:audio/wav;base64,UklGRtIzAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0Ya4zAAAAADUDZwaSCbQMyQ/OEsAVxBgcFZgepiC5IhMhnSOk5EYCk99ZSh5Nqjmn/Edbhs4g86KF9oBCdMZ5yA4zHyCi8AaSzpvD34cRjhBiwgY/HtMfPIETbUCLp4zCJKkxhspCqtFah0ntTnqOijjkWw6djG3E17RpUllAnp8RyoiCs8JczwbYjysLttCSFs/+eKTs6N6uH8RIGYH4IDGbESgDS3x1q3sp69I4VqXVpFU+OjRBiXyBWXkcnv/0AjX+i/3Xf2RPGG3QZhXXF0FWu0QiRecy2UYhgVjvIWp2L0tEyflnxB+IQNdpx4uCIljOB3RuI8xKJSzCs+uyMc69BGCh4GmD4kpJsmO0DmS+EZwFoOcVwzWv+4n5PyhIqAX6/hU8lm34ZbZFv34/N+Dz9zTIGajx9QhZWzvNLhSh+XPMtLHm7NHRiqFWFnhz2PfvZ0SQLnJxx5SOaIsIqXQL5WPtmr1/rP5T+YmqwFklxMQ1bSwsa7gUCxQaIODFqNEUA3wZnYmAoZDM1vR7q6KFpYv8dAr5taU4BYHXI11Tx+COuVa4gtFEcWrvIFOP4COwOmh7ELyOAlT1QzcHtkmJvqN1JAaSzUBL+LuMS+odzw86799WsJ1rmwlIW13n8FO2LoduiasG5CNkFCkXeZ0Lm52gp3JBML6qRZypVV1gEQi7CoF4PjRlfngqAiPLZM7g1rYu2gW/eKx6F5XDaaAzzXyfFW0qdO+BalDx9o8lUaq3JPK+zMsHjID0Fn9uSlGyxhWk6CK2U1teJz4P9/2idz27ddYqnb9mTgfbxlFMm60xTJFQ9yt1IxGcmQ6BJFmZH6bXS5ajg==";

        function createSound(src, { volume = 0.5, playbackRate = 1, poolSize = 3 } = {}) {
            const elements = Array.from({ length: poolSize }, () => {
                const audio = new Audio(src);
                audio.preload = 'auto';
                audio.volume = volume;
                audio.playbackRate = playbackRate;
                return audio;
            });

            let idx = 0;
            const prime = () => {
                elements.forEach(a => {
                    const originalVolume = a.volume;
                    a.volume = 0;
                    a.currentTime = 0;
                    a.play().then(() => {
                        a.pause();
                        a.currentTime = 0;
                        a.volume = originalVolume;
                    }).catch(() => { a.volume = originalVolume; });
                });
            };

            const play = () => {
                const audio = elements[idx];
                idx = (idx + 1) % elements.length;
                audio.currentTime = 0;
                audio.play().catch(() => {});
            };

            return { play, prime };
        }

        const sounds = {
            laser: createSound('retro-laser-1-236669.mp3', { volume: 0.4, playbackRate: 1.1, poolSize: 4 }),
            targetExplosion: createSound('https://cdn.pixabay.com/download/audio/2022/03/15/audio_1d6c536fb8.mp3?filename=8-bit-explosion-14624.mp3', { volume: 0.6, playbackRate: 1, poolSize: 5 }),
            bossDeath: createSound('https://cdn.pixabay.com/download/audio/2021/09/17/audio_13792c8842.mp3?filename=retro-explosion-4-88698.mp3', { volume: 0.55, playbackRate: 0.75, poolSize: 3 }),
            playerHit: createSound(audioBeep, { volume: 0.45, playbackRate: 0.7, poolSize: 3 }),
            powerup: createSound(audioBeep, { volume: 0.35, playbackRate: 1.5, poolSize: 2 }),
            gameOver: createSound(audioBeep, { volume: 0.45, playbackRate: 0.5, poolSize: 1 })
        };

        let audioPrimed = false;
        function primeAudio() {
            if (audioPrimed) return;
            Object.values(sounds).forEach(s => s.prime());
            backgroundMusic.volume = 0;
            backgroundMusic.currentTime = 0;
            backgroundMusic.play().then(() => {
                backgroundMusic.pause();
                backgroundMusic.currentTime = 0;
                backgroundMusic.volume = 0.4;
            }).catch(() => { backgroundMusic.volume = 0.4; });
            audioPrimed = true;
        }

        function startMusic() {
            backgroundMusic.currentTime = 0;
            backgroundMusic.play().catch(() => {});
        }

        function stopMusic() {
            backgroundMusic.pause();
        }

        function enableAudioOnInteraction() {
            const unlock = () => {
                primeAudio();
                startMusic();
                ['pointerdown', 'touchstart', 'keydown'].forEach(evt => {
                    window.removeEventListener(evt, unlock);
                });
            };

            ['pointerdown', 'touchstart', 'keydown'].forEach(evt => {
                window.addEventListener(evt, unlock, { once: false, passive: true });
            });
        }
        
        const GW = 450;
        const GH = 800;
        const BG_TILE_H = 320;
        const backgroundState = {
            offsetY: 0, // scrolling changed from horizontal (X) to vertical (Y)
            cactusLayouts: [
                [
                    { x: 60,  y: BG_TILE_H * 0.65, scale: 1.05, flip: false },
                    { x: 390, y: BG_TILE_H * 0.25, scale: 0.9,  flip: true  },
                    { x: 340, y: BG_TILE_H * 0.78, scale: 1.05, flip: false },
                    { x: 110, y: BG_TILE_H * 0.2,  scale: 0.85, flip: false }
                ],
                [
                    { x: 80,  y: BG_TILE_H * 0.35, scale: 0.95, flip: false },
                    { x: 280, y: BG_TILE_H * 0.22, scale: 0.9,  flip: true  },
                    { x: 400, y: BG_TILE_H * 0.62, scale: 1.1,  flip: false },
                    { x: 60,  y: BG_TILE_H * 0.85, scale: 1.15, flip: true  }
                ],
                [
                    { x: 120, y: BG_TILE_H * 0.18, scale: 0.9,  flip: false },
                    { x: 360, y: BG_TILE_H * 0.32, scale: 0.95, flip: true  },
                    { x: 260, y: BG_TILE_H * 0.7,  scale: 1.2,  flip: false },
                    { x: 60,  y: BG_TILE_H * 0.62, scale: 1.05, flip: false }
                ],
                [
                    { x: 40,  y: BG_TILE_H * 0.28, scale: 1.0,  flip: true  },
                    { x: 150, y: BG_TILE_H * 0.75, scale: 1.15, flip: false },
                    { x: 320, y: BG_TILE_H * 0.18, scale: 0.85, flip: false },
                    { x: 420, y: BG_TILE_H * 0.58, scale: 1.1,  flip: true  }
                ]
            ],
            sandSpecks: Array.from({ length: 80 }, () => ({
                x: Math.random() * GW,
                y: Math.random() * BG_TILE_H,
                r: 1 + Math.random() * 2.4,
                opacity: 0.1 + Math.random() * 0.2
            }))
        };

        const PERKS = [
            { id: 'rapid', name: 'Rapid Fire', desc: 'Spara più veloce', cost: 100, max: 5, val: (lvl) => 250 - (lvl*30) },
            { id: 'health', name: 'Toughness', desc: 'Salute iniziale extra', cost: 150, max: 5, val: (lvl) => 10 + (lvl*5) },
            { id: 'speed', name: 'Scout', desc: 'Velocità movimento', cost: 100, max: 3, val: (lvl) => 300 + (lvl*50) },
            { id: 'magnet', name: 'Magnet', desc: 'Raggio raccolta', cost: 120, max: 4, val: (lvl) => 40 + (lvl*20) },
            { id: 'greed', name: 'Greed', desc: 'Moltiplicatore punti', cost: 200, max: 3, val: (lvl) => 1 + (lvl*0.5) }
        ];

        // CARICAMENTO DATI CON BONUS DI BENVENUTO
        let savedData = JSON.parse(localStorage.getItem('arctic_save')) || { score: 2000, levels: {} }; // Bonus 2000 per test
        PERKS.forEach(p => { if(savedData.levels[p.id] === undefined) savedData.levels[p.id] = 0; });

        function advanceBackground(distance) {
            // Scrolling verticale: prima usavamo offset su X, ora accumuliamo su Y per movimento bottom->top.
            backgroundState.offsetY = (backgroundState.offsetY + distance) % BG_TILE_H;
        }

        class Enemy {
            constructor({ x, y, isHeavy = false }) {
                this.x = x;
                this.y = y;
                this.isHeavy = isHeavy;
                this.size = isHeavy ? 45 : 35;
        this.hp = isHeavy ? 3 : 1;
        this.speed = 140;
        this.score = isHeavy ? 20 : 10;
        this.fireDelay = 0.8 + Math.random() * 0.7;
        this.fireTimer = this.fireDelay;

                const sprites = enemySprites.length
                    ? enemySprites
                    : [images.enemyA, images.enemyB, enemy1Img, images.enemy2].filter(Boolean).map(img => ({ img, w: this.size, h: this.size }));
                this.sprite = sprites.length ? sprites[Math.floor(Math.random() * sprites.length)] : null;
                this.dead = false;
            }

    update(dt, player) {
        const dx = player.x - this.x;
        const dy = Math.max(player.y - this.y, 20); // bias downward so they keep advancing
        const dist = Math.max(Math.hypot(dx, dy), 1);
        this.x += (dx / dist) * this.speed * dt * 0.8;
        this.y += (dy / dist) * this.speed * dt;
        this.x = Math.max(20, Math.min(GW - 20, this.x));

        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
            this.fireTimer = this.fireDelay + Math.random() * 0.6;
            const nx = dx / dist;
            const ny = dy / dist;
            return { x: this.x, y: this.y, dx: nx, dy: ny, speed: 260 };
        }
        return null;
    }

            draw(ctx) {
                if (!this.isHeavy && enemy1Img && enemy1Img.complete) {
                    const enemyW = 220;
                    const enemyH = 260;
                    enemyCanvas.width = enemyW;
                    enemyCanvas.height = enemyH;
                    enemyCtx.clearRect(0, 0, enemyW, enemyH);
                    enemyCtx.drawImage(enemy1Img, 0, 0, enemyW, enemyH);
                    const imageData = enemyCtx.getImageData(0, 0, enemyW, enemyH);
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        // soglia più alta per rimuovere il bordo scuro della GIF
                        if (r < 60 && g < 60 && b < 60) {
                            data[i + 3] = 0;
                        }
                    }
                    enemyCtx.putImageData(imageData, 0, 0);
                    ctx.drawImage(enemyCanvas, this.x - enemyW / 2, this.y - enemyH / 2, enemyW, enemyH);
                } else if (this.sprite && isValidImage(this.sprite.img || this.sprite)) {
                    const meta = this.sprite.img ? this.sprite : { img: this.sprite, w: this.size, h: this.size };
                    const targetH = this.isHeavy ? 92 : 82;
                    const scale = targetH / meta.h;
                    const targetW = meta.w * scale;
                    ctx.drawImage(meta.img, this.x - targetW / 2, this.y - targetH / 2, targetW, targetH);
                } else {
                    // fallback quadrato
                    const half = this.size / 2;
                    ctx.fillStyle = '#b45309';
                    ctx.fillRect(this.x - half, this.y - half, this.size, this.size);
                }
            }

            getBounds() {
                const half = this.size / 2;
                return { x: this.x - half, y: this.y - half, w: this.size, h: this.size };
            }
        }

let game = {
    running: false, hp: 10, maxHp: 10, score: 0, dist: 0,
    player: {
        x: GW/2, y: GH*0.75,
        angle: -Math.PI / 2, muzzleTimer: 0,
        walkPhase: 0, walkSpeed: 0, prevX: GW/2, prevY: GH*0.75,
        state: 'idle', animFrame: 0, animTimer: 0
    },
    enemies: [], bullets: [], enemyBullets: [], powerups: [], bossBullets: [], boss: null,
    nextBossDist: 1000, lastTime: 0, fireTimer: 0,
    fireRate: 250, moveSpeed: 300, pickupRad: 40, scoreMult: 1
};

        function saveGame() {
            savedData.score = Math.floor(savedData.score);
            localStorage.setItem('arctic_save', JSON.stringify(savedData));
        }

        function showMainMenu() {
            menuOverlay.style.display = 'flex';
            mainMenuButtons.classList.remove('hidden');
            perksMenu.classList.add('hidden');
            gameOverMenu.classList.add('hidden');
            playerEntity.style.display = 'none';
            document.getElementById('bossBarContainer').style.display = 'none';
        }

        function applyPerks() {
            game.fireRate = PERKS[0].val(savedData.levels['rapid']);
            game.maxHp = PERKS[1].val(savedData.levels['health']);
            game.moveSpeed = PERKS[2].val(savedData.levels['speed']);
            game.pickupRad = PERKS[3].val(savedData.levels['magnet']);
            game.scoreMult = PERKS[4].val(savedData.levels['greed']);
            game.hp = game.maxHp;
        }

        function renderPerksList() {
            perkPointsDisplay.innerText = Math.floor(savedData.score);
            perksPanel.innerHTML = '';

            PERKS.forEach(p => {
                let lvl = savedData.levels[p.id];
                let cost = p.cost * (lvl + 1);
                let isMax = lvl >= p.max;
                let canAfford = savedData.score >= cost;
                
                let dots = '';
                for(let i=0; i<p.max; i++) dots += `<div class="dot ${i<lvl ? 'active' : ''}"></div>`;

                // Logica per stile bottone
                let btnClass = 'buy-btn';
                if (isMax) btnClass += ' maxed';
                else if (!canAfford) btnClass += ' poor';
                
                let btnText = isMax ? 'MAX' : cost;

                let card = document.createElement('div');
                card.className = 'perk-card';
                card.innerHTML = `
                    <div class="perk-info">
                        <div class="perk-name">${p.name} <span style="color:white; font-weight:normal">Lv.${lvl}</span></div>
                        <div class="perk-desc">${p.desc}</div>
                        <div class="perk-dots">${dots}</div>
                    </div>
                    <button id="btn-${p.id}" class="${btnClass}" onclick="buyPerk('${p.id}')">${btnText}</button>
                `;
                perksPanel.appendChild(card);
            });
        }

        window.buyPerk = function(id) {
            let p = PERKS.find(x => x.id === id);
            let lvl = savedData.levels[id];
            let cost = p.cost * (lvl + 1);
            let btn = document.getElementById(`btn-${id}`);

            if (lvl < p.max) {
                if (savedData.score >= cost) {
                    // Successo
                    savedData.score -= cost;
                    savedData.levels[id]++;
                    saveGame();
                    renderPerksList();
                } else {
                    // Fallito (Feedback visivo rosso)
                    if(btn) {
                        let originalText = btn.innerText;
                        btn.classList.add('error');
                        btn.innerText = "NO CASH";
                        setTimeout(() => {
                            btn.classList.remove('error');
                            btn.innerText = originalText;
                        }, 500);
                    }
                }
            }
        };
        
        window.addMoney = function() {
            savedData.score += 500;
            saveGame();
            renderPerksList();
        };

        window.openPerks = function() {
            mainMenuButtons.classList.add('hidden');
            gameOverMenu.classList.add('hidden');
            perksMenu.classList.remove('hidden');
            renderPerksList();
        };

        window.closePerks = function() {
            perksMenu.classList.add('hidden');
            mainMenuButtons.classList.remove('hidden');
        };

        window.startGame = function() {
            console.log('startGame invoked. assetsReady:', assetsReady);
            if (!assetsReady) {
                pendingStart = true;
                loadAssets();
                return;
            }
            primeAudio();
            startMusic();
            applyPerks();
            game.running = true;
            game.score = 0;
            game.dist = 0;
            game.player.x = GW/2; 
    game.player.y = GH*0.75;
            game.player.prevX = game.player.x;
            game.player.prevY = game.player.y;
            game.player.walkPhase = 0;
            game.player.walkSpeed = 0;
            game.player.state = 'idle';
            game.player.animFrame = 0;
            game.player.animTimer = 0;
            game.enemies = [];
            game.bullets = [];
            game.enemyBullets = [];
            game.bossBullets = [];
            game.powerups = [];
            game.boss = null;
            game.nextBossDist = 1000;
            game.lastTime = performance.now();

            menuOverlay.style.display = 'none';
            mainMenuButtons.classList.remove('hidden');
            gameOverMenu.classList.add('hidden');
            perksMenu.classList.add('hidden');
            
            playerEntity.style.display = 'none'; // keep SVG hidden, we render player via canvas sprite
            document.getElementById('bossBarContainer').style.display = 'none';
            
            console.log('Game loop starting');
            requestAnimationFrame(loop);
        };

        function gameOver() {
            game.running = false;
            savedData.score += game.score;
            saveGame();

            sounds.gameOver.play();

            menuOverlay.style.display = 'flex';
            mainMenuButtons.classList.add('hidden');
            perksMenu.classList.add('hidden');
            gameOverMenu.classList.remove('hidden');
            document.getElementById('finalScore').innerText = "Punti: " + Math.floor(game.score);
            playerEntity.style.display = 'none';
            stopMusic();
        }

        function update(dt) {
            if(!game.running) return;

            if (backgroundMusic.paused) startMusic();

            game.dist += dt * 10;
            let scrollSpeed = 150 * dt;
            advanceBackground(scrollSpeed);

            // Walk cycle detection
            const dxMove = game.player.x - game.player.prevX;
            const dyMove = game.player.y - game.player.prevY;
            const distMove = Math.hypot(dxMove, dyMove);
            game.player.walkSpeed = dt > 0 ? distMove / dt : 0;
            if (distMove > 0.5) {
                game.player.walkPhase += dt * 10;
            }
            game.player.prevX = game.player.x;
            game.player.prevY = game.player.y;
            if (game.player.walkSpeed > 20) {
                game.player.state = 'run';
                game.player.animTimer += dt * 1000;
                const frameInterval = 80;
                if (game.player.animTimer >= frameInterval) {
                    game.player.animFrame = (game.player.animFrame + 1) % playerRunFrames.length;
                    game.player.animTimer = 0;
                }
            } else {
                game.player.state = 'idle';
                game.player.animFrame = 0;
                game.player.animTimer = 0;
            }

            if (!game.boss) {
                if (Math.random() < 0.03) {
                    const isHeavy = Math.random() > 0.75;
                    game.enemies.push(
                        new Enemy({
                            x: GW + 50,
                            y: Math.random() * (GH - 140) + 70,
                            isHeavy
                        })
                    );
                }
                if (Math.random() < 0.005) {
                    let type = Math.random() > 0.5 ? 'hp' : 'coin';
                    game.powerups.push({
                        x: GW + 50, y: Math.random() * (GH - 100) + 50,
                        type: type,
                        color: type === 'hp' ? '#EF4444' : '#FBBF24',
                        label: type === 'hp' ? '❤️' : '💎'
                    });
                }
            }

            if (game.dist > game.nextBossDist && !game.boss) {
                game.boss = { x: GW/2, y: -100, w: 100, h: 100, hp: 100, maxHp: 100, dir: 1, shootTimer: 0 };
                document.getElementById('bossBarContainer').style.display = 'block';
            }

            if (game.boss) {
                let b = game.boss;
                if (b.y < 100) b.y += 50 * dt;
                b.x += 50 * b.dir * dt;
                if (b.x > GW - 60 || b.x < 60) b.dir *= -1;

                if (Date.now() - b.shootTimer > 1500) {
                    let angle = Math.atan2(game.player.y - b.y, game.player.x - b.x);
                    game.bossBullets.push({ x: b.x, y: b.y + 50, dx: Math.cos(angle), dy: Math.sin(angle) });
                    b.shootTimer = Date.now();
                }
                document.getElementById('bossBarFill').style.width = Math.max(0, (b.hp / b.maxHp) * 100) + '%';
            }

    game.enemies.forEach(e => {
        const shot = e.update(dt, game.player);
        if (shot) game.enemyBullets.push(shot);
    });
            game.enemies = game.enemies.filter(e => e.y < GH + 50);
            game.powerups.forEach(p => p.x -= scrollSpeed); // move left with scrolling
            game.powerups = game.powerups.filter(p => p.x > -50);
            game.bullets.forEach(b => b.x += 600 * dt); // bullets fly to the right now
            game.bullets = game.bullets.filter(b => b.x < GW + 50);
            if (game.player.muzzleTimer > 0) {
                game.player.muzzleTimer = Math.max(0, game.player.muzzleTimer - dt * 1000);
            }
            game.enemyBullets.forEach(b => { b.x += b.dx * b.speed * dt; b.y += b.dy * b.speed * dt; });
            game.enemyBullets = game.enemyBullets.filter(b => !b.dead && b.y < GH + 30 && b.y > -30 && b.x > -30 && b.x < GW + 30);
            game.bossBullets.forEach(b => { b.x += b.dx * 300 * dt; b.y += b.dy * 300 * dt; });
            game.bossBullets = game.bossBullets.filter(b => b.y < GH+20 && b.y > -20 && b.x > -20 && b.x < GW+20);

            if (Date.now() - game.fireTimer > game.fireRate) {
                const angle = 0; // spara verso destra per inseguire nemici che arrivano da destra
                game.player.angle = angle;
                const angleForSprite = angle + PLAYER_ROT_OFFSET + PLAYER_ANGLE_OFFSET;
                const cos = Math.cos(angleForSprite);
                const sin = Math.sin(angleForSprite);
                const muzzleX = game.player.x + MUZZLE_OFFSET_X * cos - MUZZLE_OFFSET_Y * sin;
                const muzzleY = game.player.y + MUZZLE_OFFSET_X * sin + MUZZLE_OFFSET_Y * cos;
                game.bullets.push({ x: muzzleX, y: muzzleY });
                game.player.muzzleTimer = 80;
                sounds.laser.play();
                game.fireTimer = Date.now();
            }

            game.bullets.forEach((b, bi) => {
                game.enemies.forEach((e, ei) => {
                    const bounds = e.getBounds();
                    if (b.x > bounds.x && b.x < bounds.x + bounds.w && b.y > bounds.y && b.y < bounds.y + bounds.h) {
                        e.hp--; game.bullets[bi].dead = true; sounds.targetExplosion.play();
                        if (e.hp <= 0) { game.enemies[ei].dead = true; game.score += e.score * game.scoreMult; }
                    }
                });
                if (game.boss && Math.abs(b.x - game.boss.x) < 50 && Math.abs(b.y - game.boss.y) < 50) {
                    game.boss.hp--; game.bullets[bi].dead = true; sounds.targetExplosion.play();
                    if (game.boss.hp <= 0) {
                        sounds.bossDeath.play();
                        game.score += 500 * game.scoreMult; game.boss = null; game.bossBullets = [];
                        game.nextBossDist += 1000; document.getElementById('bossBarContainer').style.display = 'none';
                    }
                }
            });

            game.bullets = game.bullets.filter(b => !b.dead);
            game.enemies = game.enemies.filter(e => !e.dead);

            let hit = false;
            game.enemies.forEach(e => {
                const bounds = e.getBounds();
                const padding = 15;
                if (
                    game.player.x > bounds.x - padding && game.player.x < bounds.x + bounds.w + padding &&
                    game.player.y > bounds.y - padding && game.player.y < bounds.y + bounds.h + padding
                ) {
                    game.hp--; hit = true; e.dead = true;
                }
            });
            game.enemies = game.enemies.filter(e => !e.dead);
            game.enemyBullets.forEach((b, bi) => {
                if (Math.abs(game.player.x - b.x) < 18 && Math.abs(game.player.y - b.y) < 18) {
                    game.hp--; hit = true; game.enemyBullets[bi].dead = true;
                }
            });
            game.enemyBullets = game.enemyBullets.filter(b => !b.dead);
            game.bossBullets.forEach((b, bi) => {
                if (Math.abs(game.player.x - b.x) < 20 && Math.abs(game.player.y - b.y) < 20) {
                    game.hp--; hit = true; game.bossBullets[bi].dead = true;
                }
            });
            game.bossBullets = game.bossBullets.filter(b => !b.dead);
            if (game.boss && Math.abs(game.player.x - game.boss.x) < 60 && Math.abs(game.player.y - game.boss.y) < 60) {
                game.hp -= 5; hit = true;
            }

            if (hit) { sounds.playerHit.play(); canvas.style.border = "3px solid red"; setTimeout(() => canvas.style.border = "none", 100); }

            game.powerups.forEach((p, pi) => {
                let dist = Math.sqrt((game.player.x - p.x)**2 + (game.player.y - p.y)**2);
                if (dist < game.pickupRad) {
                    p.x += (game.player.x - p.x) * 0.1; p.y += (game.player.y - p.y) * 0.1;
                    if (dist < 30) {
                        if (p.type === 'hp') game.hp = Math.min(game.maxHp, game.hp + 2);
                        else game.score += 50 * game.scoreMult;
                        sounds.powerup.play();
                        game.powerups[pi].dead = true;
                    }
                }
            });
            game.powerups = game.powerups.filter(p => !p.dead);

            document.getElementById('scoreDisplay').innerText = "💎 " + Math.floor(game.score);
            document.getElementById('hpDisplay').innerText = "❤️ " + Math.ceil(game.hp) + "/" + game.maxHp;
            document.getElementById('distDisplay').innerText = "📏 " + Math.floor(game.dist) + "m";

            if (game.hp <= 0) gameOver();
        }

        function drawCactus(x, y, scale = 1, flip = false) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(flip ? -scale : scale, scale);
            ctx.lineCap = 'round';

            ctx.strokeStyle = '#1f5536';
            ctx.lineWidth = 18;
            ctx.beginPath();
            ctx.moveTo(0, 60);
            ctx.lineTo(0, -70);
            ctx.moveTo(0, -10);
            ctx.lineTo(-32, -10);
            ctx.moveTo(-32, -10);
            ctx.lineTo(-32, 20);
            ctx.moveTo(0, -35);
            ctx.lineTo(26, -35);
            ctx.moveTo(26, -35);
            ctx.lineTo(26, -5);
            ctx.stroke();

            ctx.strokeStyle = '#2d8a52';
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(0, 55);
            ctx.lineTo(0, -65);
            ctx.moveTo(0, -10);
            ctx.lineTo(-25, -10);
            ctx.moveTo(-25, -10);
            ctx.lineTo(-25, 10);
            ctx.moveTo(0, -32);
            ctx.lineTo(22, -32);
            ctx.moveTo(22, -32);
            ctx.lineTo(22, -8);
            ctx.stroke();

            ctx.fillStyle = '#14532d';
            ctx.beginPath();
            ctx.ellipse(0, 62, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(-2, -68, 4, 115);

            ctx.restore();
        }

        function drawDuneTile(baseY, palette, layoutIndex) {
            const h = BG_TILE_H;

            ctx.fillStyle = palette.base;
            ctx.fillRect(0, baseY, GW, h);

            ctx.fillStyle = palette.light;
            ctx.beginPath();
            ctx.moveTo(0, baseY + h * 0.18);
            ctx.quadraticCurveTo(GW * 0.28, baseY, GW * 0.55, baseY + h * 0.22);
            ctx.quadraticCurveTo(GW * 0.82, baseY + h * 0.35, GW, baseY + h * 0.2);
            ctx.lineTo(GW, baseY);
            ctx.lineTo(0, baseY);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = palette.mid;
            ctx.beginPath();
            ctx.moveTo(0, baseY + h * 0.55);
            ctx.quadraticCurveTo(GW * 0.25, baseY + h * 0.48, GW * 0.5, baseY + h * 0.6);
            ctx.quadraticCurveTo(GW * 0.75, baseY + h * 0.73, GW, baseY + h * 0.62);
            ctx.lineTo(GW, baseY + h);
            ctx.lineTo(0, baseY + h);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = palette.shade;
            ctx.beginPath();
            ctx.moveTo(GW * 0.1, baseY + h * 0.4);
            ctx.quadraticCurveTo(GW * 0.35, baseY + h * 0.32, GW * 0.55, baseY + h * 0.45);
            ctx.quadraticCurveTo(GW * 0.8, baseY + h * 0.62, GW, baseY + h * 0.44);
            ctx.lineTo(GW, baseY + h * 0.6);
            ctx.quadraticCurveTo(GW * 0.7, baseY + h * 0.48, GW * 0.45, baseY + h * 0.55);
            ctx.quadraticCurveTo(GW * 0.2, baseY + h * 0.65, 0, baseY + h * 0.55);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.beginPath();
            ctx.ellipse(GW * 0.65, baseY + h * 0.22, 80, 30, 0.1, 0, Math.PI * 2);
            ctx.fill();

            const layout = backgroundState.cactusLayouts[Math.abs(layoutIndex) % backgroundState.cactusLayouts.length];
            layout.forEach(c => {
                const y = baseY + c.y;
                if (y > -80 && y < GH + 120) drawCactus(c.x, y, c.scale, c.flip);
            });

            backgroundState.sandSpecks.forEach(s => {
                const y = baseY + s.y;
                if (y > -10 && y < GH + 10) {
                    ctx.fillStyle = `rgba(120, 53, 15, ${s.opacity})`;
                    ctx.beginPath();
                    ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }

        function drawFarDunes(baseY, palette) {
            const h = BG_TILE_H;
            ctx.fillStyle = palette.far;
            ctx.beginPath();
            ctx.moveTo(0, baseY + h * 0.4);
            ctx.quadraticCurveTo(GW * 0.3, baseY + h * 0.28, GW * 0.6, baseY + h * 0.45);
            ctx.quadraticCurveTo(GW * 0.85, baseY + h * 0.6, GW, baseY + h * 0.46);
            ctx.lineTo(GW, baseY + h);
            ctx.lineTo(0, baseY + h);
            ctx.closePath();
            ctx.fill();
        }

        function drawDesertBackground() {
            ctx.clearRect(0, 0, GW, GH);
            // Sfondo video: nessun disegno canvas, solo clearing (scorrimento gestito da offsetY per logica).
        }

        function drawPlayer() {
            if (!playerImgReady) return;

            const targetW = 260;  // più largo
            const targetH = 220;  // più compatto
            const moving = game.player.walkSpeed > 20;
            const bob = moving ? Math.sin(game.player.walkPhase) * 8 : 0;
            let img = playerIdleImg || playerImg;
            if (game.player.state === 'run' && playerRunReady && playerRunFrames[game.player.animFrame]) {
                img = playerRunFrames[game.player.animFrame];
            }

            ctx.save();
            ctx.translate(game.player.x, game.player.y + bob);
            // Rotazione disattivata: sprite già orientato in posa corretta
            console.log('Draw player with sprite', game.player.x, game.player.y);
            if (img) ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
            ctx.restore();

            if (game.player.muzzleTimer > 0) {
                ctx.save();
                ctx.translate(game.player.x, game.player.y + bob);
                // Rotazione disattivata anche per il flash: resta in coordinate locali
                ctx.fillStyle = '#ffec7a';
                ctx.beginPath();
                ctx.moveTo(MUZZLE_OFFSET_X, MUZZLE_OFFSET_Y);
                ctx.lineTo(MUZZLE_OFFSET_X + 20, MUZZLE_OFFSET_Y - 5);
                ctx.lineTo(MUZZLE_OFFSET_X + 20, MUZZLE_OFFSET_Y + 5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        function draw() {
            drawDesertBackground();

            if (game.running && game.hp > 0 && game.pickupRad > 40) {
                ctx.strokeStyle = 'rgba(34, 197, 94, 0.2)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(game.player.x, game.player.y, game.pickupRad, 0, Math.PI*2); ctx.stroke();
            }

            drawPlayer();

            game.powerups.forEach(p => {
                if (p.type === 'hp' && isValidImage(images.heart)) {
                    ctx.drawImage(images.heart, p.x - 18, p.y - 18, 36, 36);
                } else {
                    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = 'black'; ctx.font = '14px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
                    ctx.fillText(p.label, p.x, p.y);
                }
            });

            game.enemies.forEach(e => e.draw(ctx));

            ctx.fillStyle = '#b91c1c';
            game.enemyBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI*2); ctx.fill(); });

            if (game.boss) {
                let b = game.boss;
                ctx.fillStyle = '#1E40AF'; ctx.fillRect(b.x - 50, b.y - 50, 100, 100);
                ctx.fillStyle = '#1e3a8a'; ctx.fillRect(b.x - 10, b.y + 20, 20, 40);
                ctx.fillStyle = 'white'; ctx.font = '20px Arial'; ctx.textAlign='center'; ctx.fillText("BOSS", b.x, b.y);
            }

            ctx.fillStyle = '#DC2626';
            game.bossBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, Math.PI*2); ctx.fill(); });

            game.bullets.forEach(b => {
                const size = 14;
                if (isValidImage(images.bullet)) {
                    ctx.drawImage(images.bullet, b.x - size/2, b.y - size/2, size, size);
                } else {
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI*2); ctx.fill();
                    ctx.strokeStyle = '#000'; ctx.lineWidth=1; ctx.stroke();
                }
            });

            // playerEntity DOM sprite kept hidden; rendering handled via canvas drawPlayer()
        }

        function loop(ts) {
            let dt = (ts - game.lastTime) / 1000;
            if(dt > 0.1) dt = 0.1;
            game.lastTime = ts;
            update(dt);
            draw();
            if (game.running) requestAnimationFrame(loop);
        }

        function handleInput(clientX, clientY) {
            if (!game.running) return;
            let rect = canvas.getBoundingClientRect();
            let scaleX = GW / rect.width;
            let scaleY = GH / rect.height;
            let relativeX = (clientX - rect.left) * scaleX;
            let relativeY = (clientY - rect.top) * scaleY;
            game.player.x = Math.max(20, Math.min(GW - 20, relativeX));
            let minY = GH * 0.4; let maxY = GH - 30;
            game.player.y = Math.max(minY, Math.min(maxY, relativeY));
        }

        window.addEventListener('touchmove', e => { e.preventDefault(); handleInput(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});
        window.addEventListener('mousemove', e => { if(e.buttons === 1) handleInput(e.clientX, e.clientY); });
        window.addEventListener('touchstart', e => { if (game.running) handleInput(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});

        showMainMenu();
        loadAssets();
        enableAudioOnInteraction();

    
