import express from 'express'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { MultiplayerServer } from '@tyler-arcade/multiplayer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const multiplayerServer = new MultiplayerServer(server)

const PORT = process.env.PORT || 3002

// Serve static files
app.use(express.static('public'))
app.use('/node_modules', express.static('../../node_modules'))

// Game state
let gameState = {
  board: Array(9).fill(null),
  currentPlayer: 'X',
  players: {},
  gameActive: false,
  winner: null
}

// Handle multiplayer events
multiplayerServer.on('playerJoin', (socketId, playerName, roomId, socket) => {
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
  const activePlayers = Object.values(gameState.players).filter(p => !p.spectator)
  const playerCount = activePlayers.length
  
  if (playerCount === 0) {
    gameState.players[socketId] = { id: socketId, symbol: 'X', name: playerName }
    console.log(`✅ ${playerName} joined as Player X`)
    return {
      success: true,
      playerData: { playerId: 1, playerName, symbol: 'X' }
    }
  } else if (playerCount === 1) {
    gameState.players[socketId] = { id: socketId, symbol: 'O', name: playerName }
    gameState.gameActive = true // Start game when 2 players join
    console.log(`✅ ${playerName} joined as Player O - Game starting!`)
    return {
      success: true,
      playerData: { playerId: 2, playerName, symbol: 'O' }
    }
  } else {
    // Spectator mode for additional players
    gameState.players[socketId] = { id: socketId, symbol: null, name: playerName, spectator: true }
    console.log(`✅ ${playerName} joined as Spectator`)
    return {
      success: true,
      playerData: { playerId: null, playerName, spectator: true }
    }
  }
})

multiplayerServer.on('playerLeave', (socketId, player) => {
  console.log(`Player ${socketId} left`)
  delete gameState.players[socketId]
  
  // Reset game if less than 2 players
  if (Object.keys(gameState.players).filter(id => !gameState.players[id].spectator).length < 2) {
    gameState.gameActive = false
    gameState.board = Array(9).fill(null)
    gameState.currentPlayer = 'X'
    gameState.winner = null
  }
})

multiplayerServer.on('customEvent', (socketId, eventName, args, socket) => {
  console.log(`🎯 TicTacToe: Custom event '${eventName}' from ${socketId}`)
  
  if (eventName === 'playerMove') {
    const player = gameState.players[socketId]
    const position = args[0]?.position || args.position
    
    console.log(`🎯 Move attempt: Player ${player?.symbol} at position ${position}`)
    
    // Validate move
    if (!gameState.gameActive || !player || player.spectator) {
      console.log('❌ Move rejected: Game not active or player is spectator')
      return
    }
    if (player.symbol !== gameState.currentPlayer) {
      console.log(`❌ Move rejected: Not ${player.symbol}'s turn (current: ${gameState.currentPlayer})`)
      return
    }
    if (gameState.board[position] !== null) {
      console.log('❌ Move rejected: Position already taken')
      return
    }
    if (gameState.winner) {
      console.log('❌ Move rejected: Game already over')
      return
    }
    
    // Make move
    gameState.board[position] = player.symbol
    console.log(`✅ Move made: ${player.symbol} at position ${position}`)
    
    // Check for winner
    const winner = checkWinner(gameState.board)
    if (winner) {
      gameState.winner = winner
      gameState.gameActive = false
      console.log(`🏆 Game over: ${winner} wins!`)
    } else if (gameState.board.every(cell => cell !== null)) {
      gameState.winner = 'tie'
      gameState.gameActive = false
      console.log('🤝 Game over: Tie!')
    } else {
      // Switch turns
      gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X'
      console.log(`🔄 Turn switched to: ${gameState.currentPlayer}`)
    }
  } else if (eventName === 'resetGame') {
    const activePlayers = Object.values(gameState.players).filter(p => !p.spectator)
    
    if (activePlayers.length >= 2) {
      gameState.board = Array(9).fill(null)
      gameState.currentPlayer = 'X'
      gameState.winner = null
      gameState.gameActive = true
      console.log('🔄 Game reset!')
    }
  }
})

// Start game loop using multiplayer server
multiplayerServer.startGameLoop((deltaTime) => {
  // Broadcast game state to all clients
  const players = Object.values(gameState.players)
  multiplayerServer.broadcastToRoom('tic-tac-toe', 'gameState', {
    ...gameState,
    players: players
  })
}, 10) // Slower update rate for tic-tac-toe

function checkWinner(board) {
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

server.listen(PORT, () => {
  console.log(`Tic-Tac-Toe server running on http://localhost:${PORT}`)
})