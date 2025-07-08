// Use globally available io from socket.io script
let socket = null

// Game state
let gameState = {
  players: [],
  track: [],
  checkpoints: [],
  gameActive: false,
  raceStartTime: 0,
  lapCount: 3,
  winner: null,
  raceFinished: false
}

let playerData = null
let keys = {}
let myPlayer = null
let playerId = null
let playerName = null

// DOM elements
const gameStatus = document.getElementById('gameStatus')
const raceStats = document.getElementById('raceStats')
const canvas = document.getElementById('gameCanvas')
const ctx = canvas.getContext('2d')
const leaderboard = document.getElementById('leaderboard')
const playerPositions = document.getElementById('playerPositions')
const winnerAnnouncement = document.getElementById('winnerAnnouncement')
const resetButton = document.getElementById('resetButton')

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('🏎️ 3D Racing client starting...')
  
  // Set up input handlers
  setupInputHandlers()
  
  // Auto-start connection
  connectToServer()
  
  // Start render loop
  requestAnimationFrame(renderGame)
})

function connectToServer() {
  socket = io()
  
  socket.on('connect', () => {
    console.log('Connected to server')
    
    // Auto-join game using TylerArcadePlayer system
    try {
      if (typeof TylerArcadePlayer !== 'undefined' && TylerArcadePlayer.autoJoinGame) {
        playerName = TylerArcadePlayer.autoJoinGame(socket, '3d-racing')
      } else {
        console.error('TylerArcadePlayer not available, joining manually')
        playerName = 'Racer' + Math.floor(Math.random() * 1000)
        socket.emit('joinGame', { name: playerName, roomId: '3d-racing' })
      }
    } catch (error) {
      console.error('Error joining game:', error)
      playerName = 'Racer' + Math.floor(Math.random() * 1000)
      socket.emit('joinGame', { name: playerName, roomId: '3d-racing' })
    }
  })
  
  socket.on('playerAssigned', (data) => {
    playerId = data.playerData.playerId
    playerName = data.playerData.playerName
    console.log('✅ Successfully joined game:', data)
    updateUI()
  })
  
  socket.on('joinFailed', (data) => {
    alert(`Failed to join: ${data.reason}`)
  })
  
  socket.on('gameState', (newGameState) => {
    gameState = newGameState
    // ✅ SAFE - Check Array before find method
    myPlayer = (gameState.players && Array.isArray(gameState.players)) 
      ? gameState.players.find(p => p.id === playerId) : null
    updateUI()
  })
}

// Join game function
window.joinGame = function() {
  // This function kept for potential manual joins, but auto-join is primary
  if (!socket) {
    connectToServer()
  }
}

// Reset game function
window.resetGame = function() {
  if (socket && playerId) {
    socket.emit('customEvent', 'resetGame', {})
  }
}

// Input handlers
function setupInputHandlers() {
  document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true
  })
  
  document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false
  })
  
  // Continuous input handling
  setInterval(() => {
    if (!socket || !playerId || !gameState.gameActive) return
    
    // Racing controls
    if (keys['w'] || keys['arrowup']) {
      socket.emit('customEvent', 'accelerate', {})
    }
    if (keys['s'] || keys['arrowdown']) {
      socket.emit('customEvent', 'brake', {})
    }
    if (keys['a'] || keys['arrowleft']) {
      socket.emit('customEvent', 'steer', { direction: 'left' })
    }
    if (keys['d'] || keys['arrowright']) {
      socket.emit('customEvent', 'steer', { direction: 'right' })
    }
    
    // Camera controls (JKLI)
    if (keys['j']) {
      socket.emit('customEvent', 'cameraControl', { direction: 'left' })
    }
    if (keys['l']) {
      socket.emit('customEvent', 'cameraControl', { direction: 'right' })
    }
    if (keys['i']) {
      socket.emit('customEvent', 'cameraControl', { direction: 'up' })
    }
    if (keys['k']) {
      socket.emit('customEvent', 'cameraControl', { direction: 'down' })
    }
  }, 50)
}

// Update UI
function updateUI() {
  // Update game status
  if (gameState.winner) {
    gameStatus.textContent = `Race Finished!`
    winnerAnnouncement.style.display = 'block'
    winnerAnnouncement.textContent = `🏆 ${gameState.winner} Wins the Race!`
    resetButton.disabled = false
  } else if (gameState.gameActive) {
    gameStatus.textContent = `🏁 Racing in Progress`
    winnerAnnouncement.style.display = 'none'
    resetButton.disabled = false
  } else {
    // ✅ SAFE - Check Array before length
    const playerCount = (gameState.players && Array.isArray(gameState.players)) 
      ? gameState.players.length : 0
    gameStatus.textContent = `Waiting for racers... (${playerCount}/2)`
    winnerAnnouncement.style.display = 'none'
    resetButton.disabled = true
  }
  
  // Update race stats
  updateRaceStats()
  
  // Update leaderboard
  updateLeaderboard()
}

function updateRaceStats() {
  raceStats.innerHTML = ''
  
  if (myPlayer) {
    const stats = [
      { label: 'Lap', value: `${myPlayer.lap + 1}/${gameState.lapCount}` },
      { label: 'Speed', value: `${Math.round(myPlayer.speed * 50)} km/h` },
      { label: 'Checkpoint', value: `${myPlayer.checkpoint}/${gameState.checkpoints.length}` }
    ]
    
    stats.forEach(stat => {
      const statElement = document.createElement('div')
      statElement.className = 'stat'
      statElement.textContent = `${stat.label}: ${stat.value}`
      raceStats.appendChild(statElement)
    })
  }
}

function updateLeaderboard() {
  // ✅ SAFE - Check Array before length
  const hasPlayers = gameState.players && Array.isArray(gameState.players) && gameState.players.length > 0
  if (gameState.gameActive && hasPlayers) {
    leaderboard.style.display = 'block'
    
    // ✅ SAFE - Check Array before spread and sort
    const sortedPlayers = (gameState.players && Array.isArray(gameState.players)) 
      ? [...gameState.players].sort((a, b) => {
          const progressA = a.lap * gameState.checkpoints.length + a.checkpoint
          const progressB = b.lap * gameState.checkpoints.length + b.checkpoint
          return progressB - progressA
        }) : []
    
    playerPositions.innerHTML = ''
    // ✅ SAFE - Check Array before forEach
    if (sortedPlayers && Array.isArray(sortedPlayers)) {
      sortedPlayers.forEach((player, index) => {
      const positionElement = document.createElement('div')
      positionElement.className = 'player-position'
      positionElement.style.borderLeft = `4px solid ${player.color}`
      
      const status = player.finished ? `Finished (${(player.finishTime / 1000).toFixed(1)}s)` : 
                    `Lap ${player.lap + 1}, CP ${player.checkpoint}`
      
      positionElement.innerHTML = `
        <span>${index + 1}. ${player.name}</span>
        <span>${status}</span>
      `
      playerPositions.appendChild(positionElement)
      })
    }
  } else {
    leaderboard.style.display = 'none'
  }
}

// 3D Rendering functions
function project3D(x, y, z, camera) {
  // Simple 3D to 2D projection
  const dx = x - camera.x
  const dy = y - camera.y
  const dz = z - camera.z
  
  // Rotate based on camera angle
  const cos = Math.cos(camera.angle)
  const sin = Math.sin(camera.angle)
  const rotX = dx * cos - dz * sin
  const rotZ = dx * sin + dz * cos
  
  const scale = 200 / (rotZ + camera.distance)
  const screenX = canvas.width / 2 + rotX * scale
  const screenY = canvas.height / 2 + (dy - camera.height) * scale
  
  return { x: screenX, y: screenY, scale }
}

// Render game
function renderGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // Sky gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, '#87CEEB')
  gradient.addColorStop(0.7, '#228B22')
  gradient.addColorStop(1, '#8B4513')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  if (!myPlayer) {
    requestAnimationFrame(renderGame)
    return
  }
  
  // Camera setup
  const camera = {
    x: myPlayer.x,
    y: myPlayer.y + myPlayer.cameraHeight,
    z: myPlayer.z,
    angle: myPlayer.cameraAngle,
    distance: myPlayer.cameraDistance,
    height: myPlayer.cameraHeight
  }
  
  // Render track
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 3
  ctx.beginPath()
  
  for (let i = 0; i < gameState.track.length - 1; i++) {
    const point1 = gameState.track[i]
    const point2 = gameState.track[i + 1]
    
    const proj1 = project3D(point1.x, point1.y, point1.z, camera)
    const proj2 = project3D(point2.x, point2.y, point2.z, camera)
    
    if (i === 0) {
      ctx.moveTo(proj1.x, proj1.y)
    } else {
      ctx.lineTo(proj1.x, proj1.y)
    }
    ctx.lineTo(proj2.x, proj2.y)
  }
  ctx.stroke()
  
  // Render checkpoints
  ctx.fillStyle = '#ffff00'
  gameState.checkpoints.forEach((checkpoint, index) => {
    const proj = project3D(checkpoint.x, checkpoint.y + 2, checkpoint.z, camera)
    if (proj.scale > 0) {
      ctx.beginPath()
      ctx.arc(proj.x, proj.y, Math.max(5, proj.scale * 0.5), 0, 2 * Math.PI)
      ctx.fill()
      
      // Checkpoint number
      ctx.fillStyle = '#000'
      ctx.font = `${Math.max(10, proj.scale * 0.3)}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText(index + 1, proj.x, proj.y + 3)
      ctx.fillStyle = '#ffff00'
    }
  })
  
  // Render players
  // ✅ SAFE - Check Array before forEach
  if (gameState.players && Array.isArray(gameState.players)) {
    gameState.players.forEach(player => {
      const proj = project3D(player.x, player.y, player.z, camera)
      if (proj.scale > 0) {
        // Car body
        ctx.fillStyle = player.color
        const carSize = Math.max(8, proj.scale * 0.4)
        ctx.fillRect(proj.x - carSize/2, proj.y - carSize/2, carSize, carSize)
      
      // Car direction indicator
      ctx.fillStyle = '#fff'
      const dirX = proj.x + Math.cos(player.rotation) * carSize * 0.6
      const dirY = proj.y + Math.sin(player.rotation) * carSize * 0.6
      ctx.beginPath()
      ctx.arc(dirX, dirY, carSize * 0.2, 0, 2 * Math.PI)
      ctx.fill()
      
      // Player name
      ctx.fillStyle = '#fff'
      ctx.font = `${Math.max(10, proj.scale * 0.25)}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText(player.name, proj.x, proj.y - carSize - 5)
      
      // Lap indicator
      if (player.lap > 0) {
        ctx.fillStyle = '#00ff00'
        ctx.font = `${Math.max(8, proj.scale * 0.2)}px Arial`
        ctx.fillText(`L${player.lap}`, proj.x + carSize, proj.y - carSize)
      }
    })
  }
  
  // Camera info overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.fillRect(10, 10, 200, 60)
  ctx.fillStyle = '#fff'
  ctx.font = '12px Arial'
  ctx.textAlign = 'left'
  ctx.fillText(`Camera Height: ${myPlayer.cameraHeight.toFixed(1)}`, 15, 25)
  ctx.fillText(`Camera Angle: ${(myPlayer.cameraAngle * 180 / Math.PI).toFixed(0)}°`, 15, 40)
  ctx.fillText(`Use JKLI for camera control`, 15, 55)
  
  requestAnimationFrame(renderGame)
}

// Export functions for HTML onclick
window.joinGame = joinGame
window.resetGame = resetGame