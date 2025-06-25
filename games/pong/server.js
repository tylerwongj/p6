import express from 'express'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { CollisionDetection } from '@tyler-arcade/2d-physics'
import { MultiplayerServer } from '@tyler-arcade/multiplayer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const multiplayerServer = new MultiplayerServer(server)

const PORT = process.env.PORT || 3000

// Serve static files
app.use(express.static('public'))
app.use('/node_modules', express.static('../../node_modules'))

// Game state
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

const gameState = new PongGameState()

// Set up multiplayer callbacks
multiplayerServer.on('playerJoin', (socketId, playerName, roomId) => {
  if (gameState.players.length < 2) {
    const playerId = gameState.players.length + 1
    const player = {
      id: socketId,
      name: playerName,
      playerId: playerId
    }
    
    gameState.players.push(player)
    console.log(`${playerName} joined as Player ${playerId}`)
    
    return {
      success: true,
      playerData: { playerId, playerName }
    }
  } else {
    return {
      success: false,
      reason: 'Game is full'
    }
  }
})

multiplayerServer.on('playerLeave', (socketId, player) => {
  const playerIndex = gameState.players.findIndex(p => p.id === socketId)
  if (playerIndex !== -1) {
    const player = gameState.players[playerIndex]
    gameState.players.splice(playerIndex, 1)
    
    // Reset player IDs
    gameState.players.forEach((p, index) => {
      p.playerId = index + 1
    })
    
    console.log(`${player.name} left the game`)
  }
})

multiplayerServer.on('playerInput', (socketId, input) => {
  const player = gameState.players.find(p => p.id === socketId)
  if (player) {
    gameState.setPlayerInput(player.playerId, input)
  }
})

multiplayerServer.on('customEvent', (socketId, eventName, args) => {
  if (eventName === 'startBall') {
    gameState.resetBall()
  }
})

// Start game loop using multiplayer server
multiplayerServer.startGameLoop((deltaTime) => {
  gameState.update(deltaTime)
  
  // Broadcast game state to all clients
  multiplayerServer.broadcast('gameState', {
    ball: gameState.ball,
    player1: gameState.player1,
    player2: gameState.player2,
    players: gameState.players
  })
}, 60)

// Multiplayer server handles all Socket.io connections automatically

server.listen(PORT, () => {
  console.log(`Pong server running on http://localhost:${PORT}`)
  console.log('Press Ctrl+C to stop')
})