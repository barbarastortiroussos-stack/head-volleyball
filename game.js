window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 1. ESTADO DO JOGO (Começa parado esperando o clique!)
    let jogoRodando = false;

    // Elementos do Menu e Botão no HTML
    const botaoJogar = document.getElementById('btn-jogar'); // Ajuste o ID se o seu for diferente
    const telaMenu = document.getElementById('menu');         // Ajuste o ID se o seu for diferente

    if (botaoJogar) {
        botaoJogar.addEventListener('click', () => {
            jogoRodando = true; // Ativa a lógica do jogo!
            if (telaMenu) telaMenu.style.display = 'none'; // Some com o menu
        });
    }

    // Configurações do Jogo
    const gravity = 0.45;
    let playerScore = 0;
    let cpuScore = 0;

    // Objeto da Bola
    const ball = {
        x: canvas.width / 2,
        y: 100,
        radius: 12,
        vx: 2,
        vy: 0,
        bounce: 0.75,
        reset() {
            this.x = canvas.width / 2;
            this.y = 100;
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = 0;
        }
    };

    // Jogador (Lado Esquerdo)
    const player = {
        x: 150,
        y: 480,
        width: 40,
        height: 60,
        vx: 0,
        vy: 0,
        speed: 5,
        jumpPower: -11,
        isGrounded: false,
        color: '#FF4136', // Vermelho
        isFemale: false
    };

    // NPC / CPU (Lado Direito)
    const cpu = {
        x: 610,
        y: 480,
        width: 40,
        height: 60,
        vx: 0,
        vy: 0,
        speed: 4,
        jumpPower: -11,
        isGrounded: false,
        color: '#0074D9', // Azul
        isFemale: false
    };

    // A Rede (No centro)
    const net = {
        x: canvas.width / 2 - 5,
        y: 400,
        width: 10,
        height: 200,
        color: '#FFFFFF'
    };

    // Captura de Teclas do Jogador
    const keys = {};
    window.addEventListener('keydown', e => keys[e.key] = true);
    window.addEventListener('keyup', e => keys[e.key] = false);

    // --- DESENHO DO FANTASMA (PAC-MAN STYLE) ---
    function drawGhost(x, y, width, height, color, isFemale) {
        ctx.fillStyle = color;

        // 1. Corpo do Fantasma
        ctx.beginPath();
        ctx.arc(x + width / 2, y + width / 2, width / 2, Math.PI, 0, false);
        ctx.lineTo(x + width, y + height);
        
        // Ondas da parte de baixo
        let feet = 3;
        let footWidth = width / feet;
        for (let i = 0; i < feet; i++) {
            ctx.lineTo(x + width - (i * footWidth) - (footWidth / 2), y + height - 6);
            ctx.lineTo(x + width - ((i + 1) * footWidth), y + height);
        }
        
        ctx.lineTo(x, y + width / 2);
        ctx.closePath();
        ctx.fill();

        // 2. Olhos
        let eyeOffset = width * 0.25;
        let eyeRadius = width * 0.15;
        let pupilRadius = width * 0.07;

        // Olho Esquerdo (Branco)
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(x + eyeOffset, y + height * 0.35, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Olho Direito (Branco)
        ctx.beginPath();
        ctx.arc(x + width - eyeOffset, y + height * 0.35, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Pupilas
        ctx.fillStyle = "#111100";
        ctx.beginPath();
        ctx.arc(x + eyeOffset, y + height * 0.35, pupilRadius, 0, Math.PI * 2);
        ctx.arc(x + width - eyeOffset, y + height * 0.35, pupilRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    // --- ATUALIZAÇÃO DA LÓGICA (UPDATE) ---
    function update() {
        // 1. Movimento do Jogador
        if (keys['a'] || keys['A'] || keys['ArrowLeft']) player.vx = -player.speed;
        else if (keys['d'] || keys['D'] || keys['ArrowRight']) player.vx = player.speed;
        else player.vx = 0;

        if ((keys['w'] || keys['W'] || keys['ArrowUp'] || keys[' ']) && player.isGrounded) {
            player.vy = player.jumpPower;
            player.isGrounded = false;
        }

        // Aplica física no Jogador
        player.x += player.vx;
        player.y += player.vy;
        player.vy += gravity;

        // Limites de chão e rede para o Jogador
        if (player.y + player.height >= 580) {
            player.y = 580 - player.height;
            player.vy = 0;
            player.isGrounded = true;
        }
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > net.x) player.x = net.x - player.width;

        // 2. Inteligência Artificial do NPC
        const diffElement = document.getElementById('difficulty');
        const diff = diffElement ? diffElement.value : 'medium';
        let cpuSpeed = diff === 'easy' ? 3 : (diff === 'medium' ? 4.5 : 6);
        
        if (ball.x > net.x) {
            if (ball.x < cpu.x + 10) cpu.vx = -cpuSpeed;
            else if (ball.x > cpu.x + cpu.width - 10) cpu.vx = cpuSpeed;
            else cpu.vx = 0;

            if (ball.y < cpu.y && ball.x > cpu.x - 30 && cpu.isGrounded) {
                cpu.vy = cpu.jumpPower;
                cpu.isGrounded = false;
            }
        } else {
            cpu.vx = 0;
        }

        // Aplica física no NPC
        cpu.x += cpu.vx;
        cpu.y += cpu.vy;
        cpu.vy += gravity;

        if (cpu.y + cpu.height >= 580) {
            cpu.y = 580 - cpu.height;
            cpu.vy = 0;
            cpu.isGrounded = true;
        }
        if (cpu.x < net.x + net.width) cpu.x = net.x + net.width;
        if (cpu.x + cpu.width > canvas.width) cpu.x = canvas.width - cpu.width;

        // 3. Física da Bola
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vy += gravity * 0.8;

        // Paredes laterais
        if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
            ball.vx *= -1;
        }

        // Colisões com Jogador e CPU
        checkHeadCollision(player);
        checkHeadCollision(cpu);

        // Colisão com a Rede
        if (ball.x + ball.radius > net.x && ball.x - ball.radius < net.x + net.width && ball.y > net.y) {
            ball.vx *= -1;
        }

        // Ponto / Chão
        if (ball.y + ball.radius >= 580) {
            if (ball.x < canvas.width / 2) {
                cpuScore++;
                const cpuScoreEl = document.getElementById('cpuScore');
                if (cpuScoreEl) cpuScoreEl.innerText = cpuScore;
            } else {
                playerScore++;
                const playerScoreEl = document.getElementById('playerScore');
                if (playerScoreEl) playerScoreEl.innerText = playerScore;
            }
            ball.reset();
        }
    }

    // Detecção de Impacto com os Fantasminhas
    function checkHeadCollision(p) {
        let headX = p.x + p.width / 2;
        let headY = p.y + p.height / 3;
        
        let dx = ball.x - headX;
        let dy = ball.y - headY;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ball.radius + (p.width / 2)) {
            ball.vy = -8;
            ball.vx = dx * 0.3;
        }
    }

    // --- DESENHO NA TELA (RENDER) ---
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Chão da quadra
        ctx.fillStyle = '#D2B48C';
        ctx.fillRect(0, 580, canvas.width, 20);

        // Rede
        ctx.fillStyle = net.color;
        ctx.fillRect(net.x, net.y, net.width, net.height);

        // Desenha o Jogador (Fantasma Vermelho)
        drawGhost(player.x, player.y, player.width, player.height, player.color, player.isFemale);

        // Desenha a CPU (Fantasma Azul)
        drawGhost(cpu.x, cpu.y, cpu.width, cpu.height, cpu.color, cpu.isFemale);

        // Bola de Vôlei
        ctx.fillStyle = '#FFDC00';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();
    }

    // Loop Principal do Jogo
    function gameLoop() {
        if (jogoRodando) {
            update(); // Só calcula a física se o jogo começou
        }
        draw(); // Desenha a tela (assim o cenário e os fantasma ficam visíveis no menu)
        requestAnimationFrame(gameLoop);
    }

    gameLoop();
});
