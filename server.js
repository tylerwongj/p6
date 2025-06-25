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

const PORT = process.env.PORT || 3000

// Serve static files
app.use(express.static('public'))
app.use('/node_modules', express.static('node_modules'))

// Game state management
const games = new Map()

// Initialize Pong game
console.log('Attempting to import Pong game...')
import('./games/pong/pong-game.js').then(({ PongGame }) => {
  console.log('PongGame imported successfully')
  const pongGame = new PongGame(multiplayerServer)
  games.set('pong', pongGame)
  console.log('Pong game initialized, players:', pongGame.getPlayerCount())
}).catch(error => {
  console.error('Failed to import PongGame:', error)
})

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Serve Pong game assets FIRST (before the HTML route)
app.use('/pong', express.static(path.join(__dirname, 'games', 'pong', 'public')))

// Serve Pong game HTML (this will handle /pong when it's not a static file)
app.get('/pong', (req, res) => {
  res.sendFile(path.join(__dirname, 'games', 'pong', 'public', 'index.html'))
})

// API Routes
app.get('/api/games', (req, res) => {
  const gameList = Array.from(games.keys()).map(gameId => {
    const game = games.get(gameId)
    return {
      id: gameId,
      name: game.name || gameId,
      description: game.description || `Play ${gameId}`,
      players: game.getPlayerCount ? game.getPlayerCount() : 0,
      maxPlayers: game.maxPlayers || 2,
      status: game.status || 'available'
    }
  })
  
  res.json(gameList)
})

server.listen(PORT, () => {
  console.log(`Tyler Arcade running on http://localhost:${PORT}`)
  console.log('Games available:')
  console.log('  • Hub: http://localhost:' + PORT)
  console.log('  • Pong: http://localhost:' + PORT + '/pong')
  console.log('Press Ctrl+C to stop')
})