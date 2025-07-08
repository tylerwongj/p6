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

const PORT = process.env.PORT || 3012

// Serve static files
app.use(express.static('public'))
app.use('/node_modules', express.static('../../node_modules'))

// Game constants
const TRACK_LENGTH = 200
const TRACK_WIDTH = 20
const CAR_SPEED = 0.5
const MAX_SPEED = 2.0
const FRICTION = 0.02

// Generate racing track
function generateTrack() {
  const track = []
  const checkpoints = []
  
  for (let i = 0; i < TRACK_LENGTH; i++) {
    const progress = i / TRACK_LENGTH
    const angle = progress * Math.PI * 4 // 2 full loops
    const radius = 50 + Math.sin(progress * Math.PI * 6) * 20
    
    track.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      y: Math.sin(progress * Math.PI * 2) * 5, // Elevation changes
      width: TRACK_WIDTH + Math.sin(progress * Math.PI * 8) * 5
    })
    
    // Add checkpoints every 25 track segments
    if (i % 25 === 0) {
      checkpoints.push({
        id: checkpoints.length,
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        y: Math.sin(progress * Math.PI * 2) * 5
      })
    }
  }
  
  return { track, checkpoints }
}

// Game state
let raceTrack = generateTrack()
let gameState = {
  players: {},
  track: raceTrack.track,
  checkpoints: raceTrack.checkpoints,
  gameActive: false,
  raceStartTime: 0,
  lapCount: 3,
  winner: null,
  raceFinished: false
}

// Handle multiplayer events
multiplayerServer.on('playerJoin', (socketId, playerName, roomId, socket) => {
  console.log(`🏎️ 3D Racing: ${playerName} (${socketId}) wants to join room ${roomId}`)
  
  if (roomId !== '3d-racing') {
    return { success: false, reason: 'Wrong room - this is 3D Racing' }
  }
  
  // Spawn player at start line
  gameState.players[socketId] = { 
    id: socketId, 
    name: playerName,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rotation: 0,
    speed: 0,
    lap: 0,
    checkpoint: 0,
    position: 0,
    finished: false,
    finishTime: 0,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`,
    cameraAngle: 0,
    cameraHeight: 5,
    cameraDistance: 10
  }
  
  // Start race when at least 2 players join
  if (Object.keys(gameState.players).length >= 2 && !gameState.gameActive) {
    gameState.gameActive = true
    gameState.raceStartTime = Date.now()
  }
  
  console.log(`✅ ${playerName} joined 3D Racing`)
  return {
    success: true,
    playerData: { playerId: socketId, playerName }
  }
})

multiplayerServer.on('playerLeave', (socketId, player) => {
  console.log(`Player ${socketId} left`)
  delete gameState.players[socketId]
  
  if (Object.keys(gameState.players).length < 2) {
    gameState.gameActive = false
  }
})

multiplayerServer.on('customEvent', (socketId, eventName, args, socket) => {
  console.log(`🏎️ 3D Racing: Custom event '${eventName}' from ${socketId}`)
  
  const player = gameState.players[socketId]
  if (!player) return
  
  if (eventName === 'accelerate') {
    if (gameState.gameActive && !player.finished) {
      player.speed = Math.min(player.speed + CAR_SPEED, MAX_SPEED)
    }
    
  } else if (eventName === 'brake') {
    if (gameState.gameActive && !player.finished) {
      player.speed = Math.max(player.speed - CAR_SPEED * 2, -MAX_SPEED * 0.5)
    }
    
  } else if (eventName === 'steer') {
    const { direction } = args[0] || args
    if (gameState.gameActive && !player.finished) {
      if (direction === 'left') {
        player.rotation -= 0.1
      } else if (direction === 'right') {
        player.rotation += 0.1
      }
    }
    
  } else if (eventName === 'cameraControl') {
    const { direction } = args[0] || args
    if (direction === 'left') {
      player.cameraAngle -= 0.1
    } else if (direction === 'right') {
      player.cameraAngle += 0.1
    } else if (direction === 'up') {
      player.cameraHeight = Math.min(player.cameraHeight + 1, 15)
    } else if (direction === 'down') {
      player.cameraHeight = Math.max(player.cameraHeight - 1, 2)
    }
    
  } else if (eventName === 'resetGame') {
    // Reset race
    raceTrack = generateTrack()
    gameState.track = raceTrack.track
    gameState.checkpoints = raceTrack.checkpoints
    gameState.gameActive = false
    gameState.winner = null
    gameState.raceFinished = false
    gameState.raceStartTime = 0
    
    // Reset all players
    Object.values(gameState.players).forEach(p => {
      p.x = 0
      p.y = 0
      p.z = 0
      p.vx = 0
      p.vy = 0
      p.vz = 0
      p.rotation = 0
      p.speed = 0
      p.lap = 0
      p.checkpoint = 0
      p.position = 0
      p.finished = false
      p.finishTime = 0
    })
    
    if (Object.keys(gameState.players).length >= 2) {
      gameState.gameActive = true
      gameState.raceStartTime = Date.now()
    }
    
    console.log('🔄 3D Racing reset!')
  }
})

// Game physics update
function updateRacePhysics() {
  if (!gameState.gameActive) return
  
  Object.values(gameState.players).forEach(player => {
    if (player.finished) return
    
    // Apply movement
    player.vx = Math.cos(player.rotation) * player.speed
    player.vz = Math.sin(player.rotation) * player.speed
    
    player.x += player.vx
    player.z += player.vz
    
    // Apply friction
    player.speed *= (1 - FRICTION)
    
    // Track following and checkpoint detection
    let closestTrackPoint = null
    let minDistance = Infinity
    let trackIndex = 0
    
    gameState.track.forEach((point, index) => {
      const dx = player.x - point.x
      const dz = player.z - point.z
      const distance = Math.sqrt(dx * dx + dz * dz)
      
      if (distance < minDistance) {
        minDistance = distance
        closestTrackPoint = point
        trackIndex = index
      }
    })
    
    if (closestTrackPoint) {
      player.y = closestTrackPoint.y
      player.position = trackIndex
    }
    
    // Checkpoint detection
    gameState.checkpoints.forEach(checkpoint => {
      const dx = player.x - checkpoint.x
      const dz = player.z - checkpoint.z
      const distance = Math.sqrt(dx * dx + dz * dz)
      
      if (distance < 10 && checkpoint.id === player.checkpoint) {
        player.checkpoint++
        
        // Check for lap completion
        if (player.checkpoint >= gameState.checkpoints.length) {
          player.lap++
          player.checkpoint = 0
          
          console.log(`🏁 ${player.name} completed lap ${player.lap}`)
          
          // Check for race finish
          if (player.lap >= gameState.lapCount) {
            player.finished = true
            player.finishTime = Date.now() - gameState.raceStartTime
            
            if (!gameState.winner) {
              gameState.winner = player.name
              gameState.raceFinished = true
              console.log(`🏆 ${player.name} wins the race!`)
            }
          }
        }
      }
    })
  })
}

// Start game loop
multiplayerServer.startGameLoop((deltaTime) => {
  updateRacePhysics()
  
  const players = Object.values(gameState.players)
  multiplayerServer.broadcastToRoom('3d-racing', 'gameState', {
    ...gameState,
    players: players
  })
}, 16)

server.listen(PORT, () => {
  console.log(`3D Racing server running on http://localhost:${PORT}`)
})