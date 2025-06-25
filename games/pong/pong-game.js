import { CollisionDetection } from '@tyler-arcade/2d-physics'

/**
 * PongGame - Pong game logic for hub integration
 */
export class PongGame {
  constructor(multiplayerServer) {
    this.name = 'Pong'
    this.description = 'Classic paddle game - first to 5 points wins!'
    this.maxPlayers = 2
    this.multiplayerServer = multiplayerServer
    this.gameState = new PongGameState()
    
    this.setupMultiplayer()
    this.startGameLoop()
  }

  setupMultiplayer() {
    // Set up multiplayer callbacks
    this.multiplayerServer.on('playerJoin', (socketId, playerName, roomId) => {
      // Only handle pong room joins or default room
      if (roomId !== 'pong' && roomId !== 'main') return null
      
      if (this.gameState.players.length < 2) {
        const playerId = this.gameState.players.length + 1
        const player = {
          id: socketId,
          name: playerName,
          playerId: playerId
        }
        
        this.gameState.players.push(player)
        console.log(`${playerName} joined Pong as Player ${playerId}`)
        
        return {
          success: true,
          playerData: { playerId, playerName }
        }
      } else {
        return {
          success: false,
          reason: 'Pong game is full'
        }
      }
    })

    this.multiplayerServer.on('playerLeave', (socketId, player) => {
      const playerIndex = this.gameState.players.findIndex(p => p.id === socketId)
      if (playerIndex !== -1) {
        const player = this.gameState.players[playerIndex]
        this.gameState.players.splice(playerIndex, 1)
        
        // Reset player IDs
        this.gameState.players.forEach((p, index) => {
          p.playerId = index + 1
        })
        
        console.log(`${player.name} left Pong`)
      }
    })

    this.multiplayerServer.on('playerInput', (socketId, input) => {
      const player = this.gameState.players.find(p => p.id === socketId)
      if (player) {
        this.gameState.setPlayerInput(player.playerId, input)
      }
    })

    this.multiplayerServer.on('customEvent', (socketId, eventName, args) => {
      if (eventName === 'startBall') {
        this.gameState.resetBall()
      }
    })
  }

  startGameLoop() {
    this.multiplayerServer.startGameLoop((deltaTime) => {
      this.gameState.update(deltaTime)
      
      // Broadcast game state to all clients
      this.multiplayerServer.broadcast('gameState', {
        ball: this.gameState.ball,
        player1: this.gameState.player1,
        player2: this.gameState.player2,
        players: this.gameState.players
      })
    }, 60)
  }

  getPlayerCount() {
    return this.gameState.players.length
  }

  getStatus() {
    if (this.gameState.players.length >= this.maxPlayers) {
      return 'full'
    }
    return 'available'
  }
}

// Game state class
class PongGameState {
  constructor() {
    this.players = []
    this.ball = {
      x: 400,
      y: 200,
      radius: 10,
      velocityX: 300,
      velocityY: 150,
      speed: 300
    }
    this.player1 = {
      x: 10,
      y: 150,
      width: 15,
      height: 100,
      score: 0,
      velocityY: 0
    }
    this.player2 = {
      x: 775,
      y: 150,
      width: 15,
      height: 100,
      score: 0,
      velocityY: 0
    }
    this.paddleSpeed = 400
  }

  update(deltaTime) {
    // Update paddle positions
    this.player1.y += this.player1.velocityY * deltaTime
    this.player2.y += this.player2.velocityY * deltaTime

    // Keep paddles in bounds
    this.player1.y = Math.max(0, Math.min(300, this.player1.y))
    this.player2.y = Math.max(0, Math.min(300, this.player2.y))

    // Update ball position
    this.ball.x += this.ball.velocityX * deltaTime
    this.ball.y += this.ball.velocityY * deltaTime

    // Ball collision with top/bottom walls
    if (this.ball.y <= this.ball.radius || this.ball.y >= 400 - this.ball.radius) {
      this.ball.velocityY = -this.ball.velocityY
      // Keep ball within bounds
      this.ball.y = Math.max(this.ball.radius, Math.min(400 - this.ball.radius, this.ball.y))
    }

    // Ball collision with paddles using generic collision detection
    const ballCircle = {x: this.ball.x, y: this.ball.y, radius: this.ball.radius}
    const paddle1Rect = {x: this.player1.x, y: this.player1.y, width: this.player1.width, height: this.player1.height}
    const paddle2Rect = {x: this.player2.x, y: this.player2.y, width: this.player2.width, height: this.player2.height}

    // Left paddle collision
    if (CollisionDetection.circleRectCollision(ballCircle, paddle1Rect) && this.ball.velocityX < 0) {
      this.ball.velocityX = -this.ball.velocityX
      this.ball.velocityY += this.player1.velocityY * 0.1
      // Keep ball from getting stuck
      this.ball.x = this.player1.x + this.player1.width + this.ball.radius
    }

    // Right paddle collision  
    if (CollisionDetection.circleRectCollision(ballCircle, paddle2Rect) && this.ball.velocityX > 0) {
      this.ball.velocityX = -this.ball.velocityX
      this.ball.velocityY += this.player2.velocityY * 0.1
      // Keep ball from getting stuck
      this.ball.x = this.player2.x - this.ball.radius
    }

    // Ball out of bounds (scoring)
    if (this.ball.x < 0) {
      this.player2.score++
      this.resetBall()
    } else if (this.ball.x > 800) {
      this.player1.score++
      this.resetBall()
    }
  }

  resetBall() {
    this.ball.x = 400
    this.ball.y = 200
    this.ball.velocityX = Math.random() > 0.5 ? 300 : -300
    this.ball.velocityY = (Math.random() - 0.5) * 200
  }

  setPlayerInput(playerId, input) {
    const player = playerId === 1 ? this.player1 : this.player2
    
    if (input.up && !input.down) {
      player.velocityY = -this.paddleSpeed
    } else if (input.down && !input.up) {
      player.velocityY = this.paddleSpeed
    } else {
      player.velocityY = 0
    }
  }
}