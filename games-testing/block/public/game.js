import { GameLoop, Canvas2D, EventBus } from '/node_modules/@tyler-arcade/core/src/index.js'
import { InputManager } from '/node_modules/@tyler-arcade/2d-input/src/index.js'

class BlockGame {
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
    this.myPlayer = null
    
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
      this.playerName = TylerArcadePlayer.autoJoinGame(this.socket, 'block')
    })

    this.socket.on('gameState', (state) => {
      this.gameState = state
      
      // Find my player
      if (this.playerId) {
        this.myPlayer = state.players.find(p => p.id === this.playerId)
      }
      
      this.updateUI()
    })

    this.socket.on('playerAssigned', (data) => {
      this.playerId = data.playerId
      this.playerName = data.playerName
      document.getElementById('scoreboard').style.display = 'block'
      console.log(`Assigned as Player: ${this.playerName}`)
    })

    this.socket.on('joinFailed', (data) => {
      alert(`Failed to join: ${data.reason}`)
    })

    this.socket.on('gameStarted', (data) => {
      console.log('Game started!', data.message)
    })

    this.socket.on('gameEnded', (data) => {
      console.log('Game ended:', data.reason)
    })

    this.socket.on('gameReset', (data) => {
      console.log('Game reset:', data.message)
    })

    this.socket.on('playerLeft', (data) => {
      console.log('Player left')
    })
  }

  setupInput() {
    // Handle R key for resetting game
    this.input.on('keydown', (e, key) => {
      if (key === 'r' || key === 'R') {
        e.preventDefault()
        if (this.socket) {
          this.socket.emit('customEvent', 'resetGame', [])
        }
      }
    })

    // Send input to server using InputManager
    setInterval(() => {
      if (this.playerId && this.myPlayer) {
        const inputState = this.input.getInputState()
        const input = {
          left: inputState.left,
          right: inputState.right,
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
      this.renderer.drawText('Connecting...', 400, 300, '#fff', '24px Arial')
      return
    }

    const { players, blocks, collectibles, gameStarted } = this.gameState

    // Draw background pattern
    this.drawBackground()

    // Draw blocks (decorative/obstacles)
    blocks.forEach(block => {
      this.renderer.drawRect(block.x, block.y, block.width, block.height, block.color)
    })

    // Draw collectibles
    collectibles.forEach(collectible => {
      // Draw glow effect
      this.renderer.ctx.save()
      this.renderer.ctx.shadowColor = collectible.color
      this.renderer.ctx.shadowBlur = 20
      this.renderer.drawCircle(collectible.x, collectible.y, collectible.radius, collectible.color)
      this.renderer.ctx.restore()
      
      // Draw sparkle effect
      this.renderer.drawCircle(collectible.x, collectible.y, collectible.radius * 0.5, '#fff')
    })

    // Draw players
    players.forEach(player => {
      this.drawPlayer(player)
    })

    // Draw game status
    if (!gameStarted) {
      this.renderer.drawText('Waiting for players...', 400, 100, '#fff', '20px Arial')
    }
  }

  drawBackground() {
    // Draw a subtle grid pattern
    this.renderer.ctx.strokeStyle = '#222'
    this.renderer.ctx.lineWidth = 1
    
    for (let x = 0; x < 800; x += 50) {
      this.renderer.ctx.beginPath()
      this.renderer.ctx.moveTo(x, 0)
      this.renderer.ctx.lineTo(x, 600)
      this.renderer.ctx.stroke()
    }
    
    for (let y = 0; y < 600; y += 50) {
      this.renderer.ctx.beginPath()
      this.renderer.ctx.moveTo(0, y)
      this.renderer.ctx.lineTo(800, y)
      this.renderer.ctx.stroke()
    }
  }

  drawPlayer(player) {
    // Draw player shadow
    this.renderer.drawRect(
      player.x - player.width/2 + 2, 
      player.y - player.height/2 + 2, 
      player.width, 
      player.height, 
      'rgba(0, 0, 0, 0.3)'
    )
    
    // Draw player body
    this.renderer.drawRect(
      player.x - player.width/2, 
      player.y - player.height/2, 
      player.width, 
      player.height, 
      player.color
    )
    
    // Highlight current player
    if (player.id === this.playerId) {
      this.renderer.ctx.strokeStyle = '#fff'
      this.renderer.ctx.lineWidth = 2
      this.renderer.ctx.strokeRect(
        player.x - player.width/2 - 2, 
        player.y - player.height/2 - 2, 
        player.width + 4, 
        player.height + 4
      )
    }
    
    // Draw player name
    this.renderer.drawText(
      player.name, 
      player.x, 
      player.y - player.height/2 - 10, 
      '#fff', 
      '12px Arial'
    )
    
    // Draw score
    this.renderer.drawText(
      `${player.score}pts`, 
      player.x, 
      player.y + player.height/2 + 20, 
      '#4CAF50', 
      '10px Arial'
    )
  }

  updateUI() {
    const gameInfo = document.getElementById('gameInfo')
    const scoreList = document.getElementById('scoreList')
    
    if (!this.gameState) return

    const playerCount = this.gameState.players.length
    
    if (playerCount === 0) {
      gameInfo.textContent = 'Waiting for players...'
    } else if (playerCount === 1) {
      gameInfo.textContent = 'Waiting for more players...'
    } else if (this.gameState.gameStarted) {
      gameInfo.textContent = `${playerCount} players - Game in progress!`
    } else {
      gameInfo.textContent = `${playerCount} players ready`
    }

    // Update scoreboard
    if (this.gameState.leaderboard && scoreList) {
      scoreList.innerHTML = this.gameState.leaderboard.map(entry => {
        const player = this.gameState.players.find(p => p.socketId === entry.playerId)
        const playerName = player ? player.name : 'Unknown'
        const isCurrentPlayer = entry.playerId === this.playerId
        
        return `<div class="score-entry ${isCurrentPlayer ? 'current-player' : ''}">
          ${playerName}: ${entry.score}
        </div>`
      }).join('')
    }
  }
}

// Game automatically joins using TylerArcadePlayer system

// Start the game
window.game = new BlockGame()