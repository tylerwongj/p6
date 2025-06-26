import { BaseGame } from '@tyler-arcade/multiplayer'

/**
 * TicTacToeGame - Tic-tac-toe game implementation using BaseGame pattern
 */
export class TicTacToeGame extends BaseGame {
  constructor() {
    super()
    this.name = 'Tic-Tac-Toe'
    this.description = 'Classic X and O strategy game for 2 players'
    this.maxPlayers = 2
    
    // Game state
    this.gameState = {
      board: Array(9).fill(null),
      currentPlayer: 'X',
      players: {},
      gameActive: false,
      winner: null
    }
  }

  /**
   * Handle a player joining the tic-tac-toe game
   */
  handlePlayerJoin(socketId, playerName, roomId, socket) {
    console.log(`🎯 TicTacToe: ${playerName} (${socketId}) wants to join room ${roomId}`)
    
    // Only handle tic-tac-toe room joins
    if (roomId !== 'tic-tac-toe') {
      console.log(`❌ TicTacToe: Rejecting join for room ${roomId}`)
      return {
        success: false,
        reason: 'Wrong room - this is Tic-Tac-Toe'
      }
    }
    
    // Assign player symbol (X or O)
    const activePlayers = Object.values(this.gameState.players).filter(p => !p.spectator)
    const playerCount = activePlayers.length
    
    if (playerCount === 0) {
      this.gameState.players[socketId] = { id: socketId, symbol: 'X', name: playerName }
      this.players.push({ id: socketId, name: playerName, symbol: 'X' })
      console.log(`✅ ${playerName} joined as Player X`)
      return {
        success: true,
        playerData: { playerId: 1, playerName, symbol: 'X' }
      }
    } else if (playerCount === 1) {
      this.gameState.players[socketId] = { id: socketId, symbol: 'O', name: playerName }
      this.players.push({ id: socketId, name: playerName, symbol: 'O' })
      this.gameState.gameActive = true // Start game when 2 players join
      console.log(`✅ ${playerName} joined as Player O - Game starting!`)
      return {
        success: true,
        playerData: { playerId: 2, playerName, symbol: 'O' }
      }
    } else {
      // Spectator mode for additional players
      this.gameState.players[socketId] = { id: socketId, symbol: null, name: playerName, spectator: true }
      this.players.push({ id: socketId, name: playerName, spectator: true })
      console.log(`✅ ${playerName} joined as Spectator`)
      return {
        success: true,
        playerData: { playerId: null, playerName, spectator: true }
      }
    }
  }

  /**
   * Handle a player leaving the game
   */
  handlePlayerLeave(socketId, player, socket) {
    console.log(`Player ${socketId} left`)
    delete this.gameState.players[socketId]
    
    // Remove from players array
    this.players = this.players.filter(p => p.id !== socketId)
    
    // Reset game if less than 2 players
    const activePlayers = Object.values(this.gameState.players).filter(p => !p.spectator)
    if (activePlayers.length < 2) {
      this.gameState.gameActive = false
      this.gameState.board = Array(9).fill(null)
      this.gameState.currentPlayer = 'X'
      this.gameState.winner = null
    }
  }

  /**
   * Handle custom events for tic-tac-toe
   */
  handleCustomEvent(socketId, eventName, args, socket) {
    console.log(`🎯 TicTacToe: Custom event '${eventName}' from ${socketId}`)
    
    if (eventName === 'playerMove') {
      const player = this.gameState.players[socketId]
      const position = args[0]?.position || args.position
      
      console.log(`🎯 Move attempt: Player ${player?.symbol} at position ${position}`)
      
      // Validate move
      if (!this.gameState.gameActive || !player || player.spectator) {
        console.log('❌ Move rejected: Game not active or player is spectator')
        return
      }
      if (player.symbol !== this.gameState.currentPlayer) {
        console.log(`❌ Move rejected: Not ${player.symbol}'s turn (current: ${this.gameState.currentPlayer})`)
        return
      }
      if (this.gameState.board[position] !== null) {
        console.log('❌ Move rejected: Position already taken')
        return
      }
      if (this.gameState.winner) {
        console.log('❌ Move rejected: Game already over')
        return
      }
      
      // Make move
      this.gameState.board[position] = player.symbol
      console.log(`✅ Move made: ${player.symbol} at position ${position}`)
      
      // Check for winner
      const winner = this.checkWinner(this.gameState.board)
      if (winner) {
        this.gameState.winner = winner
        this.gameState.gameActive = false
        console.log(`🏆 Game over: ${winner} wins!`)
      } else if (this.gameState.board.every(cell => cell !== null)) {
        this.gameState.winner = 'tie'
        this.gameState.gameActive = false
        console.log('🤝 Game over: Tie!')
      } else {
        // Switch turns
        this.gameState.currentPlayer = this.gameState.currentPlayer === 'X' ? 'O' : 'X'
        console.log(`🔄 Turn switched to: ${this.gameState.currentPlayer}`)
      }
    } else if (eventName === 'resetGame') {
      const activePlayers = Object.values(this.gameState.players).filter(p => !p.spectator)
      
      if (activePlayers.length >= 2) {
        this.gameState.board = Array(9).fill(null)
        this.gameState.currentPlayer = 'X'
        this.gameState.winner = null
        this.gameState.gameActive = true
        console.log('🔄 Game reset!')
      }
    }
  }

  /**
   * Update game state and broadcast to all players
   */
  update(deltaTime) {
    // Broadcast game state to all clients
    const players = Object.values(this.gameState.players)
    this.broadcast('gameState', {
      ...this.gameState,
      players: players
    })
  }

  /**
   * Check for winner in tic-tac-toe board
   */
  checkWinner(board) {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ]
    
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]
      }
    }
    
    return null
  }

  /**
   * Get current game status
   */
  getStatus() {
    if (this.gameState.winner) {
      return 'finished'
    }
    if (this.gameState.gameActive) {
      return 'playing'
    }
    const activePlayers = Object.values(this.gameState.players).filter(p => !p.spectator)
    if (activePlayers.length >= this.maxPlayers) {
      return 'full'
    }
    if (activePlayers.length > 0) {
      return 'waiting'
    }
    return 'available'
  }
}

export default TicTacToeGame