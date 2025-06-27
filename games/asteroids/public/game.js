
let socket = null;
let playerName = '';
let playerId = null;
let gameState = null;
let myPlayer = null;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Input state
let inputState = {
    left: false,
    right: false,
    up: false,
    space: false
};

function connectToServer() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        playerId = socket.id;
        // Auto-join game using shared player name system
        playerName = TylerArcadePlayer.autoJoinGame(socket, 'asteroids');
    });
    
    socket.on('playerAssigned', (data) => {
        playerId = data.playerId;
        playerName = data.playerName;
        console.log(`Assigned name: ${playerName}`);
    });

    socket.on('joinFailed', (data) => {
        alert(`Failed to join: ${data.reason}`);
    });

    socket.on('gameState', (state) => {
        gameState = state;
        
        // Find my player
        if (playerName && state.players && Array.isArray(state.players)) {
            myPlayer = state.players.find(p => p.name === playerName);
        }
        
        updateUI();
    });

    socket.on('playerLeft', (data) => {
        console.log('Player left');
    });
}


// Input handling
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'ArrowLeft':
        case 'KeyA':
            inputState.left = true;
            e.preventDefault();
            break;
        case 'ArrowRight':
        case 'KeyD':
            inputState.right = true;
            e.preventDefault();
            break;
        case 'ArrowUp':
        case 'KeyW':
            inputState.up = true;
            e.preventDefault();
            break;
        case 'Space':
            inputState.space = true;
            e.preventDefault();
            break;
        case 'Digit0':
            e.preventDefault();
            if (socket) {
                socket.emit('customEvent', 'resetGame', []);
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'ArrowLeft':
        case 'KeyA':
            inputState.left = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            inputState.right = false;
            break;
        case 'ArrowUp':
        case 'KeyW':
            inputState.up = false;
            break;
        case 'Space':
            inputState.space = false;
            break;
    }
});

// Send input to server
setInterval(() => {
    if (socket && playerName && myPlayer && myPlayer.alive) {
        socket.emit('playerInput', inputState);
    }
}, 1000 / 60); // 60 FPS input

function render() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!gameState) {
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Connecting...', canvas.width / 2, canvas.height / 2);
        return;
    }

    const { players, asteroids, bullets } = gameState;

    // Draw asteroids
    if (asteroids && Array.isArray(asteroids)) {
        asteroids.forEach(asteroid => {
            drawAsteroid(asteroid);
        });
    }

    // Draw bullets
    if (bullets && Array.isArray(bullets)) {
        bullets.forEach(bullet => {
            ctx.fillStyle = '#ff0';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 2, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    // Draw players
    if (players && Array.isArray(players)) {
        players.forEach(player => {
            if (player.alive) {
                drawPlayer(player);
            } else {
                // Draw explosion or death animation
                ctx.fillStyle = '#f00';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('💥', player.x, player.y);
            }
        });
    }

    // Draw UI
    drawUI();
}

function drawPlayer(player) {
    ctx.save();
    
    // Translate to player position
    ctx.translate(player.x, player.y);
    ctx.rotate(player.rotation);
    
    // Draw ship
    ctx.strokeStyle = player.socketId === playerId ? '#0ff' : '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-10, -8);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.stroke();
    
    // Draw thrust
    if (player.thrusting) {
        ctx.strokeStyle = '#ff0';
        ctx.beginPath();
        ctx.moveTo(-5, -3);
        ctx.lineTo(-15, 0);
        ctx.lineTo(-5, 3);
        ctx.stroke();
    }
    
    ctx.restore();
    
    // Draw player name
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(player.name, player.x, player.y - 25);
    
    // Draw score
    ctx.font = '10px Arial';
    ctx.fillText(`Score: ${player.score}`, player.x, player.y + 35);
    
    // Draw lives
    ctx.fillText(`Lives: ${player.lives}`, player.x, player.y + 50);
}

function drawAsteroid(asteroid) {
    ctx.save();
    
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.rotation);
    
    // Draw irregular asteroid shape
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const points = 8;
    for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const radiusVariation = 0.8 + Math.sin(angle * 3) * 0.3;
        const x = Math.cos(angle) * asteroid.radius * radiusVariation;
        const y = Math.sin(angle) * asteroid.radius * radiusVariation;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}

function drawUI() {
    // Draw game status
    let statusText = 'Asteroids Game';
    if (gameState && Array.isArray(gameState.players)) {
        if (gameState.players.length === 0) {
            statusText = 'Waiting for players...';
        } else if (!gameState.gameStarted) {
            statusText = 'Game starting...';
        }
    }
    
    // Draw top scores
    if (gameState && Array.isArray(gameState.players)) {
        const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
        sortedPlayers.forEach((player, index) => {
        ctx.fillStyle = player.socketId === playerId ? '#0ff' : '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
            ctx.fillText(`${player.name}: ${player.score}`, 20, 30 + index * 20);
        });
    }
    
    // Draw asteroid count
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    const asteroidCount = (gameState && Array.isArray(gameState.asteroids)) ? gameState.asteroids.length : 0;
    ctx.fillText(`Asteroids: ${asteroidCount}`, 20, canvas.height - 20);
}

function updateUI() {
    const gameInfo = document.getElementById('gameInfo');
    if (!gameState) return;

    const playerCount = Array.isArray(gameState.players) ? gameState.players.length : 0;
    
    if (playerCount === 0) {
        gameInfo.textContent = 'Waiting for players...';
    } else {
        gameInfo.textContent = `${playerCount} players in game`;
    }
}

// Animation loop
function gameLoop() {
    render();
    requestAnimationFrame(gameLoop);
}

// Initialize connection and start game loop
connectToServer();
gameLoop();