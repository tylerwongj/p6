export class RoundManager {
  constructor(maxRounds = null) {
    this.currentRound = 1
    this.maxRounds = maxRounds
    this.roundStartTime = Date.now()
    this.roundHistory = []
    this.onRoundEnd = null
    this.onGameEnd = null
  }

  startNewRound() {
    this.currentRound++
    this.roundStartTime = Date.now()
    
    if (this.onRoundEnd) {
      this.onRoundEnd(this.currentRound - 1)
    }
    
    if (this.isGameComplete() && this.onGameEnd) {
      this.onGameEnd(this.currentRound)
    }
  }

  endRound(results = {}) {
    const roundData = {
      round: this.currentRound,
      results,
      duration: Date.now() - this.roundStartTime,
      endTime: Date.now()
    }
    
    this.roundHistory.push(roundData)
    return roundData
  }

  getCurrentRound() {
    return this.currentRound
  }

  isGameComplete() {
    return this.maxRounds && this.currentRound >= this.maxRounds
  }

  getRoundsRemaining() {
    if (!this.maxRounds) return null
    return Math.max(0, this.maxRounds - this.currentRound)
  }

  getRoundDuration() {
    return Date.now() - this.roundStartTime
  }

  setMaxRounds(rounds) {
    this.maxRounds = rounds
  }

  setRoundEndCallback(callback) {
    this.onRoundEnd = callback
  }

  setGameEndCallback(callback) {
    this.onGameEnd = callback
  }

  reset() {
    this.currentRound = 1
    this.roundStartTime = Date.now()
    this.roundHistory = []
  }

  getHistory() {
    return [...this.roundHistory]
  }

  getState() {
    return {
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      roundsRemaining: this.getRoundsRemaining(),
      isComplete: this.isGameComplete(),
      roundDuration: this.getRoundDuration(),
      history: this.getHistory()
    }
  }
}