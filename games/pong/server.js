import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const io = new Server(server)

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
    }

    // Ball collision with paddles
    if (this.ball.x <= this.player1.x + this.player1.width + this.ball.radius &&
        this.ball.y >= this.player1.y &&
        this.ball.y <= this.player1.y + this.player1.height &&
        this.ball.velocityX < 0) {
      this.ball.velocityX = -this.ball.velocityX
      this.ball.velocityY += this.player1.velocityY * 0.1
    }

    if (this.ball.x >= this.player2.x - this.ball.radius &&
        this.ball.y >= this.player2.y &&
        this.ball.y <= this.player2.y + this.player2.height &&
        this.ball.velocityX > 0) {
      this.ball.velocityX = -this.ball.velocityX
      this.ball.velocityY += this.player2.velocityY * 0.1
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

// Game loop
let lastTime = Date.now()
setInterval(() => {
  const currentTime = Date.now()
  const deltaTime = (currentTime - lastTime) / 1000
  lastTime = currentTime
  
  gameState.update(deltaTime)
  
  // Broadcast game state to all clients
  io.emit('gameState', {
    ball: gameState.ball,
    player1: gameState.player1,
    player2: gameState.player2,
    players: gameState.players
  })
}, 1000 / 60) // 60 FPS

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id)

  socket.on('joinGame', (data) => {
    const playerName = data.name || 'Anonymous'
    
    if (gameState.players.length < 2) {
      const playerId = gameState.players.length + 1
      const player = {
        id: socket.id,
        name: playerName,
        playerId: playerId
      }
      
      gameState.players.push(player)
      socket.emit('playerAssigned', { playerId, playerName })
      
      console.log(`${playerName} joined as Player ${playerId}`)
    } else {
      socket.emit('gameFull')
    }
  })

  socket.on('playerInput', (input) => {
    const player = gameState.players.find(p => p.id === socket.id)
    if (player) {
      gameState.setPlayerInput(player.playerId, input)
    }
  })

  socket.on('startBall', () => {
    gameState.resetBall()
  })

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id)
    
    const playerIndex = gameState.players.findIndex(p => p.id === socket.id)
    if (playerIndex !== -1) {
      const player = gameState.players[playerIndex]
      gameState.players.splice(playerIndex, 1)
      
      // Reset player IDs
      gameState.players.forEach((p, index) => {
        p.playerId = index + 1
      })
      
      io.emit('playerLeft', { playerId: player.playerId })
      console.log(`${player.name} left the game`)
    }
  })
})

server.listen(PORT, () => {
  console.log(`Pong server running on http://localhost:${PORT}`)
  console.log('Press Ctrl+C to stop')
})