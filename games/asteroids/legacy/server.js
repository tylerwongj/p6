import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

// Serve static files BEFORE routes
app.use('/asteroids', express.static(path.join(__dirname, 'public')));

// Routes come after static file serving
app.get('/asteroids', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Game state
class AsteroidsGameState {
    constructor() {
        this.players = new Map();
        this.asteroids = [];
        this.bullets = [];
        this.gameWidth = 800;
        this.gameHeight = 600;
        this.gameStarted = false;
        this.spawnAsteroids();
    }

    spawnAsteroids() {
        this.asteroids = [];
        for (let i = 0; i < 5; i++) {
            this.asteroids.push({
                id: i,
                x: Math.random() * this.gameWidth,
                y: Math.random() * this.gameHeight,
                velocityX: (Math.random() - 0.5) * 100,
                velocityY: (Math.random() - 0.5) * 100,
                radius: 40 + Math.random() * 20,
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 4
            });
        }
    }

    update(deltaTime) {
        if (!this.gameStarted && this.players.size > 0) {
            this.gameStarted = true;
        }

        // Update players
        this.players.forEach(player => {
            if (player.alive) {
                // Update position
                player.x += player.velocityX * deltaTime;
                player.y += player.velocityY * deltaTime;
                
                // Update rotation
                player.rotation += player.rotationSpeed * deltaTime;
                
                // Wrap around screen
                if (player.x < 0) player.x = this.gameWidth;
                if (player.x > this.gameWidth) player.x = 0;
                if (player.y < 0) player.y = this.gameHeight;
                if (player.y > this.gameHeight) player.y = 0;
                
                // Apply friction
                player.velocityX *= 0.98;
                player.velocityY *= 0.98;
            }
        });

        // Update asteroids
        this.asteroids.forEach(asteroid => {
            asteroid.x += asteroid.velocityX * deltaTime;
            asteroid.y += asteroid.velocityY * deltaTime;
            asteroid.rotation += asteroid.rotationSpeed * deltaTime;
            
            // Wrap around screen
            if (asteroid.x < -asteroid.radius) asteroid.x = this.gameWidth + asteroid.radius;
            if (asteroid.x > this.gameWidth + asteroid.radius) asteroid.x = -asteroid.radius;
            if (asteroid.y < -asteroid.radius) asteroid.y = this.gameHeight + asteroid.radius;
            if (asteroid.y > this.gameHeight + asteroid.radius) asteroid.y = -asteroid.radius;
        });

        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.x += bullet.velocityX * deltaTime;
            bullet.y += bullet.velocityY * deltaTime;
            bullet.life -= deltaTime;
            
            // Remove bullets that are off screen or expired
            return bullet.life > 0 && 
                   bullet.x >= 0 && bullet.x <= this.gameWidth &&
                   bullet.y >= 0 && bullet.y <= this.gameHeight;
        });

        // Check bullet-asteroid collisions
        for (let bulletIndex = this.bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
            const bullet = this.bullets[bulletIndex];
            for (let asteroidIndex = this.asteroids.length - 1; asteroidIndex >= 0; asteroidIndex--) {
                const asteroid = this.asteroids[asteroidIndex];
                const distance = Math.sqrt(
                    Math.pow(bullet.x - asteroid.x, 2) + 
                    Math.pow(bullet.y - asteroid.y, 2)
                );
                
                if (distance < asteroid.radius) {
                    // Remove bullet and asteroid
                    this.bullets.splice(bulletIndex, 1);
                    this.asteroids.splice(asteroidIndex, 1);
                    
                    // Increase player score
                    const player = this.players.get(bullet.playerId);
                    if (player) {
                        player.score += 10;
                    }
                    
                    // Split asteroid if large enough
                    if (asteroid.radius > 20) {
                        for (let i = 0; i < 2; i++) {
                            this.asteroids.push({
                                id: Date.now() + i,
                                x: asteroid.x,
                                y: asteroid.y,
                                velocityX: (Math.random() - 0.5) * 150,
                                velocityY: (Math.random() - 0.5) * 150,
                                radius: asteroid.radius * 0.6,
                                rotation: 0,
                                rotationSpeed: (Math.random() - 0.5) * 6
                            });
                        }
                    }
                    break;
                }
            }
        }

        // Check player-asteroid collisions
        this.players.forEach(player => {
            if (player.alive) {
                this.asteroids.forEach(asteroid => {
                    const distance = Math.sqrt(
                        Math.pow(player.x - asteroid.x, 2) + 
                        Math.pow(player.y - asteroid.y, 2)
                    );
                    
                    if (distance < asteroid.radius + 10) {
                        player.alive = false;
                        player.lives--;
                        
                        if (player.lives > 0) {
                            // Respawn after delay
                            setTimeout(() => {
                                player.alive = true;
                                player.x = this.gameWidth / 2;
                                player.y = this.gameHeight / 2;
                                player.velocityX = 0;
                                player.velocityY = 0;
                                player.rotation = 0;
                            }, 3000);
                        }
                    }
                });
            }
        });

        // Spawn new wave if all asteroids destroyed
        if (this.asteroids.length === 0) {
            this.spawnAsteroids();
        }
    }

    setPlayerInput(socketId, input) {
        const player = this.players.get(socketId);
        if (!player || !player.alive) return;

        const thrustPower = 200;
        const rotationSpeed = 5;

        if (input.left) {
            player.rotationSpeed = -rotationSpeed;
        } else if (input.right) {
            player.rotationSpeed = rotationSpeed;
        } else {
            player.rotationSpeed = 0;
        }

        if (input.up) {
            const angle = player.rotation;
            player.velocityX += Math.cos(angle) * thrustPower * 0.016;
            player.velocityY += Math.sin(angle) * thrustPower * 0.016;
            player.thrusting = true;
        } else {
            player.thrusting = false;
        }

        if (input.space && !player.lastSpace) {
            this.fireBullet(player);
        }
        player.lastSpace = input.space;
    }

    fireBullet(player) {
        const bulletSpeed = 400;
        const angle = player.rotation;
        
        this.bullets.push({
            id: Date.now(),
            playerId: player.socketId,
            x: player.x + Math.cos(angle) * 15,
            y: player.y + Math.sin(angle) * 15,
            velocityX: Math.cos(angle) * bulletSpeed + player.velocityX,
            velocityY: Math.sin(angle) * bulletSpeed + player.velocityY,
            life: 3
        });
    }

    getGameStateForClient() {
        return {
            players: Array.from(this.players.values()),
            asteroids: this.asteroids,
            bullets: this.bullets,
            gameStarted: this.gameStarted
        };
    }
}

const gameState = new AsteroidsGameState();

// Game loop
setInterval(() => {
    gameState.update(1/60); // 60 FPS
    
    // Broadcast game state to all clients
    io.emit('gameState', gameState.getGameStateForClient());
}, 1000 / 60);

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('joinGame', (data) => {
        const { name, roomId } = data;
        
        // Validate room ID
        if (roomId !== 'asteroids') {
            socket.emit('joinFailed', { reason: 'Wrong room - this is Asteroids' });
            return;
        }

        const playerName = name || `Player${Math.floor(Math.random() * 1000)}`;
        const player = {
            socketId: socket.id,
            name: playerName,
            x: gameState.gameWidth / 2,
            y: gameState.gameHeight / 2,
            velocityX: 0,
            velocityY: 0,
            rotation: 0,
            rotationSpeed: 0,
            alive: true,
            lives: 3,
            score: 0,
            thrusting: false,
            lastSpace: false
        };
        
        gameState.players.set(socket.id, player);
        
        socket.emit('playerAssigned', {
            playerId: socket.id,
            playerName: playerName
        });
        
        console.log(`${playerName} joined the asteroids game`);
    });

    socket.on('playerInput', (input) => {
        gameState.setPlayerInput(socket.id, input);
    });

    socket.on('resetGame', () => {
        // Reset player stats but keep them in game
        const player = gameState.players.get(socket.id);
        if (player) {
            player.lives = 3;
            player.score = 0;
            player.alive = true;
            player.x = gameState.gameWidth / 2;
            player.y = gameState.gameHeight / 2;
            player.velocityX = 0;
            player.velocityY = 0;
            player.rotation = 0;
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        const player = gameState.players.get(socket.id);
        if (player) {
            console.log(`${player.name} left the asteroids game`);
            gameState.players.delete(socket.id);
        }
    });
});

const PORT = process.env.PORT || 3028;
server.listen(PORT, () => {
    console.log(`Asteroids server running on port ${PORT}`);
});