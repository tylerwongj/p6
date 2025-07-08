// Use globally available io from socket.io script
let socket = null;
let gameState = null;
let playerId = null;
let playerName = null;

function connectToServer() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        
        // Auto-join game using TylerArcadePlayer system
        try {
            if (typeof TylerArcadePlayer !== 'undefined' && TylerArcadePlayer.autoJoinGame) {
                playerName = TylerArcadePlayer.autoJoinGame(socket, '2048-multiplayer');
            } else {
                console.error('TylerArcadePlayer not available, joining manually');
                playerName = 'Player' + Math.floor(Math.random() * 1000);
                socket.emit('joinGame', { name: playerName, roomId: '2048-multiplayer' });
            }
        } catch (error) {
            console.error('Error joining game:', error);
            playerName = 'Player' + Math.floor(Math.random() * 1000);
            socket.emit('joinGame', { name: playerName, roomId: '2048-multiplayer' });
        }
    });
    
    socket.on('playerAssigned', (data) => {
        playerId = data.playerData.playerId;
        playerName = data.playerData.playerName;
        updateDisplay();
    });

    socket.on('joinFailed', (data) => {
        alert(`Failed to join: ${data.reason}`);
    });

    socket.on('gameState', (state) => {
        gameState = state;
        updateDisplay();
    });
}

function joinGame() {
    // This function kept for potential manual joins, but auto-join is primary
    if (!socket) {
        connectToServer();
    }
}

// Handle keyboard input directly
document.addEventListener('keydown', (event) => {
    if (!socket) return;
    
    const keyMap = { 
        'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
        'w': 'up', 'W': 'up', 's': 'down', 'S': 'down', 
        'a': 'left', 'A': 'left', 'd': 'right', 'D': 'right' 
    };
    
    if (keyMap[event.key]) {
        event.preventDefault();
        socket.emit('customEvent', 'playerMove', { direction: keyMap[event.key] });
    }
});

function updateDisplay() {
    if (!gameState) return;
    
    if (gameState.grids) {
        renderGrid('grid1', gameState.grids[0] || []);
        renderGrid('grid2', gameState.grids[1] || []);
    }
    
    if (gameState.scores) {
        document.getElementById('score1').textContent = `Score: ${gameState.scores[0] || 0}`;
        document.getElementById('score2').textContent = `Score: ${gameState.scores[1] || 0}`;
    }
}

function renderGrid(gridId, grid) {
    const gridElement = document.getElementById(gridId);
    gridElement.innerHTML = '';
    
    for (let i = 0; i < 16; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        const value = grid[i] || 0;
        if (value > 0) {
            tile.textContent = value;
            tile.classList.add(`tile-${value}`);
        }
        gridElement.appendChild(tile);
    }
}

// Auto-start the game connection when page loads
connectToServer();

window.joinGame = joinGame;