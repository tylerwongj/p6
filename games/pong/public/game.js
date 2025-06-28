import { GameLoop, Canvas2D, EventBus } from '/node_modules/@tyler-arcade/core/src/index.js'
import { InputManager } from '/node_modules/@tyler-arcade/2d-input/src/index.js'

class PongGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas')
    if (!this.canvas) {
      console.error('Pong: Game canvas not found')
      return
    }
    
    this.renderer = new Canvas2D(this.canvas)
    this.gameLoop = new GameLoop()
    this.events = new EventBus()
    this.input = new InputManager()
    
    this.socket = io()
    this.playerId = null
    this.playerName = ''
    this.gameState = null
    this.winMessage = null
    this.resetMessage = null
    this.resetMessageTimer = 0
    
    this.setupSocket()
    this.setupInput()
    
    // Wait for socket connection before starting game loop
    this.gameLoopStarted = false
    this.startGameLoopWhenReady()
  }

  setupSocket() {
    this.socket.on('connect', () => {
      console.log('Connected to server')
      try {
        // Auto-join game using shared player name system
        if (typeof TylerArcadePlayer !== 'undefined' && TylerArcadePlayer.autoJoinGame) {
          this.playerName = TylerArcadePlayer.autoJoinGame(this.socket, 'pong')
        } else {
          console.error('TylerArcadePlayer not available, joining manually')
          this.playerName = 'Player' + Math.floor(Math.random() * 1000)
          this.socket.emit('joinGame', { name: this.playerName, roomId: 'pong' })
        }
      } catch (error) {
        console.error('Error joining game:', error)
        this.playerName = 'Player' + Math.floor(Math.random() * 1000)
        this.socket.emit('joinGame', { name: this.playerName, roomId: 'pong' })
      }
      
      // Start game loop now that socket is connected
      this.startGameLoopWhenReady()
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

    this.socket.on('connect_error', (error) => {
      console.error('Pong: Socket connection error:', error)
    })

    this.socket.on('gameWon', (winner) => {
      console.log('Game won by:', winner)
      this.showWinMessage(winner)
    })

    this.socket.on('scoresReset', (data) => {
      console.log('Scores reset:', data.message)
      this.showResetMessage(data.message)
    })

    this.socket.on('gameRestarted', (data) => {
      console.log('Game restarted:', data.message)
      this.showResetMessage(data.message)
      this.winMessage = null // Clear win message
    })

    this.socket.on('disconnect', () => {
      console.log('Pong: Disconnected from server')
      this.gameState = null
    })
  }

  startGameLoopWhenReady() {
    if (!this.gameLoopStarted && this.socket && this.socket.connected) {
      this.gameLoopStarted = true
      console.log('Starting Pong game loop')
      this.gameLoop.start(
        (deltaTime) => this.update(deltaTime),
        (deltaTime) => this.render(deltaTime)
      )
    }
  }

  setupInput() {
    // Handle 0 key for starting ball and R key for reset scores
    this.input.on('keydown', (e, key) => {
      if (key === '0') {
        e.preventDefault()
        this.socket.emit('startBall')
      } else if (key === 'r' || key === 'R') {
        e.preventDefault()
        this.socket.emit('resetScores')
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
    
    // Ensure deltaTime is a valid number to prevent render issues
    if (typeof deltaTime !== 'number' || isNaN(deltaTime)) {
      return
    }
    
    // Update reset message timer
    if (this.resetMessageTimer > 0) {
      this.resetMessageTimer -= deltaTime * 1000
      if (this.resetMessageTimer <= 0) {
        this.resetMessage = null
      }
    }
  }

  render(deltaTime) {
    try {
      // Safety check for renderer
      if (!this.renderer) {
        console.warn('Pong: Renderer not initialized')
        return
      }
      
      this.renderer.clear()
      
      if (!this.gameState) {
        this.renderer.drawText('Connecting...', 350, 200, '#fff', '24px Arial')
        return
      }

      const { ball, player1, player2 } = this.gameState

      // Check if all required game objects exist and have required properties
      if (!ball || typeof ball.x !== 'number' || typeof ball.y !== 'number' || typeof ball.radius !== 'number') {
        this.renderer.drawText('Loading game...', 350, 200, '#fff', '24px Arial')
        return
      }
      
      if (!player1 || typeof player1.x !== 'number' || typeof player1.y !== 'number') {
        this.renderer.drawText('Loading game...', 350, 200, '#fff', '24px Arial')
        return
      }
      
      if (!player2 || typeof player2.x !== 'number' || typeof player2.y !== 'number') {
        this.renderer.drawText('Loading game...', 350, 200, '#fff', '24px Arial')
        return
      }

      // Draw center line
      for (let i = 0; i < 400; i += 20) {
        this.renderer.drawRect(395, i, 10, 10, '#333')
      }

      // Draw paddles (properties already validated above)
      this.renderer.drawRect(player1.x, player1.y, player1.width || 15, player1.height || 100, '#fff')
      this.renderer.drawRect(player2.x, player2.y, player2.width || 15, player2.height || 100, '#fff')

      // Draw ball (properties already validated above)
      this.renderer.drawCircle(ball.x, ball.y, ball.radius, '#fff')

      // Draw scores (with safety checks for score property)
      const score1 = typeof player1.score === 'number' ? player1.score : 0
      const score2 = typeof player2.score === 'number' ? player2.score : 0
      this.renderer.drawText(score1.toString(), 200, 50, '#fff', '36px Arial')
      this.renderer.drawText(score2.toString(), 600, 50, '#fff', '36px Arial')
      
      // Show win message if game ended
      if (this.gameState.gameEnded && this.winMessage) {
        this.renderer.drawText(this.winMessage, 400, 150, '#ffff00', '24px Arial')
        this.renderer.drawText('Press R to reset scores', 400, 180, '#ccc', '16px Arial')
      }
      
      // Show temporary reset message
      if (this.resetMessage && this.resetMessageTimer > 0) {
        this.renderer.drawText(this.resetMessage, 400, 300, '#00ff00', '18px Arial')
      }

      // Draw player names
      if (this.gameState.players) {
        if (this.gameState.players[0] && this.gameState.players[0].name) {
          this.renderer.drawText(this.gameState.players[0].name, 50, 50, '#fff', '18px Arial')
        }
        if (this.gameState.players[1] && this.gameState.players[1].name) {
          this.renderer.drawText(this.gameState.players[1].name, 650, 50, '#fff', '18px Arial')
        }
      }
    } catch (error) {
      console.error('Pong render error:', error)
      // Fallback rendering in case of any errors
      this.renderer.clear()
      this.renderer.drawText('Error loading game...', 350, 200, '#fff', '24px Arial')
    }
  }
  
  showWinMessage(winner) {
    this.winMessage = `${winner.playerName} wins! (${winner.score} points)`
  }
  
  showResetMessage(message) {
    this.resetMessage = message
    this.resetMessageTimer = 3000 // Show for 3 seconds
    
    // Clear win message when scores are reset
    this.winMessage = null
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