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

const PORT = process.env.PORT || 3004

// Serve static files
app.use(express.static('public'))
app.use('/node_modules', express.static('../../node_modules'))

// Tetris pieces
const PIECES = {
  I: [[[1,1,1,1]]],
  O: [[[1,1],[1,1]]],
  T: [[[0,1,0],[1,1,1]], [[1,0],[1,1],[1,0]], [[1,1,1],[0,1,0]], [[0,1],[1,1],[0,1]]],
  S: [[[0,1,1],[1,1,0]], [[1,0],[1,1],[0,1]]],
  Z: [[[1,1,0],[0,1,1]], [[0,1],[1,1],[1,0]]],
  J: [[[1,0,0],[1,1,1]], [[1,1],[1,0],[1,0]], [[1,1,1],[0,0,1]], [[0,1],[0,1],[1,1]]],
  L: [[[0,0,1],[1,1,1]], [[1,0],[1,0],[1,1]], [[1,1,1],[1,0,0]], [[1,1],[0,1],[0,1]]]
}

class TetrisGameState {
  constructor() {
    this.players = []
    this.gameStarted = false
    this.boards = {}
    this.scores = {}
    this.gameEnded = false
    this.winner = null
    this.dropInterval = 1000
  }

  createPlayerBoard(playerId) {
    return {
      grid: Array(20).fill(null).map(() => Array(10).fill(0)),
      currentPiece: this.generatePiece(),
      nextPiece: this.generatePiece(),
      pieceX: 4,
      pieceY: 0,
      dropTime: 0,
      linesCleared: 0,
      level: 1,
      score: 0,
      gameOver: false
    }
  }

  generatePiece() {
    const pieces = Object.keys(PIECES)
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)]
    return {
      type: randomPiece,
      shape: PIECES[randomPiece][0],
      rotation: 0
    }
  }

  rotatePiece(piece) {
    const rotations = PIECES[piece.type]
    const nextRotation = (piece.rotation + 1) % rotations.length
    return {
      ...piece,
      shape: rotations[nextRotation],
      rotation: nextRotation
    }
  }

  isValidPosition(board, piece, x, y) {
    for (let py = 0; py < piece.shape.length; py++) {
      for (let px = 0; px < piece.shape[py].length; px++) {
        if (piece.shape[py][px]) {
          const newX = x + px
          const newY = y + py
          
          if (newX < 0 || newX >= 10 || newY >= 20) {
            return false
          }
          
          if (newY >= 0 && board.grid[newY][newX]) {
            return false
          }
        }
      }
    }
    return true
  }

  placePiece(board, piece, x, y) {
    for (let py = 0; py < piece.shape.length; py++) {
      for (let px = 0; px < piece.shape[py].length; px++) {
        if (piece.shape[py][px]) {
          const newX = x + px
          const newY = y + py
          if (newY >= 0) {
            board.grid[newY][newX] = 1
          }
        }
      }
    }
  }

  clearLines(board) {
    let linesCleared = 0
    for (let y = board.grid.length - 1; y >= 0; y--) {
      if (board.grid[y].every(cell => cell === 1)) {
        board.grid.splice(y, 1)
        board.grid.unshift(Array(10).fill(0))
        linesCleared++
        y++
      }
    }
    
    if (linesCleared > 0) {
      board.linesCleared += linesCleared
      board.score += linesCleared * 100 * board.level
      board.level = Math.floor(board.linesCleared / 10) + 1
    }
    
    return linesCleared
  }

  handlePlayerInput(playerId, input) {
    const board = this.boards[playerId]
    if (!board || board.gameOver) return

    if (input.left) {
      if (this.isValidPosition(board, board.currentPiece, board.pieceX - 1, board.pieceY)) {
        board.pieceX--
      }
    }
    
    if (input.right) {
      if (this.isValidPosition(board, board.currentPiece, board.pieceX + 1, board.pieceY)) {
        board.pieceX++
      }
    }
    
    if (input.down) {
      if (this.isValidPosition(board, board.currentPiece, board.pieceX, board.pieceY + 1)) {
        board.pieceY++
        board.score += 1
      }
    }
    
    if (input.up) {
      const rotatedPiece = this.rotatePiece(board.currentPiece)
      if (this.isValidPosition(board, rotatedPiece, board.pieceX, board.pieceY)) {
        board.currentPiece = rotatedPiece
      }
    }
    
    if (input.space) {
      while (this.isValidPosition(board, board.currentPiece, board.pieceX, board.pieceY + 1)) {
        board.pieceY++
        board.score += 2
      }
    }
  }

  update(deltaTime) {
    if (!this.gameStarted || this.gameEnded) return

    Object.keys(this.boards).forEach(playerId => {
      const board = this.boards[playerId]
      if (board.gameOver) return

      board.dropTime += deltaTime

      if (board.dropTime >= this.dropInterval / board.level) {
        board.dropTime = 0
        
        if (this.isValidPosition(board, board.currentPiece, board.pieceX, board.pieceY + 1)) {
          board.pieceY++
        } else {
          this.placePiece(board, board.currentPiece, board.pieceX, board.pieceY)
          this.clearLines(board)
          
          board.currentPiece = board.nextPiece
          board.nextPiece = this.generatePiece()
          board.pieceX = 4
          board.pieceY = 0
          
          if (!this.isValidPosition(board, board.currentPiece, board.pieceX, board.pieceY)) {
            board.gameOver = true
            this.checkGameEnd()
          }
        }
      }
    })
  }

  checkGameEnd() {
    const alivePlayers = Object.keys(this.boards).filter(id => !this.boards[id].gameOver)
    if (alivePlayers.length <= 1) {
      this.gameEnded = true
      this.winner = alivePlayers.length === 1 ? alivePlayers[0] : null
    }
  }

  startGame() {
    this.gameStarted = true
    this.gameEnded = false
    this.winner = null
    
    this.players.forEach(player => {
      this.boards[player.id] = this.createPlayerBoard(player.id)
      this.scores[player.id] = 0
    })
  }

  resetGame() {
    this.gameStarted = false
    this.gameEnded = false
    this.winner = null
    this.boards = {}
    this.scores = {}
  }
}

const gameState = new TetrisGameState()

multiplayerServer.on('playerJoin', (socketId, playerName, roomId, socket) => {
  console.log(`🎯 Tetris: ${playerName} (${socketId}) wants to join room ${roomId}`);
  
  // Only handle tetris room joins
  if (roomId !== 'tetris') {
    console.log(`❌ Tetris: Rejecting join for room ${roomId}`);
    return {
      success: false,
      reason: 'Wrong room - this is Tetris'
    };
  }
  
  if (gameState.players.length < 4) {
    const player = {
      id: socketId,
      name: playerName,
      playerId: gameState.players.length + 1
    }
    
    gameState.players.push(player)
    console.log(`✅ ${playerName} joined Tetris game`)
    
    if (gameState.gameStarted) {
      gameState.boards[socketId] = gameState.createPlayerBoard(socketId)
    }
    
    return {
      success: true,
      playerData: { playerId: player.playerId, playerName }
    }
  } else {
    console.log(`❌ Tetris game full (${gameState.players.length}/4)`);
    return {
      success: false,
      reason: 'Game is full (max 4 players)'
    }
  }
})

multiplayerServer.on('playerLeave', (socketId, player) => {
  const playerIndex = gameState.players.findIndex(p => p.id === socketId)
  if (playerIndex !== -1) {
    const leavingPlayer = gameState.players[playerIndex] 
    gameState.players.splice(playerIndex, 1)
    delete gameState.boards[socketId]
    delete gameState.scores[socketId]
    
    console.log(`${leavingPlayer.name} left the game`)
    
    if (gameState.gameStarted) {
      gameState.checkGameEnd()
    }
  }
})

multiplayerServer.on('playerInput', (socketId, input) => {
  if (gameState.gameStarted) {
    gameState.handlePlayerInput(socketId, input)
  }
})

multiplayerServer.on('customEvent', (socketId, eventName, args) => {
  if (eventName === 'startGame' && gameState.players.length >= 1) {
    gameState.startGame()
  } else if (eventName === 'resetGame') {
    gameState.resetGame()
  }
})

multiplayerServer.startGameLoop((deltaTime) => {
  gameState.update(deltaTime)
  
  // Send game state to tetris room only
  multiplayerServer.broadcastToRoom('tetris', 'gameState', {
    players: gameState.players,
    boards: gameState.boards,
    gameStarted: gameState.gameStarted,
    gameEnded: gameState.gameEnded,
    winner: gameState.winner
  })
}, 60)

server.listen(PORT, () => {
  console.log(`Tetris server running on http://localhost:${PORT}`)
  console.log('Press Ctrl+C to stop')
})