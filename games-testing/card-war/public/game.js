// Game state
let socket
let playerId = null
let playerName = null
let gameState = null

// UI elements
const joinOverlay = document.getElementById('joinOverlay')
const playerNameInput = document.getElementById('playerNameInput')
const gameStatusEl = document.getElementById('gameStatus')
const playersAreaEl = document.getElementById('playersArea')
const currentRoundEl = document.getElementById('currentRound')
const readyBtn = document.getElementById('readyBtn')
const playCardBtn = document.getElementById('playCardBtn')

// Initialize the game
function init() {
    console.log('Initializing Card War game...')
    
    try {
        socket = io()
        console.log('Socket.io connection initiated')
        
        setupSocketEvents()
        setupInputHandling()
        
        console.log('Card War game initialized successfully')
    } catch (error) {
        console.error('Failed to initialize Card War game:', error)
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

function joinGame() {
    let name = playerNameInput.value.trim()
    
    if (!name) {
        const randomNames = ['RedAce', 'BlueKing', 'GreenQueen', 'BlackJack', 'GoldCard', 'SilverDealer']
        name = randomNames[Math.floor(Math.random() * randomNames.length)]
    }
    
    console.log('Attempting to join game as:', name)
    playerName = name
    
    socket.emit('joinGame', {
        name: playerName,
        roomId: 'card-war'
    })
}

function markReady() {
    console.log('Marking player as ready')
    socket.emit('customEvent', 'ready', {})
}

function playCard() {
    console.log('Playing card')
    socket.emit('customEvent', 'playCard', {})
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
        case 'playing':
            statusText = 'Game in progress - click Play Card to continue!'
            break
        case 'war':
            statusText = 'WAR! Highest card takes all!'
            break
        case 'finished':
            statusText = `Game Over! Winner: ${gameState.winner}`
            break
    }
    gameStatusEl.textContent = statusText
    
    // Update players display
    playersAreaEl.innerHTML = ''
    gameState.players.forEach(player => {
        const playerDiv = document.createElement('div')
        playerDiv.className = 'player-area'
        playerDiv.innerHTML = `
            <h3>${player.name}</h3>
            <p>Score: ${player.score}</p>
            <p>Cards: ${player.cardsLeft}</p>
            ${player.ready ? '<p style="color: #4CAF50;">✓ Ready</p>' : ''}
        `
        playersAreaEl.appendChild(playerDiv)
    })
    
    // Update current round display
    currentRoundEl.innerHTML = ''
    if (gameState.currentRound && gameState.currentRound.length > 0) {
        gameState.currentRound.forEach(play => {
            const cardDiv = document.createElement('div')
            cardDiv.className = `card ${play.card.suit}`
            cardDiv.innerHTML = `
                <div>${play.card.value}</div>
                <div>${getSuitSymbol(play.card.suit)}</div>
                <div style="font-size: 12px;">${play.player}</div>
            `
            currentRoundEl.appendChild(cardDiv)
        })
    }
    
    // Show war indicator
    if (gameState.gamePhase === 'war') {
        if (!document.querySelector('.war-indicator')) {
            const warDiv = document.createElement('div')
            warDiv.className = 'war-indicator'
            warDiv.textContent = 'WAR!'
            currentRoundEl.appendChild(warDiv)
        }
    }
    
    // Update button visibility
    readyBtn.style.display = (gameState.gamePhase === 'ready') ? 'inline-block' : 'none'
    playCardBtn.style.display = (gameState.gamePhase === 'playing' || gameState.gamePhase === 'war') ? 'inline-block' : 'none'
    
    // Disable buttons based on state
    const myPlayer = gameState.players.find(p => p.name === playerName)
    if (myPlayer) {
        readyBtn.disabled = myPlayer.ready
        playCardBtn.disabled = myPlayer.cardsLeft === 0
    }
}

function getSuitSymbol(suit) {
    const symbols = {
        hearts: '♥',
        diamonds: '♦',
        clubs: '♣',
        spades: '♠'
    }
    return symbols[suit] || suit
}

// Start the game when page loads
document.addEventListener('DOMContentLoaded', init)

// Export functions to window for HTML onclick events
window.joinGame = joinGame
window.markReady = markReady
window.playCard = playCard