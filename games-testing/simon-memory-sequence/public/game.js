// Game state
let socket
let playerId = null
let playerName = null
let gameState = null

// UI elements
const joinOverlay = document.getElementById('joinOverlay')
const playerNameInput = document.getElementById('playerNameInput')
const gameStatusEl = document.getElementById('gameStatus')
const roundInfoEl = document.getElementById('roundInfo')
const playerCountEl = document.getElementById('playerCount')
const playersAreaEl = document.getElementById('playersArea')
const sequenceInfoEl = document.getElementById('sequenceInfo')
const actionLogEl = document.getElementById('actionLog')
const readyBtn = document.getElementById('readyBtn')
const leaderboardEl = document.getElementById('leaderboard')

// Simon buttons
const simonButtons = {
    red: document.querySelector('.simon-button.red'),
    blue: document.querySelector('.simon-button.blue'),
    green: document.querySelector('.simon-button.green'),
    yellow: document.querySelector('.simon-button.yellow')
}

// Initialize the game
function init() {
    console.log('Initializing Simon Memory Sequence game...')
    
    try {
        socket = io()
        console.log('Socket.io connection initiated')
        
        setupSocketEvents()
        setupInputHandling()
        
        console.log('Simon Memory Sequence game initialized successfully')
    } catch (error) {
        console.error('Failed to initialize Simon Memory Sequence game:', error)
    }
}

function setupSocketEvents() {
    socket.on('connect', () => {
        console.log('Connected to server')
    })
    
    socket.on('playerAssigned', (data) => {
        console.log('Player assigned:', data)
        playerId = data.playerId
        gameState = data.gameState
        joinOverlay.style.display = 'none'
        updateDisplay()
    })
    
    socket.on('gameState', (newGameState) => {
        console.log('Game state updated:', newGameState)
        gameState = newGameState
        updateDisplay()
    })
    
    socket.on('highlightColor', (data) => {
        console.log('Highlight color:', data)
        highlightColor(data.color, data.isActive)
    })
    
    socket.on('playerLeft', (data) => {
        console.log('Player left:', data)
    })
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server')
    })
    
    socket.on('error', (error) => {
        console.error('Socket error:', error)
    })
}

function setupInputHandling() {
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinGame()
        }
    })
}

function highlightColor(color, isActive) {
    const button = simonButtons[color]
    if (button) {
        if (isActive) {
            button.classList.add('active')
            // Play sound effect (if you want to add audio)
        } else {
            button.classList.remove('active')
        }
    }
}

function joinGame() {
    let name = playerNameInput.value.trim()
    
    if (!name) {
        const randomNames = ['MemoryMaster', 'PatternPro', 'SequenceKing', 'ColorCoder', 'SimonSage', 'RecallRuler']
        name = randomNames[Math.floor(Math.random() * randomNames.length)]
    }
    
    console.log('Attempting to join game as:', name)
    playerName = name
    
    socket.emit('joinGame', {
        name: playerName,
        roomId: 'simon-memory-sequence'
    })
}

function markReady() {
    console.log('Marking player as ready')
    socket.emit('customEvent', 'ready', {})
}

function pressColor(color) {
    if (!gameState) return
    
    // Only allow input during inputting phase and if it's player's turn
    if (gameState.gamePhase !== 'inputting') return
    
    const myPlayer = gameState.players.find(p => p.name === playerName)
    if (!myPlayer || !myPlayer.isCurrentPlayer || myPlayer.isEliminated) return
    
    console.log('Color pressed:', color)
    
    // Visual feedback
    highlightColor(color, true)
    setTimeout(() => highlightColor(color, false), 150)
    
    // Send to server
    socket.emit('customEvent', 'colorPressed', { color })
}

function updateDisplay() {
    if (!gameState) return
    
    // Update status
    let statusText = ''
    switch (gameState.gamePhase) {
        case 'waiting':
            statusText = `Waiting for players... (${gameState.players.length}/4)`
            break
        case 'ready':
            statusText = 'Ready to start! Click Ready when you\'re prepared.'
            break
        case 'showing':
            statusText = 'Watch the sequence carefully!'
            break
        case 'inputting':
            const myPlayer = gameState.players.find(p => p.name === playerName)
            if (myPlayer && myPlayer.isEliminated) {
                statusText = 'You\'re eliminated! Watch the others play.'
            } else if (gameState.currentPlayerName === playerName) {
                statusText = 'Your turn! Repeat the sequence!'
            } else {
                statusText = `${gameState.currentPlayerName}'s turn`
            }
            break
        case 'finished':
            statusText = `Game finished! Winner: ${gameState.winner || 'No one'}`
            break
    }
    gameStatusEl.textContent = statusText
    
    // Update round info
    if (gameState.round > 0) {
        roundInfoEl.textContent = `Round ${gameState.round}`
    }
    
    // Update player count
    playerCountEl.textContent = `${gameState.players.length} players`
    
    // Update sequence info
    if (gameState.gamePhase === 'showing') {
        sequenceInfoEl.innerHTML = '<span class="showing-indicator">Watch!</span>'
    } else if (gameState.gamePhase === 'inputting') {
        sequenceInfoEl.textContent = `Step ${gameState.currentStep + 1}/${gameState.sequenceLength}`
    } else {
        sequenceInfoEl.textContent = 'Ready'
    }
    
    // Update players display
    playersAreaEl.innerHTML = ''
    gameState.players.forEach(player => {
        const playerDiv = document.createElement('div')
        playerDiv.className = 'player'
        
        if (player.isCurrentPlayer && gameState.gamePhase === 'inputting') {
            playerDiv.className += ' current'
        }
        if (player.isEliminated) {
            playerDiv.className += ' eliminated'
        }
        
        playerDiv.innerHTML = `
            <h4>${player.name}</h4>
            <p>Score: ${player.score}</p>
            ${player.ready ? '<p style="color: #4CAF50;">✓ Ready</p>' : ''}
            ${player.isEliminated ? '<p style="color: #ff4444;">Eliminated</p>' : ''}
        `
        playersAreaEl.appendChild(playerDiv)
    })
    
    // Update button states
    const buttonsDisabled = gameState.gamePhase !== 'inputting' || 
                           gameState.isShowingSequence ||
                           !(gameState.players.find(p => p.name === playerName)?.isCurrentPlayer)
    
    Object.values(simonButtons).forEach(button => {
        if (buttonsDisabled) {
            button.classList.add('disabled')
        } else {
            button.classList.remove('disabled')
        }
    })
    
    // Update ready button
    readyBtn.style.display = (gameState.gamePhase === 'ready') ? 'inline-block' : 'none'
    const myPlayer = gameState.players.find(p => p.name === playerName)
    if (myPlayer) {
        readyBtn.disabled = myPlayer.ready
    }
    
    // Update action log
    if (gameState.lastAction) {
        actionLogEl.textContent = gameState.lastAction
    }
    
    // Update leaderboard
    if (gameState.gamePhase === 'finished') {
        leaderboardEl.style.display = 'block'
        
        // Sort players by score
        const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score)
        
        leaderboardEl.innerHTML = `
            <h3>Final Scores</h3>
            ${sortedPlayers.map((player, index) => `
                <div style="display: flex; justify-content: space-between; padding: 5px 0; ${index === 0 ? 'color: #ffd700; font-weight: bold;' : ''}">
                    <span>#${index + 1} ${player.name}</span>
                    <span>${player.score} points</span>
                </div>
            `).join('')}
        `
    } else {
        leaderboardEl.style.display = 'none'
    }
}

// Start the game when page loads
document.addEventListener('DOMContentLoaded', init)

// Export functions to window for HTML onclick events
window.joinGame = joinGame
window.markReady = markReady
window.pressColor = pressColor