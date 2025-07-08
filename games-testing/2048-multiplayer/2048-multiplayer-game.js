import { BaseGame } from '@tyler-arcade/multiplayer';

export class TwentyFortyEightGame extends BaseGame {
    constructor() {
        super();
        this.name = '2048-multiplayer';
        this.description = 'Race to reach 2048 in this multiplayer puzzle game!';
        this.maxPlayers = 2;
        
        // Override to use Map for players (from CLAUDE.md pattern)
        this.players = new Map();
        this.spectators = []; // Required for BaseGame
        this.grids = new Map();
        this.scores = new Map();
    }

    handlePlayerJoin(socketId, playerName, roomId, socket) {
        if (roomId !== '2048-multiplayer') {
            return {
                success: false,
                reason: 'Wrong room - this is 2048 Multiplayer'
            };
        }

        if (this.players.size >= this.maxPlayers) {
            return {
                success: false,
                reason: 'Game is full (max 2 players)'
            };
        }

        const player = {
            id: socketId,
            name: playerName || `Player${Math.floor(Math.random() * 1000)}`
        };

        this.players.set(socketId, player);
        this.grids.set(socketId, this.createEmptyGrid());
        this.scores.set(socketId, 0);

        // Add initial tiles
        let grid = this.grids.get(socketId);
        grid = this.addRandomTile(grid);
        grid = this.addRandomTile(grid);
        this.grids.set(socketId, grid);

        console.log(`${player.name} joined 2048 Multiplayer`);

        this.broadcast('gameState', this.getGameStateForClient());

        return {
            success: true,
            playerData: { playerId: socketId, playerName: player.name }
        };
    }

    handlePlayerLeave(socketId, player, socket) {
        this.players.delete(socketId);
        this.grids.delete(socketId);
        this.scores.delete(socketId);
        
        this.broadcast('gameState', this.getGameStateForClient());
    }

    handlePlayerInput(socketId, input, socket) {
        const player = this.players.get(socketId);
        if (!player) return;

        const currentGrid = this.grids.get(socketId);
        if (!currentGrid) return;

        let direction = null;
        if (input.up) direction = 'up';
        else if (input.down) direction = 'down';
        else if (input.left) direction = 'left';
        else if (input.right) direction = 'right';

        if (direction) {
            const result = this.moveGrid(currentGrid, direction);
            
            if (result.moved) {
                this.grids.set(socketId, this.addRandomTile(result.grid));
                const currentScore = this.scores.get(socketId) || 0;
                this.scores.set(socketId, currentScore + result.scoreGained);
                
                this.broadcast('gameState', this.getGameStateForClient());
            }
        }
    }

    handleCustomEvent(socketId, eventName, args, socket) {
        console.log(`🎮 2048 Game: Handling custom event '${eventName}' from ${socketId}`);
        
        switch (eventName) {
            case 'playerMove':
                if (args && args.direction) {
                    const currentGrid = this.grids.get(socketId);
                    if (!currentGrid) return;
                    
                    const result = this.moveGrid(currentGrid, args.direction);
                    
                    if (result.moved) {
                        this.grids.set(socketId, this.addRandomTile(result.grid));
                        const currentScore = this.scores.get(socketId) || 0;
                        this.scores.set(socketId, currentScore + result.scoreGained);
                        
                        this.broadcast('gameState', this.getGameStateForClient());
                    }
                }
                break;
        }
    }

    createEmptyGrid() {
        return new Array(16).fill(0);
    }

    addRandomTile(grid) {
        const empty = [];
        grid.forEach((cell, index) => {
            if (cell === 0) empty.push(index);
        });
        
        if (empty.length > 0) {
            const randomIndex = empty[Math.floor(Math.random() * empty.length)];
            grid[randomIndex] = Math.random() < 0.9 ? 2 : 4;
        }
        return grid;
    }

    moveGrid(grid, direction) {
        const newGrid = [...grid];
        let moved = false;
        let scoreGained = 0;
        
        if (direction === 'left') {
            for (let row = 0; row < 4; row++) {
                const rowData = [];
                for (let col = 0; col < 4; col++) {
                    const value = newGrid[row * 4 + col];
                    if (value !== 0) rowData.push(value);
                }
                
                // Merge tiles
                for (let i = 0; i < rowData.length - 1; i++) {
                    if (rowData[i] === rowData[i + 1]) {
                        rowData[i] *= 2;
                        scoreGained += rowData[i];
                        rowData.splice(i + 1, 1);
                    }
                }
                
                // Fill row
                while (rowData.length < 4) rowData.push(0);
                
                for (let col = 0; col < 4; col++) {
                    const newValue = rowData[col];
                    const oldValue = grid[row * 4 + col];
                    newGrid[row * 4 + col] = newValue;
                    if (newValue !== oldValue) moved = true;
                }
            }
        } else if (direction === 'right') {
            for (let row = 0; row < 4; row++) {
                const rowData = [];
                for (let col = 3; col >= 0; col--) {
                    const value = newGrid[row * 4 + col];
                    if (value !== 0) rowData.push(value);
                }
                
                // Merge tiles
                for (let i = 0; i < rowData.length - 1; i++) {
                    if (rowData[i] === rowData[i + 1]) {
                        rowData[i] *= 2;
                        scoreGained += rowData[i];
                        rowData.splice(i + 1, 1);
                    }
                }
                
                // Fill row
                while (rowData.length < 4) rowData.push(0);
                
                for (let col = 0; col < 4; col++) {
                    const newValue = rowData[col];
                    const oldValue = grid[row * 4 + (3 - col)];
                    newGrid[row * 4 + (3 - col)] = newValue;
                    if (newValue !== oldValue) moved = true;
                }
            }
        } else if (direction === 'up') {
            for (let col = 0; col < 4; col++) {
                const colData = [];
                for (let row = 0; row < 4; row++) {
                    const value = newGrid[row * 4 + col];
                    if (value !== 0) colData.push(value);
                }
                
                // Merge tiles
                for (let i = 0; i < colData.length - 1; i++) {
                    if (colData[i] === colData[i + 1]) {
                        colData[i] *= 2;
                        scoreGained += colData[i];
                        colData.splice(i + 1, 1);
                    }
                }
                
                // Fill column
                while (colData.length < 4) colData.push(0);
                
                for (let row = 0; row < 4; row++) {
                    const newValue = colData[row];
                    const oldValue = grid[row * 4 + col];
                    newGrid[row * 4 + col] = newValue;
                    if (newValue !== oldValue) moved = true;
                }
            }
        } else if (direction === 'down') {
            for (let col = 0; col < 4; col++) {
                const colData = [];
                for (let row = 3; row >= 0; row--) {
                    const value = newGrid[row * 4 + col];
                    if (value !== 0) colData.push(value);
                }
                
                // Merge tiles
                for (let i = 0; i < colData.length - 1; i++) {
                    if (colData[i] === colData[i + 1]) {
                        colData[i] *= 2;
                        scoreGained += colData[i];
                        colData.splice(i + 1, 1);
                    }
                }
                
                // Fill column
                while (colData.length < 4) colData.push(0);
                
                for (let row = 0; row < 4; row++) {
                    const newValue = colData[row];
                    const oldValue = grid[(3 - row) * 4 + col];
                    newGrid[(3 - row) * 4 + col] = newValue;
                    if (newValue !== oldValue) moved = true;
                }
            }
        }
        
        return { grid: newGrid, moved, scoreGained };
    }

    getGameStateForClient() {
        const players = Array.from(this.players.values());
        const grids = [];
        const scores = [];
        
        players.forEach(player => {
            grids.push(this.grids.get(player.id) || []);
            scores.push(this.scores.get(player.id) || 0);
        });
        
        return {
            players,
            grids,
            scores
        };
    }
}