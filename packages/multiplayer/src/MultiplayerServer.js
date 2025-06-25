import { Server } from 'socket.io'

/**
 * MultiplayerServer - Generic multiplayer server for real-time games
 */
export class MultiplayerServer {
  constructor(httpServer, options = {}) {
    this.io = new Server(httpServer)
    this.rooms = new Map()
    this.players = new Map() // socketId -> player info
    this.callbacks = {}
    this.gameLoopInterval = null
    
    this.setupSocketHandlers()
  }

  /**
   * Set up Socket.io event handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Player connected:', socket.id)
      
      if (this.callbacks.playerConnected) {
        this.callbacks.playerConnected(socket.id, socket)
      }

      // Handle player joining
      socket.on('joinGame', (data) => {
        this.handlePlayerJoin(socket, data)
      })

      // Handle custom game events
      socket.on('gameEvent', (eventData) => {
        if (this.callbacks.gameEvent) {
          this.callbacks.gameEvent(socket.id, eventData, socket)
        }
      })

      // Handle player input
      socket.on('playerInput', (input) => {
        if (this.callbacks.playerInput) {
          this.callbacks.playerInput(socket.id, input, socket)
        }
      })

      // Handle custom events dynamically
      socket.onAny((eventName, ...args) => {
        if (this.callbacks.customEvent) {
          this.callbacks.customEvent(socket.id, eventName, args, socket)
        }
      })

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handlePlayerDisconnect(socket)
      })
    })
  }

  /**
   * Handle player joining a game
   */
  handlePlayerJoin(socket, data) {
    const playerName = data.name || 'Anonymous'
    const roomId = data.roomId || 'main'
    
    if (this.callbacks.playerJoin) {
      const result = this.callbacks.playerJoin(socket.id, playerName, roomId, socket)
      
      if (result && result.success) {
        // Join socket to room
        socket.join(roomId)
        
        // Store player info
        this.players.set(socket.id, {
          id: socket.id,
          name: playerName,
          roomId: roomId,
          ...result.playerData
        })
        
        // Emit success response
        socket.emit('playerAssigned', result.playerData)
        
        console.log(`${playerName} joined room ${roomId}`)
      } else {
        // Emit failure response
        socket.emit('joinFailed', result || { reason: 'Unknown error' })
      }
    }
  }

  /**
   * Handle player disconnection
   */
  handlePlayerDisconnect(socket) {
    console.log('Player disconnected:', socket.id)
    
    const player = this.players.get(socket.id)
    if (player && this.callbacks.playerLeave) {
      this.callbacks.playerLeave(socket.id, player, socket)
    }
    
    this.players.delete(socket.id)
  }

  /**
   * Set callback functions for game events
   */
  on(event, callback) {
    this.callbacks[event] = callback
  }

  /**
   * Broadcast data to all clients
   */
  broadcast(event, data) {
    this.io.emit(event, data)
  }

  /**
   * Send data to specific room
   */
  broadcastToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data)
  }

  /**
   * Send data to specific client
   */
  sendToClient(socketId, event, data) {
    this.io.to(socketId).emit(event, data)
  }

  /**
   * Get all connected players
   */
  getPlayers() {
    return Array.from(this.players.values())
  }

  /**
   * Get players in specific room
   */
  getPlayersInRoom(roomId) {
    return Array.from(this.players.values()).filter(p => p.roomId === roomId)
  }

  /**
   * Start game loop for state synchronization
   */
  startGameLoop(updateCallback, fps = 60) {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval)
    }
    
    let lastTime = Date.now()
    this.gameLoopInterval = setInterval(() => {
      const currentTime = Date.now()
      const deltaTime = (currentTime - lastTime) / 1000
      lastTime = currentTime
      
      if (updateCallback) {
        updateCallback(deltaTime)
      }
    }, 1000 / fps)
  }

  /**
   * Stop game loop
   */
  stopGameLoop() {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval)
      this.gameLoopInterval = null
    }
  }

  /**
   * Get Socket.io server instance
   */
  getIO() {
    return this.io
  }
}