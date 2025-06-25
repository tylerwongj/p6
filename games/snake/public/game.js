import { InputManager } from '/node_modules/@tyler-arcade/2d-input/src/InputManager.js'

// Game state
let socket
let inputManager
let playerId = null
let playerName = null
let gameState = null

// Canvas and rendering
const canvas = document.getElementById('gameCanvas')
const ctx = canvas.getContext('2d')

// UI elements
const joinOverlay = document.getElementById('joinOverlay')
const playerNameInput = document.getElementById('playerNameInput')
const playersListEl = document.getElementById('playersList')
const gameStatusEl = document.getElementById('gameStatus')

// Initialize the game
function init() {
    console.log('Initializing Snake game...')
    
    // Initialize input manager
    inputManager = new InputManager()
    
    // Connect to server
    socket = io()
    
    // Set up socket event listeners
    setupSocketEvents()
    
    // Set up input handling
    setupInputHandling()
    
    // Show join overlay
    showJoinOverlay()
    
    console.log('Snake game initialized')
}

function setupSocketEvents() {
    socket.on('connect', () => {
        console.log('Connected to server')
    })
    
    socket.on('playerAssigned', (data) => {
        console.log('Player assigned:', data)
        playerId = data.playerId
        hideJoinOverlay()
    })
    
    socket.on('joinFailed', (data) => {
        console.log('Join failed:', data)
        alert(`Failed to join: ${data.reason}`)
    })
    
    socket.on('gameState', (state) => {
        gameState = state
        updateUI()
        render()
    })
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server')
        showJoinOverlay()
    })
}

function setupInputHandling() {
    // Send input to server only when keys change (not continuously)
    let lastInput = { up: false, down: false, left: false, right: false }
    
    // Check for input changes more frequently
    setInterval(() => {
        if (socket && playerId) {
            const input = inputManager.getInputState()
            
            // Add WASD support for Snake
            const snakeInput = {
                up: input.up || inputManager.isKeyPressed('w'),
                down: input.down || inputManager.isKeyPressed('s'),
                left: inputManager.isKeyPressed('a') || inputManager.isKeyPressed('arrowleft'),
                right: inputManager.isKeyPressed('d') || inputManager.isKeyPressed('arrowright')
            }
            
            // Only send if input changed
            if (JSON.stringify(snakeInput) !== JSON.stringify(lastInput)) {
                socket.emit('playerInput', snakeInput)
                lastInput = { ...snakeInput }
            }
        }
    }, 50) // Check input 20 times per second
    
    // Handle reset key
    inputManager.onKeyPress('r', () => {
        if (socket && playerId) {
            socket.emit('resetGame')
        }
    })
}

function showJoinOverlay() {
    joinOverlay.style.display = 'flex'
    playerNameInput.focus()
}

function hideJoinOverlay() {
    joinOverlay.style.display = 'none'
}

function joinGame() {
    let name = playerNameInput.value.trim()
    
    // Auto-generate name if empty
    if (!name) {
        const guestNames = ['SnakeCharmer', 'Viper', 'Cobra', 'Python', 'Serpent', 'Adder', 'Mamba', 'Boa']
        name = guestNames[Math.floor(Math.random() * guestNames.length)] + Math.floor(Math.random() * 100)
    }
    
    playerName = name
    socket.emit('joinGame', { name: playerName, roomId: 'snake' })
}

function updateUI() {
    if (!gameState) return
    
    // Update players list
    let playersHTML = ''
    gameState.players.forEach(player => {
        const isMe = player.playerId === playerId
        const statusClass = player.alive ? 'alive' : 'dead'
        const name = isMe ? `${player.name} (You)` : player.name
        playersHTML += `<div class="player ${statusClass}" style="border-left: 4px solid ${player.color}">
            ${name} - Score: ${player.score}
        </div>`
    })
    playersListEl.innerHTML = playersHTML
    
    // Update game status
    let statusText = ''
    switch (gameState.gameStatus) {
        case 'waiting':
            statusText = `Waiting for players... (${gameState.players.length}/4)`
            break
        case 'playing':
            const alivePlayers = gameState.players.filter(p => p.alive)
            statusText = `Game in progress! Alive: ${alivePlayers.length}`
            break
        case 'ended':
            const winner = gameState.players.filter(p => p.alive)[0]
            statusText = winner ? `Game Over! Winner: ${winner.name}` : 'Game Over!'
            break
    }
    gameStatusEl.textContent = statusText
}

function render() {
    if (!gameState) return
    
    // Clear canvas
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw grid (optional visual aid)
    ctx.strokeStyle = '#111111'
    ctx.lineWidth = 1
    const gridSize = 20
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
    }
    
    // Draw food
    if (gameState.food) {
        ctx.fillStyle = '#ff0000'
        ctx.fillRect(gameState.food.x, gameState.food.y, gridSize, gridSize)
        
        // Add glow effect to food
        ctx.shadowColor = '#ff0000'
        ctx.shadowBlur = 10
        ctx.fillRect(gameState.food.x + 2, gameState.food.y + 2, gridSize - 4, gridSize - 4)
        ctx.shadowBlur = 0
    }
    
    // Draw snakes
    gameState.players.forEach(player => {
        if (!player.snake || !player.alive) return
        
        ctx.fillStyle = player.color
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        
        player.snake.body.forEach((segment, index) => {
            // Make head slightly different
            if (index === 0) {
                ctx.fillStyle = player.color
                ctx.fillRect(segment.x, segment.y, gridSize, gridSize)
                
                // Add eyes to head
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(segment.x + 4, segment.y + 4, 3, 3)
                ctx.fillRect(segment.x + 13, segment.y + 4, 3, 3)
            } else {
                // Body segments with slight transparency
                ctx.fillStyle = player.color + '88'
                ctx.fillRect(segment.x, segment.y, gridSize, gridSize)
            }
            
            // Border around each segment
            ctx.strokeRect(segment.x, segment.y, gridSize, gridSize)
        })
    })
}

// Handle enter key in name input
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinGame()
    }
})

// Initialize when page loads
window.addEventListener('load', init)