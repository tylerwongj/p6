import express from 'express'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { MultiplayerServer } from '@tyler-arcade/multiplayer'
import { AzulCompleteGame } from './azul-complete-game.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const multiplayerServer = new MultiplayerServer(server)

const PORT = process.env.PORT || 3000

app.use(express.static('public'))
app.use('/node_modules', express.static('../../node_modules'))

// Initialize BaseGame instance
const game = new AzulCompleteGame()

// Register BaseGame with MultiplayerServer
multiplayerServer.registerGame(game)

// Legacy standalone server support - use BaseGame event handlers
multiplayerServer.on('playerJoin', (socketId, playerName, roomId, socket) => {
  return game.handlePlayerJoin(socketId, playerName, roomId, socket)
})

multiplayerServer.on('playerLeave', (socketId, player, socket) => {
  game.handlePlayerLeave(socketId, player, socket)
})

multiplayerServer.on('customEvent', (socketId, eventName, data, socket) => {
  game.handleCustomEvent(socketId, eventName, data, socket)
})

// Start unified game loop for BaseGame
multiplayerServer.startGameLoop((deltaTime) => {
  game.update(deltaTime)
}, 60)

server.listen(PORT, () => {
  console.log(`Azul Complete server running on http://localhost:${PORT}`)
})