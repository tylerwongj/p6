import { BaseGame } from '@tyler-arcade/multiplayer'
import { TurnManager, ScoreManager } from '@tyler-arcade/game-state'

/**
 * BlockGame - Template game using Tyler Arcade packages
 */
export class BlockGame extends BaseGame {
  constructor() {
    super()
    this.name = 'Block'
    this.description = 'A template block-based multiplayer game'
    this.maxPlayers = 4
    this.spectators = []
    
    // Game state
    this.players = []
    this.gameStarted = false
    this.gameWidth = 800
    this.gameHeight = 600
    
    // Game-specific state
    this.blocks = []
    this.collectibles = []
    
    // Initialize game managers
    this.turnManager = new TurnManager([])
    this.scoreManager = new ScoreManager([])
    
    this.initializeGame()
  }

  /**
   * Initialize game world
   */
  initializeGame() {
    // Create collision blocks (doubled from 10 to 20)
    for (let i = 0; i < 20; i++) {
      this.blocks.push({
        id: i,
        x: Math.random() * (this.gameWidth - 50),
        y: Math.random() * (this.gameHeight - 50),
        width: 50,
        height: 50,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      })
    }
    
    // Create collectibles (8 yellow balls)
    for (let i = 0; i < 8; i++) {
      this.spawnCollectible()
    }
  }

  /**
   * Handle a player trying to join Block
   */
  handlePlayerJoin(socketId, playerName, roomId, socket) {
    console.log(`BlockGame: ${playerName} wants to join room ${roomId}`)
    
    // Only handle block room joins
    if (roomId !== 'block') {
      console.log(`BlockGame: Rejecting join for room ${roomId} (not block)`)
      return {
        success: false,
        reason: 'Wrong room - this is Block'
      }
    }
    
    if (this.players.length < this.maxPlayers) {
      // Find a safe spawn position for the player (away from blocks and other players)
      const spawnPos = this.findSafeSpawnPosition()
      
      const player = {
        id: socketId,
        socketId: socketId,
        name: playerName,
        x: spawnPos.x,
        y: spawnPos.y,
        width: 30,
        height: 30,
        color: `hsl(${this.players.length * 90}, 80%, 60%)`,
        score: 0,
        velocityX: 0,
        velocityY: 0,
        speed: 200
      }
      
      this.players.push(player)
      
      // Update managers
      this.turnManager.setPlayers(this.players)
      this.scoreManager.addPlayer(player)
      
      console.log(`${playerName} joined Block as Player ${this.players.length}`)
      
      // Start game if we have enough players
      if (this.players.length >= 2 && !this.gameStarted) {
        this.gameStarted = true
        this.broadcast('gameStarted', { message: 'Game has started!' })
      }
      
      return {
        success: true,
        playerData: { playerId: socketId, playerName: player.name, isPlayer: true }
      }
    } else {
      // Game is full, add as spectator
      const spectator = {
        id: socketId,
        name: playerName,
        isSpectator: true
      }
      
      this.spectators.push(spectator)
      console.log(`${playerName} joined Block as spectator`)
      
      return {
        success: true,
        playerData: { playerId: socketId, playerName: spectator.name, isSpectator: true }
      }
    }
  }

  /**
   * Handle a player leaving Block
   */
  handlePlayerLeave(socketId, player, socket) {
    // Check if leaving player is an active player
    const playerIndex = this.players.findIndex(p => p.id === socketId)
    if (playerIndex !== -1) {
      const leavingPlayer = this.players[playerIndex]
      this.players.splice(playerIndex, 1)
      
      // Update managers
      this.turnManager.setPlayers(this.players)
      this.scoreManager.removePlayer(leavingPlayer)
      
      console.log(`${leavingPlayer.name} left Block`)
      
      // End game if not enough players
      if (this.players.length < 2) {
        this.gameStarted = false
        this.broadcast('gameEnded', { reason: 'Not enough players' })
      }
    } else {
      // Check if leaving player is a spectator
      const spectatorIndex = this.spectators.findIndex(s => s.id === socketId)
      if (spectatorIndex !== -1) {
        const leavingSpectator = this.spectators[spectatorIndex]
        this.spectators.splice(spectatorIndex, 1)
        console.log(`${leavingSpectator.name} (spectator) left Block`)
      }
    }
  }

  /**
   * Handle player input for Block
   */
  handlePlayerInput(socketId, input, socket) {
    // Only active players can provide input, not spectators
    const player = this.players.find(p => p.id === socketId)
    if (player && this.gameStarted) {
      this.setPlayerInput(player, input)
    }
  }

  /**
   * Handle custom events for Block
   */
  handleCustomEvent(socketId, eventName, args, socket) {
    console.log(`🎮 Block Game: Handling custom event '${eventName}' from ${socketId}`)
    
    switch (eventName) {
      case 'resetGame':
        this.resetGame()
        break
      case 'spawnCollectible':
        this.spawnCollectible()
        break
    }
  }

  /**
   * Update game state (called by unified server at 60 FPS)
   */
  update(deltaTime) {
    if (!this.gameStarted) {
      return
    }

    // Update players
    this.players.forEach(player => {
      // Calculate new position
      const newX = player.x + player.velocityX * deltaTime
      const newY = player.y + player.velocityY * deltaTime
      
      // Check collision with blocks and other players before moving
      if (!this.checkBlockCollision(newX, player.y, player) && !this.checkPlayerCollision(newX, player.y, player)) {
        player.x = newX
      } else {
        player.velocityX = 0 // Stop horizontal movement on collision
      }
      
      if (!this.checkBlockCollision(player.x, newY, player) && !this.checkPlayerCollision(player.x, newY, player)) {
        player.y = newY
      } else {
        player.velocityY = 0 // Stop vertical movement on collision
      }
      
      // Keep players in bounds
      player.x = Math.max(player.width/2, Math.min(this.gameWidth - player.width/2, player.x))
      player.y = Math.max(player.height/2, Math.min(this.gameHeight - player.height/2, player.y))
      
      // Apply friction
      player.velocityX *= 0.9
      player.velocityY *= 0.9
      
      // Check collectible collisions
      this.collectibles.forEach((collectible, index) => {
        const dx = player.x - collectible.x
        const dy = player.y - collectible.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < player.width/2 + collectible.radius) {
          // Player collected item
          this.scoreManager.addPoints(player.socketId, collectible.points)
          player.score = this.scoreManager.getScore(player.socketId)
          this.collectibles.splice(index, 1)
          
          // Spawn new collectible
          this.spawnCollectible()
          
          console.log(`${player.name} collected item for ${collectible.points} points! Total: ${player.score}`)
          
          // Check for winner (100 points)
          if (player.score >= 100) {
            this.endGame(player)
            return
          }
        }
      })
    })

    // Broadcast game state to all clients (only during active gameplay)
    this.broadcast('gameState', this.getGameStateForClient())
  }

  /**
   * Check collision between player and blocks
   */
  checkBlockCollision(playerX, playerY, player) {
    const playerLeft = playerX - player.width/2
    const playerRight = playerX + player.width/2
    const playerTop = playerY - player.height/2
    const playerBottom = playerY + player.height/2
    
    for (const block of this.blocks) {
      const blockLeft = block.x
      const blockRight = block.x + block.width
      const blockTop = block.y
      const blockBottom = block.y + block.height
      
      // Check if rectangles overlap
      if (playerLeft < blockRight && 
          playerRight > blockLeft && 
          playerTop < blockBottom && 
          playerBottom > blockTop) {
        return true // Collision detected
      }
    }
    return false // No collision
  }

  /**
   * Check collision between player and other players
   */
  checkPlayerCollision(playerX, playerY, currentPlayer) {
    const playerLeft = playerX - currentPlayer.width/2
    const playerRight = playerX + currentPlayer.width/2
    const playerTop = playerY - currentPlayer.height/2
    const playerBottom = playerY + currentPlayer.height/2
    
    for (const otherPlayer of this.players) {
      // Skip collision check with self
      if (otherPlayer.id === currentPlayer.id) {
        continue
      }
      
      const otherLeft = otherPlayer.x - otherPlayer.width/2
      const otherRight = otherPlayer.x + otherPlayer.width/2
      const otherTop = otherPlayer.y - otherPlayer.height/2
      const otherBottom = otherPlayer.y + otherPlayer.height/2
      
      // Check if rectangles overlap
      if (playerLeft < otherRight && 
          playerRight > otherLeft && 
          playerTop < otherBottom && 
          playerBottom > otherTop) {
        return true // Collision detected
      }
    }
    return false // No collision
  }

  /**
   * Set player input
   */
  setPlayerInput(player, input) {
    const acceleration = player.speed * 3

    if (input.left) {
      player.velocityX -= acceleration * 0.016
    }
    if (input.right) {
      player.velocityX += acceleration * 0.016
    }
    if (input.up) {
      player.velocityY -= acceleration * 0.016
    }
    if (input.down) {
      player.velocityY += acceleration * 0.016
    }
    
    // Limit velocity
    const maxSpeed = player.speed
    const speed = Math.sqrt(player.velocityX * player.velocityX + player.velocityY * player.velocityY)
    if (speed > maxSpeed) {
      player.velocityX = (player.velocityX / speed) * maxSpeed
      player.velocityY = (player.velocityY / speed) * maxSpeed
    }
  }

  /**
   * Find a safe spawn position for players (away from blocks and other players)
   */
  findSafeSpawnPosition() {
    let attempts = 0
    const maxAttempts = 100 // More attempts for player spawning
    
    while (attempts < maxAttempts) {
      const x = Math.random() * (this.gameWidth - 60) + 30 // Account for player size
      const y = Math.random() * (this.gameHeight - 60) + 30
      
      // Check if this position overlaps with any block
      const overlapsBlock = this.blocks.some(block => {
        const playerSize = 30 // Player is 30x30
        const blockSize = Math.max(block.width, block.height)
        const minDistance = Math.max(50, blockSize) // Minimum 50px distance
        
        const playerLeft = x - minDistance
        const playerRight = x + minDistance
        const playerTop = y - minDistance
        const playerBottom = y + minDistance
        
        const blockLeft = block.x
        const blockRight = block.x + block.width
        const blockTop = block.y
        const blockBottom = block.y + block.height
        
        return playerLeft < blockRight && 
               playerRight > blockLeft && 
               playerTop < blockBottom && 
               playerBottom > blockTop
      })
      
      // Check if this position overlaps with any existing player
      const overlapsPlayer = this.players.some(existingPlayer => {
        const distance = Math.sqrt((x - existingPlayer.x) ** 2 + (y - existingPlayer.y) ** 2)
        return distance < 60 // 60px minimum distance between players
      })
      
      if (!overlapsBlock && !overlapsPlayer) {
        return { x, y }
      }
      
      attempts++
    }
    
    // Fallback to center if we can't find a good spot
    return { 
      x: this.gameWidth / 2, 
      y: this.gameHeight / 2 
    }
  }

  /**
   * Spawn a collectible OUTSIDE collision blocks and away from players
   */
  spawnCollectible() {
    let attempts = 0
    const maxAttempts = 50
    
    while (attempts < maxAttempts) {
      const x = Math.random() * (this.gameWidth - 40) + 20
      const y = Math.random() * (this.gameHeight - 40) + 20
      
      // Check if this position overlaps with any block (using larger object size)
      const overlapsBlock = this.blocks.some(block => {
        const collectibleRadius = 10
        const blockSize = Math.max(block.width, block.height) // Use larger dimension
        const minDistance = Math.max(50, blockSize) // Minimum 50px as requested
        
        const collectibleLeft = x - minDistance
        const collectibleRight = x + minDistance
        const collectibleTop = y - minDistance
        const collectibleBottom = y + minDistance
        
        const blockLeft = block.x
        const blockRight = block.x + block.width
        const blockTop = block.y
        const blockBottom = block.y + block.height
        
        // Check if collectible (with proper spacing) overlaps with block rectangle
        return collectibleLeft < blockRight && 
               collectibleRight > blockLeft && 
               collectibleTop < blockBottom && 
               collectibleBottom > blockTop
      })
      
      // Check if this position overlaps with any player (using larger object size)
      const overlapsPlayer = this.players.some(player => {
        const collectibleRadius = 10
        const playerSize = Math.max(player.width, player.height) // Use larger dimension
        const minDistance = Math.max(50, playerSize) // Minimum 50px to match block spacing
        
        const distance = Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2)
        return distance < minDistance
      })
      
      if (!overlapsBlock && !overlapsPlayer) {
        // Found a good spot outside blocks and away from players
        this.collectibles.push({
          id: Date.now() + Math.random(),
          x: x,
          y: y,
          radius: 10,
          color: '#FFD700',
          points: 10
        })
        return
      }
      
      attempts++
    }
    
    // Fallback if we can't find a spot (shouldn't happen with reasonable block density)
    this.collectibles.push({
      id: Date.now() + Math.random(),
      x: Math.random() * (this.gameWidth - 40) + 20,
      y: Math.random() * (this.gameHeight - 40) + 20,
      radius: 10,
      color: '#FFD700',
      points: 10
    })
  }

  /**
   * End game when someone reaches 100 points
   */
  endGame(winner) {
    this.gameStarted = false
    
    // Broadcast game ended with winner
    this.broadcast('gameEnded', {
      winner: winner.name,
      score: winner.score,
      message: `🏆 ${winner.name} wins with ${winner.score} points!`,
      countdown: 5
    })
    
    console.log(`Block Game ended! Winner: ${winner.name} with ${winner.score} points`)
    
    // Countdown timer for restart
    let countdown = 4
    const countdownInterval = setInterval(() => {
      this.broadcast('gameRestarting', {
        winner: winner.name,
        score: winner.score,
        message: `🏆 ${winner.name} wins with ${winner.score} points!`,
        countdown: countdown
      })
      
      countdown--
      
      if (countdown < 0) {
        clearInterval(countdownInterval)
      }
    }, 1000)
    
    // Reset game after 5 seconds
    setTimeout(() => {
      this.resetGame()
    }, 5000)
  }

  /**
   * Reset game completely
   */
  resetGame() {
    // Reset all player states and respawn safely
    this.players.forEach(player => {
      const safePos = this.findSafeSpawnPosition()
      player.x = safePos.x
      player.y = safePos.y
      player.velocityX = 0
      player.velocityY = 0
      player.score = 0
    })
    
    // Reset score manager
    this.scoreManager.reset()
    
    // Clear and regenerate blocks
    this.blocks = []
    for (let i = 0; i < 20; i++) {
      this.blocks.push({
        id: i,
        x: Math.random() * (this.gameWidth - 50),
        y: Math.random() * (this.gameHeight - 50),
        width: 50,
        height: 50,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      })
    }
    
    // Clear and respawn collectibles (8 like original)
    this.collectibles = []
    for (let i = 0; i < 8; i++) {
      this.spawnCollectible()
    }
    
    // Restart game if we have enough players
    if (this.players.length >= 2) {
      this.gameStarted = true
    }
    
    this.broadcast('gameReset', { message: 'Game completely reset! New blocks and positions!' })
  }

  /**
   * Get game state for clients
   */
  getGameStateForClient() {
    const state = {
      players: this.players,
      spectators: this.spectators,
      blocks: this.blocks,
      collectibles: this.collectibles,
      gameStarted: this.gameStarted,
      gameWidth: this.gameWidth,
      gameHeight: this.gameHeight,
      scores: this.scoreManager.getAllScores(),
      leaderboard: this.scoreManager.getLeaderboard()
    }
    
    // Debug logging removed to prevent spam
    
    return state
  }

  /**
   * Override getPlayerCount to use our players array
   */
  getPlayerCount() {
    return this.players.length
  }

  /**
   * Override getStatus based on players and game state
   */
  getStatus() {
    if (this.players.length >= this.maxPlayers) {
      return 'full'
    }
    if (this.gameStarted) {
      return 'in_progress'
    }
    if (this.players.length > 0) {
      return 'waiting'
    }
    return 'available'
  }
}