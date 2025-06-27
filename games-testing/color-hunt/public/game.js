const socket = io()

let gameState = null
let myPlayer = null

// Socket events
socket.on('playerAssigned', (data) => {
    document.getElementById('joinForm').classList.add('hidden')
    document.getElementById('gameControls').classList.remove('hidden')
    document.getElementById('colorGrid').classList.remove('hidden')
    document.getElementById('targetColor').classList.remove('hidden')
    console.log('Joined Color Hunt!')
})

socket.on('joinFailed', (data) => {
    alert(`Failed to join: ${data.reason}`)
    console.error('Join failed:', data)
})

socket.on('gameState', (state) => {
    gameState = state
    updateUI()
})

function updateUI() {
    if (!gameState) return
    
    // Update game info
    document.getElementById('playerCount').textContent = gameState.players.length
    document.getElementById('currentRound').textContent = gameState.round
    document.getElementById('maxRounds').textContent = gameState.maxRounds
    
    // Update time with warning color
    const timeDisplay = document.getElementById('timeLeft')
    const timeValue = Math.max(0, Math.ceil(gameState.timeLeft))
    timeDisplay.textContent = timeValue
    
    const timeContainer = document.getElementById('timeDisplay')
    if (timeValue <= 3 && gameState.gamePhase === 'playing') {
        timeContainer.className = 'time-warning'
    } else {
        timeContainer.className = ''
    }
    
    // Update phase message
    const phaseMessage = document.getElementById('phaseMessage')
    switch (gameState.gamePhase) {
        case 'waiting':
            phaseMessage.innerHTML = '<div class="phase-waiting">⏳ Get ready for next round...</div>'
            break
        case 'playing':
            phaseMessage.innerHTML = ''
            break
        case 'finished':
            const winner = gameState.players.reduce((prev, current) => 
                (prev.score > current.score) ? prev : current
            )
            phaseMessage.innerHTML = `<div class="phase-finished">🏆 Game Over! Winner: ${winner.name} (${winner.score} points)</div>`
            break
        default:
            phaseMessage.innerHTML = ''
    }
    
    // Update target color
    if (gameState.targetColor) {
        const targetDisplay = document.getElementById('targetColorDisplay')
        targetDisplay.style.backgroundColor = gameState.targetColor
    }
    
    // Update color grid
    updateColorGrid()
    
    // Update leaderboard
    updateLeaderboard()
}

function updateColorGrid() {
    const grid = document.getElementById('colorGrid')
    
    if (!gameState.colors || gameState.colors.length === 0) {
        grid.innerHTML = ''
        return
    }
    
    grid.innerHTML = ''
    
    gameState.colors.forEach((colorData, index) => {
        const cell = document.createElement('div')
        cell.className = 'color-cell'
        cell.style.backgroundColor = colorData.color
        
        if (colorData.clicked) {
            cell.classList.add('clicked')
            if (colorData.color === gameState.targetColor) {
                cell.classList.add('correct')
            }
        } else if (gameState.gamePhase === 'playing') {
            cell.onclick = () => clickColor(index)
        }
        
        grid.appendChild(cell)
    })
}

function updateLeaderboard() {
    const leaderboard = document.getElementById('leaderboard')
    
    if (!gameState.players || gameState.players.length === 0) {
        leaderboard.innerHTML = ''
        return
    }
    
    const sorted = [...gameState.players].sort((a, b) => b.score - a.score)
    
    leaderboard.innerHTML = '<h3>🏆 Leaderboard</h3>'
    
    sorted.forEach((player, index) => {
        const position = index + 1
        const medals = ['🥇', '🥈', '🥉']
        const medal = medals[index] || `${position}.`
        
        const streakText = player.streak > 0 ? ` <span class="streak">🔥${player.streak}</span>` : ''
        
        const div = document.createElement('div')
        div.className = 'player-score'
        div.innerHTML = `${medal} ${player.name}: ${player.score} points${streakText}`
        
        leaderboard.appendChild(div)
    })
}

function clickColor(colorIndex) {
    if (gameState.gamePhase !== 'playing') return
    
    socket.emit('customEvent', 'colorClick', { colorIndex })
}

function joinGame() {
    const nameInput = document.getElementById('playerName')
    const playerName = nameInput.value.trim() || generateRandomName()
    
    socket.emit('joinGame', {
        name: playerName,
        roomId: 'color-hunt'
    })
}

function readyUp() {
    socket.emit('customEvent', 'ready', {})
}

function restartGame() {
    socket.emit('customEvent', 'restart', {})
}

function generateRandomName() {
    const adjectives = ['Quick', 'Sharp', 'Bright', 'Fast', 'Eagle', 'Hawk', 'Swift', 'Smart']
    const nouns = ['Eye', 'Hunter', 'Spotter', 'Finder', 'Seeker', 'Scout', 'Detective', 'Artist']
    return adjectives[Math.floor(Math.random() * adjectives.length)] + 
           nouns[Math.floor(Math.random() * nouns.length)]
}

// Make functions global for HTML onclick
window.joinGame = joinGame
window.readyUp = readyUp
window.restartGame = restartGame