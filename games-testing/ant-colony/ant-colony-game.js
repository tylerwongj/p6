import { BaseGame } from '@tyler-arcade/multiplayer'

export class AntColonyGame extends BaseGame {
  constructor() {
    super()
    this.name = 'Ant Colony'
    this.description = 'Click to create ant trails and build your colony'
    this.maxPlayers = 4
    this.spectators = []
    
    // Game state
    this.ants = []
    this.trails = []
    this.food = []
    this.colonies = new Map()
    this.gameStarted = false
    this.gameWidth = 800
    this.gameHeight = 600
    this.lastAntId = 0
    this.lastTrailId = 0
    this.lastFoodId = 0
    
    // Game settings
    this.antSpeed = 50 // pixels per second
    this.maxAntsPerPlayer = 20
    this.foodSpawnRate = 0.3 // food spawns per second
    this.trailDecayRate = 0.1 // trail strength decay per second
    
    this.generateInitialFood()
    setInterval(() => this.spawnRandomFood(), 3000) // Spawn food every 3 seconds
  }

  handlePlayerJoin(socketId, playerName, roomId, socket) {
    if (roomId !== 'ant-colony') {
      return { success: false, reason: 'Wrong room - this is Ant Colony' }
    }

    if (this.players.length >= this.maxPlayers) {
      return { success: false, reason: 'Game is full (max 4 players)' }
    }

    // Create player colony
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
    const spawnPositions = [
      { x: 100, y: 100 },
      { x: 700, y: 100 },
      { x: 100, y: 500 },
      { x: 700, y: 500 }
    ]

    const playerId = this.players.length
    const player = {
      id: socketId,
      name: playerName,
      playerId: playerId,
      score: 0,
      color: colors[playerId % colors.length],
      antCount: 0,
      foodCollected: 0
    }

    // Create colony
    const spawnPos = spawnPositions[playerId % spawnPositions.length]
    this.colonies.set(socketId, {
      playerId: playerId,
      x: spawnPos.x,
      y: spawnPos.y,
      radius: 30,
      color: player.color,
      foodStored: 0,
      health: 100
    })

    this.players.push(player)

    // Auto-start game when 2+ players join
    if (this.players.length >= 2 && !this.gameStarted) {
      this.gameStarted = true
      this.broadcast('gameStarted', { message: 'Ant Colony expansion begins!' })
    }

    return {
      success: true,
      playerData: { playerId: playerId, playerName: playerName }
    }
  }

  handlePlayerLeave(socketId, player, socket) {
    // Remove player's ants and colony
    this.ants = this.ants.filter(ant => ant.playerId !== player.playerId)
    this.colonies.delete(socketId)
    
    const playerIndex = this.players.findIndex(p => p.id === socketId)
    if (playerIndex !== -1) {
      this.players.splice(playerIndex, 1)
    }

    // End game if too few players
    if (this.players.length < 2) {
      this.gameStarted = false
    }
  }

  handleCustomEvent(socketId, eventName, args, socket) {
    const player = this.players.find(p => p.id === socketId)
    if (!player) return

    switch (eventName) {
      case 'startGame':
        if (!this.gameStarted && this.players.length >= 1) {
          this.gameStarted = true
          this.broadcast('gameStarted', { message: 'Ant Colony expansion begins!' })
        }
        break
      case 'spawnAntTrail':
        this.spawnAntTrail(player.playerId, args.x, args.y)
        break
      case 'commandAnts':
        this.commandAnts(player.playerId, args.x, args.y)
        break
    }
  }

  spawnAntTrail(playerId, targetX, targetY) {
    if (!this.gameStarted) return

    const player = this.players[playerId]
    if (!player) return

    // Limit ants per player
    const playerAntCount = this.ants.filter(ant => ant.playerId === playerId).length
    if (playerAntCount >= this.maxAntsPerPlayer) return

    const colony = this.colonies.get(player.id)
    if (!colony) return

    // Create trail of ants from colony to target
    const distance = Math.sqrt((targetX - colony.x) ** 2 + (targetY - colony.y) ** 2)
    const antCount = Math.min(5, Math.floor(distance / 50)) // 1 ant per 50 pixels

    for (let i = 0; i < antCount; i++) {
      const progress = (i + 1) / (antCount + 1)
      const startX = colony.x + (targetX - colony.x) * progress * 0.2 // Start 20% along path
      const startY = colony.y + (targetY - colony.y) * progress * 0.2

      const ant = {
        id: ++this.lastAntId,
        playerId: playerId,
        x: startX,
        y: startY,
        targetX: targetX,
        targetY: targetY,
        color: player.color,
        state: 'moving', // moving, gathering, returning
        carryingFood: null,
        speed: this.antSpeed + Math.random() * 20 - 10, // Slight speed variation
        trailStrength: 1.0,
        lastTrailTime: Date.now()
      }

      this.ants.push(ant)
    }

    player.antCount = this.ants.filter(ant => ant.playerId === playerId).length
  }

  commandAnts(playerId, targetX, targetY) {
    // Command existing ants to move to new location
    const playerAnts = this.ants.filter(ant => ant.playerId === playerId)
    
    playerAnts.forEach(ant => {
      ant.targetX = targetX
      ant.targetY = targetY
      ant.state = 'moving'
    })
  }

  generateInitialFood() {
    // Generate food sources around the map
    for (let i = 0; i < 15; i++) {
      this.spawnRandomFood()
    }
  }

  spawnRandomFood() {
    const food = {
      id: ++this.lastFoodId,
      x: Math.random() * (this.gameWidth - 100) + 50,
      y: Math.random() * (this.gameHeight - 100) + 50,
      type: Math.random() < 0.7 ? 'small' : 'large',
      amount: Math.random() < 0.7 ? 10 : 25,
      radius: Math.random() < 0.7 ? 8 : 15
    }

    // Don't spawn too close to colonies
    let tooClose = false
    for (const colony of this.colonies.values()) {
      const dist = Math.sqrt((food.x - colony.x) ** 2 + (food.y - colony.y) ** 2)
      if (dist < 80) {
        tooClose = true
        break
      }
    }

    if (!tooClose) {
      this.food.push(food)
    }
  }

  update(deltaTime) {
    if (!this.gameStarted) return

    this.updateAnts(deltaTime)
    this.updateTrails(deltaTime)
    this.checkFoodCollection()
    this.checkScore()
  }

  updateAnts(deltaTime) {
    const dt = deltaTime / 1000 // Convert to seconds

    this.ants.forEach(ant => {
      // Move towards target
      const dx = ant.targetX - ant.x
      const dy = ant.targetY - ant.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > 5) {
        // Still moving
        const moveX = (dx / distance) * ant.speed * dt
        const moveY = (dy / distance) * ant.speed * dt
        
        ant.x += moveX
        ant.y += moveY

        // Create trail
        if (Date.now() - ant.lastTrailTime > 200) { // Trail point every 200ms
          this.trails.push({
            id: ++this.lastTrailId,
            playerId: ant.playerId,
            x: ant.x,
            y: ant.y,
            strength: ant.trailStrength,
            color: ant.color,
            createdAt: Date.now()
          })
          ant.lastTrailTime = Date.now()
        }
      } else {
        // Reached target - look for food or return to colony
        if (ant.state === 'moving' && !ant.carryingFood) {
          // Look for nearby food
          const nearbyFood = this.food.find(food => {
            const dist = Math.sqrt((food.x - ant.x) ** 2 + (food.y - ant.y) ** 2)
            return dist < food.radius + 10
          })

          if (nearbyFood) {
            ant.carryingFood = nearbyFood.id
            ant.state = 'returning'
            
            // Set target back to colony
            const player = this.players[ant.playerId]
            const colony = this.colonies.get(player.id)
            if (colony) {
              ant.targetX = colony.x
              ant.targetY = colony.y
            }
          }
        }
      }
    })
  }

  updateTrails(deltaTime) {
    const dt = deltaTime / 1000
    const now = Date.now()

    // Decay trails over time
    this.trails.forEach(trail => {
      const age = (now - trail.createdAt) / 1000 // Age in seconds
      trail.strength = Math.max(0, 1.0 - age * this.trailDecayRate)
    })

    // Remove very weak trails
    this.trails = this.trails.filter(trail => trail.strength > 0.1)
  }

  checkFoodCollection() {
    this.ants.forEach(ant => {
      if (ant.carryingFood) {
        const player = this.players[ant.playerId]
        const colony = this.colonies.get(player.id)
        
        if (colony) {
          const dist = Math.sqrt((ant.x - colony.x) ** 2 + (ant.y - colony.y) ** 2)
          
          if (dist < colony.radius) {
            // Ant reached colony with food
            const foodItem = this.food.find(f => f.id === ant.carryingFood)
            if (foodItem) {
              // Add points
              const points = foodItem.type === 'large' ? 25 : 10
              player.score += points
              player.foodCollected++
              colony.foodStored += points

              // Remove food from map
              this.food = this.food.filter(f => f.id !== ant.carryingFood)
            }

            // Reset ant
            ant.carryingFood = null
            ant.state = 'moving'
          }
        }
      }
    })
  }

  checkScore() {
    // Check for win condition (first to 200 points)
    const winner = this.players.find(player => player.score >= 200)
    if (winner) {
      this.broadcast('gameWinner', {
        winner: winner.name,
        score: winner.score,
        message: `🏆 ${winner.name} built the strongest colony with ${winner.score} food!`
      })

      // Reset game after 5 seconds
      setTimeout(() => {
        this.resetGame()
      }, 5000)
    }
  }

  resetGame() {
    this.ants = []
    this.trails = []
    this.food = []
    
    this.players.forEach(player => {
      player.score = 0
      player.antCount = 0
      player.foodCollected = 0
    })

    this.colonies.forEach(colony => {
      colony.foodStored = 0
      colony.health = 100
    })

    this.generateInitialFood()
    this.broadcast('gameReset', { message: 'New colony expansion begins!' })
  }

  getGameState() {
    return {
      players: this.players,
      ants: this.ants,
      trails: this.trails,
      food: this.food,
      colonies: Array.from(this.colonies.values()),
      gameStarted: this.gameStarted,
      gameWidth: this.gameWidth,
      gameHeight: this.gameHeight
    }
  }
}