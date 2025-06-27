import { CollisionDetection } from '@tyler-arcade/2d-physics'
import { BaseGame } from '@tyler-arcade/multiplayer'

/**
 * SnakeGame - Simplified multiplayer Snake game
 */
export class SnakeGame extends BaseGame {
  constructor() {
    super()
    this.name = 'Snake'
    this.description = 'Classic snake game - eat food, grow longer, avoid walls!'
    this.maxPlayers = 4
    this.spectators = []
    this.gameState = new SnakeGameState()
    this.multiplayerServer = null // Will be set by server
    this.lastUpdateTime = 0
    this.updateInterval = 1000 / 16.5 // 16.5 FPS for Snake movement (10% faster than 15)
  }
  
  /**
   * Set reference to the multiplayer server for broadcasting
   */
  setMultiplayerServer(server) {
    this.multiplayerServer = server
    console.log('SnakeGame: Multiplayer server reference set')
  }

  /**
   * Handle a player trying to join Snake
   */
  handlePlayerJoin(socketId, playerName, roomId, socket) {
    console.log(`🐍 SnakeGame: ${playerName} (${socketId}) wants to join room ${roomId}`)
    
    // Only handle snake room joins
    if (roomId !== 'snake') {
      console.log(`❌ SnakeGame: Rejecting join for room ${roomId} (not snake)`)
      return {
        success: false,
        reason: 'Wrong room - this is Snake'
      }
    }
    
    // Check if player already exists
    const existingPlayer = this.gameState.players.find(p => p.id === socketId)
    if (existingPlayer) {
      console.log(`⚠️ SnakeGame: Player ${socketId} already exists, updating...`)
      existingPlayer.name = playerName
      return {
        success: true,
        playerData: { 
          playerId: existingPlayer.playerId, 
          playerName: existingPlayer.name, 
          color: existingPlayer.color 
        }
      }
    }
    
    if (this.gameState.players.length < this.maxPlayers) {
      const playerId = this.gameState.players.length + 1
      const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44']
      
      const player = {
        id: socketId,
        name: playerName,
        playerId: playerId,
        color: colors[playerId - 1],
        snake: this.gameState.createSnake(playerId),
        alive: true,
        score: 0
      }
      
      this.gameState.players.push(player)
      // Update parent class players array too
      this.players = this.gameState.players
      
      console.log(`✅ ${playerName} joined Snake as Player ${playerId}. Total players: ${this.gameState.players.length}`)
      console.log(`🎮 Game status: ${this.gameState.gameStatus}`)
      
      // Immediately send game state to new player
      if (this.multiplayerServer) {
        console.log(`📤 Sending immediate game state to new player ${socketId}`)
        this.multiplayerServer.sendToClient(socketId, 'gameState', {
          players: this.gameState.players.map(p => ({
            id: p.id,
            name: p.name,
            playerId: p.playerId,
            color: p.color,
            snake: p.snake,
            alive: p.alive,
            score: p.score
          })),
          food: this.gameState.food,
          gameStatus: this.gameState.gameStatus
        })
      }
      
      return {
        success: true,
        playerData: { playerId, playerName, color: player.color }
      }
    } else {
      console.log(`❌ SnakeGame: Game full (${this.gameState.players.length}/${this.maxPlayers})`)
      return {
        success: false,
        reason: 'Snake game is full (max 4 players)'
      }
    }
  }

  /**
   * Handle a player leaving Snake
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
      
      console.log(`${leavingPlayer.name} left Snake`)
    }
  }

  /**
   * Handle player input for Snake
   */
  handlePlayerInput(socketId, input, socket) {
    const player = this.gameState.players.find(p => p.id === socketId)
    if (player && player.alive) {
      this.gameState.setPlayerDirection(player.playerId, input)
    }
  }

  /**
   * Handle custom events for Snake
   */
  handleCustomEvent(socketId, eventName, args, socket) {
    console.log(`SnakeGame: Received custom event '${eventName}' from ${socketId}`)
    if (eventName === 'resetGame') {
      console.log('SnakeGame: Resetting game!')
      this.gameState.resetGame()
    }
  }

  /**
   * Update method called by unified server's game loop (60 FPS)
   * We throttle to 10 FPS for Snake movement
   */
  update(deltaTime) {
    this.lastUpdateTime += deltaTime * 1000 // Convert to milliseconds
    
    if (this.lastUpdateTime >= this.updateInterval) {
      this.lastUpdateTime = 0
      this.gameState.update(deltaTime)
      
      // Broadcast game state to all Snake players
      if (this.multiplayerServer) {
        this.multiplayerServer.broadcastToRoom('snake', 'gameState', {
          players: this.gameState.players.map(p => ({
            id: p.id,
            name: p.name,
            playerId: p.playerId,
            color: p.color,
            snake: p.snake,
            alive: p.alive,
            score: p.score
          })),
          food: this.gameState.food,
          gameStatus: this.gameState.gameStatus
        })
      }
    }
  }

  /**
   * Override getPlayerCount to use game state
   */
  getPlayerCount() {
    return this.gameState.players.length
  }

  /**
   * Stop the game - cleanup method
   */
  stop() {
    console.log('SnakeGame: Stopping game')
    this.gameState.players = []
    this.players = []
  }
}

// Simple Snake game state class
class SnakeGameState {
  constructor() {
    this.players = []
    this.gameStatus = 'waiting' // 'waiting', 'playing', 'ended'
    this.gridSize = 20
    this.canvasWidth = 400
    this.canvasHeight = 300
    this.moveTimer = 0
    this.moveInterval = 1000 / 16.5 / 1000 // Move at 16.5 FPS (~61ms)
    this.maxDirectionQueue = 2 // Configurable: can be set to 2 or 3
    this.food = this.generateFood() // Generate food after other properties are set
  }

  createSnake(playerId) {
    // Grid-aligned starting positions with proper vertical spacing (2 grid gaps minimum)
    const startPositions = [
      {x: 100, y: 60},  // Player 1 - left side, top
      {x: 300, y: 120}, // Player 2 - right side, middle-top  
      {x: 100, y: 180}, // Player 3 - left side, middle-bottom
      {x: 300, y: 240}  // Player 4 - right side, bottom
    ]
    
    const startPos = startPositions[playerId - 1] || startPositions[0]
    
    // Right-side players (2 & 4) start facing left, left-side players (1 & 3) face right
    const isRightSide = playerId === 2 || playerId === 4
    
    let body, direction
    
    if (isRightSide) {
      // Right-side snakes: head on left, body extends right, moving left
      body = [
        { x: startPos.x, y: startPos.y },
        { x: startPos.x + this.gridSize, y: startPos.y },
        { x: startPos.x + this.gridSize * 2, y: startPos.y }
      ]
      direction = { x: -1, y: 0 } // Moving left
    } else {
      // Left-side snakes: head on right, body extends left, moving right
      body = [
        { x: startPos.x, y: startPos.y },
        { x: startPos.x - this.gridSize, y: startPos.y },
        { x: startPos.x - this.gridSize * 2, y: startPos.y }
      ]
      direction = { x: 1, y: 0 } // Moving right
    }
    
    return {
      body: body,
      direction: direction,
      directionQueue: [] // Queue to store rapid direction changes
    }
  }

  generateFood() {
    const gridWidth = Math.floor(this.canvasWidth / this.gridSize)
    const gridHeight = Math.floor(this.canvasHeight / this.gridSize)
    
    // Generate food position, ensuring it doesn't spawn on any snake
    let attempts = 0
    let foodPos
    
    do {
      foodPos = {
        x: Math.floor(Math.random() * gridWidth) * this.gridSize,
        y: Math.floor(Math.random() * gridHeight) * this.gridSize
      }
      attempts++
      
      // Prevent infinite loop in rare cases
      if (attempts > 100) break
      
    } while (this.isFoodOnSnake(foodPos))
    
    console.log(`Food generated at (${foodPos.x}, ${foodPos.y}) after ${attempts} attempts`)
    return foodPos
  }
  
  isFoodOnSnake(foodPos) {
    // Check if food position overlaps with any snake body segment
    for (const player of this.players) {
      if (!player.alive || !player.snake) continue
      
      for (const segment of player.snake.body) {
        if (segment.x === foodPos.x && segment.y === foodPos.y) {
          return true
        }
      }
    }
    return false
  }

  update(deltaTime) {
    if (this.players.length === 0) return
    
    // Start game if we have players
    if (this.gameStatus === 'waiting' && this.players.length > 0) {
      this.gameStatus = 'playing'
    }
    
    if (this.gameStatus !== 'playing') return
    
    this.moveTimer += deltaTime
    
    if (this.moveTimer >= this.moveInterval) {
      this.moveTimer = 0
      this.moveSnakes()
      this.checkCollisions()
    }
  }

  moveSnakes() {
    this.players.forEach(player => {
      if (!player.alive) return
      
      const snake = player.snake
      
      // Process next direction from queue if available
      if (snake.directionQueue.length > 0) {
        const nextDir = snake.directionQueue.shift() // Remove first direction from queue
        snake.direction = nextDir
      }
      
      // Calculate new head position
      const head = snake.body[0]
      const newHead = {
        x: head.x + snake.direction.x * this.gridSize,
        y: head.y + snake.direction.y * this.gridSize
      }
      
      // Add new head
      snake.body.unshift(newHead)
      
      // Check if snake ate food
      let ateFood = false
      if (newHead.x === this.food.x && newHead.y === this.food.y) {
        ateFood = true
        player.score += 10
        this.food = this.generateFood()
        console.log(`${player.name} ate food! Score: ${player.score}`)
      }
      
      // Remove tail only if didn't eat food
      if (!ateFood) {
        snake.body.pop()
      }
    })
  }

  checkCollisions() {
    this.players.forEach(player => {
      if (!player.alive) return
      
      const snake = player.snake
      const head = snake.body[0]
      
      // Wall collision
      if (head.x < 0 || head.x >= this.canvasWidth || 
          head.y < 0 || head.y >= this.canvasHeight) {
        player.alive = false
        console.log(`${player.name} hit a wall!`)
        return
      }
      
      // Self collision
      for (let i = 1; i < snake.body.length; i++) {
        if (head.x === snake.body[i].x && head.y === snake.body[i].y) {
          player.alive = false
          console.log(`${player.name} hit themselves!`)
          return
        }
      }
      
      // Other snake collision
      this.players.forEach(otherPlayer => {
        if (otherPlayer.id === player.id || !otherPlayer.alive) return
        
        otherPlayer.snake.body.forEach(segment => {
          if (head.x === segment.x && head.y === segment.y) {
            player.alive = false
            console.log(`${player.name} hit ${otherPlayer.name}!`)
          }
        })
      })
    })
    
    // Check if game should end and auto-restart
    const alivePlayers = this.players.filter(p => p.alive)
    if (alivePlayers.length <= 1 && this.players.length > 1 && this.gameStatus !== 'ended') {
      this.gameStatus = 'ended'
      console.log('Snake game ended!')
      
      // Auto-restart after 3 seconds
      setTimeout(() => {
        if (this.players.length > 0) {
          this.resetGame()
        }
      }, 3000)
    }
  }

  setPlayerDirection(playerId, input) {
    const player = this.players.find(p => p.playerId === playerId)
    if (!player || !player.alive) return
    
    const snake = player.snake
    
    // Get the last direction in queue, or current direction if queue is empty
    const lastDir = snake.directionQueue.length > 0 
      ? snake.directionQueue[snake.directionQueue.length - 1] 
      : snake.direction
    
    let newDirection = null
    
    // Prevent moving backwards relative to the last direction
    if (input.up && lastDir.y === 0) {
      newDirection = { x: 0, y: -1 }
    } else if (input.down && lastDir.y === 0) {
      newDirection = { x: 0, y: 1 }
    } else if (input.left && lastDir.x === 0) {
      newDirection = { x: -1, y: 0 }
    } else if (input.right && lastDir.x === 0) {
      newDirection = { x: 1, y: 0 }
    }
    
    // Add to queue if it's a valid new direction and not the same as the last queued direction
    if (newDirection && 
        (snake.directionQueue.length === 0 || 
         (lastDir.x !== newDirection.x || lastDir.y !== newDirection.y))) {
      
      // Limit queue size to prevent spam (configurable max directions ahead)
      if (snake.directionQueue.length < this.maxDirectionQueue) {
        snake.directionQueue.push(newDirection)
        console.log(`${player.name} queued direction: ${newDirection.x},${newDirection.y}. Queue length: ${snake.directionQueue.length}`)
      }
    }
  }

  resetGame() {
    console.log('Resetting Snake game...')
    
    this.players.forEach((player, index) => {
      player.alive = true
      player.score = 0
      player.snake = this.createSnake(player.playerId)
      // Clear any queued directions
      player.snake.directionQueue = []
    })
    
    this.food = this.generateFood()
    this.gameStatus = 'playing'
    
    console.log('Snake game reset complete!')
  }
}