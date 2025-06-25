import { CollisionDetection } from '@tyler-arcade/2d-physics'
import { BaseGame } from '@tyler-arcade/multiplayer'

/**
 * SnakeGame - Multiplayer Snake game for hub integration
 */
export class SnakeGame extends BaseGame {
  constructor() {
    super()
    this.name = 'Snake'
    this.description = 'Classic snake game - eat food, grow longer, avoid walls!'
    this.maxPlayers = 4
    this.gameState = new SnakeGameState()
    this.gameLoopInterval = null
    
    // Start game loop immediately
    this.startGameLoop()
  }

  /**
   * Handle a player trying to join Snake
   */
  handlePlayerJoin(socketId, playerName, roomId, socket) {
    console.log(`SnakeGame: ${playerName} wants to join room ${roomId}`)
    
    // Only handle snake room joins
    if (roomId !== 'snake') {
      console.log(`SnakeGame: Rejecting join for room ${roomId} (not snake)`)
      return {
        success: false,
        reason: 'Wrong room - this is Snake'
      }
    }
    
    if (this.gameState.players.length < this.maxPlayers) {
      const playerId = this.gameState.players.length + 1
      const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44']
      const startPositions = [
        {x: 100, y: 100},
        {x: 300, y: 100}, 
        {x: 100, y: 200},
        {x: 300, y: 200}
      ]
      
      const player = {
        id: socketId,
        name: playerName,
        playerId: playerId,
        color: colors[playerId - 1],
        snake: this.gameState.createSnake(startPositions[playerId - 1]),
        alive: true,
        score: 0
      }
      
      this.gameState.players.push(player)
      // Update parent class players array too
      this.players = this.gameState.players
      
      console.log(`${playerName} joined Snake as Player ${playerId}`)
      
      return {
        success: true,
        playerData: { playerId, playerName, color: player.color }
      }
    } else {
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
      this.gameState.setPlayerInput(player.playerId, input)
    }
  }

  /**
   * Handle custom events for Snake
   */
  handleCustomEvent(socketId, eventName, args, socket) {
    if (eventName === 'resetGame') {
      this.gameState.resetGame()
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
      
      // Broadcast game state to all Snake players
      this.broadcast('gameState', {
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
    }, 1000 / 10) // 10 FPS for Snake (slower than Pong)
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

// Snake game state class
class SnakeGameState {
  constructor() {
    this.players = []
    this.food = this.generateFood()
    this.gameStatus = 'waiting' // 'waiting', 'playing', 'ended'
    this.gridSize = 20
    this.canvasWidth = 400
    this.canvasHeight = 300
    this.moveTimer = 0
    this.moveInterval = 0.2 // Move every 200ms
  }

  createSnake(startPos) {
    return {
      body: [
        { x: startPos.x, y: startPos.y },
        { x: startPos.x - this.gridSize, y: startPos.y },
        { x: startPos.x - this.gridSize * 2, y: startPos.y }
      ],
      direction: { x: 1, y: 0 }, // Moving right initially
      nextDirection: { x: 1, y: 0 }
    }
  }

  generateFood() {
    const gridWidth = Math.floor(this.canvasWidth / this.gridSize)
    const gridHeight = Math.floor(this.canvasHeight / this.gridSize)
    
    return {
      x: Math.floor(Math.random() * gridWidth) * this.gridSize,
      y: Math.floor(Math.random() * gridHeight) * this.gridSize
    }
  }

  update(deltaTime) {
    if (this.players.length === 0) return
    
    // Start game if we have players and not already playing
    if (this.gameStatus === 'waiting' && this.players.length > 0) {
      this.gameStatus = 'playing'
    }
    
    if (this.gameStatus !== 'playing') return
    
    this.moveTimer += deltaTime
    
    if (this.moveTimer >= this.moveInterval) {
      this.moveTimer = 0
      this.moveSnakes()
      this.checkFoodCollision() // Check food BEFORE removing tails
      this.checkCollisions()
    }
  }

  moveSnakes() {
    this.players.forEach(player => {
      if (!player.alive) return
      
      const snake = player.snake
      
      // Update direction
      snake.direction = { ...snake.nextDirection }
      
      // Calculate new head position
      const head = snake.body[0]
      const newHead = {
        x: head.x + snake.direction.x * this.gridSize,
        y: head.y + snake.direction.y * this.gridSize
      }
      
      // Add new head
      snake.body.unshift(newHead)
      
      // Mark that tail needs to be removed (food collision will override this)
      snake.shouldRemoveTail = true
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
    
    // Check if game should end
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

  checkFoodCollision() {
    this.players.forEach(player => {
      if (!player.alive) return
      
      const snake = player.snake
      const head = snake.body[0]
      
      if (head.x === this.food.x && head.y === this.food.y) {
        // Snake ate food - don't remove tail (snake grows)
        snake.shouldRemoveTail = false
        
        // Increase score
        player.score += 10
        
        // Generate new food
        this.food = this.generateFood()
        
        console.log(`${player.name} ate food! Score: ${player.score}`)
      }
    })
    
    // Remove tails for snakes that didn't eat food
    this.players.forEach(player => {
      if (!player.alive) return
      
      const snake = player.snake
      if (snake.shouldRemoveTail) {
        snake.body.pop()
      }
    })
  }

  setPlayerInput(playerId, input) {
    const player = this.players.find(p => p.playerId === playerId)
    if (!player || !player.alive) return
    
    const snake = player.snake
    const currentDir = snake.direction
    
    // Prevent moving backwards
    if (input.up && currentDir.y === 0) {
      snake.nextDirection = { x: 0, y: -1 }
    } else if (input.down && currentDir.y === 0) {
      snake.nextDirection = { x: 0, y: 1 }
    } else if (input.left && currentDir.x === 0) {
      snake.nextDirection = { x: -1, y: 0 }
    } else if (input.right && currentDir.x === 0) {
      snake.nextDirection = { x: 1, y: 0 }
    }
  }

  resetGame() {
    const startPositions = [
      {x: 100, y: 100},
      {x: 300, y: 100}, 
      {x: 100, y: 200},
      {x: 300, y: 200}
    ]
    
    this.players.forEach((player, index) => {
      player.alive = true
      player.score = 0
      player.snake = this.createSnake(startPositions[index] || startPositions[0])
    })
    this.food = this.generateFood()
    this.gameStatus = 'playing' // Start playing immediately after reset
    console.log('Snake game reset!')
  }
}