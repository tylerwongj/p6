import { BaseGame } from '@tyler-arcade/multiplayer'

class BingoGame extends BaseGame {
  constructor() {
    super()
    this.spectators = []
    this.gameState = {
      players: {},
      calledNumbers: [],
      currentNumber: null,
      gameStarted: false,
      winners: [],
      numberBag: []
    }
    this.initializeNumberBag()
    this.callInterval = null
  }

  initializeNumberBag() {
    this.gameState.numberBag = []
    // B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
    for (let i = 1; i <= 75; i++) {
      this.gameState.numberBag.push(i)
    }
    this.shuffleArray(this.gameState.numberBag)
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
  }

  generateBingoCard() {
    const card = {
      B: [], I: [], N: [], G: [], O: []
    }
    
    // B column: 1-15
    card.B = this.getRandomNumbers(1, 15, 5)
    // I column: 16-30  
    card.I = this.getRandomNumbers(16, 30, 5)
    // N column: 31-45 (middle is FREE)
    card.N = this.getRandomNumbers(31, 45, 4)
    card.N.splice(2, 0, 'FREE') // Insert FREE in middle
    // G column: 46-60
    card.G = this.getRandomNumbers(46, 60, 5)
    // O column: 61-75
    card.O = this.getRandomNumbers(61, 75, 5)
    
    return card
  }

  getRandomNumbers(min, max, count) {
    const numbers = []
    const available = []
    
    for (let i = min; i <= max; i++) {
      available.push(i)
    }
    
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * available.length)
      numbers.push(available.splice(randomIndex, 1)[0])
    }
    
    return numbers.sort((a, b) => a - b)
  }

  getNumberColumn(number) {
    if (number >= 1 && number <= 15) return 'B'
    if (number >= 16 && number <= 30) return 'I'
    if (number >= 31 && number <= 45) return 'N'
    if (number >= 46 && number <= 60) return 'G'
    if (number >= 61 && number <= 75) return 'O'
    return ''
  }

  handlePlayerJoin(socketId, playerName, roomId, socket) {
    if (roomId !== 'bingo') {
      return {
        success: false,
        reason: 'Wrong room - this is Bingo'
      };
    }

    if (Object.keys(this.gameState.players).length >= 6) {
      return { success: false, reason: 'Game is full (max 6 players)' }
    }

    this.gameState.players[socketId] = {
      id: socketId,
      name: playerName,
      card: this.generateBingoCard(),
      markedSpots: new Set(),
      hasBingo: false
    }

    // Send playerAssigned event to the joining player
    this.sendToPlayer(socketId, 'playerAssigned', {
      playerId: socketId,
      playerName: playerName
    })

    this.broadcastGameState()
    
    // Auto-start if we have enough players
    if (Object.keys(this.gameState.players).length >= 2 && !this.gameState.gameStarted) {
      setTimeout(() => this.startGame(), 3000)
    }

    return {
      success: true,
      playerData: { playerId: socketId, playerName: playerName }
    }
  }

  startGame() {
    if (this.gameState.gameStarted) return
    
    const playerCount = Object.keys(this.gameState.players).length
    if (playerCount < 2) return
    
    this.gameState.gameStarted = true
    this.gameState.calledNumbers = []
    this.gameState.winners = []
    
    this.broadcastGameState()
    this.broadcast('gameStarted', {
      message: 'Bingo game started! First number coming up...'
    })
    
    // Start calling numbers every 5 seconds
    this.startNumberCalling()
  }

  startNumberCalling() {
    this.callInterval = setInterval(() => {
      this.callNextNumber()
    }, 5000) // Call number every 5 seconds
    
    // Call first number immediately
    setTimeout(() => this.callNextNumber(), 1000)
  }

  callNextNumber() {
    if (this.gameState.numberBag.length === 0) {
      this.endGame('No more numbers to call!')
      return
    }
    
    const number = this.gameState.numberBag.pop()
    this.gameState.currentNumber = number
    this.gameState.calledNumbers.push(number)
    
    const column = this.getNumberColumn(number)
    
    this.broadcastGameState()
    this.broadcast('numberCalled', {
      number: number,
      column: column,
      callText: `${column}-${number}`
    })
  }

  handlePlayerInput(socketId, input, socket) {
    if (!this.gameState.gameStarted) return

    switch (input.action) {
      case 'markSpot':
        this.markSpot(socketId, input.row, input.col)
        break
      case 'callBingo':
        this.checkBingo(socketId)
        break
    }
  }

  markSpot(playerId, row, col) {
    const player = this.gameState.players[playerId]
    if (!player) return
    
    const spotId = `${row}-${col}`
    
    // Toggle the marked spot
    if (player.markedSpots.has(spotId)) {
      player.markedSpots.delete(spotId)
    } else {
      player.markedSpots.add(spotId)
    }
    
    this.sendToPlayer(playerId, 'gameState', {
      ...this.gameState,
      myCard: player.card,
      myMarkedSpots: Array.from(player.markedSpots)
    })
  }

  checkBingo(playerId) {
    const player = this.gameState.players[playerId]
    if (!player || player.hasBingo) return
    
    const card = player.card
    const marked = player.markedSpots
    
    // Check all possible bingo patterns
    const hasBingo = this.checkBingoPatterns(card, marked)
    
    if (hasBingo) {
      player.hasBingo = true
      this.gameState.winners.push({
        id: playerId,
        name: player.name,
        time: Date.now()
      })
      
      this.broadcast('bingoWin', {
        winner: player.name,
        message: `${player.name} got BINGO!`
      })
      
      // Continue game for multiple winners
      this.broadcastGameState()
    } else {
      this.sendToPlayer(playerId, 'invalidBingo', {
        message: 'Not a valid bingo pattern!'
      })
    }
  }

  checkBingoPatterns(card, markedSpots) {
    const columns = ['B', 'I', 'N', 'G', 'O']
    
    // Check rows
    for (let row = 0; row < 5; row++) {
      let rowComplete = true
      for (let col = 0; col < 5; col++) {
        const spotId = `${row}-${col}`
        if (row === 2 && col === 2) continue // FREE space
        if (!markedSpots.has(spotId)) {
          rowComplete = false
          break
        }
      }
      if (rowComplete) return true
    }
    
    // Check columns
    for (let col = 0; col < 5; col++) {
      let colComplete = true
      for (let row = 0; row < 5; row++) {
        const spotId = `${row}-${col}`
        if (row === 2 && col === 2) continue // FREE space
        if (!markedSpots.has(spotId)) {
          colComplete = false
          break
        }
      }
      if (colComplete) return true
    }
    
    // Check diagonals
    // Top-left to bottom-right
    let diagonal1 = true
    for (let i = 0; i < 5; i++) {
      const spotId = `${i}-${i}`
      if (i === 2) continue // FREE space
      if (!markedSpots.has(spotId)) {
        diagonal1 = false
        break
      }
    }
    if (diagonal1) return true
    
    // Top-right to bottom-left
    let diagonal2 = true
    for (let i = 0; i < 5; i++) {
      const spotId = `${i}-${4-i}`
      if (i === 2) continue // FREE space
      if (!markedSpots.has(spotId)) {
        diagonal2 = false
        break
      }
    }
    if (diagonal2) return true
    
    return false
  }

  endGame(reason = '') {
    if (this.callInterval) {
      clearInterval(this.callInterval)
      this.callInterval = null
    }
    
    this.gameState.gameStarted = false
    
    let message = 'Game ended!'
    if (this.gameState.winners.length > 0) {
      const winnerNames = this.gameState.winners.map(w => w.name).join(', ')
      message = `Game ended! Winners: ${winnerNames}`
    } else if (reason) {
      message = `Game ended! ${reason}`
    }
    
    this.broadcast('gameEnded', { message })
    
    // Reset for new game after 10 seconds
    setTimeout(() => {
      this.resetGame()
    }, 10000)
  }

  resetGame() {
    if (this.callInterval) {
      clearInterval(this.callInterval)
      this.callInterval = null
    }
    
    this.gameState.players = {}
    this.gameState.calledNumbers = []
    this.gameState.currentNumber = null
    this.gameState.gameStarted = false
    this.gameState.winners = []
    this.initializeNumberBag()
    
    this.broadcastGameState()
  }

  broadcastGameState() {
    // Send game state to each player with their personal card info
    Object.keys(this.gameState.players).forEach(playerId => {
      const player = this.gameState.players[playerId]
      const personalState = {
        ...this.gameState,
        myCard: player.card,
        myMarkedSpots: Array.from(player.markedSpots),
        players: Object.fromEntries(
          Object.entries(this.gameState.players).map(([id, p]) => [
            id,
            {
              id: p.id,
              name: p.name,
              hasBingo: p.hasBingo,
              markedCount: p.markedSpots.size
            }
          ])
        )
      }
      
      this.sendToPlayer(playerId, 'gameState', personalState)
    })
  }

  handleCustomEvent(socketId, eventName, args, socket) {
    console.log(`🎮 Bingo Game: Handling custom event '${eventName}' from ${socketId}`);
    
    switch (eventName) {
      case 'resetGame':
        this.resetGame();
        break;
    }
  }

  handlePlayerLeave(socketId, player, socket) {
    delete this.gameState.players[socketId]
    
    // End game if not enough players
    if (Object.keys(this.gameState.players).length < 2 && this.gameState.gameStarted) {
      this.endGame('Not enough players to continue')
    }
    
    this.broadcastGameState()
  }

  handlePlayerConnected(socketId, socket) {
    // Send current game state to newly connected player
    this.sendToPlayer(socketId, 'gameState', this.gameState)
  }
}

export { BingoGame }