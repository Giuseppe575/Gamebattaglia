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

        // --- Asset loading ---
        const assetSources = {
            enemy1: 'assets/enemy1.png',
            enemy2: 'assets/enemy2.png',
            enemy3: 'assets/enemy3.png',
            heart: 'assets/heart.png',
            bullet: 'assets/bullet.png'
        };
        const images = {};
        let assetsLoaded = 0;
        const assetsToLoad = Object.keys(assetSources).length;
        let assetsReady = false;
        let assetsLoading = false;
        let pendingStart = false;

        function handleAssetLoad(src, status = 'loaded') {
            assetsLoaded++;
            console.log(`Asset ${status}:`, src, `${assetsLoaded}/${assetsToLoad}`);
            if (assetsLoaded >= assetsToLoad) {
                assetsReady = true;
                assetsLoading = false;
                if (pendingStart) {
                    pendingStart = false;
                    startGame();
                }
            }
        }

        function loadImage(key, src) {
            const img = new Image();
            img.onload = () => handleAssetLoad(src, 'loaded');
            img.onerror = () => {
                images[key] = null; // mark as unusable so rendering falls back to shapes
                handleAssetLoad(src, 'error');
            };
            img.src = src;
            images[key] = img;
        }

        function isValidImage(img) {
            return !!(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
        }

        function loadAssets() {
            if (assetsReady || assetsLoading) return;
            assetsLoading = true;
            Object.entries(assetSources).forEach(([key, src]) => loadImage(key, src));
            if (assetsToLoad === 0) {
                assetsReady = true;
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
        
        const GW = 450;
        const GH = 800;
        const desertPebbles = Array.from({ length: 10 }, () => ({
            x: Math.random() * GW,
            y: GH * 0.7 + Math.random() * GH * 0.3,
            w: 6 + Math.random() * 6,
            h: 3 + Math.random() * 3,
            opacity: 0.15 + Math.random() * 0.15
        }));

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

        class Enemy {
            constructor({ x, y, type, isHeavy = false }) {
                this.x = x;
                this.y = y;
                this.type = type;
                this.size = isHeavy ? 40 : 30;
                this.hp = isHeavy ? 4 : 1;
                this.score = isHeavy ? 20 : 10;
                this.speed = 150;
                const spritePool = [images.enemy1, images.enemy2, images.enemy3].filter(isValidImage);
                this.sprite = spritePool[Math.floor(Math.random() * spritePool.length)] || null;
                this.dead = false;
            }

            update(dt) {
                this.y += this.speed * dt;
            }

            draw(ctx) {
                const half = this.size / 2;
                if (isValidImage(this.sprite)) {
                    ctx.drawImage(this.sprite, this.x - half, this.y - half, this.size, this.size);
                } else {
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
            player: { x: GW/2, y: GH*0.75 },
            enemies: [], bullets: [], powerups: [], bossBullets: [], boss: null,
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
            console.log('startGame invoked. assetsReady:', assetsReady, 'assetsLoaded:', assetsLoaded);
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
            game.enemies = [];
            game.bullets = [];
            game.bossBullets = [];
            game.powerups = [];
            game.boss = null;
            game.nextBossDist = 1000;
            game.lastTime = performance.now();

            menuOverlay.style.display = 'none';
            mainMenuButtons.classList.remove('hidden');
            gameOverMenu.classList.add('hidden');
            perksMenu.classList.add('hidden');
            
            playerEntity.style.display = 'block';
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

            game.dist += dt * 10;
            let scrollSpeed = 150 * dt;

            if (!game.boss) {
                if (Math.random() < 0.03) {
                    let isHeavy = Math.random() > 0.8;
                    game.enemies.push(new Enemy({
                        x: Math.random() * (GW - 40) + 20,
                        y: -50,
                        type: isHeavy ? 'heavy' : 'grunt',
                        isHeavy
                    }));
                }
                if (Math.random() < 0.005) {
                    let type = Math.random() > 0.5 ? 'hp' : 'coin';
                    game.powerups.push({
                        x: Math.random() * (GW - 40) + 20, y: -50,
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

            game.enemies.forEach(e => e.update(dt));
            game.enemies = game.enemies.filter(e => e.y < GH + 50);
            game.powerups.forEach(p => p.y += scrollSpeed);
            game.powerups = game.powerups.filter(p => p.y < GH + 50);
            game.bullets.forEach(b => b.y -= 600 * dt);
            game.bullets = game.bullets.filter(b => b.y > -20);
            game.bossBullets.forEach(b => { b.x += b.dx * 300 * dt; b.y += b.dy * 300 * dt; });
            game.bossBullets = game.bossBullets.filter(b => b.y < GH+20 && b.y > -20 && b.x > -20 && b.x < GW+20);

            if (Date.now() - game.fireTimer > game.fireRate) {
                game.bullets.push({ x: game.player.x, y: game.player.y - 25 });
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

        function drawDesertBackground() {
            ctx.clearRect(0, 0, GW, GH);
            const sky = ctx.createLinearGradient(0, 0, 0, GH);
            sky.addColorStop(0, '#fde68a');
            sky.addColorStop(0.5, '#fbbf24');
            sky.addColorStop(1, '#f59e0b');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, GW, GH);

            ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
            ctx.beginPath();
            ctx.arc(GW * 0.8, GH * 0.2, 50, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#f4b860';
            ctx.beginPath();
            ctx.moveTo(0, GH * 0.55);
            ctx.quadraticCurveTo(GW * 0.3, GH * 0.45, GW * 0.6, GH * 0.58);
            ctx.quadraticCurveTo(GW * 0.85, GH * 0.65, GW, GH * 0.6);
            ctx.lineTo(GW, GH);
            ctx.lineTo(0, GH);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#e6a04b';
            ctx.beginPath();
            ctx.moveTo(0, GH * 0.65);
            ctx.quadraticCurveTo(GW * 0.25, GH * 0.6, GW * 0.5, GH * 0.7);
            ctx.quadraticCurveTo(GW * 0.75, GH * 0.78, GW, GH * 0.72);
            ctx.lineTo(GW, GH);
            ctx.lineTo(0, GH);
            ctx.closePath();
            ctx.fill();

            desertPebbles.forEach(p => {
                ctx.fillStyle = `rgba(120, 53, 15, ${p.opacity})`;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, p.w, p.h, 0, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        function draw() {
            drawDesertBackground();

            if (game.running && game.hp > 0 && game.pickupRad > 40) {
                ctx.strokeStyle = 'rgba(34, 197, 94, 0.2)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(game.player.x, game.player.y, game.pickupRad, 0, Math.PI*2); ctx.stroke();
            }

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

            if (game.running && game.hp > 0) {
                playerEntity.style.left = (game.player.x / GW * 100) + '%';
                playerEntity.style.top = (game.player.y / GH * 100) + '%';
            }
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

    
