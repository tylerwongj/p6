// Simplified - remove Tyler Arcade imports that might be causing issues
// import { GameLoop, Canvas2D, EventBus } from '/node_modules/@tyler-arcade/core/src/index.js'
// import { InputManager } from '/node_modules/@tyler-arcade/2d-input/src/index.js'

class BlockGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas')
    this.ctx = this.canvas.getContext('2d')
    
    // Make canvas focusable and focus it
    this.canvas.tabIndex = 0
    this.canvas.focus()
    
    this.socket = io()
    this.playerId = null
    this.playerName = ''
    this.gameState = null
    this.myPlayer = null
    this.isSpectator = false
    this.inputState = {
      left: false,
      right: false,
      up: false,
      down: false
    }
    
    // Winner message display
    this.showWinnerMessage = false
    this.winnerMessage = null
    this.countdown = null
    
    this.setupSocket()
    this.setupInput()
    
    // Start simple game loop
    this.startGameLoop()
    
    // Focus canvas when clicked
    this.canvas.addEventListener('click', () => {
      this.canvas.focus()
    })
  }

  startGameLoop() {
    const gameLoop = () => {
      this.update()
      this.render()
      requestAnimationFrame(gameLoop)
    }
    requestAnimationFrame(gameLoop)
  }

  setupSocket() {
    this.socket.on('connect', () => {
      console.log('Connected to server')
      // Auto-join game using shared player name system
      this.playerName = TylerArcadePlayer.autoJoinGame(this.socket, 'block')
    })

    this.socket.on('gameState', (state) => {
      console.log('Received game state:', state) // Debug
      this.gameState = state
      
      // Find my player
      if (this.playerId && Array.isArray(state.players)) {
        this.myPlayer = state.players.find(p => p.id === this.playerId)
        console.log('My player:', this.myPlayer) // Debug
      }
      
      this.updateUI()
    })

    this.socket.on('playerAssigned', (data) => {
      this.playerId = data.playerId
      this.playerName = data.playerName
      this.isSpectator = data.isSpectator || false
      
      if (this.isSpectator) {
        console.log(`Joined as spectator: ${this.playerName}`)
        document.getElementById('gameInfo').textContent = '👁️ Spectating - Game is full'
      } else {
        console.log(`Assigned as Player: ${this.playerName}`)
        document.getElementById('scoreboard').style.display = 'block'
      }
    })

    this.socket.on('joinFailed', (data) => {
      alert(`Failed to join: ${data.reason}`)
    })

    this.socket.on('gameStarted', (data) => {
      console.log('Game started!', data.message)
    })

    this.socket.on('gameEnded', (data) => {
      console.log('Game ended:', data)
      // Store winner message to display on screen
      if (data.winner) {
        this.winnerMessage = data.message
        this.countdown = data.countdown || 5
        this.showWinnerMessage = true
        
        // Hide winner message after 5 seconds
        setTimeout(() => {
          this.showWinnerMessage = false
          this.winnerMessage = null
          this.countdown = null
        }, 5000)
      }
    })

    this.socket.on('gameRestarting', (data) => {
      console.log('Game restarting countdown:', data)
      // Update countdown display
      if (this.showWinnerMessage) {
        this.countdown = data.countdown
      }
    })

    this.socket.on('gameReset', (data) => {
      console.log('Game reset:', data.message)
    })

    this.socket.on('playerLeft', (data) => {
      console.log('Player left')
    })
  }

  setupInput() {
    // Handle keyboard input
    document.addEventListener('keydown', (e) => {
      console.log('Key pressed:', e.code) // Debug
      switch(e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.inputState.left = true
          break
        case 'ArrowRight':
        case 'KeyD':
          this.inputState.right = true
          break
        case 'ArrowUp':
        case 'KeyW':
          this.inputState.up = true
          break
        case 'ArrowDown':
        case 'KeyS':
          this.inputState.down = true
          break
        case 'KeyR':
          e.preventDefault()
          if (this.socket) {
            this.socket.emit('customEvent', 'resetGame', [])
          }
          break
      }
    })

    document.addEventListener('keyup', (e) => {
      switch(e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.inputState.left = false
          break
        case 'ArrowRight':
        case 'KeyD':
          this.inputState.right = false
          break
        case 'ArrowUp':
        case 'KeyW':
          this.inputState.up = false
          break
        case 'ArrowDown':
        case 'KeyS':
          this.inputState.down = false
          break
      }
    })

    // Send input to server (only if not spectator)
    setInterval(() => {
      if (this.playerId && this.myPlayer && !this.isSpectator) {
        // Debug: Log when input is being sent
        const hasInput = this.inputState.left || this.inputState.right || this.inputState.up || this.inputState.down
        if (hasInput) {
          console.log('Sending input:', this.inputState)
        }
        this.socket.emit('playerInput', this.inputState)
      }
    }, 1000 / 60) // 60 FPS input
  }

  update() {
    // Client-side prediction could go here
    // For now, just rely on server state
  }

  render() {
    const ctx = this.ctx
    
    // Clear canvas with black background FIRST
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 800, 600)
    
    // Then draw a test rectangle
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(10, 10, 50, 50)
    
    if (!this.gameState) {
      ctx.fillStyle = '#fff'
      ctx.font = '24px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Connecting...', 400, 300)
      return
    }

    const { players, blocks, collectibles, gameStarted } = this.gameState
    
    // Debug: Log game state to console (less frequently)
    if (Math.random() < 0.1) { // Only log 10% of the time to avoid spam
      console.log('Game state:', {
        players: players?.length || 0,
        blocks: blocks?.length || 0, 
        collectibles: collectibles?.length || 0,
        gameStarted,
        playerId: this.playerId,
        playerName: this.playerName
      })
    }

    // Draw background grid
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 1
    for (let x = 0; x < 800; x += 50) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 600)
      ctx.stroke()
    }
    for (let y = 0; y < 600; y += 50) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(800, y)
      ctx.stroke()
    }

    // Draw blocks (decorative/obstacles)
    if (blocks && Array.isArray(blocks)) {
      blocks.forEach(block => {
        ctx.fillStyle = block.color
        ctx.fillRect(block.x, block.y, block.width, block.height)
      })
    }

    // Draw collectibles
    if (collectibles && Array.isArray(collectibles)) {
      collectibles.forEach(collectible => {
        // Draw glow effect
        ctx.save()
        ctx.shadowColor = collectible.color
        ctx.shadowBlur = 20
        ctx.fillStyle = collectible.color
        ctx.beginPath()
        ctx.arc(collectible.x, collectible.y, collectible.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        
        // Draw sparkle effect
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(collectible.x, collectible.y, collectible.radius * 0.5, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // Draw players
    if (players && Array.isArray(players)) {
      players.forEach(player => {
        // Draw player shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.fillRect(
          player.x - player.width/2 + 2, 
          player.y - player.height/2 + 2, 
          player.width, 
          player.height
        )
        
        // Draw player body
        ctx.fillStyle = player.color
        ctx.fillRect(
          player.x - player.width/2, 
          player.y - player.height/2, 
          player.width, 
          player.height
        )
        
        // Highlight current player (not for spectators)
        if (player.id === this.playerId && !this.isSpectator) {
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.strokeRect(
            player.x - player.width/2 - 2, 
            player.y - player.height/2 - 2, 
            player.width + 4, 
            player.height + 4
          )
        }
        
        // Draw player name
        ctx.fillStyle = '#fff'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(player.name, player.x, player.y - player.height/2 - 10)
        
        // Draw score
        ctx.fillStyle = '#4CAF50'
        ctx.font = '10px Arial'
        ctx.fillText(`${player.score}pts`, player.x, player.y + player.height/2 + 20)
      })
    }

    // Draw game status
    if (!gameStarted) {
      ctx.fillStyle = '#fff'
      ctx.font = '20px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Waiting for players...', 400, 300)
    }
    
    // Scores moved to HTML UI - no longer drawn on canvas
    
    // Draw winner message overlay if game ended
    if (this.showWinnerMessage && this.winnerMessage) {
      // Draw semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(0, 0, 800, 600)
      
      // Draw winner message
      ctx.fillStyle = '#FFD700'
      ctx.font = 'bold 36px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('🏆 GAME OVER!', 400, 250)
      
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 24px Arial'
      ctx.fillText(this.winnerMessage, 400, 300)
      
      // Draw countdown with large number
      if (this.countdown !== null) {
        ctx.font = '18px Arial'
        ctx.fillStyle = '#ccc'
        ctx.fillText(`Game restarting in`, 400, 330)
        
        // Large countdown number
        ctx.font = 'bold 48px Arial'
        ctx.fillStyle = this.countdown <= 1 ? '#FF4444' : '#FFD700'
        ctx.fillText(this.countdown.toString(), 400, 380)
        
        ctx.font = '18px Arial'
        ctx.fillStyle = '#ccc'
        ctx.fillText('seconds...', 400, 410)
      } else {
        ctx.font = '18px Arial'
        ctx.fillStyle = '#ccc'
        ctx.fillText('Game restarting in 5 seconds...', 400, 350)
      }
    }
    
    // Debug: Draw a test rectangle to ensure rendering works
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(10, 10, 50, 50)
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
    const scoreboard = document.getElementById('scoreboard')
    
    if (!this.gameState) return

    const playerCount = Array.isArray(this.gameState.players) ? this.gameState.players.length : 0
    const spectatorCount = Array.isArray(this.gameState.spectators) ? this.gameState.spectators.length : 0
    
    // Show spectator status if user is spectating
    if (this.isSpectator) {
      gameInfo.textContent = `👁️ Spectating (${spectatorCount} spectators) - Game is full`
      scoreboard.style.display = 'block' // Show scoreboard for spectators too
    } else if (playerCount === 0) {
      gameInfo.textContent = 'Waiting for players...'
      scoreboard.style.display = 'none'
    } else if (playerCount === 1) {
      gameInfo.textContent = 'Waiting for more players...'
      scoreboard.style.display = 'none'
    } else if (this.gameState.gameStarted) {
      const spectatorText = spectatorCount > 0 ? ` (${spectatorCount} watching)` : ''
      gameInfo.textContent = `🏆 First to 100 points wins!${spectatorText}`
      scoreboard.style.display = 'block'
    } else {
      const spectatorText = spectatorCount > 0 ? ` (${spectatorCount} watching)` : ''
      gameInfo.textContent = `${playerCount} players ready${spectatorText}`
      scoreboard.style.display = 'block'
    }

    // Update scoreboard with current scores
    if (scoreList && Array.isArray(this.gameState.players) && playerCount > 0) {
      scoreList.innerHTML = this.gameState.players.map(player => {
        const isCurrentPlayer = player.id === this.playerId && !this.isSpectator
        
        return `<div class="score-entry ${isCurrentPlayer ? 'current-player' : ''}">
          ${player.name}: ${player.score}/100
        </div>`
      }).join('')
    }
  }
}

// Game automatically joins using TylerArcadePlayer system

// Start the game
window.game = new BlockGame()