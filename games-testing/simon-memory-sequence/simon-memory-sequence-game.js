import { BaseGame } from '@tyler-arcade/multiplayer'

/**
 * SimonMemorySequenceGame - Multiplayer Simon Says memory game
 */
export class SimonMemorySequenceGame extends BaseGame {
  constructor() {
    super()
    this.name = 'Simon Memory Sequence'
    this.description = 'Follow the pattern - how long can you remember?'
    this.maxPlayers = 4
    this.gameState = {
      players: [],
      sequence: [],
      currentPlayerIndex: 0,
      currentStep: 0,
      gamePhase: 'waiting', // waiting, ready, showing, inputting, finished
      isShowingSequence: false,
      round: 1,
      scores: {},
      eliminatedPlayers: new Set(),
      winner: null,
      lastAction: null,
      sequenceSpeed: 800 // ms per step
    }
    this.sequenceTimer = null
    this.colors = ['red', 'blue', 'green', 'yellow']
  }

  generateNextStep() {
    const randomColor = this.colors[Math.floor(Math.random() * this.colors.length)]
    this.gameState.sequence.push(randomColor)
  }

  async showSequence() {
    this.gameState.gamePhase = 'showing'
    this.gameState.isShowingSequence = true
    this.gameState.lastAction = `Round ${this.gameState.round}: Watch the sequence!`
    
    this.broadcast('gameState', this.getClientGameState())
    
    for (let i = 0; i < this.gameState.sequence.length; i++) {
      // Highlight color
      this.broadcast('highlightColor', {
        color: this.gameState.sequence[i],
        isActive: true
      })
      
      await this.delay(this.gameState.sequenceSpeed)
      
      // Turn off highlight
      this.broadcast('highlightColor', {
        color: this.gameState.sequence[i],
        isActive: false
      })
      
      await this.delay(200) // Brief pause between colors
    }
    
    this.gameState.isShowingSequence = false
    this.gameState.gamePhase = 'inputting'
    this.gameState.currentStep = 0
    this.gameState.lastAction = `${this.gameState.players[this.gameState.currentPlayerIndex].name}'s turn`
    
    this.broadcast('gameState', this.getClientGameState())
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  handleColorInput(color, player) {
    if (this.gameState.gamePhase !== 'inputting') return
    if (this.gameState.players[this.gameState.currentPlayerIndex].id !== player.id) return
    if (this.gameState.eliminatedPlayers.has(player.id)) return
    
    const expectedColor = this.gameState.sequence[this.gameState.currentStep]
    
    if (color === expectedColor) {
      // Correct!
      this.gameState.currentStep++
      this.gameState.lastAction = `${player.name}: ${color} - Correct!`
      
      if (this.gameState.currentStep >= this.gameState.sequence.length) {
        // Player completed the sequence!
        this.gameState.scores[player.id] = (this.gameState.scores[player.id] || 0) + 1
        this.nextPlayer()
      }
    } else {
      // Wrong!
      this.gameState.eliminatedPlayers.add(player.id)
      this.gameState.lastAction = `${player.name}: ${color} - Wrong! Expected ${expectedColor}. Eliminated!`
      this.nextPlayer()
    }
  }

  nextPlayer() {
    const alivePlayers = this.gameState.players.filter(p => !this.gameState.eliminatedPlayers.has(p.id))
    
    if (alivePlayers.length <= 1) {
      this.endRound()
      return
    }
    
    // Find next alive player
    do {
      this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length
    } while (this.gameState.eliminatedPlayers.has(this.gameState.players[this.gameState.currentPlayerIndex].id))
    
    this.gameState.currentStep = 0
    this.gameState.lastAction = `${this.gameState.players[this.gameState.currentPlayerIndex].name}'s turn`
  }

  endRound() {
    const alivePlayers = this.gameState.players.filter(p => !this.gameState.eliminatedPlayers.has(p.id))
    
    if (alivePlayers.length === 1) {
      // One winner - award bonus points
      const winner = alivePlayers[0]
      this.gameState.scores[winner.id] = (this.gameState.scores[winner.id] || 0) + 2 // Bonus for winning round
      this.gameState.lastAction = `${winner.name} survives Round ${this.gameState.round}!`
    }
    
    if (this.gameState.round >= 10 || alivePlayers.length === 0) {
      this.endGame()
    } else {
      this.startNextRound()
    }
  }

  startNextRound() {
    this.gameState.round++
    this.gameState.eliminatedPlayers.clear()
    this.generateNextStep()
    this.gameState.currentPlayerIndex = 0
    
    // Increase speed slightly each round
    this.gameState.sequenceSpeed = Math.max(400, this.gameState.sequenceSpeed - 50)
    
    setTimeout(() => {
      this.showSequence()
    }, 2000) // 2 second delay between rounds
  }

  endGame() {
    this.gameState.gamePhase = 'finished'
    
    // Find winner by highest score
    let winner = null
    let highScore = -1
    
    this.gameState.players.forEach(player => {
      const score = this.gameState.scores[player.id] || 0
      if (score > highScore) {
        highScore = score
        winner = player
      }
    })
    
    if (winner) {
      this.gameState.winner = winner.name
      this.gameState.lastAction = `${winner.name} wins with ${highScore} points!`
    } else {
      this.gameState.lastAction = 'Game ended - no winner!'
    }
  }

  handlePlayerJoin(socketId, playerName, roomId, socket) {
    if (roomId !== 'simon-memory-sequence') {
      return { success: false, reason: 'Wrong room - this is Simon Memory Sequence' }
    }
    
    if (this.gameState.players.length >= this.maxPlayers) {
      return { success: false, reason: 'Game is full' }
    }
    
    if (this.gameState.gamePhase === 'showing' || this.gameState.gamePhase === 'inputting') {
      return { success: false, reason: 'Game already in progress' }
    }
    
    const player = {
      id: socketId,
      name: playerName,
      ready: false
    }
    
    this.gameState.players.push(player)
    this.gameState.scores[socketId] = 0
    this.players = this.gameState.players
    
    if (this.gameState.players.length >= 2) {
      this.gameState.gamePhase = 'ready'
    }
    
    this.broadcast('gameState', this.getClientGameState())
    
    return {
      success: true,
      playerData: {
        playerId: socketId,
        gameState: this.getClientGameState()
      }
    }
  }

  handlePlayerLeave(socketId, player, socket) {
    this.gameState.players = this.gameState.players.filter(p => p.id !== socketId)
    this.gameState.eliminatedPlayers.delete(socketId)
    delete this.gameState.scores[socketId]
    this.players = this.gameState.players
    
    if (this.gameState.players.length < 2) {
      this.gameState.gamePhase = 'waiting'
    }
    
    // Check if current player left
    if (this.gameState.gamePhase === 'inputting' && this.gameState.players.length > 0) {
      const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex]
      if (!currentPlayer) {
        this.gameState.currentPlayerIndex = 0
      }
    }
    
    this.broadcast('gameState', this.getClientGameState())
  }

  handleCustomEvent(socketId, eventName, args, socket) {
    const player = this.gameState.players.find(p => p.id === socketId)
    if (!player) return
    
    switch (eventName) {
      case 'ready':
        player.ready = true
        if (this.gameState.players.every(p => p.ready) && this.gameState.players.length >= 2) {
          this.startGame()
        }
        break
        
      case 'colorPressed':
        if (this.gameState.gamePhase === 'inputting') {
          const { color } = args
          this.handleColorInput(color, player)
        }
        break
    }
    
    this.broadcast('gameState', this.getClientGameState())
  }

  startGame() {
    this.gameState.gamePhase = 'showing'
    this.gameState.round = 1
    this.gameState.sequence = []
    this.gameState.currentPlayerIndex = 0
    this.gameState.eliminatedPlayers.clear()
    
    // Initialize scores
    this.gameState.players.forEach(player => {
      this.gameState.scores[player.id] = 0
    })
    
    // Start first round
    this.generateNextStep()
    this.showSequence()
  }

  getClientGameState() {
    return {
      players: this.gameState.players.map(p => ({
        name: p.name,
        ready: p.ready,
        score: this.gameState.scores[p.id] || 0,
        isEliminated: this.gameState.eliminatedPlayers.has(p.id),
        isCurrentPlayer: this.gameState.players[this.gameState.currentPlayerIndex]?.id === p.id
      })),
      gamePhase: this.gameState.gamePhase,
      round: this.gameState.round,
      sequenceLength: this.gameState.sequence.length,
      currentStep: this.gameState.currentStep,
      isShowingSequence: this.gameState.isShowingSequence,
      lastAction: this.gameState.lastAction,
      winner: this.gameState.winner,
      currentPlayerName: this.gameState.players[this.gameState.currentPlayerIndex]?.name
    }
  }
}