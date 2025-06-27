export class SpectatorManager {
  constructor(game) {
    this.game = game
  }

  canJoinAsPlayer() {
    return this.game.getPlayerCount() < this.game.maxPlayers
  }

  handleJoinRequest(socketId, playerName, socket) {
    if (this.canJoinAsPlayer()) {
      return this.game.handlePlayerJoin(socketId, playerName, this.game.name.toLowerCase().replace(/\s+/g, '-'), socket)
    } else {
      this.game.addSpectator(socketId, playerName)
      return { success: true, type: 'spectator', spectatorData: { spectatorCount: this.game.getSpectatorCount() } }
    }
  }

  promoteSpectatorToPlayer(socketId) {
    if (!this.canJoinAsPlayer()) {
      return { success: false, reason: 'Game is full' }
    }

    const spectator = this.game.removeSpectator(socketId)
    if (!spectator) {
      return { success: false, reason: 'Not a spectator' }
    }

    return this.game.handlePlayerJoin(socketId, spectator.name, this.game.name.toLowerCase().replace(/\s+/g, '-'), null)
  }

  getSpectatorInfo() {
    return {
      count: this.game.getSpectatorCount(),
      list: this.game.spectators.map(s => ({ name: s.name, joinedAt: s.joinedAt })),
      canJoinAsPlayer: this.canJoinAsPlayer()
    }
  }
}