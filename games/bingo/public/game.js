import { InputManager } from '/node_modules/@tyler-arcade/2d-input/src/InputManager.js'

// Game state
let socket
let inputManager
let playerId = null
let playerName = null
let gameState = null
let myCard = null
let myMarkedSpots = new Set()
let allPlayersCards = null

// UI elements
const playersInfoEl = document.getElementById('playersInfo')
const gameStatusEl = document.getElementById('gameStatus')
const cardsContainerEl = document.getElementById('cardsContainer')
const currentCallEl = document.getElementById('currentCall')
const currentNumberEl = document.getElementById('currentNumber')
const numbersGridEl = document.getElementById('numbersGrid')
const winnersListEl = document.getElementById('winnersList')
const winnersContentEl = document.getElementById('winnersContent')
const bingoButton = document.getElementById('bingoButton')

// Initialize the game
function init() {
    console.log('Initializing Bingo game...')
    
    // Initialize input manager
    inputManager = new InputManager()
    
    // Connect to server
    socket = io()
    
    // Set up socket event listeners
    setupSocketEvents()
    
    console.log('Bingo game initialized')
}

function setupSocketEvents() {
    socket.on('connect', () => {
        console.log('Connected to server')
        // Auto-join game using shared player name system
        playerName = TylerArcadePlayer.autoJoinGame(socket, 'bingo')
    })
    
    socket.on('playerAssigned', (data) => {
        console.log('Player assigned:', data)
        if (data && data.playerData) {
            playerId = data.playerData.playerId
            playerName = data.playerData.playerName
        } else if (data && data.playerId) {
            // Fallback for old format
            playerId = data.playerId
            playerName = data.playerName
        }
    })
    
    socket.on('gameState', (state) => {
        console.log('Game state received:', state)
        gameState = state
        myCard = state.myCard
        allPlayersCards = state.allPlayersCards
        if (state.myMarkedSpots) {
            myMarkedSpots = new Set(state.myMarkedSpots)
        }
        updateUI()
    })
    
    socket.on('gameStarted', (data) => {
        console.log('Game started:', data)
        gameStatusEl.textContent = data.message
    })
    
    socket.on('numberCalled', (data) => {
        console.log('Number called:', data)
        displayCurrentCall(data.callText)
        updateCalledNumbers()
        
        // Highlight matching numbers on card
        highlightMatchingNumbers(data.number)
    })
    
    socket.on('bingoWin', (data) => {
        console.log('Bingo win:', data)
        gameStatusEl.textContent = data.message
        updateWinnersList()
    })
    
    socket.on('invalidBingo', (data) => {
        console.log('Invalid bingo:', data)
        alert(data.message)
    })
    
    socket.on('gameEnded', (data) => {
        console.log('Game ended:', data)
        gameStatusEl.textContent = data.message
        bingoButton.disabled = true
    })
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server')
        gameStatusEl.textContent = 'Disconnected from server'
    })
}

function updateUI() {
    if (!gameState) return
    
    // Update players info
    updatePlayersInfo()
    
    // Update bingo card
    updateBingoCard()
    
    // Update called numbers
    updateCalledNumbers()
    
    // Update game status
    updateGameStatus()
    
    // Update winners list
    updateWinnersList()
    
    // Update controls
    updateControls()
}

function updatePlayersInfo() {
    if (!gameState.players) return
    
    playersInfoEl.innerHTML = ''
    
    Object.entries(gameState.players).forEach(([id, player]) => {
        const playerDiv = document.createElement('div')
        playerDiv.className = 'player-info'
        if (player.hasBingo) {
            playerDiv.classList.add('winner')
        }
        
        const markedCount = player.markedCount || 0
        const bingoStatus = player.hasBingo ? ' 🏆 BINGO!' : ''
        
        playerDiv.innerHTML = `
            <div><strong>${player.name}</strong></div>
            <div>${markedCount} marked${bingoStatus}</div>
        `
        
        playersInfoEl.appendChild(playerDiv)
    })
}

function updateBingoCard() {
    if (!allPlayersCards) return
    
    cardsContainerEl.innerHTML = ''
    
    const columns = ['B', 'I', 'N', 'G', 'O']
    
    // Create cards for all players side by side
    Object.entries(allPlayersCards).forEach(([playerId, playerData]) => {
        const cardDiv = document.createElement('div')
        cardDiv.className = 'bingo-card'
        
        // Highlight current player's card
        if (playerId === socket.id) {
            cardDiv.classList.add('my-card')
        }
        
        // Card title
        const cardTitle = document.createElement('div')
        cardTitle.className = 'card-title'
        const isMyCard = playerId === socket.id
        const titlePrefix = isMyCard ? '🎯 YOUR CARDS: ' : ''
        cardTitle.textContent = titlePrefix + playerData.name + (playerData.hasBingo ? ' 🏆' : '')
        cardDiv.appendChild(cardTitle)
        
        // Card header
        const headerDiv = document.createElement('div')
        headerDiv.className = 'card-header'
        columns.forEach(letter => {
            const headerCell = document.createElement('div')
            headerCell.className = 'header-cell'
            headerCell.textContent = letter
            headerDiv.appendChild(headerCell)
        })
        cardDiv.appendChild(headerDiv)
        
        // Card grid
        const gridDiv = document.createElement('div')
        gridDiv.className = 'card-grid'
        
        const card = playerData.card
        const markedSpots = new Set(playerData.markedSpots)
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = document.createElement('div')
                cell.className = 'bingo-cell'
                
                const spotId = `${row}-${col}`
                const columnLetter = columns[col]
                const value = card[columnLetter][row]
                
                if (value === 'FREE') {
                    cell.textContent = 'FREE'
                    cell.classList.add('free')
                } else {
                    cell.textContent = value
                    
                    // Only allow clicking on current player's card
                    if (playerId === socket.id) {
                        cell.onclick = () => markSpot(row, col)
                    }
                    
                    if (markedSpots.has(spotId)) {
                        cell.classList.add('marked')
                    }
                }
                
                gridDiv.appendChild(cell)
            }
        }
        
        cardDiv.appendChild(gridDiv)
        cardsContainerEl.appendChild(cardDiv)
    })
}

function markSpot(row, col) {
    if (!gameState.gameStarted) return
    
    socket.emit('playerInput', {
        action: 'markSpot',
        row: row,
        col: col
    })
}

function callBingo() {
    if (!gameState.gameStarted) return
    
    socket.emit('playerInput', {
        action: 'callBingo'
    })
}

function displayCurrentCall(callText) {
    currentNumberEl.textContent = callText
    currentCallEl.style.display = 'block'
}

function updateCalledNumbers() {
    if (!gameState.calledNumbers) return
    
    numbersGridEl.innerHTML = ''
    
    gameState.calledNumbers.forEach(number => {
        const numberDiv = document.createElement('div')
        numberDiv.className = 'called-number'
        
        const column = getNumberColumn(number)
        numberDiv.textContent = `${column}-${number}`
        
        numbersGridEl.appendChild(numberDiv)
    })
}

function getNumberColumn(number) {
    if (number >= 1 && number <= 15) return 'B'
    if (number >= 16 && number <= 30) return 'I'
    if (number >= 31 && number <= 45) return 'N'
    if (number >= 46 && number <= 60) return 'G'
    if (number >= 61 && number <= 75) return 'O'
    return ''
}

function highlightMatchingNumbers(calledNumber) {
    if (!allPlayersCards) return
    
    const columns = ['B', 'I', 'N', 'G', 'O']
    const cardElements = cardsContainerEl.children
    
    // Check each player's card for matching numbers
    let cardIndex = 0
    Object.entries(allPlayersCards).forEach(([playerId, playerData]) => {
        const cardElement = cardElements[cardIndex]
        if (!cardElement) return
        
        const gridElement = cardElement.querySelector('.card-grid')
        if (!gridElement) return
        
        const cells = gridElement.children
        const card = playerData.card
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cellIndex = row * 5 + col
                const cell = cells[cellIndex]
                const columnLetter = columns[col]
                const value = card[columnLetter][row]
                
                if (value === calledNumber) {
                    cell.style.animation = 'highlight 0.3s ease-in-out'
                    setTimeout(() => {
                        cell.style.animation = ''
                    }, 300)
                }
            }
        }
        
        cardIndex++
    })
}

function updateGameStatus() {
    if (!gameState.gameStarted) {
        const playerCount = Object.keys(gameState.players || {}).length
        gameStatusEl.textContent = `Waiting for players... (${playerCount}/6)`
    } else {
        const calledCount = gameState.calledNumbers?.length || 0
        gameStatusEl.textContent = `Game in progress - ${calledCount} numbers called`
    }
}

function updateWinnersList() {
    if (!gameState.winners || gameState.winners.length === 0) {
        winnersListEl.style.display = 'none'
        return
    }
    
    winnersListEl.style.display = 'block'
    winnersContentEl.innerHTML = ''
    
    gameState.winners.forEach((winner, index) => {
        const winnerDiv = document.createElement('div')
        winnerDiv.textContent = `${index + 1}. ${winner.name}`
        winnersContentEl.appendChild(winnerDiv)
    })
}

function updateControls() {
    bingoButton.disabled = !gameState.gameStarted
}


// Add CSS animation for highlighting
const style = document.createElement('style')
style.textContent = `
    @keyframes highlight {
        0%, 100% { background-color: inherit; }
        50% { background-color: #ffeb3b; color: #000; }
    }
`
document.head.appendChild(style)

// Global functions for HTML onclick handlers
window.callBingo = callBingo

// Start the game when page loads
window.addEventListener('load', init)

// Handle page visibility for reconnection
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && socket && !socket.connected) {
        socket.connect()
    }
})