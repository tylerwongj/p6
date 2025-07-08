class AntColonyClient {
    constructor() {
        this.socket = io()
        this.playerId = null
        this.playerName = null
        this.gameState = null
        this.canvas = null
        this.ctx = null
        
        this.setupCanvas()
        this.setupSocketEvents()
        this.setupControls()
        this.startRender()
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('gameCanvas')
        this.ctx = this.canvas.getContext('2d')
        
        // Set canvas size
        this.resizeCanvas()
        window.addEventListener('resize', () => this.resizeCanvas())
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement
        this.canvas.width = container.clientWidth - 4 // Account for border
        this.canvas.height = container.clientHeight - 4
    }
    
    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to Ant Colony server')
            // Auto-join when connected
            let playerName
            if (typeof TylerArcadePlayer !== 'undefined' && TylerArcadePlayer.autoJoinGame) {
                playerName = TylerArcadePlayer.autoJoinGame(this.socket, 'ant-colony')
            } else {
                playerName = this.generateRandomName()
                this.socket.emit('joinGame', { name: playerName, roomId: 'ant-colony' })
            }
            this.playerName = playerName
        })
        
        this.socket.on('playerAssigned', (data) => {
            if (data && data.playerData) {
                this.playerId = data.playerData.playerId
                this.playerName = data.playerData.playerName
                console.log('Assigned as:', this.playerName)
                
                // Hide click hint after joining
                document.getElementById('clickHint').style.display = 'none'
            }
        })
        
        this.socket.on('gameState', (state) => {
            this.gameState = state
            this.updateUI()
        })
        
        this.socket.on('gameStarted', (data) => {
            this.showMessage('🐜 Colony expansion begins! Click to send ant trails! 🐜', 3000)
            // Hide start button
            const startButton = document.getElementById('startButtonContainer')
            if (startButton) startButton.style.display = 'none'
        })
        
        this.socket.on('gameWinner', (data) => {
            this.showWinner(data.winner, data.message)
        })
        
        this.socket.on('gameReset', (data) => {
            this.hideWinner()
            this.showMessage(data.message, 2000)
        })
        
        this.socket.on('joinFailed', (data) => {
            alert(`Failed to join: ${data.reason}`)
        })
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server')
        })
    }
    
    setupControls() {
        // Canvas click handler for spawning ant trails
        this.canvas.addEventListener('click', (e) => {
            if (!this.gameState || !this.gameState.gameStarted) return
            
            const rect = this.canvas.getBoundingClientRect()
            const x = (e.clientX - rect.left) * (this.gameState.gameWidth / this.canvas.width)
            const y = (e.clientY - rect.top) * (this.gameState.gameHeight / this.canvas.height)
            
            // Send ant trail spawn command
            this.socket.emit('customEvent', 'spawnAntTrail', { x, y })
            
            // Visual feedback
            this.createClickEffect(e.clientX - rect.left, e.clientY - rect.top)
        })
        
        // Right click for commanding existing ants
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault()
            if (!this.gameState || !this.gameState.gameStarted) return
            
            const rect = this.canvas.getBoundingClientRect()
            const x = (e.clientX - rect.left) * (this.gameState.gameWidth / this.canvas.width)
            const y = (e.clientY - rect.top) * (this.gameState.gameHeight / this.canvas.height)
            
            // Command existing ants to move to location
            this.socket.emit('customEvent', 'commandAnts', { x, y })
            
            // Visual feedback with different color
            this.createClickEffect(e.clientX - rect.left, e.clientY - rect.top, '#FFD700')
        })
    }
    
    createClickEffect(x, y, color = '#8BC34A') {
        // Create ripple effect at click location
        const ripple = document.createElement('div')
        ripple.style.position = 'absolute'
        ripple.style.left = x + 'px'
        ripple.style.top = y + 'px'
        ripple.style.width = '20px'
        ripple.style.height = '20px'
        ripple.style.background = color
        ripple.style.borderRadius = '50%'
        ripple.style.transform = 'translate(-50%, -50%)'
        ripple.style.animation = 'ripple 0.6s ease-out forwards'
        ripple.style.pointerEvents = 'none'
        ripple.style.zIndex = '100'
        
        this.canvas.parentElement.appendChild(ripple)
        
        setTimeout(() => {
            if (ripple.parentElement) {
                ripple.parentElement.removeChild(ripple)
            }
        }, 600)
        
        // Add ripple animation if not exists
        if (!document.querySelector('style[data-ripple]')) {
            const style = document.createElement('style')
            style.setAttribute('data-ripple', 'true')
            style.textContent = `
                @keyframes ripple {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
                    100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
                }
            `
            document.head.appendChild(style)
        }
    }
    
    generateRandomName() {
        const adjectives = ['Queen', 'Worker', 'Scout', 'Soldier', 'Mighty', 'Swift', 'Clever', 'Brave', 'Busy', 'Strong']
        const nouns = ['Colony', 'Ant', 'Leader', 'Explorer', 'Builder', 'Hunter', 'Warrior', 'Gatherer', 'Forager', 'Defender']
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
        const noun = nouns[Math.floor(Math.random() * nouns.length)]
        return adj + noun + Math.floor(Math.random() * 100)
    }
    
    updateUI() {
        if (!this.gameState) return
        
        // Update game status
        const statusEl = document.getElementById('gameStatus')
        const playerCountEl = document.getElementById('playerCount')
        
        // ✅ SAFE - Check Array before length access
        const playerCount = (this.gameState.players && Array.isArray(this.gameState.players)) 
            ? this.gameState.players.length : 0
        playerCountEl.textContent = `${playerCount}/4 Players`
        
        if (this.gameState.gameStarted) {
            statusEl.textContent = '🐜 Colony Expansion Active! 🐜'
            // Hide start button when game is active
            const startButton = document.getElementById('startButtonContainer')
            if (startButton) startButton.style.display = 'none'
        } else {
            statusEl.textContent = 'Waiting for Colony Leaders...'
            // Show start button when waiting
            const startButton = document.getElementById('startButtonContainer')
            if (startButton && playerCount >= 1) startButton.style.display = 'block'
        }
        
        // Update player scores
        this.updatePlayerScores()
        
        // Update my stats
        this.updateMyStats()
        
        // Update game stats
        this.updateGameStats()
    }
    
    updatePlayerScores() {
        const scoresContainer = document.getElementById('playerScores')
        if (!scoresContainer || !this.gameState) return
        
        scoresContainer.innerHTML = ''
        
        // ✅ SAFE - Check Array before forEach
        if (this.gameState.players && Array.isArray(this.gameState.players)) {
            // Sort players by score
            const sortedPlayers = [...this.gameState.players].sort((a, b) => b.score - a.score)
            
            sortedPlayers.forEach((player, index) => {
                const scoreDiv = document.createElement('div')
                scoreDiv.className = 'player-score'
                if (player.playerId === this.playerId) {
                    scoreDiv.className += ' my-score'
                }
                
                const rank = index + 1
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`
                
                scoreDiv.innerHTML = `
                    <span>${medal} ${player.name}</span>
                    <span>${player.score} pts</span>
                `
                
                scoresContainer.appendChild(scoreDiv)
            })
        }
    }
    
    updateMyStats() {
        if (!this.gameState || !this.gameState.players) return
        
        // ✅ SAFE - Check Array before find
        const myPlayer = (this.gameState.players && Array.isArray(this.gameState.players))
            ? this.gameState.players.find(p => p.playerId === this.playerId)
            : null
            
        if (myPlayer) {
            document.getElementById('myScore').textContent = myPlayer.score || 0
            document.getElementById('myAnts').textContent = myPlayer.antCount || 0
            document.getElementById('myFood').textContent = myPlayer.foodCollected || 0
            
            // Find my colony
            const myColony = this.gameState.colonies ? 
                this.gameState.colonies.find(c => c.playerId === this.playerId) : null
            document.getElementById('myStored').textContent = myColony ? myColony.foodStored : 0
        }
    }
    
    updateGameStats() {
        if (!this.gameState) return
        
        document.getElementById('totalAnts').textContent = this.gameState.ants ? this.gameState.ants.length : 0
        document.getElementById('totalFood').textContent = this.gameState.food ? this.gameState.food.length : 0
        document.getElementById('totalTrails').textContent = this.gameState.trails ? this.gameState.trails.length : 0
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
        
        // Clear canvas with forest background
        this.ctx.fillStyle = '#2c3e1e'
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        
        if (!this.gameState) {
            this.drawWaitingScreen()
            return
        }
        
        // Scale coordinates to fit canvas
        const scaleX = this.canvas.width / this.gameState.gameWidth
        const scaleY = this.canvas.height / this.gameState.gameHeight
        
        this.ctx.save()
        this.ctx.scale(scaleX, scaleY)
        
        // Draw game elements
        this.drawTrails()
        this.drawFood()
        this.drawColonies()
        this.drawAnts()
        
        this.ctx.restore()
    }
    
    drawWaitingScreen() {
        this.ctx.fillStyle = '#8BC34A'
        this.ctx.font = '32px Courier New'
        this.ctx.textAlign = 'center'
        this.ctx.fillText('🐜 Ant Colony Strategy 🐜', this.canvas.width / 2, this.canvas.height / 2 - 40)
        
        this.ctx.font = '18px Courier New'
        this.ctx.fillStyle = '#E8F5E8'
        this.ctx.fillText('Waiting for colony leaders to join...', this.canvas.width / 2, this.canvas.height / 2)
        this.ctx.fillText('Click the screen to send ant trails!', this.canvas.width / 2, this.canvas.height / 2 + 30)
    }
    
    drawTrails() {
        if (!this.gameState.trails) return
        
        this.gameState.trails.forEach(trail => {
            this.ctx.fillStyle = `${trail.color}${Math.floor(trail.strength * 255).toString(16).padStart(2, '0')}`
            this.ctx.beginPath()
            this.ctx.arc(trail.x, trail.y, 2 * trail.strength, 0, 2 * Math.PI)
            this.ctx.fill()
        })
    }
    
    drawFood() {
        if (!this.gameState.food) return
        
        this.gameState.food.forEach(food => {
            // Food glow effect
            this.ctx.shadowBlur = 10
            this.ctx.shadowColor = food.type === 'large' ? '#FFD700' : '#8BC34A'
            
            this.ctx.fillStyle = food.type === 'large' ? '#FFD700' : '#8BC34A'
            this.ctx.beginPath()
            this.ctx.arc(food.x, food.y, food.radius, 0, 2 * Math.PI)
            this.ctx.fill()
            
            // Reset shadow
            this.ctx.shadowBlur = 0
            
            // Food amount indicator
            if (food.amount > 15) {
                this.ctx.fillStyle = '#FFF'
                this.ctx.font = '12px Courier New'
                this.ctx.textAlign = 'center'
                this.ctx.fillText(food.amount.toString(), food.x, food.y - food.radius - 5)
            }
        })
    }
    
    drawColonies() {
        if (!this.gameState.colonies) return
        
        this.gameState.colonies.forEach(colony => {
            // Colony base
            this.ctx.fillStyle = colony.color
            this.ctx.beginPath()
            this.ctx.arc(colony.x, colony.y, colony.radius, 0, 2 * Math.PI)
            this.ctx.fill()
            
            // Colony border
            this.ctx.strokeStyle = '#000'
            this.ctx.lineWidth = 3
            this.ctx.stroke()
            
            // Food storage indicator
            if (colony.foodStored > 0) {
                this.ctx.fillStyle = '#8BC34A'
                this.ctx.font = '14px Courier New'
                this.ctx.textAlign = 'center'
                this.ctx.fillText(colony.foodStored.toString(), colony.x, colony.y - colony.radius - 10)
            }
            
            // Colony activity rings
            const time = Date.now() / 1000
            for (let i = 0; i < 3; i++) {
                const radius = colony.radius + 10 + i * 8 + Math.sin(time + i) * 3
                this.ctx.strokeStyle = `${colony.color}${Math.floor((0.3 - i * 0.1) * 255).toString(16).padStart(2, '0')}`
                this.ctx.lineWidth = 2
                this.ctx.beginPath()
                this.ctx.arc(colony.x, colony.y, radius, 0, 2 * Math.PI)
                this.ctx.stroke()
            }
        })
    }
    
    drawAnts() {
        if (!this.gameState.ants) return
        
        this.gameState.ants.forEach(ant => {
            // Ant body
            this.ctx.fillStyle = ant.color
            this.ctx.beginPath()
            this.ctx.arc(ant.x, ant.y, 3, 0, 2 * Math.PI)
            this.ctx.fill()
            
            // Ant border
            this.ctx.strokeStyle = '#000'
            this.ctx.lineWidth = 1
            this.ctx.stroke()
            
            // Carrying food indicator
            if (ant.carryingFood) {
                this.ctx.fillStyle = '#FFD700'
                this.ctx.beginPath()
                this.ctx.arc(ant.x, ant.y - 6, 2, 0, 2 * Math.PI)
                this.ctx.fill()
            }
            
            // Movement direction indicator
            if (ant.state === 'moving') {
                const dx = ant.targetX - ant.x
                const dy = ant.targetY - ant.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                
                if (distance > 5) {
                    const dirX = (dx / distance) * 8
                    const dirY = (dy / distance) * 8
                    
                    this.ctx.strokeStyle = ant.color
                    this.ctx.lineWidth = 1
                    this.ctx.beginPath()
                    this.ctx.moveTo(ant.x, ant.y)
                    this.ctx.lineTo(ant.x + dirX, ant.y + dirY)
                    this.ctx.stroke()
                }
            }
        })
    }
    
    showMessage(message, duration = 3000) {
        const overlay = document.getElementById('messageOverlay')
        overlay.textContent = message
        overlay.style.display = 'block'
        
        setTimeout(() => {
            overlay.style.display = 'none'
        }, duration)
    }
    
    showWinner(winner, message) {
        const overlay = document.getElementById('winnerOverlay')
        const title = document.getElementById('winnerTitle')
        const messageEl = document.getElementById('winnerMessage')
        
        title.textContent = `🏆 ${winner} Wins! 🏆`
        messageEl.textContent = message
        overlay.style.display = 'flex'
    }
    
    hideWinner() {
        document.getElementById('winnerOverlay').style.display = 'none'
    }
    
    startGame() {
        this.socket.emit('customEvent', 'startGame', {})
    }
}

// Make functions global for HTML onclick handlers
window.startGame = () => game.startGame()

// Initialize game
const game = new AntColonyClient()