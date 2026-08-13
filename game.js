window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // --- ELEMENTOS DA INTERFACE (HTML) ---
    const startScreen = document.getElementById('startScreen');
    const pauseScreen = document.getElementById('pauseScreen');
    const startBtn = document.getElementById('startBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const genderSelect = document.getElementById('gender');
    const difficultySelect = document.getElementById('difficulty');
    const playerScoreEl = document.getElementById('playerScore');
    const cpuScoreEl = document.getElementById('cpuScore');

    // Controles Touch
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');
    const btnJump = document.getElementById('btnJump');

    // --- ESTADOS DO JOGO ---
    let gameRunning = false;
    let isPaused = false;
    let playerScore = 0;
    let cpuScore = 0;

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
        color: '#FFFFFF', // Cor base do fantasma
        hairColor: '#000000',
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
        color: '#FF6B6B',
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
        bounce: 0.75
    };

    // --- DIFICULDADES DA CPU ---
    const difficultySettings = {
        easy: { speed: 3.5, jumpPower: -9, reaction: 0.04 },
        medium: { speed: 5.0, jumpPower: -11, reaction: 0.08 },
        hard: { speed: 6.5, jumpPower: -12.5, reaction: 0.15 }
    };

    // --- CONTROLES DE TECLADO ---
    window.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
        if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
            if (!keys.up && !player.jumping && gameRunning && !isPaused) {
                player.vy = -12;
                player.jumping = true;
            }
            keys.up = true;
        }
        if (e.code === 'KeyP') togglePause();
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
        if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.up = false;
    });

    // --- CONTROLES TOUCH (MOBILE) ---
    const setupTouchBtn = (element, keyProp) => {
        if (!element) return;
        const start = (e) => { e.preventDefault(); keys[keyProp] = true; };
        const end = (e) => { e.preventDefault(); keys[keyProp] = false; };
        element.addEventListener('touchstart', start);
        element.addEventListener('touchend', end);
        element.addEventListener('mousedown', start);
        element.addEventListener('mouseup', end);
    };

    setupTouchBtn(btnLeft, 'left');
    setupTouchBtn(btnRight, 'right');

    if (btnJump) {
        const doJump = (e) => {
            e.preventDefault();
            if (!player.jumping && gameRunning && !isPaused) {
                player.vy = -12;
                player.jumping = true;
            }
        };
        btnJump.addEventListener('touchstart', doJump);
        btnJump.addEventListener('mousedown', doJump);
    }

    // --- REINICIAR PONTO ---
    function resetServe(server = 'player') {
        player.x = 150;
        player.y = groundY - player.radius;
        player.vx = 0;
        player.vy = 0;

        cpu.x = 650;
        cpu.y = groundY - cpu.radius;
        cpu.vx = 0;
        cpu.vy = 0;

        if (server === 'player') {
            ball.x = 200;
            ball.y = 200;
        } else {
            ball.x = 600;
            ball.y = 200;
        }
        ball.vx = 0;
        ball.vy = 0;
    }

    // --- PAUSA ---
    function togglePause() {
        if (!gameRunning) return;
        isPaused = !isPaused;
        if (isPaused) {
            pauseScreen.classList.remove('hidden');
        } else {
            pauseScreen.classList.add('hidden');
        }
    }

    if (resumeBtn) resumeBtn.addEventListener('click', togglePause);

    // --- INICIAR O JOGO ---
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            // Aplica opções escolhidas no menu
            player.gender = genderSelect ? genderSelect.value : 'male';
            cpu.difficulty = difficultySelect ? difficultySelect.value : 'medium';

            playerScore = 0;
            cpuScore = 0;
            if (playerScoreEl) playerScoreEl.textContent = playerScore;
            if (cpuScoreEl) cpuScoreEl.textContent = cpuScore;

            startScreen.classList.add('hidden');
            gameRunning = true;
            isPaused = false;

            resetServe('player');
        });
    }

    // --- LÓGICA DE ATUALIZAÇÃO (PHYSICS & IA) ---
    function update() {
        if (!gameRunning || isPaused) return;

        // Movimento do Jogador
        if (keys.left) player.vx = -player.speed;
        else if (keys.right) player.vx = player.speed;
        else player.vx = 0;

        player.x += player.vx;
        player.vy += 0.5; // Gravidade
        player.y += player.vy;

        // Limites do Jogador (Lado Esquerdo)
        if (player.x - player.radius < 0) player.x = player.radius;
        if (player.x + player.radius > net.x) player.x = net.x - player.radius;
        if (player.y + player.radius >= groundY) {
            player.y = groundY - player.radius;
            player.vy = 0;
            player.jumping = false;
        }

        // Lógica da CPU (Inteligência Artificial)
        const config = difficultySettings[cpu.difficulty] || difficultySettings.medium;
        const targetX = ball.x > net.x + net.width ? ball.x : 650;

        if (cpu.x < targetX - 10) cpu.vx = config.speed;
        else if (cpu.x > targetX + 10) cpu.vx = -config.speed;
        else cpu.vx = 0;

        // Pulo da CPU
        if (ball.x > net.x + net.width && ball.x < 750 && ball.y < 350 && !cpu.jumping) {
            if (Math.random() < config.reaction) {
                cpu.vy = config.jumpPower;
                cpu.jumping = true;
            }
        }

        cpu.x += cpu.vx;
        cpu.vy += 0.5;
        cpu.y += cpu.vy;

        // Limites da CPU (Lado Direito)
        if (cpu.x - cpu.radius < net.x + net.width) cpu.x = net.x + net.width + cpu.radius;
        if (cpu.x + cpu.radius > canvas.width) cpu.x = canvas.width - cpu.radius;
        if (cpu.y + cpu.radius >= groundY) {
            cpu.y = groundY - cpu.radius;
            cpu.vy = 0;
            cpu.jumping = false;
        }

        // Física da Bola
        ball.vy += ball.gravity;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Colisão da Bola com Paredes e Teto
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

        // Colisão da Bola com a Rede
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

        // Colisão da Bola com Jogador / CPU
        checkBallCollision(player);
        checkBallCollision(cpu);

        // Pontuação (Bola toca o chão)
        if (ball.y + ball.radius >= groundY) {
            if (ball.x < net.x + net.width / 2) {
                // Ponto da CPU
                cpuScore++;
                if (cpuScoreEl) cpuScoreEl.textContent = cpuScore;
                resetServe('player');
            } else {
                // Ponto do Jogador
                playerScore++;
                if (playerScoreEl) playerScoreEl.textContent = playerScore;
                resetServe('cpu');
            }
        }
    }

    // Colisão Círculo x Círculo (Fantasma x Bola)
    function checkBallCollision(entity) {
        const dx = ball.x - entity.x;
        const dy = ball.y - entity.y;
        const distance = Math.hypot(dx, dy);

        if (distance < ball.radius + entity.radius) {
            const angle = Math.atan2(dy, dx);
            const power = 10;
            
            ball.vx = Math.cos(angle) * power + entity.vx * 0.5;
            ball.vy = Math.sin(angle) * power + entity.vy * 0.3;

            // Evita que a bola grude dentro do personagem
            ball.x = entity.x + Math.cos(angle) * (ball.radius + entity.radius + 2);
            ball.y = entity.y + Math.sin(angle) * (ball.radius + entity.radius + 2);
        }
    }

    // --- RENDERIZAÇÃO (DESENHO) ---
    function drawGhost(ghost, color) {
        ctx.save();
        ctx.translate(ghost.x, ghost.y);

        // Corpo do Fantasma
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, ghost.radius, Math.PI, 0, false); // Cabeça ondulada/arredondada
        ctx.lineTo(ghost.radius, ghost.radius / 2);
        
        // Saia / Ondas do Fantasma
        const waveCount = 3;
        const waveWidth = (ghost.radius * 2) / waveCount;
        for (let i = 0; i < waveCount; i++) {
            const x = ghost.radius - (i + 1) * waveWidth;
            ctx.quadraticCurveTo(x + waveWidth / 2, ghost.radius + 10, x, ghost.radius / 2);
        }
        ctx.closePath();
        ctx.fill();

        // Olhos
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-10, -5, 4, 0, Math.PI * 2);
        ctx.arc(10, -5, 4, 0, Math.PI * 2);
        ctx.fill();

        // Cabelo ou Lacinho (Se for Feminino)
        if (ghost.gender === 'female') {
            ctx.fillStyle = '#FF4136'; // Lacinho Vermelho
            ctx.beginPath();
            ctx.arc(-12, -ghost.radius + 5, 6, 0, Math.PI * 2);
            ctx.arc(-4, -ghost.radius + 5, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    function render() {
        // Limpar Tela
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Chão / Quadra
        ctx.fillStyle = '#E6C280'; // Cor de Areia
        ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

        // Linha do Chão
        ctx.strokeStyle = '#D0A050';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(canvas.width, groundY);
        ctx.stroke();

        // Rede
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(net.x, net.y, net.width, net.height);
        ctx.fillStyle = '#333333';
        ctx.fillRect(net.x + 3, net.y + net.height, 4, canvas.height - (net.y + net.height));

        // Personagens
        drawGhost(player, player.color);
        drawGhost(cpu, cpu.color);

        // Bola de Vôlei
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.fillStyle = '#FFDC00'; // Bola Amarela
        ctx.beginPath();
        ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        ctx.stroke();
        ctx.restore();
    }

    // --- LOOP PRINCIPAL DO JOGO ---
    function gameLoop() {
        update();
        render();
        requestAnimationFrame(gameLoop);
    }

    // Inicia a execução contínua da renderização
    gameLoop();
});
