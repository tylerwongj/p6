import { BaseGame } from '@tyler-arcade/multiplayer';

export class ThreeDRacingGame extends BaseGame {
    constructor() {
        super();
        this.name = '3d-racing';
        this.description = '3D racing with dynamic tracks and physics!';
        this.maxPlayers = 4;
        
        // Required for BaseGame
        this.spectators = [];
        
        // Game constants
        this.TRACK_LENGTH = 200;
        this.TRACK_WIDTH = 20;
        this.CAR_SPEED = 0.5;
        this.MAX_SPEED = 2.0;
        this.FRICTION = 0.02;
        
        // Generate racing track
        this.raceTrack = this.generateTrack();
        
        // Game state
        this.gameActive = false;
        this.raceStartTime = 0;
        this.lapCount = 3;
        this.winner = null;
        this.raceFinished = false;
    }

    generateTrack() {
        const track = [];
        const checkpoints = [];
        
        for (let i = 0; i < this.TRACK_LENGTH; i++) {
            const progress = i / this.TRACK_LENGTH;
            const angle = progress * Math.PI * 4; // 2 full loops
            const radius = 50 + Math.sin(progress * Math.PI * 6) * 20;
            
            track.push({
                x: Math.cos(angle) * radius,
                z: Math.sin(angle) * radius,
                y: Math.sin(progress * Math.PI * 2) * 5, // Elevation changes
                width: this.TRACK_WIDTH + Math.sin(progress * Math.PI * 8) * 5
            });
            
            // Add checkpoints every 25 track segments
            if (i % 25 === 0) {
                checkpoints.push({
                    id: checkpoints.length,
                    x: Math.cos(angle) * radius,
                    z: Math.sin(angle) * radius,
                    y: Math.sin(progress * Math.PI * 2) * 5
                });
            }
        }
        
        return { track, checkpoints };
    }

    handlePlayerJoin(socketId, playerName, roomId, socket) {
        if (roomId !== '3d-racing') {
            return {
                success: false,
                reason: 'Wrong room - this is 3D Racing'
            };
        }

        if (this.players.length >= this.maxPlayers) {
            return {
                success: false,
                reason: 'Race is full'
            };
        }

        // Spawn player at start line
        const player = {
            id: socketId,
            name: playerName || `Racer${Math.floor(Math.random() * 1000)}`,
            x: 0,
            y: 0,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            rotation: 0,
            speed: 0,
            lap: 0,
            checkpoint: 0,
            position: 0,
            finished: false,
            finishTime: 0,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
            cameraAngle: 0,
            cameraHeight: 5,
            cameraDistance: 10
        };

        this.players.push(player);
        console.log(`${player.name} joined 3D Racing`);

        // Start race when at least 2 players join
        if (this.players.length >= 2 && !this.gameActive) {
            this.gameActive = true;
            this.raceStartTime = Date.now();
        }

        this.broadcast('gameState', this.getGameStateForClient());

        return {
            success: true,
            playerData: { playerId: socketId, playerName: player.name }
        };
    }

    handlePlayerLeave(socketId, player, socket) {
        this.players = this.players.filter(p => p.id !== socketId);
        
        if (this.players.length < 2) {
            this.gameActive = false;
        }
        
        this.broadcast('gameState', this.getGameStateForClient());
    }

    handlePlayerInput(socketId, input, socket) {
        // This game uses custom events for input
    }

    handleCustomEvent(socketId, eventName, args, socket) {
        console.log(`🏎️ 3D Racing: Custom event '${eventName}' from ${socketId}`);
        
        const player = this.players.find(p => p.id === socketId);
        if (!player) return;
        
        switch (eventName) {
            case 'accelerate':
                if (this.gameActive && !player.finished) {
                    player.speed = Math.min(player.speed + this.CAR_SPEED, this.MAX_SPEED);
                }
                break;
                
            case 'brake':
                if (this.gameActive && !player.finished) {
                    player.speed = Math.max(player.speed - this.CAR_SPEED * 2, -this.MAX_SPEED * 0.5);
                }
                break;
                
            case 'steer':
                const steerData = args[0] || args;
                if (this.gameActive && !player.finished) {
                    if (steerData.direction === 'left') {
                        player.rotation -= 0.1;
                    } else if (steerData.direction === 'right') {
                        player.rotation += 0.1;
                    }
                }
                break;
                
            case 'cameraControl':
                const cameraData = args[0] || args;
                if (cameraData.direction === 'left') {
                    player.cameraAngle -= 0.1;
                } else if (cameraData.direction === 'right') {
                    player.cameraAngle += 0.1;
                } else if (cameraData.direction === 'up') {
                    player.cameraHeight = Math.min(player.cameraHeight + 1, 15);
                } else if (cameraData.direction === 'down') {
                    player.cameraHeight = Math.max(player.cameraHeight - 1, 2);
                }
                break;
                
            case 'resetGame':
                this.resetRace();
                break;
        }
    }

    resetRace() {
        // Reset race
        this.raceTrack = this.generateTrack();
        this.gameActive = false;
        this.winner = null;
        this.raceFinished = false;
        this.raceStartTime = 0;
        
        // Reset all players
        this.players.forEach(player => {
            player.x = 0;
            player.y = 0;
            player.z = 0;
            player.vx = 0;
            player.vy = 0;
            player.vz = 0;
            player.rotation = 0;
            player.speed = 0;
            player.lap = 0;
            player.checkpoint = 0;
            player.position = 0;
            player.finished = false;
            player.finishTime = 0;
        });
        
        if (this.players.length >= 2) {
            this.gameActive = true;
            this.raceStartTime = Date.now();
        }
        
        console.log('🔄 3D Racing reset!');
        this.broadcast('gameState', this.getGameStateForClient());
    }

    update(deltaTime) {
        this.updateRacePhysics();
        this.broadcast('gameState', this.getGameStateForClient());
    }

    updateRacePhysics() {
        if (!this.gameActive) return;
        
        this.players.forEach(player => {
            if (player.finished) return;
            
            // Apply movement
            player.vx = Math.cos(player.rotation) * player.speed;
            player.vz = Math.sin(player.rotation) * player.speed;
            
            player.x += player.vx;
            player.z += player.vz;
            
            // Apply friction
            player.speed *= (1 - this.FRICTION);
            
            // Track following and checkpoint detection
            let closestTrackPoint = null;
            let minDistance = Infinity;
            let trackIndex = 0;
            
            this.raceTrack.track.forEach((point, index) => {
                const dx = player.x - point.x;
                const dz = player.z - point.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestTrackPoint = point;
                    trackIndex = index;
                }
            });
            
            if (closestTrackPoint) {
                player.y = closestTrackPoint.y;
                player.position = trackIndex;
            }
            
            // Checkpoint detection
            this.raceTrack.checkpoints.forEach(checkpoint => {
                const dx = player.x - checkpoint.x;
                const dz = player.z - checkpoint.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < 10 && checkpoint.id === player.checkpoint) {
                    player.checkpoint++;
                    
                    // Check for lap completion
                    if (player.checkpoint >= this.raceTrack.checkpoints.length) {
                        player.lap++;
                        player.checkpoint = 0;
                        
                        console.log(`🏁 ${player.name} completed lap ${player.lap}`);
                        
                        // Check for race finish
                        if (player.lap >= this.lapCount) {
                            player.finished = true;
                            player.finishTime = Date.now() - this.raceStartTime;
                            
                            if (!this.winner) {
                                this.winner = player.name;
                                this.raceFinished = true;
                                console.log(`🏆 ${player.name} wins the race!`);
                            }
                        }
                    }
                }
            });
        });
    }

    getGameStateForClient() {
        return {
            players: this.players,
            track: this.raceTrack.track,
            checkpoints: this.raceTrack.checkpoints,
            gameActive: this.gameActive,
            raceStartTime: this.raceStartTime,
            lapCount: this.lapCount,
            winner: this.winner,
            raceFinished: this.raceFinished
        };
    }
}