// Use the globally available io from socket.io script
const socket = io();

const PIECES = {
    I: [[1,1,1,1]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1]],
    S: [[0,1,1],[1,1,0]],
    Z: [[1,1,0],[0,1,1]],
    J: [[1,0,0],[1,1,1]],
    L: [[0,0,1],[1,1,1]]
};

const COLORS = {
    I: '#00ffff',
    O: '#ffff00',
    T: '#800080',
    S: '#00ff00',
    Z: '#ff0000',
    J: '#0000ff',
    L: '#ffa500'
};

class TetrisGame {
    constructor() {
        this.playerId = null;
        this.playerName = null;
        this.gameField = Array(20).fill().map(() => Array(10).fill(0));
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.dropTime = 0;
        this.dropInterval = 1000;
        this.lastTime = 0;
        
        this.setupEventListeners();
        this.setupSocketListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver) return;
            
            switch(e.code) {
                // Arrow keys
                case 'ArrowLeft':
                case 'KeyA':     // WASD: A = left
                case 'KeyJ':     // JKLI: J = left
                    this.movePiece(-1, 0);
                    break;
                case 'ArrowRight':
                case 'KeyD':     // WASD: D = right  
                case 'KeyL':     // JKLI: L = right
                    this.movePiece(1, 0);
                    break;
                case 'ArrowDown':
                case 'KeyS':     // WASD: S = down
                case 'KeyK':     // JKLI: K = down
                    this.movePiece(0, 1);
                    break;
                    
                // Rotation controls
                case 'ArrowUp':
                case 'KeyW':     // WASD: W = rotate clockwise
                case 'KeyE':     // E = rotate clockwise
                case 'KeyI':     // JKLI: I = rotate clockwise  
                case 'KeyO':     // O = rotate clockwise
                    this.rotatePiece();
                    break;
                case 'KeyQ':     // Q = rotate counterclockwise
                case 'KeyU':     // U = rotate counterclockwise
                    this.rotatePieceCounterclockwise();
                    break;
                    
                // Drop and restart
                case 'Space':
                    this.dropPiece();
                    break;
                case 'KeyR':
                    if (this.gameOver) {
                        socket.emit('restart-game');
                    }
                    break;
            }
        });
    }

    setupSocketListeners() {
        socket.on('connect', () => {
            console.log('✅ Connected to Tetris server!');
        });
        
        socket.on('playerAssigned', (data) => {
            console.log('✅ Player assigned:', data);
            this.playerId = data.playerId;
            this.playerName = data.playerName;
            
            console.log('Hiding join overlay...');
            document.getElementById('joinOverlay').style.display = 'none';
            
            console.log('Showing game container...');
            document.getElementById('gameContainer').style.display = 'flex';
            
            console.log('Waiting for multiplayer game state...');
            // Multiplayer boards will be created when gameState is received
            
            console.log('Starting game...');
            this.spawnPiece();
            this.gameLoop();
        });
        
        socket.on('joinFailed', (data) => {
            console.log('❌ Join failed:', data);
            alert(`Failed to join: ${data.reason}`);
        });
        
        socket.on('gameState', (state) => {
            // Handle multiplayer game state updates
            console.log('📊 Game state received:', state);
            if (state.players) {
                this.updatePlayersDisplay(state.players);
            }
        });

        socket.on('game-state', (gameState) => {
            this.updatePlayersDisplay(gameState.players);
        });

        socket.on('receive-garbage', (data) => {
            this.addGarbageLines(data.lines);
        });

        socket.on('game-ended', (data) => {
            alert(`Game Over! Winner: ${data.winner}`);
        });

        socket.on('game-restarted', (gameState) => {
            this.resetGame();
            this.spawnPiece();
        });
    }

    spawnPiece() {
        const pieceTypes = Object.keys(PIECES);
        const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
        
        this.currentPiece = {
            type: randomType,
            shape: PIECES[randomType],
            x: Math.floor((10 - PIECES[randomType][0].length) / 2),
            y: 0
        };

        if (this.isCollision(this.currentPiece, 0, 0)) {
            this.gameOver = true;
            socket.emit('game-over');
        }
    }

    movePiece(dx, dy) {
        if (!this.currentPiece || this.gameOver) return;
        
        if (!this.isCollision(this.currentPiece, dx, dy)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            this.updateDisplay();
            this.emitMove();
        } else if (dy > 0) {
            this.placePiece();
        }
    }

    rotatePiece() {
        if (!this.currentPiece || this.gameOver) return;
        
        // Clockwise rotation: transpose then reverse each row
        const rotated = this.currentPiece.shape[0].map((_, i) =>
            this.currentPiece.shape.map(row => row[i]).reverse()
        );
        
        const testPiece = {
            ...this.currentPiece,
            shape: rotated
        };
        
        if (!this.isCollision(testPiece, 0, 0)) {
            this.currentPiece.shape = rotated;
            this.updateDisplay();
            this.emitMove();
        }
    }

    rotatePieceCounterclockwise() {
        if (!this.currentPiece || this.gameOver) return;
        
        // Counterclockwise rotation: reverse each row then transpose
        const rotated = this.currentPiece.shape[0].map((_, i) =>
            this.currentPiece.shape.map(row => row[row.length - 1 - i])
        );
        
        const testPiece = {
            ...this.currentPiece,
            shape: rotated
        };
        
        if (!this.isCollision(testPiece, 0, 0)) {
            this.currentPiece.shape = rotated;
            this.updateDisplay();
            this.emitMove();
        }
    }

    dropPiece() {
        if (!this.currentPiece || this.gameOver) return;
        
        while (!this.isCollision(this.currentPiece, 0, 1)) {
            this.currentPiece.y++;
        }
        this.placePiece();
    }

    isCollision(piece, dx, dy) {
        const newX = piece.x + dx;
        const newY = piece.y + dy;
        
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const boardX = newX + x;
                    const boardY = newY + y;
                    
                    if (boardX < 0 || boardX >= 10 || boardY >= 20) {
                        return true;
                    }
                    
                    if (boardY >= 0 && this.gameField[boardY][boardX]) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    placePiece() {
        if (!this.currentPiece) return;
        
        // Place piece on board
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x]) {
                    const boardY = this.currentPiece.y + y;
                    const boardX = this.currentPiece.x + x;
                    if (boardY >= 0) {
                        this.gameField[boardY][boardX] = this.currentPiece.type;
                    }
                }
            }
        }
        
        // Check for completed lines
        const completedLines = this.clearLines();
        if (completedLines > 0) {
            this.lines += completedLines;
            this.score += completedLines * 100 * this.level;
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(50, 1000 - (this.level - 1) * 50);
            
            socket.emit('line-cleared', {
                lines: completedLines,
                score: this.score
            });
        }
        
        this.spawnPiece();
        this.updateDisplay();
        this.emitMove();
    }

    clearLines() {
        let linesCleared = 0;
        
        for (let y = this.gameField.length - 1; y >= 0; y--) {
            if (this.gameField[y].every(cell => cell !== 0)) {
                this.gameField.splice(y, 1);
                this.gameField.unshift(Array(10).fill(0));
                linesCleared++;
                y++; // Check the same line again
            }
        }
        
        return linesCleared;
    }

    addGarbageLines(count) {
        for (let i = 0; i < count; i++) {
            // Remove top line
            this.gameField.shift();
            // Add garbage line at bottom with random hole
            const garbageLine = Array(10).fill('garbage');
            const holePos = Math.floor(Math.random() * 10);
            garbageLine[holePos] = 0;
            this.gameField.push(garbageLine);
        }
        this.updateDisplay();
    }

    emitMove() {
        socket.emit('move-piece', {
            piece: this.currentPiece,
            field: this.gameField
        });
    }

    createGameBoard() {
        console.log('Creating game board HTML...');
        
        // Create the player area HTML
        const container = document.getElementById('playersContainer');
        container.innerHTML = `
            <div class="player-area">
                <div class="player-info">
                    <div class="player-name">${this.playerName}</div>
                    <div class="stats">
                        <span>Score: <span id="score">0</span></span>
                        <span>Lines: <span id="lines">0</span></span>
                    </div>
                    <div class="stats">
                        <span>Level: <span id="level">1</span></span>
                    </div>
                </div>
                <div class="game-board">
                    <div class="game-grid" id="gameGrid">
                        ${Array(200).fill().map(() => '<div class="cell"></div>').join('')}
                    </div>
                </div>
            </div>
        `;
        
        console.log('Game board HTML created');
    }

    updateDisplay() {
        // Get the game grid we just created
        const gameGrid = document.getElementById('gameGrid');
        if (!gameGrid) {
            console.log('❌ Game grid not found!');
            return;
        }
        
        // Clear board
        const cells = gameGrid.querySelectorAll('.cell');
        if (cells.length === 0) {
            console.log('❌ No cells found in grid!');
            return;
        }
        
        console.log(`Updating display - found ${cells.length} cells`);
        
        cells.forEach(cell => {
            cell.className = 'cell';
            cell.style.backgroundColor = '';
        });
        
        // Draw placed pieces
        for (let y = 0; y < this.gameField.length; y++) {
            for (let x = 0; x < this.gameField[y].length; x++) {
                if (this.gameField[y][x]) {
                    const cellIndex = y * 10 + x;
                    const cell = cells[cellIndex];
                    if (cell) {
                        cell.classList.add('filled');
                        const pieceType = this.gameField[y][x];
                        if (pieceType === 'garbage') {
                            cell.style.backgroundColor = '#666';
                        } else {
                            cell.style.backgroundColor = COLORS[pieceType] || '#00d4ff';
                        }
                    }
                }
            }
        }
        
        // Draw current piece
        if (this.currentPiece && !this.gameOver) {
            for (let y = 0; y < this.currentPiece.shape.length; y++) {
                for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                    if (this.currentPiece.shape[y][x]) {
                        const boardY = this.currentPiece.y + y;
                        const boardX = this.currentPiece.x + x;
                        if (boardY >= 0 && boardY < 20 && boardX >= 0 && boardX < 10) {
                            const cellIndex = boardY * 10 + boardX;
                            const cell = cells[cellIndex];
                            if (cell) {
                                cell.classList.add('filled');
                                cell.style.backgroundColor = COLORS[this.currentPiece.type];
                            }
                        }
                    }
                }
            }
        }
    }

    updatePlayersDisplay(players) {
        const container = document.getElementById('playersContainer');
        container.innerHTML = '';
        
        console.log('Updating display for players:', players);
        
        players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-area';
            playerDiv.setAttribute('data-player', player.id);
            
            // Highlight current player
            const isMe = player.id === socket.id;
            const playerClass = isMe ? 'current-player' : '';
            
            playerDiv.innerHTML = `
                <div class="player-info ${playerClass}">
                    <div class="player-name">${player.name}${isMe ? ' (You)' : ''}</div>
                    <div class="stats">
                        <span>Score: ${player.score || 0}</span>
                        <span>Lines: ${player.lines || 0}</span>
                    </div>
                    <div class="stats">
                        <span>Level: ${player.level || 1}</span>
                    </div>
                </div>
                <div class="game-board">
                    <div class="game-grid" id="grid-${player.id}">
                        ${Array(200).fill().map(() => '<div class="cell"></div>').join('')}
                    </div>
                    ${player.gameOver ? '<div class="game-over">GAME OVER</div>' : ''}
                </div>
            `;
            
            container.appendChild(playerDiv);
        });
        
        console.log(`Created ${players.length} player boards`);
    }

    gameLoop(time = 0) {
        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        
        if (!this.gameOver) {
            this.dropTime += deltaTime;
            if (this.dropTime > this.dropInterval) {
                this.movePiece(0, 1);
                this.dropTime = 0;
            }
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    resetGame() {
        this.gameField = Array(20).fill().map(() => Array(10).fill(0));
        this.currentPiece = null;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.dropTime = 0;
        this.dropInterval = 1000;
    }
}

function joinGame() {
    console.log('🎮 joinGame() function called');
    
    let playerName = document.getElementById('playerName').value.trim();
    
    // Generate random name if empty
    if (!playerName) {
        const names = ['TetrisKing', 'BlockMaster', 'LineCleaner', 'TetrisPro', 'ShapeShifter', 'BlockBuster'];
        playerName = names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 100);
    }
    
    console.log('🎮 Joining Tetris as:', playerName);
    console.log('🎮 Socket connected:', socket.connected);
    console.log('🎮 Socket ID:', socket.id);
    
    socket.emit('joinGame', { name: playerName, roomId: 'tetris' });
    
    // Add a timeout to detect if we never get a response
    setTimeout(() => {
        if (!document.getElementById('gameContainer').style.display.includes('flex')) {
            console.log('⚠️ Join timeout - no response after 5 seconds');
        }
    }, 5000);
}

// Initialize game
const game = new TetrisGame();

// Make joinGame globally available
window.joinGame = joinGame;