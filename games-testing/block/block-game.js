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
    // Create some initial blocks
    for (let i = 0; i < 10; i++) {
      this.blocks.push({
        id: i,
        x: Math.random() * (this.gameWidth - 50),
        y: Math.random() * (this.gameHeight - 50),
        width: 50,
        height: 50,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      })
    }
    
    // Create collectibles
    for (let i = 0; i < 5; i++) {
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
      const player = {
        id: socketId,
        socketId: socketId,
        name: playerName,
        x: Math.random() * (this.gameWidth - 40) + 20,
        y: Math.random() * (this.gameHeight - 40) + 20,
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
        playerData: { playerId: socketId, playerName: player.name }
      }
    } else {
      return {
        success: false,
        reason: 'Block game is full'
      }
    }
  }

  /**
   * Handle a player leaving Block
   */
  handlePlayerLeave(socketId, player, socket) {
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
    }
  }

  /**
   * Handle player input for Block
   */
  handlePlayerInput(socketId, input, socket) {
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
    if (!this.gameStarted) return

    // Update players
    this.players.forEach(player => {
      // Update position
      player.x += player.velocityX * deltaTime
      player.y += player.velocityY * deltaTime
      
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
          
          console.log(`${player.name} collected item for ${collectible.points} points!`)
        }
      })
    })

    // Broadcast game state to all clients
    this.broadcast('gameState', this.getGameStateForClient())
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
   * Spawn a collectible
   */
  spawnCollectible() {
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
   * Reset game
   */
  resetGame() {
    this.players.forEach(player => {
      player.x = Math.random() * (this.gameWidth - 40) + 20
      player.y = Math.random() * (this.gameHeight - 40) + 20
      player.velocityX = 0
      player.velocityY = 0
      player.score = 0
    })
    
    this.scoreManager.reset()
    this.collectibles = []
    
    for (let i = 0; i < 5; i++) {
      this.spawnCollectible()
    }
    
    this.broadcast('gameReset', { message: 'Game has been reset!' })
  }

  /**
   * Get game state for clients
   */
  getGameStateForClient() {
    return {
      players: this.players,
      blocks: this.blocks,
      collectibles: this.collectibles,
      gameStarted: this.gameStarted,
      gameWidth: this.gameWidth,
      gameHeight: this.gameHeight,
      scores: this.scoreManager.getAllScores(),
      leaderboard: this.scoreManager.getLeaderboard()
    }
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