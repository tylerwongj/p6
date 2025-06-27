import { BaseGame } from '@tyler-arcade/multiplayer'

/**
 * CardWarGame - Card War game logic for hub integration
 */
export class CardWarGame extends BaseGame {
  constructor() {
    super()
    this.name = 'Card War'
    this.description = 'Classic card comparison game - highest card wins!'
    this.maxPlayers = 4
    this.gameState = {
      players: [],
      deck: [],
      warPile: [],
      currentRound: [],
      gamePhase: 'waiting', // waiting, playing, war, finished
      winner: null
    }
    this.initializeDeck()
  }

  initializeDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades']
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    
    this.gameState.deck = []
    for (let suit of suits) {
      for (let i = 0; i < values.length; i++) {
        this.gameState.deck.push({
          suit,
          value: values[i],
          numerical: i + 2
        })
      }
    }
    this.shuffleDeck()
  }

  shuffleDeck() {
    for (let i = this.gameState.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.gameState.deck[i], this.gameState.deck[j]] = [this.gameState.deck[j], this.gameState.deck[i]]
    }
  }

  dealCards() {
    const cardsPerPlayer = Math.floor(52 / this.gameState.players.length)
    
    this.gameState.players.forEach(player => {
      player.cards = []
      for (let i = 0; i < cardsPerPlayer; i++) {
        player.cards.push(this.gameState.deck.pop())
      }
      player.score = 0
    })
  }

  handlePlayerJoin(socketId, playerName, roomId, socket) {
    if (roomId !== 'card-war') {
      return { success: false, reason: 'Wrong room - this is Card War' }
    }
    
    if (this.gameState.players.length >= this.maxPlayers) {
      return { success: false, reason: 'Game is full' }
    }
    
    if (this.gameState.gamePhase === 'playing') {
      return { success: false, reason: 'Game already in progress' }
    }
    
    const player = {
      id: socketId,
      name: playerName,
      cards: [],
      score: 0,
      ready: false
    }
    
    this.gameState.players.push(player)
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
    this.players = this.gameState.players
    
    if (this.gameState.players.length < 2) {
      this.gameState.gamePhase = 'waiting'
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
        
      case 'playCard':
        if (this.gameState.gamePhase === 'playing') {
          this.playRound()
        }
        break
    }
    
    this.broadcast('gameState', this.getClientGameState())
  }

  startGame() {
    this.dealCards()
    this.gameState.gamePhase = 'playing'
    this.gameState.currentRound = []
    this.broadcast('gameState', this.getClientGameState())
  }

  playRound() {
    this.gameState.currentRound = []
    
    // Each player plays their top card
    this.gameState.players.forEach(player => {
      if (player.cards.length > 0) {
        const card = player.cards.shift()
        this.gameState.currentRound.push({
          player: player.name,
          playerId: player.id,
          card: card
        })
      }
    })
    
    // Determine winner
    if (this.gameState.currentRound.length > 0) {
      const highestValue = Math.max(...this.gameState.currentRound.map(play => play.card.numerical))
      const winners = this.gameState.currentRound.filter(play => play.card.numerical === highestValue)
      
      if (winners.length === 1) {
        const winner = this.gameState.players.find(p => p.id === winners[0].playerId)
        winner.score += this.gameState.currentRound.length
        
        // Add war pile to winner's score if exists
        winner.score += this.gameState.warPile.length
        this.gameState.warPile = []
      } else {
        // War! Add current round to war pile
        this.gameState.warPile.push(...this.gameState.currentRound)
        this.gameState.gamePhase = 'war'
      }
    }
    
    // Check for game end
    const playersWithCards = this.gameState.players.filter(p => p.cards.length > 0)
    if (playersWithCards.length <= 1) {
      this.endGame()
    }
    
    this.broadcast('gameState', this.getClientGameState())
  }

  endGame() {
    this.gameState.gamePhase = 'finished'
    const winner = this.gameState.players.reduce((prev, current) => {
      return prev.score > current.score ? prev : current
    })
    this.gameState.winner = winner.name
  }

  getClientGameState() {
    return {
      players: this.gameState.players.map(p => ({
        name: p.name,
        score: p.score,
        cardsLeft: p.cards.length,
        ready: p.ready
      })),
      currentRound: this.gameState.currentRound,
      gamePhase: this.gameState.gamePhase,
      winner: this.gameState.winner,
      warPileSize: this.gameState.warPile.length
    }
  }
}