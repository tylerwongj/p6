export class ScoreManager {
  constructor(players = []) {
    this.scores = new Map()
    this.winThreshold = null
    this.onWin = null
    this.initializePlayers(players)
  }

  initializePlayers(players) {
    players.forEach(player => {
      const playerId = player.id || player.socketId
      if (!this.scores.has(playerId)) {
        this.scores.set(playerId, 0)
      }
    })
  }

  addPlayer(player) {
    const playerId = player.id || player.socketId
    if (!this.scores.has(playerId)) {
      this.scores.set(playerId, 0)
    }
  }

  removePlayer(player) {
    const playerId = player.id || player.socketId
    this.scores.delete(playerId)
  }

  addPoints(playerId, points) {
    const currentScore = this.scores.get(playerId) || 0
    const newScore = currentScore + points
    this.scores.set(playerId, newScore)

    if (this.winThreshold && newScore >= this.winThreshold && this.onWin) {
      this.onWin(playerId, newScore)
    }

    return newScore
  }

  setScore(playerId, score) {
    this.scores.set(playerId, score)
    
    if (this.winThreshold && score >= this.winThreshold && this.onWin) {
      this.onWin(playerId, score)
    }
  }

  getScore(playerId) {
    return this.scores.get(playerId) || 0
  }

  getAllScores() {
    return Object.fromEntries(this.scores)
  }

  getLeaderboard() {
    return Array.from(this.scores.entries())
      .map(([playerId, score]) => ({ playerId, score }))
      .sort((a, b) => b.score - a.score)
  }

  getWinner() {
    if (this.scores.size === 0) return null
    
    const leaderboard = this.getLeaderboard()
    const topScore = leaderboard[0].score
    const winners = leaderboard.filter(entry => entry.score === topScore)
    
    return winners.length === 1 ? winners[0] : null
  }

  setWinCondition(threshold, callback) {
    this.winThreshold = threshold
    this.onWin = callback
  }

  reset() {
    for (const playerId of this.scores.keys()) {
      this.scores.set(playerId, 0)
    }
  }

  getState() {
    return {
      scores: this.getAllScores(),
      leaderboard: this.getLeaderboard(),
      winner: this.getWinner()
    }
  }
}