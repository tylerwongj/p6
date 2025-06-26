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
  
  // Show join overlay
  showJoinOverlay()
}

function setupSocketEvents() {
  socket.on('connect', () => {
    console.log('✅ Connected to server!')
  })
  
  socket.on('playerAssigned', (data) => {
    console.log('✅ Player assigned:', data)
    playerId = data.playerId
    playerName = data.playerName || playerName
    hideJoinOverlay()
  })
  
  socket.on('joinFailed', (data) => {
    console.log('❌ Join failed:', data)
    alert(`Failed to join: ${data.reason}`)
    showJoinOverlay()
  })
  
  socket.on('gameState', (state) => {
    console.log('📊 Game state received:', state)
    gameState = state
    updateUI()
  })
  
  socket.on('disconnect', () => {
    console.log('❌ Disconnected')
    showJoinOverlay()
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

  // Enter key on name input
  document.getElementById('playerName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      joinGame()
    }
  })
}

function showJoinOverlay() {
  document.getElementById('joinOverlay').style.display = 'flex'
}

function hideJoinOverlay() {
  document.getElementById('joinOverlay').style.display = 'none'
}

function joinGame() {
  let name = document.getElementById('playerName').value.trim()
  
  // Generate random name if empty
  if (!name) {
    const adjectives = ['Swift', 'Clever', 'Mighty', 'Stealthy', 'Wise', 'Bold', 'Quick', 'Sharp']
    const nouns = ['Knight', 'Wizard', 'Hunter', 'Explorer', 'Warrior', 'Scholar', 'Rogue', 'Champion']
    const colors = ['Red', 'Blue', 'Green', 'Gold', 'Silver', 'Purple', 'Orange', 'Cyan']
    
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
    const randomColor = colors[Math.floor(Math.random() * colors.length)]
    
    name = `${randomColor}${randomAdjective}${randomNoun}`
  }
  
  playerName = name
  console.log('🎮 Joining tic-tac-toe game as:', playerName)
  socket.emit('joinGame', { name: playerName, roomId: 'tic-tac-toe' })
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
window.joinGame = joinGame
window.resetGame = resetGame

// Initialize when page loads
window.addEventListener('load', init)