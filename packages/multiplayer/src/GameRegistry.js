/**
 * GameRegistry - Central router for managing multiple games
 * Prevents event handler conflicts by routing events to appropriate games
 */
export class GameRegistry {
  constructor(multiplayerServer) {
    this.multiplayerServer = multiplayerServer
    this.games = new Map() // gameId -> game instance
    this.setupCentralHandlers()
  }

  /**
   * Register a game with the registry
   * @param {string} gameId - Unique game identifier (e.g., 'pong', 'snake')
   * @param {BaseGame} gameInstance - Game instance implementing BaseGame interface
   */
  registerGame(gameId, gameInstance) {
    console.log(`GameRegistry: Registering game '${gameId}'`)
    this.games.set(gameId, gameInstance)
    
    // Set reference back to registry in game
    if (gameInstance.setRegistry) {
      gameInstance.setRegistry(this)
    }
  }

  /**
   * Unregister a game from the registry
   * @param {string} gameId - Game identifier to remove
   */
  unregisterGame(gameId) {
    console.log(`GameRegistry: Unregistering game '${gameId}'`)
    this.games.delete(gameId)
  }

  /**
   * Get all registered games
   * @returns {Map} Map of gameId -> game instance
   */
  getGames() {
    return this.games
  }

  /**
   * Get specific game by ID
   * @param {string} gameId - Game identifier
   * @returns {BaseGame|undefined} Game instance or undefined
   */
  getGame(gameId) {
    return this.games.get(gameId)
  }

  /**
   * Set up central event handlers that route to appropriate games
   */
  setupCentralHandlers() {
    console.log('GameRegistry: Setting up central event handlers')

    // Central player join handler
    this.multiplayerServer.on('playerJoin', (socketId, playerName, roomId, socket) => {
      console.log(`GameRegistry: Routing playerJoin for ${playerName} to room '${roomId}'`)
      
      const game = this.games.get(roomId)
      if (game && game.handlePlayerJoin) {
        return game.handlePlayerJoin(socketId, playerName, roomId, socket)
      } else {
        console.log(`GameRegistry: No game found for room '${roomId}' or game doesn't implement handlePlayerJoin`)
        return {
          success: false,
          reason: `Game '${roomId}' not available`
        }
      }
    })

    // Central player leave handler
    this.multiplayerServer.on('playerLeave', (socketId, player, socket) => {
      console.log(`GameRegistry: Routing playerLeave for ${player.roomId}`)
      
      const game = this.games.get(player.roomId)
      if (game && game.handlePlayerLeave) {
        game.handlePlayerLeave(socketId, player, socket)
      }
    })

    // Central player input handler
    this.multiplayerServer.on('playerInput', (socketId, input, socket) => {
      // Find which game this player belongs to
      const players = this.multiplayerServer.getPlayers()
      const player = players.find(p => p.id === socketId)
      
      if (player && player.roomId) {
        const game = this.games.get(player.roomId)
        if (game && game.handlePlayerInput) {
          game.handlePlayerInput(socketId, input, socket)
        }
      }
    })

    // Central custom event handler
    this.multiplayerServer.on('customEvent', (socketId, eventName, args, socket) => {
      // Find which game this player belongs to
      const players = this.multiplayerServer.getPlayers()
      const player = players.find(p => p.id === socketId)
      
      if (player && player.roomId) {
        const game = this.games.get(player.roomId)
        if (game && game.handleCustomEvent) {
          game.handleCustomEvent(socketId, eventName, args, socket)
        }
      }
    })

    // General connection handler
    this.multiplayerServer.on('playerConnected', (socketId, socket) => {
      console.log(`GameRegistry: Player ${socketId} connected`)
      // Notify all games about new connection if they care
      for (const [gameId, game] of this.games) {
        if (game.handlePlayerConnected) {
          game.handlePlayerConnected(socketId, socket)
        }
      }
    })
  }

  /**
   * Broadcast message to all players in a specific game
   * @param {string} gameId - Game to broadcast to
   * @param {string} event - Event name
   * @param {any} data - Data to send
   */
  broadcastToGame(gameId, event, data) {
    this.multiplayerServer.broadcastToRoom(gameId, event, data)
  }

  /**
   * Get player count for a specific game
   * @param {string} gameId - Game identifier
   * @returns {number} Number of players in game
   */
  getGamePlayerCount(gameId) {
    const game = this.games.get(gameId)
    if (game && game.getPlayerCount) {
      return game.getPlayerCount()
    }
    return 0
  }

  /**
   * Get status for all games (for API endpoints)
   * @returns {Array} Array of game status objects
   */
  getAllGameStatus() {
    const gameList = []
    
    for (const [gameId, game] of this.games) {
      gameList.push({
        id: gameId,
        name: game.name || gameId,
        description: game.description || `Play ${gameId}`,
        players: game.getPlayerCount ? game.getPlayerCount() : 0,
        maxPlayers: game.maxPlayers || 2,
        status: game.getStatus ? game.getStatus() : 'available',
        isBeta: game.isBeta || false
      })
    }
    
    return gameList
  }
}