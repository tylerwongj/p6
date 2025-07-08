import { io } from '/node_modules/socket.io-client/dist/socket.io.esm.min.js'

class AsteroidMiningClient {
  constructor() {
    this.socket = io()
    this.playerId = null
    this.playerName = null
    this.gameState = null
    this.keys = {}
    
    this.canvas = document.getElementById('gameCanvas')
    this.ctx = this.canvas.getContext('2d')
    
    this.setupCanvas()
    this.setupSocketEvents()
    this.setupInputHandlers()
    this.createStars()
    this.startRender()
  }
  
  setupCanvas() {
    this.canvas.width = window.innerWidth * 0.7 // Leave space for side panel
    this.canvas.height = window.innerHeight
    
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth * 0.7
      this.canvas.height = window.innerHeight
    })
  }
  
  setupSocketEvents() {
    this.socket.on('connect', () => {
      console.log('Connected to Asteroid Mining server')
      // Auto-join when connected
      let playerName;
      if (typeof TylerArcadePlayer !== 'undefined' && TylerArcadePlayer.autoJoinGame) {
        playerName = TylerArcadePlayer.autoJoinGame(this.socket, 'asteroid-mining');
      } else {
        playerName = this.generateRandomName();
        this.socket.emit('joinGame', { 
          name: playerName, 
          roomId: 'asteroid-mining' 
        });
      }
      this.playerName = playerName;
    })
    
    this.socket.on('playerAssigned', (data) => {
      if (data && data.playerData) {
        this.playerId = data.playerData.playerId
        this.playerName = data.playerData.playerName
        console.log('Assigned as:', this.playerName)
      }
    })
    
    this.socket.on('gameState', (state) => {
      this.gameState = state
      this.updateUI()
    })
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server')
    })
  }
  
  setupInputHandlers() {
    // Keyboard input
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true
      this.sendInput()
    })
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false
      this.sendInput()
    })
    
    // Prevent default behavior for game keys
    document.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft'].includes(e.code)) {
        e.preventDefault()
      }
    })
  }
  
  sendInput() {
    if (!this.gameState || this.gameState.gamePhase !== 'playing') return
    
    const input = {
      thrust: this.keys['KeyW'] || this.keys['ArrowUp'],
      left: this.keys['KeyA'] || this.keys['ArrowLeft'],
      right: this.keys['KeyD'] || this.keys['ArrowRight'],
      boost: this.keys['ShiftLeft']
    }
    
    this.socket.emit('playerInput', input)
  }
  
  generateRandomName() {
    const adjectives = ['Cosmic', 'Stellar', 'Galactic', 'Plasma', 'Nova', 'Quantum', 'Astro', 'Space', 'Solar', 'Nebula']
    const nouns = ['Miner', 'Explorer', 'Pilot', 'Captain', 'Harvester', 'Prospector', 'Navigator', 'Commander', 'Operator', 'Engineer']
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    return adj + noun + Math.floor(Math.random() * 100)
  }
  
  updateUI() {
    if (!this.gameState) return
    
    const myPlayer = this.gameState.players ? this.gameState.players.find(p => p.id === this.playerId) : null
    
    if (myPlayer) {
      // Update player stats
      document.getElementById('playerScore').textContent = myPlayer.score || 0
      document.getElementById('playerCredits').textContent = myPlayer.credits || 0
      
      // Update ship status
      const ship = myPlayer.ship
      if (ship) {
        const healthPercent = (ship.health / ship.maxHealth) * 100
        const energyPercent = (ship.energy / ship.maxEnergy) * 100
        const shieldPercent = (ship.shield / ship.maxShield) * 100
        
        document.getElementById('healthText').textContent = `${Math.floor(ship.health)}/${ship.maxHealth}`
        document.getElementById('energyText').textContent = `${Math.floor(ship.energy)}/${ship.maxEnergy}`
        document.getElementById('shieldText').textContent = `${Math.floor(ship.shield)}/${ship.maxShield}`
        
        document.getElementById('healthFill').style.width = healthPercent + '%'
        document.getElementById('energyFill').style.width = energyPercent + '%'
        document.getElementById('shieldFill').style.width = shieldPercent + '%'
      }
      
      // Update inventory
      const inventory = myPlayer.inventory
      if (inventory) {
        document.getElementById('ironCount').textContent = inventory.iron || 0
        document.getElementById('goldCount').textContent = inventory.gold || 0
        document.getElementById('rareCount').textContent = inventory.rare || 0
      }
      
      // Update equipment levels
      const equipment = myPlayer.equipment
      if (equipment) {
        document.getElementById('drillLevel').textContent = equipment.drillPower?.toFixed(1) || '1.0'
        document.getElementById('cargoLevel').textContent = equipment.cargoCapacity || 100
        document.getElementById('engineLevel').textContent = equipment.enginePower?.toFixed(1) || '1.0'
        document.getElementById('shieldLevel').textContent = equipment.shieldGenerator?.toFixed(1) || '1.0'
      }
    }
    
    // Update timer
    if (this.gameState.timeRemaining !== undefined) {
      const minutes = Math.floor(this.gameState.timeRemaining / 60)
      const seconds = Math.floor(this.gameState.timeRemaining % 60)
      document.getElementById('timerDisplay').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
    
    // Update leaderboard
    this.updateLeaderboard()
  }
  
  updateLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList')
    if (!leaderboardList || !this.gameState || !this.gameState.players) return
    
    leaderboardList.innerHTML = ''
    
    // Sort players by score
    const sortedPlayers = [...this.gameState.players].sort((a, b) => (b.score || 0) - (a.score || 0))
    
    sortedPlayers.forEach((player, index) => {
      const playerEntry = document.createElement('div')
      playerEntry.className = 'player-entry'
      
      if (player.id === this.playerId) {
        playerEntry.classList.add('current-player')
      }
      
      const rank = index + 1
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`
      
      playerEntry.innerHTML = `
        <span>${medal} ${player.name}</span>
        <span>${player.score || 0} pts</span>
      `
      
      leaderboardList.appendChild(playerEntry)
    })
  }
  
  createStars() {
    const starsContainer = document.getElementById('stars')
    const numStars = 100
    
    for (let i = 0; i < numStars; i++) {
      const star = document.createElement('div')
      star.className = 'star'
      star.style.left = Math.random() * 100 + '%'
      star.style.top = Math.random() * 100 + '%'
      star.style.width = (Math.random() * 2 + 1) + 'px'
      star.style.height = star.style.width
      star.style.animationDelay = Math.random() * 2 + 's'
      starsContainer.appendChild(star)
    }
  }
  
  startRender() {
    const render = () => {
      this.draw()
      requestAnimationFrame(render)
    }
    render()
  }
  
  draw() {
    if (!this.ctx) return
    
    // Clear canvas
    this.ctx.fillStyle = '#0c0c0c'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    
    if (!this.gameState) {
      this.drawWaitingScreen()
      return
    }
    
    // Draw game elements
    this.drawAsteroids()
    this.drawCollectibles()
    this.drawShips()
    this.drawEffects()
  }
  
  drawWaitingScreen() {
    this.ctx.fillStyle = '#3498db'
    this.ctx.font = '32px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('🚀 Asteroid Mining Operation 🚀', this.canvas.width / 2, this.canvas.height / 2 - 40)
    
    this.ctx.font = '18px Arial'
    this.ctx.fillStyle = '#ffffff'
    this.ctx.fillText('Waiting for miners to join...', this.canvas.width / 2, this.canvas.height / 2 + 20)
    this.ctx.fillText('Press "Start Mining Operation" when ready!', this.canvas.width / 2, this.canvas.height / 2 + 50)
  }
  
  drawAsteroids() {
    if (!this.gameState.asteroids) return
    
    this.gameState.asteroids.forEach(asteroid => {
      this.ctx.save()
      this.ctx.translate(asteroid.x, asteroid.y)
      this.ctx.rotate(asteroid.rotation)
      
      // Asteroid color based on type
      const colors = {
        iron: '#8e8e8e',
        gold: '#ffd700',
        rare: '#9b59b6'
      }
      
      this.ctx.fillStyle = colors[asteroid.type] || '#8e8e8e'
      this.ctx.strokeStyle = '#555'
      this.ctx.lineWidth = 2
      
      // Draw irregular asteroid shape
      this.ctx.beginPath()
      const sides = 8
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2
        const radius = asteroid.radius * (0.8 + Math.random() * 0.4)
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        
        if (i === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }
      this.ctx.closePath()
      this.ctx.fill()
      this.ctx.stroke()
      
      // Health bar
      if (asteroid.health < asteroid.maxHealth) {
        const barWidth = asteroid.radius * 2
        const barHeight = 4
        const healthPercent = asteroid.health / asteroid.maxHealth
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        this.ctx.fillRect(-barWidth/2, -asteroid.radius - 10, barWidth, barHeight)
        
        this.ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c'
        this.ctx.fillRect(-barWidth/2, -asteroid.radius - 10, barWidth * healthPercent, barHeight)
      }
      
      this.ctx.restore()
    })
  }
  
  drawCollectibles() {
    if (!this.gameState.collectibles) return
    
    this.gameState.collectibles.forEach(collectible => {
      this.ctx.save()
      this.ctx.translate(collectible.x, collectible.y)
      
      const colors = {
        iron: '#8e8e8e',
        gold: '#ffd700',
        rare: '#9b59b6'
      }
      
      this.ctx.fillStyle = colors[collectible.type] || '#8e8e8e'
      this.ctx.beginPath()
      this.ctx.arc(0, 0, 5, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Glow effect
      this.ctx.shadowColor = colors[collectible.type]
      this.ctx.shadowBlur = 10
      this.ctx.fill()
      this.ctx.shadowBlur = 0
      
      this.ctx.restore()
    })
  }
  
  drawShips() {
    if (!this.gameState.players) return
    
    this.gameState.players.forEach(player => {
      const ship = player.ship
      if (!ship) return
      
      this.ctx.save()
      this.ctx.translate(ship.x, ship.y)
      this.ctx.rotate(ship.angle)
      
      // Ship body
      this.ctx.fillStyle = player.color || '#3498db'
      this.ctx.strokeStyle = '#ffffff'
      this.ctx.lineWidth = 2
      
      this.ctx.beginPath()
      this.ctx.moveTo(15, 0)
      this.ctx.lineTo(-10, -8)
      this.ctx.lineTo(-5, 0)
      this.ctx.lineTo(-10, 8)
      this.ctx.closePath()
      this.ctx.fill()
      this.ctx.stroke()
      
      // Engine glow when thrusting
      if (this.keys && (this.keys['KeyW'] || this.keys['ArrowUp']) && player.id === this.playerId) {
        this.ctx.fillStyle = '#ff6b35'
        this.ctx.beginPath()
        this.ctx.moveTo(-10, -4)
        this.ctx.lineTo(-18, 0)
        this.ctx.lineTo(-10, 4)
        this.ctx.closePath()
        this.ctx.fill()
      }
      
      // Shield visual
      if (ship.shield > 0) {
        this.ctx.strokeStyle = `rgba(52, 152, 219, ${ship.shield / ship.maxShield * 0.5})`
        this.ctx.lineWidth = 3
        this.ctx.beginPath()
        this.ctx.arc(0, 0, ship.radius + 5, 0, Math.PI * 2)
        this.ctx.stroke()
      }
      
      this.ctx.restore()
      
      // Player name and health bar
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = '12px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(player.name, ship.x, ship.y - 25)
      
      // Health bar
      const barWidth = 30
      const barHeight = 4
      const healthPercent = ship.health / ship.maxHealth
      
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      this.ctx.fillRect(ship.x - barWidth/2, ship.y - 35, barWidth, barHeight)
      
      this.ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c'
      this.ctx.fillRect(ship.x - barWidth/2, ship.y - 35, barWidth * healthPercent, barHeight)
    })
  }
  
  drawEffects() {
    // Draw any particle effects or explosions here
    // This can be expanded for mining effects, explosions, etc.
  }
  
  startGame() {
    this.socket.emit('customEvent', 'startGame', {})
  }
  
  sellResource(resource, amount) {
    this.socket.emit('customEvent', 'playerAction', {
      type: 'sell',
      resource: resource,
      amount: amount
    })
  }
  
  upgradeEquipment(equipment) {
    this.socket.emit('customEvent', 'playerAction', {
      type: 'upgrade',
      equipment: equipment
    })
  }
}

// Make functions global for HTML onclick handlers
window.startGame = () => game.startGame()
window.sellResource = (resource, amount) => game.sellResource(resource, amount)
window.upgradeEquipment = (equipment) => game.upgradeEquipment(equipment)

// Initialize game
const game = new AsteroidMiningClient()