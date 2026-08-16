window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // --- ELEMENTOS DA INTERFACE (HTML) ---
    const startScreen = document.getElementById('startScreen');
    const pauseScreen = document.getElementById('pauseScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');

    const startBtn = document.getElementById('startBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const pauseBtn = document.getElementById('pauseBtn');

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

    // --- ESTADOS DO JOGO ---
    let gameRunning = false;
    let isPaused = false;
    let gameOver = false;

    let playerScore = 0;
    let cpuScore = 0;
    let particles = []
    let pointMessage = "";
let pointMessageTimer = 0;
    const backgroundMusic = new Audio(
    "assets/desifreemusic-copyright-free-background-music-407395.mp3"
);

backgroundMusic.loop = true;
backgroundMusic.volume = 0.25;
    

    // Quantidade de pontos necessária para vencer
    const WINNING_SCORE = 10;

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
        color: '#FFFFFF',
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
        easy: {
            speed: 3.5,
            jumpPower: -9,
            reaction: 0.04
        },

        medium: {
            speed: 5.0,
            jumpPower: -11,
            reaction: 0.08
        },

        hard: {
            speed: 6.5,
            jumpPower: -12.5,
            reaction: 0.15
        }
    };

    // =========================================================
    // CONTROLES DE TECLADO
    // =========================================================

    window.addEventListener('keydown', (e) => {

        // Movimento
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            keys.left = true;
        }

        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            keys.right = true;
        }

        // Pulo
        if (
            e.code === 'ArrowUp' ||
            e.code === 'KeyW' ||
            e.code === 'Space'
        ) {
            if (
                !keys.up &&
                !player.jumping &&
                gameRunning &&
                !isPaused &&
                !gameOver
            ) {
                player.vy = -12;
                player.jumping = true;
            }

            keys.up = true;
        }

        // Pausa
        if (e.code === 'KeyP') {
            togglePause();
        }
    });

    window.addEventListener('keyup', (e) => {

        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            keys.left = false;
        }

        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            keys.right = false;
        }

        if (
            e.code === 'ArrowUp' ||
            e.code === 'KeyW' ||
            e.code === 'Space'
        ) {
            keys.up = false;
        }
    });

    // =========================================================
    // CONTROLES TOUCH
    // =========================================================

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

            if (
                !player.jumping &&
                gameRunning &&
                !isPaused &&
                !gameOver
            ) {
                player.vy = -12;
                player.jumping = true;
            }
        };

        btnJump.addEventListener('touchstart', doJump);
        btnJump.addEventListener('mousedown', doJump);
    }

    // =========================================================
    // ATUALIZAR PLACAR
    // =========================================================

    function updateScoreboard() {

        if (playerScoreEl) {
            playerScoreEl.textContent = playerScore;
        }

        if (cpuScoreEl) {
            cpuScoreEl.textContent = cpuScore;
        }
    }

    // =========================================================
    // INICIAR NOVA PARTIDA
    // =========================================================

    function startNewMatch() {

        playerScore = 0;
        cpuScore = 0;

        gameOver = false;
        gameRunning = true;
        isPaused = false;

        updateScoreboard();

        // Esconde todas as telas
        if (startScreen) {
            startScreen.classList.add('hidden');
        }

        if (pauseScreen) {
            pauseScreen.classList.add('hidden');
        }

        if (gameOverScreen) {
            gameOverScreen.classList.add('hidden');
        }

        // Reinicia o saque
        resetServe('player');
    }

    // =========================================================
    // REINICIAR PONTO
    // =========================================================

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

    // =========================================================
    // PAUSA
    // =========================================================

    function togglePause() {

        // Não permite pausar antes de começar
        if (!gameRunning) return;

        // Não permite pausar depois da partida terminar
        if (gameOver) return;

        isPaused = !isPaused;

        if (isPaused) {

            pauseScreen.classList.remove('hidden');

        } else {

            pauseScreen.classList.add('hidden');
        }
    }

    if (resumeBtn) {
        resumeBtn.addEventListener('click', togglePause);
    }
    if (pauseBtn) {
    pauseBtn.addEventListener('click', togglePause);
}

    // =========================================================
    // FINAL DA PARTIDA
    // =========================================================

    function endMatch(winner) {

        gameOver = true;
        gameRunning = false;
        isPaused = false;

        // Para qualquer movimento que esteja acontecendo
        keys.left = false;
        keys.right = false;
        keys.up = false;

        player.vx = 0;
        player.vy = 0;

        cpu.vx = 0;
        cpu.vy = 0;

        // Atualiza o texto do placar
        updateScoreboard();

        // Define a mensagem
        if (winner === 'player') {

            if (gameOverTitle) {
                gameOverTitle.textContent = 'YOU WIN!';
            }

        } else {

            if (gameOverTitle) {
                gameOverTitle.textContent = 'CPU WINS!';
            }
        }

        // Mostra o placar final
        if (finalScoreEl) {
            finalScoreEl.textContent =
                `${playerScore} x ${cpuScore}`;
        }

        // Esconde a pausa
        if (pauseScreen) {
            pauseScreen.classList.add('hidden');
        }

        // Mostra a tela de resultado
        if (gameOverScreen) {
            gameOverScreen.classList.remove('hidden');
        }
    }

    // =========================================================
    // MARCAR PONTO
    // =========================================================

    function scorePoint(winner) {

        // Segurança: não permite pontuar depois do fim
        if (gameOver) return;

        if (winner === 'player') {

            playerScore++;

        } else {

            cpuScore++;
        }

        updateScoreboard();

        // Verifica se alguém chegou aos 10 pontos
        if (playerScore >= WINNING_SCORE) {

            endMatch('player');
            return;
        }

        if (cpuScore >= WINNING_SCORE) {

            endMatch('cpu');
            return;
        }

        // A partida continua
        // Quem marcou o ponto perde o próximo saque,
        // então o adversário começa com a bola.
        if (winner === 'player') {

            resetServe('cpu');

        } else {

            resetServe('player');
        }
    }

    // =========================================================
    // BOTÃO PLAY NOVAMENTE
    // =========================================================

    if (playAgainBtn) {

        playAgainBtn.addEventListener('click', () => {

            // Mantém a dificuldade escolhida
            cpu.difficulty = difficultySelect
                ? difficultySelect.value
                : 'medium';

            // Mantém o gênero escolhido
            player.gender = genderSelect
                ? genderSelect.value
                : 'male';

            startNewMatch();
        });
    }

    // =========================================================
    // BOTÃO PLAY DO MENU INICIAL
    // =========================================================

 if (startBtn) {

    startBtn.addEventListener('click', () => {

        // Aplica opções escolhidas no menu
        player.gender = genderSelect
            ? genderSelect.value
            : 'male';

        cpu.difficulty = difficultySelect
            ? difficultySelect.value
            : 'medium';

        startNewMatch();
    });
}
    // =========================================================
    // LÓGICA DE ATUALIZAÇÃO
    // =========================================================
function predictBallX(predictionTime) {
    return ball.x + ball.vx * predictionTime;
}
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
    function update() {

        if (!gameRunning || isPaused || gameOver) {
            return;
        }

        // -----------------------------------------------------
        // MOVIMENTO DO JOGADOR
        // -----------------------------------------------------

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

        // Limites do jogador
        if (player.x - player.radius < 0) {
            player.x = player.radius;
        }

        if (player.x + player.radius > net.x) {
            player.x = net.x - player.radius;
        }

        // Chão
        if (player.y + player.radius >= groundY) {

            player.y = groundY - player.radius;
            player.vy = 0;
            player.jumping = false;
        }


// -----------------------------------------------------
// IA DA CPU - PRIMEIRA VERSÃO ESTÁVEL
// -----------------------------------------------------

const config =
    difficultySettings[cpu.difficulty] ||
    difficultySettings.medium;

let targetX = 650;

// A bola está no lado da CPU?
if (ball.x > net.x + net.width) {

    // A CPU acompanha diretamente a bola.
    targetX = ball.x;
}

// Mantém a CPU dentro do próprio lado.
targetX = Math.max(
    net.x + net.width + cpu.radius,
    Math.min(
        canvas.width - cpu.radius,
        targetX
    )
);

// Distância entre a CPU e o alvo.
const distanceToTarget = targetX - cpu.x;

// Movimento da CPU.
if (distanceToTarget > 5) {

    cpu.vx = config.speed;

} else if (distanceToTarget < -5) {

    cpu.vx = -config.speed;

} else {

    cpu.vx = 0;
}
// -----------------------------------------------------
// PULO
// -----------------------------------------------------

const distanceToBall = Math.abs(ball.x - cpu.x);

const ballIsComing =
    ball.x > net.x + net.width &&
    ball.vx < 0;

const ballIsClose =
    distanceToBall < 75;

const ballIsHighEnough =
    ball.y < 330;

if (
    ballIsComing &&
    ballIsClose &&
    ballIsHighEnough &&
    !cpu.jumping
) {

    // Dificuldade controla a chance de reação.
    if (Math.random() < config.reaction) {

        cpu.vy = config.jumpPower;
        cpu.jumping = true;
    }
    
}
        // Aplica o movimento da CPU
cpu.x += cpu.vx;

// Gravidade da CPU
cpu.vy += 0.5;
cpu.y += cpu.vy;
        // Limites da CPU
        if (cpu.x - cpu.radius < net.x + net.width) {

            cpu.x =
                net.x +
                net.width +
                cpu.radius;
        }

        if (cpu.x + cpu.radius > canvas.width) {

            cpu.x =
                canvas.width -
                cpu.radius;
        }

        // Chão da CPU
        if (cpu.y + cpu.radius >= groundY) {

            cpu.y = groundY - cpu.radius;
            cpu.vy = 0;
            cpu.jumping = false;
        }

        // -----------------------------------------------------
        // FÍSICA DA BOLA
        // -----------------------------------------------------

        ball.vy += ball.gravity;

        ball.x += ball.vx;
        ball.y += ball.vy;

        // Paredes
        if (ball.x - ball.radius < 0) {

            ball.x = ball.radius;
            ball.vx *= -ball.bounce;
        }

        if (ball.x + ball.radius > canvas.width) {

            ball.x =
                canvas.width -
                ball.radius;

            ball.vx *= -ball.bounce;
        }

        // Teto
        if (ball.y - ball.radius < 0) {

            ball.y = ball.radius;
            ball.vy *= -1;
        }

        // -----------------------------------------------------
        // COLISÃO COM A REDE
        // -----------------------------------------------------

        if (
            ball.x + ball.radius > net.x &&
            ball.x - ball.radius < net.x + net.width
        ) {

            if (ball.y + ball.radius > net.y) {

                if (ball.x < net.x + net.width / 2) {

                    ball.x =
                        net.x -
                        ball.radius;

                    ball.vx =
                        -Math.abs(ball.vx) *
                        0.8;

                } else {

                    ball.x =
                        net.x +
                        net.width +
                        ball.radius;

                    ball.vx =
                        Math.abs(ball.vx) *
                        0.8;
                }
            }
        }

        // -----------------------------------------------------
        // COLISÕES
        // -----------------------------------------------------

        checkBallCollision(player);
        checkBallCollision(cpu);

        // -----------------------------------------------------
        // VERIFICAÇÃO DE PONTO
        // -----------------------------------------------------
if (ball.y + ball.radius >= groundY) {

    if (ball.x < net.x + net.width / 2) {

        scorePoint('cpu');
        showPointMessage("cpu");

    } else {

        scorePoint('player');
        showPointMessage("player");
    }
}
   // Atualiza as partículas
for (let i = particles.length - 1; i >= 0; i--) {

    const particle = particles[i];

    particle.x += particle.vx;
    particle.y += particle.vy;

    particle.life--;

    if (particle.life <= 0) {
        particles.splice(i, 1);
    }
}

        // Atualiza o feedback de ponto
if (pointMessageTimer > 0) {
    pointMessageTimer--;
}
    }

    // =========================================================
    // COLISÃO BOLA X FANTASMA
    // =========================================================

  function checkBallCollision(entity) {

    const dx = ball.x - entity.x;
    const dy = ball.y - entity.y;

    const distance = Math.hypot(dx, dy);
    const minDistance = ball.radius + entity.radius;

    // Não houve colisão
    if (distance >= minDistance) {
        return;
    }

    // Evita divisão por zero
    if (distance === 0) {
        return;
    }

    // Vetor normal da colisão
    const nx = dx / distance;
    const ny = dy / distance;

    // =====================================================
    // 1. AFASTA A BOLA DO FANTASMA
    // =====================================================

    const overlap = minDistance - distance;

    ball.x += nx * overlap;
    ball.y += ny * overlap;

    // =====================================================
    // 2. VELOCIDADE RELATIVA
    // =====================================================

    const relativeVx = ball.vx - entity.vx;
    const relativeVy = ball.vy - entity.vy;

    const relativeVelocity =
        relativeVx * nx +
        relativeVy * ny;

    // Se a bola já está se afastando do jogador,
    // não aplica outra rebatida.
    if (relativeVelocity > 0) {
        return;
    }
      

    // =====================================================
    // 3. FORÇA DA REBATIDA
    // =====================================================

    const hitPower = 8;

    // Reflexão da velocidade da bola
    ball.vx -= 2 * relativeVelocity * nx;
    ball.vy -= 2 * relativeVelocity * ny;

 // Força horizontal do golpe
ball.vx += nx * hitPower;

// Força vertical mais controlada
ball.vy += ny * hitPower * 0.45;

    // =====================================================
    // 4. INFLUÊNCIA DO MOVIMENTO DO JOGADOR
    // =====================================================

    ball.vx += entity.vx * 0.35;
    ball.vy += entity.vy * 0.15;

    // =====================================================
    // 5. LIMITES DE VELOCIDADE
    // =====================================================

    const maxHorizontalSpeed = 14;
    const maxVerticalSpeed = 16;

    ball.vx = Math.max(
        -maxHorizontalSpeed,
        Math.min(maxHorizontalSpeed, ball.vx)
    );

    ball.vy = Math.max(
        -maxVerticalSpeed,
        Math.min(maxVerticalSpeed, ball.vy)
    );

      // ✨ Efeito visual do impacto
    createHitParticles(ball.x, ball.y);
}

    // =========================================================
    // RENDERIZAÇÃO
    // =========================================================

    function drawGhost(ghost, color) {

        ctx.save();

        ctx.translate(
            ghost.x,
            ghost.y
        );

        // Corpo
        ctx.fillStyle = color;

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            ghost.radius,
            Math.PI,
            0,
            false
        );

        ctx.lineTo(
            ghost.radius,
            ghost.radius / 2
        );

        // Ondas
        const waveCount = 3;

        const waveWidth =
            (ghost.radius * 2) /
            waveCount;

        for (let i = 0; i < waveCount; i++) {

            const x =
                ghost.radius -
                (i + 1) *
                waveWidth;

            ctx.quadraticCurveTo(
                x + waveWidth / 2,
                ghost.radius + 10,
                x,
                ghost.radius / 2
            );
        }

        ctx.closePath();
        ctx.fill();

        // Olhos
        ctx.fillStyle = '#000';

        ctx.beginPath();

        ctx.arc(
            -10,
            -5,
            4,
            0,
            Math.PI * 2
        );

        ctx.arc(
            10,
            -5,
            4,
            0,
            Math.PI * 2
        );

        ctx.fill();

        // Lacinho feminino
        if (ghost.gender === 'female') {

            ctx.fillStyle = '#FF4136';

            ctx.beginPath();

            ctx.arc(
                -12,
                -ghost.radius + 5,
                6,
                0,
                Math.PI * 2
            );

            ctx.arc(
                -4,
                -ghost.radius + 5,
                6,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }

        ctx.restore();
    }

    // =========================================================
    // RENDER
    // =========================================================

    function render() {

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        // Chão
        ctx.fillStyle = '#E6C280';

        ctx.fillRect(
            0,
            groundY,
            canvas.width,
            canvas.height - groundY
        );

        // Linha do chão
        ctx.strokeStyle = '#D0A050';
        ctx.lineWidth = 4;

        ctx.beginPath();

        ctx.moveTo(
            0,
            groundY
        );

        ctx.lineTo(
            canvas.width,
            groundY
        );

        ctx.stroke();

        // Rede
        ctx.fillStyle = '#FFFFFF';

        ctx.fillRect(
            net.x,
            net.y,
            net.width,
            net.height
        );

        ctx.fillStyle = '#333333';

        ctx.fillRect(
            net.x + 3,
            net.y + net.height,
            4,
            canvas.height -
            (net.y + net.height)
        );

        // Fantasmas
        drawGhost(
            player,
            player.color
        );

        drawGhost(
            cpu,
            cpu.color
        );

        // Bola
        ctx.save();

        ctx.translate(
            ball.x,
            ball.y
        );

        ctx.fillStyle = '#FFDC00';

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            ball.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';

        ctx.stroke();

        ctx.restore();

        // Desenha as partículas
for (const particle of particles) {

    ctx.globalAlpha = particle.life / 20;

    ctx.fillStyle = "#FFFFFF";

    ctx.beginPath();

    ctx.arc(
        particle.x,
        particle.y,
        3,
        0,
        Math.PI * 2
    );

    ctx.fill();
}
        // Feedback de ponto
if (pointMessageTimer > 0) {

    ctx.save();

    ctx.textAlign = "center";
    ctx.font = "bold 36px Arial";

    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 6;

    ctx.fillText(
        pointMessage,
        canvas.width / 2,
        100
    );

    ctx.restore();
}

// Restaura a transparência normal
ctx.globalAlpha = 1;
    }

    // =========================================================
    // LOOP PRINCIPAL
    // =========================================================

    function gameLoop() {

        update();
        render();

        requestAnimationFrame(gameLoop);
    }

    // Inicia o jogo
    gameLoop();
});
