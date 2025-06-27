export class TurnManager {
  constructor(players = []) {
    this.players = players
    this.currentTurnIndex = 0
    this.turnStartTime = Date.now()
    this.turnTimeLimit = null
    this.onTurnEnd = null
  }

  setPlayers(players) {
    this.players = players
    this.currentTurnIndex = Math.min(this.currentTurnIndex, players.length - 1)
  }

  getCurrentPlayer() {
    if (this.players.length === 0) return null
    return this.players[this.currentTurnIndex]
  }

  getCurrentPlayerIndex() {
    return this.currentTurnIndex
  }

  nextTurn() {
    if (this.players.length === 0) return null
    
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length
    this.turnStartTime = Date.now()
    
    if (this.onTurnEnd) {
      this.onTurnEnd(this.getCurrentPlayer(), this.currentTurnIndex)
    }
    
    return this.getCurrentPlayer()
  }

  setTurnTimeLimit(timeMs, callback) {
    this.turnTimeLimit = timeMs
    this.onTurnEnd = callback
  }

  getTurnTimeRemaining() {
    if (!this.turnTimeLimit) return null
    const elapsed = Date.now() - this.turnStartTime
    return Math.max(0, this.turnTimeLimit - elapsed)
  }

  isTurnExpired() {
    if (!this.turnTimeLimit) return false
    return this.getTurnTimeRemaining() === 0
  }

  isPlayerTurn(playerId) {
    const currentPlayer = this.getCurrentPlayer()
    return currentPlayer && (currentPlayer.id === playerId || currentPlayer.socketId === playerId)
  }

  reset() {
    this.currentTurnIndex = 0
    this.turnStartTime = Date.now()
  }

  getState() {
    return {
      currentPlayerIndex: this.currentTurnIndex,
      currentPlayer: this.getCurrentPlayer(),
      turnStartTime: this.turnStartTime,
      timeRemaining: this.getTurnTimeRemaining()
    }
  }
}