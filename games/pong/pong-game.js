import { CollisionDetection } from '@tyler-arcade/2d-physics'
import { BaseGame } from '@tyler-arcade/multiplayer'

/**
 * PongGame - Pong game logic for hub integration
 */
export class PongGame extends BaseGame {
  constructor() {
    super()
    this.name = 'Pong'
    this.description = 'Classic paddle game - first to 5 points wins!'
    this.maxPlayers = 2
    this.spectators = []
    this.gameState = new PongGameState()
    this.gameLoopInterval = null
    
    // Start game loop immediately
    this.startGameLoop()
  }

  /**
   * Handle a player trying to join Pong
   */
  handlePlayerJoin(socketId, playerName, roomId, socket) {
    console.log(`PongGame: ${playerName} wants to join room ${roomId}`)
    
    // Only handle pong room joins
    if (roomId !== 'pong') {
      console.log(`PongGame: Rejecting join for room ${roomId} (not pong)`)
      return {
        success: false,
        reason: 'Wrong room - this is Pong'
      }
    }
    
    if (this.gameState.players.length < 2) {
      const playerId = this.gameState.players.length + 1
      const player = {
        id: socketId,
        name: playerName,
        playerId: playerId
      }
      
      this.gameState.players.push(player)
      // Update parent class players array too
      this.players = this.gameState.players
      
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
  }

  /**
   * Handle a player leaving Pong
   */
  handlePlayerLeave(socketId, player, socket) {
    const playerIndex = this.gameState.players.findIndex(p => p.id === socketId)
    if (playerIndex !== -1) {
      const leavingPlayer = this.gameState.players[playerIndex]
      this.gameState.players.splice(playerIndex, 1)
      
      // Reset player IDs
      this.gameState.players.forEach((p, index) => {
        p.playerId = index + 1
      })
      
      // Update parent class players array
      this.players = this.gameState.players
      
      console.log(`${leavingPlayer.name} left Pong`)
    }
  }

  /**
   * Handle player input for Pong
   */
  handlePlayerInput(socketId, input, socket) {
    const player = this.gameState.players.find(p => p.id === socketId)
    if (player) {
      this.gameState.setPlayerInput(player.playerId, input)
    }
  }

  /**
   * Handle custom events for Pong
   */
  handleCustomEvent(socketId, eventName, args, socket) {
    if (eventName === 'startBall') {
      this.gameState.resetBall()
    }
  }

  startGameLoop() {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval)
    }
    
    let lastTime = Date.now()
    this.gameLoopInterval = setInterval(() => {
      const currentTime = Date.now()
      const deltaTime = (currentTime - lastTime) / 1000
      lastTime = currentTime
      
      this.gameState.update(deltaTime)
      
      // Broadcast game state to all Pong players
      this.broadcast('gameState', {
        ball: this.gameState.ball,
        player1: this.gameState.player1,
        player2: this.gameState.player2,
        players: this.gameState.players
      })
    }, 1000 / 60) // 60 FPS
  }

  /**
   * Override getPlayerCount to use game state
   */
  getPlayerCount() {
    return this.gameState.players.length
  }

  /**
   * Override getStatus based on players
   */
  getStatus() {
    if (this.gameState.players.length >= this.maxPlayers) {
      return 'full'
    }
    if (this.gameState.players.length > 0) {
      return 'waiting'
    }
    return 'available'
  }

  /**
   * Stop the game loop
   */
  stop() {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval)
      this.gameLoopInterval = null
    }
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