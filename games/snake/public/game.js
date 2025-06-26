// Game state
let socket
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
    
    try {
        // Connect to server
        socket = io()
        console.log('Socket.io connection initiated')
        
        // Set up socket event listeners
        setupSocketEvents()
        
        // Set up input handling
        setupInputHandling()
        
        // Show join overlay
        showJoinOverlay()
        
        // Initial render to show something
        renderInitialScreen()
        
        console.log('Snake game initialized successfully')
    } catch (error) {
        console.error('Error initializing Snake game:', error)
        renderErrorScreen()
    }
}

function setupSocketEvents() {
    socket.on('connect', () => {
        console.log('✅ Connected to server successfully!')
        console.log('Socket ID:', socket.id)
    })
    
    socket.on('playerAssigned', (data) => {
        console.log('✅ Player assigned successfully:', data)
        playerId = data.playerId
        playerName = data.playerName || playerName
        hideJoinOverlay()
        console.log('Join overlay hidden, waiting for game state...')
    })
    
    socket.on('joinFailed', (data) => {
        console.log('❌ Join failed:', data)
        alert(`Failed to join: ${data.reason}`)
        showJoinOverlay() // Show overlay again for retry
    })
    
    socket.on('gameState', (state) => {
        console.log('📊 Received game state:', {
            players: state.players.length,
            food: state.food,
            status: state.gameStatus
        })
        gameState = state
        updateUI()
        render()
    })
    
    socket.on('disconnect', () => {
        console.log('❌ Disconnected from server')
        showJoinOverlay()
        gameState = null
        renderInitialScreen()
    })
    
    socket.on('connect_error', (error) => {
        console.log('❌ Connection error:', error)
    })
}

function setupInputHandling() {
    // Track key states
    const keys = {}
    let lastInput = { up: false, down: false, left: false, right: false }
    
    // Key event listeners
    document.addEventListener('keydown', (e) => {
        keys[e.code.toLowerCase()] = true
        
        // Handle reset key
        if (e.code === 'Digit0' && socket && playerId) {
            e.preventDefault()
            console.log('Snake: Sending resetGame event')
            socket.emit('resetGame')
        }
    })
    
    document.addEventListener('keyup', (e) => {
        keys[e.code.toLowerCase()] = false
    })
    
    // Send input to server only when keys change
    setInterval(() => {
        if (socket && playerId) {
            const snakeInput = {
                up: keys['arrowup'] || keys['keyw'],
                down: keys['arrowdown'] || keys['keys'],
                left: keys['arrowleft'] || keys['keya'], 
                right: keys['arrowright'] || keys['keyd']
            }
            
            // Only send if input changed
            if (JSON.stringify(snakeInput) !== JSON.stringify(lastInput)) {
                socket.emit('playerInput', snakeInput)
                lastInput = { ...snakeInput }
            }
        }
    }, 50) // Check input 20 times per second
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
    
    console.log('🎮 Attempting to join game...')
    console.log('Player name:', playerName)
    console.log('Room ID: snake')
    console.log('Socket connected:', socket.connected)
    console.log('Socket ID:', socket.id)
    
    if (!socket.connected) {
        console.log('❌ Socket not connected! Reconnecting...')
        socket.connect()
        return
    }
    
    const joinData = { name: playerName, roomId: 'snake' }
    console.log('📤 Sending joinGame event with data:', joinData)
    socket.emit('joinGame', joinData)
    
    // Set a timeout to detect if join fails
    setTimeout(() => {
        if (!playerId) {
            console.log('⚠️ Join timeout - no response from server after 5 seconds')
            console.log('Current socket state:', {
                connected: socket.connected,
                id: socket.id
            })
        }
    }, 5000)
}

// Make functions globally available
window.joinGame = joinGame

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

function renderInitialScreen() {
    // Clear canvas
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw waiting message
    ctx.fillStyle = '#00ff00'
    ctx.font = '24px Courier New'
    ctx.textAlign = 'center'
    ctx.fillText('🐍 SNAKE', canvas.width / 2, canvas.height / 2 - 20)
    
    ctx.fillStyle = '#ffffff'
    ctx.font = '16px Courier New'
    ctx.fillText('Waiting for connection...', canvas.width / 2, canvas.height / 2 + 20)
}

function renderErrorScreen() {
    // Clear canvas
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw error message
    ctx.fillStyle = '#ff0000'
    ctx.font = '20px Courier New'
    ctx.textAlign = 'center'
    ctx.fillText('Error Loading Game', canvas.width / 2, canvas.height / 2 - 20)
    
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px Courier New'
    ctx.fillText('Check console for details', canvas.width / 2, canvas.height / 2 + 20)
}

function render() {
    if (!gameState) {
        renderInitialScreen()
        return
    }
    
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
window.addEventListener('load', () => {
    console.log('Page loaded, starting initialization...')
    init()
})

// Also try to render initial screen immediately when script loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, rendering initial screen...')
    const canvas = document.getElementById('gameCanvas')
    if (canvas) {
        const tempCtx = canvas.getContext('2d')
        if (tempCtx) {
            // Draw initial screen with local context
            tempCtx.fillStyle = '#000000'
            tempCtx.fillRect(0, 0, canvas.width, canvas.height)
            
            tempCtx.fillStyle = '#00ff00'
            tempCtx.font = '24px Courier New'
            tempCtx.textAlign = 'center'
            tempCtx.fillText('🐍 SNAKE', canvas.width / 2, canvas.height / 2 - 20)
            
            tempCtx.fillStyle = '#ffffff'
            tempCtx.font = '16px Courier New'
            tempCtx.fillText('Loading...', canvas.width / 2, canvas.height / 2 + 20)
        }
    }
})