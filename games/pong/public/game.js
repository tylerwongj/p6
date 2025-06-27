import { GameLoop, Canvas2D, EventBus } from '/node_modules/@tyler-arcade/core/src/index.js'
import { InputManager } from '/node_modules/@tyler-arcade/2d-input/src/index.js'

class PongGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas')
    this.renderer = new Canvas2D(this.canvas)
    this.gameLoop = new GameLoop()
    this.events = new EventBus()
    this.input = new InputManager()
    
    this.socket = io()
    this.playerId = null
    this.playerName = ''
    this.gameState = null
    
    this.setupSocket()
    this.setupInput()
    
    // Start game loop immediately for spectating
    this.gameLoop.start(
      (deltaTime) => this.update(deltaTime),
      (deltaTime) => this.render(deltaTime)
    )
  }

  setupSocket() {
    this.socket.on('connect', () => {
      console.log('Connected to server')
      // Auto-join game using shared player name system
      this.playerName = TylerArcadePlayer.autoJoinGame(this.socket, 'pong')
    })

    this.socket.on('gameState', (state) => {
      this.gameState = state
      this.updateUI()
    })

    this.socket.on('playerAssigned', (data) => {
      this.playerId = data.playerId
      this.playerName = data.playerName
      console.log(`Assigned as Player ${this.playerId}`)
    })

    this.socket.on('playerLeft', (data) => {
      console.log(`Player ${data.playerId} left`)
    })
  }

  setupInput() {
    // Handle 0 key for starting ball
    this.input.on('keydown', (e, key) => {
      if (key === '0') {
        e.preventDefault()
        this.socket.emit('startBall')
      }
    })

    // Send input to server using InputManager
    setInterval(() => {
      if (this.playerId) {
        const inputState = this.input.getInputState()
        const input = {
          up: inputState.up,
          down: inputState.down
        }
        this.socket.emit('playerInput', input)
      }
    }, 1000 / 60) // 60 FPS input
  }

  update(deltaTime) {
    // Client-side prediction could go here
    // For now, just rely on server state
  }

  render(deltaTime) {
    this.renderer.clear()
    
    if (!this.gameState) {
      this.renderer.drawText('Connecting...', 350, 200, '#fff', '24px Arial')
      return
    }

    const { ball, player1, player2 } = this.gameState

    // Draw center line
    for (let i = 0; i < 400; i += 20) {
      this.renderer.drawRect(395, i, 10, 10, '#333')
    }

    // Draw paddles
    this.renderer.drawRect(player1.x, player1.y, player1.width, player1.height, '#fff')
    this.renderer.drawRect(player2.x, player2.y, player2.width, player2.height, '#fff')

    // Draw ball
    this.renderer.drawCircle(ball.x, ball.y, ball.radius, '#fff')

    // Draw scores
    this.renderer.drawText(player1.score.toString(), 200, 50, '#fff', '36px Arial')
    this.renderer.drawText(player2.score.toString(), 600, 50, '#fff', '36px Arial')

    // Draw player names
    if (this.gameState.players) {
      if (this.gameState.players[0]) {
        this.renderer.drawText(this.gameState.players[0].name, 50, 50, '#fff', '18px Arial')
      }
      if (this.gameState.players[1]) {
        this.renderer.drawText(this.gameState.players[1].name, 650, 50, '#fff', '18px Arial')
      }
    }
  }

  updateUI() {
    const gameInfo = document.getElementById('gameInfo')
    if (!this.gameState) return

    const playerCount = this.gameState.players ? this.gameState.players.length : 0
    
    if (playerCount === 0) {
      gameInfo.textContent = 'Waiting for players...'
    } else if (playerCount === 1) {
      gameInfo.textContent = 'Waiting for second player...'
    } else {
      gameInfo.textContent = 'Game in progress!'
    }
  }
}

// Game automatically joins using TylerArcadePlayer system

// Start the game
window.game = new PongGame()