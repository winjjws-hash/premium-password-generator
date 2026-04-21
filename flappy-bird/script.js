const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameContainer = document.getElementById('game-container');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

let cw, ch;
let frame = 0;
let score = 0;
let bestScore = localStorage.getItem('neonDashBestScore') || 0;
let gameState = 'start'; // 'start', 'playing', 'gameover'

// Physics & Dimensions
const gravityBase = 0.4;
const jumpStrengthBase = -7.5;
const pipeSpeedBase = 3.5;
const pipeWidth = 60;
const pipeGapBase = 160;

let gravity, jumpStrength, pipeSpeed, pipeGap;

let bird;
let pipes = [];
let particles = [];
let stars = [];

class Bird {
    constructor() {
        this.radius = 16;
        this.x = cw * 0.25;
        this.y = ch / 2;
        this.vy = 0;
        this.color = '#00f2fe';
    }

    jump() {
        this.vy = jumpStrength;
        // Effect
        for(let i=0; i<5; i++) {
            particles.push(new Particle(this.x, this.y, this.color, 'jump'));
        }
    }

    update() {
        this.vy += gravity;
        this.y += this.vy;

        // collision with floor or ceiling
        if (this.y + this.radius >= ch) {
            this.y = ch - this.radius;
            gameOver();
        }
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.vy = 0;
        }
        
        // trail
        if (frame % 3 === 0) {
            particles.push(new Particle(this.x - this.radius + 5, this.y, this.color, 'trail'));
        }
    }

    draw() {
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        
        // Outer glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.closePath();
        
        // Core
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        ctx.shadowBlur = 0;
    }
}

class Pipe {
    constructor() {
        this.x = cw;
        this.width = pipeWidth;
        this.gap = pipeGap;
        let minHeight = 50;
        let maxHeight = ch - this.gap - minHeight;
        this.topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
        this.bottomY = this.topHeight + this.gap;
        this.passed = false;
        this.color = '#ff0844'; 
    }

    update() {
        this.x -= pipeSpeed;
    }

    draw() {
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        // Top Pipe
        let gradTop = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
        gradTop.addColorStop(0, '#ff0844');
        gradTop.addColorStop(1, '#ffb199');
        ctx.fillStyle = gradTop;
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x, this.topHeight - 5, this.width, 5); 

        // Bottom Pipe
        let gradBottom = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
        gradBottom.addColorStop(0, '#ff0844');
        gradBottom.addColorStop(1, '#ffb199');
        ctx.fillStyle = gradBottom;
        ctx.fillRect(this.x, this.bottomY, this.width, ch - this.bottomY);
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x, this.bottomY, this.width, 5); 
        
        ctx.shadowBlur = 0;
    }
}

class Particle {
    constructor(x, y, color, type) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type; 
        this.alpha = 1;
        
        if (type === 'jump') {
            this.vx = (Math.random() - 0.5) * 3;
            this.vy = (Math.random() * 2) + 1;
            this.life = 0.05;
            this.size = Math.random() * 3 + 1;
        } else if (type === 'trail') {
            this.vx = -pipeSpeed * 0.5;
            this.vy = (Math.random() - 0.5) * 1;
            this.life = 0.03;
            this.size = Math.random() * 3 + 1;
        } else if (type === 'explosion') {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 8 + 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.life = 0.02;
            this.size = Math.random() * 4 + 2;
        } else if (type === 'score') {
            this.vx = (Math.random() - 0.5) * 5;
            this.vy = (Math.random() - 0.5) * 5;
            this.life = 0.04;
            this.size = Math.random() * 3 + 2;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.life;
        if(this.type === 'jump' || this.type === 'trail') {
            this.size *= 0.95;
        }
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Star {
    constructor() {
        this.x = Math.random() * cw;
        this.y = Math.random() * ch;
        this.size = Math.random() * 1.5;
        this.speed = Math.random() * 0.8 + 0.1;
        this.alpha = Math.random();
    }
    update() {
        this.x -= this.speed * (gameState === 'playing' ? 1 : 0.3);
        if (this.x < 0) {
            this.x = cw;
            this.y = Math.random() * ch;
        }
    }
    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function init() {
    bestScoreEl.textContent = bestScore;
    resize();
    window.addEventListener('resize', resize);
    
    // stars
    for(let i=0; i<60; i++) {
        stars.push(new Star());
    }
    
    bindEvents();
    loop();
}

function resize() {
    cw = gameContainer.clientWidth;
    ch = gameContainer.clientHeight;
    canvas.width = cw;
    canvas.height = ch;
    
    let scaleY = ch / 800;
    let scaleX = cw / 480;
    let scale = Math.min(scaleX, scaleY);
    scale = Math.max(0.6, scale);
    
    gravity = gravityBase * scale;
    jumpStrength = jumpStrengthBase * scale;
    pipeSpeed = pipeSpeedBase * (cw / 400); 
    pipeGap = pipeGapBase * scale;
}

function bindEvents() {
    const jumpAction = (e) => {
        if (e.type === 'keydown' && e.code !== 'Space') return;
        if (e.type === 'keydown') e.preventDefault();
        
        if (gameState === 'start') {
            startGame();
        } else if (gameState === 'playing') {
            bird.jump();
        } else if (gameState === 'gameover' && frame > 40) {
            // delay to prevent restart
            resetGame();
        }
    };

    window.addEventListener('keydown', jumpAction);
    gameContainer.addEventListener('mousedown', jumpAction);
    gameContainer.addEventListener('touchstart', jumpAction, {passive: false});
    
    startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startGame();
    });
    
    restartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetGame();
    });
}

function startGame() {
    gameState = 'playing';
    startScreen.classList.add('hidden');
    bird = new Bird();
    pipes = [];
    particles = [];
    score = 0;
    frame = 0;
    updateScoreDisplay();
    bird.jump();
}

function resetGame() {
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    gameState = 'start';
    bird = null;
    pipes = [];
    particles = [];
    scoreDisplay.textContent = '0';
    scoreDisplay.style.opacity = '1';
    scoreDisplay.style.transform = 'translateX(-50%) scale(1)';
}

function gameOver() {
    gameState = 'gameover';
    
    for(let i=0; i<40; i++) {
        particles.push(new Particle(bird.x, bird.y, bird.color, 'explosion'));
    }
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('neonDashBestScore', bestScore);
    }
    
    finalScoreEl.textContent = score;
    bestScoreEl.textContent = bestScore;
    
    setTimeout(() => {
        gameOverScreen.classList.remove('hidden');
        scoreDisplay.style.opacity = '0';
        frame = 0; // reset to track delay
    }, 400);
}

function updateScoreDisplay() {
    scoreDisplay.textContent = score;
    scoreDisplay.style.transform = 'translateX(-50%) scale(1.3)';
    setTimeout(() => {
        if(gameState === 'playing') {
            scoreDisplay.style.transform = 'translateX(-50%) scale(1)';
        }
    }, 150);
}

function loop() {
    requestAnimationFrame(loop);
    
    ctx.clearRect(0, 0, cw, ch);
    
    // stars
    stars.forEach(star => {
        star.update();
        star.draw();
    });

    if (gameState === 'playing') {
        frame++;
        
        let spawnFrames = Math.floor(200 / pipeSpeed);
        if (frame % spawnFrames === 0) {
            pipes.push(new Pipe());
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            let p = pipes[i];
            p.update();
            p.draw();

            // Collision
            let bx = bird.x;
            let by = bird.y;
            let br = bird.radius * 0.7; // slightly smaller hitbox

            if (bx + br > p.x && bx - br < p.x + p.width) {
                if (by - br < p.topHeight || by + br > p.bottomY) {
                    gameOver();
                }
            }

            // Score increase
            if (!p.passed && p.x + p.width < bird.x - bird.radius) {
                p.passed = true;
                score++;
                updateScoreDisplay();
                for(let j=0; j<15; j++) {
                     particles.push(new Particle(bird.x, bird.y, '#fff', 'score'));
                }
            }

            if (p.x + p.width < 0) {
                pipes.splice(i, 1);
            }
        }
        
        bird.update();
    }
    
    if (bird && gameState !== 'gameover') {
        bird.draw();
    } else if (gameState === 'gameover') {
        frame++;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let pt = particles[i];
        pt.update();
        pt.draw();
        if (pt.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
    
    // idle animation start screen
    if (gameState === 'start' && !bird) {
        let hy = ch / 2 + Math.sin(Date.now() / 300) * 15 - 50;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00f2fe';
        ctx.beginPath();
        ctx.arc(cw * 0.25, hy, 16, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cw * 0.25, hy, 16 * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#00f2fe';
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

window.onload = init;
