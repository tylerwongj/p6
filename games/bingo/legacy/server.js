import express from 'express'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { MultiplayerServer } from '@tyler-arcade/multiplayer'
import { BingoGame } from './bingo-game.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const multiplayerServer = new MultiplayerServer(server)

const PORT = process.env.PORT || 3003

// Serve static files
app.use(express.static('public'))
app.use('/node_modules', express.static('../../node_modules'))

// Create Bingo game instance
const bingoGame = new BingoGame()
bingoGame.setMultiplayerServer(multiplayerServer)

// Connect Bingo game to multiplayer server with callbacks
multiplayerServer.on('playerJoin', (socketId, playerName, roomId, socket) => {
  return bingoGame.handlePlayerJoin(socketId, playerName, roomId, socket)
})

multiplayerServer.on('playerLeave', (socketId, player, socket) => {
  bingoGame.handlePlayerLeave(socketId, player, socket)
})

multiplayerServer.on('playerInput', (socketId, input, socket) => {
  bingoGame.handlePlayerInput(socketId, input, socket)
})

multiplayerServer.on('customEvent', (socketId, eventName, args, socket) => {
  bingoGame.handleCustomEvent(socketId, eventName, args, socket)
})

multiplayerServer.on('playerConnected', (socketId, socket) => {
  bingoGame.handlePlayerConnected(socketId, socket)
})

// Start server
server.listen(PORT, () => {
  console.log(`🎱 Bingo game server running on http://localhost:${PORT}`)
  console.log('Ready for multiplayer Bingo action!')
})