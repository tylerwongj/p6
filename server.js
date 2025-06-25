import express from 'express'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { MultiplayerServer, GameRegistry } from '@tyler-arcade/multiplayer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const multiplayerServer = new MultiplayerServer(server)
const gameRegistry = new GameRegistry(multiplayerServer)

const PORT = process.env.PORT || 3000

// Serve static files
app.use(express.static('public'))
app.use('/node_modules', express.static('node_modules'))

// Initialize games
console.log('Attempting to import Pong game...')
import('./games/pong/pong-game.js').then(({ PongGame }) => {
  console.log('PongGame imported successfully')
  const pongGame = new PongGame()
  gameRegistry.registerGame('pong', pongGame)
  console.log('Pong game registered with GameRegistry, players:', pongGame.getPlayerCount())
}).catch(error => {
  console.error('Failed to import PongGame:', error)
})

console.log('Attempting to import Snake game...')
import('./games/snake/snake-game.js').then(({ SnakeGame }) => {
  console.log('SnakeGame imported successfully')
  const snakeGame = new SnakeGame()
  gameRegistry.registerGame('snake', snakeGame)
  console.log('Snake game registered with GameRegistry, players:', snakeGame.getPlayerCount())
}).catch(error => {
  console.error('Failed to import SnakeGame:', error)
})

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Serve game assets FIRST (before the HTML routes)
app.use('/pong', express.static(path.join(__dirname, 'games', 'pong', 'public')))
app.use('/snake', express.static(path.join(__dirname, 'games', 'snake', 'public')))

// Serve game HTML (these will handle routes when they're not static files)
app.get('/pong', (req, res) => {
  res.sendFile(path.join(__dirname, 'games', 'pong', 'public', 'index.html'))
})

app.get('/snake', (req, res) => {
  res.sendFile(path.join(__dirname, 'games', 'snake', 'public', 'index.html'))
})

// API Routes
app.get('/api/games', (req, res) => {
  const gameList = gameRegistry.getAllGameStatus()
  res.json(gameList)
})

server.listen(PORT, () => {
  console.log(`Tyler Arcade running on http://localhost:${PORT}`)
  console.log('Games available:')
  console.log('  • Hub: http://localhost:' + PORT)
  console.log('  • Pong: http://localhost:' + PORT + '/pong')
  console.log('  • Snake: http://localhost:' + PORT + '/snake')
  console.log('Press Ctrl+C to stop')
})