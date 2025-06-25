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
}