window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Configurações do Jogo
    const gravity = 0.4;
    let playerScore = 0;
    let cpuScore = 0;

    // Objeto da Bola
    const ball = {
        x: canvas.width / 2,
        y: 100,
        radius: 15,
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
        height: 70,
        vx: 0,
        vy: 0,
        speed: 5,
        jumpPower: -10,
        isGrounded: false,
        color: '#FF4136' // Vermelho
    };

    // NPC / CPU (Lado Direito)
    const cpu = {
        x: 610,
        y: 480,
        width: 40,
        height: 70,
        vx: 0,
        vy: 0,
        speed: 4,
        jumpPower: -10,
        isGrounded: false,
        color: '#0074D9' // Azul
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

    // --- ATUALIZAÇÃO DA LÓGICA (UPDATE) ---
    function update() {
        // 1. Movimento do Jogador (Teclas A, D e W)
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
            player.isGrounded = true;
        }
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > net.x) player.x = net.x - player.width;

        // 2. Inteligência Artificial Básica do NPC
        const diffElement = document.getElementById('difficulty');
        const diff = diffElement ? diffElement.value : 'medium';
        let cpuSpeed = diff === 'easy' ? 3 : (diff === 'medium' ? 4.5 : 6);
        
        // NPC segue a bola quando ela passa para o lado dele
        if (ball.x > net.x) {
            if (ball.x < cpu.x + 10) cpu.x -= cpuSpeed;
            else if (ball.x > cpu.x + cpu.width - 10) cpu.x += cpuSpeed;

            // NPC pula para acertar a bola
            if (ball.y < cpu.y && ball.x > cpu.x - 30 && cpu.isGrounded) {
                cpu.vy = cpu.jumpPower;
                cpu.isGrounded = false;
            }
        }

        // Aplica física no NPC
        cpu.x += cpu.vx;
        cpu.y += cpu.vy;
        cpu.vy += gravity;

        if (cpu.y + cpu.height >= 580) {
            cpu.y = 580 - cpu.height;
            cpu.isGrounded = true;
        }
        if (cpu.x < net.x + net.width) cpu.x = net.x + net.width;
        if (cpu.x + cpu.width > canvas.width) cpu.x = canvas.width - cpu.width;

        // 3. Física da Bola
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vy += gravity * 0.5; // Bola mais leve

        // Bate nas paredes laterais
        if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
            ball.vx *= -1;
        }

        // Colisão da Bola com o Cabeção do Jogador
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

    // Detecção de Cabeçada
    function checkHeadCollision(p) {
        let headX = p.x + p.width / 2;
        let headY = p.y + 15; // Topo do corpo (A Cabeça)
        
        let dx = ball.x - headX;
        let dy = ball.y - headY;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ball.radius + 20) {
            ball.vy = -8; // Impulso para cima
            ball.vx = dx * 0.4; // Direção dependendo de onde bateu na cabeça
        }
    }

    // --- DESENHO NA TELA (RENDER) ---
    function draw() {
        // Limpa a tela
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Chão da quadra
        ctx.fillStyle = '#D2B48C';
        ctx.fillRect(0, 580, canvas.width, 20);

        // Rede
        ctx.fillStyle = net.color;
        ctx.fillRect(net.x, net.y, net.width, net.height);

        // Jogador (Corpo + Cabeça destacada)
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y + 20, player.width, player.height - 20);
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + 15, 20, 0, Math.PI * 2);
        ctx.fill();

        // NPC (Corpo + Cabeça destacada)
        ctx.fillStyle = cpu.color;
        ctx.fillRect(cpu.x, cpu.y + 20, cpu.width, cpu.height - 20);
        ctx.beginPath();
        ctx.arc(cpu.x + cpu.width / 2, cpu.y + 15, 20, 0, Math.PI * 2);
        ctx.fill();

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
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    gameLoop();
});
