import { BaseGame } from '@tyler-arcade/multiplayer';

export class AsteroidsGame extends BaseGame {
    constructor() {
        super();
        this.name = 'Asteroids';
        this.description = 'Blast asteroids in this classic space shooter!';
        this.maxPlayers = 4;
        
        // Override players to use Map instead of Array
        this.players = new Map();
        this.spectators = [];
        
        this.asteroids = [];
        this.bullets = [];
        this.gameWidth = 800;
        this.gameHeight = 600;
        this.gameStarted = false;
        this.gameEnded = false;
        
        this.spawnAsteroids();
    }

    handlePlayerJoin(socketId, playerName, roomId, socket) {
        if (roomId !== 'asteroids') {
            return {
                success: false,
                reason: 'Wrong room - this is Asteroids'
            };
        }

        const player = {
            socketId: socketId,
            id: socketId,
            name: playerName || `Player${Math.floor(Math.random() * 1000)}`,
            x: this.gameWidth / 2,
            y: this.gameHeight / 2,
            velocityX: 0,
            velocityY: 0,
            rotation: 0,
            rotationSpeed: 0,
            alive: true,
            lives: 3,
            score: 0,
            thrusting: false,
            lastShotTime: 0,
            respawning: false,
            invulnerable: false,
            invulnerableTime: 0
        };

        this.players.set(socketId, player);
        console.log(`${player.name} joined Asteroids`);

        return {
            success: true,
            playerData: { playerId: socketId, playerName: player.name }
        };
    }

    handlePlayerLeave(socketId, player, socket) {
        const playerObj = this.players.get(socketId);
        if (playerObj) {
            console.log(`${playerObj.name} left the asteroids game`);
            this.players.delete(socketId);
        }
    }

    handlePlayerInput(socketId, input, socket) {
        this.setPlayerInput(socketId, input);
    }

    handleCustomEvent(socketId, eventName, args, socket) {
        console.log(`🎮 Asteroids Game: Handling custom event '${eventName}' from ${socketId}`);
        
        switch (eventName) {
            case 'resetGame':
                this.resetGame();
                console.log('Asteroids game reset by player');
                break;
        }
    }

    spawnAsteroids() {
        this.asteroids = [];
        // 25% more asteroids (5 → 6)
        for (let i = 0; i < 6; i++) {
            this.spawnSingleAsteroid(i);
        }
    }
    
    spawnSingleAsteroid(id) {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            const x = Math.random() * this.gameWidth;
            const y = Math.random() * this.gameHeight;
            const radius = 40 + Math.random() * 20;
            
            // Check if too close to any player
            let tooClose = false;
            for (const player of this.players.values()) {
                const distance = Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2);
                if (distance < radius + 100) { // 100px safety buffer
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                // Variable speeds: 25% slow, 50% normal, 25% fast
                const speedMultiplier = Math.random() < 0.25 ? 0.6 : 
                                      Math.random() < 0.75 ? 1.0 : 1.5;
                
                this.asteroids.push({
                    id: id,
                    x: x,
                    y: y,
                    velocityX: (Math.random() - 0.5) * 100 * speedMultiplier,
                    velocityY: (Math.random() - 0.5) * 100 * speedMultiplier,
                    radius: radius,
                    rotation: 0,
                    rotationSpeed: (Math.random() - 0.5) * 4
                });
                return;
            }
            attempts++;
        }
        
        // Fallback: spawn anyway if can't find safe spot
        const speedMultiplier = Math.random() < 0.25 ? 0.6 : 
                              Math.random() < 0.75 ? 1.0 : 1.5;
        
        this.asteroids.push({
            id: id,
            x: Math.random() * this.gameWidth,
            y: Math.random() * this.gameHeight,
            velocityX: (Math.random() - 0.5) * 100 * speedMultiplier,
            velocityY: (Math.random() - 0.5) * 100 * speedMultiplier,
            radius: 40 + Math.random() * 20,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 4
        });
    }

    update(deltaTime) {
        if (!this.gameStarted && this.players.size > 0) {
            this.gameStarted = true;
        }

        // Update players
        this.players.forEach(player => {
            if (player.alive) {
                // Update invulnerability
                if (player.invulnerable) {
                    player.invulnerableTime -= deltaTime * 1000;
                    if (player.invulnerableTime <= 0) {
                        player.invulnerable = false;
                        player.respawning = false;
                    }
                }
                
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
                        
                        // Check for win condition (500 points)
                        if (player.score >= 500 && !this.gameEnded) {
                            this.endGame(player);
                            return;
                        }
                    }
                    
                    // Split asteroid if large enough
                    if (asteroid.radius > 20) {
                        for (let i = 0; i < 2; i++) {
                            // Calculate outward explosion direction
                            // Create fragments that move away from asteroid center
                            const explosionAngle = (Math.PI * 2 / 2) * i + (Math.random() - 0.5) * 0.8; // Base angle with randomness
                            
                            // Calculate parent's momentum and add explosion energy
                            const parentSpeed = Math.sqrt(asteroid.velocityX ** 2 + asteroid.velocityY ** 2);
                            const explosionSpeed = Math.max(parentSpeed * 2.5, 120); // Much faster fragments, minimum 120
                            
                            // Add some randomness to explosion speed (±30%)
                            const speedVariation = 0.7 + Math.random() * 0.6; // 0.7 to 1.3 multiplier
                            const finalSpeed = explosionSpeed * speedVariation;
                            
                            // Calculate outward velocity components
                            const outwardVelX = Math.cos(explosionAngle) * finalSpeed;
                            const outwardVelY = Math.sin(explosionAngle) * finalSpeed;
                            
                            // Add portion of parent momentum for realistic physics
                            const momentumFactor = 0.3; // 30% of parent's momentum carried over
                            
                            this.asteroids.push({
                                id: Date.now() + i,
                                x: asteroid.x,
                                y: asteroid.y,
                                velocityX: outwardVelX + (asteroid.velocityX * momentumFactor),
                                velocityY: outwardVelY + (asteroid.velocityY * momentumFactor),
                                radius: asteroid.radius * 0.6,
                                rotation: 0,
                                rotationSpeed: (Math.random() - 0.5) * 8 // Faster rotation for dramatic effect
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
                    
                    if (distance < asteroid.radius + 10 && !player.invulnerable) {
                        player.lives--;
                        player.respawning = true;
                        player.invulnerable = true;
                        player.invulnerableTime = 3000; // 3 seconds of invulnerability
                        
                        // Immediate respawn at center with invulnerability
                        player.x = this.gameWidth / 2;
                        player.y = this.gameHeight / 2;
                        player.velocityX = 0;
                        player.velocityY = 0;
                        player.rotation = 0;
                        player.lastShotTime = 0;
                        
                        if (player.lives <= 0) {
                            player.alive = false;
                        }
                        // Player remains alive if they still have lives (respawn with invulnerability)
                    }
                });
            }
        });

        // Check if all players are dead
        const alivePlayers = Array.from(this.players.values()).filter(player => player.alive);
        if (this.players.size > 0 && alivePlayers.length === 0 && !this.gameEnded) {
            // All players are dead - find winner by highest score
            const allPlayers = Array.from(this.players.values());
            const winner = allPlayers.reduce((highest, current) => 
                current.score > highest.score ? current : highest
            );
            
            this.endGameAllDead(winner);
            return;
        }

        // Spawn new wave if all asteroids destroyed
        if (this.asteroids.length === 0) {
            this.spawnAsteroids();
        }

        // Broadcast game state to all clients
        this.broadcast('gameState', this.getGameStateForClient());
    }
    
    endGame(winner) {
        if (this.gameEnded) return; // Prevent multiple end game calls
        this.gameEnded = true;
        
        // Broadcast winner
        this.broadcast('gameWinner', {
            winner: winner.name,
            score: winner.score,
            message: `🏆 ${winner.name} wins with ${winner.score} points!`
        });
        
        console.log(`Asteroids game ended! Winner: ${winner.name} with ${winner.score} points`);
        
        // Reset game after 5 seconds
        setTimeout(() => {
            this.resetGame();
        }, 5000);
    }

    endGameAllDead(winner) {
        if (this.gameEnded) return; // Prevent multiple end game calls
        this.gameEnded = true;
        
        // Broadcast winner when all players are dead
        this.broadcast('gameWinner', {
            winner: winner.name,
            score: winner.score,
            message: `💀 All players eliminated! ${winner.name} wins with highest score: ${winner.score} points!`
        });
        
        console.log(`Asteroids game ended - all dead! Winner: ${winner.name} with highest score: ${winner.score} points`);
        
        // Reset game after 5 seconds
        setTimeout(() => {
            this.resetGame();
        }, 5000);
    }

    resetGame() {
        // Reset all players
        this.players.forEach(player => {
            player.lives = 3;
            player.score = 0;
            player.alive = true;
            player.x = this.gameWidth / 2;
            player.y = this.gameHeight / 2;
            player.velocityX = 0;
            player.velocityY = 0;
            player.rotation = 0;
            player.lastShotTime = 0;
            player.respawning = false;
            player.invulnerable = false;
            player.invulnerableTime = 0;
        });
        
        // Reset game state
        this.bullets = [];
        this.gameEnded = false; // Reset the ended flag
        this.spawnAsteroids();
        
        console.log('Asteroids game reset complete');
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

        const currentTime = Date.now();
        const shotCooldown = 100; // 100ms = 10 bullets per second max
        
        if (input.space && (currentTime - player.lastShotTime) >= shotCooldown) {
            this.fireBullet(player);
            player.lastShotTime = currentTime;
        }
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

    getPlayerCount() {
        return this.players.size;
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