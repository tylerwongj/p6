import express from 'express'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { MultiplayerServer } from '@tyler-arcade/multiplayer'
import { SnakeGame } from './snake-game.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const multiplayerServer = new MultiplayerServer(server)

const PORT = process.env.PORT || 3001

// Serve static files
app.use(express.static('public'))
app.use('/node_modules', express.static('../../node_modules'))

// Create Snake game instance
const snakeGame = new SnakeGame()
snakeGame.setMultiplayerServer(multiplayerServer)

// Connect Snake game to multiplayer server with callbacks
multiplayerServer.on('playerJoin', (socketId, playerName, roomId, socket) => {
  console.log(`🔗 Server: Routing join request from ${playerName} (${socketId}) to Snake game`)
  const result = snakeGame.handlePlayerJoin(socketId, playerName, roomId, socket)
  console.log(`🔗 Server: Snake game returned:`, result)
  return result
})

multiplayerServer.on('playerLeave', (socketId, player, socket) => {
  console.log(`🔗 Server: Routing leave request from ${socketId} to Snake game`)
  snakeGame.handlePlayerLeave(socketId, player, socket)
})

multiplayerServer.on('playerInput', (socketId, input, socket) => {
  snakeGame.handlePlayerInput(socketId, input, socket)
})

multiplayerServer.on('customEvent', (socketId, eventName, args, socket) => {
  console.log(`🔗 Server: Routing custom event '${eventName}' from ${socketId} to Snake game`)
  snakeGame.handleCustomEvent(socketId, eventName, args, socket)
})

multiplayerServer.on('playerConnected', (socketId, socket) => {
  console.log(`🔗 Server: New connection ${socketId}`)
  snakeGame.handlePlayerConnected(socketId, socket)
})

// Start server
server.listen(PORT, () => {
  console.log(`🐍 Snake game server running on http://localhost:${PORT}`)
  console.log('Ready for multiplayer Snake action!')
})