// Game state
let socket
let playerId = null
let gameState = null
let playerName = null

// Initialize game
function init() {
  console.log('Initializing Tic-Tac-Toe...')
  
  // Connect to server
  socket = io()
  
  // Set up socket events
  setupSocketEvents()
  
  // Set up UI events
  setupEventListeners()
}

function setupSocketEvents() {
  socket.on('connect', () => {
    console.log('✅ Connected to server!')
    // Auto-join game using shared player name system
    playerName = TylerArcadePlayer.autoJoinGame(socket, 'tic-tac-toe')
  })
  
  socket.on('playerAssigned', (data) => {
    console.log('✅ Player assigned:', data)
    playerId = data.playerId
    playerName = data.playerName || playerName
  })
  
  socket.on('joinFailed', (data) => {
    console.log('❌ Join failed:', data)
    alert(`Failed to join: ${data.reason}`)
  })
  
  socket.on('gameState', (state) => {
    console.log('📊 Game state received:', state)
    gameState = state
    updateUI()
  })
  
  socket.on('disconnect', () => {
    console.log('❌ Disconnected')
    gameState = null
  })
}

function setupEventListeners() {
  // Board clicks
  document.getElementById('gameBoard').addEventListener('click', (e) => {
    if (e.target.classList.contains('cell')) {
      const position = parseInt(e.target.dataset.position)
      console.log('Cell clicked:', e.target, 'position:', position, 'dataset:', e.target.dataset)
      
      // Validate position
      if (!isNaN(position) && position >= 0 && position <= 8) {
        makeMove(position)
      } else {
        console.warn('Invalid position clicked:', position)
      }
    }
  })

}


function makeMove(position) {
  if (!gameState || !socket || !playerId) {
    console.warn('Cannot make move - missing:', { gameState: !!gameState, socket: !!socket, playerId })
    return
  }
  
  // Additional validation
  if (typeof position !== 'number' || position < 0 || position > 8) {
    console.warn('Invalid position for move:', position)
    return
  }
  
  console.log('Making move at position:', position)
  socket.emit('playerMove', { position })
}

function resetGame() {
  if (!socket) return
  
  console.log('Requesting game reset')
  socket.emit('resetGame')
}

function updateUI() {
  if (!gameState) return

  // Update board
  const cells = document.querySelectorAll('.cell')
  cells.forEach((cell, index) => {
    const symbol = gameState.board ? gameState.board[index] : null
    cell.textContent = symbol || ''
    cell.className = `cell ${symbol ? 'filled' : ''} ${symbol ? symbol.toLowerCase() : ''}`
  })

  // Update game status
  const gameStatus = document.getElementById('gameStatus')
  const currentTurn = document.getElementById('currentTurn')
  const currentPlayer = document.getElementById('currentPlayer')
  const winnerAnnouncement = document.getElementById('winnerAnnouncement')
  const resetButton = document.getElementById('resetButton')

  // Update players list
  const playersList = document.getElementById('playersList')
  if (gameState.players) {
    let playersHTML = ''
    gameState.players.forEach(player => {
      const isMe = player.id === socket.id
      const name = isMe ? `${player.name} (You)` : player.name
      playersHTML += `<div class="player">${name} - ${player.symbol || 'Spectator'}</div>`
    })
    playersList.innerHTML = playersHTML
  }
  
  if (gameState.winner) {
    gameStatus.style.display = 'none'
    currentTurn.style.display = 'none'
    winnerAnnouncement.style.display = 'block'
    
    if (gameState.winner === 'tie') {
      winnerAnnouncement.textContent = "It's a tie!"
    } else {
      winnerAnnouncement.textContent = `${gameState.winner} wins!`
    }
    
    resetButton.disabled = false
  } else if (gameState.gameActive) {
    gameStatus.style.display = 'none'
    currentTurn.style.display = 'block'
    winnerAnnouncement.style.display = 'none'
    
    currentPlayer.textContent = gameState.currentPlayer || 'X'
    resetButton.disabled = false
  } else {
    gameStatus.textContent = `Waiting for players... (${gameState.players ? gameState.players.length : 0}/2)`
    currentTurn.style.display = 'none'
    winnerAnnouncement.style.display = 'none'
    resetButton.disabled = true
  }
}

// Make functions globally available
window.resetGame = resetGame

// Initialize when page loads
window.addEventListener('load', init)