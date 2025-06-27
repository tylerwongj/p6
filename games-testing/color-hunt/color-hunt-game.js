import { BaseGame } from '@tyler-arcade/multiplayer'

export class ColorHuntGame extends BaseGame {
  constructor() {
    super()
    this.name = 'Color Hunt'
    this.description = 'Find matching colors as fast as you can!'
    this.maxPlayers = 4
    this.spectators = []
    this.gameState = new ColorHuntState()
  }

  handlePlayerJoin(socketId, playerName, roomId, socket) {
    if (roomId !== 'color-hunt') {
      return { success: false, reason: 'Wrong room' }
    }
    
    if (this.gameState.players.length < this.maxPlayers) {
      const player = {
        id: socketId,
        name: playerName,
        score: 0,
        streak: 0,
        lastClickTime: 0,
        isReady: false
      }
      
      this.gameState.players.push(player)
      this.players = this.gameState.players
      
      return { success: true, playerData: { playerId: socketId, playerName } }
    }
    
    return { success: false, reason: 'Game is full' }
  }

  handlePlayerLeave(socketId, player, socket) {
    const index = this.gameState.players.findIndex(p => p.id === socketId)
    if (index !== -1) {
      this.gameState.players.splice(index, 1)
      this.players = this.gameState.players
    }
  }

  handleCustomEvent(socketId, eventName, args, socket) {
    const player = this.gameState.players.find(p => p.id === socketId)
    if (!player) return
    
    switch (eventName) {
      case 'colorClick':
        this.gameState.handleColorClick(player, args.colorIndex)
        break
      case 'ready':
        player.isReady = true
        if (this.gameState.players.every(p => p.isReady)) {
          this.gameState.startNewRound()
        }
        break
      case 'restart':
        this.gameState.restart()
        break
    }
  }

  update(deltaTime) {
    this.gameState.update(deltaTime)
    
    this.broadcast('gameState', {
      players: this.gameState.players,
      targetColor: this.gameState.targetColor,
      colors: this.gameState.colors,
      gamePhase: this.gameState.gamePhase,
      timeLeft: this.gameState.timeLeft,
      round: this.gameState.round,
      maxRounds: this.gameState.maxRounds
    })
  }

  stop() {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval)
      this.gameLoopInterval = null
    }
  }
}

class ColorHuntState {
  constructor() {
    this.players = []
    this.targetColor = null
    this.colors = []
    this.gamePhase = 'waiting' // waiting, playing, finished
    this.timeLeft = 0
    this.roundTime = 10
    this.round = 0
    this.maxRounds = 10
    this.colorOptions = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ]
  }

  startNewRound() {
    this.round++
    this.gamePhase = 'playing'
    this.timeLeft = this.roundTime
    this.generateColors()
    this.selectTargetColor()
    
    // Reset player ready states
    this.players.forEach(player => {
      player.isReady = false
    })
  }

  generateColors() {
    this.colors = []
    const gridSize = 16 // 4x4 grid
    const usedColors = new Set()
    
    for (let i = 0; i < gridSize; i++) {
      const color = this.colorOptions[Math.floor(Math.random() * this.colorOptions.length)]
      this.colors.push({
        color: color,
        clicked: false,
        index: i
      })
      usedColors.add(color)
    }
    
    // Ensure target color exists in grid
    const targetIndex = Math.floor(Math.random() * gridSize)
    this.colors[targetIndex].color = this.colorOptions[Math.floor(Math.random() * this.colorOptions.length)]
  }

  selectTargetColor() {
    const availableColors = [...new Set(this.colors.map(c => c.color))]
    this.targetColor = availableColors[Math.floor(Math.random() * availableColors.length)]
  }

  handleColorClick(player, colorIndex) {
    if (this.gamePhase !== 'playing') return
    if (colorIndex < 0 || colorIndex >= this.colors.length) return
    if (this.colors[colorIndex].clicked) return
    
    const currentTime = Date.now()
    const color = this.colors[colorIndex]
    
    if (color.color === this.targetColor) {
      // Correct color
      const points = this.calculatePoints(currentTime - player.lastClickTime)
      player.score += points
      player.streak++
      color.clicked = true
      
      // Check if all target colors found
      const targetColors = this.colors.filter(c => c.color === this.targetColor)
      const foundColors = targetColors.filter(c => c.clicked)
      
      if (foundColors.length === targetColors.length) {
        // Round complete
        if (this.round >= this.maxRounds) {
          this.gamePhase = 'finished'
        } else {
          this.gamePhase = 'waiting'
          // Auto-start next round after short delay
          setTimeout(() => {
            if (this.gamePhase === 'waiting') {
              this.startNewRound()
            }
          }, 2000)
        }
      }
    } else {
      // Wrong color
      player.streak = 0
      player.score = Math.max(0, player.score - 5)
    }
    
    player.lastClickTime = currentTime
  }

  calculatePoints(timeSinceLastClick) {
    const basePoints = 10
    const streakBonus = Math.min(this.players.find(p => p.streak)?.streak || 0, 5) * 2
    const speedBonus = timeSinceLastClick < 1000 ? 5 : 0
    return basePoints + streakBonus + speedBonus
  }

  update(deltaTime) {
    if (this.gamePhase === 'playing') {
      this.timeLeft -= deltaTime
      
      if (this.timeLeft <= 0) {
        // Time's up, move to next round or end game
        if (this.round >= this.maxRounds) {
          this.gamePhase = 'finished'
        } else {
          this.gamePhase = 'waiting'
          setTimeout(() => {
            if (this.gamePhase === 'waiting') {
              this.startNewRound()
            }
          }, 2000)
        }
      }
    }
  }

  restart() {
    this.players.forEach(player => {
      player.score = 0
      player.streak = 0
      player.isReady = false
    })
    this.round = 0
    this.gamePhase = 'waiting'
    this.timeLeft = 0
  }
}