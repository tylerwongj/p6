/**
 * BaseGame - Interface/base class that all games should implement
 * Ensures consistent API across different games
 */
export class BaseGame {
  constructor() {
    // Game metadata
    this.name = 'Unknown Game'
    this.description = 'A multiplayer game'
    this.maxPlayers = 2
    
    // Game state
    this.players = []
    this.spectators = []
    this.status = 'available'
    
    // Registry reference (set by GameRegistry)
    this.registry = null
  }

  /**
   * Set reference to the GameRegistry
   * @param {GameRegistry} registry - The game registry instance
   */
  setRegistry(registry) {
    this.registry = registry
  }

  /**
   * Handle a player trying to join this game
   * @param {string} socketId - Socket ID of joining player
   * @param {string} playerName - Name of joining player
   * @param {string} roomId - Room/game ID they want to join
   * @param {Socket} socket - Socket.io socket instance
   * @returns {object} Result object with success/failure info
   */
  handlePlayerJoin(socketId, playerName, roomId, socket) {
    throw new Error('handlePlayerJoin must be implemented by game class')
  }

  /**
   * Handle a player leaving this game
   * @param {string} socketId - Socket ID of leaving player
   * @param {object} player - Player object
   * @param {Socket} socket - Socket.io socket instance
   */
  handlePlayerLeave(socketId, player, socket) {
    throw new Error('handlePlayerLeave must be implemented by game class')
  }

  /**
   * Handle player input for this game
   * @param {string} socketId - Socket ID of player
   * @param {object} input - Input data from player
   * @param {Socket} socket - Socket.io socket instance
   */
  handlePlayerInput(socketId, input, socket) {
    throw new Error('handlePlayerInput must be implemented by game class')
  }

  /**
   * Handle custom events for this game
   * @param {string} socketId - Socket ID of player
   * @param {string} eventName - Name of the custom event
   * @param {Array} args - Event arguments
   * @param {Socket} socket - Socket.io socket instance
   */
  handleCustomEvent(socketId, eventName, args, socket) {
    // Optional to implement - default does nothing
    console.log(`BaseGame: Unhandled custom event '${eventName}' from ${socketId}`)
  }

  /**
   * Handle new player connection (optional)
   * @param {string} socketId - Socket ID of connecting player
   * @param {Socket} socket - Socket.io socket instance
   */
  handlePlayerConnected(socketId, socket) {
    // Optional to implement - default does nothing
  }

  /**
   * Get current number of players in this game
   * @returns {number} Number of active players
   */
  getPlayerCount() {
    return this.players.length
  }

  /**
   * Get current game status
   * @returns {string} Status string ('available', 'full', 'in_progress', etc.)
   */
  getStatus() {
    if (this.players.length >= this.maxPlayers) {
      return 'full'
    }
    if (this.players.length > 0) {
      return 'waiting'
    }
    return 'available'
  }

  /**
   * Start the game (optional)
   */
  start() {
    // Optional to implement
  }

  /**
   * Stop the game (optional)
   */
  stop() {
    // Optional to implement
  }

  /**
   * Reset the game state (optional)
   */
  reset() {
    // Optional to implement
  }

  /**
   * Broadcast message to all players in this game
   * @param {string} event - Event name
   * @param {any} data - Data to broadcast
   */
  broadcast(event, data) {
    if (this.registry) {
      // Find our game ID in the registry
      for (const [gameId, game] of this.registry.getGames()) {
        if (game === this) {
          this.registry.broadcastToGame(gameId, event, data)
          return
        }
      }
    }
  }

  /**
   * Send message to specific player
   * @param {string} socketId - Target player socket ID
   * @param {string} event - Event name
   * @param {any} data - Data to send
   */
  sendToPlayer(socketId, event, data) {
    if (this.registry) {
      this.registry.multiplayerServer.sendToClient(socketId, event, data)
    }
  }

  /**
   * Add spectator to this game
   * @param {string} socketId - Socket ID of spectator
   * @param {string} spectatorName - Name of spectator
   */
  addSpectator(socketId, spectatorName) {
    // Ensure spectators array exists (backward compatibility)
    if (!this.spectators) {
      this.spectators = []
    }
    const spectator = { socketId, name: spectatorName, joinedAt: Date.now() }
    this.spectators.push(spectator)
    this.sendToPlayer(socketId, 'spectatorAssigned', { spectator, gameState: this.getSpectatorGameState() })
    this.broadcastToPlayers('spectatorJoined', { spectator })
  }

  /**
   * Remove spectator from this game
   * @param {string} socketId - Socket ID of spectator to remove
   * @returns {object|null} Removed spectator object or null if not found
   */
  removeSpectator(socketId) {
    // Ensure spectators array exists (backward compatibility)
    if (!this.spectators) {
      this.spectators = []
      return null
    }
    const index = this.spectators.findIndex(s => s.socketId === socketId)
    if (index !== -1) {
      const spectator = this.spectators.splice(index, 1)[0]
      this.broadcastToPlayers('spectatorLeft', { spectator })
      return spectator
    }
    return null
  }

  /**
   * Broadcast message to all spectators in this game
   * @param {string} event - Event name
   * @param {any} data - Data to broadcast
   */
  broadcastToSpectators(event, data) {
    // Ensure spectators array exists (backward compatibility)
    if (!this.spectators) {
      this.spectators = []
      return
    }
    this.spectators.forEach(spectator => {
      this.sendToPlayer(spectator.socketId, event, data)
    })
  }

  /**
   * Broadcast message to all players (not spectators)
   * @param {string} event - Event name
   * @param {any} data - Data to broadcast
   */
  broadcastToPlayers(event, data) {
    this.broadcast(event, data)
  }

  /**
   * Get spectator count
   * @returns {number} Number of spectators
   */
  getSpectatorCount() {
    // Ensure spectators array exists (backward compatibility)
    if (!this.spectators) {
      this.spectators = []
    }
    return this.spectators.length
  }

  /**
   * Get game state for spectators (override this for spectator-specific state)
   * @returns {object} Game state object for spectators
   */
  getSpectatorGameState() {
    return {
      players: this.players,
      status: this.status,
      spectatorCount: this.getSpectatorCount()
    }
  }
}