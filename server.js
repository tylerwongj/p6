import express from 'express'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
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

// Auto-discover and load all games
async function loadAllGames() {
  const gamesDir = path.join(__dirname, 'games')
  
  try {
    const gameDirectories = fs.readdirSync(gamesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
    
    console.log(`Found ${gameDirectories.length} game directories:`, gameDirectories)
    
    for (const gameDir of gameDirectories) {
      const gamePath = path.join(gamesDir, gameDir)
      const gameClassFile = path.join(gamePath, `${gameDir}-game.js`)
      
      // Check if game class file exists
      if (fs.existsSync(gameClassFile)) {
        try {
          console.log(`Attempting to import ${gameDir} game...`)
          const gameModule = await import(`./games/${gameDir}/${gameDir}-game.js`)
          
          // Try different export patterns
          let GameClass = gameModule.default || gameModule[`${gameDir.charAt(0).toUpperCase() + gameDir.slice(1)}Game`]
          
          // Handle special naming cases
          if (!GameClass) {
            const className = gameDir.split('-').map(part => 
              part.charAt(0).toUpperCase() + part.slice(1)
            ).join('') + 'Game'
            GameClass = gameModule[className]
          }
          
          if (GameClass) {
            console.log(`${gameDir} GameClass imported successfully`)
            const gameInstance = new GameClass()
            
            // Set multiplayer server reference so game can broadcast
            if (gameInstance.setMultiplayerServer) {
              gameInstance.setMultiplayerServer(multiplayerServer)
              console.log(`${gameDir} multiplayer server reference set`)
            }
            
            gameRegistry.registerGame(gameDir, gameInstance)
            console.log(`${gameDir} game registered with GameRegistry, players:`, gameInstance.getPlayerCount())
            
            // Set up static file serving for this game
            app.use(`/${gameDir}`, express.static(path.join(gamePath, 'public')))
            
            // Set up HTML route for this game
            app.get(`/${gameDir}`, (req, res) => {
              const indexPath = path.join(gamePath, 'public', 'index.html')
              if (fs.existsSync(indexPath)) {
                res.sendFile(indexPath)
              } else {
                res.status(404).send(`Game ${gameDir} not found`)
              }
            })
            
          } else {
            console.log(`❌ Could not find game class in ${gameDir}-game.js`)
          }
        } catch (error) {
          console.log(`❌ Failed to import ${gameDir} game:`, error.message)
        }
      } else {
        console.log(`⚠️ No game class file found for ${gameDir} (looking for ${gameDir}-game.js)`)
        
        // Still set up static files and routes for games without classes (legacy support)
        const publicPath = path.join(gamesDir, gameDir, 'public')
        if (fs.existsSync(publicPath)) {
          app.use(`/${gameDir}`, express.static(publicPath))
          app.get(`/${gameDir}`, (req, res) => {
            const indexPath = path.join(publicPath, 'index.html')
            if (fs.existsSync(indexPath)) {
              res.sendFile(indexPath)
            } else {
              res.status(404).send(`Game ${gameDir} not found`)
            }
          })
          console.log(`📁 Set up static serving for ${gameDir} (no game class)`)
        }
      }
    }
  } catch (error) {
    console.error('Error loading games:', error)
  }
}

// Load all games
await loadAllGames()

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// API Routes
app.get('/api/games', (req, res) => {
  const gameList = gameRegistry.getAllGameStatus()
  res.json(gameList)
})

// Start unified game loop for all games that need it
multiplayerServer.startGameLoop((deltaTime) => {
  const games = gameRegistry.getGames()
  
  for (const [gameId, game] of games) {
    if (game.update && typeof game.update === 'function') {
      try {
        game.update(deltaTime)
      } catch (error) {
        console.error(`Error updating ${gameId}:`, error)
      }
    }
  }
}, 60) // 60 FPS for all games

server.listen(PORT, () => {
  console.log(`Tyler Arcade running on http://localhost:${PORT}`)
  console.log('Games available:')
  console.log('  • Hub: http://localhost:' + PORT)
  
  const games = gameRegistry.getGames()
  for (const [gameId, game] of games) {
    console.log(`  • ${game.name || gameId}: http://localhost:${PORT}/${gameId}`)
  }
  
  console.log('Press Ctrl+C to stop')
})