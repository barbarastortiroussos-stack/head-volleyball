window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // --- INTEGRACAO SDK Y8 ---
    function submitY8Score(score) {
        if (typeof ID !== 'undefined' && ID.GameAPI && ID.GameAPI.Leaderboards) {
            ID.GameAPI.Leaderboards.save({
                table: 'Highscores',
                points: score
            }, function(response) {
                console.log('Pontuação enviada para o Y8:', response);
            });
        }
    }

    // --- ELEMENTOS DA INTERFACE (HTML) ---
    const startScreen = document.getElementById('startScreen');
    const pauseScreen = document.getElementById('pauseScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');

    const startBtn = document.getElementById('startBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const muteBtn = document.getElementById('muteBtn');

    const genderSelect = document.getElementById('gender');
    const difficultySelect = document.getElementById('difficulty');

    const playerScoreEl = document.getElementById('playerScore');
    const cpuScoreEl = document.getElementById('cpuScore');

    const gameOverTitle = document.getElementById('gameOverTitle');
    const finalScoreEl = document.getElementById('finalScore');

    // Controles Touch
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');
    const btnJump = document.getElementById('btnJump');
    
    // Tela Cheia
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const gameContainer = document.getElementById('gameContainer');

    // --- ESTADOS DO JOGO ---
    let gameRunning = false;
    let isPaused = false;
    let gameOver = false;

    let playerScore = 0;
    let cpuScore = 0;
    let particles = [];
    let pointMessage = "";
    let pointMessageTimer = 0;

    if (fullscreenBtn && gameContainer) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                if (gameContainer.requestFullscreen) {
                    gameContainer.requestFullscreen();
                } else if (gameContainer.webkitRequestFullscreen) { // Safari
                    gameContainer.webkitRequestFullscreen();
                }
                fullscreenBtn.textContent = '✕'; 
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
                fullscreenBtn.textContent = '⛶';
            }
        });
    }

    const backgroundMusic = new Audio(
        "assets/desifreemusic-copyright-free-background-music-407395.mp3"
    );
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.25;

    // =========================================================
    // SISTEMA DE SOM (efeitos gerados via Web Audio API)
    // =========================================================

    let soundEnabled = true;
    let audioCtx = null;

    function initAudio() {
        if (audioCtx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }

    function playTone(freq, duration, type = 'sine', volume = 0.2, delay = 0) {
        if (!soundEnabled || !audioCtx) return;

        const startTime = audioCtx.currentTime + delay;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    function playJumpSound() {
        playTone(520, 0.12, 'square', 0.12);
    }

    function playHitSound() {
        playTone(220, 0.08, 'triangle', 0.22);
    }

    function playPointSound(winner) {
        if (winner === 'player') {
            playTone(523, 0.12, 'sine', 0.2);
            playTone(659, 0.15, 'sine', 0.2, 0.1);
        } else {
            playTone(300, 0.15, 'sawtooth', 0.15);
            playTone(220, 0.2, 'sawtooth', 0.15, 0.1);
        }
    }

    function playWinSound() {
        [523, 659, 784, 1046].forEach((freq, i) => {
            playTone(freq, 0.2, 'sine', 0.22, i * 0.12);
        });
    }

    function playLoseSound() {
        [400, 320, 260, 180].forEach((freq, i) => {
            playTone(freq, 0.25, 'sawtooth', 0.18, i * 0.12);
        });
    }

    function playCountdownTick(isFinal) {
        if (isFinal) {
            playTone(880, 0.28, 'square', 0.25);
        } else {
            playTone(440, 0.15, 'square', 0.2);
        }
    }

    function updateMuteIcon() {
        if (!muteBtn) return;
        muteBtn.textContent = soundEnabled ? '🔊' : '🔇';
    }

    function toggleMute() {
        soundEnabled = !soundEnabled;
        backgroundMusic.muted = !soundEnabled;
        updateMuteIcon();
    }

    if (muteBtn) {
        muteBtn.addEventListener('click', toggleMute);
    }

    const WINNING_SCORE = 10;

    // --- CONTAGEM REGRESSIVA ---
    let isCountingDown = false;
    let countdownIndex = 0;
    let countdownTimer = 0;
    const countdownSteps = ['3', '2', '1', 'GO!'];
    const COUNTDOWN_STEP_FRAMES = 55;

    // --- CONFIGURAÇÃO DA REDE E CAMPO ---
    const groundY = 520;

    const net = {
        x: canvas.width / 2 - 5,
        y: 380,
        width: 10,
        height: 140
    };

    // --- TECLAS E CONTROLES ---
    const keys = {
        left: false,
        right: false,
        up: false
    };

    // --- FANTASMA (JOGADOR) ---
    const player = {
        x: 150,
        y: groundY - 50,
        radius: 30,
        speed: 6,
        vx: 0,
        vy: 0,
        jumping: false,
        color: '#00F5D4',
        gender: 'male'
    };

    // --- FANTASMA (CPU) ---
    const cpu = {
        x: 650,
        y: groundY - 50,
        radius: 30,
        speed: 4,
        vx: 0,
        vy: 0,
        jumping: false,
        color: '#E60067',
        difficulty: 'medium'
    };

    // --- BOLA DE VÔLEI ---
    const ball = {
        x: 200,
        y: 200,
        radius: 16,
        vx: 0,
        vy: 0,
        gravity: 0.35,
        bounce: 0.75,
        rotation: 0
    };

    // --- CENÁRIO DE FUNDO ---
    const clouds = [
        { x: 100, y: 70, scale: 1.0, speed: 0.12 },
        { x: 320, y: 110, scale: 0.7, speed: 0.08 },
        { x: 560, y: 60, scale: 1.2, speed: 0.15 },
        { x: 700, y: 140, scale: 0.6, speed: 0.10 }
    ];

    const hills = [
        { x: canvas.width * 0.18, radius: 130, color: '#2A3A2B' },
        { x: canvas.width * 0.55, radius: 170, color: '#1E2B1E' },
        { x: canvas.width * 0.88, radius: 110, color: '#2A3A2B' }
    ];

    // --- DIFICULDADES DA CPU ---
    const difficultySettings = {
        easy: { speed: 3.5, jumpPower: -9, reaction: 0.04 },
        medium: { speed: 5.0, jumpPower: -11, reaction: 0.08 },
        hard: { speed: 6.5, jumpPower: -12.5, reaction: 0.15 }
    };

    // =========================================================
    // CONTROLES DE TECLADO & TOUCH
    // =========================================================

    window.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;

        if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
            if (!keys.up && !player.jumping && gameRunning && !isPaused && !gameOver) {
                player.vy = -12;
                player.jumping = true;
                playJumpSound();
            }
            keys.up = true;
        }

        if (e.code === 'KeyP') {
            togglePause();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
        if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.up = false;
    });

    const setupTouchBtn = (element, keyProp) => {
        if (!element) return;
        const start = (e) => {
            e.preventDefault();
            if (!gameRunning || isPaused || gameOver) return;
            keys[keyProp] = true;
        };
        const end = (e) => {
            e.preventDefault();
            keys[keyProp] = false;
        };
        element.addEventListener('touchstart', start);
        element.addEventListener('touchend', end);
        element.addEventListener('touchcancel', end);
        element.addEventListener('mousedown', start);
        element.addEventListener('mouseup', end);
        element.addEventListener('mouseleave', end);
    };

    setupTouchBtn(btnLeft, 'left');
    setupTouchBtn(btnRight, 'right');

    if (btnJump) {
        const doJump = (e) => {
            e.preventDefault();
            if (!player.jumping && gameRunning && !isPaused && !gameOver) {
                player.vy = -12;
                player.jumping = true;
                playJumpSound();
            }
        };
        btnJump.addEventListener('touchstart', doJump);
        btnJump.addEventListener('mousedown', doJump);
    }

    // =========================================================
    // ATUALIZAR PLACAR E FLUXO
    // =========================================================

    function updateScoreboard() {
        if (playerScoreEl) playerScoreEl.textContent = playerScore;
        if (cpuScoreEl) cpuScoreEl.textContent = cpuScore;
    }

    function startCountdown() {
        isCountingDown = true;
        countdownIndex = 0;
        countdownTimer = COUNTDOWN_STEP_FRAMES;
        playCountdownTick(false);
    }

    function startNewMatch() {
        initAudio();
        backgroundMusic.currentTime = 0;
        backgroundMusic.play().catch(() => {});

        playerScore = 0;
        cpuScore = 0;

        gameOver = false;
        gameRunning = false;
        isPaused = false;

        updateScoreboard();

        if (startScreen) startScreen.classList.add('hidden');
        if (pauseScreen) pauseScreen.classList.add('hidden');
        if (gameOverScreen) gameOverScreen.classList.add('hidden');

        resetServe('player');
        startCountdown();
    }

    function resetServe(server = 'player') {
        player.x = 150;
        player.y = groundY - player.radius;
        player.vx = 0;
        player.vy = 0;
        player.jumping = false;

        cpu.x = 650;
        cpu.y = groundY - cpu.radius;
        cpu.vx = 0;
        cpu.vy = 0;
        cpu.jumping = false;

        if (server === 'player') {
            ball.x = 200;
            ball.y = 200;
        } else {
            ball.x = 600;
            ball.y = 200;
        }

        ball.vx = 0;
        ball.vy = 0;

        pointMessage = "";
        pointMessageTimer = 0;
    }

    function togglePause() {
        if (!gameRunning || gameOver) return;
        isPaused = !isPaused;

        if (isPaused) {
            pauseScreen.classList.remove('hidden');
            backgroundMusic.pause();
        } else {
            pauseScreen.classList.add('hidden');
            backgroundMusic.play().catch(() => {});
        }
    }

    if (resumeBtn) resumeBtn.addEventListener('click', togglePause);
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);

    // =========================================================
    // FINAL DA PARTIDA + SDK Y8 SUBMIT
    // =========================================================

    function endMatch(winner) {
        gameOver = true;
        gameRunning = false;
        isPaused = false;

        keys.left = false;
        keys.right = false;
        keys.up = false;

        player.vx = 0;
        player.vy = 0;
        cpu.vx = 0;
        cpu.vy = 0;

        backgroundMusic.pause();
        updateScoreboard();

        submitY8Score(playerScore);

        if (winner === 'player') {
            if (gameOverTitle) gameOverTitle.textContent = 'YOU WIN!';
            playWinSound();
        } else {
            if (gameOverTitle) gameOverTitle.textContent = 'CPU WINS!';
            playLoseSound();
        }

        if (finalScoreEl) finalScoreEl.textContent = `${playerScore} x ${cpuScore}`;
        if (pauseScreen) pauseScreen.classList.add('hidden');
        if (gameOverScreen) gameOverScreen.classList.remove('hidden');
    }

    function scorePoint(winner) {
        if (gameOver) return;

        if (winner === 'player') {
            playerScore++;
        } else {
            cpuScore++;
        }

        updateScoreboard();
        playPointSound(winner);

        if (playerScore >= WINNING_SCORE) {
            endMatch('player');
            return;
        }

        if (cpuScore >= WINNING_SCORE) {
            endMatch('cpu');
            return;
        }

        if (winner === 'player') {
            resetServe('cpu');
        } else {
            resetServe('player');
        }
    }

    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            cpu.difficulty = difficultySelect ? difficultySelect.value : 'medium';
            player.gender = genderSelect ? genderSelect.value : 'male';
            startNewMatch();
        });
    }

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            player.gender = genderSelect ? genderSelect.value : 'male';
            cpu.difficulty = difficultySelect ? difficultySelect.value : 'medium';
            startNewMatch();
        });
    }

    // =========================================================
    // LÓGICA DE ATUALIZAÇÃO E FÍSICA
    // =========================================================

    function createHitParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 20
            });
        }
    }

    function showPointMessage(winner) {
        if (winner === "player") {
            pointMessage = "+1 PLAYER!";
        } else {
            pointMessage = "CPU SCORES!";
        }
        pointMessageTimer = 60;
    }

    function updateBackground() {
        for (const cloud of clouds) {
            cloud.x += cloud.speed;
            if (cloud.x - 60 > canvas.width) {
                cloud.x = -60;
            }
        }
    }

    function updateCountdown() {
        if (!isCountingDown) return;

        countdownTimer--;

        if (countdownTimer <= 0) {
            countdownIndex++;
            if (countdownIndex >= countdownSteps.length) {
                isCountingDown = false;
                gameRunning = true;
            } else {
                countdownTimer = COUNTDOWN_STEP_FRAMES;
                playCountdownTick(countdownIndex === countdownSteps.length - 1);
            }
        }
    }

    function update() {
        updateBackground();
        updateCountdown();

        if (isCountingDown || !gameRunning || isPaused || gameOver) {
            return;
        }

        if (keys.left) {
            player.vx = -player.speed;
        } else if (keys.right) {
            player.vx = player.speed;
        } else {
            player.vx = 0;
        }

        player.x += player.vx;
        player.vy += 0.5;
        player.y += player.vy;

        if (player.x - player.radius < 0) player.x = player.radius;
        if (player.x + player.radius > net.x) player.x = net.x - player.radius;

        if (player.y + player.radius >= groundY) {
            player.y = groundY - player.radius;
            player.vy = 0;
            player.jumping = false;
        }

        const config = difficultySettings[cpu.difficulty] || difficultySettings.medium;
        let targetX = 650;

        if (ball.x > net.x + net.width) {
            targetX = ball.x;
        }

        targetX = Math.max(
            net.x + net.width + cpu.radius,
            Math.min(canvas.width - cpu.radius, targetX)
        );

        const distanceToTarget = targetX - cpu.x;

        if (distanceToTarget > 5) {
            cpu.vx = config.speed;
        } else if (distanceToTarget < -5) {
            cpu.vx = -config.speed;
        } else {
            cpu.vx = 0;
        }

        const distanceToBall = Math.abs(ball.x - cpu.x);
        const ballIsComing = ball.x > net.x + net.width && ball.vx < 0;
        const ballIsClose = distanceToBall < 75;
        const ballIsHighEnough = ball.y < 330;

        if (ballIsComing && ballIsClose && ballIsHighEnough && !cpu.jumping) {
            if (Math.random() < config.reaction) {
                cpu.vy = config.jumpPower;
                cpu.jumping = true;
            }
        }

        cpu.x += cpu.vx;
        cpu.vy += 0.5;
        cpu.y += cpu.vy;

        if (cpu.x - cpu.radius < net.x + net.width) {
            cpu.x = net.x + net.width + cpu.radius;
        }
        if (cpu.x + cpu.radius > canvas.width) {
            cpu.x = canvas.width - cpu.radius;
        }

        if (cpu.y + cpu.radius >= groundY) {
            cpu.y = groundY - cpu.radius;
            cpu.vy = 0;
            cpu.jumping = false;
        }

        ball.vy += ball.gravity;
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.rotation += ball.vx * 0.05;

        if (ball.x - ball.radius < 0) {
            ball.x = ball.radius;
            ball.vx *= -ball.bounce;
        }

        if (ball.x + ball.radius > canvas.width) {
            ball.x = canvas.width - ball.radius;
            ball.vx *= -ball.bounce;
        }

        if (ball.y - ball.radius < 0) {
            ball.y = ball.radius;
            ball.vy *= -1;
        }

        if (ball.x + ball.radius > net.x && ball.x - ball.radius < net.x + net.width) {
            if (ball.y + ball.radius > net.y) {
                if (ball.x < net.x + net.width / 2) {
                    ball.x = net.x - ball.radius;
                    ball.vx = -Math.abs(ball.vx) * 0.8;
                } else {
                    ball.x = net.x + net.width + ball.radius;
                    ball.vx = Math.abs(ball.vx) * 0.8;
                }
            }
        }

        checkBallCollision(player);
        checkBallCollision(cpu);

        if (ball.y + ball.radius >= groundY) {
            if (ball.x < net.x + net.width / 2) {
                scorePoint('cpu');
                showPointMessage("cpu");
            } else {
                scorePoint('player');
                showPointMessage("player");
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            if (particle.life <= 0) {
                particles.splice(i, 1);
            }
        }

        if (pointMessageTimer > 0) {
            pointMessageTimer--;
        }
    }

    function checkBallCollision(entity) {
        const dx = ball.x - entity.x;
        const dy = ball.y - entity.y;
        const distance = Math.hypot(dx, dy);
        const minDistance = ball.radius + entity.radius;

        if (distance >= minDistance || distance === 0) return;

        const nx = dx / distance;
        const ny = dy / distance;

        const overlap = minDistance - distance;
        ball.x += nx * overlap;
        ball.y += ny * overlap;

        const relativeVx = ball.vx - entity.vx;
        const relativeVy = ball.vy - entity.vy;
        const relativeVelocity = relativeVx * nx + relativeVy * ny;

        if (relativeVelocity > 0) return;

        const hitPower = 8;
        ball.vx -= 2 * relativeVelocity * nx;
        ball.vy -= 2 * relativeVelocity * ny;

        ball.vx += nx * hitPower;
        ball.vy += ny * hitPower * 0.45;

        ball.vx += entity.vx * 0.35;
        ball.vy += entity.vy * 0.15;

        const maxHorizontalSpeed = 14;
        const maxVerticalSpeed = 16;

        ball.vx = Math.max(-maxHorizontalSpeed, Math.min(maxHorizontalSpeed, ball.vx));
        ball.vy = Math.max(-maxVerticalSpeed, Math.min(maxVerticalSpeed, ball.vy));

        createHitParticles(ball.x, ball.y);
        playHitSound();
    }

    // =========================================================
    // RENDERIZAÇÃO E DESENHO
    // =========================================================

    function drawShadow(ghost) {
        const heightAboveGround = Math.max(0, (groundY - ghost.radius) - ghost.y);
        const shrink = Math.min(0.6, heightAboveGround / 250);
        const shadowWidth = ghost.radius * 1.6 * (1 - shrink);
        const shadowAlpha = 0.35 * (1 - shrink * 0.8);

        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(ghost.x, groundY + 4, shadowWidth, shadowWidth * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawGhost(ghost, color) {
        ctx.save();
        ctx.translate(ghost.x, ghost.y);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, ghost.radius, Math.PI, 0, false);
        ctx.lineTo(ghost.radius, ghost.radius / 2);

        const waveCount = 3;
        const waveWidth = (ghost.radius * 2) / waveCount;

        for (let i = 0; i < waveCount; i++) {
            const x = ghost.radius - (i + 1) * waveWidth;
            ctx.quadraticCurveTo(
                x + waveWidth / 2,
                ghost.radius + 10,
                x,
                ghost.radius / 2
            );
        }

        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0D0D0D';
        ctx.beginPath();
        ctx.arc(-10, -5, 4, 0, Math.PI * 2);
        ctx.arc(10, -5, 4, 0, Math.PI * 2);
        ctx.fill();

        if (ghost.gender === 'female') {
            ctx.fillStyle = '#E60067';
            ctx.beginPath();
            ctx.arc(-12, -ghost.radius + 5, 6, 0, Math.PI * 2);
            ctx.arc(-4, -ghost.radius + 5, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    function drawBall() {
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.rotate(ball.rotation);

        ctx.fillStyle = '#00F5D4';
        ctx.beginPath();
        ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2B0B14';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = '#6B0F24';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(0, 0, ball.radius * 0.6, 0, Math.PI);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, ball.radius * 0.6, Math.PI * 0.5, Math.PI * 1.5);
        ctx.stroke();

        ctx.restore();
    }

    function drawParticles() {
        ctx.save();
        for (const p of particles) {
            ctx.fillStyle = `rgba(0, 245, 212, ${p.life / 20})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const skyGradient = ctx.createLinearGradient(0, 0, 0, groundY);
        skyGradient.addColorStop(0, '#0B132B');
        skyGradient.addColorStop(0.7, '#1A0814');
        skyGradient.addColorStop(1, '#2B0B14');

        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvas.width, groundY);

        ctx.save();
        ctx.fillStyle = '#6B0F24';
        ctx.shadowColor = 'rgba(230, 0, 103, 0.4)';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(canvas.width - 120, 90, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        for (const hill of hills) {
            ctx.fillStyle = hill.color;
            ctx.beginPath();
            ctx.arc(hill.x, groundY + 20, hill.radius, Math.PI, 0);
            ctx.fill();
        }

        for (const cloud of clouds) {
            ctx.save();
            ctx.translate(cloud.x, cloud.y);
            ctx.scale(cloud.scale, cloud.scale);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            ctx.arc(24, -10, 18, 0, Math.PI * 2);
            ctx.arc(46, 0, 22, 0, Math.PI * 2);
            ctx.arc(22, 12, 24, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        const groundGradient = ctx.createLinearGradient(0, groundY, 0, canvas.height);
        groundGradient.addColorStop(0, '#151B26');
        groundGradient.addColorStop(1, '#0D1117');

        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

        ctx.strokeStyle = '#00F5D4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(canvas.width, groundY);
        ctx.stroke();

        ctx.fillStyle = '#3B4A3E';
        ctx.fillRect(net.x - 4, net.y - 10, 6, net.height + 10 + (canvas.height - (net.y + net.height)));
        ctx.fillRect(net.x + net.width - 2, net.y - 10, 6, net.height + 10 + (canvas.height - (net.y + net.height)));

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(net.x, net.y, net.width, net.height);

        drawShadow(player);
        drawShadow(cpu);

        drawGhost(player, player.color);
        drawGhost(cpu, cpu.color);

        drawBall();
        drawParticles();

        if (pointMessageTimer > 0) {
            ctx.save();
            ctx.font = 'bold 32px sans-serif';
            ctx.fillStyle = pointMessage.includes('PLAYER') ? '#00F5D4' : '#E60067';
            ctx.textAlign = 'center';
            ctx.fillText(pointMessage, canvas.width / 2, 180);
            ctx.restore();
        }

        if (isCountingDown) {
            ctx.save();
            ctx.font = 'bold 72px sans-serif';
            ctx.fillStyle = '#00F5D4';
            ctx.strokeStyle = '#0D0D0D';
            ctx.lineWidth = 4;
            ctx.textAlign = 'center';

            const text = countdownSteps[countdownIndex];
            ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);
            ctx.restore();
        }
    }

    // =========================================================
    // GAME LOOP
    // =========================================================

    function gameLoop() {
        update();
        render();
        requestAnimationFrame(gameLoop);
    }

    gameLoop();
});
